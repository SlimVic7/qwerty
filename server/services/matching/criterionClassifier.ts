/**
 * Criterion Classifier (QWERTY Stage 5.1 - Ruleset job-alignment-v1.3)
 * 
 * Provides deterministic classification for:
 * 1. Structural headings (Attributes & Skills (Required), Qualifications, etc.) -> not_applicable (0 numerator, 0 denominator)
 * 2. Non-document-verifiable behavioural traits (team player, self-motivated) -> not_applicable if unevidenced
 * 3. Proficiency qualifiers (advanced, expert, deep)
 * 4. Composite criteria (e.g. business and financial analytical skills)
 * 5. Education requirement specificity (degree level + field of study)
 * 6. Certification requirement specificity (exact vs broad)
 * 7. Candidate negation / disclaimer safety (e.g. "no hands-on", "basic exposure")
 */

import { normalizeConcept } from './conceptRegistry.js';

// Specific skills/credentials that should NEVER be filtered out even if ending in 'required'
const LEGITIMATE_REQUIREMENT_TOKENS = new Set([
  'cpa', 'cisa', 'cism', 'cissp', 'ccna', 'ccnp', 'acca', 'ca',
  'sql', 'python', 'java', 'react', 'aws', 'azure', 'gcp', 'k8s',
  'tcp', 'cisco', 'fortinet', 'splunk', 'bachelor', 'bsc', 'master',
  'msc', 'mba', 'degree', 'diploma'
]);

