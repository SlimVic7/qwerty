/**
 * Controlled Concept Registry (QWERTY Stage 5.1 - Ruleset job-alignment-v1.3)
 * 
 * Version: concept-registry-v1
 * 
 * Provides deterministic semantic normalization, synonym equivalence,
 * and asymmetric parent/child relationships across cross-role domains:
 * - Audit, Risk & Compliance
 * - Cybersecurity & Information Security
 * - Networking & Infrastructure
 * - Cloud & DevOps
 * - Software Engineering
 * - Data & Analytics
 * - Finance & Accounting
 * - Business Operations & Management
 * 
 * Rules:
 * - Asymmetric specificity: Specific child satisfies broader parent,
 *   but broader concept NEVER satisfies specific child requirement.
 * - Related-but-not-equivalent concepts must never exact-match (e.g. AWS != Azure, CCNA != CISA).
 * - No fuzzy guessing: Unknown concepts fall back conservatively to explicit token matching.
 */

export const CONCEPT_REGISTRY_VERSION = 'concept-registry-v1';

/**
 * Exact synonym clusters. Each canonical key maps to its known synonyms and alternative forms.
 */
export const SYNONYM_CLUSTERS: Record<string, string[]> = {
  // --- Audit, Governance, Risk & Compliance ---
  'cisa': [
    'certified information systems auditor',
    'cisa certification',
    'cisa certified',
    'isaca cisa'
  ],
  'cism': [
    'certified information security manager',
    'cism certification',
    'isaca cism'
  ],
  'cissp': [
    'certified information systems security professional',
    'cissp certification',
    'isc2 cissp'
  ],
  'ccna': [
    'cisco certified network associate',
    'ccna certification',
    'cisco ccna'
  ],
  'ccnp': [
    'cisco certified network professional',
    'ccnp certification'
  ],
  'caats': [
    'computer assisted audit techniques',
    'computer aided audit techniques',
    'caat',
    'audit data analytics',
    'automated auditing tools'
  ],
  'cpa': [
    'certified public accountant',
    'cpa certified',
    'cpa qualification'
  ],
  'acca': [
    'association of chartered certified accountants',
    'acca qualified',
    'acca member'
  ],
  'it audit': [
    'information systems audit',
    'information systems auditor',
    'is audit',
    'technology audit',
    'itgc audit',
    'it general controls audit',
    'it audit and risk',
    'it auditor'
  ],
  'itgc': [
    'it general controls',
    'information technology general controls',
    'it general computer controls',
    'it controls'
  ],
  'auditing techniques': [
    'auditing techniques and processes',
    'audit techniques',
    'audit processes',
    'audit methodology',
    'audit procedures',
    'audit testing',
    'internal audit procedures',
    'current auditing techniques'
  ],
  'risk assessment': [
    'risk based assessment',
    'risk assessment and control',
    'identify risk',
    'assess risk',
    'address risk',
    'identify assess and address risk',
    'risk management',
    'risk and control assessment',
    'risk analysis',
    'risk based itgc'
  ],
  'control assessment': [
    'control testing',
    'internal controls testing',
    'controls assessment',
    'evaluating controls',
    'security control assessment',
    'controls testing',
    'itgc testing',
    'control evaluation'
  ],
  'information systems': [
    'information systems and operations',
    'information systems knowledge',
    'broad knowledge of information systems',
    'knowledge of information systems and operations',
    'it systems and operations',
    'information technology systems'
  ],
  'gathering and evaluating evidence': [
    'gathering analysing and evaluating information and evidence',
    'gathering analyzing and evaluating information and evidence',
    'evaluating information and evidence',
    'gathering and analysing evidence',
    'audit evidence evaluation',
    'evidence gathering and analysis',
    'information and evidence evaluation',
    'analytical audit work',
    'evidence evaluation'
  ],
  'presenting findings': [
    'presenting audit findings',
    'present audit findings',
    'reporting audit findings',
    'presenting findings to stakeholders',
    'communicating audit findings',
    'reporting findings to senior stakeholders',
    'presenting reports'
  ],
  'iso 27001': ['iso/iec 27001', 'iso 27001:2022', 'iso 27001:2013', 'isms'],
  'iso 42001': ['iso/iec 42001', 'iso 42001:2023', 'aims'],
  'cobit': ['control objectives for information and related technologies', 'cobit 2019', 'cobit 5'],
  'sox': ['sarbanes oxley', 'sarbanes-oxley', 'sox 404', 'sox compliance'],

  // --- Cloud & Infrastructure ---
  'aws': ['amazon web services', 'amazon aws'],
  'gcp': ['google cloud', 'google cloud platform'],
  'azure': ['microsoft azure'],
  'k8s': ['kubernetes'],
  'tcp/ip': ['tcp ip', 'tcp', 'ip networking', 'network protocols', 'tcp/udp', 'ip routing'],
  'cisco': ['cisco systems', 'cisco networking', 'cisco ios', 'cisco routers', 'cisco switches'],
  'fortinet': ['fortigate', 'fortios', 'fortinet firewall', 'fortinet firewalls'],
  'splunk': ['splunk enterprise', 'splunk siem'],
  'lan/wan': ['lan wan', 'local area network', 'wide area network'],
  'vpn': ['virtual private network', 'ipsec vpn', 'ssl vpn'],
  'firewall': ['firewalls', 'network firewall', 'next gen firewall', 'ngfw'],

  // --- Software & Web ---
  'react': ['reactjs', 'react.js'],
  'next': ['nextjs', 'next.js', 'next js'],
  'node': ['nodejs', 'node.js'],
  'ts': ['typescript'],
  'js': ['javascript'],
  'python': ['python 3', 'python programming'],
  'sql': ['postgresql', 'mysql', 'sqlite', 'structured query language'],
  'postgres': ['postgresql'],

  // --- Data & BI ---
  'power bi': ['powerbi', 'microsoft power bi'],
  'tableau': ['tableau desktop', 'tableau server'],

  // --- Finance & Accounting ---
  'financial analysis': ['financial data analysis', 'analysing financial data'],
  'financial modelling': ['financial modeling', 'financial model building', 'financial models'],
  'general ledger': ['gl', 'gl accounting'],
  'financial reporting': ['statutory reporting', 'financial statements preparation']
};

