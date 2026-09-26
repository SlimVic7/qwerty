/**
 * Job Alignment History & Comparison (QWERTY Stage 5.4)
 * Deterministic History & Comparison Assembly Engine
 */

import {
  CURRENT_ALIGNMENT_HISTORY_VERSION,
  ALIGNMENT_INTERPRETATION_NOTICE,
  ComparisonClassification,
  StaleReasonCode,
  AlignmentHistoryItem,
  AlignmentHistoryResponse,
  AlignmentComparisonResponse
} from './types.js';
import { normalizeCriteriaBreakdown, compareCriteriaLists } from './criterionComparison.js';
import { CandidateJobAlignmentRecord } from '../matching/jobAlignmentStore.js';
import { CURRENT_JOB_ALIGNMENT_RULESET_VERSION } from '../matching/jobAlignment.js';

/**
 * Safely compares two timestamp strings via epoch milliseconds.
 */
export function areTimestampsEqual(ts1?: string | null, ts2?: string | null): boolean {
  if (!ts1 && !ts2) return true;
  if (!ts1 || !ts2) return false;
  return new Date(ts1).getTime() === new Date(ts2).getTime();
}

/**
 * Evaluates whether an alignment record matches current authoritative sources.
 */
export function isAlignmentCurrent(
  record: CandidateJobAlignmentRecord,
  currentJobUpdatedAt: string,
  latestParseId: string | null,
  latestParseAppliedAt: string | null
): boolean {
  if (!latestParseId || !latestParseAppliedAt) return false;
  if (record.status !== 'completed') return false;
  if (record.ruleset_version !== CURRENT_JOB_ALIGNMENT_RULESET_VERSION) return false;
  if (!areTimestampsEqual(record.job_updated_at, currentJobUpdatedAt)) return false;
  if (record.parse_id !== latestParseId) return false;
  if (!areTimestampsEqual(record.candidate_applied_at, latestParseAppliedAt)) return false;

  return true;
}

/**
 * Derives machine-readable stale reason codes and accessible human labels.
 */
export function computeStaleReasons(
  record: CandidateJobAlignmentRecord,
  currentJobUpdatedAt: string,
  latestParseId: string | null,
  latestParseAppliedAt: string | null
): { isCurrent: boolean; isStale: boolean; staleReasons: StaleReasonCode[]; staleLabels: string[] } {
  const isCurrent = isAlignmentCurrent(record, currentJobUpdatedAt, latestParseId, latestParseAppliedAt);
  if (isCurrent) {
    return {
      isCurrent: true,
      isStale: false,
      staleReasons: [],
      staleLabels: ['Current']
    };
  }

  const staleReasons: StaleReasonCode[] = [];
  const staleLabels: string[] = [];

  const candChanged = !latestParseId || record.parse_id !== latestParseId || !areTimestampsEqual(record.candidate_applied_at, latestParseAppliedAt);
  const jobChanged = !areTimestampsEqual(record.job_updated_at, currentJobUpdatedAt);
  const rulesetChanged = record.ruleset_version !== CURRENT_JOB_ALIGNMENT_RULESET_VERSION;

  if (candChanged) {
    staleReasons.push('CANDIDATE_PROFILE_CHANGED');
    staleLabels.push('Stale — Profile Changed');
  }

  if (jobChanged) {
    staleReasons.push('JOB_CHANGED');
    staleLabels.push('Stale — Job Changed');
  }

  if (rulesetChanged) {
    staleReasons.push('RULESET_CHANGED');
    staleLabels.push('Historical Methodology');
  }

  if (staleReasons.length > 1) {
    staleReasons.push('MULTIPLE_SOURCE_CHANGES');
    staleLabels.push('Mixed Changes');
  }

  return {
    isCurrent: false,
    isStale: true,
    staleReasons,
    staleLabels: Array.from(new Set(staleLabels))
  };
}

/**
 * Builds candidate-facing alignment history response from immutable persisted rows.
 */
