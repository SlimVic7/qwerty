/**
 * QWERTY Stage 7.1 — Career Role Library Store
 * Curated career role data management, area filtering, and search.
 * Zero AI calls, zero salary speculation.
 */

import { getAdminClient } from '../../db/supabase.js';
import {
  CareerRole,
  CareerRoleFilters,
  CareerAreaSummary,
  CareerRolesListResponse
} from './types.js';
import { CURATED_CAREER_ROLES } from './careerRolesSeed.js';

let fallbackRoles: CareerRole[] = [...CURATED_CAREER_ROLES];

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
    msg.includes('career_roles') ||
    hint.includes('perhaps you meant')
  );
}

export class CareerRolesStore {
  /**
   * Reset or configure fallback roles for testing
   */
  public static resetFallbackRoles(roles?: CareerRole[]): void {
    fallbackRoles = roles ? [...roles] : [...CURATED_CAREER_ROLES];
  }

  /**
   * List all published career roles with optional area filtering and text search.
   */
  public static async listRoles(filters?: CareerRoleFilters): Promise<CareerRolesListResponse> {
    const area = filters?.area?.trim();
    const search = filters?.search?.trim().toLowerCase();

    // 1. Strict Production Path: Authoritative database query ONLY. No runtime fallback allowed.
    if (isProduction()) {
      const supabase = getAdminClient();
      if (!supabase) {
        console.error('[CAREER_STORE] Supabase client unavailable in production');
        throw new Error('DATABASE_ERROR');
      }

      let query = supabase
        .from('career_roles')
        .select('*')
        .eq('status', 'published')
        .order('display_order', { ascending: true })
        .order('title', { ascending: true });

      if (area && area !== 'all') {
        query = query.ilike('career_area', area);
      }

      const { data, error } = await query;
      if (error) {
        console.error('[CAREER_STORE] Production database failure querying career_roles:', error);
        throw new Error('DATABASE_ERROR');
      }

      let roles: CareerRole[] = (data || []) as CareerRole[];
      if (search) {
        roles = roles.filter(role => this.matchesSearch(role, search));
      }
      const areas = this.calculateAreaSummaries((data || []) as CareerRole[]);
      return {
        roles,
        total: roles.length,
        areas
      };
    }

    // 2. Development & Test Path: Attempt database if available, fall back to seed catalog if table missing.
    try {
      const supabase = getAdminClient();
      if (supabase) {
        let query = supabase
          .from('career_roles')
          .select('*')
          .eq('status', 'published')
          .order('display_order', { ascending: true })
          .order('title', { ascending: true });

        if (area && area !== 'all') {
          query = query.ilike('career_area', area);
        }

        const { data, error } = await query;

        if (!error && data && data.length > 0) {
          let roles: CareerRole[] = data as CareerRole[];

          if (search) {
            roles = roles.filter(role => this.matchesSearch(role, search));
          }

          const areas = this.calculateAreaSummaries(data as CareerRole[]);

          return {
            roles,
            total: roles.length,
            areas
          };
        }

        if (error && !isTableMissingError(error)) {
          console.warn('[CAREER_STORE] Supabase query warning in development/test:', error.message);
        }
      }
    } catch (err: any) {
      if (!isTableMissingError(err)) {
        console.warn('[CAREER_STORE] Development query warning:', err.message);
      }
    }

    // In-memory curated catalog fallback strictly for development and test environments
    let roles = fallbackRoles.filter(role => role.status === 'published');

    if (area && area.toLowerCase() !== 'all') {
      roles = roles.filter(
        role => role.career_area.toLowerCase() === area.toLowerCase()
      );
    }

    if (search) {
      roles = roles.filter(role => this.matchesSearch(role, search));
    }

    // Sort deterministically
    roles.sort((a, b) => a.display_order - b.display_order || a.title.localeCompare(b.title));

    const areas = this.calculateAreaSummaries(fallbackRoles.filter(r => r.status === 'published'));

    return {
      roles,
      total: roles.length,
      areas
    };
  }

