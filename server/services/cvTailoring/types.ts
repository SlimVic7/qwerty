/**
 * QWERTY Stage 5.2 — Evidence-Safe CV Tailoring Assistant
 * Types & Domain Interfaces
 */

export const CURRENT_TAILORING_ENGINE_VERSION = 'cv-tailoring-v1.2';

export type TailoringSessionStatus = 
  | 'pending'
  | 'preparing_evidence'
  | 'generating'
  | 'completed'
  | 'failed';

export type TailoringDraftStatus =
  | 'draft'
  | 'reviewing'
  | 'finalized';

export type SuggestionStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'blocked';

export type EvidenceSourceType =
  | 'summary'
  | 'headline'
  | 'experience'
  | 'skills'
  | 'certifications'
  | 'education'
  | 'projects';

export interface CandidateEvidenceCard {
  evidence_id: string; // e.g. "sum-0", "exp-0-resp-1", "skill-2", "cert-0"
  source_type: EvidenceSourceType;
  source_path: string; // e.g. "professional.summary", "experience[0].responsibilities[1]"
  text: string;
  employer?: string;
  job_title?: string;
  dates?: {
    start_date?: string;
    end_date?: string;
    is_current?: boolean;
    graduation_year?: string | number;
  };
  metadata?: Record<string, any>;
}

export interface TailoringSuggestion {
  suggestion_id: string;
  section: 'summary' | 'skills' | 'experience' | 'education' | 'certifications';
  target_item_id?: string; // e.g. "exp-0", "skill-list"
  original_text: string;
  suggested_text: string;
  original_suggested_text?: string; // Preserves initial generated text before candidate manual edit
  generated_suggested_text?: string; // Canonical field preserving initial generated text
  candidate_edited_text?: string; // Explicit manual text entered by candidate
  source_refs: string[]; // references evidence_id from CandidateEvidenceCard
  reason: string;
  status: SuggestionStatus;
  validation_status: 'valid' | 'blocked';
  validation_issues?: string[];
  candidate_edited?: boolean;
  user_note?: string;
}

export interface UnaddressedJobCriterion {
  id: string;
  criterion_id?: string;
  type?: string;
  criterion: string;
  source_text?: string;
  category: 'required' | 'preferred' | 'experience' | 'general' | string;
  reason: string; // "Not found in your approved profile"
  guidance: string; // "Update your QWERTY profile first if you have evidence for this."
}

export interface TailoringPlan {
  target_job_title: string;
  target_company: string;
  priority_strengths: string[];
  reorder_priorities: string[];
  concision_targets: string[];
  unaddressed_criteria: UnaddressedJobCriterion[];
  unaddressed_count?: number;
}

export interface TailoredCvDraft {
  personal: {
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
    location?: string | null;
    links?: string[] | null;
  };
  professional: {
    headline?: string | null;
    summary?: string | null;
    years_experience?: number | null;
  };
  skills: Array<{
    name: string;
    category?: string;
    relevance_order?: number;
    is_supported: boolean;
  }>;
  experience: Array<{
    id: string;
    job_title: string;
    employer: string;
    start_date?: string | null;
    end_date?: string | null;
    is_current?: boolean;
    responsibilities: string[];
    achievements?: string[];
  }>;
  education: Array<{
    degree: string;
    institution: string;
    graduation_year?: string | number | null;
  }>;
  certifications: Array<{
    name: string;
    issuer?: string;
    issue_date?: string | null;
  }>;
}

export interface CandidateCvTailoringSession {
  id: string;
  user_id: string;
  job_id: string;
  cv_version_id: string;
  parse_id: string;
  alignment_id: string;
  status: TailoringSessionStatus;
  tailoring_status: TailoringDraftStatus;
  tailoring_engine_version: string;
  source_alignment_ruleset: string;
  job_updated_at: string;
  candidate_applied_at: string;
  job_title: string;
  company_name: string;
  evidence_manifest: CandidateEvidenceCard[];
  tailoring_plan?: TailoringPlan;
  suggestions: TailoringSuggestion[];
  draft_data?: TailoredCvDraft;
  validation_results?: Record<string, any>;
  generation_provider?: string;
  generation_model?: string;
  error_code?: string;
  created_at: string;
  completed_at?: string;
  finalized_at?: string;
  updated_at: string;
  is_stale?: boolean;
  stale_reason?: string;
}
