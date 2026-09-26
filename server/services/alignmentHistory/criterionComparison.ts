/**
 * Job Alignment History & Comparison (QWERTY Stage 5.4)
 * Deterministic Criterion Comparison & Normalization Engine
 */

import {
  NormalizedCriterion,
  NormalizedCriterionStatus,
  CriterionComparisonResult,
  CriterionTransitionCategory
} from './types.js';

/**
 * Robustly normalizes heterogeneous historical criteria breakdown data.
 * Defensive against missing arrays, undefined keys, and legacy string values.
 */
export function normalizeCriteriaBreakdown(raw: any): NormalizedCriterion[] {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : (raw.criteria || raw.items || []);
  if (!Array.isArray(list)) return [];

  return list.map((item, idx) => {
    if (!item || typeof item !== 'object') {
      return {
        id: `legacy-crit-${idx}`,
        criterion: 'Historical requirement text unavailable',
        category: 'required',
        status: 'not_found' as NormalizedCriterionStatus
      };
    }

    const id = String(item.id || item.criterion_id || `crit-${idx}`);
    const criterion = String(
      item.criterion ||
      item.source_text ||
      item.text ||
      item.normalized_value ||
      item.name ||
      'Unspecified role requirement'
    );
    const category = String(item.category || item.type || 'required');

    const rawStatus = String(item.status || item.match_status || 'not_found').toLowerCase().trim();
    let status: NormalizedCriterionStatus = 'not_found';

    if (rawStatus === 'matched' || rawStatus === 'supported' || rawStatus === 'full') {
      status = 'matched';
    } else if (rawStatus === 'partially_supported' || rawStatus === 'partial') {
      status = 'partially_supported';
    } else if (
      rawStatus === 'not_applicable' ||
      rawStatus === 'excluded' ||
      rawStatus === 'ignored' ||
      rawStatus === 'structural'
    ) {
      status = 'not_applicable';
    } else {
      status = 'not_found';
    }

    return {
      id,
      criterion,
      category,
      status,
      candidate_evidence: item.candidate_evidence ? String(item.candidate_evidence) : undefined,
      candidate_source: item.candidate_source ? String(item.candidate_source) : undefined,
      explanation: item.explanation || item.reason ? String(item.explanation || item.reason) : undefined
    };
  });
}

/**
 * Normalizes text for fallback semantic matching when criterion IDs differ.
 */
