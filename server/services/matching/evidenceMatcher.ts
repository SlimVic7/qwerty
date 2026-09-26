/**
 * Evidence Matcher & Relevance Ranker (QWERTY Stage 5.1 - Ruleset job-alignment-v1.3)
 * 
 * Features:
 * 1. Multi-candidate evidence gathering and semantic relevance ranking (Requirement 13 & 29).
 * 2. Asymmetric specificity enforcement (Requirement 4 & 5).
 * 3. Controlled concept equivalence & parent-child hierarchy lookups (Requirement 3 & 9).
 * 4. Education & certification specific matching (Requirement 14 & 15).
 * 5. Behavioural traits & heading handling (Requirement 7 & 8).
 * 6. Composite criteria & proficiency qualifiers (Requirement 11 & 12).
 */

import { 
  normalizeConcept, 
  areConceptsEquivalent, 
  satisfiesAsymmetricHierarchy,
  NON_EQUIVALENT_PAIRS
} from './conceptRegistry.js';
import { 
  isStructuralHeading, 
  isNonVerifiableBehaviouralTrait,
  extractProficiencyQualifier,
  hasCandidateNegation,
  classifyEducationRequirement,
  evaluateCandidateEducation,
  classifyCriterionEvidenceExpectation,
  CriterionEvidenceExpectation
} from './criterionClassifier.js';
import type { AlignmentCriterionStatus, AlignmentEvidenceSource } from './jobAlignment.js';

// Technical stop words that must never independently produce partial credit or domain evidence
export const BROAD_TECH_STOPWORDS = new Set([
  'it', 'systems', 'system', 'technology', 'infrastructure',
  'software', 'hardware', 'tools', 'solutions', 'services', 'support',
  'engineer', 'engineering', 'analyst', 'knowledge',
  'experience', 'understanding', 'ability', 'strong', 'proficient', 'proficiency',
  'skills', 'skill', 'work', 'working', 'role', 'candidate', 'demonstrated',
  'minimum', 'required', 'preferred', 'plus', 'familiarity', 'background', 'expertise',
  'and', 'or', 'the', 'a', 'an', 'in', 'on', 'with', 'for', 'to', 'of', 'at', 'by',
  'years', 'year', 'preferred_qualifications', 'certification', 'certifications',
  'certified', 'certificate', 'accreditation', 'accredited'
]);

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function hasWord(normText: string, word: string): boolean {
  if (!normText || !word) return false;
  const regex = new RegExp(`(?:^|\\s)${escapeRegex(word)}(?:\\s|$)`);
  return regex.test(normText);
}

export function matchesWordOrStem(normText: string, word: string): boolean {
  if (!normText || !word) return false;
  if (hasWord(normText, word)) return true;
  if (word.length >= 4) {
    const stem = word.replace(/(?:ing|tion|ment|ed|es|s|y)$/, '');
    if (stem.length >= 4) {
      const regex = new RegExp(`(?:^|\\s)${escapeRegex(stem)}[a-z]*(?:\\s|$)`, 'i');
      return regex.test(normText);
    }
  }
  return false;
}

export interface CandidateEvidenceCandidate {
  source: 'skills' | 'experience' | 'education' | 'certifications' | 'professional';
  title: string;
  evidence: string;
  fullText: string;
  score: number;
  matchType: 'exact' | 'synonym' | 'asymmetric_hierarchy' | 'tokens' | 'none';
  partial: boolean;
  explanation: string;
}

/**
 * Evaluates semantic relevance of a candidate evidence string against a criterion.
 */
