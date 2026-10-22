/**
 * QWERTY Stage 7.5 — Candidate Personalized Development Plan Store
 * Manages persistence, transaction-safe generation/regeneration, and retrieval
 * of candidate-private development plans.
 *
 * STRICT GOVERNANCE:
 * - 0 Gemini calls, 0 LLM calls, 0 embeddings
 * - Deterministic matching via personalized-development-roadmap-v1
 * - Preserves historical plans on regeneration
 * - At most one active plan per candidate and career role
 * - References exact roadmap_id at generation time (version immutable)
 */

import { getAdminClient } from '../../db/supabase.js';
import {
  CandidateDevelopmentPlan,
  CandidateDevelopmentPlanItem,
  CandidateDevelopmentPlanResponse,
  CandidatePlanSummaryCounts
} from './types.js';
import { CareerRolesStore } from './careerRolesStore.js';
import { CareerRoadmapsStore } from './careerRoadmapsStore.js';
import { CareerLearningResourcesStore } from './careerLearningResourcesStore.js';
import { CareerCourseRecommendationsStore } from './careerCourseRecommendationsStore.js';
import {
  generatePersonalizedDevelopmentPlan,
  PERSONALIZED_ROADMAP_RULESET_VERSION,
  CandidateEvidenceSources
} from './personalizedRoadmapEngine.js';
import { isPersonalizedDevelopmentRoadmapPublicEnabled } from '../../config/featureFlags.js';

// In-memory fallback for test/dev environments prior to migration 00021 deployment
const fallbackActivePlans = new Map<string, CandidateDevelopmentPlan>();
const fallbackHistoricalPlans: CandidateDevelopmentPlan[] = [];

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
    msg.includes('candidate_development_plans') ||
    msg.includes('candidate_development_plan_items') ||
    hint.includes('perhaps you meant')
  );
}

export class CandidateDevelopmentPlanStore {
  /**
   * Reset fallback store (used in test suites)
   */
  public static resetFallbackPlans(): void {
    fallbackActivePlans.clear();
    fallbackHistoricalPlans.length = 0;
  }

  /**
   * Helper to compute summary counts from items
   */
  public static computeSummaryCounts(items: CandidateDevelopmentPlanItem[]): CandidatePlanSummaryCounts {
    const counts: CandidatePlanSummaryCounts = {
      total_skills: items.length,
      evidence_found: 0,
      development_focus: 0,
      review_needed: 0,
      priority_now: 0,
      priority_next: 0,
      priority_later: 0,
      priority_maintain: 0,
    };

    for (const item of items) {
      if (item.classification === 'evidence_found') counts.evidence_found++;
      else if (item.classification === 'development_focus') counts.development_focus++;
      else if (item.classification === 'review_needed') counts.review_needed++;

      if (item.priority === 'now') counts.priority_now++;
      else if (item.priority === 'next') counts.priority_next++;
      else if (item.priority === 'later') counts.priority_later++;
      else if (item.priority === 'maintain') counts.priority_maintain++;
    }

    return counts;
  }

  /**
   * Load candidate evidence strictly from candidate-owned tables
   */
  public static async loadCandidateEvidence(candidateId: string): Promise<CandidateEvidenceSources> {
    const supabase = getAdminClient();
    const evidence: CandidateEvidenceSources = {
      profile: null,
      cvVersion: null,
      cvParsedData: null,
    };

    if (!supabase) {
      return evidence;
    }

    try {
      // 1. Candidate Profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('professional_headline, professional_summary, years_experience')
        .eq('id', candidateId)
        .maybeSingle();

      if (profile) {
        evidence.profile = profile;
      }

      // 2. Current active CV
      const { data: cv } = await supabase
        .from('candidate_cv_versions')
        .select('id, original_filename, uploaded_at')
        .eq('user_id', candidateId)
        .eq('is_current', true)
        .is('deleted_at', null)
        .maybeSingle();

      if (cv) {
        evidence.cvVersion = cv;
      }

      // 3. Latest applied or completed CV parse
      const { data: parses } = await supabase
        .from('candidate_cv_parses')
        .select('reviewed_data, extracted_data, status')
        .eq('user_id', candidateId)
        .in('status', ['completed', 'needs_review'])
        .order('applied_at', { ascending: false, nullsFirst: false })
        .order('updated_at', { ascending: false })
        .limit(1);

      if (parses && parses.length > 0) {
        const p = parses[0];
        const ext = p.extracted_data || {};
        const rev = p.reviewed_data || {};
        evidence.cvParsedData = {
          ...ext,
          ...rev,
          skills: (Array.isArray(rev.skills) && rev.skills.length > 0) ? rev.skills : ext.skills,
          experience: (Array.isArray(rev.experience) && rev.experience.length > 0) ? rev.experience : ext.experience,
          education: (Array.isArray(rev.education) && rev.education.length > 0) ? rev.education : ext.education,
          certifications: (Array.isArray(rev.certifications) && rev.certifications.length > 0) ? rev.certifications : ext.certifications,
        };
      }
    } catch (err) {
      console.warn('[PLAN_STORE] Note loading candidate evidence:', err);
    }

    return evidence;
  }

