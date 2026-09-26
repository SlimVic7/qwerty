/**
 * QWERTY Stage 5.2 — High-Risk Claim & Evidence Validator
 * Deterministically validates generated suggestions against candidate approved evidence.
 */

import { CandidateEvidenceCard, TailoringSuggestion } from './types.js';
import { areConceptsEquivalent, normalizeConcept } from '../matching/conceptRegistry.js';
import { normalizeText, hasWord } from '../matching/jobAlignment.js';

// Seniority elevation patterns
const LEADERSHIP_KEYWORDS = [
  'led', 'leading', 'lead',
  'directed', 'directing', 'direct',
  'headed', 'heading', 'head',
  'managed', 'managing', 'management of',
  'oversaw', 'overseeing',
  'spearheaded', 'spearheading',
  'championed', 'championing'
];

const SUBORDINATE_EVIDENCE_KEYWORDS = [
  'supported', 'supporting', 'support',
  'assisted', 'assisting', 'assist',
  'participated', 'participating', 'participate',
  'worked alongside', 'worked with',
  'contributed', 'contributing', 'contribute',
  'helped', 'helping',
  'involved in'
];

// Proficiency elevation patterns
const HIGH_PROFICIENCY_KEYWORDS = [
  'expert', 'expertise', 'master', 'mastery',
  'specialist', 'specializing in',
  'lead auditor', 'chief architect',
  'authority on', 'authority in'
];

const LOW_PROFICIENCY_EVIDENCE_KEYWORDS = [
  'familiar with', 'familiarity with',
  'knowledge of', 'basic knowledge',
  'learning', 'studying',
  'exposure to', 'exposed to',
  'worked alongside',
  'foundational understanding'
];

// High-risk named certifications
const HIGH_RISK_CERTIFICATIONS = [
  'cisa', 'cism', 'cissp', 'ccna', 'ccnp', 'ccie', 'ceh', 'cpa', 'acca', 
  'cfa', 'pmp', 'prince2', 'comptia', 'itil', 'crisc', 'cia', 'aws certified', 
  'azure certified', 'gcp certified', 'oscp'
];

// High-risk named technologies / frameworks
const HIGH_RISK_TECHNOLOGIES = [
  'splunk', 'fortinet', 'kubernetes', 'docker', 'terraform', 'aws', 'azure', 
  'gcp', 'salesforce', 'sap', 'ansible', 'jenkins', 'cisco', 'palo alto', 
  'crowdstrike', 'snowflake', 'databricks', 'kafka', 'hadoop', 'react', 
  'angular', 'vue', 'django', 'spring boot', 'graphql'
];

export interface ValidationResult {
  isValid: boolean;
  status: 'valid' | 'blocked';
  errorCode?: string;
  reason?: string;
  issues: string[];
}

/**
 * Extracts numeric tokens and metric expressions from text.
 */
export function extractNumbersAndMetrics(text: string): string[] {
  if (!text) return [];
  // Match percentages, currency ($, ₦, £, €), counts, durations
  const regex = /(?:[₦$€£]\s*\d+(?:,\d+)*(?:\.\d+)?|\b\d+(?:\.\d+)?%|\b\d+\s*(?:years?|months?|branches|people|team\s*members|projects|audits|staff)\b|\b\d+\b)/gi;
  const matches = text.match(regex) || [];
  return Array.from(new Set(matches.map(m => m.trim().toLowerCase())));
}

/**
 * Checks if a specific number or metric exists in source evidence.
 */
function isNumberEvidenced(metric: string, sourceTexts: string[]): boolean {
  const normMetric = metric.replace(/[^0-9]/g, '');
  if (!normMetric) return true; // not a pure numeric token

  for (const src of sourceTexts) {
    const srcDigits: string[] = src.match(/\d+/g) || [];
    if (srcDigits.includes(normMetric)) {
      return true;
    }
  }
  return false;
}

/**
 * Deterministically validates a suggestion against the candidate's approved evidence manifest.
 */