function scoreEvidenceRelevance(
  criterionText: string,
  candidateText: string,
  source: 'skills' | 'experience' | 'education' | 'certifications' | 'professional',
  roleTitle: string = ''
): { score: number; matchType: 'exact' | 'synonym' | 'asymmetric_hierarchy' | 'tokens' | 'none'; partial: boolean; explanation: string } {
  const normCrit = normalizeConcept(criterionText);
  const normCand = normalizeConcept(candidateText);
  const normRole = normalizeConcept(roleTitle);

  if (!normCrit || !normCand) {
    return { score: 0, matchType: 'none', partial: false, explanation: 'No text to match' };
  }

  // Check explicit non-equivalent pairs (e.g. AWS vs Azure, CCNA vs CISA)
  for (const [x, y] of NON_EQUIVALENT_PAIRS) {
    if (hasWord(normCrit, x) && !hasWord(normCrit, y) && hasWord(normCand, y) && !hasWord(normCand, x)) {
      return { score: 0, matchType: 'none', partial: false, explanation: `Candidate has ${y} which is not equivalent to ${x}` };
    }
    if (hasWord(normCrit, y) && !hasWord(normCrit, x) && hasWord(normCand, x) && !hasWord(normCand, y)) {
      return { score: 0, matchType: 'none', partial: false, explanation: `Candidate has ${x} which is not equivalent to ${y}` };
    }
  }

  // 1. Direct whole-word phrase match
  if (normCrit.length >= 3 && hasWord(normCand, normCrit)) {
    return {
      score: 100,
      matchType: 'exact',
      partial: false,
      explanation: `Direct evidence found in ${source}: "${candidateText.slice(0, 100)}"`
    };
  }

  // 2. Controlled concept equivalence (synonyms)
  if (areConceptsEquivalent(normCrit, normCand)) {
    return {
      score: 95,
      matchType: 'synonym',
      partial: false,
      explanation: `Controlled equivalent evidence found in ${source}`
    };
  }

  // 3. Asymmetric hierarchy match (candidate specific concept satisfies broader criterion)
  if (satisfiesAsymmetricHierarchy(normCrit, normCand)) {
    return {
      score: 90,
      matchType: 'asymmetric_hierarchy',
      partial: false,
      explanation: `Approved profile demonstrates specific capability satisfying broader requirement: ${candidateText.slice(0, 100)}`
    };
  }

  // 4. Token overlap with strict technical precision & domain weighting
  const critTokens = normCrit.split(' ').filter(w => w.length > 1 && !BROAD_TECH_STOPWORDS.has(w));
  if (critTokens.length === 0) {
    return { score: 0, matchType: 'none', partial: false, explanation: 'No specific tokens' };
  }

  let matchedTokens = 0;
  for (const token of critTokens) {
    if (matchesWordOrStem(normCand, token)) {
      matchedTokens++;
    }
  }

  // Check role domain alignment (e.g. Auditor role matching audit criteria)
  let domainBonus = 0;
  const isAuditCriterion = /\b(?:audit|itgc|controls?|risk|cisa|information systems)\b/i.test(normCrit);
  const isAuditRole = /\b(?:audit|auditor|itgc|cisa|risk)\b/i.test(normRole);
  if (isAuditCriterion && isAuditRole) {
    domainBonus = 15;
  }

  const isNetworkCriterion = /\b(?:network|lan|wan|tcp|ip|cisco|routing|switching|firewall)\b/i.test(normCrit);
  const isNetworkRole = /\b(?:network|networking|cisco|ccna)\b/i.test(normRole);
  if (isNetworkCriterion && isNetworkRole) {
    domainBonus = 15;
  }

  if (matchedTokens === critTokens.length || (critTokens.length >= 3 && matchedTokens >= Math.ceil(critTokens.length * 0.75))) {
    return {
      score: 80 + domainBonus,
      matchType: 'tokens',
      partial: false,
      explanation: `Substantive evidence found in ${source}`
    };
  }

  // Partial match condition: At least 2 tokens, at least 50% match
  if (critTokens.length >= 2 && matchedTokens >= Math.ceil(critTokens.length * 0.5) && matchedTokens >= 1) {
    return {
      score: 40 + domainBonus + matchedTokens * 5,
      matchType: 'tokens',
      partial: true,
      explanation: `Partially supported by evidence in ${source}`
    };
  }

  return { score: 0, matchType: 'none', partial: false, explanation: 'Not found' };
}

/**
 * Searches candidate reviewed CV data for the most semantically relevant evidence for a criterion.
 */
