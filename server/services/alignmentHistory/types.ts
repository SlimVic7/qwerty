/**
 * Job Alignment History & Comparison (QWERTY Stage 5.4)
 * Type Definitions & Centralized Versioning
 */

export const CURRENT_ALIGNMENT_HISTORY_VERSION = 'alignment-history-v1';
export const ALIGNMENT_HISTORY_VERSION = CURRENT_ALIGNMENT_HISTORY_VERSION;

export const ALIGNMENT_INTERPRETATION_NOTICE =
  "QWERTY alignment scores measure how clearly your approved profile evidences the requirements of a specific job. They are not hiring probabilities. Score changes may also result from changes to your profile, the job description, or QWERTY's matching rules.";

export type ComparisonClassification =
  | 'DIRECTLY_COMPARABLE'
  | 'CANDIDATE_EVIDENCE_CHANGED'
  | 'JOB_CHANGED'
  | 'RULESET_CHANGED'
  | 'MIXED_SOURCE_CHANGES'
  | 'SAME_SNAPSHOT'
  | 'INCOMPATIBLE';

export type CriterionTransitionCategory =
  | 'NEWLY_SUPPORTED'
  | 'STRENGTHENED'
  | 'UNCHANGED_SUPPORTED'
  | 'UNCHANGED_PARTIAL'
  | 'UNCHANGED_NOT_FOUND'
  | 'WEAKENED'
  | 'NO_LONGER_EVIDENCED'
  | 'ADDED_REQUIREMENT'
  | 'REMOVED_REQUIREMENT'
  | 'STATUS_CHANGED'
  | 'NOT_COMPARABLE'
  | 'METHODOLOGY_CHANGED';

export type StaleReasonCode =
  | 'CANDIDATE_PROFILE_CHANGED'
  | 'JOB_CHANGED'
  | 'RULESET_CHANGED'
  | 'MULTIPLE_SOURCE_CHANGES';

export type NormalizedCriterionStatus =
  | 'matched'
  | 'partially_supported'
  | 'not_found'
  | 'not_applicable';

export interface NormalizedCriterion {
  id: string;
  criterion: string;
  category: string;
  status: NormalizedCriterionStatus;
  candidate_evidence?: string;
  candidate_source?: string;
  explanation?: string;
}

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
  stale_reasons: StaleReasonCode[];
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
  from_status?: NormalizedCriterionStatus;
  to_status?: NormalizedCriterionStatus;
  transition: CriterionTransitionCategory;
  transition_label: string;
  explanation: string;
  from_evidence?: string;
  to_evidence?: string;
}

export interface AlignmentSnapshotSummary {
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
}

export interface AlignmentComparisonResponse {
  analysis_version: string;
  job_id: string;
  from_alignment_id: string;
  to_alignment_id: string;
  comparison_type: ComparisonClassification;
  directly_comparable: boolean;
  result_variance_detected: boolean;
  comparison_headline: string;
  comparison_explanation: string;
  changes: {
    candidate_source_changed: boolean;
    job_source_changed: boolean;
    ruleset_changed: boolean;
  };
  from_snapshot: AlignmentSnapshotSummary;
  to_snapshot: AlignmentSnapshotSummary;
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
