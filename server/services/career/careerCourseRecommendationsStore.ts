/**
 * QWERTY Stage 7.4 — Career Course Recommendations Store
 * Curated structured course recommendation data management.
 * Strictly zero AI calls, zero salary speculation, zero course ranking/affiliates.
 * Authoritative production database source of truth with strict fail-closed security.
 */

import { getAdminClient } from '../../db/supabase.js';
import {
  CareerCourseRecommendation,
  CareerCourseWithSkill,
  RoleCourseRecommendationsResponse
} from './types.js';
import { CURATED_COURSE_RECOMMENDATIONS } from './careerCourseRecommendationsSeed.js';
import { CareerRolesStore } from './careerRolesStore.js';
import { CareerRoadmapsStore } from './careerRoadmapsStore.js';

let fallbackCourses: CareerCourseRecommendation[] = [...CURATED_COURSE_RECOMMENDATIONS];

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
    msg.includes('career_course_recommendations') ||
    msg.includes('career_role_roadmaps') ||
    msg.includes('career_role_roadmap_items') ||
    hint.includes('perhaps you meant')
  );
}

export class CareerCourseRecommendationsStore {
  /**
   * Safe URL validator for course recommendation URLs.
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
   * Reset or configure fallback course recommendations for testing
   */
  public static resetFallbackCourses(courses?: CareerCourseRecommendation[]): void {
    fallbackCourses = courses ? [...courses] : [...CURATED_COURSE_RECOMMENDATIONS];
  }

  /**
   * Retrieve published course recommendations for a canonical career role slug.
   * If role does not exist, returns null (triggering 404 ROLE_NOT_FOUND).
   * If role has no published roadmap, returns roadmap: null and courses: [] (200).
   * If database query fails in production, throws DATABASE_ERROR (fails closed).
   */
  public static async getCoursesByRoleSlug(slug: string): Promise<RoleCourseRecommendationsResponse | null> {
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
        console.error('[COURSE_STORE] Supabase client unavailable in production');
        throw new Error('DATABASE_ERROR');
      }

      // Query published roadmap for this career_role_id with explicit highest integer version order
      const { data: roadmapData, error: roadmapError } = await supabase
        .from('career_role_roadmaps')
        .select('*')
        .eq('career_role_id', role.id)
        .eq('status', 'published')
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (roadmapError) {
        console.error('[COURSE_STORE] Production database error fetching roadmap:', roadmapError);
        throw new Error('DATABASE_ERROR');
      }

      if (!roadmapData) {
        return {
          role: roleSummary,
          roadmap: null,
          courses: [],
          total_courses: 0,
          message: 'No published roadmap available for this role.'
        };
      }

      // Query roadmap items for this current roadmap
      const { data: itemsData, error: itemsError } = await supabase
        .from('career_role_roadmap_items')
        .select('*')
        .eq('roadmap_id', roadmapData.id)
        .order('display_order', { ascending: true });

      if (itemsError) {
        console.error('[COURSE_STORE] Production database error fetching roadmap items:', itemsError);
        throw new Error('DATABASE_ERROR');
      }

      const items = itemsData || [];
      const itemMap = new Map<string, any>();
      for (const item of items) {
        itemMap.set(item.id, item);
      }
      const itemIds = items.map((i: any) => i.id);

      let publishedCourses: CareerCourseRecommendation[] = [];
      if (itemIds.length > 0) {
        const { data: courseData, error: courseError } = await supabase
          .from('career_course_recommendations')
          .select('*')
          .in('roadmap_item_id', itemIds)
          .eq('status', 'published')
          .order('display_order', { ascending: true });

        if (courseError) {
          console.error('[COURSE_STORE] Production database error fetching courses:', courseError);
          throw new Error('DATABASE_ERROR');
        }

        publishedCourses = (courseData || []) as CareerCourseRecommendation[];
      }

      // Attach skill details to each course
      const coursesWithSkill: CareerCourseWithSkill[] = publishedCourses.map(course => {
        const skill = itemMap.get(course.roadmap_item_id);
        return {
          ...course,
          skill: {
            id: skill ? skill.id : course.roadmap_item_id,
            skill_name: skill ? skill.skill_name : 'Unknown Skill',
            stage: skill ? skill.stage : 'foundation',
            display_order: skill ? skill.display_order : 0
          }
        };
      });

