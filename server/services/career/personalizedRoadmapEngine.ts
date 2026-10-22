/**
 * QWERTY Stage 7.5 — Deterministic Personalized Development Roadmap Engine
 * Ruleset: personalized-development-roadmap-v1
 *
 * STRICT GOVERNANCE:
 * - 0 Gemini calls
 * - 0 LLM calls
 * - 0 embeddings
 * - 0 semantic vector search
 * - 0 prompts
 * - 0 generated narrative advice
 * - 0 AI candidate ranking
 * - 0 readiness percentages (no arbitrary 0-100 scores)
 * - 0 hiring probabilities
 *
 * EVIDENCE-SAFE LANGUAGE ONLY:
 * - "EVIDENCE FOUND"
 * - "DEVELOPMENT FOCUS"
 * - "REVIEW NEEDED"
 * NEVER: "Mastered", "Expert", "Qualified", "Unqualified", "Failed",
 *        "Not competent", "Job ready", "Guaranteed gap", "Deficient", "Weak candidate".
 * Absence of evidence is NEVER presented as evidence of absence.
 */

import {
  CareerRoleRoadmapItem,
  PlanClassification,
  PlanPriority,
  EvidenceReference,
  CandidateDevelopmentPlanItem
} from './types.js';
import {
  normalizeConcept,
  areConceptsEquivalent,
  SYNONYM_CLUSTERS
} from '../matching/conceptRegistry.js';

export const PERSONALIZED_ROADMAP_RULESET_VERSION = 'personalized-development-roadmap-v1';

export interface CandidateEvidenceSources {
  profile?: {
    professional_headline?: string | null;
    professional_summary?: string | null;
    years_experience?: number | null;
  } | null;
  cvVersion?: {
    id?: string;
    original_filename?: string;
    uploaded_at?: string;
  } | null;
  cvParsedData?: {
    skills?: (string | { name?: string; skill?: string; title?: string })[];
    technical_skills?: string[];
    soft_skills?: string[];
    tools?: string[];
    experience?: Array<{
      title?: string;
      role?: string;
      company?: string;
      description?: string;
      responsibilities?: string[];
      achievements?: string[];
      skills?: string[];
    }>;
    education?: Array<{
      degree?: string;
      institution?: string;
      field_of_study?: string;
    }>;
    certifications?: Array<{
      name?: string;
      title?: string;
      issuer?: string;
    }>;
    personal?: {
      full_name?: string;
    };
    professional?: {
      headline?: string;
      summary?: string;
      skills?: string[];
    };
  } | null;
}

export interface SkillMatchResult {
  roadmap_item_id: string;
  classification: PlanClassification;
  priority: PlanPriority;
  evidence_refs: EvidenceReference[];
  display_order: number;
}

/**
 * Deterministically extracts all searchable candidate evidence tokens and phrases.
 */
function extractStructuredCandidateSkills(evidence: CandidateEvidenceSources): { text: string; source: EvidenceReference['source'] }[] {
  const result: { text: string; source: EvidenceReference['source'] }[] = [];
  const parsed = evidence.cvParsedData;

  if (!parsed) return result;

  // 1. Root skills
  const addSkillList = (list: any[] | undefined, source: EvidenceReference['source']) => {
    if (!Array.isArray(list)) return;
    for (const item of list) {
      if (typeof item === 'string' && item.trim()) {
        result.push({ text: item.trim(), source });
      } else if (item && typeof item === 'object') {
        const val = item.name || item.skill || item.title;
        if (typeof val === 'string' && val.trim()) {
          result.push({ text: val.trim(), source });
        }
      }
    }
  };

  addSkillList(parsed.skills, 'cv_skills');
  addSkillList(parsed.technical_skills, 'cv_skills');
  addSkillList(parsed.soft_skills, 'cv_skills');
  addSkillList(parsed.tools, 'cv_skills');
  if (parsed.professional?.skills) {
    addSkillList(parsed.professional.skills, 'cv_skills');
  }

  // 2. Certifications
  if (Array.isArray(parsed.certifications)) {
    for (const cert of parsed.certifications) {
      const name = cert.name || cert.title;
      if (typeof name === 'string' && name.trim()) {
        result.push({ text: name.trim(), source: 'cv_certification' });
      }
    }
  }

  // 3. Education
  if (Array.isArray(parsed.education)) {
    for (const edu of parsed.education) {
      const field = edu.field_of_study || edu.degree;
      if (typeof field === 'string' && field.trim()) {
        result.push({ text: field.trim(), source: 'cv_education' });
      }
    }
  }

  return result;
}

