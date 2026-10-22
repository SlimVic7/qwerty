/**
 * QWERTY Stage 7.3 — Career Learning Resources Store Unit Tests
 * Verifies curated learning resources retrieval, security gating, fail-closed behavior, URL validation, and Zero AI.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CareerLearningResourcesStore } from '../server/services/career/careerLearningResourcesStore.js';
import { CareerLearningResource } from '../server/services/career/types.js';
import * as supabaseModule from '../server/db/supabase.js';

describe('Stage 7.3 — CareerLearningResourcesStore', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    CareerLearningResourcesStore.resetFallbackResources();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    vi.restoreAllMocks();
  });

  describe('Retrieval by Role Slug', () => {
    it('retrieves published learning resources for frontend-engineer grouped by roadmap items', async () => {
      const res = await CareerLearningResourcesStore.getResourcesByRoleSlug('frontend-engineer');
      expect(res).not.toBeNull();
      expect(res!.role.slug).toBe('frontend-engineer');
      expect(res!.roadmap).not.toBeNull();
      expect(res!.total_resources).toBeGreaterThan(0);

      // Verify item with resources has expected properties
      const itemWithRes = res!.roadmap!.items.find(i => i.resources && i.resources.length > 0);
      expect(itemWithRes).toBeDefined();
      expect(itemWithRes!.resources[0]).toHaveProperty('title');
      expect(itemWithRes!.resources[0]).toHaveProperty('provider_name');
      expect(itemWithRes!.resources[0]).toHaveProperty('url');
      expect(itemWithRes!.resources[0].url.startsWith('https://')).toBe(true);
      expect(itemWithRes!.resources[0].status).toBe('published');
    });

    it('returns role with roadmap: null for published role without roadmap (e.g. mobile-developer)', async () => {
      const res = await CareerLearningResourcesStore.getResourcesByRoleSlug('mobile-developer');
      expect(res).not.toBeNull();
      expect(res!.role.slug).toBe('mobile-developer');
      expect(res!.roadmap).toBeNull();
      expect(res!.total_resources).toBe(0);
      expect(res!.message).toContain('No published roadmap');
    });

    it('returns null for nonexistent role slug', async () => {
      const res = await CareerLearningResourcesStore.getResourcesByRoleSlug('nonexistent-role-xyz');
      expect(res).toBeNull();
    });

    it('excludes draft and archived resources from results', async () => {
      const spy = vi.spyOn(supabaseModule, 'getAdminClient').mockReturnValue(null as any);
      try {
        const mockResources: CareerLearningResource[] = [
          {
            id: 'test-res-pub',
            roadmap_item_id: 'c1000000-0000-0000-0000-000000000001',
            title: 'Published Resource',
            provider_name: 'Test Provider',
            resource_type: 'documentation',
            url: 'https://example.com/pub',
            description: 'A published resource.',
            access_type: 'free',
            difficulty: 'foundation',
            display_order: 1,
            status: 'published',
            created_at: '2026-08-01T00:00:00Z',
            updated_at: '2026-08-01T00:00:00Z'
          },
          {
            id: 'test-res-draft',
            roadmap_item_id: 'c1000000-0000-0000-0000-000000000001',
            title: 'Draft Resource',
            provider_name: 'Test Provider',
            resource_type: 'guide',
            url: 'https://example.com/draft',
            description: 'A draft resource.',
            access_type: 'free',
            difficulty: 'foundation',
            display_order: 2,
            status: 'draft',
            created_at: '2026-08-01T00:00:00Z',
            updated_at: '2026-08-01T00:00:00Z'
          },
          {
            id: 'test-res-arch',
            roadmap_item_id: 'c1000000-0000-0000-0000-000000000001',
            title: 'Archived Resource',
            provider_name: 'Test Provider',
            resource_type: 'article',
            url: 'https://example.com/archived',
            description: 'An archived resource.',
            access_type: 'free',
            difficulty: 'foundation',
            display_order: 3,
            status: 'archived',
            created_at: '2026-08-01T00:00:00Z',
            updated_at: '2026-08-01T00:00:00Z'
          }
        ];

        CareerLearningResourcesStore.resetFallbackResources(mockResources);

        const res = await CareerLearningResourcesStore.getResourcesByRoleSlug('frontend-engineer');
        expect(res).not.toBeNull();
        const item = res!.roadmap!.items.find(i => i.id === 'c1000000-0000-0000-0000-000000000001');
        expect(item).toBeDefined();
        expect(item!.resources.length).toBe(1);
        expect(item!.resources[0].id).toBe('test-res-pub');
      } finally {
        spy.mockRestore();
      }
    });

    it('orders resources deterministically by display_order ascending', async () => {
      const spy = vi.spyOn(supabaseModule, 'getAdminClient').mockReturnValue(null as any);
      try {
        const mockResources: CareerLearningResource[] = [
          {
            id: 'test-res-2',
            roadmap_item_id: 'c1000000-0000-0000-0000-000000000001',
            title: 'Second Resource',
            provider_name: 'Provider B',
            resource_type: 'guide',
            url: 'https://example.com/second',
            description: 'Second resource.',
            access_type: 'free',
            difficulty: 'foundation',
            display_order: 2,
            status: 'published',
            created_at: '2026-08-01T00:00:00Z',
            updated_at: '2026-08-01T00:00:00Z'
          },
          {
            id: 'test-res-1',
            roadmap_item_id: 'c1000000-0000-0000-0000-000000000001',
            title: 'First Resource',
            provider_name: 'Provider A',
            resource_type: 'documentation',
            url: 'https://example.com/first',
            description: 'First resource.',
            access_type: 'free',
            difficulty: 'foundation',
            display_order: 1,
            status: 'published',
            created_at: '2026-08-01T00:00:00Z',
            updated_at: '2026-08-01T00:00:00Z'
          }
        ];

        CareerLearningResourcesStore.resetFallbackResources(mockResources);

        const res = await CareerLearningResourcesStore.getResourcesByRoleSlug('frontend-engineer');
        const item = res!.roadmap!.items.find(i => i.id === 'c1000000-0000-0000-0000-000000000001');
        expect(item!.resources[0].display_order).toBe(1);
        expect(item!.resources[1].display_order).toBe(2);
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('Retrieval by Item ID', () => {
    it('retrieves published resources for a specific roadmap item', async () => {
      const resources = await CareerLearningResourcesStore.getResourcesByItemId('c1000000-0000-0000-0000-000000000001');
      expect(Array.isArray(resources)).toBe(true);
      expect(resources.length).toBeGreaterThan(0);
      for (const r of resources) {
        expect(r.roadmap_item_id).toBe('c1000000-0000-0000-0000-000000000001');
        expect(r.status).toBe('published');
      }
    });

    it('returns empty array for unknown item ID', async () => {
      const resources = await CareerLearningResourcesStore.getResourcesByItemId('c9999999-9999-9999-9999-999999999999');
      expect(resources).toEqual([]);
    });
  });

  describe('URL Safety Validation', () => {
    it('accepts safe HTTPS URLs', () => {
      expect(CareerLearningResourcesStore.isSafeHttpsUrl('https://developer.mozilla.org/en-US/docs/Web/HTML')).toBe(true);
      expect(CareerLearningResourcesStore.isSafeHttpsUrl('https://www.w3.org/WAI/fundamentals/')).toBe(true);
      expect(CareerLearningResourcesStore.isSafeHttpsUrl('https://react.dev/learn')).toBe(true);
    });

    it('rejects non-HTTPS URLs', () => {
      expect(CareerLearningResourcesStore.isSafeHttpsUrl('http://insecure.example.com')).toBe(false);
      expect(CareerLearningResourcesStore.isSafeHttpsUrl('ftp://ftp.example.com/file')).toBe(false);
      expect(CareerLearningResourcesStore.isSafeHttpsUrl('javascript:alert(1)')).toBe(false);
      expect(CareerLearningResourcesStore.isSafeHttpsUrl('data:text/html;base64,PHNjcmlwdD4=')).toBe(false);
      expect(CareerLearningResourcesStore.isSafeHttpsUrl('file:///etc/passwd')).toBe(false);
    });

    it('rejects localhost, loopback, and private network addresses', () => {
      expect(CareerLearningResourcesStore.isSafeHttpsUrl('https://localhost/api')).toBe(false);
      expect(CareerLearningResourcesStore.isSafeHttpsUrl('https://127.0.0.1:8080')).toBe(false);
      expect(CareerLearningResourcesStore.isSafeHttpsUrl('https://10.0.0.1/admin')).toBe(false);
      expect(CareerLearningResourcesStore.isSafeHttpsUrl('https://192.168.1.1/internal')).toBe(false);
      expect(CareerLearningResourcesStore.isSafeHttpsUrl('https://172.20.0.1/secret')).toBe(false);
    });

    it('rejects whitespace, empty, or oversized URLs', () => {
      expect(CareerLearningResourcesStore.isSafeHttpsUrl('')).toBe(false);
      expect(CareerLearningResourcesStore.isSafeHttpsUrl('   ')).toBe(false);
      expect(CareerLearningResourcesStore.isSafeHttpsUrl('https://example.com/ bad path')).toBe(false);
      expect(CareerLearningResourcesStore.isSafeHttpsUrl('https://example.com/' + 'a'.repeat(2100))).toBe(false);
    });
  });

  describe('Production Environment Guardrails (Fail-Closed)', () => {
    it('strictly fails closed in production when Supabase client is unavailable', async () => {
      process.env.NODE_ENV = 'production';
      vi.spyOn(supabaseModule, 'getAdminClient').mockReturnValue(null as any);

      await expect(
        CareerLearningResourcesStore.getResourcesByRoleSlug('frontend-engineer')
      ).rejects.toThrow('DATABASE_ERROR');
    });

    it('strictly fails closed in production when database query returns an error', async () => {
      process.env.NODE_ENV = 'production';
      const mockClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'relation "career_learning_resources" does not exist' }
          })
        })
      };
      vi.spyOn(supabaseModule, 'getAdminClient').mockReturnValue(mockClient as any);

      await expect(
        CareerLearningResourcesStore.getResourcesByRoleSlug('frontend-engineer')
      ).rejects.toThrow('DATABASE_ERROR');
    });
  });
});