// Structural heading words
const HEADING_PATTERNS = [
  /^attributes\s*(?:&|and)\s*skills(?:\s*\((?:required|preferred)\))?:?$/i,
  /^educational\s*qualifications:?$/i,
  /^(?:key\s+|core\s+)?responsibilities:?$/i,
  /^(?:minimum\s+|required\s+|preferred\s+)?qualifications:?$/i,
  /^(?:key\s+|role\s+|job\s+)?requirements:?$/i,
  /^skills\s*(?:&|and)\s*competencies:?$/i,
  /^(?:technical\s+|professional\s+)?skills:?$/i,
  /^(?:education\s*(?:&|and)\s*experience|education|certifications|experience):?$/i,
  /^(?:what\s+you(?:'ll|\s+will)\s+do|what\s+we\s+look\s+for|must\s+have|nice\s+to\s+have):?$/i,
  /^(?:about\s+the\s+role|role\s+summary|role\s+overview|core\s+competencies):?$/i
];

/**
 * Determines whether a line is a non-evaluable structural heading.
 * Preserves short legitimate requirements like "CPA required", "SQL required", "CISA required".
 */
export function isStructuralHeading(rawText: string): boolean {
  if (!rawText || !rawText.trim()) return false;
  const trimmed = rawText.trim();

  // If text matches known heading patterns directly
  for (const pattern of HEADING_PATTERNS) {
    if (pattern.test(trimmed)) {
      return true;
    }
  }

  // Check short labels (<= 40 chars) ending with ':' or containing only section header words
  const norm = normalizeConcept(trimmed);
  const words = norm.split(' ').filter(Boolean);

  // If it mentions an explicit concrete technical or credential token, it is NOT a heading
  if (words.some(w => LEGITIMATE_REQUIREMENT_TOKENS.has(w))) {
    return false;
  }

  // Standalone heading labels like "Qualifications", "Education", "Requirements"
  if (words.length <= 4 && trimmed.endsWith(':')) {
    const isCommonHeader = /^(qualifications|responsibilities|requirements|education|certifications|skills|experience|competencies)/i.test(trimmed);
    if (isCommonHeader) return true;
  }

  // Exact matches for known header titles without colon
  if (words.length <= 3) {
    const headerPhrases = [
      'educational qualifications',
      'required qualifications',
      'preferred qualifications',
      'key responsibilities',
      'core responsibilities',
      'role requirements',
      'attributes and skills required',
      'attributes skills required'
    ];
    if (headerPhrases.includes(norm)) {
      return true;
    }
  }

  return false;
}

// Behavioral personality traits that cannot reasonably be verified from a CV document
const BEHAVIOURAL_TRAIT_PATTERNS = [
  /\b(?:team\s+player|team\s+worker|team\s+spirit|collaborative\s+team\s+spirit|collaborative\s+spirit)\b/i,
  /\b(?:self[- ]motivated|self[- ]starter)\b/i,
  /\b(?:proactive|positive\s+attitude|integrity|can[- ]do\s+attitude)\b/i,
  /\b(?:attention\s+to\s+detail|detail[- ]oriented)\b/i,
  /\b(?:ability\s+to\s+work\s+independently|work\s+independently)\b/i,
  /\b(?:ability\s+to\s+work\s+under\s+pressure|work\s+under\s+pressure)\b/i,
  /\b(?:ability\s+to\s+multitask|multitasking)\b/i,
  /\b(?:fast\s+learner|quick\s+learner|strong\s+work\s+ethic)\b/i,
  /\b(?:enthusiastic|passionate\s+about)\b/i,
  /\b(?:analytical\s+mindset|growth\s+mindset|problem[- ]solving\s+mindset)\b/i
];

/**
 * Checks if criterion describes an unverifiable behavioural personality trait.
 * Distinguishes action-oriented competencies (e.g. "Experience presenting audit findings to senior stakeholders").
 */
export function isNonVerifiableBehaviouralTrait(rawText: string): boolean {
  if (!rawText) return false;
  const trimmed = rawText.trim();

  // If it has explicit mindset/spirit/attitude phrases, treat as behavioural trait
  const isExplicitMindsetOrSpirit = /\b(?:mindset|spirit|attitude|work\s+ethic)\b/i.test(trimmed);

  // If it specifies concrete professional deliverables/actions, it is NOT a pure personality trait
  if (!isExplicitMindsetOrSpirit && /\b(?:presenting|reporting|audit|controls?|evaluat|manage|configure|develop|certifi|engineer|bachelor|degree|years?)\b/i.test(trimmed)) {
    return false;
  }
  if (!isExplicitMindsetOrSpirit && /\b(?:data\s+analysis|financial\s+analysis|systems?\s+analysis|business\s+analysis)\b/i.test(trimmed)) {
    return false;
  }

  return BEHAVIOURAL_TRAIT_PATTERNS.some(p => p.test(trimmed));
}

/**
 * Extracts proficiency qualifier requirements (e.g. advanced, expert, deep).
 */
export function extractProficiencyQualifier(text: string): { hasQualifier: boolean; qualifier: string | null } {
  if (!text) return { hasQualifier: false, qualifier: null };
  const match = text.match(/\b(advanced|expert|deep|extensive|proven)\b/i);
  if (match) {
    return { hasQualifier: true, qualifier: match[1].toLowerCase() };
  }
  return { hasQualifier: false, qualifier: null };
}

/**
 * Checks if candidate evidence contains negation or non-hands-on disclaimers.
 */
export function hasCandidateNegation(evidenceText: string, targetConcept: string): boolean {
  if (!evidenceText || !targetConcept) return false;
  const lowerEv = evidenceText.toLowerCase();
  const lowerTarget = targetConcept.toLowerCase();

  // Patterns like: "no hands-on <target>", "basic exposure to <target>", "currently learning <target>"
  const negationRegexes = [
    new RegExp(`\\bno\\s+(?:hands[- ]on\\s+)?(?:experience\\s+(?:with|in)\\s+)?${lowerTarget}\\b`, 'i'),
    new RegExp(`\\bbasic\\s+exposure\\s+(?:to|in)\\s+${lowerTarget}\\b`, 'i'),
    new RegExp(`\\bcurrently\\s+learning\\s+${lowerTarget}\\b`, 'i'),
    new RegExp(`\\bfamiliar\\s+with\\s+concept\\s+of\\s+${lowerTarget}\\b`, 'i'),
    new RegExp(`\\blimited\\s+exposure\\s+(?:to|in)\\s+${lowerTarget}\\b`, 'i')
  ];

  return negationRegexes.some(r => r.test(lowerEv));
}

export type CriterionEvidenceExpectation =
  | 'CERTIFICATION'
  | 'EDUCATION'
  | 'EXPERIENCE_DURATION'
  | 'PRACTICAL_EXPERIENCE'
  | 'TECHNICAL_SKILL'
  | 'DOMAIN_KNOWLEDGE'
  | 'PROFESSIONAL_ACTION'
  | 'SOFT_SKILL'
  | 'STRUCTURAL';

/**
 * Classifies a job criterion into an expected evidence type to drive criterion-aware evidence ranking.
 */
export function classifyCriterionEvidenceExpectation(criterion: string): CriterionEvidenceExpectation {
  if (!criterion || !criterion.trim()) return 'STRUCTURAL';

  if (isStructuralHeading(criterion)) {
    return 'STRUCTURAL';
  }

  if (isNonVerifiableBehaviouralTrait(criterion)) {
    return 'SOFT_SKILL';
  }

  // Duration requirements (e.g. "5+ years experience", "3-5 years of IT experience")
  const isDuration = /\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\+?\s*(?:-\s*\d+)?\s*years?(?:\s+of)?(?:\s+(?:professional|relevant|hands[- ]on|work)?\s*experience|\s+tenure|\s+track\s+record)?\b/i.test(criterion);
  if (isDuration) {
    return 'EXPERIENCE_DURATION';
  }

  // Education requirements
  const eduInfo = classifyEducationRequirement(criterion);
  if (eduInfo.isEducation) {
    return 'EDUCATION';
  }

  // Certification requirements
  const normCrit = normalizeConcept(criterion);
  const isCertWord = /\b(?:certif(?:ication|ied|icate)|accredit(?:ation|ed)|license|licensure|credential)\b/i.test(criterion);
  const isKnownCert = /\b(?:cisa|cism|cissp|ccna|ccnp|cpa|acca|ceh|pmp|itil|aws\s+certified|azure\s+certified|gcp\s+certified)\b/i.test(normCrit);
  if (isCertWord || isKnownCert) {
    return 'CERTIFICATION';
  }

  // Professional Action / Practical Ability (e.g. "Ability to identify, assess and address risk", "Experience presenting audit findings")
  const isActionOrAbility = /\b(?:ability\s+to|capacity\s+to|proven\s+ability|demonstrated\s+ability|track\s+record\s+of|experience\s+(?:in\s+)?(?:conducting|performing|presenting|evaluating|assessing|identifying|managing|delivering|executing|troubleshooting))\b/i.test(criterion);
  if (isActionOrAbility) {
    return 'PROFESSIONAL_ACTION';
  }

  // Practical Experience
  const isPracticalExp = /\b(?:hands[- ]on\s+experience|practical\s+experience|experience\s+with|experience\s+in|working\s+experience|demonstrated\s+experience)\b/i.test(criterion);
  if (isPracticalExp) {
    return 'PRACTICAL_EXPERIENCE';
  }

  // Domain Knowledge
  const isKnowledge = /\b(?:knowledge\s+of|understanding\s+of|familiarity\s+with|awareness\s+of|principles\s+of|methodolog(?:y|ies)|techniques?|processes?)\b/i.test(criterion);
  if (isKnowledge) {
    return 'DOMAIN_KNOWLEDGE';
  }

  // Technical Skills / Tools
  return 'TECHNICAL_SKILL';
}

/**
 * Education requirement info.
 */
export interface EducationRequirementInfo {
  isEducation: boolean;
  degreeLevel: 'bachelor' | 'master' | 'doctorate' | null;
  targetLevel?: 'bachelor' | 'master' | 'doctorate' | null;
  fieldOfStudy: string | null;
  fields: string[];
  isRelatedFieldAllowed: boolean;
  isOrHigherAllowed: boolean;
}

/**
 * Classifies education requirement specificity.
 */
export function classifyEducationRequirement(rawText: string): EducationRequirementInfo {
  if (!rawText) {
    return { isEducation: false, degreeLevel: null, targetLevel: null, fieldOfStudy: null, fields: [], isRelatedFieldAllowed: false, isOrHigherAllowed: false };
  }

  const norm = normalizeConcept(rawText);

  const isEdu = /\b(degree|bachelor|bsc|ba|master|msc|mba|phd|doctorate|qualification|diploma)\b/i.test(rawText);
  if (!isEdu) {
    return { isEducation: false, degreeLevel: null, targetLevel: null, fieldOfStudy: null, fields: [], isRelatedFieldAllowed: false, isOrHigherAllowed: false };
  }

  let degreeLevel: 'bachelor' | 'master' | 'doctorate' | null = null;
  if (/\b(bachelor|bsc|b\.sc|ba|b\.a|undergraduate)\b/i.test(rawText)) {
    degreeLevel = 'bachelor';
  } else if (/\b(master|msc|m\.sc|mba|postgraduate)\b/i.test(rawText)) {
    degreeLevel = 'master';
  } else if (/\b(phd|doctorate)\b/i.test(rawText)) {
    degreeLevel = 'doctorate';
  }

  const isOrHigherAllowed = /\b(or\s+(?:higher|above|advanced)|or\s+equivalent\s+(?:postgraduate|qualification|degree))\b/i.test(rawText);

  // Field of study extraction
  const fields: string[] = [];
  const isRelatedFieldAllowed = /\b(or\s+related\s+field|or\s+equivalent|related\s+discipline|relevant\s+field|relevant\s+discipline)\b/i.test(rawText);

  if (/\baccounting\b/i.test(norm)) fields.push('accounting');
  if (/\bfinance\b/i.test(norm)) fields.push('finance');
  if (/\beconomics\b/i.test(norm)) fields.push('economics');
  if (/\bcomputer\s+science\b/i.test(norm)) fields.push('computer science');
  if (/\binformation\s+(?:systems|technology)\b/i.test(norm)) fields.push('information systems');
  if (/\bengineering\b/i.test(norm)) fields.push('engineering');

  const fieldOfStudy = fields.length > 0 ? fields[0] : null;

  return {
    isEducation: true,
    degreeLevel,
    targetLevel: degreeLevel,
    fieldOfStudy,
    fields,
    isRelatedFieldAllowed,
    isOrHigherAllowed
  };
}

/**
 * Evaluates candidate education against education requirement.
 */
export function evaluateCandidateEducation(
  eduInfo: EducationRequirementInfo,
  candidateEducation: any[]
): { matches: boolean; partial: boolean; status: 'matched' | 'gap' | 'not_found'; evidence?: string } {
  if (!Array.isArray(candidateEducation) || candidateEducation.length === 0) {
    return { matches: false, partial: false, status: 'not_found' };
  }

  for (const edu of candidateEducation) {
    const degree = (edu.degree || edu.qualification || '').toLowerCase();
    const field = (edu.field_of_study || edu.field || '').toLowerCase();
    const school = edu.institution || edu.institution_name || '';

    // Check degree level
    let candidateLevel: 'bachelor' | 'master' | 'doctorate' | null = null;
    if (/\b(bachelor|bsc|b\.sc|ba|b\.a|beng|bcom|b\.com)\b/i.test(degree)) candidateLevel = 'bachelor';
    if (/\b(master|msc|m\.sc|mba|meng)\b/i.test(degree)) candidateLevel = 'master';
    if (/\b(phd|doctorate)\b/i.test(degree)) candidateLevel = 'doctorate';

    // Strict level check: A Master's/MBA degree alone does NOT satisfy a Bachelor's requirement
    // unless the job explicitly allows "or higher" / "or equivalent qualification"
    let levelSatisfied = false;
    if (!eduInfo.degreeLevel) {
      levelSatisfied = true;
    } else if (eduInfo.degreeLevel === 'bachelor') {
      if (candidateLevel === 'bachelor') {
        levelSatisfied = true;
      } else if (eduInfo.isOrHigherAllowed && (candidateLevel === 'master' || candidateLevel === 'doctorate')) {
        levelSatisfied = true;
      }
    } else if (eduInfo.degreeLevel === 'master') {
      if (candidateLevel === 'master' || (eduInfo.isOrHigherAllowed && candidateLevel === 'doctorate')) {
        levelSatisfied = true;
      }
    } else if (eduInfo.degreeLevel === 'doctorate') {
      if (candidateLevel === 'doctorate') {
        levelSatisfied = true;
      }
    }

    if (!levelSatisfied) continue;

    // Check field of study
    const checkFields = eduInfo.fields.length > 0 ? eduInfo.fields : (eduInfo.fieldOfStudy ? [eduInfo.fieldOfStudy] : []);
    if (checkFields.length === 0) {
      // General degree requirement (e.g. "Bachelor's degree required")
      return {
        matches: true,
        partial: false,
        status: 'matched',
        evidence: `${edu.degree || 'Degree'} from ${school || 'Accredited Institution'}`
      };
    }

    // Specific field required
    const candidateFieldNorm = normalizeConcept(field + ' ' + degree);
    const fieldMatch = checkFields.some(f => candidateFieldNorm.includes(f));

    if (fieldMatch) {
      return {
        matches: true,
        partial: false,
        status: 'matched',
        evidence: `${edu.degree || 'Degree'} in ${edu.field_of_study || field} (${school || 'Institution'})`
      };
    }

    // Related field allowed
    if (eduInfo.isRelatedFieldAllowed) {
      const relatedFields = ['accounting', 'finance', 'economics', 'business', 'commerce'];
      const techFields = ['computer science', 'information systems', 'information technology', 'software engineering'];

      const isCommerceReq = checkFields.some(f => relatedFields.includes(f));
      const isTechReq = checkFields.some(f => techFields.includes(f));

      const candidateHasCommerce = relatedFields.some(rf => candidateFieldNorm.includes(rf));
      const candidateHasTech = techFields.some(tf => candidateFieldNorm.includes(tf));

      if ((isCommerceReq && candidateHasCommerce) || (isTechReq && candidateHasTech)) {
        return {
          matches: true,
          partial: false,
          status: 'matched',
          evidence: `${edu.degree || 'Degree'} in ${edu.field_of_study || field} (related discipline) from ${school || 'Institution'}`
        };
      }
    }
  }

  return { matches: false, partial: false, status: 'not_found' };
}
