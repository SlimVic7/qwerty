import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const authState = vi.hoisted(() => ({ userId: '11111111-1111-4111-8111-111111111111', roles: ['candidate'] as string[] }));
const storeState = vi.hoisted(() => ({
  getThreads: vi.fn(), getThreadById: vi.fn(), getMessages: vi.fn(),
  getNotifications: vi.fn(), markNotificationRead: vi.fn()
}));

vi.mock('../server/db/supabase.js', () => ({
  getAdminClient: () => ({
    auth: {
      getUser: async (token: string) => {
        if (token === 'candidate-token') {
          return { data: { user: { id: authState.userId, email: 'candidate@qwerty.test' } }, error: null };
        }
        if (token === 'recruiter-token') {
          authState.roles = ['recruiter'];
          return { data: { user: { id: '22222222-2222-4222-8222-222222222222', email: 'recruiter@qwerty.test' } }, error: null };
        }
        return { data: { user: null }, error: { message: 'Invalid token' } };
      }
    },
    from: () => {
      const query: any = {
        select: () => query,
        eq: () => query,
        then: (resolve: any, reject: any) => Promise.resolve({
          data: authState.roles.map((role) => ({ role })),
          error: null
        }).then(resolve, reject)
      };
      return query;
    }
  })
}));
vi.mock('../server/services/careerCoach/careerCoachStore.js', () => ({
  CareerCoachStore: {
    getThreads: storeState.getThreads, getThreadById: storeState.getThreadById,
    getMessages: storeState.getMessages, getNotifications: storeState.getNotifications,
    markNotificationRead: storeState.markNotificationRead, createThread: vi.fn(),
    addMessage: vi.fn(), createJob: vi.fn(), getJobById: vi.fn()
  }
}));
vi.mock('../server/services/careerCoach/careerCoachQueueService.js', () => ({
  CareerCoachQueueService: { triggerWorker: vi.fn() }
}));
import { careerCoachRouter, careerCoachNotificationsRouter } from '../server/routes/careerCoach.js';

describe('Stage 7.6 Batch 1 auth and route boundaries', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/candidate/career/coach', careerCoachRouter);
  app.use('/api/candidate/notifications', careerCoachNotificationsRouter);

  beforeEach(() => {
    vi.clearAllMocks();
    authState.userId = '11111111-1111-4111-8111-111111111111';
    authState.roles = ['candidate'];
    storeState.getThreads.mockResolvedValue([]);
    storeState.getThreadById.mockResolvedValue(null);
    storeState.getMessages.mockResolvedValue([]);
    storeState.getNotifications.mockResolvedValue({ notifications: [], unreadCount: 0 });
    storeState.markNotificationRead.mockResolvedValue(false);
    process.env.AI_CAREER_COACH_PUBLIC_ENABLED = 'true';
  });
  afterEach(() => {
    delete process.env.AI_CAREER_COACH_PUBLIC_ENABLED;
    delete process.env.VITE_AI_CAREER_COACH_PUBLIC_ENABLED;
  });


  it('fails closed with 503 when both server-side feature flags are false or unset', async () => {
    delete process.env.AI_CAREER_COACH_PUBLIC_ENABLED;
    delete process.env.VITE_AI_CAREER_COACH_PUBLIC_ENABLED;

    const response = await request(app).get('/api/candidate/career/coach/threads')
      .set('Authorization', 'Bearer candidate-token');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      error: 'FEATURE_DISABLED',
      message: 'AI Career Coach — Coming Soon'
    });
    expect(storeState.getThreads).not.toHaveBeenCalled();
  });

  it('allows candidate routes when the server-side feature flag is true', async () => {
    process.env.AI_CAREER_COACH_PUBLIC_ENABLED = 'true';
    delete process.env.VITE_AI_CAREER_COACH_PUBLIC_ENABLED;

    const response = await request(app).get('/api/candidate/career/coach/threads')
      .set('Authorization', 'Bearer candidate-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ threads: [] });
    expect(storeState.getThreads).toHaveBeenCalledWith(authState.userId);
  });

  it('does not allow x-qwerty-preview-override to unlock the feature outside production', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'test';
      delete process.env.AI_CAREER_COACH_PUBLIC_ENABLED;
      delete process.env.VITE_AI_CAREER_COACH_PUBLIC_ENABLED;

      const response = await request(app).get('/api/candidate/career/coach/threads')
        .set('Authorization', 'Bearer candidate-token')
        .set('x-qwerty-preview-override', 'stage7_6_preview_unlocked');

      expect(response.status).toBe(503);
      expect(storeState.getThreads).not.toHaveBeenCalled();
    } finally {
      if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it('cannot be unlocked by request headers in production', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.AI_CAREER_COACH_PUBLIC_ENABLED;
      delete process.env.VITE_AI_CAREER_COACH_PUBLIC_ENABLED;

      const response = await request(app).get('/api/candidate/career/coach/threads')
        .set('Authorization', 'Bearer candidate-token')
        .set('x-qwerty-preview-override', 'stage7_6_preview_unlocked');

      expect(response.status).toBe(503);
      expect(response.body.error).toBe('FEATURE_DISABLED');
      expect(storeState.getThreads).not.toHaveBeenCalled();
    } finally {
      if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it('does not accept x-user-id without a verified bearer session', async () => {
    const response = await request(app).get('/api/candidate/career/coach/threads')
      .set('x-user-id', '99999999-9999-4999-8999-999999999999');
    expect(response.status).toBe(401);
    expect(storeState.getThreads).not.toHaveBeenCalled();
  });
  it('rejects an invalid bearer token', async () => {
    const response = await request(app).get('/api/candidate/career/coach/threads')
      .set('Authorization', 'Bearer invalid-token');
    expect(response.status).toBe(401);
  });
  it('uses only verified req.user.id even when x-user-id is forged', async () => {
    const response = await request(app).get('/api/candidate/career/coach/threads')
      .set('Authorization', 'Bearer candidate-token')
      .set('x-user-id', '99999999-9999-4999-8999-999999999999');
    expect(response.status).toBe(200);
    expect(storeState.getThreads).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111');
  });
  it('rejects authenticated non-candidates with 403', async () => {
    const response = await request(app).get('/api/candidate/career/coach/threads')
      .set('Authorization', 'Bearer recruiter-token');
    expect(response.status).toBe(403);
    expect(storeState.getThreads).not.toHaveBeenCalled();
  });
  it('returns a controlled 404 for cross-candidate thread access', async () => {
    const response = await request(app).get('/api/candidate/career/coach/threads/33333333-3333-4333-8333-333333333333')
      .set('Authorization', 'Bearer candidate-token');
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('THREAD_NOT_FOUND');
    expect(response.body.message).toBe('Thread not found');
  });
  it('serves notification list and read routes without a duplicate prefix', async () => {
    const list = await request(app).get('/api/candidate/notifications').set('Authorization', 'Bearer candidate-token');
    expect(list.status).toBe(200);
    expect(storeState.getNotifications).toHaveBeenCalledWith(authState.userId);
    const marked = await request(app).patch('/api/candidate/notifications/33333333-3333-4333-8333-333333333333/read')
      .set('Authorization', 'Bearer candidate-token');
    expect(marked.status).toBe(404);
    expect(storeState.markNotificationRead).toHaveBeenCalledWith('33333333-3333-4333-8333-333333333333', authState.userId);
  });
});
