import { authFetch } from '../../lib/authFetch.js';

export type SkillsGapType =
  | 'TECHNICAL_SKILL'
  | 'DOMAIN_KNOWLEDGE'
  | 'EXPERIENCE_DURATION'
  | 'EDUCATION'
  | 'CERTIFICATION'
  | 'PRACTICAL_EXPERIENCE'
  | 'PROFESSIONAL_ACTION'
  | 'SOFT_SKILL'
  | 'STRUCTURAL';

export interface SupportedStrengthItem {
  id: string;
  criterion: string;
  category: string;
  gap_type: SkillsGapType;
  development_guidance_category?: string;
  development_action_type?: string;
  gap_type_label: string;
  candidate_evidence: string;
  candidate_source?: string;
  reason: string;
}

export interface PartiallyEvidencedItem {
  id: string;
  criterion: string;
  category: string;
  gap_type: SkillsGapType;
  development_guidance_category?: string;
  development_action_type?: string;
  gap_type_label: string;
  existing_evidence?: string;
  candidate_source?: string;
  explanation: string;
  documentation_step: string;
  development_step: string;
}

export interface NotFoundGapItem {
  id: string;
  criterion: string;
  category: string;
  gap_type: SkillsGapType;
  development_guidance_category?: string;
  development_action_type?: string;
  gap_type_label: string;
  explanation: string;
  documentation_step: string;
  development_step: string;
}

export interface ExcludedItem {
  id: string;
  criterion: string;
  category: string;
  reason: string;
}

export interface SkillsGapSummary {
  total_criteria: number;
  evaluable_criteria_count: number;
  supported_strengths_count: number;
  partially_evidenced_count: number;
  not_found_count: number;
  excluded_count: number;
  coverage_percentage: number;
}

export interface SkillsGapAnalysisResult {
  analysis_version?: string;
  job_id: string;
  job_title: string;
  company_name: string;
  parse_id?: string;
  candidate_parse_id: string;
  alignment_id: string;
  alignment_ruleset?: string;
  ruleset_version: string;
  supported_count?: number;
  partial_count?: number;
  not_evidenced_count?: number;
  not_applicable_count?: number;
  generated_at: string;
  summary: SkillsGapSummary;
  supported_strengths: SupportedStrengthItem[];
  partially_evidenced: PartiallyEvidencedItem[];
  not_found_gaps: NotFoundGapItem[];
  excluded: ExcludedItem[];
}

export interface SkillsGapError {
  error: string;
  message: string;
}

export const skillsGapService = {
  /**
   * Retrieves the skills gap analysis for a published job.
   * Throws if alignment is required or other validation error occurs.
   */
  async getSkillsGap(jobId: string): Promise<SkillsGapAnalysisResult> {
    const res = await authFetch(`/api/candidate/jobs/${jobId}/skills-gap`);
    const data = await res.json();

    if (!res.ok) {
      const err: any = new Error(data.message || 'Failed to fetch skills gap analysis');
      err.code = data.error;
      err.response = data;
      throw err;
    }

    return data as SkillsGapAnalysisResult;
  }
};
