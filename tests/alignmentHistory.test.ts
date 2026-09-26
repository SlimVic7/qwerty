import { describe, it, expect } from 'vitest';
import {
  buildAlignmentHistoryResponse,
  buildAlignmentComparisonResponse,
  isAlignmentCurrent,
  computeStaleReasons
} from '../server/services/alignmentHistory/alignmentHistoryEngine.js';
import {
  normalizeCriteriaBreakdown,
  compareCriteriaLists
} from '../server/services/alignmentHistory/criterionComparison.js';
import { CandidateJobAlignmentRecord } from '../server/services/matching/jobAlignmentStore.js';
import { CURRENT_ALIGNMENT_HISTORY_VERSION, ALIGNMENT_INTERPRETATION_NOTICE } from '../server/services/alignmentHistory/types.js';

describe('Job Alignment History & Comparison Engine (Stage 5.4)', () => {
  const canonicalJob = {
    id: 'job-auditor-101',
    title: 'Senior Internal Auditor',
    company_name: 'Apex Group',
    updated_at: '2026-09-20T10:00:00.000Z'
  };

  const latestParse = {
    id: 'parse-202',
    applied_at: '2026-09-21T12:00:00.000Z'
  };

  const baseAlignment: CandidateJobAlignmentRecord = {
    id: 'align-1',
    user_id: 'user-cand-1',
    cv_version_id: 'cv-v1',
    parse_id: latestParse.id,
    job_id: canonicalJob.id,
    job_updated_at: canonicalJob.updated_at,
    candidate_applied_at: latestParse.applied_at,
    job_title: canonicalJob.title,
    company_name: canonicalJob.company_name,
    status: 'completed',
    explanation_status: 'completed',
    ruleset_version: 'job-alignment-v1.3',
    score: 60,
    max_score: 100,
    created_at: '2026-09-21T12:30:00.000Z',
    completed_at: '2026-09-21T12:30:05.000Z',
    criteria_breakdown: [
      {
        id: 'crit-cisa',
        criterion: 'CISA certification required',
        category: 'required',
        status: 'matched',
        candidate_evidence: 'CISA certified 2022'
      },
      {
        id: 'crit-tenure',
        criterion: '5+ years audit experience',
        category: 'required',
        status: 'partially_supported',
        candidate_evidence: '3.5 years verified audit'
      },
      {
        id: 'crit-acl',
        criterion: 'Advanced Audit Command Language (ACL)',
        category: 'required',
        status: 'not_found'
      }
    ]
  };

  describe('Authoritative Current vs Stale Alignment Resolution', () => {
    it('identifies exact matching completed alignment as current', () => {
      const isCurr = isAlignmentCurrent(
        baseAlignment,
        canonicalJob.updated_at,
        latestParse.id,
        latestParse.applied_at
      );
      expect(isCurr).toBe(true);

      const staleMeta = computeStaleReasons(
        baseAlignment,
        canonicalJob.updated_at,
        latestParse.id,
        latestParse.applied_at
      );
      expect(staleMeta.isCurrent).toBe(true);
      expect(staleMeta.isStale).toBe(false);
      expect(staleMeta.staleReasons).toEqual([]);
      expect(staleMeta.staleLabels).toContain('Current');
    });

    it('flags alignment as stale when candidate profile was updated', () => {
      const staleCandidateAlignment: CandidateJobAlignmentRecord = {
        ...baseAlignment,
        parse_id: 'older-parse-001',
        candidate_applied_at: '2026-09-10T08:00:00.000Z'
      };

      const isCurr = isAlignmentCurrent(
        staleCandidateAlignment,
        canonicalJob.updated_at,
        latestParse.id,
        latestParse.applied_at
      );
      expect(isCurr).toBe(false);

      const staleMeta = computeStaleReasons(
        staleCandidateAlignment,
        canonicalJob.updated_at,
        latestParse.id,
        latestParse.applied_at
      );
      expect(staleMeta.isCurrent).toBe(false);
      expect(staleMeta.isStale).toBe(true);
      expect(staleMeta.staleReasons).toContain('CANDIDATE_PROFILE_CHANGED');
      expect(staleMeta.staleLabels).toContain('Stale — Profile Changed');
    });

    it('flags alignment as stale when job requirements were updated', () => {
      const staleJobAlignment: CandidateJobAlignmentRecord = {
        ...baseAlignment,
        job_updated_at: '2026-08-01T00:00:00.000Z' // older than current job's 2026-09-20
      };

      const staleMeta = computeStaleReasons(
        staleJobAlignment,
        canonicalJob.updated_at,
        latestParse.id,
        latestParse.applied_at
      );
      expect(staleMeta.isCurrent).toBe(false);
      expect(staleMeta.isStale).toBe(true);
      expect(staleMeta.staleReasons).toContain('JOB_CHANGED');
      expect(staleMeta.staleLabels).toContain('Stale — Job Changed');
    });

    it('flags alignment as historical when ruleset methodology differs', () => {
      const historicalRulesetAlignment: CandidateJobAlignmentRecord = {
        ...baseAlignment,
        ruleset_version: 'job-alignment-v1.1'
      };

      const staleMeta = computeStaleReasons(
        historicalRulesetAlignment,
        canonicalJob.updated_at,
        latestParse.id,
        latestParse.applied_at
      );
      expect(staleMeta.isCurrent).toBe(false);
      expect(staleMeta.isStale).toBe(true);
      expect(staleMeta.staleReasons).toContain('RULESET_CHANGED');
      expect(staleMeta.staleLabels).toContain('Historical Methodology');
    });

    it('identifies multiple source changes simultaneously', () => {
      const mixedStaleAlignment: CandidateJobAlignmentRecord = {
        ...baseAlignment,
        parse_id: 'old-parse',
        candidate_applied_at: '2026-08-01T00:00:00.000Z',
        ruleset_version: 'job-alignment-v1'
      };

      const staleMeta = computeStaleReasons(
        mixedStaleAlignment,
        canonicalJob.updated_at,
        latestParse.id,
        latestParse.applied_at
      );
      expect(staleMeta.isStale).toBe(true);
      expect(staleMeta.staleReasons).toContain('CANDIDATE_PROFILE_CHANGED');
      expect(staleMeta.staleReasons).toContain('RULESET_CHANGED');
      expect(staleMeta.staleReasons).toContain('MULTIPLE_SOURCE_CHANGES');
      expect(staleMeta.staleLabels).toContain('Mixed Changes');
    });
  });

  describe('History Assembly Contract (Section 6 & 20)', () => {
    it('assembles complete history with current and historical snapshots', () => {
      const olderRecord: CandidateJobAlignmentRecord = {
        ...baseAlignment,
        id: 'align-older',
        score: 40,
        ruleset_version: 'job-alignment-v1.2',
        parse_id: 'parse-101',
        candidate_applied_at: '2026-09-15T00:00:00.000Z',
        created_at: '2026-09-15T01:00:00.000Z'
      };

      const response = buildAlignmentHistoryResponse(
        canonicalJob,
        latestParse,
        [baseAlignment, olderRecord]
      );

      expect(response.analysis_version).toBe(CURRENT_ALIGNMENT_HISTORY_VERSION);
      expect(response.job_id).toBe(canonicalJob.id);
      expect(response.current_alignment_id).toBe(baseAlignment.id);
      expect(response.has_current_alignment).toBe(true);
      expect(response.history).toHaveLength(2);

      // Verify item provenance
      const currentItem = response.history[0];
      expect(currentItem.alignment_id).toBe('align-1');
      expect(currentItem.is_current).toBe(true);
      expect(currentItem.is_stale).toBe(false);
      expect(currentItem.matched_count).toBe(1);
      expect(currentItem.partially_supported_count).toBe(1);
      expect(currentItem.not_found_count).toBe(1);
      expect(currentItem.total_criteria_count).toBe(3);

      const olderItem = response.history[1];
      expect(olderItem.alignment_id).toBe('align-older');
      expect(olderItem.is_current).toBe(false);
      expect(olderItem.is_stale).toBe(true);
      expect(olderItem.stale_labels).toContain('Historical Methodology');
      expect(olderItem.stale_labels).toContain('Stale — Profile Changed');

      expect(response.interpretation_notice).toBe(ALIGNMENT_INTERPRETATION_NOTICE);
    });
  });

  describe('Direct Candidate Change Fixture (Section 39)', () => {
    it('classifies direct candidate profile evidence update cleanly with progress delta', () => {
      const olderAnalysis: CandidateJobAlignmentRecord = {
        ...baseAlignment,
        id: 'align-old',
        score: 40,
        parse_id: 'parse-v1',
        candidate_applied_at: '2026-09-10T10:00:00.000Z',
        criteria_breakdown: [
          { id: 'crit-cisa', criterion: 'CISA certification', status: 'not_found' },
          { id: 'crit-tenure', criterion: '5+ years experience', status: 'not_found' }
        ]
      };

      const newerAnalysis: CandidateJobAlignmentRecord = {
        ...baseAlignment,
        id: 'align-new',
        score: 55,
        parse_id: 'parse-v2',
        candidate_applied_at: '2026-09-20T10:00:00.000Z',
        criteria_breakdown: [
          { id: 'crit-cisa', criterion: 'CISA certification', status: 'matched', candidate_evidence: 'CISA #12345' },
          { id: 'crit-tenure', criterion: '5+ years experience', status: 'not_found' }
        ]
      };

      const result = buildAlignmentComparisonResponse(
        olderAnalysis,
        newerAnalysis,
        canonicalJob,
        latestParse
      );

      expect(result.comparison_type).toBe('CANDIDATE_EVIDENCE_CHANGED');
      expect(result.directly_comparable).toBe(true);
      expect(result.result_variance_detected).toBe(false);
      expect(result.changes.candidate_source_changed).toBe(true);
      expect(result.changes.job_source_changed).toBe(false);
      expect(result.changes.ruleset_changed).toBe(false);

      // Score delta
      expect(result.score_comparison.display_type).toBe('PROGRESS_DELTA');
      expect(result.score_comparison.score_delta).toBe(15);
      expect(result.score_comparison.delta_label).toBe('+15%');
      expect(result.score_comparison.message).toContain('with stronger evidence substantiated');

      // Criterion transition
      const cisaComp = result.criteria_comparisons.find(c => c.criterion_id === 'crit-cisa');
      expect(cisaComp?.transition).toBe('NEWLY_SUPPORTED');
      expect(cisaComp?.transition_label).toBe('Newly Supported');
      expect(cisaComp?.explanation).toBe('Your approved profile provides stronger evidence for this requirement in the newer analysis.');

      // Never say candidate became a better person
      const jsonStr = JSON.stringify(result);
      expect(jsonStr).not.toContain('You became better');
      expect(jsonStr).not.toContain('hiring chance');
    });
  });

  describe('Job Change Fixture (Section 40)', () => {
    it('classifies employer requirement changes without candidate progress claims', () => {
      const olderAnalysis: CandidateJobAlignmentRecord = {
        ...baseAlignment,
        id: 'align-job-v1',
        job_updated_at: '2026-08-01T00:00:00.000Z',
        score: 60,
        criteria_breakdown: [
          { id: 'c1', criterion: 'Legacy duty A', status: 'matched' },
          { id: 'c2', criterion: 'Legacy duty B', status: 'matched' }
        ]
      };

      const newerAnalysis: CandidateJobAlignmentRecord = {
        ...baseAlignment,
        id: 'align-job-v2',
        job_updated_at: '2026-09-20T10:00:00.000Z',
        score: 45,
        criteria_breakdown: [
          { id: 'c1', criterion: 'Legacy duty A', status: 'matched' },
          { id: 'c3', criterion: 'Newly added duty C', status: 'not_found' }
        ]
      };

      const result = buildAlignmentComparisonResponse(
        olderAnalysis,
        newerAnalysis,
        canonicalJob,
        latestParse
      );

      expect(result.comparison_type).toBe('JOB_CHANGED');
      expect(result.directly_comparable).toBe(false);
      expect(result.score_comparison.display_type).toBe('SIDE_BY_SIDE');
      expect(result.comparison_explanation).toContain('job requirements changed');

      // Requirement added & removed
      const addedComp = result.criteria_comparisons.find(c => c.criterion_id === 'c3');
      expect(addedComp?.transition).toBe('ADDED_REQUIREMENT');
      expect(addedComp?.transition_label).toBe('Added Role Requirement');

      const removedComp = result.criteria_comparisons.find(c => c.criterion_id === 'c2');
      expect(removedComp?.transition).toBe('REMOVED_REQUIREMENT');
      expect(removedComp?.transition_label).toBe('Removed Role Requirement');
    });
  });

  describe('Ruleset Change Fixture (Section 41)', () => {
    it('surfaces methodology change banner without claiming candidate progress or regression', () => {
      const v12Analysis: CandidateJobAlignmentRecord = {
        ...baseAlignment,
        id: 'align-v12',
        ruleset_version: 'job-alignment-v1.2',
        score: 50,
        criteria_breakdown: [
          { id: 'c1', criterion: 'Audit command language', status: 'not_found' }
        ]
      };

      const v13Analysis: CandidateJobAlignmentRecord = {
        ...baseAlignment,
        id: 'align-v13',
        ruleset_version: 'job-alignment-v1.3',
        score: 70,
        criteria_breakdown: [
          { id: 'c1', criterion: 'Audit command language', status: 'matched' }
        ]
      };

      const result = buildAlignmentComparisonResponse(
        v12Analysis,
        v13Analysis,
        canonicalJob,
        latestParse
      );

      expect(result.comparison_type).toBe('RULESET_CHANGED');
      expect(result.directly_comparable).toBe(false);
      expect(result.score_comparison.display_type).toBe('SIDE_BY_SIDE');
      expect(result.comparison_explanation).toContain('alignment methodology changed');

      // Criterion transition is marked METHODOLOGY_CHANGED
      const comp = result.criteria_comparisons.find(c => c.criterion_id === 'c1');
      expect(comp?.transition).toBe('METHODOLOGY_CHANGED');
      expect(comp?.transition_label).toBe('Methodology Shift');
      expect(comp?.explanation).toContain('job-alignment-v1.2 → job-alignment-v1.3');
    });
  });

  describe('Mixed Change Fixture (Section 42)', () => {
    it('handles multiple concurrent changes neutrally', () => {
      const olderAnalysis: CandidateJobAlignmentRecord = {
        ...baseAlignment,
        id: 'align-old-mixed',
        job_updated_at: '2026-08-01T00:00:00.000Z',
        ruleset_version: 'job-alignment-v1.1',
        parse_id: 'parse-old',
        candidate_applied_at: '2026-08-01T00:00:00.000Z',
        score: 30
      };

      const newerAnalysis: CandidateJobAlignmentRecord = {
        ...baseAlignment,
        id: 'align-new-mixed',
        score: 65
      };

      const result = buildAlignmentComparisonResponse(
        olderAnalysis,
        newerAnalysis,
        canonicalJob,
        latestParse
      );

      expect(result.comparison_type).toBe('MIXED_SOURCE_CHANGES');
      expect(result.directly_comparable).toBe(false);
      expect(result.changes.candidate_source_changed).toBe(true);
      expect(result.changes.job_source_changed).toBe(true);
      expect(result.changes.ruleset_changed).toBe(true);
      expect(result.score_comparison.display_type).toBe('SIDE_BY_SIDE');
      expect(result.comparison_explanation).toContain('Multiple factors changed');
    });
  });

  describe('Same Snapshot Fixture & Variance Detection (Section 43)', () => {
    it('identifies identical source re-analysis cleanly', () => {
      const analysisA: CandidateJobAlignmentRecord = {
        ...baseAlignment,
        id: 'align-same-1',
        score: 60
      };
      const analysisB: CandidateJobAlignmentRecord = {
        ...baseAlignment,
        id: 'align-same-2',
        score: 60
      };

      const result = buildAlignmentComparisonResponse(
        analysisA,
        analysisB,
        canonicalJob,
        latestParse
      );

      expect(result.comparison_type).toBe('SAME_SNAPSHOT');
      expect(result.directly_comparable).toBe(false);
      expect(result.result_variance_detected).toBe(false);
      expect(result.comparison_headline).toBe('Identical Source Snapshot');
    });

    it('detects and flags unexpected variance between identical source snapshots', () => {
      const analysisA: CandidateJobAlignmentRecord = {
        ...baseAlignment,
        id: 'align-var-1',
        score: 60
      };
      const analysisB: CandidateJobAlignmentRecord = {
        ...baseAlignment,
        id: 'align-var-2',
        score: 75 // Different score with exact same sources
      };

      const result = buildAlignmentComparisonResponse(
        analysisA,
        analysisB,
        canonicalJob,
        latestParse
      );

      expect(result.comparison_type).toBe('SAME_SNAPSHOT');
      expect(result.result_variance_detected).toBe(true);
      expect(result.comparison_headline).toContain('Result Variance Detected');
      expect(result.comparison_explanation).toContain('does not reflect candidate progress');
    });
  });

  describe('Criterion Transition Mechanics (Section 44)', () => {
    it('evaluates all standard status transitions accurately under identical sources', () => {
      const listFrom = [
        { id: '1', criterion: 'Req 1', category: 'required', status: 'not_found' as const },
        { id: '2', criterion: 'Req 2', category: 'required', status: 'not_found' as const },
        { id: '3', criterion: 'Req 3', category: 'required', status: 'partially_supported' as const },
        { id: '4', criterion: 'Req 4', category: 'required', status: 'matched' as const },
        { id: '5', criterion: 'Req 5', category: 'required', status: 'matched' as const },
        { id: '6', criterion: 'Req 6', category: 'required', status: 'partially_supported' as const },
        { id: '7', criterion: 'Req 7', category: 'required', status: 'matched' as const },
        { id: '8', criterion: 'Req 8', category: 'required', status: 'partially_supported' as const },
        { id: '9', criterion: 'Req 9', category: 'required', status: 'not_found' as const }
      ];

      const listTo = [
        { id: '1', criterion: 'Req 1', category: 'required', status: 'matched' as const }, // not_found -> matched (NEWLY_SUPPORTED)
        { id: '2', criterion: 'Req 2', category: 'required', status: 'partially_supported' as const }, // not_found -> partial (STRENGTHENED)
        { id: '3', criterion: 'Req 3', category: 'required', status: 'matched' as const }, // partial -> matched (STRENGTHENED)
        { id: '4', criterion: 'Req 4', category: 'required', status: 'partially_supported' as const }, // matched -> partial (WEAKENED)
        { id: '5', criterion: 'Req 5', category: 'required', status: 'not_found' as const }, // matched -> not_found (NO_LONGER_EVIDENCED)
        { id: '6', criterion: 'Req 6', category: 'required', status: 'not_found' as const }, // partial -> not_found (WEAKENED)
        { id: '7', criterion: 'Req 7', category: 'required', status: 'matched' as const }, // matched -> matched (UNCHANGED_SUPPORTED)
        { id: '8', criterion: 'Req 8', category: 'required', status: 'partially_supported' as const }, // partial -> partial (UNCHANGED_PARTIAL)
        { id: '9', criterion: 'Req 9', category: 'required', status: 'not_found' as const } // not_found -> not_found (UNCHANGED_NOT_FOUND)
      ];

      const { comparisons, summaryCounts } = compareCriteriaLists(listFrom, listTo, {
        jobChanged: false,
        rulesetChanged: false,
        fromRuleset: 'job-alignment-v1.3',
        toRuleset: 'job-alignment-v1.3'
      });

      expect(comparisons.find(c => c.criterion_id === '1')?.transition).toBe('NEWLY_SUPPORTED');
      expect(comparisons.find(c => c.criterion_id === '2')?.transition).toBe('STRENGTHENED');
      expect(comparisons.find(c => c.criterion_id === '3')?.transition).toBe('STRENGTHENED');
      expect(comparisons.find(c => c.criterion_id === '4')?.transition).toBe('WEAKENED');
      expect(comparisons.find(c => c.criterion_id === '5')?.transition).toBe('NO_LONGER_EVIDENCED');
      expect(comparisons.find(c => c.criterion_id === '6')?.transition).toBe('WEAKENED');
      expect(comparisons.find(c => c.criterion_id === '7')?.transition).toBe('UNCHANGED_SUPPORTED');
      expect(comparisons.find(c => c.criterion_id === '8')?.transition).toBe('UNCHANGED_PARTIAL');
      expect(comparisons.find(c => c.criterion_id === '9')?.transition).toBe('UNCHANGED_NOT_FOUND');

      expect(summaryCounts.newly_supported).toBe(1);
      expect(summaryCounts.strengthened).toBe(2);
      expect(summaryCounts.weakened).toBe(2);
      expect(summaryCounts.no_longer_evidenced).toBe(1);
      expect(summaryCounts.unchanged_supported).toBe(1);
      expect(summaryCounts.unchanged_partial).toBe(1);
      expect(summaryCounts.unchanged_not_found).toBe(1);
    });
  });

  describe('Historical Format Resilience (Section 35 & 46)', () => {
    it('handles null, undefined, strings, and missing keys without crashing', () => {
      expect(normalizeCriteriaBreakdown(null)).toEqual([]);
      expect(normalizeCriteriaBreakdown(undefined)).toEqual([]);
      expect(normalizeCriteriaBreakdown('invalid string')).toEqual([]);
      expect(normalizeCriteriaBreakdown({})).toEqual([]);

      const malformedRaw = [
        null,
        {},
        { name: 'Legacy duty with name field', match_status: 'supported' },
        { text: 'Another legacy format', status: 'partial' },
        { source_text: 'Excluded heading', status: 'structural' }
      ];

      const normalized = normalizeCriteriaBreakdown(malformedRaw);
      expect(normalized).toHaveLength(5);
      expect(normalized[0].criterion).toBe('Historical requirement text unavailable');
      expect(normalized[0].status).toBe('not_found');
      expect(normalized[2].criterion).toBe('Legacy duty with name field');
      expect(normalized[2].status).toBe('matched');
      expect(normalized[3].criterion).toBe('Another legacy format');
      expect(normalized[3].status).toBe('partially_supported');
      expect(normalized[4].status).toBe('not_applicable');
    });
  });
});