  /**
   * Retrieve active personalized development plan for candidate and role slug.
   */
  public static async getPlanByRoleSlug(
    candidateId: string,
    roleSlug: string
  ): Promise<CandidateDevelopmentPlanResponse | null> {
    const role = await CareerRolesStore.getRoleBySlug(roleSlug);
    if (!role) {
      return null;
    }

    const roadmapRes = await CareerRoadmapsStore.getRoadmapByRoleSlug(roleSlug);
    const roadmap = roadmapRes?.roadmap || null;

    if (!roadmap) {
      return {
        role: {
          id: role.id,
          slug: role.slug,
          title: role.title,
          career_area: role.career_area,
        },
        roadmap: null,
        plan: null,
        feature_enabled: isPersonalizedDevelopmentRoadmapPublicEnabled(),
        message: 'No published roadmap exists for this role.',
      };
    }

    const supabase = getAdminClient();
    if (!supabase && isProduction()) {
      throw new Error('Supabase admin client unavailable in production.');
    }

    if (supabase) {
      try {
        const { data: planRecord, error: planError } = await supabase
          .from('candidate_development_plans')
          .select('*')
          .eq('user_id', candidateId)
          .eq('career_role_id', role.id)
          .eq('status', 'active')
          .maybeSingle();

        if (planError) {
          if (isTableMissingError(planError)) {
            if (isProduction()) throw planError;
            // Fall through to fallback store in non-prod
          } else {
            throw planError;
          }
        } else if (planRecord) {
          // Fetch plan items
          const { data: itemRecords, error: itemsError } = await supabase
            .from('candidate_development_plan_items')
            .select('*')
            .eq('plan_id', planRecord.id)
            .order('display_order', { ascending: true });

          if (itemsError) throw itemsError;

          // Fetch resources and courses for enrichment
          const resources = await CareerLearningResourcesStore.getResourcesByRoleSlug(roleSlug);
          const courses = await CareerCourseRecommendationsStore.getCoursesByRoleSlug(roleSlug);

          const resourcesByItem = new Map<string, any[]>();
          const coursesByItem = new Map<string, any[]>();

          if (resources?.roadmap?.items) {
            for (const item of resources.roadmap.items) {
              if (item.resources) resourcesByItem.set(item.id, item.resources);
            }
          }

          if (courses?.courses) {
            for (const c of courses.courses) {
              const list = coursesByItem.get(c.roadmap_item_id) || [];
              list.push(c);
              coursesByItem.set(c.roadmap_item_id, list);
            }
          }

          const roadmapItemMap = new Map(roadmap.items.map(i => [i.id, i]));

          const enrichedItems: CandidateDevelopmentPlanItem[] = (itemRecords || []).map(item => {
            const rItem = roadmapItemMap.get(item.roadmap_item_id);
            return {
              id: item.id,
              plan_id: item.plan_id,
              roadmap_item_id: item.roadmap_item_id,
              classification: item.classification,
              priority: item.priority,
              evidence_refs: item.evidence_refs || [],
              candidate_notes: item.candidate_notes,
              display_order: item.display_order,
              created_at: item.created_at,
              updated_at: item.updated_at,
              skill_name: rItem?.skill_name || 'Unknown Skill',
              stage: rItem?.stage || 'foundation',
              skill_category: rItem?.skill_category || '',
              description: rItem?.description || '',
              why_it_matters: rItem?.why_it_matters || '',
              competency_outcome: rItem?.competency_outcome || '',
              evidence_examples: rItem?.evidence_examples || [],
              resources: resourcesByItem.get(item.roadmap_item_id) || [],
              courses: coursesByItem.get(item.roadmap_item_id) || [],
            };
          });

          const fullPlan: CandidateDevelopmentPlan = {
            id: planRecord.id,
            user_id: planRecord.user_id,
            career_role_id: planRecord.career_role_id,
            roadmap_id: planRecord.roadmap_id,
            status: planRecord.status,
            ruleset_version: planRecord.ruleset_version,
            summary: planRecord.summary,
            created_at: planRecord.created_at,
            updated_at: planRecord.updated_at,
            archived_at: planRecord.archived_at,
            items: enrichedItems,
          };

          let isStale = false;
          try {
            const planCreatedAt = new Date(planRecord.created_at).getTime();
            const [profRes, cvRes, parseRes] = await Promise.all([
              supabase.from('profiles').select('updated_at').eq('id', candidateId).maybeSingle(),
              supabase.from('candidate_cv_versions').select('uploaded_at').eq('user_id', candidateId).eq('is_current', true).maybeSingle(),
              supabase.from('candidate_cv_parses').select('applied_at, updated_at').eq('user_id', candidateId).order('applied_at', { ascending: false }).limit(1).maybeSingle(),
            ]);

            const timestamps = [
              profRes?.data?.updated_at ? new Date(profRes.data.updated_at).getTime() : 0,
              cvRes?.data?.uploaded_at ? new Date(cvRes.data.uploaded_at).getTime() : 0,
              parseRes?.data?.applied_at ? new Date(parseRes.data.applied_at).getTime() : (parseRes?.data?.updated_at ? new Date(parseRes.data.updated_at).getTime() : 0),
            ];

            if (timestamps.some(ts => ts > planCreatedAt)) {
              isStale = true;
            }
          } catch {
            // Non-blocking
          }

          return {
            role: {
              id: role.id,
              slug: role.slug,
              title: role.title,
              career_area: role.career_area,
            },
            roadmap: {
              id: roadmap.id,
              title: roadmap.title,
              version: roadmap.version,
              version_label: roadmap.version_label,
              status: roadmap.status,
            },
            plan: fullPlan,
            summary_counts: this.computeSummaryCounts(enrichedItems),
            is_stale: isStale,
            feature_enabled: isPersonalizedDevelopmentRoadmapPublicEnabled(),
          };
        }
      } catch (err) {
        if (isProduction()) throw err;
        console.warn('[PLAN_STORE] DB error in getPlanByRoleSlug, checking fallback store:', err);
      }
    }

    // Fallback store in test/dev
    const fallbackKey = `${candidateId}:${role.id}`;
    const fallbackPlan = fallbackActivePlans.get(fallbackKey);

    return {
      role: {
        id: role.id,
        slug: role.slug,
        title: role.title,
        career_area: role.career_area,
      },
      roadmap: {
        id: roadmap.id,
        title: roadmap.title,
        version: roadmap.version,
        version_label: roadmap.version_label,
        status: roadmap.status,
      },
      plan: fallbackPlan || null,
      summary_counts: fallbackPlan?.items ? this.computeSummaryCounts(fallbackPlan.items) : undefined,
      feature_enabled: isPersonalizedDevelopmentRoadmapPublicEnabled(),
    };
  }

