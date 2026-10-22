import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { careerRouter } from '../server/routes/career.js';
import { CareerRolesStore } from '../server/services/career/careerRolesStore.js';

let mockAuthenticatedUser: any = { id: '11111111-1111-4111-a111-111111111111', roles: ['candidate'] };

vi.mock('../server/db/supabase.js', () => ({
  getAdminClient: () => null,
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

describe('Career Role Library API Router (Stage 7.1)', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/candidate/career', careerRouter);

  beforeEach(() => {
    CareerRolesStore.resetFallbackRoles();
    mockAuthenticatedUser = { id: '11111111-1111-4111-a111-111111111111', roles: ['candidate'] };
  });

  describe('Authentication & Access Control', () => {
    it('rejects unauthenticated requests to /roles with 401', async () => {
      const res = await request(app).get('/api/candidate/career/roles');
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated requests to /areas with 401', async () => {
      const res = await request(app).get('/api/candidate/career/areas');
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated requests to /roles/:slug with 401', async () => {
      const res = await request(app).get('/api/candidate/career/roles/frontend-engineer');
      expect(res.status).toBe(401);
    });

    it('rejects non-candidate roles with 403', async () => {
      mockAuthenticatedUser = { id: '11111111-1111-4111-a111-111111111111', roles: ['recruiter'] };
      const res = await request(app)
        .get('/api/candidate/career/roles')
        .set('Authorization', 'Bearer valid-candidate-token');
      expect(res.status).toBe(403);

      mockAuthenticatedUser = { id: '11111111-1111-4111-a111-111111111111', roles: ['employer'] };
      const resEmployer = await request(app)
        .get('/api/candidate/career/roles/frontend-engineer')
        .set('Authorization', 'Bearer valid-candidate-token');
      expect(resEmployer.status).toBe(403);
    });
  });

  describe('GET /api/candidate/career/roles', () => {
    it('returns 200 with list of roles and area summaries', async () => {
      const res = await request(app)
        .get('/api/candidate/career/roles')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(200);
      expect(res.body.roles).toBeDefined();
      expect(res.body.total).toBeGreaterThanOrEqual(10);
      expect(res.body.areas).toBeDefined();
      expect(Array.isArray(res.body.areas)).toBe(true);
    });

    it('filters roles by career area query param', async () => {
      const res = await request(app)
        .get('/api/candidate/career/roles?area=Software%20Engineering')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(200);
      expect(res.body.roles.length).toBeGreaterThan(0);
      expect(res.body.roles.every((r: any) => r.career_area === 'Software Engineering')).toBe(true);
    });

    it('filters roles by search query param', async () => {
      const res = await request(app)
        .get('/api/candidate/career/roles?search=Python')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(200);
      expect(res.body.roles.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/candidate/career/areas', () => {
    it('returns 200 with all distinct career areas and counts', async () => {
      const res = await request(app)
        .get('/api/candidate/career/areas')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(200);
      expect(res.body.areas).toBeDefined();
      expect(res.body.areas.length).toBeGreaterThan(0);
      expect(res.body.areas[0].name).toBeDefined();
      expect(res.body.areas[0].count).toBeGreaterThan(0);
    });
  });

  describe('GET /api/candidate/career/roles/:slug', () => {
    it('returns 200 with full role details for valid slug', async () => {
      const res = await request(app)
        .get('/api/candidate/career/roles/frontend-engineer')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(200);
      expect(res.body.role).toBeDefined();
      expect(res.body.role.slug).toBe('frontend-engineer');
      expect(res.body.role.title).toBe('Frontend Engineer');
      expect(res.body.role.responsibilities.length).toBeGreaterThan(0);
      expect(res.body.role.core_skills.length).toBeGreaterThan(0);
      expect(res.body.role.career_progression.length).toBeGreaterThan(0);
    });

    it('returns 404 for unknown role slug', async () => {
      const res = await request(app)
        .get('/api/candidate/career/roles/unknown-specialist-role')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('ROLE_NOT_FOUND');
    });

    it('returns 404 when candidate requests a draft role', async () => {
      CareerRolesStore.resetFallbackRoles([
        {
          id: 'draft-uuid-001',
          slug: 'draft-qa-role',
          title: 'Draft QA Role',
          short_summary: 'Draft summary',
          career_area: 'Quality Engineering',
          overview: 'Draft overview text',
          responsibilities: ['Testing'],
          core_skills: ['QA'],
          supporting_skills: ['Scripting'],
          typical_background: 'Background',
          career_progression: [],
          related_roles: [],
          status: 'draft',
          display_order: 99,
          created_at: '2026-08-01T00:00:00Z',
          updated_at: '2026-08-01T00:00:00Z'
        }
      ]);

      const res = await request(app)
        .get('/api/candidate/career/roles/draft-qa-role')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('ROLE_NOT_FOUND');
    });

    it('returns 404 when candidate requests an archived role', async () => {
      CareerRolesStore.resetFallbackRoles([
        {
          id: 'archived-uuid-002',
          slug: 'archived-tech-lead',
          title: 'Archived Tech Lead',
          short_summary: 'Archived summary',
          career_area: 'Software Engineering',
          overview: 'Archived overview text',
          responsibilities: ['Leading'],
          core_skills: ['Architecture'],
          supporting_skills: ['Strategy'],
          typical_background: 'Background',
          career_progression: [],
          related_roles: [],
          status: 'archived',
          display_order: 99,
          created_at: '2026-08-01T00:00:00Z',
          updated_at: '2026-08-01T00:00:00Z'
        }
      ]);

      const res = await request(app)
        .get('/api/candidate/career/roles/archived-tech-lead')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('ROLE_NOT_FOUND');
    });
  });

  describe('Production Resilience & Fail-Closed Guardrails', () => {
    it('surfaces controlled 500 error and never returns seed catalog if DB fails in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        // In production mode without database connection, store must throw and router must return 500
        const listRes = await request(app)
          .get('/api/candidate/career/roles')
          .set('Authorization', 'Bearer valid-candidate-token');

        expect(listRes.status).toBe(500);
        expect(listRes.body.error).toBe('INTERNAL_ERROR');

        const detailRes = await request(app)
          .get('/api/candidate/career/roles/frontend-engineer')
          .set('Authorization', 'Bearer valid-candidate-token');

        expect(detailRes.status).toBe(500);
        expect(detailRes.body.error).toBe('INTERNAL_ERROR');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });
});