      return {
        role: roleSummary,
        roadmap: {
          id: roadmapData.id,
          title: roadmapData.title,
          version: roadmapData.version,
          version_label: roadmapData.version_label,
          status: roadmapData.status
        },
        courses: coursesWithSkill,
        total_courses: coursesWithSkill.length
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
          .limit(1)
          .maybeSingle();

        if (!roadmapError && roadmapData) {
          const { data: itemsData, error: itemsError } = await supabase
            .from('career_role_roadmap_items')
            .select('*')
            .eq('roadmap_id', roadmapData.id)
            .order('display_order', { ascending: true });

          if (!itemsError && itemsData) {
            const itemMap = new Map<string, any>();
            for (const item of itemsData) {
              itemMap.set(item.id, item);
            }
            const itemIds = itemsData.map((i: any) => i.id);

            const { data: courseData, error: courseError } = await supabase
              .from('career_course_recommendations')
              .select('*')
              .in('roadmap_item_id', itemIds)
              .eq('status', 'published')
              .order('display_order', { ascending: true });

            if (!courseError && courseData) {
              const coursesWithSkill: CareerCourseWithSkill[] = (courseData as CareerCourseRecommendation[]).map(course => {
                const skill = itemMap.get(course.roadmap_item_id);
                return {
                  ...course,
                  skill: {
                    id: skill ? skill.id : course.roadmap_item_id,
                    skill_name: skill ? skill.skill_name : 'Unknown Skill',
                    stage: skill ? skill.stage : 'foundation',
                    display_order: skill ? skill.display_order : 0
                  }
                };
              });

              return {
                role: roleSummary,
                roadmap: {
                  id: roadmapData.id,
                  title: roadmapData.title,
                  version: roadmapData.version,
                  version_label: roadmapData.version_label,
                  status: roadmapData.status
                },
                courses: coursesWithSkill,
                total_courses: coursesWithSkill.length
              };
            }
          }
        }

        if (roadmapError && !isTableMissingError(roadmapError)) {
          console.warn('[COURSE_STORE] Supabase roadmap query warning in dev/test:', roadmapError.message);
        }
      }
    } catch (err: any) {
      if (!isTableMissingError(err)) {
        console.warn('[COURSE_STORE] Development query warning:', err.message);
      }
    }

    // 4. In-memory curated fallback strictly for development and test environments
    const roadmapRes = await CareerRoadmapsStore.getRoadmapByRoleSlug(normalizedSlug);
    if (!roadmapRes || !roadmapRes.roadmap) {
      return {
        role: roleSummary,
        roadmap: null,
        courses: [],
        total_courses: 0,
        message: 'No published roadmap available for this role.'
      };
    }

    const fallbackRoadmap = roadmapRes.roadmap;
    const itemMap = new Map<string, any>();
    for (const item of fallbackRoadmap.items) {
      itemMap.set(item.id, item);
    }
    const itemIds = new Set(fallbackRoadmap.items.map(i => i.id));

    // Only include published courses belonging to this roadmap's items
    const relevantCourses = fallbackCourses
      .filter(c => itemIds.has(c.roadmap_item_id) && c.status === 'published')
      .sort((a, b) => a.display_order - b.display_order || a.title.localeCompare(b.title));

    const coursesWithSkill: CareerCourseWithSkill[] = relevantCourses.map(course => {
      const skill = itemMap.get(course.roadmap_item_id);
      return {
        ...course,
        skill: {
          id: skill ? skill.id : course.roadmap_item_id,
          skill_name: skill ? skill.skill_name : 'Unknown Skill',
          stage: skill ? skill.stage : 'foundation',
          display_order: skill ? skill.display_order : 0
        }
      };
    });

    return {
      role: roleSummary,
      roadmap: {
        id: fallbackRoadmap.id,
        title: fallbackRoadmap.title,
        version: fallbackRoadmap.version,
        version_label: fallbackRoadmap.version_label,
        status: fallbackRoadmap.status
      },
      courses: coursesWithSkill,
      total_courses: coursesWithSkill.length
    };
  }

  /**
   * Retrieve published course recommendations for a specific roadmap item ID.
   */
  public static async getCoursesByItemId(itemId: string): Promise<CareerCourseRecommendation[]> {
    if (!itemId) return [];

    if (isProduction()) {
      const supabase = getAdminClient();
      if (!supabase) {
        console.error('[COURSE_STORE] Supabase client unavailable in production');
        throw new Error('DATABASE_ERROR');
      }

      const { data, error } = await supabase
        .from('career_course_recommendations')
        .select('*')
        .eq('roadmap_item_id', itemId)
        .eq('status', 'published')
        .order('display_order', { ascending: true });

      if (error) {
        console.error('[COURSE_STORE] Production database error fetching item courses:', error);
        throw new Error('DATABASE_ERROR');
      }

      return (data || []) as CareerCourseRecommendation[];
    }

    // Dev/test attempt DB then fallback
    try {
      const supabase = getAdminClient();
      if (supabase) {
        const { data, error } = await supabase
          .from('career_course_recommendations')
          .select('*')
          .eq('roadmap_item_id', itemId)
          .eq('status', 'published')
          .order('display_order', { ascending: true });

        if (!error && data) {
          return data as CareerCourseRecommendation[];
        }
      }
    } catch {
      // ignore in dev/test
    }

    return fallbackCourses
      .filter(c => c.roadmap_item_id === itemId && c.status === 'published')
      .sort((a, b) => a.display_order - b.display_order || a.title.localeCompare(b.title));
  }
}
