/**
 * Deterministic Job Alignment Engine (QWERTY Stage 5.1)
 * 
 * Compares candidate-approved structured CV/profile information against one exact canonical published job.
 * 
 * Principles:
 * - Deterministic, auditable rules (Gemini NEVER calculates or modifies numeric scores).
 * - Evidence-based matching (every match must cite candidate-provided evidence).
 * - Strict separation of "Required" vs "Preferred" criteria.
 * - Experience-duration requirements evaluated exactly once with domain qualification distinction.
 * - Technical matching requires concept-specific evidence (no generic IT/support partial credit).
 * - Conservative responsibility extraction from description when responsibilities field is blank.
 * - Applicability-aware denominator (candidates are never penalized for sections absent from a job advert).
 * - Neutral gap phrasing ("Not found in your approved profile", never "You do not have this skill").
 * - Immune to prompt injection (pure deterministic logic operating on approved structured data).
 */

export type AlignmentCriterionStatus = 
  | 'matched'
  | 'partially_supported'
  | 'not_found'
  | 'not_applicable'
  | 'uncertain';

export type AlignmentCategory = 
  | 'required'
  | 'preferred'
  | 'experience'
  | 'responsibility'
  | 'education';

export type AlignmentEvidenceSource = 
  | 'skills' 
  | 'experience' 
  | 'education' 
  | 'certifications' 
  | 'professional'
  | 'description'
  | string;

export interface AlignmentCriterionResult {
  id: string;
  type: AlignmentCategory;
  normalized_value: string;
  source_text: string;
  match_status: AlignmentCriterionStatus;
  candidate_evidence?: string;
  candidate_source?: 'skills' | 'experience' | 'education' | 'certifications' | 'professional';
  source_type?: AlignmentEvidenceSource;
  reason: string;
  // Backward-compatible field aliases
  criterion: string;
  category: AlignmentCategory;
  status: AlignmentCriterionStatus;
  explanation: string;
}

export interface AlignmentComponentResult {
  id: string;
  label: string;
  score: number;
  max_score: number;
  applicable: boolean;
  status: 'pass' | 'partial' | 'gap' | 'not_applicable';
  matched_count: number;
  total_count: number;
  summary: string;
  reasons: string[];
}

export interface JobAlignmentResult {
  ruleset_version: string;
  status: 'completed' | 'failed';
  error_code?: string;
  score: number | null; // 0 - 100 when completed, null when failed
  max_score: number; // 100
  raw_score: number | null;
  raw_max_score: number | null;
  alignment_band: 'strong' | 'moderate' | 'emerging' | null;
  components: AlignmentComponentResult[];
  criteria: AlignmentCriterionResult[];
  component_results?: AlignmentComponentResult[];
  criteria_breakdown?: AlignmentCriterionResult[];
  candidate_parse_id: string;
  job_id: string;
  job_title: string;
  company_name: string;
  job_updated_at: string;
}

/**
 * Canonical ruleset version identifier for deterministic job alignment.
 * Updated to 'job-alignment-v1.3' following Stage 5.1 evidence compatibility refinement.
 */
export const CURRENT_JOB_ALIGNMENT_RULESET_VERSION = 'job-alignment-v1.3';
export const JOB_ALIGNMENT_RULESET_VERSION = CURRENT_JOB_ALIGNMENT_RULESET_VERSION;

import {
  normalizeConcept,
  areConceptsEquivalent,
  satisfiesAsymmetricHierarchy,
  SYNONYM_CLUSTERS,
  NON_EQUIVALENT_PAIRS,
  CONTROLLED_DOMAIN_KEYWORDS,
  CONCEPT_REGISTRY_VERSION
} from './conceptRegistry.js';

import {
  isStructuralHeading,
  isNonVerifiableBehaviouralTrait,
  extractProficiencyQualifier,
  hasCandidateNegation,
  classifyEducationRequirement,
  evaluateCandidateEducation
} from './criterionClassifier.js';

import {
  findBestCandidateEvidence
} from './evidenceMatcher.js';

export {
  CONCEPT_REGISTRY_VERSION,
  isStructuralHeading,
  isNonVerifiableBehaviouralTrait,
  extractProficiencyQualifier,
  classifyEducationRequirement,
  evaluateCandidateEducation,
  areConceptsEquivalent,
  satisfiesAsymmetricHierarchy
};

// Controlled alias dictionary for technology, security, governance, and audit standards.
// Each key represents a specific distinct concept, and aliases are exact synonyms / alternate spellings.
const ALIAS_MAP: Record<string, string[]> = {
  'aws': ['amazon web services', 'amazon aws'],
  'gcp': ['google cloud', 'google cloud platform'],
  'azure': ['microsoft azure'],
  'k8s': ['kubernetes'],
  'react': ['reactjs', 'react.js'],
  'next': ['nextjs', 'next.js', 'next js'],
  'node': ['nodejs', 'node.js'],
  'ts': ['typescript'],
  'js': ['javascript'],
  'cisa': ['certified information systems auditor'],
  'cism': ['certified information security manager'],
  'cissp': ['certified information systems security professional'],
  'ccna': ['cisco certified network associate'],
  'ccep': ['certified cybersecurity educator professional'],
  'itgc': ['it general controls', 'information technology general controls'],
  'iso 27001': ['iso/iec 27001', 'iso 27001:2022', 'iso 27001:2013', 'isms'],
  'iso 42001': ['iso/iec 42001', 'iso 42001:2023', 'aims', 'artificial intelligence management system'],
  'tcp/ip': ['tcp/ip', 'tcp ip', 'tcp', 'ip networking', 'network protocols', 'tcp/udp', 'ip routing'],
  'cisco': ['cisco systems', 'cisco networking', 'cisco ios', 'cisco routers', 'cisco switches'],
  'fortinet': ['fortigate', 'fortios', 'fortinet firewall', 'fortinet firewalls'],
  'splunk': ['splunk enterprise', 'splunk siem'],
  'lan/wan': ['lan wan', 'local area network', 'wide area network'],
  'vpn': ['virtual private network', 'ipsec vpn', 'ssl vpn'],
  'python': ['python 3', 'python programming'],
  'sql': ['postgresql', 'mysql', 'sqlite', 'structured query language'],
  'postgres': ['postgresql']
};

