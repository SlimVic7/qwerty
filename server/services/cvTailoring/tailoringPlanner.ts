/**
 * QWERTY Stage 5.2 — Tailoring Planner
 * Generates an evidence-backed tailoring plan and isolates unaddressed job criteria.
 */

import { CandidateEvidenceCard, TailoringPlan, UnaddressedJobCriterion } from './types.js';
import { JobAlignmentResult } from '../matching/jobAlignment.js';

export function createTailoringPlan(
  job: {
    title: string;
    company_name: string;
    requirements?: string | null;
    preferred_qualifications?: string | null;
    responsibilities?: string | null;
  },
  evidenceCards: CandidateEvidenceCard[],
  alignmentResult?: JobAlignmentResult | any
): TailoringPlan {
  const priorityStrengths: string[] = [];
  const reorderPriorities: string[] = [];
  const concisionTargets: string[] = [];
  const unaddressedCriteria: UnaddressedJobCriterion[] = [];

  // Stage 5.1 Alignment is the authoritative source for criteria and gaps
  // Handles both JobAlignmentResult object and persisted database record (criteria_breakdown)
  const criteriaList = Array.isArray(alignmentResult?.criteria_breakdown)
    ? alignmentResult.criteria_breakdown
    : Array.isArray(alignmentResult?.criteria)
    ? alignmentResult.criteria
    : [];

  let gapCount = 0;
  for (const crit of criteriaList) {
    const status = crit.status || crit.match_status;
    const isApplicable = crit.applicable !== false && status !== 'not_applicable';

    if (status === 'matched' || status === 'partially_supported') {
      const strengthText = crit.criterion || crit.source_text || crit.normalized_value;
      if (strengthText) {
        priorityStrengths.push(strengthText);
      }
    } else if (status === 'not_found' && isApplicable) {
      gapCount++;
      const critId = crit.id || crit.criterion_id || `gap-${gapCount}`;
      const critText = crit.criterion || crit.source_text || crit.normalized_value || '';
      const critType = crit.type || crit.category || 'required';
      const critReason = crit.reason && typeof crit.reason === 'string' && crit.reason.trim().length > 0
        ? crit.reason.trim()
        : 'Not found in your approved profile';

      unaddressedCriteria.push({
        id: critId,
        criterion_id: critId,
        criterion: critText,
        source_text: crit.source_text || critText,
        type: critType,
        category: critType,
        reason: critReason,
        guidance: 'Update your QWERTY profile first if you have evidence for this.'
      });
    }
  }

  // Identify candidate skills that match the target job title/domain for reordering
  const jobTitleTokens = (job.title || '').toLowerCase().split(/\s+/).filter(t => t.length > 3);
  for (const card of evidenceCards) {
    if (card.source_type === 'skills') {
      const skillLower = card.text.toLowerCase();
      if (jobTitleTokens.some(token => skillLower.includes(token))) {
        reorderPriorities.push(card.text);
      }
    }
    if (card.source_type === 'experience' && card.text.length > 180) {
      concisionTargets.push(card.evidence_id);
    }
  }

  return {
    target_job_title: job.title,
    target_company: job.company_name,
    priority_strengths: Array.from(new Set(priorityStrengths)),
    reorder_priorities: Array.from(new Set(reorderPriorities)),
    concision_targets: concisionTargets,
    unaddressed_criteria: unaddressedCriteria,
    unaddressed_count: unaddressedCriteria.length
  };
}