export function buildAlignmentHistoryResponse(
  job: { id: string; title: string; company_name: string; updated_at?: string },
  latestParse: { id: string; applied_at: string } | null,
  records: CandidateJobAlignmentRecord[]
): AlignmentHistoryResponse {
  const currentJobUpdatedAt = job.updated_at || '';
  const currentParseId = latestParse?.id || null;
  const currentAppliedAt = latestParse?.applied_at || null;

  let currentAlignmentId: string | null = null;

  // First pass: identify current alignment ID if one satisfies all source criteria
  for (const record of records) {
    if (isAlignmentCurrent(record, currentJobUpdatedAt, currentParseId, currentAppliedAt)) {
      currentAlignmentId = record.id;
      break;
    }
  }

  const history: AlignmentHistoryItem[] = records.map(record => {
    const { isCurrent, isStale, staleReasons, staleLabels } = computeStaleReasons(
      record,
      currentJobUpdatedAt,
      currentParseId,
      currentAppliedAt
    );

    const normalizedCriteria = normalizeCriteriaBreakdown(record.criteria_breakdown);
    let matched_count = 0;
    let partially_supported_count = 0;
    let not_found_count = 0;
    let not_applicable_count = 0;

    for (const c of normalizedCriteria) {
      if (c.status === 'matched') matched_count++;
      else if (c.status === 'partially_supported') partially_supported_count++;
      else if (c.status === 'not_applicable') not_applicable_count++;
      else not_found_count++;
    }

    return {
      alignment_id: record.id,
      created_at: record.created_at,
      completed_at: record.completed_at,
      status: record.status,
      score: record.score ?? 0,
      max_score: record.max_score ?? 100,
      ruleset_version: record.ruleset_version,
      parse_id: record.parse_id,
      cv_version_id: record.cv_version_id,
      candidate_applied_at: record.candidate_applied_at,
      job_id: record.job_id,
      job_updated_at: record.job_updated_at,
      job_title: record.job_title || job.title,
      company_name: record.company_name || job.company_name,
      matched_count,
      partially_supported_count,
      not_found_count,
      not_applicable_count,
      total_criteria_count: normalizedCriteria.length,
      is_current: isCurrent,
      is_stale: isStale,
      stale_reasons: staleReasons,
      stale_labels: staleLabels
    };
  });

  return {
    analysis_version: CURRENT_ALIGNMENT_HISTORY_VERSION,
    job_id: job.id,
    job_title: job.title,
    company_name: job.company_name,
    current_job_updated_at: currentJobUpdatedAt,
    current_alignment_id: currentAlignmentId,
    current_parse_id: currentParseId,
    current_applied_at: currentAppliedAt,
    history,
    total_count: history.length,
    has_current_alignment: currentAlignmentId !== null,
    interpretation_notice: ALIGNMENT_INTERPRETATION_NOTICE
  };
}

/**
 * Assembles a deterministic alignment comparison between two historical records.
 */
