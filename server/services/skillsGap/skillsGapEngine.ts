/**
 * Deterministic Skills Gap & Development Insights Engine (QWERTY Stage 5.3)
 * 
 * Provides evidence-safe, deterministic skills gap analysis for a candidate
 * against a published job advert using authoritative Stage 5.1 alignment data.
 * 
 * Core Guarantees:
 * - Deterministic: Zero LLM / external AI calls. Zero per-request AI cost.
 * - Evidence-Safe: Never claims candidate "lacks a skill", only that the approved
 *   profile does not currently evidence the requirement.
 * - Non-Mutating: Does NOT recalculate Stage 5.1 score, change criteria status,
 *   or mutate candidate_job_alignments.
 * - Authoritative Sources: Requires latest approved applied CV parse and exact
 *   matching completed alignment (ruleset job-alignment-v1.3).
 */

import { 
  classifyCriterionEvidenceExpectation, 
  CriterionEvidenceExpectation,
  isStructuralHeading 
} from '../matching/criterionClassifier.js';
import { CandidateJobAlignmentRecord } from '../matching/jobAlignmentStore.js';

export const CURRENT_SKILLS_GAP_VERSION = 'skills-gap-v1';
export const SKILLS_GAP_VERSION = CURRENT_SKILLS_GAP_VERSION;

export type SkillsGapStatus = 
  | 'SUPPORTED_STRENGTH'
  | 'PARTIALLY_EVIDENCED'
  | 'NOT_FOUND'
  | 'EXCLUDED';

export type SkillsGapType = CriterionEvidenceExpectation;

export type DevelopmentGuidanceCategory =
  | 'EDUCATION'
  | 'EXPERIENCE_DURATION'
  | 'CERTIFICATION_ONLY'
  | 'CERTIFICATION_OR_EQUIVALENT'
  | 'BEHAVIORAL_OR_EVIDENCE_LIMITED'
  | 'PRACTICAL_EXPERIENCE'
  | 'PROFESSIONAL_ACTION'
  | 'TECHNICAL_SKILL'
  | 'DOMAIN_KNOWLEDGE';

export interface SupportedStrengthItem {
  id: string;
  criterion: string;
  category: string;
  gap_type: SkillsGapType;
  development_guidance_category?: DevelopmentGuidanceCategory;
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
  development_guidance_category?: DevelopmentGuidanceCategory;
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
  development_guidance_category?: DevelopmentGuidanceCategory;
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
  analysis_version: string;
  job_id: string;
  job_title: string;
  company_name: string;
  parse_id: string;
  candidate_parse_id: string;
  alignment_id: string;
  alignment_ruleset: string;
  ruleset_version: string;
  supported_count: number;
  partial_count: number;
  not_evidenced_count: number;
  not_applicable_count: number;
  generated_at: string;
  summary: SkillsGapSummary;
  supported_strengths: SupportedStrengthItem[];
  partially_evidenced: PartiallyEvidencedItem[];
  not_found_gaps: NotFoundGapItem[];
  excluded: ExcludedItem[];
}

/**
 * Returns human-readable label for a criterion evidence expectation / gap type.
 */
export function getGapTypeLabel(type: SkillsGapType): string {
  switch (type) {
    case 'TECHNICAL_SKILL':
      return 'Technical Skill / Tooling';
    case 'DOMAIN_KNOWLEDGE':
      return 'Domain Knowledge & Frameworks';
    case 'EXPERIENCE_DURATION':
      return 'Experience Tenure & Seniority';
    case 'EDUCATION':
      return 'Academic / Degree Qualification';
    case 'CERTIFICATION':
      return 'Professional Credential / Certification';
    case 'PRACTICAL_EXPERIENCE':
      return 'Practical Hands-on Experience';
    case 'PROFESSIONAL_ACTION':
      return 'Professional Execution & Delivery';
    case 'SOFT_SKILL':
      return 'Workplace Competency / Soft Skill';
    case 'STRUCTURAL':
      return 'Structural Heading';
    default:
      return 'Role Requirement';
  }
}