// Broad generic tech / role terms that must NEVER by themselves produce partial credit or domain evidence
export const BROAD_TECH_STOPWORDS = new Set([
  'it', 'systems', 'system', 'technology', 'audit', 'auditor', 'infrastructure',
  'software', 'hardware', 'tools', 'solutions', 'services', 'support', 'security',
  'engineer', 'engineering', 'analyst', 'management', 'manager', 'knowledge',
  'experience', 'understanding', 'ability', 'strong', 'proficient', 'proficiency',
  'skills', 'skill', 'work', 'working', 'role', 'candidate', 'demonstrated',
  'minimum', 'required', 'preferred', 'plus', 'familiarity', 'background', 'expertise',
  'and', 'or', 'the', 'a', 'an', 'in', 'on', 'with', 'for', 'to', 'of', 'at', 'by',
  'years', 'year', 'preferred_qualifications', 'certification', 'certifications',
  'certified', 'certificate', 'accreditation', 'accredited'
]);

// Controlled list of boilerplate or non-evaluable phrases that should not generate score deductions
const VAGUE_BOILERPLATE_PATTERNS = [
  /other duties as assigned/i,
  /other tasks as assigned/i,
  /other duties as required/i,
  /other responsibilities as assigned/i,
  /perform other duties/i,
  /ad-?hoc duties/i,
  /ad-?hoc tasks/i,
  /various other duties/i,
  /and any other duties/i,
  /other duties/i,
  /and more\b/i,
  /\betc\.?$/i
];

export function isVagueOrBoilerplate(text: string): boolean {
  const trimmed = text.trim();
  return VAGUE_BOILERPLATE_PATTERNS.some(pattern => pattern.test(trimmed));
}

/**
 * Escapes string for RegExp pattern.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalizes text for matching by removing punctuation and extra whitespace.
 */
export function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Checks whole-word presence in normalized text.
 */
export function hasWord(normText: string, word: string): boolean {
  if (!normText || !word) return false;
  const regex = new RegExp(`(?:^|\\s)${escapeRegex(word)}(?:\\s|$)`);
  return regex.test(normText);
}

/**
 * Checks if target criterion matches candidate source text using exact phrase, controlled alias, or multi-concept matching.
 * Generic words (IT, systems, technology, audit, infrastructure) NEVER produce partial match credit.
 */
export function testMatch(criterion: string, candidateText: string): { matches: boolean; partial: boolean } {
  const normCrit = normalizeText(criterion);
  const normSource = normalizeText(candidateText);

  if (!normCrit || !normSource) return { matches: false, partial: false };

  // Check explicit non-equivalent pairs
  for (const [x, y] of NON_EQUIVALENT_PAIRS) {
    if (hasWord(normCrit, x) && !hasWord(normCrit, y) && hasWord(normSource, y) && !hasWord(normSource, x)) {
      return { matches: false, partial: false };
    }
    if (hasWord(normCrit, y) && !hasWord(normCrit, x) && hasWord(normSource, x) && !hasWord(normSource, y)) {
      return { matches: false, partial: false };
    }
  }

  // 1. Direct whole-word phrase match
  if (normCrit.length >= 3 && hasWord(normSource, normCrit)) {
    return { matches: true, partial: false };
  }

  // 2. Controlled concept equivalence (synonyms)
  if (areConceptsEquivalent(normCrit, normSource)) {
    return { matches: true, partial: false };
  }

  // 3. Asymmetric hierarchy match (candidate specific concept satisfies broader criterion)
  if (satisfiesAsymmetricHierarchy(normCrit, normSource)) {
    return { matches: true, partial: false };
  }

  // 4. Specific alias dictionary check with whole-word matching
  for (const [canonical, aliases] of Object.entries(ALIAS_MAP)) {
    const isCritAlias = hasWord(normCrit, canonical) || aliases.some(a => hasWord(normCrit, a));
    const isSourceAlias = hasWord(normSource, canonical) || aliases.some(a => hasWord(normSource, a));

    if (isCritAlias && isSourceAlias) {
      return { matches: true, partial: false };
    }
  }

  // 5. Multi-concept / compound criteria check (e.g. "Fortinet/Cisco experience", "CCNA or equivalent knowledge")
  // Separators: '/', ' or ', ' and ', ','
  const parts = criterion.split(/[\/,]|\bor\b|\band\b/i).map(p => p.trim()).filter(p => p.length >= 2);
  if (parts.length > 1) {
    let matchedParts = 0;
    for (const part of parts) {
      const partRes = testMatch(part, candidateText);
      if (partRes.matches) {
        matchedParts++;
      }
    }
    if (matchedParts === parts.length) {
      return { matches: true, partial: false };
    }
    if (matchedParts > 0) {
      return { matches: false, partial: true };
    }
  }

  // 6. Token overlap with strict whole-word boundaries and exclusion of broad stop words
  const critTokens = normCrit.split(' ').filter(w => w.length > 1 && !BROAD_TECH_STOPWORDS.has(w));
  if (critTokens.length === 0) return { matches: false, partial: false };

  let tokenMatches = 0;
  for (const token of critTokens) {
    if (hasWord(normSource, token)) {
      tokenMatches++;
    }
  }

  if (tokenMatches === critTokens.length) {
    return { matches: true, partial: false };
  }

  // Partial match: only if criterion has multiple significant specific tokens and at least half match
  if (critTokens.length >= 2 && tokenMatches >= Math.ceil(critTokens.length * 0.5) && tokenMatches >= 1) {
    return { matches: false, partial: true };
  }

  return { matches: false, partial: false };
}

/**
 * Splits raw text (e.g. requirements or preferred qualifications) into discrete line items.
 */
export function extractDiscreteCriteria(rawText: string | null | undefined): string[] {
  if (!rawText) return [];

  const lines = rawText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  const results: string[] = [];

  for (const line of lines) {
    // Strip bullet markers (•, -, *, numbers like 1., etc.)
    const cleaned = line
      .replace(/^[\s•\-\*\u2022\u2023\u25E6\u2043\u2219]+\s*/, '')
      .replace(/^\d+[\.\)]\s*/, '')
      .trim();

    // Ignore section header labels
    if (/^(requirements|responsibilities|qualifications|preferred qualifications|key responsibilities|must have|what we look for):?$/i.test(cleaned)) {
      continue;
    }

    if (cleaned.length >= 3) {
      results.push(cleaned);
    }
  }

  return results;
}

/**
 * Information extracted from an experience requirement clause.
 */
export interface ExperienceRequirementInfo {
  isExperience: boolean;
  minYears: number;
  domain: string | null;
  isDomainQualified: boolean;
  rawText: string;
}