export function validateSuggestion(
  suggestion: Pick<TailoringSuggestion, 'section' | 'suggested_text' | 'original_text' | 'source_refs'>,
  manifest: CandidateEvidenceCard[]
): ValidationResult {
  const issues: string[] = [];

  // 1. Source References Presence & Existence
  if (!suggestion.source_refs || !Array.isArray(suggestion.source_refs) || suggestion.source_refs.length === 0) {
    return {
      isValid: false,
      status: 'blocked',
      errorCode: 'NO_EVIDENCE_SOURCE_REFS',
      reason: 'Suggestion does not cite any candidate evidence sources.',
      issues: ['No source_refs provided in suggestion.']
    };
  }

  // Validate that all cited source_refs exist in manifest
  const manifestMap = new Map<string, CandidateEvidenceCard>();
  for (const card of manifest) {
    manifestMap.set(card.evidence_id, card);
  }

  const citedCards: CandidateEvidenceCard[] = [];
  for (const ref of suggestion.source_refs) {
    const card = manifestMap.get(ref);
    if (!card) {
      issues.push(`Referenced evidence_id "${ref}" does not exist in approved profile manifest.`);
    } else {
      citedCards.push(card);
    }
  }

  if (citedCards.length === 0) {
    return {
      isValid: false,
      status: 'blocked',
      errorCode: 'INVALID_SOURCE_REFS',
      reason: 'None of the cited evidence sources exist in your approved profile.',
      issues
    };
  }

  const suggestedText = suggestion.suggested_text || '';
  const normSuggested = normalizeText(suggestedText);
  const citedTexts = citedCards.map(c => c.text);
  const allManifestTexts = manifest.map(c => c.text);
  const citedCombined = citedTexts.join(' ');
  const normCitedCombined = normalizeText(citedCombined);

  // 1b. Section-Aware Evidence Compatibility & Experience Anchor (Stage 5.2 Mandatory Constraint)
  if (suggestion.section === 'experience') {
    // 1b-1: Must cite at least one approved experience evidence card
    const citedExpCards = citedCards.filter(c => c.source_type === 'experience');
    if (citedExpCards.length === 0) {
      issues.push('Experience suggestion must cite at least one approved experience evidence card. Standalone skill, certification, or education cards cannot manufacture experience claims.');
    }

    // 1b-2: Original text check: Must not convert a standalone skill into an experience bullet
    const allSkillCards = manifest.filter(c => c.source_type === 'skills');
    const allExpCards = manifest.filter(c => c.source_type === 'experience');
    const origTrimmed = (suggestion.original_text || '').trim();
    const origLower = origTrimmed.toLowerCase();

    const matchesSkill = allSkillCards.some(sc => sc.text.trim().toLowerCase() === origLower);
    const matchesExp = allExpCards.some(ec => ec.text.trim().toLowerCase() === origLower);

    if (matchesSkill && !matchesExp) {
      issues.push(`Original text "${origTrimmed}" is from the Skills section and cannot be converted into an experience bullet.`);
    }

    // 1b-3: Same-role provenance: All cited experience cards must originate from the same employer / experience record
    if (citedExpCards.length > 1) {
      const citedEmployers = Array.from(new Set(citedExpCards.map(c => c.employer).filter(Boolean) as string[]));
      const citedIndices = Array.from(new Set(citedExpCards.map(c => c.metadata?.experience_index).filter(idx => idx !== undefined)));
      if (citedEmployers.length > 1 || citedIndices.length > 1) {
        issues.push(`Cross-role provenance violation: Experience suggestion conflates evidence from multiple different employment records (${citedEmployers.join(', ')}).`);
      }
    }

    // 1b-4: Provenance transfer check: Evidence from Employer A cannot be transferred into Employer B bullet
    if (citedExpCards.length > 0) {
      const primaryExpCard = citedExpCards[0];
      const primaryEmployer = primaryExpCard.employer;
      if (primaryEmployer) {
        const matchingExpCards = allExpCards.filter(ec => ec.text.trim().toLowerCase() === origLower);
        for (const ec of matchingExpCards) {
          if (ec.employer && ec.employer.toLowerCase() !== primaryEmployer.toLowerCase()) {
            issues.push(`Cross-employer provenance transfer violation: Cannot transfer evidence from "${primaryEmployer}" into bullet belonging to "${ec.employer}".`);
          }
        }
      }
    }
  } else if (suggestion.section === 'skills') {
    // Skills must be grounded primarily in approved skill cards or relevant certifications
    const hasValidSkillBasis = citedCards.some(c => c.source_type === 'skills' || c.source_type === 'certifications');
    if (!hasValidSkillBasis) {
      issues.push('Skills suggestion must cite approved skill cards or relevant certifications.');
    }
  }

  // 2. Numeric / Metric Claim Protection (Requirement 12)
  const suggestedNumbers = extractNumbersAndMetrics(suggestedText);
  for (const numToken of suggestedNumbers) {
    if (!isNumberEvidenced(numToken, citedTexts)) {
      issues.push(`Numeric or quantitative claim "${numToken}" is not evidenced in cited source cards.`);
    }
  }

  // Cross-employer conflation check & employer context protection (Requirement 16)
  if (suggestion.section === 'experience') {
    const citedEmployers = Array.from(new Set(citedCards.map(c => c.employer).filter(Boolean) as string[]));
    if (citedEmployers.length > 1) {
      issues.push(`Cross-employer reference detected: Experience suggestion conflates evidence from multiple different employers (${citedEmployers.join(', ')}).`);
    }

    const manifestEmployers = Array.from(new Set(manifest.map(c => c.employer).filter(Boolean) as string[]));
    for (const emp of manifestEmployers) {
      if (hasWord(normSuggested, normalizeText(emp))) {
        const isCitedEmp = citedEmployers.some(ce => hasWord(normalizeText(ce), normalizeText(emp)));
        if (!isCitedEmp) {
          issues.push(`Employer context mismatch: Suggestion references employer "${emp}" which is not the employer of the cited evidence card.`);
        }
      }
    }
  }

  // 3. Seniority Protection (Requirement 13)
  // If suggested text contains leadership words, check if cited evidence supports leadership
  const usesLeadership = LEADERSHIP_KEYWORDS.some(kw => hasWord(normSuggested, kw));
  if (usesLeadership) {
    const citedHasLeadership = LEADERSHIP_KEYWORDS.some(kw => hasWord(normCitedCombined, kw));
    const citedIsSubordinate = SUBORDINATE_EVIDENCE_KEYWORDS.some(kw => hasWord(normCitedCombined, kw));

    if (!citedHasLeadership && citedIsSubordinate) {
      issues.push('Seniority inflation detected: Elevates supportive/subordinate role to leadership without approved evidence.');
    }
  }

  // 4. Proficiency Protection (Requirement 14)
  // If suggested text claims expertise, check if cited evidence only shows familiarity/knowledge
  const usesHighProficiency = HIGH_PROFICIENCY_KEYWORDS.some(kw => hasWord(normSuggested, kw));
  if (usesHighProficiency) {
    const citedHasExpertise = HIGH_PROFICIENCY_KEYWORDS.some(kw => hasWord(normCitedCombined, kw));
    const citedIsLowProficiency = LOW_PROFICIENCY_EVIDENCE_KEYWORDS.some(kw => hasWord(normCitedCombined, kw));

    if (!citedHasExpertise && citedIsLowProficiency) {
      issues.push('Proficiency inflation detected: Elevates familiarity/exposure to expertise without approved evidence.');
    }
  }

  // 5. High-Risk Certifications Protection
  for (const cert of HIGH_RISK_CERTIFICATIONS) {
    if (hasWord(normSuggested, cert)) {
      const isEvidencedInManifest = allManifestTexts.some(src => {
        const normSrc = normalizeText(src);
        return hasWord(normSrc, cert) || areConceptsEquivalent(cert, normSrc);
      });

      if (!isEvidencedInManifest) {
        issues.push(`Unsupported certification "${cert.toUpperCase()}" introduced without approved profile evidence.`);
      }
    }
  }

  // 6. High-Risk Technology & Tool Protection
  for (const tech of HIGH_RISK_TECHNOLOGIES) {
    if (hasWord(normSuggested, tech)) {
      const isEvidencedInManifest = allManifestTexts.some(src => {
        const normSrc = normalizeText(src);
        return hasWord(normSrc, tech) || areConceptsEquivalent(tech, normSrc);
      });

      if (!isEvidencedInManifest) {
        issues.push(`Unsupported technology/tool "${tech}" introduced without approved profile evidence.`);
      }
    }
  }

  // 7. Formal Job Title Immutability & Anti-Inflation Protection (Stage 5.2 Mandatory Constraint)
  // Stage 5.2 strictly prohibits modifying, expanding, parenthesizing, qualifying, or inflating formal job titles.
  // Approved role titles from candidate's verified record are immutable historical facts.
  const approvedJobTitles = Array.from(new Set(
    manifest
      .map(c => c.job_title?.trim())
      .filter((t): t is string => Boolean(t && t.length > 0))
  ));

  const origTrimmed = (suggestion.original_text || '').trim();
  const suggTrimmed = suggestedText.trim();
  const origLower = origTrimmed.toLowerCase();
  const suggLower = suggTrimmed.toLowerCase();

  for (const approvedTitle of approvedJobTitles) {
    const titleLower = approvedTitle.toLowerCase();
    
    // 7a. Direct modification or replacement of approved job title
    // e.g. original_text is "Information Systems Auditor" or "Information Systems Auditor at Zenith Bank"
    const isTargetingTitle = 
      origLower === titleLower ||
      origLower.startsWith(`${titleLower} at `) ||
      origLower.endsWith(` as ${titleLower}`);

    if (isTargetingTitle && origLower !== suggLower) {
      issues.push(`Modification of formal job title is prohibited: Approved title "${approvedTitle}" cannot be altered to "${suggestedText}".`);
    }

    // 7b. Inflation or qualification of approved job title (e.g. parenthetical additions)
    // e.g. "Information Systems Auditor" -> "Information Systems Auditor (IT Audit & Risk Execution)"
    if (suggLower !== titleLower && suggLower.includes(titleLower)) {
      if (origLower === titleLower || origLower.startsWith(`${titleLower} at `)) {
        issues.push(`Inflation of formal job title is prohibited: Approved title "${approvedTitle}" cannot be altered or qualified to "${suggestedText}".`);
      } else if (suggestion.section === 'experience') {
        if (suggLower.startsWith(titleLower)) {
          const remainder = suggLower.slice(titleLower.length).trim();
          if (remainder.startsWith('(') || remainder.startsWith('-') || remainder.startsWith(':') || remainder.startsWith('/')) {
            issues.push(`Inflation of formal job title is prohibited: Approved title "${approvedTitle}" cannot be qualified with "${remainder}".`);
          }
        }
      }
    }
  }

  // 7c. Direct modification of immutable employment identity/role cards
  const citesRoleCard = citedCards.some(c => 
    c.evidence_id.endsWith('-role') || 
    c.metadata?.immutable || 
    c.metadata?.is_role_title
  );
  if (citesRoleCard && suggestion.section === 'experience') {
    if (origLower !== suggLower && approvedJobTitles.some(t => origLower.includes(t.toLowerCase()))) {
      issues.push(`Formal job titles and employment identity are immutable. Cannot modify "${suggestion.original_text}" to "${suggestedText}".`);
    }
  }

  // 8. Factual Polarity & Meaning Preservation Protection (Stage 5.2 Mandatory Constraint)
  const polarityCheck = detectFactualMeaningReversal(
    suggestedText,
    suggestion.original_text || '',
    citedCards
  );
  if (polarityCheck.hasReversal && polarityCheck.issue) {
    issues.push(polarityCheck.issue);
  }

  if (issues.length > 0) {
    const isPolarityIssue = issues.some(i => 
      i.includes('Factual meaning reversal') || 
      i.includes('reverses approved affirmative') ||
      i.includes('reverses approved negative') ||
      i.includes('disclaims as negative')
    );
    const isTitleIssue = issues.some(i => i.toLowerCase().includes('job title'));
    const isExpEvidenceIssue = issues.some(i => 
      i.includes('Experience suggestion must cite at least one approved experience') ||
      i.includes('cannot be converted into an experience bullet') ||
      i.includes('cannot manufacture experience claims')
    );
    const isCrossRoleIssue = issues.some(i => 
      i.includes('Cross-role provenance') ||
      i.includes('Cross-employer provenance transfer')
    );

    let errorCode = 'UNSUPPORTED_FACTUAL_CLAIM';
    if (isPolarityIssue) {
      errorCode = 'FACTUAL_MEANING_REVERSAL';
    } else if (isTitleIssue) {
      errorCode = 'FORMAL_JOB_TITLE_MODIFICATION_PROHIBITED';
    } else if (isExpEvidenceIssue) {
      errorCode = 'EXPERIENCE_EVIDENCE_REQUIRED';
    } else if (isCrossRoleIssue) {
      errorCode = 'CROSS_ROLE_PROVENANCE_VIOLATION';
    }

    return {
      isValid: false,
      status: 'blocked',
      errorCode,
      reason: issues[0],
      issues
    };
  }

  return {
    isValid: true,
    status: 'valid',
    issues: []
  };
}