function normalizeTextKey(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Compares two normalized criteria lists deterministically.
 */
export function compareCriteriaLists(
  fromList: NormalizedCriterion[],
  toList: NormalizedCriterion[],
  options: {
    jobChanged: boolean;
    rulesetChanged: boolean;
    fromRuleset: string;
    toRuleset: string;
  }
): {
  comparisons: CriterionComparisonResult[];
  summaryCounts: {
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
} {
  const comparisons: CriterionComparisonResult[] = [];
  const summaryCounts = {
    newly_supported: 0,
    strengthened: 0,
    unchanged_supported: 0,
    unchanged_partial: 0,
    unchanged_not_found: 0,
    weakened: 0,
    no_longer_evidenced: 0,
    added_requirement: 0,
    removed_requirement: 0,
    methodology_changed: 0,
    other_changes: 0
  };

  const fromById = new Map<string, NormalizedCriterion>();
  const fromByText = new Map<string, NormalizedCriterion>();
  const matchedFromIds = new Set<string>();

  for (const item of fromList) {
    fromById.set(item.id, item);
    fromByText.set(normalizeTextKey(item.criterion), item);
  }

  // Iterate over newer / target criteria (to)
  for (const toItem of toList) {
    let fromItem = fromById.get(toItem.id);
    if (!fromItem) {
      // Fallback matching by normalized text
      const textKey = normalizeTextKey(toItem.criterion);
      if (fromByText.has(textKey)) {
        fromItem = fromByText.get(textKey);
      }
    }

    if (fromItem) {
      matchedFromIds.add(fromItem.id);
      const fromStatus = fromItem.status;
      const toStatus = toItem.status;

      let transition: CriterionTransitionCategory = 'STATUS_CHANGED';
      let transition_label = 'Status Changed';
      let explanation = 'Requirement status changed between analyses.';

      if (options.rulesetChanged && fromStatus !== toStatus) {
        transition = 'METHODOLOGY_CHANGED';
        transition_label = 'Methodology Shift';
        explanation = `Status shifted under updated ruleset methodology (${options.fromRuleset} → ${options.toRuleset}).`;
        summaryCounts.methodology_changed++;
      } else if (fromStatus === toStatus) {
        if (toStatus === 'matched') {
          transition = 'UNCHANGED_SUPPORTED';
          transition_label = 'Unchanged (Supported)';
          explanation = 'Consistently evidenced across both analyses.';
          summaryCounts.unchanged_supported++;
        } else if (toStatus === 'partially_supported') {
          transition = 'UNCHANGED_PARTIAL';
          transition_label = 'Unchanged (Partial)';
          explanation = 'Consistently partially evidenced across both analyses.';
          summaryCounts.unchanged_partial++;
        } else {
          transition = 'UNCHANGED_NOT_FOUND';
          transition_label = 'Unchanged (Not Found)';
          explanation = 'Requirement remains unevidenced in both profile snapshots.';
          summaryCounts.unchanged_not_found++;
        }
      } else if (fromStatus === 'not_found' && toStatus === 'matched') {
        transition = 'NEWLY_SUPPORTED';
        transition_label = 'Newly Supported';
        explanation = 'Your approved profile provides stronger evidence for this requirement in the newer analysis.';
        summaryCounts.newly_supported++;
      } else if (fromStatus === 'not_found' && toStatus === 'partially_supported') {
        transition = 'STRENGTHENED';
        transition_label = 'Strengthened';
        explanation = 'Your approved profile now partially evidences this requirement.';
        summaryCounts.strengthened++;
      } else if (fromStatus === 'partially_supported' && toStatus === 'matched') {
        transition = 'STRENGTHENED';
        transition_label = 'Strengthened';
        explanation = 'Your approved profile now fully substantiates this requirement.';
        summaryCounts.strengthened++;
      } else if (fromStatus === 'matched' && toStatus === 'partially_supported') {
        transition = 'WEAKENED';
        transition_label = 'Weakened';
        explanation = 'Evidence for this requirement is reduced or less comprehensive in the newer profile snapshot.';
        summaryCounts.weakened++;
      } else if (fromStatus === 'matched' && toStatus === 'not_found') {
        transition = 'NO_LONGER_EVIDENCED';
        transition_label = 'No Longer Evidenced';
        explanation = 'This requirement is no longer evidenced in your newer approved profile snapshot.';
        summaryCounts.no_longer_evidenced++;
      } else if (fromStatus === 'partially_supported' && toStatus === 'not_found') {
        transition = 'WEAKENED';
        transition_label = 'Weakened';
        explanation = 'Partial evidence previously present was not found in the newer profile snapshot.';
        summaryCounts.weakened++;
      } else {
        transition = 'STATUS_CHANGED';
        transition_label = 'Status Changed';
        explanation = 'Requirement status changed between analyses.';
        summaryCounts.other_changes++;
      }

      comparisons.push({
        criterion_id: toItem.id,
        criterion_text: toItem.criterion,
        from_status: fromStatus,
        to_status: toStatus,
        transition,
        transition_label,
        explanation,
        from_evidence: fromItem.candidate_evidence,
        to_evidence: toItem.candidate_evidence
      });
    } else {
      // Present in TO but NOT in FROM
      const transition: CriterionTransitionCategory = 'ADDED_REQUIREMENT';
      const transition_label = options.jobChanged ? 'Added Role Requirement' : 'New Criterion';
      const explanation = options.jobChanged
        ? 'This requirement was introduced in the updated job description.'
        : 'Requirement evaluated in the newer analysis snapshot.';

      summaryCounts.added_requirement++;
      comparisons.push({
        criterion_id: toItem.id,
        criterion_text: toItem.criterion,
        to_status: toItem.status,
        transition,
        transition_label,
        explanation,
        to_evidence: toItem.candidate_evidence
      });
    }
  }

  // Iterate over items that were in FROM but not matched in TO
  for (const fromItem of fromList) {
    if (!matchedFromIds.has(fromItem.id)) {
      const transition: CriterionTransitionCategory = 'REMOVED_REQUIREMENT';
      const transition_label = options.jobChanged ? 'Removed Role Requirement' : 'Prior Criterion';
      const explanation = options.jobChanged
        ? 'This requirement was removed from the updated job description.'
        : 'Requirement evaluated in the earlier analysis snapshot but not in the newer one.';

      summaryCounts.removed_requirement++;
      comparisons.push({
        criterion_id: fromItem.id,
        criterion_text: fromItem.criterion,
        from_status: fromItem.status,
        transition,
        transition_label,
        explanation,
        from_evidence: fromItem.candidate_evidence
      });
    }
  }

  return {
    comparisons,
    summaryCounts
  };
}