  /**
   * Get a single published career role by slug with hydrated related roles.
   */
  public static async getRoleBySlug(slug: string): Promise<CareerRole | null> {
    const normalizedSlug = (slug || '').trim().toLowerCase();
    if (!normalizedSlug) return null;

    // 1. Strict Production Path: Authoritative database query ONLY. No runtime fallback allowed.
    if (isProduction()) {
      const supabase = getAdminClient();
      if (!supabase) {
        console.error('[CAREER_STORE] Supabase client unavailable in production');
        throw new Error('DATABASE_ERROR');
      }

      const { data, error } = await supabase
        .from('career_roles')
        .select('*')
        .eq('slug', normalizedSlug)
        .eq('status', 'published')
        .maybeSingle();

      if (error) {
        console.error('[CAREER_STORE] Production database error fetching role by slug:', error);
        throw new Error('DATABASE_ERROR');
      }

      if (!data) {
        return null; // Not found in database -> 404
      }

      return this.hydrateRelatedRoles(data as CareerRole);
    }

    // 2. Development & Test Path: Attempt database if available, fall back to seed catalog if table missing.
    try {
      const supabase = getAdminClient();
      if (supabase) {
        const { data, error } = await supabase
          .from('career_roles')
          .select('*')
          .eq('slug', normalizedSlug)
          .eq('status', 'published')
          .maybeSingle();

        if (!error && data) {
          return this.hydrateRelatedRoles(data as CareerRole);
        }

        if (error && !isTableMissingError(error)) {
          console.warn('[CAREER_STORE] Supabase slug query error in development/test:', error.message);
        }
      }
    } catch (err: any) {
      if (!isTableMissingError(err)) {
        console.warn('[CAREER_STORE] Development slug query warning:', err.message);
      }
    }

    // In-memory curated catalog fallback strictly for development and test environments
    const role = fallbackRoles.find(
      r => r.slug.toLowerCase() === normalizedSlug && r.status === 'published'
    );

    if (!role) return null;

    return this.hydrateRelatedRoles(role);
  }

  /**
   * Get distinct career areas with published role counts.
   */
  public static async getCareerAreas(): Promise<CareerAreaSummary[]> {
    const { areas } = await this.listRoles();
    return areas;
  }

  /**
   * Deterministic text search matcher across title, summary, overview, and skills.
   */
  public static matchesSearch(role: CareerRole, search: string): boolean {
    if (!search) return true;
    const term = search.toLowerCase();

    if (role.title.toLowerCase().includes(term)) return true;
    if (role.short_summary.toLowerCase().includes(term)) return true;
    if (role.overview.toLowerCase().includes(term)) return true;
    if (role.career_area.toLowerCase().includes(term)) return true;

    if (role.core_skills.some(skill => skill.toLowerCase().includes(term))) return true;
    if (role.supporting_skills.some(skill => skill.toLowerCase().includes(term))) return true;
    if (role.responsibilities.some(resp => resp.toLowerCase().includes(term))) return true;

    return false;
  }

  /**
   * Calculate summary counts for each career area.
   */
  private static calculateAreaSummaries(allPublishedRoles: CareerRole[]): CareerAreaSummary[] {
    const counts = new Map<string, number>();

    for (const role of allPublishedRoles) {
      if (role.status === 'published') {
        counts.set(role.career_area, (counts.get(role.career_area) || 0) + 1);
      }
    }

    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }

  /**
   * Hydrate related roles to ensure title and career area are present
   */
  private static hydrateRelatedRoles(role: CareerRole): CareerRole {
    if (!role.related_roles || role.related_roles.length === 0) {
      return role;
    }

    const hydratedRelated = role.related_roles.map(ref => {
      const match = fallbackRoles.find(r => r.slug.toLowerCase() === ref.slug.toLowerCase());
      return {
        slug: ref.slug,
        title: ref.title || match?.title || ref.slug,
        career_area: ref.career_area || match?.career_area
      };
    });

    return {
      ...role,
      related_roles: hydratedRelated
    };
  }
}
