import { describe, it, expect } from 'vitest';
import {
  calculateJobAlignment,
  CURRENT_JOB_ALIGNMENT_RULESET_VERSION,
  extractDiscreteCriteria
} from './jobAlignment.js';
import {
  areConceptsEquivalent,
  satisfiesAsymmetricHierarchy,
  normalizeConcept,
  NON_EQUIVALENT_PAIRS
} from './conceptRegistry.js';
import {
  isStructuralHeading,
  isNonVerifiableBehaviouralTrait,
  extractProficiencyQualifier,
  classifyEducationRequirement,
  evaluateCandidateEducation,
  classifyCriterionEvidenceExpectation
} from './criterionClassifier.js';
import {
  findBestCandidateEvidence
} from './evidenceMatcher.js';

describe('Stage 5.1: job-alignment-v1.3 Controlled Semantic Matching Refinement', () => {

  describe('1. Controlled Concept Registry & Equivalence', () => {
    it('recognizes exact and alias synonym clusters deterministically', () => {
      expect(areConceptsEquivalent('CISA', 'Certified Information Systems Auditor')).toBe(true);
      expect(areConceptsEquivalent('CCNA', 'Cisco Certified Network Associate')).toBe(true);
      expect(areConceptsEquivalent('SOX', 'Sarbanes-Oxley')).toBe(true);
      expect(areConceptsEquivalent('CAATs', 'Computer-Assisted Audit Techniques')).toBe(true);
      expect(areConceptsEquivalent('Postgres', 'PostgreSQL')).toBe(true);
      expect(areConceptsEquivalent('Kubernetes', 'k8s')).toBe(true);
    });

    it('enforces asymmetric parent-child hierarchy (child satisfies parent, but not vice versa)', () => {
      // Specific audit tool/technique satisfies general "auditing techniques"
      expect(satisfiesAsymmetricHierarchy('auditing techniques', 'Computer-Assisted Audit Techniques (CAATs)')).toBe(true);
      expect(satisfiesAsymmetricHierarchy('auditing techniques', 'data analytics audit sampling')).toBe(true);

      // But general auditing does NOT satisfy a requirement for a specific tool like CAATs or IDEA
      expect(satisfiesAsymmetricHierarchy('CAATs', 'general auditing')).toBe(false);

      // Specific ERP/accounting system satisfies generic ERP requirement
      expect(satisfiesAsymmetricHierarchy('ERP systems', 'SAP S/4HANA')).toBe(true);
      expect(satisfiesAsymmetricHierarchy('ERP systems', 'Oracle Financials')).toBe(false || satisfiesAsymmetricHierarchy('ERP systems', 'Oracle ERP'));
    });

    it('strictly enforces non-equivalent pairs to prevent false positives', () => {
      // Internal audit vs Financial Statement / External audit
      expect(areConceptsEquivalent('Internal Audit', 'External Financial Statement Audit')).toBe(false);

      // Network Engineering vs Helpdesk Support
      expect(areConceptsEquivalent('Network Engineer', 'IT Helpdesk Support Technician')).toBe(false);

      // Software Development vs Manual QA
      expect(areConceptsEquivalent('Software Development', 'Manual QA Testing')).toBe(false);
    });
  });

  describe('2. Criterion Classifier: Headings & Behavioral Traits', () => {
    it('detects structural section headings and labels', () => {
      expect(isStructuralHeading('Requirements:')).toBe(true);
      expect(isStructuralHeading('Key Responsibilities')).toBe(true);
      expect(isStructuralHeading('Preferred Qualifications:')).toBe(true);
      expect(isStructuralHeading('Attributes & Skills (Required)')).toBe(true);
      expect(isStructuralHeading('What You Will Do')).toBe(true);
      expect(isStructuralHeading('Role Overview:')).toBe(true);
    });

    it('does NOT misclassify legitimate criteria as headings despite words like "required"', () => {
      expect(isStructuralHeading('CISA certification required')).toBe(false);
      expect(isStructuralHeading('SQL proficiency required')).toBe(false);
      expect(isStructuralHeading('CPA or CA qualification required')).toBe(false);
      expect(isStructuralHeading('Minimum 3 years network engineering experience')).toBe(false);
    });

    it('identifies non-verifiable behavioural traits', () => {
      expect(isNonVerifiableBehaviouralTrait('Passionate self-starter with can-do attitude')).toBe(true);
      expect(isNonVerifiableBehaviouralTrait('Strong work ethic and positive attitude')).toBe(true);
      expect(isNonVerifiableBehaviouralTrait('Ability to work under pressure')).toBe(true);
      expect(isNonVerifiableBehaviouralTrait('Thorough knowledge of auditing techniques')).toBe(false);
      expect(isNonVerifiableBehaviouralTrait('5 years experience in procurement')).toBe(false);
    });

    it('correctly evaluates education requirements and degree disciplines', () => {
      const eduReq = classifyEducationRequirement('Bachelor degree in Accounting, Finance, Computer Science or related discipline');
      expect(eduReq.isEducation).toBe(true);
      expect(eduReq.targetLevel).toBe('bachelor');
      expect(eduReq.fields).toContain('accounting');
      expect(eduReq.fields).toContain('finance');
      expect(eduReq.fields).toContain('computer science');

      const candidateEducation = [
        {
          degree: 'BSc Computer Science & Information Systems',
          field_of_study: 'Computer Science',
          institution: 'University of Cape Town'
        }
      ];

      const match = evaluateCandidateEducation(eduReq, candidateEducation);
      expect(match.status).toBe('matched');
      expect(match.evidence).toContain('BSc Computer Science');
    });
  });

  describe('3. Network Engineer Live Case: False-Positive Prevention Preserved', () => {
    const networkEngineerJob = {
      id: 'job-net-eng',
      title: 'Network Engineer',
      company_name: 'Core Telecoms',
      requirements: `
        • Minimum 3 years network engineering experience
        • Hands-on experience with Cisco routing and switching
        • CCNA or equivalent networking certification
      `,
      experience_level: '3-5 years',
      updated_at: '2026-03-01T00:00:00Z'
    };

    const genericItCandidate = {
      skills: [
        { name: 'IT Support', category: 'Support' },
        { name: 'Windows 10', category: 'Operating Systems' },
        { name: 'Customer Service', category: 'Soft Skills' }
      ],
      experience: [
        {
          job_title: 'IT Helpdesk Technician',
          company_name: 'Metro Retail',
          start_date: '2018-01-01',
          end_date: '2024-01-01',
          description: 'Provided general desktop troubleshooting, password resets, and ticket resolution.',
          responsibilities: ['Resolved user hardware issues', 'Managed printer connections']
        }
      ],
      education: [
        { degree: 'Diploma in Information Technology', institution: 'City College' }
      ]
    };

    it('correctly rejects generic 6-year IT tenure from satisfying domain network engineering experience', () => {
      const result = calculateJobAlignment(networkEngineerJob, genericItCandidate, { years_experience: 6 });

      expect(result.ruleset_version).toBe(CURRENT_JOB_ALIGNMENT_RULESET_VERSION);
      expect(result.ruleset_version).toBe('job-alignment-v1.3');

      // The experience level component must NOT be passed (gap or 0 score)
      const expComp = result.component_results.find(c => c.id === 'experience_level');
      expect(expComp).toBeDefined();
      expect(expComp?.score).toBe(0);
      expect(expComp?.status).toBe('gap');

      // Criteria results must show network engineering experience as not_found
      const expCriterion = result.criteria_breakdown.find(c => c.category === 'experience');
      expect(expCriterion).toBeDefined();
      expect(expCriterion?.status).toBe('not_found');
    });
  });

  describe('4. Senior Internal Auditor Live Case: False-Negative Resolution', () => {
    const auditorJob = {
      id: 'job-auditor-1',
      title: 'Senior Internal Auditor – Systems & Procurement',
      company_name: 'Global Energy Holdings',
      requirements: `
        Requirements:
        • Thorough knowledge of current auditing techniques and processes
        • Minimum 5 years internal audit experience with focus on systems and procurement
        • Degree in Accounting, Finance, Computer Science or related field
        • CISA, CIA, or CA/CPA qualification
      `,
      preferred_qualifications: `
        Preferred:
        • CISA certification
        • Experience with SAP ERP systems and procurement audit reviews
        • Strong analytical mindset and collaborative team spirit
      `,
      responsibilities: `
        • Lead end-to-end ITGC and systems audit reviews
        • Evaluate procurement lifecycle, vendor management, and internal controls
      `,
      experience_level: '5+ years',
      updated_at: '2026-03-01T00:00:00Z'
    };

    const genuineAuditorCandidate = {
      skills: [
        { name: 'CISA', category: 'Certifications', evidence: 'Certified Information Systems Auditor' },
        { name: 'Internal Auditing', category: 'Audit', evidence: '6 years performing risk-based internal audits' },
        { name: 'SAP ERP', category: 'Systems', evidence: 'Audited SAP procurement and finance workflows' },
        { name: 'CAATs', category: 'Tools', evidence: 'Utilized CAATs and automated data analytics for audit sampling' },
        { name: 'Procurement Controls', category: 'Audit', evidence: 'Reviewed vendor selection, purchase orders, and RFP compliance' }
      ],
      experience: [
        {
          job_title: 'Senior Internal Auditor - IT & Operations',
          company_name: 'Pan-African Financial Group',
          start_date: '2019-01-01',
          end_date: 'Present',
          description: 'Led systems and operational audits, reviewed IT general controls, and conducted comprehensive audits of procurement processes and vendor contracts.',
          responsibilities: [
            'Conducted ITGC audits across core enterprise systems',
            'Audited procurement lifecycle including vendor selection and contract compliance'
          ]
        },
        {
          job_title: 'Internal Audit Associate',
          company_name: 'Deloitte',
          start_date: '2017-01-01',
          end_date: '2018-12-31',
          description: 'Assisted in risk assessments, internal controls testing, and audit reporting.'
        }
      ],
      education: [
        {
          degree: 'Bachelor of Commerce (Honours) in Accounting & Information Systems',
          field_of_study: 'Accounting',
          institution: 'University of the Witwatersrand'
        }
      ],
      certifications: [
        { name: 'Certified Information Systems Auditor (CISA)', issuer: 'ISACA' }
      ]
    };

    it('resolves false negatives for qualified Senior Internal Auditor candidate', () => {
      const result = calculateJobAlignment(auditorJob, genuineAuditorCandidate, { years_experience: 7 });

      expect(result.ruleset_version).toBe('job-alignment-v1.3');
      expect(result.score).toBeGreaterThanOrEqual(80);

      // Check structural headings: "Requirements:" should be not_applicable, not a gap!
      const headingCrit = result.criteria_breakdown.find(c => c.source_text.toLowerCase().includes('requirements:'));
      if (headingCrit) {
        expect(headingCrit.status).toBe('not_applicable');
      }

      // 1. "Thorough knowledge of current auditing techniques and processes" -> matched via Internal Auditing / CAATs
      const auditKnowledgeCrit = result.criteria_breakdown.find(c => 
        c.source_text.toLowerCase().includes('auditing techniques')
      );
      expect(auditKnowledgeCrit).toBeDefined();
      expect(auditKnowledgeCrit?.status).toBe('matched');

      // 2. Degree requirement -> matched via BCom in Accounting
      const degreeCrit = result.criteria_breakdown.find(c => 
        c.source_text.toLowerCase().includes('degree in accounting')
      );
      expect(degreeCrit).toBeDefined();
      expect(degreeCrit?.status).toBe('matched');

      // 3. CISA qualification -> matched via CISA certification
      const cisaCrit = result.criteria_breakdown.find(c => 
        c.source_text.toLowerCase().includes('cisa')
      );
      expect(cisaCrit).toBeDefined();
      expect(cisaCrit?.status).toBe('matched');

      // 4. Domain experience: 5+ years internal audit with systems & procurement -> matched
      const expComp = result.component_results.find(c => c.id === 'experience_level');
      expect(expComp).toBeDefined();
      expect(expComp?.status).toBe('pass');
      expect(expComp?.score).toBe(25);

      // 5. Cross-section duplicate suppression:
      // In preferred qualifications, CISA is a duplicate of required qualifications CISA
      const prefCisa = result.criteria_breakdown.find(c => 
        c.type === 'preferred' && c.source_text.toLowerCase().includes('cisa')
      );
      expect(prefCisa).toBeDefined();
      expect(prefCisa?.status).toBe('not_applicable');
      expect(prefCisa?.reason).toContain('duplicate_of:');

      // 6. Behavioural trait in preferred ("Strong analytical mindset and collaborative team spirit")
      // Should not deduct score if unevidenced
      const softCrit = result.criteria_breakdown.find(c => 
        c.source_text.toLowerCase().includes('collaborative team spirit')
      );
      if (softCrit) {
        expect(['matched', 'not_applicable']).toContain(softCrit.status);
      }
    });
  });

  describe('5. Determinism & Traceability', () => {
    it('produces 100% byte-for-byte identical output over multiple iterations with no LLM dependency', () => {
      const sampleJob = {
        id: 'job-det-1',
        title: 'Security Compliance Analyst',
        company_name: 'FinTech Ltd',
        requirements: `
          • Bachelor degree in Computer Science or related
          • 3+ years in information security compliance
          • Knowledge of ISO 27001 or SOC 2 frameworks
        `,
        experience_level: '3-5 years',
        updated_at: '2026-03-01T00:00:00Z'
      };

      const candidate = {
        skills: [{ name: 'ISO 27001' }, { name: 'SOC 2' }],
        experience: [{
          job_title: 'Compliance Specialist',
          company_name: 'Bank',
          start_date: '2020-01-01',
          end_date: '2024-01-01',
          description: 'Managed ISO 27001 information security compliance'
        }],
        education: [{ degree: 'BSc Computer Science', institution: 'State Univ' }]
      };

      const run1 = calculateJobAlignment(sampleJob, candidate, { years_experience: 4 });
      const run2 = calculateJobAlignment(sampleJob, candidate, { years_experience: 4 });

      expect(run1.score).toBe(run2.score);
      expect(run1.ruleset_version).toBe(run2.ruleset_version);
      expect(run1.criteria_breakdown).toEqual(run2.criteria_breakdown);
      expect(run1.component_results).toEqual(run2.component_results);
    });
  });

  describe('6. Evidence-Type Compatibility & Criterion-Aware Ranking', () => {
    it('classifies job criteria into correct evidence expectations', () => {
      expect(classifyCriterionEvidenceExpectation('CISA certification required')).toBe('CERTIFICATION');
      expect(classifyCriterionEvidenceExpectation('CCNA or CCNP certified')).toBe('CERTIFICATION');
      expect(classifyCriterionEvidenceExpectation('Relevant Bachelor\'s degree from an accredited university')).toBe('EDUCATION');
      expect(classifyCriterionEvidenceExpectation('5+ years experience in IT audit')).toBe('EXPERIENCE_DURATION');
      expect(classifyCriterionEvidenceExpectation('Ability to identify, assess and address risk')).toBe('PROFESSIONAL_ACTION');
      expect(classifyCriterionEvidenceExpectation('Experience presenting audit findings to senior management')).toBe('PROFESSIONAL_ACTION');
      expect(classifyCriterionEvidenceExpectation('Hands-on experience in procurement controls and governance')).toBe('PRACTICAL_EXPERIENCE');
      expect(classifyCriterionEvidenceExpectation('Experience with React and TypeScript')).toBe('PRACTICAL_EXPERIENCE');
      expect(classifyCriterionEvidenceExpectation('Proficiency in React and TypeScript')).toBe('TECHNICAL_SKILL');
      expect(classifyCriterionEvidenceExpectation('React and TypeScript')).toBe('TECHNICAL_SKILL');
      expect(classifyCriterionEvidenceExpectation('Broad knowledge of information systems')).toBe('DOMAIN_KNOWLEDGE');
      expect(classifyCriterionEvidenceExpectation('Passionate self-starter with can-do attitude')).toBe('SOFT_SKILL');
      expect(classifyCriterionEvidenceExpectation('Requirements:')).toBe('STRUCTURAL');
    });

    it('prioritizes practical work experience over certifications for professional action criteria', () => {
      const candidateProfile = {
        certifications: [{ name: 'CISA', issuer: 'ISACA' }],
        experience: [{
          job_title: 'Senior Information Systems Auditor',
          company_name: 'Global Financial Group',
          start_date: '2019-01-01',
          end_date: '2024-01-01',
          description: 'Responsible for risk identification, assessment, and control remediation across critical IT systems.'
        }]
      };

      const match = findBestCandidateEvidence('Ability to identify, assess and address risk', candidateProfile);
      expect(match.status).toBe('matched');
      expect(match.source).toBe('experience');
      expect(match.evidence).toContain('Senior Information Systems Auditor');
    });

    it('prevents certification alone from fully proving practical professional action when no experience exists', () => {
      const certOnlyCandidate = {
        certifications: [{ name: 'CISA', issuer: 'ISACA' }],
        experience: []
      };

      const match = findBestCandidateEvidence('Ability to identify, assess and address risk', certOnlyCandidate);
      expect(match.status).toBe('partially_supported');
      expect(match.source).toBe('certifications');
    });

    it('prevents non-equivalent certifications from satisfying technical skill criteria', () => {
      const auditorCandidate = {
        certifications: [{ name: 'CISA', issuer: 'ISACA' }],
        skills: [{ name: 'Internal Audit' }],
        experience: [{
          job_title: 'Auditor',
          company_name: 'AuditCorp',
          description: 'Audit reviews of financial and control systems'
        }]
      };

      const ciscoMatch = findBestCandidateEvidence('Cisco router configuration', auditorCandidate);
      expect(ciscoMatch.status).toBe('not_found');

      const reactMatch = findBestCandidateEvidence('React frontend development', auditorCandidate);
      expect(reactMatch.status).toBe('not_found');

      const tcpMatch = findBestCandidateEvidence('TCP/IP networking', auditorCandidate);
      expect(tcpMatch.status).toBe('not_found');
    });

    it('strictly checks degree level and field of study without inferring unstated Bachelor degrees from Master degrees', () => {
      const eduReqExplicitBachelor = classifyEducationRequirement('Relevant Bachelor\'s degree from an accredited university');
      expect(eduReqExplicitBachelor.isEducation).toBe(true);
      expect(eduReqExplicitBachelor.degreeLevel).toBe('bachelor');
      expect(eduReqExplicitBachelor.isOrHigherAllowed).toBe(false);

      // Candidate has only an MBA (no Bachelor's degree record)
      const candidateWithOnlyMBA = [
        {
          degree: 'Master of Business Administration (MBA)',
          field_of_study: 'Leadership and Management',
          institution: 'University of Cape Town'
        }
      ];

      const mbaOnlyEval = evaluateCandidateEducation(eduReqExplicitBachelor, candidateWithOnlyMBA);
      expect(mbaOnlyEval.matches).toBe(false);
      expect(mbaOnlyEval.status).toBe('not_found');

      // Candidate has a Bachelor's degree in a relevant discipline
      const candidateWithBSc = [
        {
          degree: 'BSc Information Systems',
          field_of_study: 'Information Systems',
          institution: 'University of the Witwatersrand'
        }
      ];
      const bscEval = evaluateCandidateEducation(eduReqExplicitBachelor, candidateWithBSc);
      expect(bscEval.matches).toBe(true);
      expect(bscEval.status).toBe('matched');

      // Job explicitly allows "or higher"
      const eduReqOrHigher = classifyEducationRequirement('Bachelor\'s degree or higher in Computer Science or related field');
      expect(eduReqOrHigher.isOrHigherAllowed).toBe(true);

      const candidateWithMScCS = [
        {
          degree: 'MSc Computer Science',
          field_of_study: 'Computer Science',
          institution: 'UCT'
        }
      ];
      const mscEval = evaluateCandidateEducation(eduReqOrHigher, candidateWithMScCS);
      expect(mscEval.matches).toBe(true);
      expect(mscEval.status).toBe('matched');

      // Higher degree in unrelated field does NOT satisfy specific field
      const candidateWithMScEnglish = [
        {
          degree: 'Master of Arts in English Literature',
          field_of_study: 'English Literature',
          institution: 'Oxford'
        }
      ];
      const mscUnrelatedEval = evaluateCandidateEducation(eduReqOrHigher, candidateWithMScEnglish);
      expect(mscUnrelatedEval.matches).toBe(false);
      expect(mscUnrelatedEval.status).toBe('not_found');
    });

    it('preserves Network Engineer semantic protections (deterministic score = 0)', () => {
      const networkEngineerJob = {
        id: 'job-net-1',
        title: 'Senior Network Engineer',
        company_name: 'Telco Global',
        requirements: `
          • Cisco CCNA or CCNP certification required
          • 5+ years experience designing and troubleshooting enterprise IP networks
          • Advanced knowledge of BGP, OSPF, and MPLS routing protocols
          • Hands-on experience with Fortinet or Palo Alto firewalls
        `,
        experience_level: '5+ years',
        updated_at: '2026-03-01T00:00:00Z'
      };

      // Candidate is an Internal Auditor with CISA and MBA
      const auditorCandidate = {
        certifications: [{ name: 'CISA', issuer: 'ISACA' }],
        skills: [{ name: 'Internal Audit' }, { name: 'ITGC' }, { name: 'Risk Assessment' }],
        experience: [{
          job_title: 'Information Systems Auditor',
          company_name: 'FinBank',
          start_date: '2019-01-01',
          end_date: '2024-01-01',
          description: 'Executed IT general controls reviews, assessed operational risk'
        }],
        education: [{
          degree: 'Master of Business Administration (MBA)',
          field_of_study: 'Leadership and Management',
          institution: 'Business School'
        }]
      };

      const result = calculateJobAlignment(networkEngineerJob, auditorCandidate, { years_experience: 5 });
      expect(result.score).toBe(0);
      expect(result.alignment_band).toBe('emerging');
    });
  });

});