const GENERIC_EXPERIENCE_DOMAINS = new Set([
  'professional', 'work', 'working', 'relevant', 'general', 'total', 'industry',
  'practical', 'overall', 'hands on', 'handson', 'job', 'career', 'corporate',
  'related', 'applicable'
]);

/**
 * Classifies whether a requirement clause specifies experience duration,
 * and extracts required years and domain qualification.
 */
export function classifyExperienceRequirement(rawText: string): ExperienceRequirementInfo {
  const norm = normalizeText(rawText);

  // Pattern A: "Experience in/with <domain> (X years)" or "Experience with <domain> (X+ years)"
  const pA = rawText.match(/(?:experience\s+(?:in|with))\s+([a-z0-9\s\/\-\.\+]+?)\s*\(?\s*(\d+)\+?\s*(?:years?|yrs?)/i);
  if (pA) {
    const minYears = parseInt(pA[2], 10);
    const rawDomain = pA[1].trim();
    const cleanDomain = cleanDomainString(rawDomain);
    const isGeneric = isDomainGeneric(cleanDomain);
    return {
      isExperience: true,
      minYears,
      domain: isGeneric ? null : cleanDomain,
      isDomainQualified: !isGeneric,
      rawText
    };
  }

  // Pattern B: "Minimum X years <domain> experience" / "X+ years <domain> experience" / "At least X years <domain> experience"
  const pB = rawText.match(/(?:minimum|at least|over|\b)\s*(\d+)(?:\+|\s*-\s*\d+)?\s*(?:years?|yrs?)(?:\s+(?:of|in|with))?\s*(.*?)(?:\s+(?:experience|background))?$/i);
  if (pB && (norm.includes('experience') || norm.includes('background'))) {
    const minYears = parseInt(pB[1], 10);
    const rawDomain = pB[2] ? pB[2].trim() : null;
    const cleanDomain = cleanDomainString(rawDomain);
    const isGeneric = isDomainGeneric(cleanDomain);
    return {
      isExperience: true,
      minYears,
      domain: isGeneric ? null : cleanDomain,
      isDomainQualified: !isGeneric,
      rawText
    };
  }

  // Pattern C: "X+ years of <domain> experience"
  const pC = rawText.match(/(\d+)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?([a-z0-9\s\/\-\.\+]+?\s+(?:experience|background))/i);
  if (pC) {
    const minYears = parseInt(pC[1], 10);
    const rawDomain = pC[2].trim();
    const cleanDomain = cleanDomainString(rawDomain);
    const isGeneric = isDomainGeneric(cleanDomain);
    return {
      isExperience: true,
      minYears,
      domain: isGeneric ? null : cleanDomain,
      isDomainQualified: !isGeneric,
      rawText
    };
  }

  return {
    isExperience: false,
    minYears: 0,
    domain: null,
    isDomainQualified: false,
    rawText
  };
}

function cleanDomainString(rawDomain: string | null | undefined): string | null {
  if (!rawDomain) return null;
  let cleaned = rawDomain.toLowerCase()
    .replace(/^(?:of|in|with|demonstrated|proven)\s+/, '')
    .replace(/\s+(?:experience|background)$/, '')
    .trim();
  cleaned = cleaned.replace(/[^a-z0-9\s\/\-\.]/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned || null;
}

function isDomainGeneric(cleanDomain: string | null): boolean {
  if (!cleanDomain) return true;
  const words = cleanDomain.split(' ').filter(w => w.length > 1);
  if (words.length === 0) return true;
  return words.every(w => GENERIC_EXPERIENCE_DOMAINS.has(w));
}

/**
 * Searches candidate reviewed CV data for evidence matching a criterion.
 * Delegates to multi-source, priority-ranked evidenceMatcher.
 */
export function findCandidateEvidence(
  criterion: string,
  cvData: any
): { status: AlignmentCriterionStatus; evidence?: string; source?: 'skills' | 'experience' | 'education' | 'certifications' | 'professional'; explanation: string } {
  return findBestCandidateEvidence(criterion, cvData);
}

export interface DateInterval {
  start: number; // decimal year
  end: number;   // decimal year
}

export function parseDateToDecimalYear(dateStr?: string | null): number | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;
  if (/^present$/i.test(trimmed) || /^current$/i.test(trimmed)) {
    const now = new Date();
    return now.getFullYear() + now.getMonth() / 12;
  }
  const date = new Date(trimmed);
  if (isNaN(date.getTime())) {
    const yearMatch = trimmed.match(/\b(19\d\d|20\d\d)\b/);
    if (yearMatch) {
      return parseInt(yearMatch[1], 10);
    }
    return null;
  }
  return date.getFullYear() + date.getMonth() / 12;
}

/**
 * Merges overlapping employment intervals to avoid double-counting qualifying years.
 */
export function mergeDateIntervals(intervals: DateInterval[]): number {
  if (intervals.length === 0) return 0;

  const valid = intervals
    .filter(i => !isNaN(i.start) && !isNaN(i.end) && i.end >= i.start)
    .sort((a, b) => a.start - b.start);

  if (valid.length === 0) return 0;

  const merged: DateInterval[] = [{ start: valid[0].start, end: valid[0].end }];

  for (let i = 1; i < valid.length; i++) {
    const current = merged[merged.length - 1];
    const next = valid[i];

    if (next.start <= current.end) {
      current.end = Math.max(current.end, next.end);
    } else {
      merged.push({ start: next.start, end: next.end });
    }
  }

  const totalYears = merged.reduce((acc, interval) => acc + (interval.end - interval.start), 0);
  return Math.round(totalYears * 10) / 10;
}

/**
 * Evaluates whether an approved experience record contains evidence reasonably related to a specific domain.
 * Broad generic terms (IT, systems, technology, audit, support, engineer) do NOT count as evidence by themselves.
 */
export function isExperienceRelevantToDomain(exp: any, domain: string): boolean {
  if (!exp || !domain) return false;

  const normDomain = normalizeText(domain);
  const domainTokens = normDomain.split(' ').filter(w => w.length > 1 && !BROAD_TECH_STOPWORDS.has(w));
  if (domainTokens.length === 0) return false;

  const title = exp.job_title || exp.role || '';
  const desc = exp.description || '';
  const responsibilities = Array.isArray(exp.responsibilities) 
    ? exp.responsibilities.join(' ') 
    : (typeof exp.responsibilities === 'string' ? exp.responsibilities : '');
  const achievements = Array.isArray(exp.achievements) ? exp.achievements.join(' ') : '';
  const roleSkills = Array.isArray(exp.skills) 
    ? exp.skills.map((s: any) => typeof s === 'string' ? s : s?.name).join(' ') 
    : '';

  const fullRoleText = normalizeText([title, desc, responsibilities, achievements, roleSkills].filter(Boolean).join(' '));

  // Controlled domain-specific alias mappings
  const domainAliases: Record<string, string[]> = {
    'network': ['networking', 'network engineer', 'network engineering', 'network administrator', 'network architect', 'lan wan', 'cisco', 'ccna', 'ccnp', 'tcp ip'],
    'cybersecurity': ['information security', 'infosec', 'cyber security', 'soc', 'penetration testing', 'incident response', 'vulnerability management', 'siem', 'cism', 'cissp'],
    'banking': ['bank', 'banking', 'teller', 'credit union', 'financial services', 'retail banking', 'commercial banking'],
    'accounting': ['accountant', 'accounting', 'cpa', 'gaap', 'financial reporting', 'general ledger'],
    'react': ['reactjs', 'react.js', 'frontend react'],
    'python': ['python', 'python 3', 'django', 'fastapi', 'flask']
  };

  // 1. Direct domain match as whole word phrase
  if (hasWord(fullRoleText, normDomain)) return true;

  // 2. Controlled concept equivalence check
  if (areConceptsEquivalent(normDomain, fullRoleText)) return true;

  // 3. Token match with aliases and controlled domain keywords
  for (const token of domainTokens) {
    if (hasWord(fullRoleText, token)) return true;

    const aliases = domainAliases[token] || CONTROLLED_DOMAIN_KEYWORDS[token] || [];
    for (const alias of aliases) {
      if (hasWord(fullRoleText, alias)) return true;
    }
  }

  return false;
}

/**
 * Calculates candidate's qualifying years in a specific domain from approved experience records.
 */
export function calculateDomainExperience(
  cvData: any,
  domain: string
): { qualifyingYears: number; relevantRoles: string[]; datesEstablished: boolean } {
  const experiences = Array.isArray(cvData?.experience) ? cvData.experience : [];
  const relevantRoles: string[] = [];
  const intervals: DateInterval[] = [];
  let datesMissingCount = 0;

  for (const exp of experiences) {
    if (isExperienceRelevantToDomain(exp, domain)) {
      const title = exp.job_title || exp.role || 'Role';
      const company = exp.company || exp.company_name || 'Organization';
      relevantRoles.push(`${title} at ${company}`);

      const start = parseDateToDecimalYear(exp.start_date);
      const end = (exp.is_current || exp.end_date === 'Present')
        ? (new Date().getFullYear() + new Date().getMonth() / 12)
        : parseDateToDecimalYear(exp.end_date);

      if (start !== null && end !== null && end >= start) {
        intervals.push({ start, end });
      } else {
        datesMissingCount++;
      }
    }
  }

  if (relevantRoles.length === 0) {
    return { qualifyingYears: 0, relevantRoles: [], datesEstablished: true };
  }

  const qualifyingYears = mergeDateIntervals(intervals);
  const datesEstablished = intervals.length > 0 || datesMissingCount === 0;

  return {
    qualifyingYears,
    relevantRoles,
    datesEstablished
  };
}

/**
 * Calculates candidate's total generic professional experience years.
 */
export function estimateTotalCandidateExperienceYears(cvData: any, profileYears?: number | null): number {
  if (typeof profileYears === 'number' && profileYears >= 0) {
    return profileYears;
  }

  const expList = Array.isArray(cvData?.experience) ? cvData.experience : [];
  if (expList.length === 0) return 0;

  const intervals: DateInterval[] = [];
  for (const exp of expList) {
    const start = parseDateToDecimalYear(exp.start_date);
    const end = (exp.is_current || exp.end_date === 'Present')
      ? (new Date().getFullYear() + new Date().getMonth() / 12)
      : parseDateToDecimalYear(exp.end_date);

    if (start !== null && end !== null && end >= start) {
      intervals.push({ start, end });
    }
  }

  if (intervals.length > 0) {
    return Math.max(mergeDateIntervals(intervals), expList.length);
  }

  return expList.length;
}

/**
 * Evaluates domain-qualified experience requirement.
 */
export function evaluateDomainQualifiedExperience(
  domain: string,
  minYears: number,
  cvData: any
): { status: AlignmentCriterionStatus; score: number; maxScore: number; reason: string; evidence?: string } {
  const maxScore = 25;
  const { qualifyingYears, relevantRoles, datesEstablished } = calculateDomainExperience(cvData, domain);

  if (relevantRoles.length === 0) {
    return {
      status: 'not_found',
      score: 0,
      maxScore,
      reason: `Required ${domain} experience was not found in your approved profile.`
    };
  }

  if (!datesEstablished && qualifyingYears === 0) {
    return {
      status: 'uncertain',
      score: 0,
      maxScore,
      evidence: `Identified role(s): ${relevantRoles.join('; ')}`,
      reason: `Experience related to ${domain} was found in your approved profile, but dates could not reliably establish qualifying duration.`
    };
  }

  if (qualifyingYears >= minYears) {
    return {
      status: 'matched',
      score: maxScore,
      maxScore,
      evidence: `Approved experience: ~${qualifyingYears} years (${relevantRoles.join('; ')})`,
      reason: `Approved experience demonstrates ~${qualifyingYears} years in ${domain}, meeting the required ${minYears}+ years.`
    };
  } else if (qualifyingYears > 0) {
    const partialScore = Math.max(5, Math.round(maxScore * (qualifyingYears / minYears)));
    return {
      status: 'partially_supported',
      score: partialScore,
      maxScore,
      evidence: `Approved experience: ~${qualifyingYears} years (${relevantRoles.join('; ')})`,
      reason: `Approved profile demonstrates ~${qualifyingYears} years of ${domain} experience, which is below the requested ${minYears} years.`
    };
  } else {
    return {
      status: 'not_found',
      score: 0,
      maxScore,
      reason: `Required ${domain} experience was not found in your approved profile.`
    };
  }
}

/**
 * Evaluates generic experience level against candidate's total approved professional history.
 */
export function evaluateGenericExperience(
  jobExpLevel: string | null | undefined,
  candidateYears: number
): { status: AlignmentCriterionStatus; score: number; maxScore: number; reason: string } {
  if (!jobExpLevel || !jobExpLevel.trim()) {
    return {
      status: 'not_applicable',
      score: 0,
      maxScore: 0,
      reason: 'No specific experience level required by job advert.'
    };
  }

  const norm = jobExpLevel.toLowerCase();
  let requiredMin = 0;

  const rangeMatch = norm.match(/(\d+)\s*-\s*(\d+)/);
  const plusMatch = norm.match(/(\d+)\s*\+/);
  const singleMatch = norm.match(/(\d+)\s*(?:years?|yrs?)/);

  if (rangeMatch) {
    requiredMin = parseInt(rangeMatch[1], 10);
  } else if (plusMatch) {
    requiredMin = parseInt(plusMatch[1], 10);
  } else if (singleMatch) {
    requiredMin = parseInt(singleMatch[1], 10);
  } else if (norm.includes('senior') || norm.includes('lead')) {
    requiredMin = 5;
  } else if (norm.includes('mid') || norm.includes('intermediate')) {
    requiredMin = 3;
  } else if (norm.includes('entry') || norm.includes('junior') || norm.includes('intern')) {
    requiredMin = 0;
  }

  const maxScore = 25;

  if (candidateYears >= requiredMin) {
    return {
      status: 'matched',
      score: maxScore,
      maxScore,
      reason: `Your approved experience (~${candidateYears} years) meets or exceeds the required level (${jobExpLevel}).`
    };
  } else if (candidateYears >= Math.max(1, requiredMin - 1)) {
    return {
      status: 'partially_supported',
      score: Math.round(maxScore * 0.7),
      maxScore,
      reason: `Your approved experience (~${candidateYears} years) is close to the requested ${jobExpLevel}.`
    };
  } else {
    return {
      status: 'not_found',
      score: 0,
      maxScore,
      reason: `Role specifies ${jobExpLevel}, while your approved profile reflects approximately ${candidateYears} years.`
    };
  }
}

/**
 * Conservatively extracts role-duty statements from job description when responsibilities field is blank.
 * Preserves traceability, source_text, and marks source_type = 'description'.
 */
export function extractResponsibilitiesFromDescription(
  description: string | null | undefined
): { criterion: string; source_text: string }[] {
  if (!description || !description.trim()) return [];

  const text = description.trim();
  const results: { criterion: string; source_text: string }[] = [];
  const seen = new Set<string>();

  // 1. Check if description contains an explicit bulleted responsibilities/duties section
  const sectionRegex = /(?:key\s+)?(?:responsibilities|duties|what\s+you(?:'ll|\s+will)\s+do|role\s+responsibilities|core\s+duties):?\s*([\s\S]*?)(?:\n\s*\n\s*(?:requirements|qualifications|what\s+we\s+look\s+for|benefits|about\s+us|$))/i;
  const sectionMatch = text.match(sectionRegex);

  if (sectionMatch && sectionMatch[1]) {
    const lines = extractDiscreteCriteria(sectionMatch[1]);
    for (const line of lines) {
      if (!isVagueOrBoilerplate(line) && line.length >= 10) {
        const norm = normalizeText(line);
        if (!seen.has(norm)) {
          seen.add(norm);
          results.push({ criterion: line, source_text: line });
        }
      }
    }
    if (results.length > 0) {
      return results;
    }
  }

  // 2. Conservative action-verb duty extraction from description prose
  const actionVerbs = [
    'manage', 'design', 'configure', 'maintain', 'administer', 'monitor',
    'troubleshoot', 'implement', 'support', 'develop', 'audit', 'review',
    'operate', 'deploy', 'install', 'oversee', 'lead', 'coordinate'
  ];
  const verbGroup = actionVerbs.join('|');

  // Match e.g. "We are seeking an experienced Network Engineer to manage enterprise LAN/WAN infrastructure, firewalls, VPNs, network monitoring and troubleshooting."
  const dutyClauseRegex = new RegExp(
    `(?:to|will|responsible for|role involves|duties include:?)\\s+((?:${verbGroup})\\b[^.;\\n]{15,})`,
    'gi'
  );

  let match: RegExpExecArray | null;
  while ((match = dutyClauseRegex.exec(text)) !== null) {
    const rawClause = match[1].trim();
    const criterion = rawClause.charAt(0).toUpperCase() + rawClause.slice(1);
    const norm = normalizeText(criterion);

    if (!seen.has(norm) && !isVagueOrBoilerplate(criterion)) {
      seen.add(norm);
      results.push({
        criterion,
        source_text: rawClause
      });
    }
  }

  // Also check if any standalone lines in description start directly with an action verb
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    const cleaned = line.replace(/^[\s•\-\*\u2022\u2023\u25E6\u2043\u2219]+\s*/, '').replace(/^\d+[\.\)]\s*/, '').trim();
    const startsWithVerb = new RegExp(`^(?:${verbGroup})\\b[^.;\\n]{15,}`, 'i').test(cleaned);
    if (startsWithVerb) {
      const norm = normalizeText(cleaned);
      if (!seen.has(norm) && !isVagueOrBoilerplate(cleaned)) {
        seen.add(norm);
        results.push({
          criterion: cleaned,
          source_text: cleaned
        });
      }
    }
  }

  return results;
}

/**
 * Main Deterministic Alignment Calculation Function.
 */
export function calculateJobAlignment(
  job: {
    id: string;
    title: string;
    company_name: string;
    description?: string | null;
    requirements?: string | null;
    preferred_qualifications?: string | null;
    responsibilities?: string | null;
    experience_level?: string | null;
    updated_at: string;
  },
  reviewedCvData: any,
  candidateProfile?: {
    id?: string;
    years_experience?: number | null;
  } | null,
  parseId: string = ''
): JobAlignmentResult {
  const criteriaResults: AlignmentCriterionResult[] = [];
  const components: AlignmentComponentResult[] = [];

  // ============================================================
  // Step 1: Parse & Partition Requirements
  // ============================================================
  const allRawRequirements = extractDiscreteCriteria(job.requirements);

  const experienceRequirements: { clause: string; info: ExperienceRequirementInfo }[] = [];
  const qualificationRequirements: string[] = [];

  for (const req of allRawRequirements) {
    const expInfo = classifyExperienceRequirement(req);
    if (expInfo.isExperience) {
      experienceRequirements.push({ clause: req, info: expInfo });
    } else {
      qualificationRequirements.push(req);
    }
  }

  // ============================================================
  // 1. Required Criteria Evaluation (Weight: 45)
  // Evaluates qualifications only (experience duration is routed to experience_level)
  // ============================================================
  const requiredWeight = 45;

  if (qualificationRequirements.length > 0) {
    let matchedCount = 0;
    let partialCount = 0;
    let evaluableCount = 0;

    qualificationRequirements.forEach((req, idx) => {
      const isHeading = isStructuralHeading(req);
      if (isHeading) {
        criteriaResults.push({
          id: `req-${idx + 1}`,
          type: 'required',
          normalized_value: normalizeText(req),
          source_text: req,
          match_status: 'not_applicable',
          candidate_evidence: undefined,
          candidate_source: undefined,
          source_type: 'skills',
          reason: 'Structural section heading excluded from candidate scoring.',
          criterion: req,
          category: 'required',
          status: 'not_applicable',
          explanation: 'Structural section heading excluded from candidate scoring.'
        });
        return;
      }

      const isVague = isVagueOrBoilerplate(req);
      const match = isVague 
        ? { status: 'not_applicable' as AlignmentCriterionStatus, evidence: undefined, source: undefined, explanation: 'Boilerplate or non-evaluable phrase excluded from alignment scoring.' }
        : findCandidateEvidence(req, reviewedCvData);

      if (!isVague && match.status !== 'not_applicable') {
        evaluableCount++;
        if (match.status === 'matched') matchedCount++;
        if (match.status === 'partially_supported') partialCount++;
      }

      const normVal = normalizeText(req);
      criteriaResults.push({
        id: `req-${idx + 1}`,
        type: 'required',
        normalized_value: normVal,
        source_text: req,
        match_status: match.status,
        candidate_evidence: match.evidence,
        candidate_source: match.source,
        source_type: match.source,
        reason: match.explanation,
        // Backward-compatible aliases
        criterion: req,
        category: 'required',
        status: match.status,
        explanation: match.explanation
      });
    });

    const divisor = evaluableCount > 0 ? evaluableCount : qualificationRequirements.length;
    const scoreFraction = (matchedCount * 1.0 + partialCount * 0.5) / divisor;
    const reqScore = Math.round(scoreFraction * requiredWeight);
    const summary = `${matchedCount} of ${evaluableCount} required criteria directly supported with profile evidence.`;

    components.push({
      id: 'required_criteria',
      label: 'Required Qualifications',
      score: reqScore,
      max_score: requiredWeight,
      applicable: true,
      status: reqScore === requiredWeight ? 'pass' : (reqScore >= requiredWeight * 0.6 ? 'partial' : 'gap'),
      matched_count: matchedCount,
      total_count: evaluableCount,
      summary,
      reasons: [summary]
    });
  } else {
    const summary = 'No explicit qualification requirements specified in this job advert.';
    components.push({
      id: 'required_criteria',
      label: 'Required Qualifications',
      score: 0,
      max_score: 0,
      applicable: false,
      status: 'not_applicable',
      matched_count: 0,
      total_count: 0,
      summary,
      reasons: [summary]
    });
  }

  // ============================================================
  // 2. Experience Level Evaluation (Weight: 25)
  // Experience is evaluated exactly once.
  // Domain-qualified experience requires candidate-approved domain evidence.
  // ============================================================
  const experienceWeight = 25;

  if (experienceRequirements.length > 0) {
    // Requirements specified one or more experience clauses
    let expMatchedCount = 0;
    let expTotalScore = 0;

    experienceRequirements.forEach((item, idx) => {
      let evalResult: { status: AlignmentCriterionStatus; score: number; maxScore: number; reason: string; evidence?: string };

      if (item.info.isDomainQualified && item.info.domain) {
        evalResult = evaluateDomainQualifiedExperience(item.info.domain, item.info.minYears, reviewedCvData);
      } else {
        const totalYears = estimateTotalCandidateExperienceYears(reviewedCvData, candidateProfile?.years_experience);
        evalResult = evaluateGenericExperience(`${item.info.minYears}+ years`, totalYears);
      }

      if (evalResult.status === 'matched') expMatchedCount++;
      expTotalScore += evalResult.score;

      criteriaResults.push({
        id: `exp-${idx + 1}`,
        type: 'experience',
        normalized_value: normalizeText(item.clause),
        source_text: item.clause,
        match_status: evalResult.status,
        candidate_evidence: evalResult.evidence,
        candidate_source: 'experience',
        source_type: 'experience',
        reason: evalResult.reason,
        // Backward-compatible aliases
        criterion: item.clause,
        category: 'experience',
        status: evalResult.status,
        explanation: evalResult.reason
      });
    });

    const averageScore = Math.round(expTotalScore / experienceRequirements.length);
    const primaryReason = criteriaResults.find(c => c.type === 'experience')?.reason || 'Experience evaluated against profile.';

    components.push({
      id: 'experience_level',
      label: 'Experience Level',
      score: averageScore,
      max_score: experienceWeight,
      applicable: true,
      status: averageScore === experienceWeight ? 'pass' : (averageScore > 0 ? 'partial' : 'gap'),
      matched_count: expMatchedCount,
      total_count: experienceRequirements.length,
      summary: primaryReason,
      reasons: [primaryReason]
    });
  } else if (job.experience_level && job.experience_level.trim()) {
    // Evaluate job.experience_level when requirements had no experience clause
    const expInfo = classifyExperienceRequirement(job.experience_level);
    let evalResult: { status: AlignmentCriterionStatus; score: number; maxScore: number; reason: string; evidence?: string };

    if (expInfo.isDomainQualified && expInfo.domain) {
      evalResult = evaluateDomainQualifiedExperience(expInfo.domain, expInfo.minYears, reviewedCvData);
    } else {
      const candidateExpYears = estimateTotalCandidateExperienceYears(
        reviewedCvData,
        candidateProfile?.years_experience
      );
      evalResult = evaluateGenericExperience(job.experience_level, candidateExpYears);
    }

    criteriaResults.push({
      id: 'exp-level',
      type: 'experience',
      normalized_value: normalizeText(job.experience_level),
      source_text: job.experience_level,
      match_status: evalResult.status,
      candidate_evidence: evalResult.evidence || `Approved experience: ~${estimateTotalCandidateExperienceYears(reviewedCvData, candidateProfile?.years_experience)} years`,
      candidate_source: 'experience',
      source_type: 'experience',
      reason: evalResult.reason,
      // Backward-compatible aliases
      criterion: `Experience Level: ${job.experience_level}`,
      category: 'experience',
      status: evalResult.status,
      explanation: evalResult.reason
    });

    components.push({
      id: 'experience_level',
      label: 'Experience Level',
      score: evalResult.score,
      max_score: experienceWeight,
      applicable: true,
      status: evalResult.score === experienceWeight ? 'pass' : (evalResult.score > 0 ? 'partial' : 'gap'),
      matched_count: evalResult.status === 'matched' ? 1 : 0,
      total_count: 1,
      summary: evalResult.reason,
      reasons: [evalResult.reason]
    });
  } else {
    const summary = 'No explicit experience level specified in this job advert.';
    components.push({
      id: 'experience_level',
      label: 'Experience Level',
      score: 0,
      max_score: 0,
      applicable: false,
      status: 'not_applicable',
      matched_count: 0,
      total_count: 0,
      summary,
      reasons: [summary]
    });
  }

  // ============================================================
  // 3. Preferred Qualifications Evaluation (Weight: 15)
  // ============================================================
  const rawPreferred = extractDiscreteCriteria(job.preferred_qualifications);
  const preferredWeight = 15;

  if (rawPreferred.length > 0) {
    let matchedCount = 0;
    let partialCount = 0;
    let evaluableCount = 0;

    rawPreferred.forEach((pref, idx) => {
      const isHeading = isStructuralHeading(pref);
      if (isHeading) {
        criteriaResults.push({
          id: `pref-${idx + 1}`,
          type: 'preferred',
          normalized_value: normalizeText(pref),
          source_text: pref,
          match_status: 'not_applicable',
          candidate_evidence: undefined,
          candidate_source: undefined,
          source_type: 'skills',
          reason: 'Structural section heading excluded from candidate scoring.',
          criterion: pref,
          category: 'preferred',
          status: 'not_applicable',
          explanation: 'Structural section heading excluded from candidate scoring.'
        });
        return;
      }

      // Cross-section duplicate check against required qualifications (Requirement 16 & 30)
      const reqDuplicate = criteriaResults.find(c => {
        if (c.type !== 'required' || c.match_status === 'not_applicable') return false;
        if (normalizeText(pref) === normalizeText(c.source_text)) return true;
        if (areConceptsEquivalent(pref, c.source_text)) return true;
        // Check if preferred concept is subsumed in composite required criterion (e.g. CISA in "CISA, CIA, or CPA")
        const prefNorm = normalizeConcept(pref);
        const reqNorm = normalizeConcept(c.source_text);
        for (const [canonical, aliases] of Object.entries(SYNONYM_CLUSTERS)) {
          const canonicalRegex = new RegExp(`(?:^|\\s)${canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$)`, 'i');
          const prefHasConcept = prefNorm === canonical || canonicalRegex.test(prefNorm) || aliases.some(a => prefNorm.includes(a));
          const reqHasConcept = reqNorm === canonical || canonicalRegex.test(reqNorm) || aliases.some(a => reqNorm.includes(a));
          if (prefHasConcept && reqHasConcept) {
            return true;
          }
        }
        return false;
      });

      if (reqDuplicate) {
        criteriaResults.push({
          id: `pref-${idx + 1}`,
          type: 'preferred',
          normalized_value: normalizeText(pref),
          source_text: pref,
          match_status: 'not_applicable',
          candidate_evidence: reqDuplicate.candidate_evidence,
          candidate_source: reqDuplicate.candidate_source,
          source_type: reqDuplicate.source_type,
          reason: `duplicate_of:${reqDuplicate.id}`,
          criterion: pref,
          category: 'preferred',
          status: 'not_applicable',
          explanation: `Substantive requirement already evaluated in Required Qualifications (${reqDuplicate.id}).`
        });
        return;
      }

      const isVague = isVagueOrBoilerplate(pref);
      const match = isVague 
        ? { status: 'not_applicable' as AlignmentCriterionStatus, evidence: undefined, source: undefined, explanation: 'Boilerplate or non-evaluable phrase excluded from alignment scoring.' }
        : findCandidateEvidence(pref, reviewedCvData);

      if (!isVague && match.status !== 'not_applicable') {
        evaluableCount++;
        if (match.status === 'matched') matchedCount++;
        if (match.status === 'partially_supported') partialCount++;
      }

      const normVal = normalizeText(pref);
      criteriaResults.push({
        id: `pref-${idx + 1}`,
        type: 'preferred',
        normalized_value: normVal,
        source_text: pref,
        match_status: match.status,
        candidate_evidence: match.evidence,
        candidate_source: match.source,
        source_type: match.source,
        reason: match.explanation,
        // Backward-compatible aliases
        criterion: pref,
        category: 'preferred',
        status: match.status,
        explanation: match.explanation
      });
    });

    const divisor = evaluableCount > 0 ? evaluableCount : rawPreferred.length;
    const scoreFraction = (matchedCount * 1.0 + partialCount * 0.5) / divisor;
    const prefScore = Math.round(scoreFraction * preferredWeight);
    const summary = `${matchedCount} of ${evaluableCount} preferred qualifications supported.`;

    components.push({
      id: 'preferred_qualifications',
      label: 'Preferred Qualifications',
      score: prefScore,
      max_score: preferredWeight,
      applicable: true,
      status: prefScore === preferredWeight ? 'pass' : (prefScore > 0 ? 'partial' : 'gap'),
      matched_count: matchedCount,
      total_count: evaluableCount,
      summary,
      reasons: [summary]
    });
  } else {
    const summary = 'No preferred qualifications listed in this job advert.';
    components.push({
      id: 'preferred_qualifications',
      label: 'Preferred Qualifications',
      score: 0,
      max_score: 0,
      applicable: false,
      status: 'not_applicable',
      matched_count: 0,
      total_count: 0,
      summary,
      reasons: [summary]
    });
  }

  // ============================================================
  // 4. Responsibilities Overlap (Weight: 15)
  // Primary source: jobs.responsibilities.
  // Fallback: Conservative explicit role-duty extraction from description when responsibilities is blank.
  // Deduplicates exact duplicate clauses with requirements to avoid double counting.
  // ============================================================
  const rawResponsibilities = extractDiscreteCriteria(job.responsibilities);
  let responsibilityCriteria: { criterion: string; source_text: string; source_type: string }[] = [];

  if (rawResponsibilities.length > 0) {
    responsibilityCriteria = rawResponsibilities.map(r => ({
      criterion: r,
      source_text: r,
      source_type: 'responsibilities'
    }));
  } else if (job.description) {
    // Conservative fallback to explicit action duty clauses in description
    const extractedFromDesc = extractResponsibilitiesFromDescription(job.description);
    // Deduplicate against requirements
    const reqNorms = new Set(allRawRequirements.map(r => normalizeText(r)));
    responsibilityCriteria = extractedFromDesc
      .filter(item => !reqNorms.has(normalizeText(item.criterion)))
      .map(item => ({
        criterion: item.criterion,
        source_text: item.source_text,
        source_type: 'description'
      }));
  }

  const respWeight = 15;

  if (responsibilityCriteria.length > 0) {
    let matchedCount = 0;
    let partialCount = 0;
    let evaluableCount = 0;

    responsibilityCriteria.forEach((respItem, idx) => {
      const isHeading = isStructuralHeading(respItem.criterion);
      if (isHeading) {
        criteriaResults.push({
          id: `resp-${idx + 1}`,
          type: 'responsibility',
          normalized_value: normalizeText(respItem.criterion),
          source_text: respItem.source_text,
          match_status: 'not_applicable',
          candidate_evidence: undefined,
          candidate_source: undefined,
          source_type: respItem.source_type,
          reason: 'Structural section heading excluded from candidate scoring.',
          criterion: respItem.criterion,
          category: 'responsibility',
          status: 'not_applicable',
          explanation: 'Structural section heading excluded from candidate scoring.'
        });
        return;
      }

      // Check cross-section duplicate against required qualifications
      const reqDuplicate = criteriaResults.find(c => 
        c.type === 'required' && 
        c.match_status !== 'not_applicable' &&
        (areConceptsEquivalent(respItem.criterion, c.source_text) || normalizeText(respItem.criterion) === normalizeText(c.source_text))
      );

      if (reqDuplicate) {
        criteriaResults.push({
          id: `resp-${idx + 1}`,
          type: 'responsibility',
          normalized_value: normalizeText(respItem.criterion),
          source_text: respItem.source_text,
          match_status: 'not_applicable',
          candidate_evidence: reqDuplicate.candidate_evidence,
          candidate_source: reqDuplicate.candidate_source,
          source_type: respItem.source_type,
          reason: `duplicate_of:${reqDuplicate.id}`,
          criterion: respItem.criterion,
          category: 'responsibility',
          status: 'not_applicable',
          explanation: `Substantive duty already evaluated in Required Qualifications (${reqDuplicate.id}).`
        });
        return;
      }

      const isVague = isVagueOrBoilerplate(respItem.criterion);
      const match = isVague 
        ? { status: 'not_applicable' as AlignmentCriterionStatus, evidence: undefined, source: undefined, explanation: 'Boilerplate or non-evaluable phrase excluded from alignment scoring.' }
        : findCandidateEvidence(respItem.criterion, reviewedCvData);

      if (!isVague && match.status !== 'not_applicable') {
        evaluableCount++;
        if (match.status === 'matched') matchedCount++;
        if (match.status === 'partially_supported') partialCount++;
      }

      const normVal = normalizeText(respItem.criterion);
      criteriaResults.push({
        id: `resp-${idx + 1}`,
        type: 'responsibility',
        normalized_value: normVal,
        source_text: respItem.source_text,
        match_status: match.status,
        candidate_evidence: match.evidence,
        candidate_source: match.source,
        source_type: respItem.source_type,
        reason: match.explanation,
        // Backward-compatible aliases
        criterion: respItem.criterion,
        category: 'responsibility',
        status: match.status,
        explanation: match.explanation
      });
    });

    const divisor = evaluableCount > 0 ? evaluableCount : responsibilityCriteria.length;
    const scoreFraction = (matchedCount * 1.0 + partialCount * 0.5) / divisor;
    const respScore = Math.round(scoreFraction * respWeight);
    const summary = `${matchedCount} of ${evaluableCount} role responsibilities demonstrated in experience.`;

    components.push({
      id: 'responsibilities',
      label: 'Key Responsibilities',
      score: respScore,
      max_score: respWeight,
      applicable: true,
      status: respScore === respWeight ? 'pass' : (respScore > 0 ? 'partial' : 'gap'),
      matched_count: matchedCount,
      total_count: evaluableCount,
      summary,
      reasons: [summary]
    });
  } else {
    const summary = 'No responsibilities or explicit duties listed in this job advert.';
    components.push({
      id: 'responsibilities',
      label: 'Key Responsibilities',
      score: 0,
      max_score: 0,
      applicable: false,
      status: 'not_applicable',
      matched_count: 0,
      total_count: 0,
      summary,
      reasons: [summary]
    });
  }

  // ============================================================
  // 5. Applicability-Aware Denominator & Normalization
  // ============================================================
  const applicableComponents = components.filter(c => c.applicable && c.max_score > 0);
  const rawScore = applicableComponents.reduce((sum, c) => sum + c.score, 0);
  const calculatedRawMax = applicableComponents.reduce((sum, c) => sum + c.max_score, 0);

  // If maximum applicable points = 0 (zero evaluable criteria):
  // Do NOT calculate a numerical score or substitute 0/100.
  // Return controlled deterministic failure with error_code = 'NO_EVALUABLE_CRITERIA'.
  if (calculatedRawMax === 0) {
    return {
      ruleset_version: CURRENT_JOB_ALIGNMENT_RULESET_VERSION,
      status: 'failed',
      error_code: 'NO_EVALUABLE_CRITERIA',
      score: null,
      max_score: 100,
      raw_score: null,
      raw_max_score: null,
      alignment_band: null,
      components,
      criteria: criteriaResults,
      component_results: components,
      criteria_breakdown: criteriaResults,
      candidate_parse_id: parseId,
      job_id: job.id,
      job_title: job.title,
      company_name: job.company_name,
      job_updated_at: job.updated_at
    };
  }

  const normalizedScore = Math.min(100, Math.max(0, Math.round((rawScore / calculatedRawMax) * 100)));

  // Categorize into neutral alignment bands
  let alignmentBand: 'strong' | 'moderate' | 'emerging' = 'emerging';
  if (normalizedScore >= 75) {
    alignmentBand = 'strong';
  } else if (normalizedScore >= 50) {
    alignmentBand = 'moderate';
  }

  return {
    ruleset_version: CURRENT_JOB_ALIGNMENT_RULESET_VERSION,
    status: 'completed',
    score: normalizedScore,
    max_score: 100,
    raw_score: rawScore,
    raw_max_score: calculatedRawMax,
    alignment_band: alignmentBand,
    components,
    criteria: criteriaResults,
    component_results: components,
    criteria_breakdown: criteriaResults,
    candidate_parse_id: parseId,
    job_id: job.id,
    job_title: job.title,
    company_name: job.company_name,
    job_updated_at: job.updated_at
  };
}