  /**
   * Deterministically generate or regenerate development plan.
   * Archives existing active plan for candidate and role, preserving history.
   */
  public static async generatePlanForRole(
    candidateId: string,
    roleSlug: string,
    mockEvidence?: CandidateEvidenceSources
  ): Promise<CandidateDevelopmentPlanResponse | null> {
    const role = await CareerRolesStore.getRoleBySlug(roleSlug);
    if (!role) {
      return null;
    }

    const roadmapRes = await CareerRoadmapsStore.getRoadmapByRoleSlug(roleSlug);
    const roadmap = roadmapRes?.roadmap || null;

    if (!roadmap) {
      return {
        role: {
          id: role.id,
          slug: role.slug,
          title: role.title,
          career_area: role.career_area,
        },
        roadmap: null,
        plan: null,
        feature_enabled: isPersonalizedDevelopmentRoadmapPublicEnabled(),
        message: 'Cannot generate a development plan: no published roadmap exists for this role.',
      };
    }

    // Load candidate evidence
    const candidateEvidence = mockEvidence || (await this.loadCandidateEvidence(candidateId));

    // Execute deterministic ruleset
    const classifiedItems = generatePersonalizedDevelopmentPlan(roadmap.items, candidateEvidence);

    // Fetch resources and courses for enrichment
    const resources = await CareerLearningResourcesStore.getResourcesByRoleSlug(roleSlug);
    const courses = await CareerCourseRecommendationsStore.getCoursesByRoleSlug(roleSlug);

    const resourcesByItem = new Map<string, any[]>();
    const coursesByItem = new Map<string, any[]>();

    if (resources?.roadmap?.items) {
      for (const item of resources.roadmap.items) {
        if (item.resources) resourcesByItem.set(item.id, item.resources);
      }
    }

    if (courses?.courses) {
      for (const c of courses.courses) {
        const list = coursesByItem.get(c.roadmap_item_id) || [];
        list.push(c);
        coursesByItem.set(c.roadmap_item_id, list);
      }
    }

    const supabase = getAdminClient();
    if (!supabase && isProduction()) {
      throw new Error('Supabase admin client unavailable in production.');
    }

    const nowIso = new Date().toISOString();
    const planId = `plan-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    if (supabase) {
      try {
        // 1. Archive any currently active plans for this candidate and career role
        const { error: archiveError } = await supabase
          .from('candidate_development_plans')
          .update({
            status: 'archived',
            archived_at: nowIso,
            updated_at: nowIso,
          })
          .eq('user_id', candidateId)
          .eq('career_role_id', role.id)
          .eq('status', 'active');

        if (archiveError && !isTableMissingError(archiveError)) {
          throw archiveError;
        }

        // 2. Insert new active plan
        const { data: newPlan, error: insertPlanError } = await supabase
          .from('candidate_development_plans')
          .insert({
            user_id: candidateId,
            career_role_id: role.id,
            roadmap_id: roadmap.id,
            status: 'active',
            ruleset_version: PERSONALIZED_ROADMAP_RULESET_VERSION,
            summary: `Personalized development plan for ${role.title}`,
          })
          .select()
          .single();

        if (insertPlanError) {
          if (isTableMissingError(insertPlanError)) {
            if (isProduction()) throw insertPlanError;
            // Fall through to fallback store in non-prod
          } else {
            throw insertPlanError;
          }
        } else if (newPlan) {
          // 3. Insert plan items
          const itemsToInsert = classifiedItems.map(item => ({
            plan_id: newPlan.id,
            roadmap_item_id: item.roadmap_item_id,
            classification: item.classification,
            priority: item.priority,
            evidence_refs: item.evidence_refs,
            display_order: item.display_order,
          }));

          const { data: insertedItems, error: insertItemsError } = await supabase
            .from('candidate_development_plan_items')
            .insert(itemsToInsert)
            .select();

          if (insertItemsError) throw insertItemsError;

          const enrichedPlanItems: CandidateDevelopmentPlanItem[] = (insertedItems || []).map(dbItem => {
            const originalClassified = classifiedItems.find(c => c.roadmap_item_id === dbItem.roadmap_item_id);
            return {
              id: dbItem.id,
              plan_id: dbItem.plan_id,
              roadmap_item_id: dbItem.roadmap_item_id,
              classification: dbItem.classification,
              priority: dbItem.priority,
              evidence_refs: dbItem.evidence_refs || [],
              candidate_notes: dbItem.candidate_notes,
              display_order: dbItem.display_order,
              created_at: dbItem.created_at,
              updated_at: dbItem.updated_at,
              skill_name: originalClassified?.skill_name,
              stage: originalClassified?.stage,
              skill_category: originalClassified?.skill_category,
              description: originalClassified?.description,
              why_it_matters: originalClassified?.why_it_matters,
              competency_outcome: originalClassified?.competency_outcome,
              evidence_examples: originalClassified?.evidence_examples,
              resources: resourcesByItem.get(dbItem.roadmap_item_id) || [],
              courses: coursesByItem.get(dbItem.roadmap_item_id) || [],
            };
          });

          const completedPlan: CandidateDevelopmentPlan = {
            id: newPlan.id,
            user_id: newPlan.user_id,
            career_role_id: newPlan.career_role_id,
            roadmap_id: newPlan.roadmap_id,
            status: newPlan.status,
            ruleset_version: newPlan.ruleset_version,
            summary: newPlan.summary,
            created_at: newPlan.created_at,
            updated_at: newPlan.updated_at,
            archived_at: newPlan.archived_at,
            items: enrichedPlanItems,
          };

          return {
            role: {
              id: role.id,
              slug: role.slug,
              title: role.title,
              career_area: role.career_area,
            },
            roadmap: {
              id: roadmap.id,
              title: roadmap.title,
              version: roadmap.version,
              version_label: roadmap.version_label,
              status: roadmap.status,
            },
            plan: completedPlan,
            summary_counts: this.computeSummaryCounts(enrichedPlanItems),
            feature_enabled: isPersonalizedDevelopmentRoadmapPublicEnabled(),
          };
        }
      } catch (err) {
        if (isProduction()) throw err;
        console.warn('[PLAN_STORE] DB error in generatePlanForRole, persisting in fallback store:', err);
      }
    }

    // In-memory fallback persistence (dev/test environments)
    const fallbackKey = `${candidateId}:${role.id}`;
    const previousPlan = fallbackActivePlans.get(fallbackKey);
    if (previousPlan) {
      previousPlan.status = 'archived';
      previousPlan.archived_at = nowIso;
      fallbackHistoricalPlans.push(previousPlan);
    }

    const fallbackItems: CandidateDevelopmentPlanItem[] = classifiedItems.map((item, idx) => ({
      id: `item-${planId}-${idx + 1}`,
      plan_id: planId,
      roadmap_item_id: item.roadmap_item_id,
      classification: item.classification,
      priority: item.priority,
      evidence_refs: item.evidence_refs,
      candidate_notes: null,
      display_order: item.display_order,
      created_at: nowIso,
      updated_at: nowIso,
      skill_name: item.skill_name,
      stage: item.stage,
      skill_category: item.skill_category,
      description: item.description,
      why_it_matters: item.why_it_matters,
      competency_outcome: item.competency_outcome,
      evidence_examples: item.evidence_examples,
      resources: resourcesByItem.get(item.roadmap_item_id) || [],
      courses: coursesByItem.get(item.roadmap_item_id) || [],
    }));

    const newFallbackPlan: CandidateDevelopmentPlan = {
      id: planId,
      user_id: candidateId,
      career_role_id: role.id,
      roadmap_id: roadmap.id,
      status: 'active',
      ruleset_version: PERSONALIZED_ROADMAP_RULESET_VERSION,
      summary: `Personalized development plan for ${role.title}`,
      created_at: nowIso,
      updated_at: nowIso,
      archived_at: null,
      items: fallbackItems,
    };

    fallbackActivePlans.set(fallbackKey, newFallbackPlan);

    return {
      role: {
        id: role.id,
        slug: role.slug,
        title: role.title,
        career_area: role.career_area,
      },
      roadmap: {
        id: roadmap.id,
        title: roadmap.title,
        version: roadmap.version,
        version_label: roadmap.version_label,
        status: roadmap.status,
      },
      plan: newFallbackPlan,
      summary_counts: this.computeSummaryCounts(fallbackItems),
      feature_enabled: isPersonalizedDevelopmentRoadmapPublicEnabled(),
    };
  }

  /**
   * Helper for tests to inspect historical archived plans
   */
  public static getHistoricalPlans(): CandidateDevelopmentPlan[] {
    return [...fallbackHistoricalPlans];
  }
}
