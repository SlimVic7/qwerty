/**
 * QWERTY Stage 7.1 — Career Role Library Types
 * Curated career-navigation models (Zero AI, Zero dynamic salary claims)
 */

export type CareerRoleStatus = 'draft' | 'published' | 'archived';

export interface CareerProgressionStage {
  stage: string;
  title: string;
  description: string;
}

export interface RelatedRoleRef {
  slug: string;
  title: string;
  career_area?: string;
}

export interface CareerRole {
  id: string;
  slug: string;
  title: string;
  short_summary: string;
  career_area: string;
  overview: string;
  responsibilities: string[];
  core_skills: string[];
  supporting_skills: string[];
  typical_background: string;
  career_progression: CareerProgressionStage[];
  related_roles: RelatedRoleRef[];
  status: CareerRoleStatus;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CareerAreaSummary {
  name: string;
  count: number;
}

export interface CareerRolesListResponse {
  roles: CareerRole[];
  total: number;
  areas: CareerAreaSummary[];
}

export interface CareerRoleFilters {
  area?: string;
  search?: string;
}

export type RoadmapStatus = 'draft' | 'published' | 'archived';
export type RoadmapStage = 'foundation' | 'core' | 'advanced';

export interface CareerRoleRoadmapItem {
  id: string;
  roadmap_id: string;
  stage: RoadmapStage;
  skill_name: string;
  skill_category: string;
  description: string;
  why_it_matters: string;
  competency_outcome: string;
  evidence_examples: string[];
  display_order: number;
  resources?: CareerLearningResource[];
  created_at: string;
  updated_at: string;
}

export interface CareerRoleRoadmap {
  id: string;
  career_role_id: string;
  version: number;
  version_label: string;
  title: string;
  summary: string;
  status: RoadmapStatus;
  items: CareerRoleRoadmapItem[];
  created_at: string;
  updated_at: string;
}

export interface RoleRoadmapResponse {
  role: {
    id: string;
    slug: string;
    title: string;
    career_area: string;
  };
  roadmap: CareerRoleRoadmap | null;
  message?: string;
}

// =========================================================================
// Stage 7.3 — Career Learning Resources Types
// =========================================================================

export type LearningResourceType =
  | 'documentation'
  | 'guide'
  | 'article'
  | 'video'
  | 'lab'
  | 'practice'
  | 'standard'
  | 'reference';

export type LearningResourceAccessType = 'free' | 'free_account_required';
export type LearningResourceStatus = 'draft' | 'published' | 'archived';
export type LearningResourceDifficulty = 'foundation' | 'core' | 'advanced';

export interface CareerLearningResource {
  id: string;
  roadmap_item_id: string;
  title: string;
  provider_name: string;
  resource_type: LearningResourceType;
  url: string;
  description: string;
  access_type: LearningResourceAccessType;
  difficulty: LearningResourceDifficulty | null;
  display_order: number;
  status: LearningResourceStatus;
  created_at: string;
  updated_at: string;
}

export interface RoadmapItemWithResources extends CareerRoleRoadmapItem {
  resources: CareerLearningResource[];
}

export interface CareerRoleRoadmapWithResources extends Omit<CareerRoleRoadmap, 'items'> {
  items: RoadmapItemWithResources[];
}

export interface RoleRoadmapResourcesResponse {
  role: {
    id: string;
    slug: string;
    title: string;
    career_area: string;
  };
  roadmap: CareerRoleRoadmapWithResources | null;
  total_resources: number;
  message?: string;
}

// =========================================================================
// Stage 7.4 — Career Course Recommendations Types
// =========================================================================

export type CareerCourseAccessType = 'free' | 'free_account_required';
export type CareerCourseStatus = 'draft' | 'published' | 'archived';
export type CareerCourseDifficulty = 'foundation' | 'core' | 'advanced';

export interface CareerCourseRecommendation {
  id: string;
  roadmap_item_id: string;
  title: string;
  provider_name: string;
  url: string;
  description: string;
  why_this_course: string;
  access_type: CareerCourseAccessType;
  difficulty: CareerCourseDifficulty | null;
  display_order: number;
  status: CareerCourseStatus;
  created_at: string;
  updated_at: string;
}

export interface CareerCourseWithSkill extends CareerCourseRecommendation {
  skill: {
    id: string;
    skill_name: string;
    stage: RoadmapStage;
    display_order: number;
  };
}

export interface RoleCourseRecommendationsResponse {
  role: {
    id: string;
    slug: string;
    title: string;
    career_area: string;
  };
  roadmap: {
    id: string;
    title: string;
    version: number;
    version_label: string;
    status: RoadmapStatus;
  } | null;
  courses: CareerCourseWithSkill[];
  total_courses: number;
  message?: string;
}

// =========================================================================
// Stage 7.5 — Personalized Development Roadmap Types
// =========================================================================

export type PlanClassification = 'evidence_found' | 'development_focus' | 'review_needed';
export type PlanPriority = 'now' | 'next' | 'later' | 'maintain';
export type PlanStatus = 'active' | 'archived';

export interface EvidenceReference {
  source: 'profile_headline' | 'profile_summary' | 'profile_experience' | 'cv_skills' | 'cv_experience' | 'cv_education' | 'cv_certification';
  snippet: string;
  matched_text?: string;
  confidence?: 'explicit' | 'partial';
}

export interface CandidateDevelopmentPlanItem {
  id: string;
  plan_id: string;
  roadmap_item_id: string;
  classification: PlanClassification;
  priority: PlanPriority;
  evidence_refs: EvidenceReference[];
  candidate_notes?: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;

  // Enriched roadmap skill fields
  skill_name?: string;
  stage?: RoadmapStage;
  skill_category?: string;
  description?: string;
  why_it_matters?: string;
  competency_outcome?: string;
  evidence_examples?: string[];
  resources?: CareerLearningResource[];
  courses?: CareerCourseRecommendation[];
}

export interface CandidateDevelopmentPlan {
  id: string;
  user_id: string;
  career_role_id: string;
  roadmap_id: string;
  status: PlanStatus;
  ruleset_version: string;
  summary: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  items?: CandidateDevelopmentPlanItem[];
}

export interface CandidatePlanSummaryCounts {
  total_skills: number;
  evidence_found: number;
  development_focus: number;
  review_needed: number;
  priority_now: number;
  priority_next: number;
  priority_later: number;
  priority_maintain: number;
}

export interface CandidateDevelopmentPlanResponse {
  role: {
    id: string;
    slug: string;
    title: string;
    career_area: string;
  };
  roadmap: {
    id: string;
    title: string;
    version: number;
    version_label: string;
    status: RoadmapStatus;
  } | null;
  plan: CandidateDevelopmentPlan | null;
  summary_counts?: CandidatePlanSummaryCounts;
  is_stale?: boolean;
  feature_enabled: boolean;
  message?: string;
}