export function buildAlignmentComparisonResponse(
  fromRecord: CandidateJobAlignmentRecord,
  toRecord: CandidateJobAlignmentRecord,
  canonicalJob: { id: string; title: string; company_name: string; updated_at?: string },
  latestParse: { id: string; applied_at: string } | null
): AlignmentComparisonResponse {
  const currentJobUpdatedAt = canonicalJob.updated_at || '';
  const currentParseId = latestParse?.id || null;
  const currentAppliedAt = latestParse?.applied_at || null;

  const candChanged =
    fromRecord.parse_id !== toRecord.parse_id ||
    !areTimestampsEqual(fromRecord.candidate_applied_at, toRecord.candidate_applied_at);

  const jobChanged = !areTimestampsEqual(fromRecord.job_updated_at, toRecord.job_updated_at);
  const rulesetChanged = fromRecord.ruleset_version !== toRecord.ruleset_version;

  let comparison_type: ComparisonClassification = 'INCOMPATIBLE';
  let directly_comparable = false;
  let result_variance_detected = false;
  let comparison_headline = '';
  let comparison_explanation = '';

  const changesCount = (candChanged ? 1 : 0) + (jobChanged ? 1 : 0) + (rulesetChanged ? 1 : 0);

  if (changesCount === 0) {
    comparison_type = 'SAME_SNAPSHOT';
    directly_comparable = false;
    if ((fromRecord.score ?? 0) !== (toRecord.score ?? 0)) {
      result_variance_detected = true;
      comparison_headline = 'Identical Source Snapshot (Result Variance Detected)';
      comparison_explanation =
        'These analyses evaluate the identical profile and job version under the same ruleset, but yield different results. This variance does not reflect candidate progress.';
    } else {
      comparison_headline = 'Identical Source Snapshot';
      comparison_explanation =
        'These analyses evaluate the identical approved profile and job version under the same matching ruleset.';
    }
  } else if (candChanged && !jobChanged && !rulesetChanged) {
    comparison_type = 'CANDIDATE_EVIDENCE_CHANGED';
    directly_comparable = true;
    comparison_headline = 'Direct Candidate Profile Comparison';
    comparison_explanation =
      'The job requirements and matching methodology remained unchanged while your approved profile evidence was updated. Score differences directly reflect changes in evidence alignment.';
  } else if (!candChanged && jobChanged && !rulesetChanged) {
    comparison_type = 'JOB_CHANGED';
    directly_comparable = false;
    comparison_headline = 'Job Requirements Changed';
    comparison_explanation =
      'The job requirements changed between these analyses, so the score difference is not a direct measure of candidate progress.';
  } else if (!candChanged && !jobChanged && rulesetChanged) {
    comparison_type = 'RULESET_CHANGED';
    directly_comparable = false;
    comparison_headline = 'Alignment Methodology Changed';
    comparison_explanation =
      "QWERTY's alignment methodology changed between these analyses. Scores from different ruleset versions are not directly comparable.";
  } else {
    comparison_type = 'MIXED_SOURCE_CHANGES';
    directly_comparable = false;
    comparison_headline = 'Multiple Source Changes';
    comparison_explanation =
      'Multiple factors changed between these analyses (including profile evidence, job requirements, or alignment methodology), so score differences cannot be attributed to a single cause.';
  }

  const fromScore = fromRecord.score ?? 0;
  const toScore = toRecord.score ?? 0;
  const scoreDelta = toScore - fromScore;

  let display_type: 'PROGRESS_DELTA' | 'SIDE_BY_SIDE' = 'SIDE_BY_SIDE';
  let delta_label = `${fromScore}% → ${toScore}%`;
  let message = `Previous: ${fromScore}% | Target: ${toScore}%. Side-by-side comparison only (not a direct measure of candidate progress).`;

  if (directly_comparable) {
    display_type = 'PROGRESS_DELTA';
    delta_label = scoreDelta > 0 ? `+${scoreDelta}%` : `${scoreDelta}%`;
    message =
      scoreDelta > 0
        ? 'Alignment score changed from ' + fromScore + '% to ' + toScore + '%, with stronger evidence substantiated in your newer profile.'
        : scoreDelta < 0
        ? 'Alignment score changed from ' + fromScore + '% to ' + toScore + '%, with reduced evidence substantiated in your newer profile.'
        : 'Alignment score remained unchanged at ' + toScore + '%.';
  }

  // Criteria comparison
  const fromCriteria = normalizeCriteriaBreakdown(fromRecord.criteria_breakdown);
  const toCriteria = normalizeCriteriaBreakdown(toRecord.criteria_breakdown);

  const { comparisons, summaryCounts } = compareCriteriaLists(fromCriteria, toCriteria, {
    jobChanged,
    rulesetChanged,
    fromRuleset: fromRecord.ruleset_version,
    toRuleset: toRecord.ruleset_version
  });

  return {
    analysis_version: CURRENT_ALIGNMENT_HISTORY_VERSION,
    job_id: canonicalJob.id,
    from_alignment_id: fromRecord.id,
    to_alignment_id: toRecord.id,
    comparison_type,
    directly_comparable,
    result_variance_detected,
    comparison_headline,
    comparison_explanation,
    changes: {
      candidate_source_changed: candChanged,
      job_source_changed: jobChanged,
      ruleset_changed: rulesetChanged
    },
    from_snapshot: {
      alignment_id: fromRecord.id,
      created_at: fromRecord.created_at,
      score: fromScore,
      max_score: fromRecord.max_score ?? 100,
      ruleset_version: fromRecord.ruleset_version,
      parse_id: fromRecord.parse_id,
      candidate_applied_at: fromRecord.candidate_applied_at,
      job_updated_at: fromRecord.job_updated_at,
      job_title: fromRecord.job_title || canonicalJob.title,
      company_name: fromRecord.company_name || canonicalJob.company_name,
      is_current: isAlignmentCurrent(fromRecord, currentJobUpdatedAt, currentParseId, currentAppliedAt)
    },
    to_snapshot: {
      alignment_id: toRecord.id,
      created_at: toRecord.created_at,
      score: toScore,
      max_score: toRecord.max_score ?? 100,
      ruleset_version: toRecord.ruleset_version,
      parse_id: toRecord.parse_id,
      candidate_applied_at: toRecord.candidate_applied_at,
      job_updated_at: toRecord.job_updated_at,
      job_title: toRecord.job_title || canonicalJob.title,
      company_name: toRecord.company_name || canonicalJob.company_name,
      is_current: isAlignmentCurrent(toRecord, currentJobUpdatedAt, currentParseId, currentAppliedAt)
    },
    score_comparison: {
      from_score: fromScore,
      to_score: toScore,
      score_delta: scoreDelta,
      delta_label,
      display_type,
      message
    },
    criteria_comparisons: comparisons,
    summary_counts: summaryCounts,
    interpretation_notice: ALIGNMENT_INTERPRETATION_NOTICE
  };
}
