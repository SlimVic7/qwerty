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
    it('A: 40 -> 55 displays +15 points and never +15%', () => {
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

      // Score delta must be in points, not percent
      expect(result.score_comparison.display_type).toBe('PROGRESS_DELTA');
      expect(result.score_comparison.score_delta).toBe(15);
      expect(result.score_comparison.delta_label).toBe('+15 points');
      expect(result.score_comparison.delta_label).not.toContain('%');
      expect(result.score_comparison.message).toBe(
        "Alignment score change: +15 points. Your newer approved profile provides stronger evidence for some of this role's requirements."
      );
    });

    it('B: 60 -> 45 displays -15 points for decrease', () => {
      const olderAnalysis: CandidateJobAlignmentRecord = {
        ...baseAlignment,
        id: 'align-higher',
        score: 60,
        parse_id: 'parse-v1',
        candidate_applied_at: '2026-09-10T10:00:00.000Z',
        criteria_breakdown: [
          { id: 'crit-cisa', criterion: 'CISA certification', status: 'matched', candidate_evidence: 'CISA #12345' },
          { id: 'crit-tenure', criterion: '5+ years experience', status: 'partially_supported' }
        ]
      };

      const newerAnalysis: CandidateJobAlignmentRecord = {
        ...baseAlignment,
        id: 'align-lower',
        score: 45,
        parse_id: 'parse-v2',
        candidate_applied_at: '2026-09-20T10:00:00.000Z',
        criteria_breakdown: [
          { id: 'crit-cisa', criterion: 'CISA certification', status: 'not_found' },
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
      expect(result.score_comparison.score_delta).toBe(-15);
      expect(result.score_comparison.delta_label).toBe('-15 points');
      expect(result.score_comparison.delta_label).not.toContain('%');
      expect(result.score_comparison.message).toBe(
        "Alignment score change: -15 points. Your newer approved profile provides less evidence for some of this role's requirements."
      );
    });

    it('C: direct candidate-evidence comparison contains no wording "candidate progress"', () => {
      const olderAnalysis: CandidateJobAlignmentRecord = {
        ...baseAlignment,
        id: 'align-10',
        score: 40,
        parse_id: 'parse-v1',
        candidate_applied_at: '2026-09-10T10:00:00.000Z'
      };

      const newerAnalysis: CandidateJobAlignmentRecord = {
        ...baseAlignment,
        id: 'align-11',
        score: 55,
        parse_id: 'parse-v2',
        candidate_applied_at: '2026-09-20T10:00:00.000Z'
      };

      const result = buildAlignmentComparisonResponse(
        olderAnalysis,
        newerAnalysis,
        canonicalJob,
        latestParse
      );

      expect(result.comparison_headline).toBe('Profile Evidence Changed');
      expect(result.comparison_explanation).not.toContain('candidate progress');
      expect(result.comparison_explanation).not.toContain('Candidate progress');
      expect(result.comparison_explanation).not.toContain('Career improvement');
      expect(result.comparison_explanation).not.toContain('You improved');
      expect(result.comparison_explanation).not.toContain('You became more qualified');

      const jsonStr = JSON.stringify(result).toLowerCase();
      expect(jsonStr).not.toContain('candidate progress');
      expect(jsonStr).not.toContain('career improvement');
      expect(jsonStr).not.toContain('you improved');
      expect(jsonStr).not.toContain('you became more qualified');
      expect(jsonStr).not.toContain('gained skill');
    });

    it('D: not_found -> matched yields "newer approved profile now provides evidence" and not "candidate gained skill"', () => {
      const olderAnalysis: CandidateJobAlignmentRecord = {
        ...baseAlignment,
        id: 'align-old-d',
        parse_id: 'parse-v1',
        candidate_applied_at: '2026-09-10T10:00:00.000Z',
        criteria_breakdown: [
          { id: 'crit-cisa', criterion: 'CISA certification', status: 'not_found' }
        ]
      };

      const newerAnalysis: CandidateJobAlignmentRecord = {
        ...baseAlignment,
        id: 'align-new-d',
        parse_id: 'parse-v2',
        candidate_applied_at: '2026-09-20T10:00:00.000Z',
        criteria_breakdown: [
          { id: 'crit-cisa', criterion: 'CISA certification', status: 'matched', candidate_evidence: 'CISA #12345' }
        ]
      };

      const result = buildAlignmentComparisonResponse(
        olderAnalysis,
        newerAnalysis,
        canonicalJob,
        latestParse
      );

      const cisaComp = result.criteria_comparisons.find(c => c.criterion_id === 'crit-cisa');
      expect(cisaComp?.transition).toBe('NEWLY_SUPPORTED');
      expect(cisaComp?.transition_label).toBe('Newly Supported');
      expect(cisaComp?.explanation).toBe('Your newer approved profile now provides evidence for this requirement.');
      expect(cisaComp?.explanation).not.toContain('gained');
      expect(cisaComp?.explanation).not.toContain('skill');
    });

    it('E: partially_supported -> matched yields evidence-strengthening wording', () => {
      const olderAnalysis: CandidateJobAlignmentRecord = {
        ...baseAlignment,
        id: 'align-old-e',
        parse_id: 'parse-v1',
        candidate_applied_at: '2026-09-10T10:00:00.000Z',
        criteria_breakdown: [
          { id: 'crit-lead', criterion: 'Team leadership', status: 'partially_supported', candidate_evidence: 'Led 1 project' }
        ]
      };

      const newerAnalysis: CandidateJobAlignmentRecord = {
        ...baseAlignment,
        id: 'align-new-e',
        parse_id: 'parse-v2',
        candidate_applied_at: '2026-09-20T10:00:00.000Z',
        criteria_breakdown: [
          { id: 'crit-lead', criterion: 'Team leadership', status: 'matched', candidate_evidence: 'Led team of 8 for 3 years' }
        ]
      };

      const result = buildAlignmentComparisonResponse(
        olderAnalysis,
        newerAnalysis,
        canonicalJob,
        latestParse
      );

      const leadComp = result.criteria_comparisons.find(c => c.criterion_id === 'crit-lead');
      expect(leadComp?.transition).toBe('STRENGTHENED');
      expect(leadComp?.transition_label).toBe('Strengthened');
      expect(leadComp?.explanation).toBe('Your newer approved profile provides stronger evidence for this requirement.');
      expect(leadComp?.explanation).not.toContain('skill');
      expect(leadComp?.explanation).not.toContain('gained');
    });

    it('verifies negative transitions state profile provides less evidence without implying capability loss', () => {
      const olderAnalysis: CandidateJobAlignmentRecord = {
        ...baseAlignment,
        id: 'align-old-neg',
        parse_id: 'parse-v1',
        candidate_applied_at: '2026-09-10T10:00:00.000Z',
        criteria_breakdown: [
          { id: 'crit-1', criterion: 'Skill 1', status: 'matched' },
          { id: 'crit-2', criterion: 'Skill 2', status: 'partially_supported' }
        ]
      };

      const newerAnalysis: CandidateJobAlignmentRecord = {
        ...baseAlignment,
        id: 'align-new-neg',
        parse_id: 'parse-v2',
        candidate_applied_at: '2026-09-20T10:00:00.000Z',
        criteria_breakdown: [
          { id: 'crit-1', criterion: 'Skill 1', status: 'not_found' },
          { id: 'crit-2', criterion: 'Skill 2', status: 'not_found' }
        ]
      };

      const result = buildAlignmentComparisonResponse(
        olderAnalysis,
        newerAnalysis,
        canonicalJob,
        latestParse
      );

      const comp1 = result.criteria_comparisons.find(c => c.criterion_id === 'crit-1');
      expect(comp1?.transition).toBe('NO_LONGER_EVIDENCED');
      expect(comp1?.explanation).toBe('Your newer approved profile provides less evidence for this requirement.');

      const comp2 = result.criteria_comparisons.find(c => c.criterion_id === 'crit-2');
      expect(comp2?.transition).toBe('WEAKENED');
      expect(comp2?.explanation).toBe('Your newer approved profile provides less evidence for this requirement.');
    });

    it('handles zero-point score difference (55 -> 55) with precise non-contradictory wording', () => {
      const olderAnalysis: CandidateJobAlignmentRecord = {
        ...baseAlignment,
        id: 'align-zero-1',
        score: 55,
        parse_id: 'parse-v1',
        candidate_applied_at: '2026-09-10T10:00:00.000Z',
        criteria_breakdown: [
          { id: 'crit-cisa', criterion: 'CISA certification', status: 'not_found' },
          { id: 'crit-tenure', criterion: '5+ years experience', status: 'matched' }
        ]
      };

      const newerAnalysis: CandidateJobAlignmentRecord = {
        ...baseAlignment,
        id: 'align-zero-2',
        score: 55,
        parse_id: 'parse-v2',
        candidate_applied_at: '2026-09-20T10:00:00.000Z',
        criteria_breakdown: [
          { id: 'crit-cisa', criterion: 'CISA certification', status: 'matched' },
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
      expect(result.score_comparison.score_delta).toBe(0);
      expect(result.score_comparison.delta_label).toBe('0 points');
      expect(result.score_comparison.message).toBe(
        'Alignment score change: 0 points. Your approved profile evidence changed, but the overall alignment score remained the same.'
      );
      expect(result.score_comparison.message).not.toContain('Your alignment score changed');
    });
  });

  describe('Job Change Fixture (Section 40)', () => {
    it('classifies employer requirement changes without candidate progress claims and uses Newer score', () => {
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
      expect(result.score_comparison.message).toContain('Previous score: 60 | Newer score: 45.');
      expect(result.score_comparison.message).not.toContain('Target score');
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
      expect(result.comparison_explanation).toContain('does not reflect changes in profile evidence');
      expect(result.comparison_explanation).not.toContain('candidate progress');
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

  describe('Live Production Expectations (Sections 5 & 6)', () => {
    it('Senior Internal Auditor: v1.3 (18) vs earlier v1.3 (18) -> SAME_SNAPSHOT, 0 points, no variance', () => {
      const v13Earlier: CandidateJobAlignmentRecord = {
        ...baseAlignment,
        id: 'align-auditor-v13-earlier',
        score: 18,
        ruleset_version: 'job-alignment-v1.3'
      };

      const v13Latest: CandidateJobAlignmentRecord = {
        ...baseAlignment,
        id: 'align-auditor-v13-latest',
        score: 18,
        ruleset_version: 'job-alignment-v1.3'
      };

      const result = buildAlignmentComparisonResponse(
        v13Earlier,
        v13Latest,
        canonicalJob,
        latestParse
      );

      expect(result.comparison_type).toBe('SAME_SNAPSHOT');
      expect(result.directly_comparable).toBe(false);
      expect(result.result_variance_detected).toBe(false);
      expect(result.score_comparison.score_delta).toBe(0);
      expect(result.score_comparison.from_score).toBe(18);
      expect(result.score_comparison.to_score).toBe(18);
    });

    it('Senior Internal Auditor: v1.3 (18) vs v1.2 (22) -> RULESET_CHANGED, not directly comparable, methodology warning', () => {
      const v12Record: CandidateJobAlignmentRecord = {
        ...baseAlignment,
        id: 'align-auditor-v12',
        score: 22,
        ruleset_version: 'job-alignment-v1.2'
      };

      const v13Record: CandidateJobAlignmentRecord = {
        ...baseAlignment,
        id: 'align-auditor-v13',
        score: 18,
        ruleset_version: 'job-alignment-v1.3'
      };

      const result = buildAlignmentComparisonResponse(
        v12Record,
        v13Record,
        canonicalJob,
        latestParse
      );

      expect(result.comparison_type).toBe('RULESET_CHANGED');
      expect(result.directly_comparable).toBe(false);
      expect(result.score_comparison.display_type).toBe('SIDE_BY_SIDE');
      expect(result.score_comparison.message).toBe(
        'Previous score: 22 | Newer score: 18. Side-by-side comparison only (score differences reflect changes in job requirements or methodology rather than profile evidence).'
      );
      expect(result.comparison_explanation).toContain("QWERTY's alignment methodology changed");

      // Verify absence of candidate progress / regression language
      const jsonStr = JSON.stringify(result).toLowerCase();
      expect(jsonStr).not.toContain('candidate progress');
      expect(jsonStr).not.toContain('candidate regression');
      expect(jsonStr).not.toContain('you improved');
    });

    it('Network Engineer: v1.3 (0) vs historical v1 (44) preserves score 44 exactly and warns of methodology change', () => {
      const v1Record: CandidateJobAlignmentRecord = {
        ...baseAlignment,
        id: 'align-neteng-v1',
        score: 44,
        ruleset_version: 'job-alignment-v1'
      };

      const v13Record: CandidateJobAlignmentRecord = {
        ...baseAlignment,
        id: 'align-neteng-v13',
        score: 0,
        ruleset_version: 'job-alignment-v1.3'
      };

      const result = buildAlignmentComparisonResponse(
        v1Record,
        v13Record,
        canonicalJob,
        latestParse
      );

      expect(result.comparison_type).toBe('RULESET_CHANGED');
      expect(result.directly_comparable).toBe(false);
      expect(result.score_comparison.from_score).toBe(44);
      expect(result.score_comparison.to_score).toBe(0);
      expect(result.score_comparison.display_type).toBe('SIDE_BY_SIDE');
      expect(result.score_comparison.message).toBe(
        'Previous score: 44 | Newer score: 0. Side-by-side comparison only (score differences reflect changes in job requirements or methodology rather than profile evidence).'
      );

      // Must not state candidate decreased
      expect(result.score_comparison.message).not.toContain('decreased by 44 points');
      expect(JSON.stringify(result)).not.toContain('decreased by 44 points');
    });
  });
});