export interface FactualPolarityResult {
  hasReversal: boolean;
  issue?: string;
}

/**
 * Deterministically checks for factual polarity and meaning reversal between suggested text and approved profile evidence.
 */
export function detectFactualMeaningReversal(
  suggestedText: string,
  originalText: string,
  citedCards: CandidateEvidenceCard[]
): FactualPolarityResult {
  if (!suggestedText) {
    return { hasReversal: false };
  }

  const normSuggested = normalizeText(suggestedText);
  const normOriginal = normalizeText(originalText || '');
  const citedTexts = citedCards.map(c => c.text);
  const citedCombined = citedTexts.join(' ');
  const normCitedCombined = normalizeText(citedCombined);

  // Helper to extract negation occurrences from a text
  function extractNegations(text: string) {
    const findings: Array<{
      type: 'action' | 'competence' | 'role' | 'topic';
      matched: string;
      verb?: string;
      target?: string;
      tokens: string[];
    }> = [];

    const norm = normalizeText(text);

    // 1. Negated action predicates: e.g. "did not conduct IT audits", "never managed vendor reviews"
    const actionRegex = /\b(?:did\s+not|didn't|do\s+not|don't|does\s+not|doesn't|was\s+not|wasn't|were\s+not|weren't|had\s+not|hadn't|have\s+not|haven't|has\s+not|hasn't|cannot|can't|could\s+not|couldn't|would\s+not|wouldn't|should\s+not|shouldn't|never|not)\s+(?:even\s+|ever\s+|actually\s+|personally\s+|directly\s+)?(conduct(?:ed|ing)?|support(?:ed|ing)?|manage(?:d|ing)?|assist(?:ed|ing)?|participate(?:d|ing)?|review(?:ed|ing)?|perform(?:ed|ing)?|execute(?:d|ing)?|lead(?:ing)?|led|direct(?:ed|ing)?|oversee(?:ing)?|oversaw|handle(?:d|ing)?|audit(?:ed|ing)?|test(?:ed|ing)?|analyze(?:d|ing)?|evaluate(?:d|ing)?|implement(?:ed|ing)?|maintain(?:ed|ing)?|work(?:ed|ing)?)\b(?:\s+([a-z0-9_#+-]+(?:\s+[a-z0-9_#+-]+){0,4}))?/gi;

    let match: RegExpExecArray | null;
    while ((match = actionRegex.exec(norm)) !== null) {
      const verb = (match[1] || '').trim().toLowerCase();
      const rawTarget = (match[2] || '').trim().toLowerCase();
      const stopWords = new Set(['any', 'the', 'a', 'an', 'all', 'such', 'of', 'in', 'for', 'with', 'to', 'at', 'by', 'on', 'or', 'and']);
      const tokens = rawTarget.split(/\s+/).filter(t => t.length > 1 && !stopWords.has(t));
      findings.push({
        type: 'action',
        matched: match[0],
        verb,
        target: rawTarget,
        tokens
      });
    }

    // 2a. Competence & knowledge negations: e.g. "no AWS knowledge", "lacked experience in risk assessment"
    const compRegex = /\b(?:no|zero|without\s+(?:any)?|lacked|lacking|lack\s+of)\s+([a-z0-9_#+-]+(?:\s+[a-z0-9_#+-]+){0,3})\s+(?:knowledge|experience|familiarity|understanding|background|skills?|competence|capability)\b/gi;
    while ((match = compRegex.exec(norm)) !== null) {
      const rawTarget = (match[1] || '').trim().toLowerCase();
      const stopWords = new Set(['any', 'the', 'a', 'an', 'all', 'such', 'of', 'in', 'for', 'with', 'to', 'at', 'by', 'on']);
      const tokens = rawTarget.split(/\s+/).filter(t => t.length > 1 && !stopWords.has(t));
      findings.push({
        type: 'competence',
        matched: match[0],
        target: rawTarget,
        tokens
      });
    }

    // 2b. Competence reversed: e.g. "no knowledge of AWS", "zero experience with IT audits"
    const compRegexRev = /\b(?:no|zero|without\s+(?:any)?|lacked|lacking|lack\s+of)\s+(?:knowledge|experience|familiarity|understanding|background|skills?|competence|capability)\s+(?:of|in|with)\s+([a-z0-9_#+-]+(?:\s+[a-z0-9_#+-]+){0,3})\b/gi;
    while ((match = compRegexRev.exec(norm)) !== null) {
      const rawTarget = (match[1] || '').trim().toLowerCase();
      const stopWords = new Set(['any', 'the', 'a', 'an', 'all', 'such', 'of', 'in', 'for', 'with', 'to', 'at', 'by', 'on']);
      const tokens = rawTarget.split(/\s+/).filter(t => t.length > 1 && !stopWords.has(t));
      findings.push({
        type: 'competence',
        matched: match[0],
        target: rawTarget,
        tokens
      });
    }

    // 3. Role/responsibility disclaimers: e.g. "had no role in IT audits", "not responsible for vendor reviews"
    const roleRegex = /\b(?:had\s+no\s+(?:role|involvement|responsibility|part)|was\s+not\s+(?:involved|responsible)|were\s+not\s+(?:involved|responsible)|not\s+(?:involved\s+in|responsible\s+for))\s*(?:in|for)?\s*([a-z0-9_#+-]+(?:\s+[a-z0-9_#+-]+){0,3})?/gi;
    while ((match = roleRegex.exec(norm)) !== null) {
      const rawTarget = (match[1] || '').trim().toLowerCase();
      const stopWords = new Set(['any', 'the', 'a', 'an', 'all', 'such', 'of', 'in', 'for', 'with', 'to', 'at', 'by', 'on']);
      const tokens = rawTarget.split(/\s+/).filter(t => t.length > 1 && !stopWords.has(t));
      findings.push({
        type: 'role',
        matched: match[0],
        target: rawTarget,
        tokens
      });
    }

    // 4. Topic/activity denial: e.g. "no IT audits", "no risk assessments"
    const topicRegex = /\bno\s+([a-z0-9_#+-]+(?:\s+[a-z0-9_#+-]+){0,2}\s+)?(audits?|assessments?|reviews?|testing|monitoring|inspections?)\b/gi;
    while ((match = topicRegex.exec(norm)) !== null) {
      const modifier = (match[1] || '').trim().toLowerCase();
      const activity = (match[2] || '').trim().toLowerCase();
      const rawTarget = modifier ? `${modifier} ${activity}` : activity;
      const tokens = [activity, ...modifier.split(/\s+/)].filter(t => t.length > 1);
      findings.push({
        type: 'topic',
        matched: match[0],
        target: rawTarget,
        tokens
      });
    }

    return findings;
  }

  const suggNegations = extractNegations(normSuggested);
  const citedNegations = extractNegations(normCitedCombined);
  const origNegations = extractNegations(normOriginal);

  // Direction A: Suggested text introduces a negation of something affirmed in cited evidence or original text
  for (const neg of suggNegations) {
    // 1. If target tokens exist (e.g. "it audits", "risk assessments", "vendor reviews", "aws")
    if (neg.tokens.length > 0) {
      const targetMatchesCited = neg.tokens.some(t => hasWord(normCitedCombined, t) || hasWord(normOriginal, t));
      if (targetMatchesCited) {
        // Verify that cited evidence did NOT itself negate this target
        const citedAlsoNegated = citedNegations.some(cn => 
          cn.tokens.some(ct => neg.tokens.includes(ct))
        );
        if (!citedAlsoNegated) {
          return {
            hasReversal: true,
            issue: `Factual meaning reversal detected: Suggestion negates approved professional activity or competence ("${neg.matched}") which is affirmed in approved profile evidence.`
          };
        }
      }
    }

    // 2. If negated verb alone (e.g. "did not conduct", "did not support", "never managed")
    if (neg.verb) {
      const verbStem = neg.verb.replace(/(?:ed|ing|s)$/, '');
      const citedHasVerb = hasWord(normCitedCombined, neg.verb) || 
                           hasWord(normCitedCombined, verbStem) ||
                           hasWord(normOriginal, neg.verb) ||
                           hasWord(normOriginal, verbStem);
      
      if (citedHasVerb) {
        const citedAlsoNegatedVerb = citedNegations.some(cn => 
          cn.verb && (cn.verb === neg.verb || cn.verb.startsWith(verbStem))
        );
        if (!citedAlsoNegatedVerb) {
          return {
            hasReversal: true,
            issue: `Factual meaning reversal detected: Suggestion negates approved professional action ("${neg.matched}") which is affirmed in approved profile evidence.`
          };
        }
      }
    }
  }

  // Direction B: Cited evidence contains a negative statement, but suggested text turns it affirmative
  for (const citedNeg of citedNegations) {
    if (citedNeg.tokens.length > 0) {
      const suggHasTarget = citedNeg.tokens.some(t => hasWord(normSuggested, t));
      if (suggHasTarget) {
        const suggAlsoNegates = suggNegations.some(sn => 
          sn.tokens.some(st => citedNeg.tokens.includes(st))
        );
        if (!suggAlsoNegates) {
          return {
            hasReversal: true,
            issue: `Factual meaning reversal detected: Suggestion affirms activity ("${citedNeg.target || citedNeg.matched}") which approved profile evidence explicitly disclaims as negative or unperformed.`
          };
        }
      }
    }
    if (citedNeg.verb) {
      const verbStem = citedNeg.verb.replace(/(?:ed|ing|s)$/, '');
      const suggHasVerb = hasWord(normSuggested, citedNeg.verb) || hasWord(normSuggested, verbStem);
      if (suggHasVerb) {
        const suggAlsoNegatesVerb = suggNegations.some(sn => 
          sn.verb && (sn.verb === citedNeg.verb || sn.verb.startsWith(verbStem))
        );
        if (!suggAlsoNegatesVerb) {
          return {
            hasReversal: true,
            issue: `Factual meaning reversal detected: Suggestion affirms action ("${citedNeg.matched}") which approved profile evidence explicitly disclaims as negative or unperformed.`
          };
        }
      }
    }
  }

  return { hasReversal: false };
}
