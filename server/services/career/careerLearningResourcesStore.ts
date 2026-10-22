/**
 * QWERTY Stage 7.3 — Career Learning Resources Store
 * Curated educational learning & practice resources data management.
 * Strictly zero AI calls, zero salary speculation, zero course ranking/affiliates.
 * Authoritative production database source of truth with strict fail-closed security.
 */

import { getAdminClient } from '../../db/supabase.js';
import {
  CareerLearningResource,
  RoleRoadmapResourcesResponse,
  RoadmapItemWithResources,
  CareerRoleRoadmapWithResources
} from './types.js';
import { CURATED_LEARNING_RESOURCES } from './careerLearningResourcesSeed.js';
import { CareerRolesStore } from './careerRolesStore.js';
import { CareerRoadmapsStore } from './careerRoadmapsStore.js';

let fallbackResources: CareerLearningResource[] = [...CURATED_LEARNING_RESOURCES];

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function isTableMissingError(error: any): boolean {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  const hint = (error.hint || '').toLowerCase();
  return (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    msg.includes('could not find the table') ||
    msg.includes('career_learning_resources') ||
    msg.includes('career_role_roadmaps') ||
    msg.includes('career_role_roadmap_items') ||
    hint.includes('perhaps you meant')
  );
}

export class CareerLearningResourcesStore {
  /**
   * Safe URL validator for learning resource URLs.
   * Ensures HTTPS, rejects javascript/data/ftp/file, rejects localhost/private IPs.
   */
  public static isSafeHttpsUrl(urlStr: string): boolean {
    if (!urlStr || typeof urlStr !== 'string') return false;
    const trimmed = urlStr.trim();
    if (trimmed.length > 2048) return false;
    if (/\s/.test(trimmed)) return false;

    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'https:') return false;