/**
 * Checks whether text contains explicit evidence for a target roadmap skill.
 */
function testExplicitMatch(
  roadmapSkillNorm: string,
  candidateTextNorm: string
): boolean {
  if (!roadmapSkillNorm || !candidateTextNorm) return false;

  // Exact normalized equality
  if (candidateTextNorm === roadmapSkillNorm) return true;

  // Substring boundary matching for exact tokens (roadmap skill in candidate text)
  const escapedRoadmap = roadmapSkillNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const boundaryRoadmap = new RegExp(`(?:^|\\s)${escapedRoadmap}(?:\\s|$)`, 'i');
  if (boundaryRoadmap.test(candidateTextNorm)) return true;

  // Substring boundary matching (candidate skill token in roadmap skill, min 3 chars)
  if (candidateTextNorm.length >= 3) {
    const escapedCand = candidateTextNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const boundaryCand = new RegExp(`(?:^|\\s)${escapedCand}(?:\\s|$)`, 'i');
    if (boundaryCand.test(roadmapSkillNorm)) return true;
  }

  // Concept registry synonym equivalence check
  if (areConceptsEquivalent(roadmapSkillNorm, candidateTextNorm)) {
    return true;
  }

  return false;
}

/**
 * Deterministically classifies a single roadmap item against candidate evidence.
 */
export function classifyRoadmapItem(
  item: CareerRoleRoadmapItem,
  evidence: CandidateEvidenceSources
): {
  classification: PlanClassification;
  priority: PlanPriority;
  evidence_refs: EvidenceReference[];
} {
  const normSkill = normalizeConcept(item.skill_name);
  const evidenceRefs: EvidenceReference[] = [];

  // 1. Check structured candidate skills & certifications
  const structuredSkills = extractStructuredCandidateSkills(evidence);
  for (const skill of structuredSkills) {
    const normCand = normalizeConcept(skill.text);
    if (testExplicitMatch(normSkill, normCand)) {
      evidenceRefs.push({
        source: skill.source,
        snippet: `Explicit skill evidence in candidate CV: "${skill.text}"`,
        matched_text: skill.text,
        confidence: 'explicit'
      });
      break;
    }
  }

  // 2. Check candidate employment experience descriptions & highlights
  if (evidence.cvParsedData?.experience && Array.isArray(evidence.cvParsedData.experience)) {
    for (const exp of evidence.cvParsedData.experience) {
      const roleTitle = exp.title || exp.role || '';
      const company = exp.company || '';
      const desc = exp.description || '';
      const expSkills = exp.skills || [];
      const highlights = [...(exp.responsibilities || []), ...(exp.achievements || [])];

      // Check role title
      if (roleTitle && testExplicitMatch(normSkill, normalizeConcept(roleTitle))) {
        evidenceRefs.push({
          source: 'cv_experience',
          snippet: `Experience title at ${company || 'Previous Role'}: "${roleTitle}"`,
          matched_text: roleTitle,
          confidence: 'explicit'
        });
      }

      // Check explicit skills tagged on experience
      for (const s of expSkills) {
        if (testExplicitMatch(normSkill, normalizeConcept(s))) {
          evidenceRefs.push({
            source: 'cv_experience',
            snippet: `Experience skill at ${company || 'Previous Role'}: "${s}"`,
            matched_text: s,
            confidence: 'explicit'
          });
          break;
        }
      }

      // Check description / highlights if no evidence found yet
      if (evidenceRefs.length === 0) {
        const fullExpText = `${desc} ${highlights.join(' ')}`;
        const normExpText = normalizeConcept(fullExpText);
        if (normSkill.length >= 3 && testExplicitMatch(normSkill, normExpText)) {
          evidenceRefs.push({
            source: 'cv_experience',
            snippet: `Demonstrated experience at ${company || 'Previous Role'}: mentioned "${item.skill_name}"`,
            matched_text: item.skill_name,
            confidence: 'explicit'
          });
        }
      }

      if (evidenceRefs.length >= 3) break;
    }
  }

  // 3. Check candidate profile summary & headline
  const profileHeadline = evidence.profile?.professional_headline || evidence.cvParsedData?.professional?.headline;
  const profileSummary = evidence.profile?.professional_summary || evidence.cvParsedData?.professional?.summary;

  if (profileHeadline && testExplicitMatch(normSkill, normalizeConcept(profileHeadline))) {
    evidenceRefs.push({
      source: 'profile_headline',
      snippet: `Headline: "${profileHeadline}"`,
      matched_text: item.skill_name,
      confidence: 'explicit'
    });
  }

  if (profileSummary && evidenceRefs.length === 0) {
    const normSummary = normalizeConcept(profileSummary);
    if (normSkill.length >= 3 && testExplicitMatch(normSkill, normSummary)) {
      evidenceRefs.push({
        source: 'profile_summary',
        snippet: `Profile Summary mentions related practice: "${item.skill_name}"`,
        matched_text: item.skill_name,
        confidence: 'partial'
      });
    }
  }

  // =========================================================================
  // Deterministic Classification Resolution
  // =========================================================================
  let classification: PlanClassification;

  const hasExplicit = evidenceRefs.some(ref => ref.confidence === 'explicit');
  const hasPartial = evidenceRefs.some(ref => ref.confidence === 'partial');

  if (hasExplicit) {
    classification = 'evidence_found';
  } else if (hasPartial) {
    classification = 'review_needed';
  } else {
    classification = 'development_focus';
  }

  // =========================================================================
  // Deterministic Priority Band Resolution
  // NOW, NEXT, LATER, MAINTAIN
  // - foundation/core development_focus -> NOW where appropriate
  // - later core/review_needed -> NEXT
  // - advanced development_focus -> LATER
  // - evidence_found -> MAINTAIN
  // =========================================================================
  let priority: PlanPriority;

  if (classification === 'evidence_found') {
    priority = 'maintain';
  } else if (classification === 'review_needed') {
    priority = 'next';
  } else {
    // development_focus
    if (item.stage === 'foundation') {
      priority = 'now';
    } else if (item.stage === 'core') {
      // Early core items (display_order <= 2) are NOW, later core items are NEXT
      priority = item.display_order <= 2 ? 'now' : 'next';
    } else {
      // advanced
      priority = 'later';
    }
  }

  return {
    classification,
    priority,
    evidence_refs: evidenceRefs
  };
}