export function findBestCandidateEvidence(
  criterion: string,
  cvData: any
): {
  status: AlignmentCriterionStatus;
  evidence?: string;
  source?: 'skills' | 'experience' | 'education' | 'certifications' | 'professional';
  explanation: string;
} {
  // Check structural heading
  if (isStructuralHeading(criterion)) {
    return {
      status: 'not_applicable',
      explanation: 'Structural section heading excluded from candidate scoring.'
    };
  }

  // Classify criterion evidence expectation
  const expectation = classifyCriterionEvidenceExpectation(criterion);

  // Check education requirements
  const eduInfo = classifyEducationRequirement(criterion);
  if (eduInfo.isEducation) {
    if (Array.isArray(cvData.education) && cvData.education.length > 0) {
      const eduEval = evaluateCandidateEducation(eduInfo, cvData.education);
      if (eduEval.matches) {
        return {
          status: 'matched',
          evidence: eduEval.evidence,
          source: 'education',
          explanation: `Evidence found in approved education: ${eduEval.evidence}`
        };
      }
    }
    // Specific degree required: work experience or certifications cannot substitute
    return {
      status: 'not_found',
      explanation: 'Not found in your approved profile'
    };
  }

  // Check behavioural trait requirements
  const isTrait = isNonVerifiableBehaviouralTrait(criterion);

  const candidatePool: CandidateEvidenceCandidate[] = [];

  // 1. Gather from Certifications
  const certs = Array.isArray(cvData.certifications) ? cvData.certifications : [];
  for (const c of certs) {
    const name = typeof c === 'string' ? c : c?.name || '';
    const issuer = typeof c === 'object' ? c?.issuer || '' : '';
    const fullText = [name, issuer].filter(Boolean).join(' ');
    const res = scoreEvidenceRelevance(criterion, fullText, 'certifications');
    if (res.score > 0) {
      let adjustedScore = res.score;
      let isPartial = res.partial;

      if (expectation === 'CERTIFICATION') {
        // Direct certification requirement: certifications receive top priority
        adjustedScore = res.score + 25;
      } else if (expectation === 'PROFESSIONAL_ACTION' || expectation === 'PRACTICAL_EXPERIENCE') {
        // Certification alone does NOT prove practical execution of action
        // At most contextual / partial support, capped at 30
        adjustedScore = Math.min(res.score, 30);
        isPartial = true;
      } else if (expectation === 'DOMAIN_KNOWLEDGE') {
        // Professional certification covering domain (e.g. CISA for IS audit)
        // Supported, but without extra boost so actual practical experience ranks higher
        adjustedScore = res.score;
      } else if (expectation === 'TECHNICAL_SKILL') {
        // Certifications only count for technical skills if the certification specifically certifies that technology
        const normName = normalizeConcept(name);
        const normCrit = normalizeConcept(criterion);
        const isCertSpecificToTech = normName.includes(normCrit) || areConceptsEquivalent(normName, normCrit);
        if (!isCertSpecificToTech) {
          continue; // E.g. CISA cannot satisfy TCP/IP, Cisco, Fortinet, React
        }
        adjustedScore = res.score + 10;
      }

      candidatePool.push({
        source: 'certifications',
        title: name,
        evidence: name,
        fullText,
        score: adjustedScore,
        matchType: res.matchType,
        partial: isPartial,
        explanation: `Evidence found in approved certifications: "${name}"`
      });
    }
  }

  // 2. Gather from Skills
  const skills = Array.isArray(cvData.skills) ? cvData.skills : [];
  for (const s of skills) {
    const name = typeof s === 'string' ? s : s?.name || '';
    const ev = typeof s === 'object' ? s?.evidence || '' : '';
    const fullText = [name, ev].filter(Boolean).join(' ');
    const res = scoreEvidenceRelevance(criterion, fullText, 'skills');
    if (res.score > 0) {
      // Check negation
      if (hasCandidateNegation(fullText, name)) {
        continue;
      }
      if (expectation === 'CERTIFICATION') {
        // Skill tag cannot substitute for a required certification
        continue;
      }

      let adjustedScore = res.score;
      if (expectation === 'TECHNICAL_SKILL') {
        adjustedScore = res.score + 15;
      } else if (expectation === 'DOMAIN_KNOWLEDGE') {
        adjustedScore = res.score + 10;
      } else if (expectation === 'PROFESSIONAL_ACTION' || expectation === 'PRACTICAL_EXPERIENCE') {
        // Skills list is secondary to direct employment experience
        adjustedScore = Math.min(res.score, 60);
      }

      candidatePool.push({
        source: 'skills',
        title: name,
        evidence: ev || name,
        fullText,
        score: adjustedScore,
        matchType: res.matchType,
        partial: res.partial,
        explanation: `Evidence found in approved skills: "${name}"`
      });
    }
  }

  // 3. Gather from Work Experience
  const experiences = Array.isArray(cvData.experience) ? cvData.experience : [];
  for (const exp of experiences) {
    const title = exp.job_title || exp.role || '';
    const company = exp.company || exp.company_name || 'Organization';
    const desc = exp.description || '';
    const responsibilities = Array.isArray(exp.responsibilities) 
      ? exp.responsibilities.join(' ') 
      : (typeof exp.responsibilities === 'string' ? exp.responsibilities : '');
    const achievements = Array.isArray(exp.achievements) ? exp.achievements.join(' ') : '';
    const fullExpText = [title, desc, responsibilities, achievements].filter(Boolean).join(' ');

    const res = scoreEvidenceRelevance(criterion, fullExpText, 'experience', title);
    if (res.score > 0) {
      // Check negation in experience text
      const normCrit = normalizeConcept(criterion);
      if (hasCandidateNegation(fullExpText, normCrit)) {
        continue;
      }
      if (expectation === 'CERTIFICATION') {
        // Experience cannot substitute for an explicit certification requirement
        continue;
      }

      let adjustedScore = res.score;
      if (expectation === 'PROFESSIONAL_ACTION' || expectation === 'PRACTICAL_EXPERIENCE') {
        // Direct work experience is the PRIMARY and strongest evidence for actions & practical execution
        adjustedScore = res.score + 20;
      } else if (expectation === 'DOMAIN_KNOWLEDGE') {
        // Relevant in-domain employment is primary practical evidence
        adjustedScore = res.score + 15;
      } else if (expectation === 'TECHNICAL_SKILL') {
        adjustedScore = res.score + 10;
      }

      const snippet = desc.length > 140 ? `${desc.slice(0, 137)}...` : desc || title;
      candidatePool.push({
        source: 'experience',
        title,
        evidence: `${title} at ${company}: ${snippet}`,
        fullText: fullExpText,
        score: adjustedScore,
        matchType: res.matchType,
        partial: res.partial,
        explanation: `Evidence found in experience as ${title}`
      });
    }
  }

  // 4. Gather from Education (for non-degree criteria that might match coursework or projects)
  if (expectation !== 'CERTIFICATION') {
    const education = Array.isArray(cvData.education) ? cvData.education : [];
    for (const edu of education) {
      const degree = edu.degree || edu.qualification || '';
      const field = edu.field_of_study || '';
      const school = edu.institution || edu.institution_name || '';
      const fullEduText = [degree, field, school].filter(Boolean).join(' ');
      const res = scoreEvidenceRelevance(criterion, fullEduText, 'education');
      if (res.score > 0) {
        // Capped low for non-education criteria
        const adjustedScore = Math.min(res.score, 30);
        candidatePool.push({
          source: 'education',
          title: degree,
          evidence: `${degree} in ${field || 'relevant field'} (${school})`,
          fullText: fullEduText,
          score: adjustedScore,
          matchType: res.matchType,
          partial: true,
          explanation: `Evidence found in approved education: ${degree}`
        });
      }
    }
  }

  // 5. Gather from Professional Summary
  if (expectation !== 'CERTIFICATION') {
    const professional = cvData.professional || {};
    const summary = [professional.headline, professional.summary].filter(Boolean).join(' ');
    if (summary) {
      const res = scoreEvidenceRelevance(criterion, summary, 'professional');
      if (res.score > 0) {
        candidatePool.push({
          source: 'professional',
          title: 'Professional Summary',
          evidence: summary.length > 140 ? `${summary.slice(0, 137)}...` : summary,
          fullText: summary,
          score: Math.min(res.score, 50),
          matchType: res.matchType,
          partial: res.partial,
          explanation: 'Evidence found in professional summary'
        });
      }
    }
  }

  // Sort candidate evidence candidates by score descending
  candidatePool.sort((a, b) => b.score - a.score);

  const best = candidatePool[0];

  // If no evidence found
  if (!best || best.score === 0) {
    // If it is an unevidenced behavioural personality trait, mark not_applicable rather than penalizing
    if (isTrait) {
      return {
        status: 'not_applicable',
        explanation: 'Behavioural trait not document-verifiable from approved CV records.'
      };
    }

    return {
      status: 'not_found',
      explanation: 'Not found in your approved profile'
    };
  }

  // Check proficiency qualifier
  const { hasQualifier, qualifier } = extractProficiencyQualifier(criterion);
  if (hasQualifier && best.source === 'skills' && !best.fullText.toLowerCase().includes(qualifier!)) {
    // Candidate has base skill in skills list, but not proven advanced proficiency
    return {
      status: 'partially_supported',
      evidence: best.evidence,
      source: best.source,
      explanation: `Approved profile demonstrates relevant skill, but ${qualifier} proficiency was not explicitly substantiated.`
    };
  }

  if (!best.partial && best.score >= 70) {
    return {
      status: 'matched',
      evidence: best.evidence,
      source: best.source,
      explanation: best.explanation
    };
  }

  if (best.partial || best.score >= 40) {
    return {
      status: 'partially_supported',
      evidence: best.evidence,
      source: best.source,
      explanation: `Partially supported: ${best.explanation.toLowerCase()}`
    };
  }

  return {
    status: 'not_found',
    explanation: 'Not found in your approved profile'
  };
}