// Controlled generic concept registry for true technical tooling, software, protocols, hardware
const TECHNICAL_TOOL_OR_PLATFORM = [
  /\b(?:tcp\s*\/\s*ip|udp|bgp|ospf|lan\s*\/\s*wan|vpn|firewalls?|routers?|switches|networking|cisco|fortinet)\b/i,
  /\b(?:microsoft\s+office|ms\s+office|excel|word|powerpoint|power\s*bi|tableau)\b/i,
  /\b(?:audit\s+command\s+language|acl|sql|python|javascript|typescript|c\+\+|java|c#)\b/i,
  /\b(?:erp|sap|oracle|salesforce|workday|netsuite)\b/i,
  /\b(?:aws|azure|gcp|cloud|kubernetes|docker|linux|unix)\b/i,
  /\b(?:git|ci\s*\/\s*cd|terraform|ansible)\b/i,
];

// Controlled generic concept registry for behavioral / evidence-limited capabilities
const BEHAVIORAL_CONCEPTS = [
  /\b(?:written\s+and\s+verbal\s+communication|verbal\s+and\s+written\s+communication|communication\s+skills|oral\s+communication|interpersonal\s+communication|presentation\s+skills|presenting\s+(?:audit|findings|matters|results|to\s+stakeholders)|presenting\s+.*?\s+stakeholders)\b/i,
  /\b(?:time\s+management|competing\s+priorities|prioriti[sz]ation|prioriti[sz]e\s+effectively|multitasking)\b/i,
  /\b(?:work(?:ing)?\s+(?:well\s+)?independently|team\s*player|teamwork|cross-functional\s+(?:collaboration|partnering)|interpersonal\s+skills|interpersonal\s+capability)\b/i,
  /\b(?:multiple\s*\/\s*diverse\s+stakeholders|diverse\s+stakeholders|stakeholder\s+collaboration|stakeholder\s+management)\b/i,
  /\b(?:adaptability|flexibility|proactive|solutions-oriented|demonstrate\s+initiative|self-starter|fast-paced\s+environment)\b/i,
  /\b(?:critical[- ]thinking(?:\s+skills)?|analytical\s+and\s+critical[- ]thinking|draw\s+meaningful\s+conclusions)\b/i,
];

/**
 * Stage-5.3-only development guidance categorization.
 * Follows strict decision order:
 * 1. Structural / not applicable (excluded prior)
 * 2. Education
 * 3. Experience duration
 * 4. Certification (checks for explicit 'or equivalent' alternatives)
 * 5. Behavioral / evidence-limited capabilities (safeguarded against true technical tools)
 * 6. Domain knowledge
 * 7. Practical professional experience / action
 * 8. Technical skills
 */
export function determineDevelopmentGuidanceCategory(
  criterionText: string,
  stage51Type: CriterionEvidenceExpectation
): DevelopmentGuidanceCategory {
  const norm = criterionText.trim();

  // 1. Education
  if (
    stage51Type === 'EDUCATION' ||
    /\b(?:bachelor|master|degree|phd|diploma|postgraduate|bsc|msc|mba)\b/i.test(norm)
  ) {
    return 'EDUCATION';
  }

  // 2. Experience duration
  if (
    stage51Type === 'EXPERIENCE_DURATION' ||
    /\b(?:minimum\s+(?:of\s+)?\d+\+?\s*years?|\d+\+?\s*years?(?:\s+of)?\s+experience)\b/i.test(norm)
  ) {
    return 'EXPERIENCE_DURATION';
  }

  // 3. Certification & Certification-or-Equivalent
  const isEquiv = /\b(?:or\s+equivalent|equivalent\s+knowledge|equivalent\s+experience|equivalent\s+qualification|demonstrable\s+equivalent)\b/i.test(norm);
  const isCertKeyword = /\b(?:certificat(?:ion|ed)|credential|ccna|ccnp|cisa|cism|cissp|pmp|itil|comptia|aws\s+certified|azure\s+certified)\b/i.test(norm);
  if (stage51Type === 'CERTIFICATION' || isCertKeyword) {
    if (isEquiv) {
      return 'CERTIFICATION_OR_EQUIVALENT';
    }
    return 'CERTIFICATION_ONLY';
  }

  // 4. Behavioral / Evidence-limited capability
  const isTechTool = TECHNICAL_TOOL_OR_PLATFORM.some(r => r.test(norm));
  if (!isTechTool && (stage51Type === 'SOFT_SKILL' || BEHAVIORAL_CONCEPTS.some(r => r.test(norm)))) {
    return 'BEHAVIORAL_OR_EVIDENCE_LIMITED';
  }

  // 5. Domain knowledge
  if (stage51Type === 'DOMAIN_KNOWLEDGE') {
    return 'DOMAIN_KNOWLEDGE';
  }

  // 6. Practical experience & professional action
  if (stage51Type === 'PRACTICAL_EXPERIENCE') {
    return 'PRACTICAL_EXPERIENCE';
  }
  if (stage51Type === 'PROFESSIONAL_ACTION') {
    return 'PROFESSIONAL_ACTION';
  }

  // 7. Technical skill
  if (stage51Type === 'TECHNICAL_SKILL' || isTechTool) {
    return 'TECHNICAL_SKILL';
  }

  return 'PRACTICAL_EXPERIENCE';
}

/**
 * Deterministic recommendation generator for items not found in approved profile.
 * Strictly adheres to evidence safety and guidance semantics:
 * - Never claims candidate "lacks" capability, only that profile does not evidence it.
 * - CERTIFICATION_OR_EQUIVALENT: preserves both certification and equivalent-knowledge pathways.
 * - CERTIFICATION_ONLY: verify profile if already held; consider pursuing if aligned to career goals.
 * - EDUCATION: must NOT recommend short course/lab as substitute for formal degree.
 * - EXPERIENCE_DURATION: must NOT recommend coursework as satisfying required years.
 * - BEHAVIORAL_OR_EVIDENCE_LIMITED: evidence-strengthening guidance, no labs or coding repos.
 * - PRACTICAL_EXPERIENCE / PROFESSIONAL_ACTION: legitimate exposure, projects, responsibilities, or documentation.
 * - TECHNICAL_SKILL: labs/training/projects where appropriate.
 * - DOMAIN_KNOWLEDGE: structured study and real exposure.
 */
function getNotFoundRecommendations(
  guidanceCategory: DevelopmentGuidanceCategory,
  _criterionText: string
): {
  explanation: string;
  documentation_step: string;
  development_step: string;
  development_action_type: string;
  gap_type_label: string;
} {
  const explanation = 'Your approved profile does not currently evidence this requirement.';
  
  const documentation_step = 'If you have experience or credentials matching this requirement, update your profile workspace and approve a fresh CV version to explicitly document it.';

  switch (guidanceCategory) {
    case 'BEHAVIORAL_OR_EVIDENCE_LIMITED':
      return {
        explanation,
        documentation_step,
        development_step: 'This type of capability may not be reliably demonstrated from CV evidence alone. If you have genuine examples from your work or projects, consider documenting specific situations or outcomes that demonstrate it.',
        development_action_type: 'STRENGTHEN_EVIDENCE',
        gap_type_label: 'Behavioral & Evidence-Limited Capability'
      };

    case 'CERTIFICATION_OR_EQUIVALENT':
      return {
        explanation,
        documentation_step,
        development_step: 'This requirement allows either the named certification or equivalent demonstrable knowledge. If you already have equivalent knowledge, add verified evidence of it to your profile. Otherwise, structured study, hands-on practice, or the certification pathway may help build and demonstrate the capability.',
        development_action_type: 'CERTIFICATION_OR_EQUIVALENT',
        gap_type_label: 'Professional Credential or Equivalent Knowledge'
      };

    case 'CERTIFICATION_ONLY':
      return {
        explanation,
        documentation_step,
        development_step: 'Consider pursuing this certification if it directly aligns with your career goals; review official syllabus, prerequisites, and examination requirements.',
        development_action_type: 'CERTIFICATION_PATHWAY',
        gap_type_label: 'Professional Credential / Certification'
      };

    case 'EDUCATION':
      return {
        explanation,
        documentation_step,
        development_step: 'Formal degree requirements require accredited academic qualification programs; short courses, labs, or bootcamps do not substitute for formal academic degrees.',
        development_action_type: 'ACADEMIC_QUALIFICATION',
        gap_type_label: 'Academic / Degree Qualification'
      };

    case 'EXPERIENCE_DURATION':
      return {
        explanation,
        documentation_step,
        development_step: 'Coursework or certifications cannot substitute for elapsed professional tenure; continue accumulating demonstrated operational experience in qualifying roles.',
        development_action_type: 'EXPERIENCE_TENURE',
        gap_type_label: 'Experience Tenure & Seniority'
      };

    case 'TECHNICAL_SKILL':
      return {
        explanation,
        documentation_step,
        development_step: 'Build practical technical proficiency through targeted hands-on labs, structured training, code repositories, or self-directed project implementations.',
        development_action_type: 'HANDS_ON_TECHNICAL',
        gap_type_label: 'Technical Skill / Tooling'
      };

    case 'DOMAIN_KNOWLEDGE':
      return {
        explanation,
        documentation_step,
        development_step: 'Deepen domain expertise through structured study of industry-standard frameworks, regulatory guidelines, and real operational exposure.',
        development_action_type: 'STRUCTURED_DOMAIN_LEARNING',
        gap_type_label: 'Domain Knowledge & Frameworks'
      };

    case 'PRACTICAL_EXPERIENCE':
      return {
        explanation,
        documentation_step,
        development_step: 'Seek opportunities in your current role, stretch assignments, or collaborative initiatives to gain direct, operational exposure to this workflow.',
        development_action_type: 'OPERATIONAL_EXPOSURE',
        gap_type_label: 'Practical Hands-on Experience'
      };

    case 'PROFESSIONAL_ACTION':
      return {
        explanation,
        documentation_step,
        development_step: 'Volunteer to lead initiatives or take on operational responsibilities that involve this specific professional deliverable.',
        development_action_type: 'PROFESSIONAL_EXECUTION',
        gap_type_label: 'Professional Execution & Delivery'
      };
  }
}

/**
 * Deterministic recommendation generator for partially evidenced requirements.
 */
function getPartiallyEvidencedRecommendations(
  guidanceCategory: DevelopmentGuidanceCategory,
  originalExplanation: string, 
  _criterionText: string
): {
  explanation: string;
  documentation_step: string;
  development_step: string;
  development_action_type: string;
  gap_type_label: string;
} {
  const explanation = originalExplanation || 'This requirement is partially evidenced by your approved profile.';
  
  switch (guidanceCategory) {
    case 'BEHAVIORAL_OR_EVIDENCE_LIMITED':
      return {
        explanation,
        documentation_step: 'Expand your approved CV profile with specific workplace situations, stakeholder interactions, or project outcomes that illustrate this competency in practice.',
        development_step: 'Focus on articulating verifiable situations, tasks, actions, and results (STAR method) to provide clear context for this workplace capability.',
        development_action_type: 'STRENGTHEN_EVIDENCE',
        gap_type_label: 'Behavioral & Evidence-Limited Capability'
      };

    case 'CERTIFICATION_OR_EQUIVALENT':
      return {
        explanation,
        documentation_step: 'Confirm whether you hold the named certification or can substantiate equivalent applied experience; document the details clearly in your approved profile.',
        development_step: 'If pursuing the credential, complete remaining syllabus items or exam registration; if relying on equivalence, deepen documented production evidence.',
        development_action_type: 'CERTIFICATION_OR_EQUIVALENT',
        gap_type_label: 'Professional Credential or Equivalent Knowledge'
      };

    case 'CERTIFICATION_ONLY':
      return {
        explanation,
        documentation_step: 'Confirm whether your existing credential matches the level or specialization requested, and ensure exact certification details and dates are documented in your approved profile.',
        development_step: 'Consider upgrading or advancing your existing credential if higher certification tiers align with your target career direction.',
        development_action_type: 'CERTIFICATION_PATHWAY',
        gap_type_label: 'Professional Credential / Certification'
      };

    case 'EDUCATION':
      return {
        explanation,
        documentation_step: 'Ensure all relevant degrees, majors, and academic concentrations are explicitly documented with institution names in your approved profile.',
        development_step: 'For specialized academic expectations, highlight specific modules, concentrations, or formal postgraduate study; short courses do not substitute for degree requirements.',
        development_action_type: 'ACADEMIC_QUALIFICATION',
        gap_type_label: 'Academic / Degree Qualification'
      };

    case 'EXPERIENCE_DURATION':
      return {
        explanation,
        documentation_step: 'Consolidate and clearly document cumulative tenure across related positions and overlapping technical responsibilities in your approved profile.',
        development_step: 'Continue accumulating on-the-job tenure in qualifying positions; coursework cannot replace elapsed professional experience.',
        development_action_type: 'EXPERIENCE_TENURE',
        gap_type_label: 'Experience Tenure & Seniority'
      };

    case 'TECHNICAL_SKILL':
      return {
        explanation,
        documentation_step: 'Expand the technical detail in your approved profile — add specific versions, libraries, and production implementations to substantiate full proficiency.',
        development_step: 'Advance from basic exposure or related tool familiarity to end-to-end implementation and production deployment.',
        development_action_type: 'HANDS_ON_TECHNICAL',
        gap_type_label: 'Technical Skill / Tooling'
      };

    case 'DOMAIN_KNOWLEDGE':
      return {
        explanation,
        documentation_step: 'Document specific business contexts and industry standards where you applied this domain knowledge in your approved profile.',
        development_step: 'Deepen your practical application of domain standards through specialized case studies and real operational exposure.',
        development_action_type: 'STRUCTURED_DOMAIN_LEARNING',
        gap_type_label: 'Domain Knowledge & Frameworks'
      };

    case 'PRACTICAL_EXPERIENCE':
      return {
        explanation,
        documentation_step: 'Provide concrete scope and measurable outcomes for your contribution to this responsibility in your approved profile.',
        development_step: 'Transition from supporting or contributing on this deliverable to owning and driving it independently.',
        development_action_type: 'OPERATIONAL_EXPOSURE',
        gap_type_label: 'Practical Hands-on Experience'
      };

    case 'PROFESSIONAL_ACTION':
      return {
        explanation,
        documentation_step: 'Highlight specific initiatives, deliverables, and team leadership in your approved profile.',
        development_step: 'Transition from participant to primary driver on this operational deliverable.',
        development_action_type: 'PROFESSIONAL_EXECUTION',
        gap_type_label: 'Professional Execution & Delivery'
      };
  }
}

/**
 * Generates deterministic Skills Gap & Development Insights analysis.
 * Operates purely on authoritative Stage 5.1 alignment data and canonical records.
 */
export function generateSkillsGapAnalysis(
  job: { id: string; title: string; company_name: string; updated_at?: string },
  parseRecord: { id: string; applied_at: string },
  alignment: CandidateJobAlignmentRecord
): SkillsGapAnalysisResult {
  const criteriaBreakdown = Array.isArray(alignment.criteria_breakdown) 
    ? alignment.criteria_breakdown 
    : [];

  const supported_strengths: SupportedStrengthItem[] = [];
  const partially_evidenced: PartiallyEvidencedItem[] = [];
  const not_found_gaps: NotFoundGapItem[] = [];
  const excluded: ExcludedItem[] = [];

  for (const item of criteriaBreakdown) {
    const rawCriterion = item.criterion || item.source_text || item.normalized_value || '';
    const status = item.status || item.match_status || 'not_found';
    const category = item.category || item.type || 'required';
    const explanation = item.explanation || item.reason || '';
    const evidence = item.candidate_evidence || '';
    const source = item.candidate_source || item.source_type;
    const id = item.id || `crit-${Math.random().toString(36).substring(2, 9)}`;

    // 1. Structural / not applicable handling
    if (status === 'not_applicable' || isStructuralHeading(rawCriterion)) {
      excluded.push({
        id,
        criterion: rawCriterion,
        category,
        reason: status === 'not_applicable' 
          ? (explanation || 'Excluded from gap analysis (marked not applicable in role alignment).')
          : 'Structural section heading (non-evaluable).'
      });
      continue;
    }

    // 2. Classify criterion evidence expectation (Preserves Stage 5.1 authoritative classification)
    const gap_type = classifyCriterionEvidenceExpectation(rawCriterion);

    // Stage 5.3: Determine development guidance category using strict decision hierarchy
    const guidance_category = determineDevelopmentGuidanceCategory(rawCriterion, gap_type);

    // 3. Map status deterministically
    if (status === 'matched') {
      supported_strengths.push({
        id,
        criterion: rawCriterion,
        category,
        gap_type,
        development_guidance_category: guidance_category,
        gap_type_label: getGapTypeLabel(gap_type),
        candidate_evidence: evidence || 'Direct evidence substantiated in approved CV profile.',
        candidate_source: source,
        reason: explanation || 'Requirement fully substantiated by approved CV evidence.'
      });
    } else if (status === 'partially_supported') {
      const recs = getPartiallyEvidencedRecommendations(guidance_category, explanation, rawCriterion);
      partially_evidenced.push({
        id,
        criterion: rawCriterion,
        category,
        gap_type,
        development_guidance_category: guidance_category,
        development_action_type: recs.development_action_type,
        gap_type_label: recs.gap_type_label,
        existing_evidence: evidence || undefined,
        candidate_source: source,
        explanation: recs.explanation,
        documentation_step: recs.documentation_step,
        development_step: recs.development_step
      });
    } else {
      // not_found or uncertain
      const recs = getNotFoundRecommendations(guidance_category, rawCriterion);
      not_found_gaps.push({
        id,
        criterion: rawCriterion,
        category,
        gap_type,
        development_guidance_category: guidance_category,
        development_action_type: recs.development_action_type,
        gap_type_label: recs.gap_type_label,
        explanation: recs.explanation,
        documentation_step: recs.documentation_step,
        development_step: recs.development_step
      });
    }
  }

  const evaluable_criteria_count = supported_strengths.length + partially_evidenced.length + not_found_gaps.length;
  const coverage_percentage = evaluable_criteria_count > 0 
    ? Math.round(((supported_strengths.length + partially_evidenced.length * 0.5) / evaluable_criteria_count) * 100)
    : 0;

  const summary: SkillsGapSummary = {
    total_criteria: criteriaBreakdown.length,
    evaluable_criteria_count,
    supported_strengths_count: supported_strengths.length,
    partially_evidenced_count: partially_evidenced.length,
    not_found_count: not_found_gaps.length,
    excluded_count: excluded.length,
    coverage_percentage
  };

  return {
    analysis_version: CURRENT_SKILLS_GAP_VERSION,
    job_id: job.id,
    job_title: job.title,
    company_name: job.company_name,
    parse_id: parseRecord.id,
    candidate_parse_id: parseRecord.id,
    alignment_id: alignment.id,
    alignment_ruleset: alignment.ruleset_version,
    ruleset_version: alignment.ruleset_version,
    supported_count: supported_strengths.length,
    partial_count: partially_evidenced.length,
    not_evidenced_count: not_found_gaps.length,
    not_applicable_count: excluded.length,
    generated_at: new Date().toISOString(),
    summary,
    supported_strengths,
    partially_evidenced,
    not_found_gaps,
    excluded
  };
}