      const hostname = parsed.hostname.toLowerCase();
      if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
        return false;
      }

      // Reject internal/private network IP patterns
      if (/^(0|10|127|172\.(1[6-9]|2[0-9]|3[01])|192\.168)\./.test(hostname)) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Reset or configure fallback learning resources for testing
   */
  public static resetFallbackResources(resources?: CareerLearningResource[]): void {
    fallbackResources = resources ? [...resources] : [...CURATED_LEARNING_RESOURCES];
  }

  /**
   * Retrieve published learning resources grouped under roadmap items for a canonical career role slug.
   * If role does not exist, returns null (triggering 404 ROLE_NOT_FOUND).
   * If role has no published roadmap, returns roadmap: null (200 Coming Soon).
   * If database query fails in production, throws DATABASE_ERROR (fails closed).
   */
  public static async getResourcesByRoleSlug(slug: string): Promise<RoleRoadmapResourcesResponse | null> {
    const normalizedSlug = (slug || '').trim().toLowerCase();
    if (!normalizedSlug) return null;

    // 1. Authoritative Role Verification: Role must exist and be published
    const role = await CareerRolesStore.getRoleBySlug(normalizedSlug);
    if (!role || role.status !== 'published') {
      return null;
    }

    const roleSummary = {
      id: role.id,
      slug: role.slug,
      title: role.title,
      career_area: role.career_area
    };

    // 2. Strict Production Path: Authoritative database queries ONLY. Fail closed on any failure.
    if (isProduction()) {
      const supabase = getAdminClient();
      if (!supabase) {
        console.error('[LEARNING_RESOURCES] Supabase client unavailable in production');
        throw new Error('DATABASE_ERROR');
      }

      // Query published roadmap for this career_role_id
      const { data: roadmapData, error: roadmapError } = await supabase
        .from('career_role_roadmaps')
        .select('*')
        .eq('career_role_id', role.id)
        .eq('status', 'published')
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (roadmapError) {
        console.error('[LEARNING_RESOURCES] Production database error fetching roadmap:', roadmapError);
        throw new Error('DATABASE_ERROR');
      }

      if (!roadmapData) {
        return {
          role: roleSummary,
          roadmap: null,
          total_resources: 0,
          message: 'No published roadmap available for this role.'
        };
      }

      // Query roadmap items for this roadmap
      const { data: itemsData, error: itemsError } = await supabase
        .from('career_role_roadmap_items')
        .select('*')
        .eq('roadmap_id', roadmapData.id)
        .order('display_order', { ascending: true });

      if (itemsError) {
        console.error('[LEARNING_RESOURCES] Production database error fetching roadmap items:', itemsError);
        throw new Error('DATABASE_ERROR');
      }

      const items = itemsData || [];
      const itemIds = items.map((i: any) => i.id);

      let publishedResources: CareerLearningResource[] = [];
      if (itemIds.length > 0) {
        const { data: resData, error: resError } = await supabase
          .from('career_learning_resources')
          .select('*')
          .in('roadmap_item_id', itemIds)
          .eq('status', 'published')
          .order('display_order', { ascending: true });

        if (resError) {
          console.error('[LEARNING_RESOURCES] Production database error fetching resources:', resError);
          throw new Error('DATABASE_ERROR');
        }

        publishedResources = (resData || []) as CareerLearningResource[];
      }

      // Group resources by roadmap_item_id
      const resourcesByItemId = new Map<string, CareerLearningResource[]>();
      for (const res of publishedResources) {
        const list = resourcesByItemId.get(res.roadmap_item_id) || [];
        list.push(res);
        resourcesByItemId.set(res.roadmap_item_id, list);
      }

      const itemsWithResources: RoadmapItemWithResources[] = items.map((item: any) => ({
        ...item,
        resources: resourcesByItemId.get(item.id) || []
      }));

      const roadmap: CareerRoleRoadmapWithResources = {
        ...roadmapData,
        items: itemsWithResources
      };

      return {
        role: roleSummary,
        roadmap,
        total_resources: publishedResources.length
      };
    }

    // 3. Development & Test Path: Attempt database if available, fall back cleanly if table missing
    try {
      const supabase = getAdminClient();
      if (supabase) {
        const { data: roadmapData, error: roadmapError } = await supabase
          .from('career_role_roadmaps')
          .select('*')
          .eq('career_role_id', role.id)
          .eq('status', 'published')
          .order('version', { ascending: false })
          .maybeSingle();

        if (!roadmapError && roadmapData) {
          const { data: itemsData, error: itemsError } = await supabase
            .from('career_role_roadmap_items')
            .select('*')
            .eq('roadmap_id', roadmapData.id)
            .order('display_order', { ascending: true });

          if (!itemsError && itemsData) {
            const itemIds = itemsData.map((i: any) => i.id);
            const { data: resData, error: resError } = await supabase
              .from('career_learning_resources')
              .select('*')
              .in('roadmap_item_id', itemIds)
              .eq('status', 'published')
              .order('display_order', { ascending: true });

            if (!resError && resData) {
              const resourcesByItemId = new Map<string, CareerLearningResource[]>();
              for (const res of resData as CareerLearningResource[]) {
                const list = resourcesByItemId.get(res.roadmap_item_id) || [];
                list.push(res);
                resourcesByItemId.set(res.roadmap_item_id, list);
              }

              const itemsWithResources: RoadmapItemWithResources[] = itemsData.map((item: any) => ({
                ...item,
                resources: resourcesByItemId.get(item.id) || []
              }));

              return {
                role: roleSummary,
                roadmap: {
                  ...roadmapData,
                  items: itemsWithResources
                },
                total_resources: resData.length
              };
            }
          }
        }

        if (roadmapError && !isTableMissingError(roadmapError)) {
          console.warn('[LEARNING_RESOURCES] Supabase roadmap query warning in dev/test:', roadmapError.message);
        }
      }
    } catch (err: any) {
      if (!isTableMissingError(err)) {
        console.warn('[LEARNING_RESOURCES] Development query warning:', err.message);
      }
    }

    // 4. In-memory curated fallback strictly for development and test environments
    const roadmapRes = await CareerRoadmapsStore.getRoadmapByRoleSlug(normalizedSlug);
    if (!roadmapRes || !roadmapRes.roadmap) {
      return {
        role: roleSummary,
        roadmap: null,
        total_resources: 0,
        message: 'No published roadmap available for this role.'
      };
    }

    const fallbackRoadmap = roadmapRes.roadmap;
    const itemIds = new Set(fallbackRoadmap.items.map(i => i.id));

    // Only include published resources belonging to this roadmap's items
    const relevantResources = fallbackResources
      .filter(r => itemIds.has(r.roadmap_item_id) && r.status === 'published')
      .sort((a, b) => a.display_order - b.display_order || a.title.localeCompare(b.title));

    const resourcesByItemId = new Map<string, CareerLearningResource[]>();
    for (const r of relevantResources) {
      const list = resourcesByItemId.get(r.roadmap_item_id) || [];
      list.push(r);
      resourcesByItemId.set(r.roadmap_item_id, list);
    }

    const itemsWithResources: RoadmapItemWithResources[] = fallbackRoadmap.items.map(item => ({
      ...item,
      resources: resourcesByItemId.get(item.id) || []
    }));

    return {
      role: roleSummary,
      roadmap: {
        ...fallbackRoadmap,
        items: itemsWithResources
      },
      total_resources: relevantResources.length
    };
  }

  /**
   * Retrieve published learning resources for a specific roadmap item ID.
   */
  public static async getResourcesByItemId(itemId: string): Promise<CareerLearningResource[]> {
    if (!itemId) return [];

    if (isProduction()) {
      const supabase = getAdminClient();
      if (!supabase) {
        console.error('[LEARNING_RESOURCES] Supabase client unavailable in production');
        throw new Error('DATABASE_ERROR');
      }

      const { data, error } = await supabase
        .from('career_learning_resources')
        .select('*')
        .eq('roadmap_item_id', itemId)
        .eq('status', 'published')
        .order('display_order', { ascending: true });

      if (error) {
        console.error('[LEARNING_RESOURCES] Production database error fetching item resources:', error);
        throw new Error('DATABASE_ERROR');
      }

      return (data || []) as CareerLearningResource[];
    }

    // Dev/test attempt DB then fallback
    try {
      const supabase = getAdminClient();
      if (supabase) {
        const { data, error } = await supabase
          .from('career_learning_resources')
          .select('*')
          .eq('roadmap_item_id', itemId)
          .eq('status', 'published')
          .order('display_order', { ascending: true });

        if (!error && data) {
          return data as CareerLearningResource[];
        }
      }
    } catch {
      // ignore in dev/test
    }

    return fallbackResources
      .filter(r => r.roadmap_item_id === itemId && r.status === 'published')
      .sort((a, b) => a.display_order - b.display_order || a.title.localeCompare(b.title));
  }
}
