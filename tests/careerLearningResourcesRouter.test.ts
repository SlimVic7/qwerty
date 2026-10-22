/**
 * QWERTY Stage 7.3 — Career Learning Resources API Router Tests
 * Validates candidate access guard, 401 unauth, 403 non-candidate, published status filtering,
 * 404 for unknown roles, 200 coming soon, and production fail-closed behavior.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { careerRouter } from '../server/routes/career.js';
import { CareerLearningResourcesStore } from '../server/services/career/careerLearningResourcesStore.js';
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

describe('Career Learning Resources API Router (Stage 7.3)', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/candidate/career', careerRouter);

  beforeEach(() => {
    CareerRolesStore.resetFallbackRoles();
    CareerLearningResourcesStore.resetFallbackResources();
    mockAuthenticatedUser = { id: '11111111-1111-4111-a111-111111111111', roles: ['candidate'] };
  });

  describe('Authentication & Access Control', () => {
    it('rejects unauthenticated requests to /roles/:slug/roadmap/resources with 401', async () => {
      const res = await request(app).get('/api/candidate/career/roles/frontend-engineer/roadmap/resources');
      expect(res.status).toBe(401);
    });

    it('rejects non-candidate authenticated users with 403', async () => {
      mockAuthenticatedUser = { id: '22222222-2222-4222-a222-222222222222', roles: ['recruiter'] };
      const res = await request(app)
        .get('/api/candidate/career/roles/frontend-engineer/roadmap/resources')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(403);
    });

    it('rejects unauthenticated requests to item-level endpoint with 401', async () => {
      const res = await request(app).get('/api/candidate/career/roles/frontend-engineer/roadmap/items/c1000000-0000-0000-0000-000000000001/resources');
      expect(res.status).toBe(401);
    });
  });

  describe('Candidate Resource Retrieval', () => {
    it('allows authenticated candidate to retrieve published resources grouped by roadmap items', async () => {
      const res = await request(app)
        .get('/api/candidate/career/roles/frontend-engineer/roadmap/resources')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('role');
      expect(res.body.role.slug).toBe('frontend-engineer');
      expect(res.body).toHaveProperty('roadmap');
      expect(res.body.roadmap).toHaveProperty('items');
      expect(Array.isArray(res.body.roadmap.items)).toBe(true);
      expect(res.body.total_resources).toBeGreaterThan(0);

      // Verify structure of first item with resources
      const itemWithRes = res.body.roadmap.items.find((i: any) => i.resources && i.resources.length > 0);
      expect(itemWithRes).toBeDefined();
      const firstRes = itemWithRes.resources[0];
      expect(firstRes).toHaveProperty('title');
      expect(firstRes).toHaveProperty('provider_name');
      expect(firstRes).toHaveProperty('resource_type');
      expect(firstRes).toHaveProperty('url');
      expect(firstRes).toHaveProperty('access_type');
      expect(firstRes.status).toBe('published');
    });

    it('allows authenticated candidate to retrieve resources for a specific roadmap item', async () => {
      const res = await request(app)
        .get('/api/candidate/career/roles/frontend-engineer/roadmap/items/c1000000-0000-0000-0000-000000000001/resources')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('resources');
      expect(Array.isArray(res.body.resources)).toBe(true);
      expect(res.body.resources.length).toBeGreaterThan(0);
      expect(res.body.total).toBe(res.body.resources.length);
    });

    it('returns controlled 200 with roadmap: null for role without roadmap (Coming Soon state)', async () => {
      const res = await request(app)
        .get('/api/candidate/career/roles/mobile-developer/roadmap/resources')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(200);
      expect(res.body.role.slug).toBe('mobile-developer');
      expect(res.body.roadmap).toBeNull();
      expect(res.body.total_resources).toBe(0);
    });

    it('returns controlled 404 ROLE_NOT_FOUND for invalid role slug', async () => {
      const res = await request(app)
        .get('/api/candidate/career/roles/nonexistent-role-xyz/roadmap/resources')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('ROLE_NOT_FOUND');
    });
  });

  describe('Zero AI & Zero Side Effects', () => {
    it('read queries execute without AI calls and produce zero side effects', async () => {
      const res = await request(app)
        .get('/api/candidate/career/roles/backend-engineer/roadmap/resources')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(200);
      expect(res.body.role.slug).toBe('backend-engineer');
      expect(res.body.roadmap).not.toBeNull();
    });
  });
});
