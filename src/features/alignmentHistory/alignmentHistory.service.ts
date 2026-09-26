/**
 * Job Alignment History & Comparison (QWERTY Stage 5.4)
 * Client-Side API Service
 */

import { authFetch } from '../../lib/authFetch.js';

export interface AlignmentHistoryItem {
  alignment_id: string;
  created_at: string;
  completed_at?: string;
  status: string;
  score: number;
  max_score: number;
  ruleset_version: string;
  parse_id: string;
  cv_version_id?: string;
  candidate_applied_at: string;
  job_id: string;
  job_updated_at: string;
  job_title: string;
  company_name: string;
  matched_count: number;
  partially_supported_count: number;
  not_found_count: number;
  not_applicable_count: number;
  total_criteria_count: number;
  is_current: boolean;
  is_stale: boolean;
  stale_reasons: string[];
  stale_labels: string[];
}

export interface AlignmentHistoryResponse {
  analysis_version: string;
  job_id: string;
  job_title: string;
  company_name: string;
  current_job_updated_at: string;
  current_alignment_id: string | null;
  current_parse_id: string | null;
  current_applied_at: string | null;
  history: AlignmentHistoryItem[];
  total_count: number;
  has_current_alignment: boolean;
  interpretation_notice: string;
}

export interface CriterionComparisonResult {
  criterion_id: string;
  criterion_text: string;
  from_status?: 'matched' | 'partially_supported' | 'not_found' | 'not_applicable';
  to_status?: 'matched' | 'partially_supported' | 'not_found' | 'not_applicable';
  transition: string;
  transition_label: string;
  explanation: string;
  from_evidence?: string;
  to_evidence?: string;
}

export interface AlignmentComparisonResponse {
  analysis_version: string;
  job_id: string;
  from_alignment_id: string;
  to_alignment_id: string;
  comparison_type: string;
  directly_comparable: boolean;
  result_variance_detected: boolean;
  comparison_headline: string;
  comparison_explanation: string;
  changes: {
    candidate_source_changed: boolean;
    job_source_changed: boolean;
    ruleset_changed: boolean;
  };
  from_snapshot: {
    alignment_id: string;
    created_at: string;
    score: number;
    max_score: number;
    ruleset_version: string;
    parse_id: string;
    candidate_applied_at: string;
    job_updated_at: string;
    job_title: string;
    company_name: string;
    is_current: boolean;
  };
  to_snapshot: {
    alignment_id: string;
    created_at: string;
    score: number;
    max_score: number;
    ruleset_version: string;
    parse_id: string;
    candidate_applied_at: string;
    job_updated_at: string;
    job_title: string;
    company_name: string;
    is_current: boolean;
  };
  score_comparison: {
    from_score: number;
    to_score: number;
    score_delta: number;
    delta_label: string;
    display_type: 'PROGRESS_DELTA' | 'SIDE_BY_SIDE';
    message: string;
  };
  criteria_comparisons: CriterionComparisonResult[];
  summary_counts: {
    newly_supported: number;
    strengthened: number;
    unchanged_supported: number;
    unchanged_partial: number;
    unchanged_not_found: number;
    weakened: number;
    no_longer_evidenced: number;
    added_requirement: number;
    removed_requirement: number;
    methodology_changed: number;
    other_changes: number;
  };
  interpretation_notice: string;
}

/**
 * Fetches alignment history for a job.
 */
export async function getAlignmentHistory(jobId: string, limit: number = 20): Promise<AlignmentHistoryResponse> {
  const res = await authFetch(`/api/candidate/jobs/${jobId}/alignment-history?limit=${limit}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || 'Failed to fetch alignment history');
  }
  return res.json();
}

/**
 * Compares two historical alignment records.
 */
export async function compareAlignments(
  jobId: string,
  fromId: string,
  toId: string
): Promise<AlignmentComparisonResponse> {
  const res = await authFetch(`/api/candidate/jobs/${jobId}/alignment-history/compare?from=${encodeURIComponent(fromId)}&to=${encodeURIComponent(toId)}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || 'Failed to compare alignment records');
  }
  return res.json();
}
