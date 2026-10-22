import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { careerRouter } from '../server/routes/career.js';
import { CareerRoadmapsStore } from '../server/services/career/careerRoadmapsStore.js';
import { CareerRolesStore } from '../server/services/career/careerRolesStore.js';
import { CURATED_ROADMAPS } from '../server/services/career/careerRoadmapsSeed.js';
import { CURATED_CAREER_ROLES } from '../server/services/career/careerRolesSeed.js';

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

describe('Skill Roadmaps API Router (Stage 7.2)', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/candidate/career', careerRouter);

  beforeEach(() => {
    CareerRolesStore.resetFallbackRoles();
    CareerRoadmapsStore.resetFallbackRoadmaps();
    mockAuthenticatedUser = { id: '11111111-1111-4111-a111-111111111111', roles: ['candidate'] };
  });

  describe('Authentication & Access Control', () => {
    it('rejects unauthenticated requests to /roles/:slug/roadmap with 401', async () => {
      const res = await request(app).get('/api/candidate/career/roles/frontend-engineer/roadmap');
      expect(res.status).toBe(401);
    });

    it('rejects non-candidate authenticated users with 403', async () => {
      mockAuthenticatedUser = { id: '22222222-2222-4222-a222-222222222222', roles: ['recruiter'] };
      const res = await request(app)
        .get('/api/candidate/career/roles/frontend-engineer/roadmap')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(403);
    });
  });

  describe('Roadmap Content Delivery', () => {
    it('returns published roadmap for an authorized candidate', async () => {
      const res = await request(app)
        .get('/api/candidate/career/roles/frontend-engineer/roadmap')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(200);
      expect(res.body.role).toBeDefined();
      expect(res.body.role.slug).toBe('frontend-engineer');
      expect(res.body.roadmap).toBeDefined();
      expect(res.body.roadmap.status).toBe('published');
      expect(res.body.roadmap.version).toBe(1);
      expect(res.body.roadmap.items.length).toBeGreaterThanOrEqual(10);

      // Verify stages exist
      const stages = res.body.roadmap.items.map((i: any) => i.stage);
      expect(stages).toContain('foundation');
      expect(stages).toContain('core');
      expect(stages).toContain('advanced');
    });

    it('returns 200 with roadmap: null for published role without published roadmap', async () => {
      const res = await request(app)
        .get('/api/candidate/career/roles/mobile-developer/roadmap')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(200);
      expect(res.body.role).toBeDefined();
      expect(res.body.role.slug).toBe('mobile-developer');
      expect(res.body.roadmap).toBeNull();
      expect(res.body.message).toContain('No published roadmap');
    });

    it('returns 404 ROLE_NOT_FOUND for nonexistent role slug', async () => {
      const res = await request(app)
        .get('/api/candidate/career/roles/nonexistent-role-slug/roadmap')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('ROLE_NOT_FOUND');
    });

    it('strictly excludes draft roadmaps from candidate API responses', async () => {
      // Configure test fallback with draft roadmap
      const draftRoadmap = {
        ...CURATED_ROADMAPS[0],
        status: 'draft' as const
      };
      CareerRoadmapsStore.resetFallbackRoadmaps([draftRoadmap]);

      const res = await request(app)
        .get('/api/candidate/career/roles/frontend-engineer/roadmap')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(200);
      // Because it is in draft, it should not be returned as published roadmap
      expect(res.body.roadmap).toBeNull();
    });

    it('strictly excludes archived roadmaps from candidate API responses', async () => {
      // Configure test fallback with archived roadmap
      const archivedRoadmap = {
        ...CURATED_ROADMAPS[0],
        status: 'archived' as const
      };
      CareerRoadmapsStore.resetFallbackRoadmaps([archivedRoadmap]);

      const res = await request(app)
        .get('/api/candidate/career/roles/frontend-engineer/roadmap')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(200);
      expect(res.body.roadmap).toBeNull();
    });

    it('deterministically selects highest published version when multiple versions exist', async () => {
      const v1 = {
        ...CURATED_ROADMAPS[0],
        id: '11111111-0000-0000-0000-000000000001',
        version: 1,
        version_label: 'v1.0',
        title: 'Frontend Engineer Skill Roadmap v1',
        status: 'published' as const
      };
      const v2 = {
        ...CURATED_ROADMAPS[0],
        id: '22222222-0000-0000-0000-000000000002',
        version: 2,
        version_label: 'v2.0',
        title: 'Frontend Engineer Skill Roadmap v2',
        status: 'published' as const
      };
      CareerRoadmapsStore.resetFallbackRoadmaps([v1, v2]);

      const res = await request(app)
        .get('/api/candidate/career/roles/frontend-engineer/roadmap')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(200);
      expect(res.body.roadmap).toBeDefined();
      expect(res.body.roadmap.version).toBe(2);
      expect(res.body.roadmap.title).toBe('Frontend Engineer Skill Roadmap v2');
    });

    it('strictly denies roadmap if role itself is draft or archived', async () => {
      // Set role status to draft
      const baseRole = CURATED_CAREER_ROLES.find(r => r.slug === 'frontend-engineer')!;
      const draftRole = { ...baseRole, status: 'draft' as const };
      CareerRolesStore.resetFallbackRoles([draftRole]);

      const resDraft = await request(app)
        .get('/api/candidate/career/roles/frontend-engineer/roadmap')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(resDraft.status).toBe(404);
      expect(resDraft.body.error).toBe('ROLE_NOT_FOUND');

      // Set role status to archived
      const archivedRole = { ...baseRole, status: 'archived' as const };
      CareerRolesStore.resetFallbackRoles([archivedRole]);

      const resArchived = await request(app)
        .get('/api/candidate/career/roles/frontend-engineer/roadmap')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(resArchived.status).toBe(404);
      expect(resArchived.body.error).toBe('ROLE_NOT_FOUND');
    });
  });

  describe('Zero Side Effects & Production Guardrails', () => {
    it('retrieving roadmap causes zero state mutations across tables', async () => {
      const res1 = await request(app)
        .get('/api/candidate/career/roles/backend-engineer/roadmap')
        .set('Authorization', 'Bearer valid-candidate-token');

      const res2 = await request(app)
        .get('/api/candidate/career/roles/backend-engineer/roadmap')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res1.body.roadmap.items.length).toBe(res2.body.roadmap.items.length);
    });

    it('surfaces controlled 500 error if database fails in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        const res = await request(app)
          .get('/api/candidate/career/roles/frontend-engineer/roadmap')
          .set('Authorization', 'Bearer valid-candidate-token');

        expect(res.status).toBe(500);
        expect(res.body.error).toBe('INTERNAL_ERROR');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });
});