/**
 * Asymmetric Parent-Child Relationships:
 * Specific Child satisfies Broader Parent, but Broader Parent NEVER satisfies Specific Child.
 * Format: parentConcept -> list of child concepts that satisfy it.
 */
export const ASYMMETRIC_PARENT_CONCEPTS: Record<string, string[]> = {
  // Broad Cloud Platform requirement satisfied by specific cloud platforms
  'cloud platform': ['aws', 'azure', 'gcp', 'google cloud', 'amazon web services', 'microsoft azure'],
  'cloud': ['aws', 'azure', 'gcp', 'google cloud', 'amazon web services', 'microsoft azure'],
  'cloud services': ['aws', 'azure', 'gcp', 'google cloud', 'amazon web services', 'microsoft azure'],

  // Broad Information Security / Governance Certification requirement
  'information security certification': ['cisa', 'cism', 'cissp', 'security+', 'certified information systems auditor', 'certified information security manager'],
  'relevant information security certification': ['cisa', 'cism', 'cissp', 'security+', 'certified information systems auditor', 'certified information security manager'],
  'security certification': ['cisa', 'cism', 'cissp', 'security+', 'ccna security'],
  'it governance certification': ['cisa', 'cism', 'crisc', 'cgeit'],

  // Broad Accounting / Finance Certification requirement
  'accounting qualification': ['cpa', 'acca', 'ca', 'chartered accountant', 'certified public accountant'],
  'accounting certification': ['cpa', 'acca', 'ca', 'chartered accountant', 'certified public accountant'],
  'professional accounting qualification': ['cpa', 'acca', 'ca'],

  // Broad Networking Certification requirement
  'networking certification': ['ccna', 'ccnp', 'network+'],
  'network certification': ['ccna', 'ccnp', 'network+'],

  // Broad Database requirement
  'relational database': ['postgresql', 'mysql', 'sql server', 'oracle', 'sqlite', 'postgres', 'sql'],
  'sql database': ['postgresql', 'mysql', 'sql server', 'oracle', 'sqlite', 'postgres', 'sql'],

  // Broad Frontend requirement
  'frontend framework': ['react', 'vue', 'angular', 'svelte'],
  'frontend library': ['react', 'vue', 'angular'],

  // Broad Programming Language requirement
  'programming language': ['python', 'typescript', 'javascript', 'go', 'java', 'c++', 'c#', 'rust', 'ruby'],

  // Broad BI Tool requirement
  'business intelligence tool': ['power bi', 'tableau', 'looker', 'qlik'],
  'bi tool': ['power bi', 'tableau', 'looker', 'qlik'],

  // Broad ERP / Accounting Systems requirement
  'erp systems': ['sap', 'sap erp', 'sap s 4hana', 'sap s4hana', 'oracle erp', 'oracle financials', 'netsuite', 'microsoft dynamics'],
  'erp': ['sap', 'sap erp', 'sap s 4hana', 'sap s4hana', 'oracle erp', 'oracle financials', 'netsuite', 'microsoft dynamics'],

  // Audit, Risk, and Information Systems broader categories
  'auditing techniques': [
    'cisa',
    'it audit',
    'information systems audit',
    'information systems auditor',
    'itgc audit',
    'it general controls',
    'internal audit',
    'internal auditing',
    'audit testing',
    'caats',
    'computer assisted audit techniques',
    'data analytics audit sampling',
    'audit sampling'
  ],
  'auditing techniques and processes': [
    'cisa',
    'it audit',
    'information systems audit',
    'information systems auditor',
    'itgc audit',
    'it general controls',
    'internal audit',
    'internal auditing',
    'audit testing',
    'caats',
    'computer assisted audit techniques',
    'data analytics audit sampling',
    'audit sampling'
  ],
  'ability to identify assess and address risk': [
    'risk assessment',
    'risk based assessment',
    'risk-based itgc',
    'risk based itgc work',
    'control assessment',
    'control testing',
    'information security controls',
    'information-security control assessment',
    'itgc controls',
    'cisa'
  ],
  'information systems and operations': [
    'information systems auditor',
    'information systems audit',
    'it audit',
    'it systems',
    'itgc',
    'technology controls',
    'cisa'
  ],
  'knowledge of information systems and operations': [
    'information systems auditor',
    'information systems audit',
    'it audit',
    'it systems',
    'itgc',
    'technology controls',
    'cisa'
  ],
  'broad knowledge of information systems and operations': [
    'information systems auditor',
    'information systems audit',
    'it audit',
    'it systems',
    'itgc',
    'technology controls',
    'cisa'
  ]
};

