import { authFetch } from '../../lib/authFetch.js';

export interface AlignmentCriterion {
  id: string;
  criterion: string;
  category: 'required' | 'preferred' | 'experience' | 'responsibility' | 'education';
  status: 'matched' | 'partially_supported' | 'not_found' | 'not_applicable';
  candidate_evidence?: string;
  candidate_source?: string;
  explanation: string;
}

export interface AlignmentComponent {
  id: string;
  label: string;
  score: number;
  max_score: number;
  applicable: boolean;
  status: 'pass' | 'partial' | 'gap' | 'not_applicable';
  matched_count: number;
  total_count: number;
  summary: string;
}

export interface JobAlignmentExplanation {
  summary: string;
  strengths: string[];
  gaps: string[];
  recommendations: string[];
  suggested_interview_prep: string[];
}

export interface CandidateJobAlignment {
  id: string;
  user_id: string;
  cv_version_id: string;
  parse_id: string;
  job_id: string;
  job_updated_at: string;
  job_title: string;
  company_name: string;
  status: 'pending' | 'processing_rules' | 'completed' | 'failed';
  explanation_status: 'not_started' | 'processing' | 'completed' | 'failed';
  ruleset_version?: string;
  score?: number;
  max_score?: number;
  raw_score?: number;
  raw_max_score?: number;
  component_results?: AlignmentComponent[];
  criteria_breakdown?: AlignmentCriterion[];
  explanation?: JobAlignmentExplanation;
  ai_provider?: string;
  ai_model?: string;
  error_code?: string;
  explanation_error_code?: string;
  created_at: string;
  completed_at?: string;
  is_stale?: boolean;
  stale_reason?: string;
}

export const jobAlignmentService = {
  getJobAlignment: async (jobId: string): Promise<CandidateJobAlignment | null> => {
    try {
      return (await authFetch(`/api/candidate/jobs/${jobId}/alignment`)) as CandidateJobAlignment;
    } catch (err: any) {
      if (err?.status === 404) {
        return null;
      }
      throw err;
    }
  },

  createJobAlignment: async (jobId: string): Promise<CandidateJobAlignment> => {
    return (await authFetch(`/api/candidate/jobs/${jobId}/alignment`, {
      method: 'POST'
    })) as CandidateJobAlignment;
  },

  listCandidateAlignments: async (): Promise<CandidateJobAlignment[]> => {
    return (await authFetch('/api/candidate/alignments')) as CandidateJobAlignment[];
  }
};
