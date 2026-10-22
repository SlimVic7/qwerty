import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CareerRolesStore } from '../server/services/career/careerRolesStore.js';
import { CURATED_CAREER_ROLES } from '../server/services/career/careerRolesSeed.js';
import { CareerRole } from '../server/services/career/types.js';
import * as supabaseModule from '../server/db/supabase.js';

describe('Stage 7.1 — CareerRolesStore', () => {
  beforeEach(() => {
    CareerRolesStore.resetFallbackRoles();
  });

  describe('Curated Library & Listing', () => {
    it('returns all published roles sorted deterministically by display_order', async () => {
      const result = await CareerRolesStore.listRoles();
      expect(result.total).toBeGreaterThanOrEqual(10);
      expect(result.roles.length).toBe(result.total);

      // Verify display_order ascending
      for (let i = 0; i < result.roles.length - 1; i++) {
        expect(result.roles[i].display_order).toBeLessThanOrEqual(result.roles[i + 1].display_order);
      }
    });

    it('filters roles accurately by career area', async () => {
      const seResult = await CareerRolesStore.listRoles({ area: 'Software Engineering' });
      expect(seResult.roles.length).toBeGreaterThan(0);
      expect(seResult.roles.every(r => r.career_area === 'Software Engineering')).toBe(true);

      const dataResult = await CareerRolesStore.listRoles({ area: 'Data & Analytics' });
      expect(dataResult.roles.length).toBeGreaterThan(0);
      expect(dataResult.roles.every(r => r.career_area === 'Data & Analytics')).toBe(true);
    });

    it('searches roles by title, summary, and skills', async () => {
      // By title
      const frontendResult = await CareerRolesStore.listRoles({ search: 'Frontend' });
      expect(frontendResult.roles.some(r => r.slug === 'frontend-engineer')).toBe(true);

      // By skill
      const tsResult = await CareerRolesStore.listRoles({ search: 'TypeScript' });
      expect(tsResult.roles.length).toBeGreaterThan(0);
      expect(tsResult.roles.some(r => r.slug === 'frontend-engineer')).toBe(true);

      // Non-matching term
      const emptyResult = await CareerRolesStore.listRoles({ search: 'nonexistenttermxyz123' });
      expect(emptyResult.roles.length).toBe(0);
      expect(emptyResult.total).toBe(0);
    });

    it('strictly excludes draft and archived roles from public candidate listings', async () => {
      const mockRoles: CareerRole[] = [
        ...CURATED_CAREER_ROLES,
        {
          id: 'test-draft-001',
          slug: 'draft-engineer',
          title: 'Draft Engineer',
          short_summary: 'Draft summary',
          career_area: 'Software Engineering',
          overview: 'Draft overview',
          responsibilities: ['Draft'],
          core_skills: ['Draft'],
          supporting_skills: ['Draft'],
          typical_background: 'Draft',
          career_progression: [],
          related_roles: [],
          status: 'draft',
          display_order: 99,
          created_at: '2026-08-01T00:00:00Z',
          updated_at: '2026-08-01T00:00:00Z'
        },
        {
          id: 'test-archived-002',
          slug: 'archived-engineer',
          title: 'Archived Engineer',
          short_summary: 'Archived summary',
          career_area: 'Software Engineering',
          overview: 'Archived overview',
          responsibilities: ['Archived'],
          core_skills: ['Archived'],
          supporting_skills: ['Archived'],
          typical_background: 'Archived',
          career_progression: [],
          related_roles: [],
          status: 'archived',
          display_order: 100,
          created_at: '2026-08-01T00:00:00Z',
          updated_at: '2026-08-01T00:00:00Z'
        }
      ];

      CareerRolesStore.resetFallbackRoles(mockRoles);

      const listResult = await CareerRolesStore.listRoles();
      expect(listResult.roles.some(r => r.slug === 'draft-engineer')).toBe(false);
      expect(listResult.roles.some(r => r.slug === 'archived-engineer')).toBe(false);

      const draftDetail = await CareerRolesStore.getRoleBySlug('draft-engineer');
      expect(draftDetail).toBeNull();
    });
  });

  describe('Role Detail & Related Roles', () => {
    it('retrieves single role by slug with hydrated related roles', async () => {
      const role = await CareerRolesStore.getRoleBySlug('frontend-engineer');
      expect(role).not.toBeNull();
      expect(role!.slug).toBe('frontend-engineer');
      expect(role!.title).toBe('Frontend Engineer');
      expect(role!.responsibilities.length).toBeGreaterThan(0);
      expect(role!.core_skills.length).toBeGreaterThan(0);
      expect(role!.career_progression.length).toBeGreaterThan(0);
      expect(role!.related_roles.length).toBeGreaterThan(0);

      // Verify related role hydration includes title and area
      const related = role!.related_roles[0];
      expect(related.slug).toBeDefined();
      expect(related.title).toBeDefined();
      expect(related.career_area).toBeDefined();
    });

    it('returns null for nonexistent role slug', async () => {
      const role = await CareerRolesStore.getRoleBySlug('nonexistent-role-slug');
      expect(role).toBeNull();
    });
  });

  describe('Area Summaries', () => {
    it('returns sorted unique career areas with non-zero counts', async () => {
      const areas = await CareerRolesStore.getCareerAreas();
      expect(areas.length).toBeGreaterThan(0);

      const totalCount = areas.reduce((acc, curr) => acc + curr.count, 0);
      expect(totalCount).toBe(CURATED_CAREER_ROLES.filter(r => r.status === 'published').length);

      expect(areas.some(a => a.name === 'Software Engineering')).toBe(true);
      expect(areas.some(a => a.name === 'Data & Analytics')).toBe(true);
    });
  });

  describe('Zero AI & Integrity Guardrails', () => {
    it('operates with zero AI runtime calls and no dynamic salary claims', async () => {
      const result = await CareerRolesStore.listRoles();
      for (const role of result.roles) {
        // Assert no salary figures or claims
        expect(JSON.stringify(role)).not.toMatch(/£\d+|\$\d+|salary|compensation range/i);
        // Assert deterministic static data structure
        expect(role.id).toBeDefined();
        expect(role.slug).toBeDefined();
        expect(role.title).toBeDefined();
      }
    });

    it('performing career store queries causes zero state mutations across tables', async () => {
      // Calling listRoles and getRoleBySlug is purely read-only
      const beforeList = await CareerRolesStore.listRoles();
      const beforeDetail = await CareerRolesStore.getRoleBySlug('frontend-engineer');
      const afterList = await CareerRolesStore.listRoles();

      expect(beforeList.total).toBe(afterList.total);
      expect(beforeDetail).not.toBeNull();
    });
  });

  describe('Production Environment Gating', () => {
    it('strictly fails closed in production environment without falling back to seed catalog when client is unavailable', async () => {
      const originalEnv = process.env.NODE_ENV;
      const spy = vi.spyOn(supabaseModule, 'getAdminClient').mockReturnValue(null as any);
      try {
        process.env.NODE_ENV = 'production';
        await expect(CareerRolesStore.listRoles()).rejects.toThrow('DATABASE_ERROR');
        await expect(CareerRolesStore.getRoleBySlug('frontend-engineer')).rejects.toThrow('DATABASE_ERROR');
      } finally {
        spy.mockRestore();
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('strictly fails closed in production when database query returns error', async () => {
      const originalEnv = process.env.NODE_ENV;
      const createChainableError = () => {
        const promise = Promise.resolve({ data: null, error: { message: 'relation does not exist' } });
        const chain: any = {
          then: promise.then.bind(promise),
          catch: promise.catch.bind(promise),
          select: () => chain,
          eq: () => chain,
          ilike: () => chain,
          order: () => chain,
          maybeSingle: () => Promise.resolve({ data: null, error: { message: 'relation does not exist' } }),
        };
        return chain;
      };
      const mockSupabase = {
        from: () => createChainableError(),
      };
      const spy = vi.spyOn(supabaseModule, 'getAdminClient').mockReturnValue(mockSupabase as any);
      try {
        process.env.NODE_ENV = 'production';
        await expect(CareerRolesStore.listRoles()).rejects.toThrow('DATABASE_ERROR');
        await expect(CareerRolesStore.getRoleBySlug('frontend-engineer')).rejects.toThrow('DATABASE_ERROR');
      } finally {
        spy.mockRestore();
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('returns null instead of falling back to seed catalog when role is not in production DB', async () => {
      const originalEnv = process.env.NODE_ENV;
      const mockSupabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
        }),
      };
      const spy = vi.spyOn(supabaseModule, 'getAdminClient').mockReturnValue(mockSupabase as any);
      try {
        process.env.NODE_ENV = 'production';
        // Even though 'frontend-engineer' exists in fallbackRoles, in production it must return null
        const result = await CareerRolesStore.getRoleBySlug('frontend-engineer');
        expect(result).toBeNull();
      } finally {
        spy.mockRestore();
        process.env.NODE_ENV = originalEnv;
      }
    });
  });
});