/**
 * Related but distinct pairs that must NEVER be treated as equivalents.
 */
export const NON_EQUIVALENT_PAIRS: [string, string][] = [
  ['aws', 'azure'],
  ['aws', 'gcp'],
  ['azure', 'gcp'],
  ['cisa', 'cissp'],
  ['cisa', 'cism'],
  ['cisa', 'ccna'],
  ['cisa', 'cpa'],
  ['ccna', 'cissp'],
  ['financial analysis', 'financial modelling'],
  ['financial modeling', 'financial analysis'],
  ['network security', 'network engineering'],
  ['react', 'javascript'],
  ['sql', 'python']
];

/**
 * Known domain keywords for qualifying experience in domain-qualified requirements.
 */
export const CONTROLLED_DOMAIN_KEYWORDS: Record<string, string[]> = {
  'network': [
    'network', 'networking', 'network engineer', 'network engineering', 'network administrator',
    'network architect', 'lan wan', 'cisco', 'ccna', 'ccnp', 'tcp ip', 'firewall', 'vpn', 'router', 'switch'
  ],
  'cybersecurity': [
    'cybersecurity', 'cyber security', 'information security', 'infosec', 'soc', 'siem',
    'penetration testing', 'incident response', 'vulnerability management', 'cism', 'cissp', 'security operations'
  ],
  'audit': [
    'audit', 'auditor', 'it audit', 'internal audit', 'information systems audit',
    'is audit', 'itgc', 'cisa', 'internal controls', 'compliance audit', 'sox audit'
  ],
  'cloud': [
    'cloud', 'aws', 'azure', 'gcp', 'cloud architect', 'cloud engineer', 'devops', 'kubernetes'
  ],
  'software': [
    'software engineer', 'software development', 'developer', 'frontend', 'backend',
    'full stack', 'react', 'python', 'java', 'node', 'typescript'
  ],
  'data': [
    'data analyst', 'data analytics', 'data scientist', 'data science', 'sql',
    'business intelligence', 'power bi', 'tableau', 'etl', 'data warehouse'
  ],
  'finance': [
    'financial analyst', 'finance', 'financial reporting', 'financial analysis',
    'financial modelling', 'financial planning', 'corporate finance'
  ],
  'accounting': [
    'accountant', 'accounting', 'cpa', 'general ledger', 'gaap', 'financial reporting', 'accounts payable'
  ]
};

