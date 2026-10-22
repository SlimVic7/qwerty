/**
 * QWERTY Stage 7.4 — Career Course Recommendations API Router Tests
 * Validates candidate access guard, 401 unauth, 403 non-candidate, published status filtering,
 * 404 for unknown roles, 200 coming soon, and production fail-closed behavior.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { careerRouter } from '../server/routes/career.js';
import { CareerCourseRecommendationsStore } from '../server/services/career/careerCourseRecommendationsStore.js';
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

describe('Career Course Recommendations API Router (Stage 7.4)', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/candidate/career', careerRouter);

  beforeEach(() => {
    CareerRolesStore.resetFallbackRoles();
    CareerCourseRecommendationsStore.resetFallbackCourses();
    mockAuthenticatedUser = { id: '11111111-1111-4111-a111-111111111111', roles: ['candidate'] };
  });

  describe('Authentication & Access Control', () => {
    it('rejects unauthenticated requests to /roles/:slug/courses with 401', async () => {
      const res = await request(app).get('/api/candidate/career/roles/frontend-engineer/courses');
      expect(res.status).toBe(401);
    });

    it('rejects non-candidate authenticated users with 403', async () => {
      mockAuthenticatedUser = { id: '22222222-2222-4222-a222-222222222222', roles: ['recruiter'] };
      const res = await request(app)
        .get('/api/candidate/career/roles/frontend-engineer/courses')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(403);
    });

    it('rejects unauthenticated requests to item-level endpoint with 401', async () => {
      const res = await request(app).get('/api/candidate/career/roles/frontend-engineer/roadmap/items/c1000000-0000-0000-0000-000000000001/courses');
      expect(res.status).toBe(401);
    });
  });

  describe('Candidate Course Recommendations Retrieval', () => {
    it('allows authenticated candidate to retrieve published course recommendations for a role', async () => {
      const res = await request(app)
        .get('/api/candidate/career/roles/frontend-engineer/courses')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('role');
      expect(res.body.role.slug).toBe('frontend-engineer');
      expect(res.body).toHaveProperty('courses');
      expect(Array.isArray(res.body.courses)).toBe(true);
      expect(res.body.total_courses).toBeGreaterThan(0);

      // Verify structure of first course
      const firstCourse = res.body.courses[0];
      expect(firstCourse).toHaveProperty('title');
      expect(firstCourse).toHaveProperty('provider_name');
      expect(firstCourse).toHaveProperty('url');
      expect(firstCourse).toHaveProperty('why_this_course');
      expect(firstCourse).toHaveProperty('access_type');
      expect(firstCourse).toHaveProperty('skill');
      expect(firstCourse.status).toBe('published');
    });

    it('allows authenticated candidate to retrieve courses for a specific roadmap item', async () => {
      const res = await request(app)
        .get('/api/candidate/career/roles/frontend-engineer/roadmap/items/c1000000-0000-0000-0000-000000000001/courses')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('courses');
      expect(Array.isArray(res.body.courses)).toBe(true);
      expect(res.body.courses.length).toBeGreaterThan(0);
      expect(res.body.courses[0].roadmap_item_id).toBe('c1000000-0000-0000-0000-000000000001');
    });

    it('returns 404 ROLE_NOT_FOUND when requesting courses for unknown role slug', async () => {
      const res = await request(app)
        .get('/api/candidate/career/roles/nonexistent-role-xyz/courses')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('ROLE_NOT_FOUND');
    });

    it('returns 200 with roadmap: null and empty courses for role without published roadmap', async () => {
      const res = await request(app)
        .get('/api/candidate/career/roles/mobile-developer/courses')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(200);
      expect(res.body.role.slug).toBe('mobile-developer');
      expect(res.body.roadmap).toBeNull();
      expect(res.body.courses).toEqual([]);
      expect(res.body.total_courses).toBe(0);
    });
  });

  describe('Zero Side Effects & Production Guardrails', () => {
    it('surfaces controlled 500 error if database fails in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      const getCoursesSpy = vi.spyOn(CareerCourseRecommendationsStore, 'getCoursesByRoleSlug').mockRejectedValue(new Error('DATABASE_ERROR'));

      try {
        process.env.NODE_ENV = 'production';
        const res = await request(app)
          .get('/api/candidate/career/roles/frontend-engineer/courses')
          .set('Authorization', 'Bearer valid-candidate-token');

        expect(res.status).toBe(500);
        expect(res.body.error).toBe('INTERNAL_ERROR');
      } finally {
        getCoursesSpy.mockRestore();
        process.env.NODE_ENV = originalEnv;
      }
    });
  });
});