/**
 * Deterministic comparison engine for an entire role roadmap.
 * Sorts items deterministically preserving priority bands and Stage 7.2 display_order.
 */
export function generatePersonalizedDevelopmentPlan(
  roadmapItems: CareerRoleRoadmapItem[],
  evidence: CandidateEvidenceSources
): Omit<CandidateDevelopmentPlanItem, 'id' | 'plan_id' | 'created_at' | 'updated_at'>[] {
  const evaluated = roadmapItems.map(item => {
    const outcome = classifyRoadmapItem(item, evidence);
    return {
      roadmap_item_id: item.id,
      classification: outcome.classification,
      priority: outcome.priority,
      evidence_refs: outcome.evidence_refs,
      skill_name: item.skill_name,
      stage: item.stage,
      skill_category: item.skill_category,
      description: item.description,
      why_it_matters: item.why_it_matters,
      competency_outcome: item.competency_outcome,
      evidence_examples: item.evidence_examples,
      original_display_order: item.display_order,
      resources: item.resources,
    };
  });

  // Stage weight for deterministic band sorting
  const stageWeight: Record<string, number> = {
    foundation: 1,
    core: 2,
    advanced: 3
  };

  // Sort within priority bands preserving: foundation -> core -> advanced -> original display_order
  evaluated.sort((a, b) => {
    const stageA = stageWeight[a.stage || 'foundation'] || 99;
    const stageB = stageWeight[b.stage || 'foundation'] || 99;
    if (stageA !== stageB) return stageA - stageB;
    if (a.original_display_order !== b.original_display_order) {
      return a.original_display_order - b.original_display_order;
    }
    return (a.skill_name || '').localeCompare(b.skill_name || '');
  });

  return evaluated.map((item, index) => ({
    roadmap_item_id: item.roadmap_item_id,
    classification: item.classification,
    priority: item.priority,
    evidence_refs: item.evidence_refs,
    candidate_notes: null,
    display_order: index + 1,
    skill_name: item.skill_name,
    stage: item.stage,
    skill_category: item.skill_category,
    description: item.description,
    why_it_matters: item.why_it_matters,
    competency_outcome: item.competency_outcome,
    evidence_examples: item.evidence_examples,
    resources: item.resources,
  }));
}