/**
 * Normalizes text for concept matching.
 */
export function normalizeConcept(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if two concepts are directly equivalent via the synonym registry.
 */
export function areConceptsEquivalent(conceptA: string, conceptB: string): boolean {
  const normA = normalizeConcept(conceptA);
  const normB = normalizeConcept(conceptB);

  if (!normA || !normB) return false;
  if (normA === normB) return true;

  // Check explicit non-equivalent pairs
  for (const [x, y] of NON_EQUIVALENT_PAIRS) {
    if ((normA.includes(x) && normB.includes(y)) || (normA.includes(y) && normB.includes(x))) {
      return false;
    }
  }

  // Check synonym clusters
  for (const [canonical, aliases] of Object.entries(SYNONYM_CLUSTERS)) {
    const canonicalRegex = new RegExp(`(?:^|\\s)${canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$)`, 'i');
    const aMatches = normA === canonical || canonicalRegex.test(normA) || aliases.some(alias => normA === alias || normA.includes(alias));
    const bMatches = normB === canonical || canonicalRegex.test(normB) || aliases.some(alias => normB === alias || normB.includes(alias));
    if (aMatches && bMatches) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a candidate concept satisfies a job criterion via asymmetric parent-child hierarchy.
 * (Candidate child concept satisfies broader job parent criterion, but not vice-versa).
 */
export function satisfiesAsymmetricHierarchy(criterionText: string, candidateEvidenceText: string): boolean {
  const normCrit = normalizeConcept(criterionText);
  const normEv = normalizeConcept(candidateEvidenceText);

  if (!normCrit || !normEv) return false;

  // Check all asymmetric parent concepts
  for (const [parent, children] of Object.entries(ASYMMETRIC_PARENT_CONCEPTS)) {
    // If criterion mentions or matches parent concept
    const critMatchesParent = normCrit === parent || normCrit.includes(parent);
    if (critMatchesParent) {
      // Check if candidate evidence contains any of the child concepts
      const evMatchesChild = children.some(child => {
        const regex = new RegExp(`(?:^|\\s)${child.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$)`);
        return regex.test(normEv);
      });
      if (evMatchesChild) {
        return true;
      }
    }
  }

  return false;
}
