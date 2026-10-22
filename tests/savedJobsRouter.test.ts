import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { candidateRouter } from '../server/routes/candidate.js';
import { SavedJobsStore } from '../server/services/savedJobs/savedJobsStore.js';

let mockAuthenticatedUser: any = { id: '11111111-1111-4111-a111-111111111111', roles: ['candidate'] };

const validJobId = '22222222-2222-4222-a222-222222222222';
const invalidJobId = 'not-a-valid-uuid';

const mockJobsMap: Record<string, any> = {
  [validJobId]: {
    id: validJobId,
    title: 'Staff Platform Engineer',
    company_name: 'Apex Networks',
    status: 'published'
  }
};

vi.mock('../server/db/supabase.js', () => ({
  getAdminClient: () => ({
    from: (table: string) => {
      const builder: any = {
        select: () => builder,
        eq: (col: string, val: any) => {
          builder._eqs = builder._eqs || {};
          builder._eqs[col] = val;
          return builder;
        },
        maybeSingle: async () => {
          if (table === 'jobs') {
            const found = mockJobsMap[builder._eqs?.id];
            return { data: found || null, error: null };
          }
          return { data: null, error: null };
        },
        upsert: () => ({
          select: () => ({
            single: async () => {
              return { data: null, error: { code: '42P01', message: 'relation "candidate_saved_jobs" does not exist' } };
            }
          })
        }),
        delete: () => ({
          match: async () => ({ error: null })
        }),
        order: () => builder,
        range: () => builder
      };
      return builder;
    },
    rpc: async () => ({ data: null, error: { message: 'function does not exist' } })
  }),
  getAuthClient: () => null
}));

vi.mock('../server/middleware/auth.js', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    if (req.headers.authorization === 'Bearer valid-candidate-token') {
      req.user = mockAuthenticatedUser;
      return next();
    }
    return res.status(401).json({ error: 'Not authenticated' });
  },
  requireRole: (roles: string[]) => (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const hasRole = req.user.roles.some((r: string) => roles.includes(r));
    if (!hasRole) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    return next();
  }
}));

describe('Saved Jobs Candidate API Routes (Stage 6.1)', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/candidate', candidateRouter);

  beforeEach(() => {
    SavedJobsStore.clearFallbackStore();
    mockAuthenticatedUser = { id: '11111111-1111-4111-a111-111111111111', roles: ['candidate'] };
  });

  describe('Authentication & Access Control Gate', () => {
    it('returns 401 when requesting saved jobs without authentication', async () => {
      const res = await request(app).get('/api/candidate/saved-jobs');
      expect(res.status).toBe(401);
    });

    it('returns 401 when attempting to save a job without authentication', async () => {
      const res = await request(app).post(`/api/candidate/jobs/${validJobId}/save`);
      expect(res.status).toBe(401);
    });

    it('returns 403 when authenticated as non-candidate role', async () => {
      mockAuthenticatedUser = { id: '11111111-1111-4111-a111-111111111111', roles: ['recruiter'] };
      const res = await request(app)
        .get('/api/candidate/saved-jobs')
        .set('Authorization', 'Bearer valid-candidate-token');
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/candidate/jobs/:jobId/save', () => {
    it('rejects invalid UUID with 400', async () => {
      const res = await request(app)
        .post(`/api/candidate/jobs/${invalidJobId}/save`)
        .set('Authorization', 'Bearer valid-candidate-token');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('INVALID_JOB_ID');
    });

    it('saves a job successfully for candidate', async () => {
      const res = await request(app)
        .post(`/api/candidate/jobs/${validJobId}/save`)
        .set('Authorization', 'Bearer valid-candidate-token');
      expect(res.status).toBe(200);
      expect(res.body.saved).toBe(true);
      expect(res.body.saved_job_id).toBeDefined();
    });
  });

  describe('GET /api/candidate/jobs/:jobId/saved-status', () => {
    it('returns saved: false for unsaved job', async () => {
      const res = await request(app)
        .get(`/api/candidate/jobs/${validJobId}/saved-status`)
        .set('Authorization', 'Bearer valid-candidate-token');
      expect(res.status).toBe(200);
      expect(res.body.saved).toBe(false);
    });

    it('returns saved: true after saving', async () => {
      await request(app)
        .post(`/api/candidate/jobs/${validJobId}/save`)
        .set('Authorization', 'Bearer valid-candidate-token');

      const res = await request(app)
        .get(`/api/candidate/jobs/${validJobId}/saved-status`)
        .set('Authorization', 'Bearer valid-candidate-token');
      expect(res.status).toBe(200);
      expect(res.body.saved).toBe(true);
    });
  });

  describe('DELETE /api/candidate/jobs/:jobId/save', () => {
    it('unsaves an existing saved job', async () => {
      await request(app)
        .post(`/api/candidate/jobs/${validJobId}/save`)
        .set('Authorization', 'Bearer valid-candidate-token');

      const res = await request(app)
        .delete(`/api/candidate/jobs/${validJobId}/save`)
        .set('Authorization', 'Bearer valid-candidate-token');
      expect(res.status).toBe(200);
      expect(res.body.saved).toBe(false);

      const check = await request(app)
        .get(`/api/candidate/jobs/${validJobId}/saved-status`)
        .set('Authorization', 'Bearer valid-candidate-token');
      expect(check.body.saved).toBe(false);
    });
  });

  describe('GET /api/candidate/saved-jobs', () => {
    it('lists candidate saved jobs with pagination', async () => {
      await request(app)
        .post(`/api/candidate/jobs/${validJobId}/save`)
        .set('Authorization', 'Bearer valid-candidate-token');

      const res = await request(app)
        .get('/api/candidate/saved-jobs?limit=10&offset=0')
        .set('Authorization', 'Bearer valid-candidate-token');
      expect(res.status).toBe(200);
      expect(res.body.saved_jobs).toBeInstanceOf(Array);
      expect(res.body.saved_jobs.length).toBe(1);
      expect(res.body.total).toBe(1);
      expect(res.body.version).toBe('saved-jobs-v1');
    });
  });
});
