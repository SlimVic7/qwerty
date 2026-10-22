/**
 * QWERTY Stage 7.5 — Candidate Development Plan Router Tests
 * Validates authentication guards, role checks, deterministic endpoints,
 * 404 handling, and controlled preview feature flag behavior.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { careerRouter } from '../server/routes/career.js';
import { CandidateDevelopmentPlanStore } from '../server/services/career/candidateDevelopmentPlanStore.js';
import { CareerRolesStore } from '../server/services/career/careerRolesStore.js';

let mockAuthenticatedUser: any = { id: '11111111-1111-4111-a111-111111111111', roles: ['candidate'] };

vi.mock('../server/db/supabase.js', () => ({
  getAdminClient: () => null,
  getAuthClient: () => null,
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
  },
}));

describe('Stage 7.5 — Candidate Development Plan API Router', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/candidate/career', careerRouter);

  beforeEach(() => {
    delete process.env.PERSONALIZED_DEVELOPMENT_ROADMAP_PUBLIC_ENABLED;
    CandidateDevelopmentPlanStore.resetFallbackPlans();
    CareerRolesStore.resetFallbackRoles();
    mockAuthenticatedUser = { id: '11111111-1111-4111-a111-111111111111', roles: ['candidate'] };
  });

  describe('Authentication & Access Control', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/candidate/career/roles/frontend-engineer/development-plan');
      expect(res.status).toBe(401);
    });

    it('rejects non-candidate roles with 403', async () => {
      mockAuthenticatedUser = { id: '22222222-2222-4222-a222-222222222222', roles: ['recruiter'] };
      const res = await request(app)
        .get('/api/candidate/career/roles/frontend-engineer/development-plan')
        .set('Authorization', 'Bearer valid-candidate-token');
      expect(res.status).toBe(403);
    });
  });

  describe('Feature Flag Guardrails', () => {
    it('reports feature_enabled: false when PERSONALIZED_DEVELOPMENT_ROADMAP_PUBLIC_ENABLED is not set', async () => {
      const res = await request(app)
        .get('/api/candidate/career/roles/frontend-engineer/development-plan')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(200);
      expect(res.body.feature_enabled).toBe(false);
      expect(res.body.message).toContain('Coming Soon');
    });

    it('rejects generation with 403 FEATURE_DISABLED when feature flag is disabled and no override is provided', async () => {
      const res = await request(app)
        .post('/api/candidate/career/roles/frontend-engineer/development-plan/generate')
        .set('Authorization', 'Bearer valid-candidate-token')
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FEATURE_DISABLED');
    });

    it('permits generation when explicit controlled override header is passed in test/engineering environment', async () => {
      const res = await request(app)
        .post('/api/candidate/career/roles/frontend-engineer/development-plan/generate')
        .set('Authorization', 'Bearer valid-candidate-token')
        .set('x-dev-preview', 'true')
        .send({
          mockEvidence: {
            cvParsedData: {
              skills: ['TypeScript', 'Semantic HTML5 & Accessible Markup'],
            },
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.plan).not.toBeNull();
      expect(res.body.plan.status).toBe('active');
    });

    it('permits generation when PERSONALIZED_DEVELOPMENT_ROADMAP_PUBLIC_ENABLED=true', async () => {
      process.env.PERSONALIZED_DEVELOPMENT_ROADMAP_PUBLIC_ENABLED = 'true';

      const res = await request(app)
        .post('/api/candidate/career/roles/frontend-engineer/development-plan/generate')
        .set('Authorization', 'Bearer valid-candidate-token')
        .send({
          mockEvidence: {
            cvParsedData: {
              skills: ['TypeScript'],
            },
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.feature_enabled).toBe(true);
      expect(res.body.plan).not.toBeNull();
    });

    it('completely ignores client override header in production (NODE_ENV=production)', async () => {
      const origEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        const res = await request(app)
          .post('/api/candidate/career/roles/frontend-engineer/development-plan/generate')
          .set('Authorization', 'Bearer valid-candidate-token')
          .set('x-dev-preview', 'true')
          .send({});

        expect(res.status).toBe(403);
        expect(res.body.error).toBe('FEATURE_DISABLED');
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });
  });

  describe('Retrieval & Error Handling', () => {
    it('returns 404 for unknown role slug', async () => {
      const res = await request(app)
        .get('/api/candidate/career/roles/non-existent-role/development-plan')
        .set('Authorization', 'Bearer valid-candidate-token')
        .set('x-dev-preview', 'true');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('ROLE_NOT_FOUND');
    });
  });
});
