/**
 * QWERTY Stage 7.4 — Career Course Recommendations Store Unit Tests
 * Verifies curated course recommendations retrieval, security gating, fail-closed behavior, URL validation, and Zero AI.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CareerCourseRecommendationsStore } from '../server/services/career/careerCourseRecommendationsStore.js';
import { CURATED_COURSE_RECOMMENDATIONS } from '../server/services/career/careerCourseRecommendationsSeed.js';
import { CURATED_CAREER_ROLES } from '../server/services/career/careerRolesSeed.js';
import { CURATED_ROADMAPS } from '../server/services/career/careerRoadmapsSeed.js';
import { CareerCourseRecommendation } from '../server/services/career/types.js';
import * as supabaseModule from '../server/db/supabase.js';

describe('Stage 7.4 — CareerCourseRecommendationsStore', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    CareerCourseRecommendationsStore.resetFallbackCourses();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    vi.restoreAllMocks();
  });

  describe('Curated Course Library Governance & Integrity', () => {
    it('contains exactly 24 curated course recommendations across 6 launch roadmaps (4 per role)', () => {
      expect(CURATED_COURSE_RECOMMENDATIONS.length).toBe(24);
      expect(CURATED_COURSE_RECOMMENDATIONS.every(c => c.status === 'published')).toBe(true);
    });

    it('each of the 6 launch roles has exactly 4 curated courses', () => {
      // Collect roadmap items per role
      const roleMap = new Map<string, Set<string>>();
      for (const rm of CURATED_ROADMAPS) {
        const itemIds = new Set(rm.items.map(i => i.id));
        roleMap.set(rm.career_role_id, itemIds);
      }

      for (const [roleId, itemIds] of roleMap.entries()) {
        const coursesForRole = CURATED_COURSE_RECOMMENDATIONS.filter(c => itemIds.has(c.roadmap_item_id));
        expect(coursesForRole.length).toBe(4);
      }
    });

    it('each role features a progression of difficulties (foundation, core, advanced)', () => {
      for (const rm of CURATED_ROADMAPS) {
        const itemIds = new Set(rm.items.map(i => i.id));
        const coursesForRole = CURATED_COURSE_RECOMMENDATIONS.filter(c => itemIds.has(c.roadmap_item_id));
        const difficulties = coursesForRole.map(c => c.difficulty);

        expect(difficulties).toContain('foundation');
        expect(difficulties).toContain('core');
        expect(difficulties).toContain('advanced');
      }
    });

    it('all course recommendations have non-empty titles, providers, descriptions, and why_this_course', () => {
      for (const course of CURATED_COURSE_RECOMMENDATIONS) {
        expect(course.title.trim().length).toBeGreaterThanOrEqual(3);
        expect(course.title.length).toBeLessThanOrEqual(255);
        expect(course.provider_name.trim().length).toBeGreaterThanOrEqual(2);
        expect(course.provider_name.length).toBeLessThanOrEqual(150);
        expect(course.description.trim().length).toBeGreaterThanOrEqual(10);
        expect(course.description.length).toBeLessThanOrEqual(2000);
        expect(course.why_this_course.trim().length).toBeGreaterThanOrEqual(10);
        expect(course.why_this_course.length).toBeLessThanOrEqual(2000);
      }
    });

    it('all course recommendations have governed access types (free or free_account_required)', () => {
      const allowedAccess = new Set(['free', 'free_account_required']);
      for (const course of CURATED_COURSE_RECOMMENDATIONS) {
        expect(allowedAccess.has(course.access_type)).toBe(true);
      }
    });

    it('all URLs are HTTPS, contain no whitespace, and contain zero tracking or affiliate parameters', () => {
      for (const course of CURATED_COURSE_RECOMMENDATIONS) {
        expect(course.url.startsWith('https://')).toBe(true);
        expect(/\s/.test(course.url)).toBe(false);

        const parsed = new URL(course.url);
        // Zero affiliate, utm, or tracking query parameters
        expect(parsed.searchParams.has('utm_source')).toBe(false);
        expect(parsed.searchParams.has('utm_medium')).toBe(false);
        expect(parsed.searchParams.has('utm_campaign')).toBe(false);
        expect(parsed.searchParams.has('affiliate')).toBe(false);
        expect(parsed.searchParams.has('ref')).toBe(false);
      }
    });

    it('operates with zero AI claims, no speculative salary figures, and no course ranking/rating claims', () => {
      for (const course of CURATED_COURSE_RECOMMENDATIONS) {
        const serialized = JSON.stringify(course);
        // Zero salary claims
        expect(serialized).not.toMatch(/£\d+|\$\d+|salary|compensation|per annum/i);
        // Zero ranking claims
        expect(serialized).not.toMatch(/#1 course|best course|top course|highest rated|guaranteed/i);
        // Zero AI claims
        expect(serialized).not.toMatch(/ai recommended|generated by ai|ai career coach/i);
      }
    });
  });

  describe('URL Safety Validation', () => {
    it('accepts valid public HTTPS URLs', () => {
      expect(CareerCourseRecommendationsStore.isSafeHttpsUrl('https://cs50.harvard.edu/web/')).toBe(true);
      expect(CareerCourseRecommendationsStore.isSafeHttpsUrl('https://fullstackopen.com/en/part1')).toBe(true);
    });

    it('rejects HTTP, FTP, file, javascript URLs', () => {
      expect(CareerCourseRecommendationsStore.isSafeHttpsUrl('http://insecure.example.com')).toBe(false);
      expect(CareerCourseRecommendationsStore.isSafeHttpsUrl('ftp://example.com/file')).toBe(false);
      expect(CareerCourseRecommendationsStore.isSafeHttpsUrl('javascript:alert(1)')).toBe(false);
    });

    it('rejects localhost and private network IP addresses (SSRF prevention)', () => {
      expect(CareerCourseRecommendationsStore.isSafeHttpsUrl('https://localhost/course')).toBe(false);
      expect(CareerCourseRecommendationsStore.isSafeHttpsUrl('https://127.0.0.1/course')).toBe(false);
      expect(CareerCourseRecommendationsStore.isSafeHttpsUrl('https://10.0.0.1/course')).toBe(false);
      expect(CareerCourseRecommendationsStore.isSafeHttpsUrl('https://192.168.1.1/course')).toBe(false);
      expect(CareerCourseRecommendationsStore.isSafeHttpsUrl('https://172.16.0.1/course')).toBe(false);
    });

    it('rejects URLs containing whitespace or invalid strings', () => {
      expect(CareerCourseRecommendationsStore.isSafeHttpsUrl('https://example.com/spaced path')).toBe(false);
      expect(CareerCourseRecommendationsStore.isSafeHttpsUrl('')).toBe(false);
      expect(CareerCourseRecommendationsStore.isSafeHttpsUrl('not-a-url')).toBe(false);
    });
  });

  describe('Retrieval by Role Slug', () => {
    it('retrieves published courses for frontend-engineer with hydrated skill data', async () => {
      const res = await CareerCourseRecommendationsStore.getCoursesByRoleSlug('frontend-engineer');
      expect(res).not.toBeNull();
      expect(res!.role.slug).toBe('frontend-engineer');
      expect(res!.roadmap).not.toBeNull();
      expect(res!.total_courses).toBe(4);
      expect(res!.courses.length).toBe(4);

      // Verify skill details attached to course
      const firstCourse = res!.courses[0];
      expect(firstCourse).toHaveProperty('skill');
      expect(firstCourse.skill).toHaveProperty('skill_name');
      expect(firstCourse.skill).toHaveProperty('stage');
    });

    it('returns role with roadmap: null and empty courses for role without roadmap (e.g. mobile-developer)', async () => {
      const res = await CareerCourseRecommendationsStore.getCoursesByRoleSlug('mobile-developer');
      expect(res).not.toBeNull();
      expect(res!.role.slug).toBe('mobile-developer');
      expect(res!.roadmap).toBeNull();
      expect(res!.courses).toEqual([]);
      expect(res!.total_courses).toBe(0);
      expect(res!.message).toContain('No published roadmap');
    });

    it('returns null for nonexistent role slug', async () => {
      const res = await CareerCourseRecommendationsStore.getCoursesByRoleSlug('nonexistent-role-xyz');
      expect(res).toBeNull();
    });

    it('excludes draft and archived courses from results', async () => {
      const spy = vi.spyOn(supabaseModule, 'getAdminClient').mockReturnValue(null as any);
      try {
        const mockCourses: CareerCourseRecommendation[] = [
          {
            id: 'test-course-pub',
            roadmap_item_id: 'c1000000-0000-0000-0000-000000000001',
            title: 'Published Course',
            provider_name: 'Test University',
            url: 'https://example.com/pub-course',
            description: 'A published course description.',
            why_this_course: 'Why this course is helpful.',
            access_type: 'free',
            difficulty: 'foundation',
            display_order: 1,
            status: 'published',
            created_at: '2026-08-01T00:00:00Z',
            updated_at: '2026-08-01T00:00:00Z'
          },
          {
            id: 'test-course-draft',
            roadmap_item_id: 'c1000000-0000-0000-0000-000000000001',
            title: 'Draft Course',
            provider_name: 'Test University',
            url: 'https://example.com/draft-course',
            description: 'A draft course description.',
            why_this_course: 'Why this course is helpful.',
            access_type: 'free',
            difficulty: 'foundation',
            display_order: 2,
            status: 'draft',
            created_at: '2026-08-01T00:00:00Z',
            updated_at: '2026-08-01T00:00:00Z'
          },
          {
            id: 'test-course-arch',
            roadmap_item_id: 'c1000000-0000-0000-0000-000000000001',
            title: 'Archived Course',
            provider_name: 'Test University',
            url: 'https://example.com/arch-course',
            description: 'An archived course description.',
            why_this_course: 'Why this course was helpful.',
            access_type: 'free',
            difficulty: 'foundation',
            display_order: 3,
            status: 'archived',
            created_at: '2026-08-01T00:00:00Z',
            updated_at: '2026-08-01T00:00:00Z'
          }
        ];

        CareerCourseRecommendationsStore.resetFallbackCourses(mockCourses);

        const res = await CareerCourseRecommendationsStore.getCoursesByRoleSlug('frontend-engineer');
        expect(res).not.toBeNull();
        expect(res!.courses.length).toBe(1);
        expect(res!.courses[0].id).toBe('test-course-pub');
      } finally {
        spy.mockRestore();
      }
    });

    it('orders courses deterministically by display_order ascending', async () => {
      const spy = vi.spyOn(supabaseModule, 'getAdminClient').mockReturnValue(null as any);
      try {
        const mockCourses: CareerCourseRecommendation[] = [
          {
            id: 'test-course-2',
            roadmap_item_id: 'c1000000-0000-0000-0000-000000000001',
            title: 'Second Course',
            provider_name: 'Provider B',
            url: 'https://example.com/second-course',
            description: 'Second course description.',
            why_this_course: 'Why second.',
            access_type: 'free',
            difficulty: 'foundation',
            display_order: 2,
            status: 'published',
            created_at: '2026-08-01T00:00:00Z',
            updated_at: '2026-08-01T00:00:00Z'
          },
          {
            id: 'test-course-1',
            roadmap_item_id: 'c1000000-0000-0000-0000-000000000001',
            title: 'First Course',
            provider_name: 'Provider A',
            url: 'https://example.com/first-course',
            description: 'First course description.',
            why_this_course: 'Why first.',
            access_type: 'free',
            difficulty: 'foundation',
            display_order: 1,
            status: 'published',
            created_at: '2026-08-01T00:00:00Z',
            updated_at: '2026-08-01T00:00:00Z'
          }
        ];

        CareerCourseRecommendationsStore.resetFallbackCourses(mockCourses);

        const res = await CareerCourseRecommendationsStore.getCoursesByRoleSlug('frontend-engineer');
        expect(res!.courses[0].display_order).toBe(1);
        expect(res!.courses[1].display_order).toBe(2);
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('Retrieval by Item ID', () => {
    it('retrieves published courses for a specific roadmap item', async () => {
      const courses = await CareerCourseRecommendationsStore.getCoursesByItemId('c1000000-0000-0000-0000-000000000001');
      expect(Array.isArray(courses)).toBe(true);
      expect(courses.length).toBeGreaterThan(0);
      expect(courses.every(c => c.roadmap_item_id === 'c1000000-0000-0000-0000-000000000001')).toBe(true);
    });

    it('returns empty array for nonexistent item ID', async () => {
      const courses = await CareerCourseRecommendationsStore.getCoursesByItemId('nonexistent-item-id');
      expect(courses).toEqual([]);
    });
  });

  describe('Production Environment Gating', () => {
    it('strictly fails closed in production environment if client is unavailable', async () => {
      const spy = vi.spyOn(supabaseModule, 'getAdminClient').mockReturnValue(null as any);
      try {
        process.env.NODE_ENV = 'production';
        await expect(CareerCourseRecommendationsStore.getCoursesByRoleSlug('frontend-engineer')).rejects.toThrow('DATABASE_ERROR');
      } finally {
        spy.mockRestore();
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('strictly fails closed in production when database query returns error', async () => {
      const mockSupabase = {
        from: (table: string) => {
          if (table === 'career_roles') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: () => Promise.resolve({
                      data: {
                        id: 'a1000000-0000-0000-0000-000000000001',
                        slug: 'frontend-engineer',
                        title: 'Frontend Engineer',
                        career_area: 'Software Engineering',
                        status: 'published'
                      },
                      error: null
                    }),
                  }),
                }),
              }),
            };
          }
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: () => Promise.resolve({ data: null, error: { message: 'connection failure' } }),
                    }),
                  }),
                }),
              }),
            }),
          };
        },
      };

      const spy = vi.spyOn(supabaseModule, 'getAdminClient').mockReturnValue(mockSupabase as any);
      try {
        process.env.NODE_ENV = 'production';
        await expect(CareerCourseRecommendationsStore.getCoursesByRoleSlug('frontend-engineer')).rejects.toThrow('DATABASE_ERROR');
      } finally {
        spy.mockRestore();
        process.env.NODE_ENV = originalEnv;
      }
    });
  });
});
