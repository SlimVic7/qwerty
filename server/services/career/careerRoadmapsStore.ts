/**
 * QWERTY Stage 7.2 — Career Role Roadmaps Store
 * Curated career role roadmap data management, versioning, and stage filtering.
 * Zero AI calls, zero salary speculation, zero course provider marketplace links.
 */

import { getAdminClient } from '../../db/supabase.js';
import {
  CareerRoleRoadmap,
  CareerRoleRoadmapItem,
  RoleRoadmapResponse
} from './types.js';
import { CURATED_ROADMAPS } from './careerRoadmapsSeed.js';
import { CareerRolesStore } from './careerRolesStore.js';

let fallbackRoadmaps: CareerRoleRoadmap[] = [...CURATED_ROADMAPS];

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
    msg.includes('career_role_roadmaps') ||
    msg.includes('career_role_roadmap_items') ||
    hint.includes('perhaps you meant')
  );
}

export class CareerRoadmapsStore {
  /**
   * Reset or configure fallback roadmaps for testing
   */
  public static resetFallbackRoadmaps(roadmaps?: CareerRoleRoadmap[]): void {
    fallbackRoadmaps = roadmaps ? [...roadmaps] : [...CURATED_ROADMAPS];
  }

  /**
   * Retrieve the published skill roadmap for a career role by canonical role slug.
   * If the role exists but has no published roadmap, returns role with roadmap: null.
   * If the role itself does not exist, returns null (triggering 404 ROLE_NOT_FOUND).
   */
  public static async getRoadmapByRoleSlug(slug: string): Promise<RoleRoadmapResponse | null> {
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

    // 2. Strict Production Path: Authoritative database query ONLY. No runtime fallback allowed.
    if (isProduction()) {
      const supabase = getAdminClient();
      if (!supabase) {
        console.error('[ROADMAP_STORE] Supabase client unavailable in production');
        throw new Error('DATABASE_ERROR');
      }

      // Query published roadmap for this career_role_id (highest published version)
      const { data: roadmapData, error: roadmapError } = await supabase
        .from('career_role_roadmaps')
        .select('*')
        .eq('career_role_id', role.id)
        .eq('status', 'published')
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (roadmapError) {
        console.error('[ROADMAP_STORE] Production database error fetching roadmap:', roadmapError);
        throw new Error('DATABASE_ERROR');
      }

      if (!roadmapData) {
        return {
          role: roleSummary,
          roadmap: null,
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
        console.error('[ROADMAP_STORE] Production database error fetching roadmap items:', itemsError);
        throw new Error('DATABASE_ERROR');
      }

      const roadmap: CareerRoleRoadmap = {
        ...(roadmapData as CareerRoleRoadmap),
        items: (itemsData || []) as CareerRoleRoadmapItem[]
      };

      return {
        role: roleSummary,
        roadmap
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

          if (!itemsError) {
            return {
              role: roleSummary,
              roadmap: {
                ...(roadmapData as CareerRoleRoadmap),
                items: (itemsData || []) as CareerRoleRoadmapItem[]
              }
            };
          }
        }

        if (roadmapError && !isTableMissingError(roadmapError)) {
          console.warn('[ROADMAP_STORE] Supabase roadmap query warning in dev/test:', roadmapError.message);
        }
      }
    } catch (err: any) {
      if (!isTableMissingError(err)) {
        console.warn('[ROADMAP_STORE] Development roadmap query warning:', err.message);
      }
    }

    // In-memory curated catalog fallback strictly for development and test environments
    const matchingRoadmaps = fallbackRoadmaps
      .filter(rm => rm.career_role_id === role.id && rm.status === 'published')
      .sort((a, b) => b.version - a.version);
    const fallback = matchingRoadmaps[0] || null;

    if (!fallback) {
      return {
        role: roleSummary,
        roadmap: null,
        message: 'No published roadmap available for this role.'
      };
    }

    // Clone and sort items deterministically
    const sortedItems = [...(fallback.items || [])].sort(
      (a, b) => a.display_order - b.display_order || a.skill_name.localeCompare(b.skill_name)
    );

    return {
      role: roleSummary,
      roadmap: {
        ...fallback,
        items: sortedItems
      }
    };
  }
}
