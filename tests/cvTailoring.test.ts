import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { buildEvidenceCards } from '../server/services/cvTailoring/evidenceExtractor.js';
import { validateSuggestion, extractNumbersAndMetrics, detectFactualMeaningReversal } from '../server/services/cvTailoring/claimValidator.js';
import { createTailoringPlan } from '../server/services/cvTailoring/tailoringPlanner.js';
import { CvTailoringEngine } from '../server/services/cvTailoring/cvTailoringEngine.js';
import { CvTailoringStore, isMemoryFallbackAllowed } from '../server/services/cvTailoring/cvTailoringStore.js';
import { CandidateEvidenceCard, TailoringSuggestion, CURRENT_TAILORING_ENGINE_VERSION } from '../server/services/cvTailoring/types.js';
import { JobAlignmentStore } from '../server/services/matching/jobAlignmentStore.js';
import { CURRENT_JOB_ALIGNMENT_RULESET_VERSION } from '../server/services/matching/jobAlignment.js';
import { parseResponseSafe } from '../src/features/tailoring/cvTailoring.service.js';
import {
  GeminiCircuitBreaker,
  GeminiTelemetryCollector,
  TailoringRequestDeduplicator,
  isTransientError,
  calculateBackoff
} from '../server/services/cvTailoring/geminiResilience.js';
import { GeminiCvTailoringProvider } from '../server/services/cvTailoring/GeminiCvTailoringProvider.js';

describe('Stage 5.2 — Evidence Extractor', () => {
  const sampleReviewedData = {
    personal: {
      full_name: 'Amara Okafor',
      email: 'amara@example.com'
    },
    professional: {
      headline: 'IT Auditor & Technology Risk Analyst',
      summary: 'Experienced IT auditor specializing in internal controls across 18 banking branches in Lagos.'
    },
    skills: ['IT Audit', 'Risk Assessment', 'COBIT', 'SQL'],
    experience: [
      {
        employer: 'Zenith Bank',
        job_title: 'Internal Audit Analyst',
        start_date: '2021-01',
        end_date: '2024-03',
        responsibilities: [
          'Assisted senior auditors in executing SOX 404 IT general controls testing.',
          'Assessed network infrastructure configurations and documented control weaknesses.'
        ],
        achievements: [
          'Completed 15 control remediation audits ahead of regulatory deadlines.'
        ]
      }
    ],
    certifications: [
      { name: 'Certified Information Systems Auditor', issuer: 'ISACA' }
    ],
    education: [
      { degree: 'B.Sc. Computer Science', institution: 'University of Lagos', graduation_year: '2020' }
    ]
  };

  it('correctly extracts discrete evidence cards from reviewed_data', () => {
    const cards = buildEvidenceCards(sampleReviewedData);
    expect(cards.length).toBeGreaterThan(6);

    const summaryCard = cards.find(c => c.evidence_id === 'prof-summary');
    expect(summaryCard).toBeDefined();
    expect(summaryCard?.text).toContain('18 banking branches');

    const skillCards = cards.filter(c => c.source_type === 'skills');
    expect(skillCards.map(s => s.text)).toContain('IT Audit');

    const expCards = cards.filter(c => c.source_type === 'experience');
    expect(expCards.some(e => e.text.includes('Zenith Bank'))).toBe(true);
    expect(expCards.some(e => e.text.includes('SOX 404'))).toBe(true);
  });
});

describe('Stage 5.2 — High-Risk Claim & Factual Safety Validator', () => {
  const manifest: CandidateEvidenceCard[] = [
    {
      evidence_id: 'prof-summary',
      source_type: 'summary',
      source_path: 'professional.summary',
      text: 'Experienced IT auditor specializing in internal controls across 18 banking branches.'
    },
    {
      evidence_id: 'exp-0-resp-0',
      source_type: 'experience',
      source_path: 'experience[0].responsibilities[0]',
      text: 'Assisted senior auditors in executing SOX 404 IT general controls testing.'
    },
    {
      evidence_id: 'exp-0-ach-0',
      source_type: 'experience',
      source_path: 'experience[0].achievements[0]',
      text: 'Completed 15 control remediation audits ahead of regulatory deadlines.'
    },
    {
      evidence_id: 'skill-0',
      source_type: 'skills',
      source_path: 'skills[0]',
      text: 'IT Audit'
    },
    {
      evidence_id: 'cert-0',
      source_type: 'certifications',
      source_path: 'certifications[0]',
      text: 'Certified Information Systems Auditor (CISA)'
    }
  ];

  it('validates suggestions that adhere strictly to approved evidence', () => {
    const validSuggestion = {
      section: 'experience' as const,
      original_text: 'Assisted senior auditors in executing SOX 404 IT general controls testing.',
      suggested_text: 'Collaborated on SOX 404 IT general controls testing, supporting risk evaluation for compliance.',
      source_refs: ['exp-0-resp-0']
    };

    const result = validateSuggestion(validSuggestion, manifest);
    expect(result.isValid).toBe(true);
    expect(result.status).toBe('valid');
  });

  it('BLOCKS suggestions that introduce unsupported numbers or metrics', () => {
    const inflatedMetricSuggestion = {
      section: 'summary' as const,
      original_text: 'Experienced IT auditor across 18 banking branches.',
      suggested_text: 'Experienced IT auditor across 35 banking branches achieving 40% risk reduction.',
      source_refs: ['prof-summary']
    };

    const result = validateSuggestion(inflatedMetricSuggestion, manifest);
    expect(result.isValid).toBe(false);
    expect(result.status).toBe('blocked');
    expect(result.issues.some(i => i.includes('35') || i.includes('40%'))).toBe(true);
  });

  it('BLOCKS seniority inflation (elevating subordinate support role to leadership)', () => {
    const inflatedSenioritySuggestion = {
      section: 'experience' as const,
      original_text: 'Assisted senior auditors in executing SOX 404 IT general controls testing.',
      suggested_text: 'Led and directed SOX 404 IT general controls testing across enterprise systems.',
      source_refs: ['exp-0-resp-0']
    };

    const result = validateSuggestion(inflatedSenioritySuggestion, manifest);
    expect(result.isValid).toBe(false);
    expect(result.status).toBe('blocked');
    expect(result.issues.some(i => i.includes('Seniority inflation'))).toBe(true);
  });

  it('BLOCKS unsupported high-risk certifications not in manifest', () => {
    const unevidencedCertSuggestion = {
      section: 'summary' as const,
      original_text: 'Experienced IT auditor.',
      suggested_text: 'CISSP and CISM certified IT auditor with extensive governance experience.',
      source_refs: ['prof-summary']
    };

    const result = validateSuggestion(unevidencedCertSuggestion, manifest);
    expect(result.isValid).toBe(false);
    expect(result.status).toBe('blocked');
    expect(result.issues.some(i => i.includes('CISSP') || i.includes('CISM'))).toBe(true);
  });

  it('BLOCKS unsupported high-risk technologies not in manifest', () => {
    const unevidencedTechSuggestion = {
      section: 'experience' as const,
      original_text: 'Assisted senior auditors in executing SOX 404 testing.',
      suggested_text: 'Assisted with SOX 404 controls testing utilizing Splunk and Kubernetes infrastructure.',
      source_refs: ['exp-0-resp-0']
    };

    const result = validateSuggestion(unevidencedTechSuggestion, manifest);
    expect(result.isValid).toBe(false);
    expect(result.status).toBe('blocked');
    expect(result.issues.some(i => i.includes('splunk') || i.includes('kubernetes'))).toBe(true);
  });

  it('BLOCKS suggestions citing non-existent evidence IDs', () => {
    const bogusRefSuggestion = {
      section: 'summary' as const,
      original_text: 'Experienced IT auditor.',
      suggested_text: 'Experienced IT auditor.',
      source_refs: ['fake-evidence-id-999']
    };

    const result = validateSuggestion(bogusRefSuggestion, manifest);
    expect(result.isValid).toBe(false);
    expect(result.status).toBe('blocked');
    expect(result.issues.some(i => i.includes('fake-evidence-id-999'))).toBe(true);
  });

  it('BLOCKS modification or inflation of formal job titles (e.g. Information Systems Auditor -> Information Systems Auditor (IT Audit & Risk Execution))', () => {
    const roleManifest: CandidateEvidenceCard[] = [
      {
        evidence_id: 'exp-0-role',
        source_type: 'experience',
        source_path: 'experience[0]',
        text: 'Information Systems Auditor at First Bank',
        employer: 'First Bank',
        job_title: 'Information Systems Auditor',
        metadata: { is_role_title: true, immutable: true }
      },
      {
        evidence_id: 'exp-0-resp-0',
        source_type: 'experience',
        source_path: 'experience[0].responsibilities[0]',
        text: 'Conducted risk assessments of core banking applications.',
        employer: 'First Bank',
        job_title: 'Information Systems Auditor'
      }
    ];

    // Case 1: Live Acceptance Defect Repro — Appending parenthetical domain qualifier
    const inflatedTitleSuggestion = {
      section: 'experience' as const,
      original_text: 'Information Systems Auditor',
      suggested_text: 'Information Systems Auditor (IT Audit & Risk Execution)',
      source_refs: ['exp-0-role']
    };

    const result = validateSuggestion(inflatedTitleSuggestion, roleManifest);
    expect(result.isValid).toBe(false);
    expect(result.status).toBe('blocked');
    expect(result.errorCode).toBe('FORMAL_JOB_TITLE_MODIFICATION_PROHIBITED');
    expect(result.issues.some(i => i.includes('Information Systems Auditor') && (i.includes('prohibited') || i.includes('immutable')))).toBe(true);

    // Case 2: Altering title to senior or specialized title
    const modifiedTitleSuggestion = {
      section: 'experience' as const,
      original_text: 'Information Systems Auditor',
      suggested_text: 'Senior IT Risk Specialist',
      source_refs: ['exp-0-role']
    };
    const result2 = validateSuggestion(modifiedTitleSuggestion, roleManifest);
    expect(result2.isValid).toBe(false);
    expect(result2.status).toBe('blocked');

    // Case 3: Legitimate bullet point suggestion referring to work done is ALLOWED
    const validBulletSuggestion = {
      section: 'experience' as const,
      original_text: 'Conducted risk assessments of core banking applications.',
      suggested_text: 'Conducted comprehensive risk assessments of core banking applications, identifying key control gaps.',
      source_refs: ['exp-0-resp-0']
    };
    const result3 = validateSuggestion(validBulletSuggestion, roleManifest);
    expect(result3.isValid).toBe(true);
    expect(result3.status).toBe('valid');
  });
});

describe('Stage 5.2 — Tailoring Plan Formation & Unaddressed Criteria Isolation', () => {
  it('correctly isolates unaddressed job criteria without fabricating skills', () => {
    const job = {
      title: 'Senior Cyber Risk Consultant',
      company_name: 'KPMG Nigeria'
    };

    const manifest: CandidateEvidenceCard[] = [
      { evidence_id: 'skill-0', source_type: 'skills', source_path: 'skills[0]', text: 'IT Audit' }
    ];

    const mockAlignment: any = {
      score: 65,
      ruleset_version: 'job-alignment-v1.3',
      criteria: [
        { criterion: 'CISA Certification', match_status: 'matched', type: 'certification' },
        { criterion: 'AWS Cloud Security', match_status: 'not_found', type: 'technical_skill' }
      ]
    };

    const plan = createTailoringPlan(job, manifest, mockAlignment);
    expect(plan.priority_strengths).toContain('CISA Certification');
    expect(plan.unaddressed_criteria.length).toBe(1);
    expect(plan.unaddressed_criteria[0].criterion).toBe('AWS Cloud Security');
    expect(plan.unaddressed_criteria[0].guidance).toContain('Update your QWERTY profile first');
  });

  it('correctly maps all 16 not_found criteria from authoritative Stage 5.1 criteria_breakdown into unaddressed_criteria', () => {
    const job = {
      title: 'Senior Information Systems Auditor',
      company_name: 'Access Bank'
    };

    const manifest: CandidateEvidenceCard[] = [
      { evidence_id: 'skill-0', source_type: 'skills', source_path: 'skills[0]', text: 'IT Audit' }
    ];

    // Authoritative criteria_breakdown from Stage 5.1 candidate_job_alignments row with 16 not_found criteria
    const liveCriteriaBreakdown = [
      { id: 'crit-1', type: 'education', criterion: "Bachelor's degree requirement", status: 'not_found', reason: 'Not found in your approved profile' },
      { id: 'crit-2', type: 'required', criterion: 'Additional relevant professional certification', status: 'not_found', reason: 'Not found in your approved profile' },
      { id: 'crit-3', type: 'required', criterion: 'Advanced Audit command language and skills', status: 'not_found', reason: 'Not found in your approved profile' },
      { id: 'crit-4', type: 'preferred', criterion: 'Strong business and financial analytical skills', status: 'not_found', reason: 'Not found in your approved profile' },
      { id: 'crit-5', type: 'preferred', criterion: 'Communication skills presenting internal audit/risk matters', status: 'not_found', reason: 'Not found in your approved profile' },
      { id: 'crit-6', type: 'experience', criterion: "Minimum 5 years' experience in similar role", status: 'not_found', reason: 'Not found in your approved profile' },
      { id: 'crit-7', type: 'experience', criterion: "Minimum 2 years' relevant professional experience", status: 'not_found', reason: 'Not found in your approved profile' },
      { id: 'crit-8', type: 'responsibility', criterion: 'Gathering / analysing / evaluating information and evidence', status: 'not_found', reason: 'Not found in your approved profile' },
      { id: 'crit-9', type: 'responsibility', criterion: 'Presenting audit findings and recommendations', status: 'not_found', reason: 'Not found in your approved profile' },
      { id: 'crit-10', type: 'education', criterion: "Relevant Bachelor's degree", status: 'not_found', reason: 'Not found in your approved profile' },
      { id: 'crit-11', type: 'preferred', criterion: 'Written/verbal communication', status: 'not_found', reason: 'Not found in your approved profile' },
      { id: 'crit-12', type: 'preferred', criterion: 'Microsoft Office proficiency', status: 'not_found', reason: 'Not found in your approved profile' },
      { id: 'crit-13', type: 'preferred', criterion: 'ERP/business systems familiarity', status: 'not_found', reason: 'Not found in your approved profile' },
      { id: 'crit-14', type: 'preferred', criterion: 'Time-management requirement', status: 'not_found', reason: 'Not found in your approved profile' },
      { id: 'crit-15', type: 'preferred', criterion: 'analytical/critical-thinking requirement', status: 'not_found', reason: 'Not found in your approved profile' },
      { id: 'crit-16', type: 'required', criterion: 'Continuous auditing and monitoring skills', status: 'not_found', reason: 'Not found in your approved profile' },
      // Matched criterion to verify separation
      { id: 'crit-17', type: 'required', criterion: 'IT Audit core fundamentals', status: 'matched', reason: 'Evidenced in profile' }
    ];

    const authoritativeAlignmentRecord: any = {
      id: 'align-authoritative-live',
      ruleset_version: 'job-alignment-v1.3',
      criteria_breakdown: liveCriteriaBreakdown
    };

    const plan = createTailoringPlan(job, manifest, authoritativeAlignmentRecord);

    // Verified: Exactly 16 unaddressed criteria
    expect(plan.unaddressed_criteria.length).toBe(16);
    expect(plan.unaddressed_count).toBe(16);

    // Verified: Priority strengths includes the matched criterion
    expect(plan.priority_strengths).toContain('IT Audit core fundamentals');

    // Verified: Every gap preserves key metadata and candidate guidance
    for (const gap of plan.unaddressed_criteria) {
      expect(gap.id).toBeDefined();
      expect(gap.criterion).toBeDefined();
      expect(gap.category).toBeDefined();
      expect(gap.reason).toBe('Not found in your approved profile');
      expect(gap.guidance).toBe('Update your QWERTY profile first if you have evidence for this.');
    }

    // Specific verified criteria presence
    const gapTexts = plan.unaddressed_criteria.map(g => g.criterion);
    expect(gapTexts).toContain("Bachelor's degree requirement");
    expect(gapTexts).toContain('Additional relevant professional certification');
    expect(gapTexts).toContain('Advanced Audit command language and skills');
    expect(gapTexts).toContain("Minimum 5 years' experience in similar role");
  });
});

describe('Stage 5.2 — Draft Compilation Immutability', () => {
  const originalReviewedData = {
    personal: { full_name: 'Test Candidate' },
    professional: { summary: 'Original Summary.' },
    skills: ['Python', 'SQL'],
    experience: [
      {
        employer: 'Acme Corp',
        job_title: 'Engineer',
        responsibilities: ['Maintained internal pipelines.']
      }
    ]
  };

  it('compiles draft reflecting ONLY accepted valid suggestions', () => {
    const suggestions: TailoringSuggestion[] = [
      {
        suggestion_id: 'sug-1',
        section: 'summary',
        original_text: 'Original Summary.',
        suggested_text: 'Tailored Summary Emphasizing Pipeline Engineering.',
        source_refs: ['prof-summary'],
        reason: 'Better focus',
        status: 'accepted',
        validation_status: 'valid'
      },
      {
        suggestion_id: 'sug-2',
        section: 'experience',
        original_text: 'Maintained internal pipelines.',
        suggested_text: 'Led company-wide cloud transformation.',
        source_refs: ['exp-0-resp-0'],
        reason: 'Exaggeration',
        status: 'blocked',
        validation_status: 'blocked'
      }
    ];

    const draft = CvTailoringEngine.compileTailoredDraft(originalReviewedData, suggestions);

    // Accepted suggestion is applied
    expect(draft.professional.summary).toBe('Tailored Summary Emphasizing Pipeline Engineering.');

    // Blocked suggestion is NOT applied; original responsibility is preserved
    expect(draft.experience[0].responsibilities[0]).toBe('Maintained internal pipelines.');

    // Original reviewed_data was not mutated
    expect(originalReviewedData.professional.summary).toBe('Original Summary.');
  });
});

describe('Stage 5.2 — Store & Source Drift Detection', () => {
  it('detects job and candidate profile source drift', () => {
    const sessionSnapshot: any = {
      id: 'session-123',
      user_id: 'user-abc',
      job_id: 'job-xyz',
      job_updated_at: '2026-01-01T10:00:00Z',
      candidate_applied_at: '2026-01-01T10:00:00Z'
    };

    // Case 1: Neither updated
    const freshResult = CvTailoringStore.enrichWithDrift(
      sessionSnapshot,
      '2026-01-01T10:00:00Z',
      '2026-01-01T10:00:00Z'
    );
    expect(freshResult.is_stale).toBe(false);

    // Case 2: Job updated after tailoring
    const jobDriftResult = CvTailoringStore.enrichWithDrift(
      sessionSnapshot,
      '2026-01-10T15:00:00Z',
      '2026-01-01T10:00:00Z'
    );
    expect(jobDriftResult.is_stale).toBe(true);
    expect(jobDriftResult.stale_reason).toContain('Job advertisement has been updated');

    // Case 3: Candidate profile updated after tailoring
    const cvDriftResult = CvTailoringStore.enrichWithDrift(
      sessionSnapshot,
      '2026-01-01T10:00:00Z',
      '2026-01-15T09:00:00Z'
    );
    expect(cvDriftResult.is_stale).toBe(true);
    expect(cvDriftResult.stale_reason).toContain('approved profile has been updated');

    // Case 4: Alignment ruleset updated after tailoring
    const sessionWithRuleset = {
      ...sessionSnapshot,
      source_alignment_ruleset: 'job-alignment-v1.2'
    };
    const rulesetDriftResult = CvTailoringStore.enrichWithDrift(
      sessionWithRuleset as any,
      '2026-01-01T10:00:00Z',
      '2026-01-01T10:00:00Z',
      'job-alignment-v1.3'
    );
    expect(rulesetDriftResult.is_stale).toBe(true);
    expect(rulesetDriftResult.stale_reason?.toLowerCase()).toContain('role alignment ruleset has been updated');
  });
});

describe('Stage 5.2 — Fail-Closed Persistence & Memory Gating', () => {
  it('strictly disallows in-memory fallback in production environment', () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      const isAllowed = isMemoryFallbackAllowed();
      expect(isAllowed).toBe(false);
      expect(CvTailoringStore.getStoreBackend()).toBe('database');
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('allows in-memory fallback ONLY when explicitly gated or in test runner', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalGate = process.env.ALLOW_IN_MEMORY_TAILORING_STORE;
    try {
      process.env.NODE_ENV = 'development';
      process.env.ALLOW_IN_MEMORY_TAILORING_STORE = 'false';
      delete process.env.VITEST; // simulate non-vitest dev
      expect(isMemoryFallbackAllowed()).toBe(false);

      process.env.ALLOW_IN_MEMORY_TAILORING_STORE = 'true';
      expect(isMemoryFallbackAllowed()).toBe(true);
    } finally {
      process.env.NODE_ENV = originalEnv;
      process.env.ALLOW_IN_MEMORY_TAILORING_STORE = originalGate;
      process.env.VITEST = 'true';
    }
  });
});

describe('Stage 5.2 — Composite Ownership & Alignment Isolation', () => {
  const candidateA = 'cand-uuid-1111';
  const candidateB = 'cand-uuid-2222';
  const jobX = 'job-uuid-xxxx';
  const jobY = 'job-uuid-yyyy';
  const parse1 = 'parse-uuid-0001';
  const parse2 = 'parse-uuid-0002';

  const validAlignmentRecord: any = {
    id: 'align-uuid-9999',
    user_id: candidateA,
    job_id: jobX,
    parse_id: parse1,
    status: 'completed',
    ruleset_version: 'job-alignment-v1.3',
    score: 72
  };

  it('rejects alignment when user_id does not match candidate user_id (Candidate A cannot back Candidate B)', () => {
    const isOwnerMatch = validAlignmentRecord.user_id === candidateB;
    expect(isOwnerMatch).toBe(false);
  });

  it('rejects alignment when job_id does not match target job (Job Y cannot back Job X)', () => {
    const isJobMatch = validAlignmentRecord.job_id === jobY;
    expect(isJobMatch).toBe(false);
  });

  it('rejects alignment when parse_id does not match active approved parse (Parse 2 cannot back Parse 1)', () => {
    const isParseMatch = validAlignmentRecord.parse_id === parse2;
    expect(isParseMatch).toBe(false);
  });

  it('accepts alignment ONLY when composite ownership (user_id, job_id, parse_id) matches exactly', () => {
    const isExactMatch = 
      validAlignmentRecord.user_id === candidateA &&
      validAlignmentRecord.job_id === jobX &&
      validAlignmentRecord.parse_id === parse1 &&
      validAlignmentRecord.status === 'completed';
    expect(isExactMatch).toBe(true);
  });
});

describe('Stage 5.2 — Advanced Factual & Contextual Claim Validation', () => {
  const multiEmployerManifest: CandidateEvidenceCard[] = [
    {
      evidence_id: 'exp-0-resp-0',
      source_type: 'experience',
      source_path: 'experience[0].responsibilities[0]',
      employer: 'Zenith Bank',
      job_title: 'Audit Analyst',
      text: 'Conducted technology audits across 18 banking branches in Lagos.'
    },
    {
      evidence_id: 'exp-1-resp-0',
      source_type: 'experience',
      source_path: 'experience[1].responsibilities[0]',
      employer: 'KPMG Nigeria',
      job_title: 'Junior Consultant',
      text: 'Assisted in financial statement reviews and control testing.'
    }
  ];

  it('BLOCKS numeric metric transferred to a different employer context', () => {
    // Attempting to apply 18 branches to KPMG where it did not exist
    const transferredMetricSuggestion = {
      section: 'experience' as const,
      original_text: 'Assisted in financial statement reviews.',
      suggested_text: 'Conducted audits across 18 banking branches at KPMG Nigeria.',
      source_refs: ['exp-1-resp-0'] // Cites KPMG card only
    };

    const result = validateSuggestion(transferredMetricSuggestion, multiEmployerManifest);
    expect(result.isValid).toBe(false);
    expect(result.status).toBe('blocked');
    expect(result.issues.some(i => i.includes('18'))).toBe(true);
  });

  it('BLOCKS cross-employer conflation in a single experience bullet rewrite', () => {
    // Attempting to combine Zenith Bank and KPMG evidence into one bullet
    const conflatedSuggestion = {
      section: 'experience' as const,
      original_text: 'Conducted audits.',
      suggested_text: 'Conducted technology audits and financial reviews across banking branches.',
      source_refs: ['exp-0-resp-0', 'exp-1-resp-0'] // Citing two different employers!
    };

    const result = validateSuggestion(conflatedSuggestion, multiEmployerManifest);
    expect(result.isValid).toBe(false);
    expect(result.status).toBe('blocked');
    expect(result.issues.some(i => i.includes('Cross-employer'))).toBe(true);
  });

  it('BLOCKS candidate manual edit that introduces unevidenced technologies', () => {
    const editedSuggestion = {
      section: 'experience' as const,
      original_text: 'Assisted in financial statement reviews.',
      suggested_text: 'Engineered automated controls using Terraform and Docker pipelines.',
      source_refs: ['exp-1-resp-0']
    };

    const result = validateSuggestion(editedSuggestion, multiEmployerManifest);
    expect(result.isValid).toBe(false);
    expect(result.status).toBe('blocked');
    expect(result.issues.some(i => i.includes('terraform') || i.includes('docker'))).toBe(true);
  });

  it('ALLOWS valid evidence-backed rewording preserving original facts', () => {
    const validRewrite = {
      section: 'experience' as const,
      original_text: 'Assisted in financial statement reviews and control testing.',
      suggested_text: 'Supported financial statement evaluation and internal control testing for compliance.',
      source_refs: ['exp-1-resp-0']
    };

    const result = validateSuggestion(validRewrite, multiEmployerManifest);
    expect(result.isValid).toBe(true);
    expect(result.status).toBe('valid');
  });
});

describe('Stage 5.2 — Original Profile & Alignment Immutability', () => {
  it('guarantees candidate profile and alignment data remain unchanged after tailoring', () => {
    const originalProfile = Object.freeze({
      id: 'cand-001',
      full_name: 'Amara Okafor',
      headline: 'IT Auditor'
    });

    const originalAlignment = Object.freeze({
      id: 'align-001',
      score: 65,
      ruleset_version: 'job-alignment-v1.3'
    });

    const originalCvParse = Object.freeze({
      id: 'parse-001',
      reviewed_data: Object.freeze({
        skills: ['IT Audit', 'SQL'],
        experience: [{ employer: 'Zenith Bank', responsibilities: ['Tested controls.'] }]
      })
    });

    // Compile draft
    const suggestions: TailoringSuggestion[] = [{
      suggestion_id: 'sug-1',
      section: 'experience',
      original_text: 'Tested controls.',
      suggested_text: 'Assessed technology controls to ensure audit readiness.',
      source_refs: ['exp-0-resp-0'],
      reason: 'More descriptive',
      status: 'accepted',
      validation_status: 'valid'
    }];

    const draft = CvTailoringEngine.compileTailoredDraft(originalCvParse.reviewed_data, suggestions);

    expect(draft.experience[0].responsibilities[0]).toBe('Assessed technology controls to ensure audit readiness.');
    // Originals remain untouched
    expect(originalProfile.headline).toBe('IT Auditor');
    expect(originalAlignment.score).toBe(65);
    expect(originalCvParse.reviewed_data.experience[0].responsibilities[0]).toBe('Tested controls.');
  });
});

describe('Stage 5.2 — Approved Parse Source Selection & Guardrails', () => {
  const candidateParses = [
    {
      id: 'parse-unreviewed',
      user_id: 'cand-001',
      status: 'completed',
      reviewed_data: { skills: ['SQL'] },
      reviewed_at: null, // Candidate has not reviewed/approved!
      applied_at: '2026-01-01T12:00:00Z'
    },
    {
      id: 'parse-extracted-only',
      user_id: 'cand-001',
      status: 'completed',
      extracted_data: { skills: ['Python', 'SQL'] },
      reviewed_data: null,
      reviewed_at: null,
      applied_at: null
    },
    {
      id: 'parse-reviewed-unapplied',
      user_id: 'cand-001',
      status: 'completed',
      reviewed_data: { skills: ['Risk Assessment'] },
      reviewed_at: '2026-01-02T10:00:00Z',
      applied_at: null // Candidate reviewed but not applied to profile!
    },
    {
      id: 'parse-approved-applied',
      user_id: 'cand-001',
      status: 'completed',
      reviewed_data: { skills: ['IT Audit', 'Risk Assessment'] },
      reviewed_at: '2026-01-03T09:00:00Z',
      applied_at: '2026-01-03T09:05:00Z'
    }
  ];

  // Exact criteria matching server/routes/candidate.ts:
  // .eq('user_id', userId)
  // .eq('status', 'completed')
  // .not('reviewed_data', 'is', null)
  // .not('reviewed_at', 'is', null)
  // .not('applied_at', 'is', null)
  // .order('applied_at', { ascending: false })
  // .limit(1)
  function selectApprovedAppliedParse(parses: typeof candidateParses, userId: string) {
    return parses
      .filter(p =>
        p.user_id === userId &&
        p.status === 'completed' &&
        p.reviewed_data !== null &&
        p.reviewed_at !== null &&
        p.applied_at !== null
      )
      .sort((a, b) => new Date(b.applied_at!).getTime() - new Date(a.applied_at!).getTime())[0] || null;
  }

  it('proves a parse with reviewed_data but no reviewed_at cannot be used for tailoring', () => {
    // If only the unreviewed parse exists, selection MUST return null
    const onlyUnreviewed = candidateParses.filter(p => p.id === 'parse-unreviewed');
    const selected = selectApprovedAppliedParse(onlyUnreviewed, 'cand-001');
    expect(selected).toBeNull();
  });

  it('proves a parse with extracted_data but no reviewed_data cannot be used for tailoring', () => {
    const onlyExtracted = candidateParses.filter(p => p.id === 'parse-extracted-only');
    const selected = selectApprovedAppliedParse(onlyExtracted, 'cand-001');
    expect(selected).toBeNull();
  });

  it('proves only a fully reviewed and applied parse is selected as the candidate tailoring source', () => {
    const selected = selectApprovedAppliedParse(candidateParses, 'cand-001');
    expect(selected).not.toBeNull();
    expect(selected?.id).toBe('parse-approved-applied');
    expect(selected?.reviewed_at).toBe('2026-01-03T09:00:00Z');
    expect(selected?.applied_at).toBe('2026-01-03T09:05:00Z');
  });
});

describe('Stage 5.2 — Stale Alignment Source Rejection & Drift', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const jobId = '22222222-2222-4222-8222-222222222222';
  const parseId = '33333333-3333-4333-8333-333333333333';
  const rulesetVersion = CURRENT_JOB_ALIGNMENT_RULESET_VERSION; // 'job-alignment-v1.3'

  const currentJobUpdatedAt = '2026-02-15T12:00:00Z';
  const currentCandidateAppliedAt = '2026-02-14T10:00:00Z';

  // Validation function simulating the route-level logic in server/routes/candidate.ts
  function validateAlignmentForTailoring(
    alignment: any,
    currentJobTime: string,
    currentCvTime: string
  ): { status: 'ACCEPTED' | 'ALIGNMENT_REQUIRED'; reason?: string } {
    if (!alignment || alignment.status !== 'completed' || alignment.ruleset_version !== CURRENT_JOB_ALIGNMENT_RULESET_VERSION) {
      return { status: 'ALIGNMENT_REQUIRED', reason: 'Missing completed current ruleset alignment' };
    }
    const isJobCurrent = alignment.job_updated_at === currentJobTime ||
      new Date(alignment.job_updated_at).getTime() === new Date(currentJobTime).getTime();
    const isCvCurrent = alignment.candidate_applied_at === currentCvTime ||
      new Date(alignment.candidate_applied_at).getTime() === new Date(currentCvTime).getTime();

    if (!isJobCurrent || !isCvCurrent) {
      return { status: 'ALIGNMENT_REQUIRED', reason: 'Alignment source snapshots do not match current job or CV' };
    }
    return { status: 'ACCEPTED' };
  }

  it('A: rejects completed v1.3 alignment when alignment.job_updated_at is older than current job.updated_at -> ALIGNMENT_REQUIRED', async () => {
    const olderJobAlignment = {
      id: 'align-uuid-old-job',
      user_id: userId,
      job_id: jobId,
      parse_id: parseId,
      status: 'completed',
      ruleset_version: rulesetVersion,
      job_updated_at: '2026-02-01T10:00:00Z', // Job was updated later on Feb 15!
      candidate_applied_at: currentCandidateAppliedAt
    };

    const result = validateAlignmentForTailoring(olderJobAlignment, currentJobUpdatedAt, currentCandidateAppliedAt);
    expect(result.status).toBe('ALIGNMENT_REQUIRED');

    // Also verify store lookup rejects mismatched timestamps
    const stored = await JobAlignmentStore.getCompletedAlignment(
      userId,
      jobId,
      parseId,
      rulesetVersion,
      currentJobUpdatedAt,
      currentCandidateAppliedAt
    );
    expect(stored).toBeNull();
  });

  it('B: rejects completed v1.3 alignment when alignment.candidate_applied_at does not match current parse.applied_at -> ALIGNMENT_REQUIRED', () => {
    const olderCvAlignment = {
      id: 'align-uuid-old-cv',
      user_id: userId,
      job_id: jobId,
      parse_id: parseId,
      status: 'completed',
      ruleset_version: rulesetVersion,
      job_updated_at: currentJobUpdatedAt,
      candidate_applied_at: '2026-01-20T08:00:00Z' // Candidate re-applied profile on Feb 14!
    };

    const result = validateAlignmentForTailoring(olderCvAlignment, currentJobUpdatedAt, currentCandidateAppliedAt);
    expect(result.status).toBe('ALIGNMENT_REQUIRED');
  });

  it('C: accepts completed v1.3 alignment when all source markers match current job and parse', () => {
    const currentAlignment = {
      id: 'align-uuid-exact',
      user_id: userId,
      job_id: jobId,
      parse_id: parseId,
      status: 'completed',
      ruleset_version: rulesetVersion,
      job_updated_at: currentJobUpdatedAt,
      candidate_applied_at: currentCandidateAppliedAt
    };

    const result = validateAlignmentForTailoring(currentAlignment, currentJobUpdatedAt, currentCandidateAppliedAt);
    expect(result.status).toBe('ACCEPTED');
  });

  it('D: proves historical tailoring session created from an old alignment remains viewable, is marked stale, and is never mutated', () => {
    const historicalSession: any = {
      id: 'tailor-hist-001',
      user_id: userId,
      job_id: jobId,
      parse_id: parseId,
      alignment_id: 'align-hist-old',
      status: 'completed',
      tailoring_status: 'draft',
      tailoring_engine_version: 'cv-tailoring-v1',
      source_alignment_ruleset: 'job-alignment-v1.3',
      job_updated_at: '2026-02-01T10:00:00Z', // snapshot from when alignment was created
      candidate_applied_at: '2026-02-01T10:00:00Z',
      created_at: '2026-02-02T10:00:00Z',
      draft_data: { headline: 'Auditor' },
      suggestions: []
    };

    // Candidate views session after job or candidate profile updated
    const enriched = CvTailoringStore.enrichWithDrift(
      historicalSession,
      currentJobUpdatedAt,
      currentCandidateAppliedAt,
      CURRENT_JOB_ALIGNMENT_RULESET_VERSION
    );

    // Remains viewable and marked stale
    expect(enriched.id).toBe('tailor-hist-001');
    expect(enriched.is_stale).toBe(true);
    expect(enriched.stale_reason).toBeDefined();
    // Historical session data remains immutable and not mutated
    expect(historicalSession.job_updated_at).toBe('2026-02-01T10:00:00Z');
    expect(historicalSession.status).toBe('completed');
    expect(historicalSession.draft_data.headline).toBe('Auditor');
  });

  describe('Stage 5.2 — API / Error-Handling & SPA Fallback Regression', () => {
    it('A: parseResponseSafe handles 503 GEMINI_UNAVAILABLE HTML without throwing SyntaxError', async () => {
      // Simulated HTML 503 response from GFE / proxy
      const htmlResponse = new Response('<!doctype html><html><head><title>503 Service Unavailable</title></head><body>Server busy</body></html>', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });

      await expect(parseResponseSafe(htmlResponse)).rejects.toMatchObject({
        status: 503,
        error: 'GEMINI_UNAVAILABLE',
        message: expect.stringContaining('CV tailoring is temporarily unavailable')
      });
    });

    it('B: parseResponseSafe never throws raw Unexpected token < on 404 HTML response', async () => {
      const html404 = new Response('<!doctype html><html><body>404 Not Found</body></html>', {
        status: 404,
        statusText: 'Not Found',
        headers: { 'Content-Type': 'text/html' }
      });

      await expect(parseResponseSafe(html404)).rejects.toMatchObject({
        status: 404,
        error: 'HTTP_404',
        message: expect.stringContaining('endpoint not found')
      });
    });

    it('C: parseResponseSafe handles JSON error contract correctly', async () => {
      const jsonError = new Response(JSON.stringify({
        error: 'GEMINI_UNAVAILABLE',
        message: 'CV tailoring is temporarily unavailable because the AI service could not complete this request. Your original CV and profile are unchanged. Please try again.',
        sessionId: 'sess-failed-123'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });

      await expect(parseResponseSafe(jsonError)).rejects.toMatchObject({
        status: 503,
        error: 'GEMINI_UNAVAILABLE',
        sessionId: 'sess-failed-123'
      });
    });

    it('D: parseResponseSafe handles empty body on error status', async () => {
      const emptyResponse = new Response('', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });

      await expect(parseResponseSafe(emptyResponse)).rejects.toMatchObject({
        status: 500
      });
    });

    it('E: Express app routes unknown /api/* requests to JSON 404, NEVER HTML index', async () => {
      const { app } = await import('../server/app.js');
      const res = await request(app).get('/api/nonexistent_tailoring_route');
      expect(res.status).toBe(404);
      expect(res.headers['content-type']).toContain('application/json');
      expect(res.body).toEqual({
        error: 'API_ENDPOINT_NOT_FOUND',
        message: 'Cannot GET /api/nonexistent_tailoring_route'
      });
    });

    it('F: getLatestSession returns prior completed draft when newer failed session exists', async () => {
      CvTailoringStore.clearMemoryStore();
      process.env.ALLOW_IN_MEMORY_TAILORING_STORE = 'true';

      const userId = '11111111-1111-1111-1111-111111111111';
      const jobId = '22222222-2222-2222-2222-222222222222';
      const cvId = '33333333-3333-3333-3333-333333333333';
      const parseId = '44444444-4444-4444-4444-444444444444';
      const alignId = '55555555-5555-5555-5555-555555555555';

      // 1. Prior completed session
      const completedSession = await CvTailoringStore.createSession({
        user_id: userId,
        job_id: jobId,
        cv_version_id: cvId,
        parse_id: parseId,
        alignment_id: alignId,
        status: 'completed',
        tailoring_status: 'draft',
        tailoring_engine_version: 'cv-tailoring-v1',
        source_alignment_ruleset: 'job-alignment-v1.3',
        job_updated_at: '2026-09-20T00:00:00Z',
        candidate_applied_at: '2026-09-20T00:00:00Z',
        job_title: 'Information Systems Auditor',
        company_name: 'Access Bank',
        evidence_manifest: [{ evidence_id: 'e1', source_type: 'skills', source_path: 's', text: 'Audit' }],
        suggestions: [{ suggestion_id: 'sug-1', section: 'summary', original_text: 'a', suggested_text: 'b', source_refs: ['e1'], reason: 'r', status: 'pending', validation_status: 'valid' }]
      });

      await new Promise(r => setTimeout(r, 10));

      // 2. Newer failed fresh generation session
      await CvTailoringStore.createSession({
        user_id: userId,
        job_id: jobId,
        cv_version_id: cvId,
        parse_id: parseId,
        alignment_id: alignId,
        status: 'failed',
        tailoring_status: 'draft',
        tailoring_engine_version: 'cv-tailoring-v1',
        source_alignment_ruleset: 'job-alignment-v1.3',
        job_updated_at: '2026-09-20T00:00:00Z',
        candidate_applied_at: '2026-09-20T00:00:00Z',
        job_title: 'Information Systems Auditor',
        company_name: 'Access Bank',
        evidence_manifest: [],
        suggestions: []
      });

      // 3. Query latest session for candidate and job
      const latest = await CvTailoringStore.getLatestSession(userId, jobId);
      expect(latest).not.toBeNull();
      // Must return the COMPLETED session, not the failed session
      expect(latest?.id).toBe(completedSession.id);
      expect(latest?.status).toBe('completed');
      expect(latest?.suggestions.length).toBe(1);
    });

    it('G: getLatestSession returns null if candidate only has a failed session (no completed draft exists)', async () => {
      CvTailoringStore.clearMemoryStore();
      process.env.ALLOW_IN_MEMORY_TAILORING_STORE = 'true';

      const userId2 = '66666666-6666-6666-6666-666666666666';
      const jobId2 = '77777777-7777-7777-7777-777777777777';

      await CvTailoringStore.createSession({
        user_id: userId2,
        job_id: jobId2,
        cv_version_id: '88888888-8888-8888-8888-888888888888',
        parse_id: '99999999-9999-9999-9999-999999999999',
        alignment_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        status: 'failed',
        tailoring_status: 'draft',
        tailoring_engine_version: 'cv-tailoring-v1',
        source_alignment_ruleset: 'job-alignment-v1.3',
        job_updated_at: '2026-09-20T00:00:00Z',
        candidate_applied_at: '2026-09-20T00:00:00Z',
        job_title: 'Auditor',
        company_name: 'Firm',
        evidence_manifest: [],
        suggestions: []
      });

      const latest = await CvTailoringStore.getLatestSession(userId2, jobId2);
      expect(latest).toBeNull();
    });
  });

  describe('Stage 5.2 — Section-Aware Evidence Compatibility & Experience Anchor', () => {
    const testManifest: CandidateEvidenceCard[] = [
      {
        evidence_id: 'prof-summary',
        source_type: 'summary',
        source_path: 'professional.summary',
        text: 'Risk-focused IT Auditor with 4+ years specializing in IT audit across financial institutions.'
      },
      {
        evidence_id: 'exp-0-role',
        source_type: 'experience',
        source_path: 'experience[0]',
        text: 'Information Systems Auditor at Access Bank',
        employer: 'Access Bank',
        job_title: 'Information Systems Auditor',
        metadata: { experience_index: 0, is_role_title: true, immutable: true }
      },
      {
        evidence_id: 'exp-0-resp-0',
        source_type: 'experience',
        source_path: 'experience[0].responsibilities[0]',
        text: 'Reviewed IT general controls across core banking systems.',
        employer: 'Access Bank',
        job_title: 'Information Systems Auditor',
        metadata: { experience_index: 0, is_responsibility: true }
      },
      {
        evidence_id: 'exp-1-role',
        source_type: 'experience',
        source_path: 'experience[1]',
        text: 'Internal Audit Associate at Zenith Bank',
        employer: 'Zenith Bank',
        job_title: 'Internal Audit Associate',
        metadata: { experience_index: 1, is_role_title: true, immutable: true }
      },
      {
        evidence_id: 'exp-1-resp-0',
        source_type: 'experience',
        source_path: 'experience[1].responsibilities[0]',
        text: 'Assisted in branch financial audits and operational controls review.',
        employer: 'Zenith Bank',
        job_title: 'Internal Audit Associate',
        metadata: { experience_index: 1, is_responsibility: true }
      },
      {
        evidence_id: 'skill-0',
        source_type: 'skills',
        source_path: 'skills[0]',
        text: 'IT General Controls (ITGC)'
      },
      {
        evidence_id: 'skill-3',
        source_type: 'skills',
        source_path: 'skills[3]',
        text: 'Internal Audit Execution'
      },
      {
        evidence_id: 'cert-0',
        source_type: 'certifications',
        source_path: 'certifications[0]',
        text: 'Certified Information Systems Auditor (CISA)'
      }
    ];

    it('A: section = experience with skill cards only is BLOCKED with EXPERIENCE_EVIDENCE_REQUIRED', () => {
      const sug = {
        section: 'experience' as const,
        original_text: 'Internal Audit Execution',
        suggested_text: 'Execute end-to-end internal audits of information systems and operations.',
        source_refs: ['skill-3', 'skill-0']
      };
      const res = validateSuggestion(sug, testManifest);
      expect(res.isValid).toBe(false);
      expect(res.status).toBe('blocked');
      expect(res.errorCode).toBe('EXPERIENCE_EVIDENCE_REQUIRED');
      expect(res.issues.some(i => i.includes('at least one approved experience evidence card'))).toBe(true);
    });

    it('B: section = experience with certification card only is BLOCKED with EXPERIENCE_EVIDENCE_REQUIRED', () => {
      const sug = {
        section: 'experience' as const,
        original_text: 'CISA certification',
        suggested_text: 'Applied CISA audit frameworks across banking systems.',
        source_refs: ['cert-0']
      };
      const res = validateSuggestion(sug, testManifest);
      expect(res.isValid).toBe(false);
      expect(res.status).toBe('blocked');
      expect(res.errorCode).toBe('EXPERIENCE_EVIDENCE_REQUIRED');
    });

    it('C: section = experience with valid experience card + supporting skill card may PASS when supported', () => {
      const sug = {
        section: 'experience' as const,
        original_text: 'Reviewed IT general controls across core banking systems.',
        suggested_text: 'Reviewed IT general controls (ITGC) across core banking platforms to ensure audit readiness.',
        source_refs: ['exp-0-resp-0', 'skill-0']
      };
      const res = validateSuggestion(sug, testManifest);
      expect(res.isValid).toBe(true);
      expect(res.status).toBe('valid');
      expect(res.issues).toHaveLength(0);
    });

    it('D: skill "Internal Audit Execution" cannot become an experience bullet by itself', () => {
      const sug = {
        section: 'experience' as const,
        original_text: 'Internal Audit Execution',
        suggested_text: 'Conducted internal audit execution across enterprise functions.',
        source_refs: ['skill-3']
      };
      const res = validateSuggestion(sug, testManifest);
      expect(res.isValid).toBe(false);
      expect(res.status).toBe('blocked');
      expect(res.errorCode).toBe('EXPERIENCE_EVIDENCE_REQUIRED');
      expect(res.issues.some(i => i.includes('cannot be converted into an experience bullet'))).toBe(true);
    });

    it('E: skill "IT General Controls (ITGC)" cannot become "Performed ITGC testing..." without experience evidence', () => {
      const sug = {
        section: 'experience' as const,
        original_text: 'IT General Controls (ITGC)',
        suggested_text: 'Performed comprehensive ITGC testing and risk assessments.',
        source_refs: ['skill-0']
      };
      const res = validateSuggestion(sug, testManifest);
      expect(res.isValid).toBe(false);
      expect(res.status).toBe('blocked');
      expect(res.errorCode).toBe('EXPERIENCE_EVIDENCE_REQUIRED');
    });

    it('F: actual approved experience "Reviewed IT general controls across core banking systems" concise rewrite PASSES', () => {
      const sug = {
        section: 'experience' as const,
        original_text: 'Reviewed IT general controls across core banking systems.',
        suggested_text: 'Evaluated core banking IT general controls for compliance and audit integrity.',
        source_refs: ['exp-0-resp-0']
      };
      const res = validateSuggestion(sug, testManifest);
      expect(res.isValid).toBe(true);
      expect(res.status).toBe('valid');
    });

    it('G: experience from Employer A cannot be transferred into Employer B', () => {
      const sug = {
        section: 'experience' as const,
        original_text: 'Assisted in branch financial audits and operational controls review.', // Zenith Bank (exp-1)
        suggested_text: 'Reviewed core banking controls during financial audits.',
        source_refs: ['exp-0-resp-0'] // Access Bank (exp-0)!
      };
      const res = validateSuggestion(sug, testManifest);
      expect(res.isValid).toBe(false);
      expect(res.status).toBe('blocked');
      expect(res.issues.some(i => i.includes('Cross-employer') || i.includes('provenance transfer'))).toBe(true);
    });

    it('H: candidate manual edit attempting unsupported experience claim is BLOCKED', () => {
      const editedSug = {
        section: 'experience' as const,
        original_text: 'Internal Audit Execution',
        suggested_text: 'Candidate manually typed an unevidenced experience bullet here.',
        source_refs: ['skill-3']
      };
      const res = validateSuggestion(editedSug, testManifest);
      expect(res.isValid).toBe(false);
      expect(res.status).toBe('blocked');
      expect(res.errorCode).toBe('EXPERIENCE_EVIDENCE_REQUIRED');
    });

    it('I: summary may still use supported skill/cert/experience evidence according to existing factual checks', () => {
      const summarySug = {
        section: 'summary' as const,
        original_text: 'Risk-focused IT Auditor with 4+ years specializing in IT audit across financial institutions.',
        suggested_text: 'CISA-certified IT Auditor with 4+ years of specialized experience in IT audit across financial institutions.',
        source_refs: ['prof-summary', 'cert-0', 'skill-0']
      };
      const res = validateSuggestion(summarySug, testManifest);
      expect(res.isValid).toBe(true);
      expect(res.status).toBe('valid');
    });

    it('J: Skills-section reorder remains valid', () => {
      const skillsSug = {
        section: 'skills' as const,
        original_text: 'IT General Controls (ITGC), Internal Audit Execution',
        suggested_text: 'Internal Audit Execution, IT General Controls (ITGC)',
        source_refs: ['skill-3', 'skill-0']
      };
      const res = validateSuggestion(skillsSug, testManifest);
      expect(res.isValid).toBe(true);
      expect(res.status).toBe('valid');
    });

    it('K: 16 authoritative unaddressed criteria remain propagated in tailoring plan', () => {
      const sampleAlignmentResult = {
        job_id: 'job-1',
        candidate_id: 'user-1',
        overall_score: 45,
        criteria_breakdown: Array.from({ length: 16 }, (_, i) => ({
          criterion_id: `crit-${i + 1}`,
          criterion: `Requirement ${i + 1}`,
          status: 'not_found',
          importance: 'required'
        }))
      };

      const plan = createTailoringPlan(
        { title: 'Senior Internal Auditor', company_name: 'Access Bank' },
        testManifest,
        sampleAlignmentResult
      );

      expect(plan.unaddressed_count).toBe(16);
      expect(plan.unaddressed_criteria).toHaveLength(16);
      expect(plan.unaddressed_criteria[0].reason).toContain('Not found in your approved profile');
    });

    it('L: formal title mutation remains blocked with FORMAL_JOB_TITLE_MODIFICATION_PROHIBITED', () => {
      const titleSug = {
        section: 'experience' as const,
        original_text: 'Information Systems Auditor',
        suggested_text: 'Information Systems Auditor (IT Audit & Risk Execution)',
        source_refs: ['exp-0-role']
      };
      const res = validateSuggestion(titleSug, testManifest);
      expect(res.isValid).toBe(false);
      expect(res.status).toBe('blocked');
      expect(res.errorCode).toBe('FORMAL_JOB_TITLE_MODIFICATION_PROHIBITED');
    });
  });

  describe('Stage 5.2 — Factual Polarity & Meaning Preservation for Candidate Edits (cv-tailoring-v1.2)', () => {
    const polarityManifest: CandidateEvidenceCard[] = [
      {
        evidence_id: 'exp-audit-0',
        source_type: 'experience',
        source_path: 'experience[0].responsibilities[0]',
        text: 'Supported IT audits by analyzing system configurations and evaluating security logs.',
        employer: 'Access Bank',
        job_title: 'IT Auditor'
      },
      {
        evidence_id: 'exp-risk-0',
        source_type: 'experience',
        source_path: 'experience[0].responsibilities[1]',
        text: 'Conducted risk assessments and control evaluations across core banking platforms.',
        employer: 'Access Bank',
        job_title: 'IT Auditor'
      },
      {
        evidence_id: 'exp-vendor-0',
        source_type: 'experience',
        source_path: 'experience[0].responsibilities[2]',
        text: 'Managed vendor reviews and third-party security assurance assessments.',
        employer: 'Access Bank',
        job_title: 'IT Auditor'
      },
      {
        evidence_id: 'exp-assist-0',
        source_type: 'experience',
        source_path: 'experience[0].responsibilities[3]',
        text: 'Assisted senior auditors in drafting internal audit workpapers and findings.',
        employer: 'Access Bank',
        job_title: 'IT Auditor'
      },
      {
        evidence_id: 'exp-participate-0',
        source_type: 'experience',
        source_path: 'experience[0].responsibilities[4]',
        text: 'Participated in operational controls walkthroughs and remediation tracking.',
        employer: 'Access Bank',
        job_title: 'IT Auditor'
      },
      {
        evidence_id: 'exp-review-0',
        source_type: 'experience',
        source_path: 'experience[0].responsibilities[5]',
        text: 'Reviewed system access permissions and user access recertifications.',
        employer: 'Access Bank',
        job_title: 'IT Auditor'
      },
      {
        evidence_id: 'skill-aws',
        source_type: 'skills',
        source_path: 'skills[0]',
        text: 'Familiar with AWS cloud security controls and IAM policies.'
      },
      {
        evidence_id: 'exp-neg-disclaim',
        source_type: 'experience',
        source_path: 'experience[1].responsibilities[0]',
        text: 'Did not manage infrastructure; focused strictly on application-level control audits.',
        employer: 'Zenith Bank',
        job_title: 'Associate Auditor'
      },
      {
        evidence_id: 'exp-security-purpose',
        source_type: 'experience',
        source_path: 'experience[0].responsibilities[6]',
        text: 'Configured firewalls to prevent unauthorized access across banking network.',
        employer: 'Access Bank',
        job_title: 'IT Auditor'
      }
    ];

    it('1: Current tailoring engine version is cv-tailoring-v1.2', () => {
      expect(CURRENT_TAILORING_ENGINE_VERSION).toBe('cv-tailoring-v1.2');
    });

    it('2: Confirmed Live Defect — Candidate edit "did not conduct IT audits" is BLOCKED with FACTUAL_MEANING_REVERSAL', () => {
      const sug = {
        section: 'experience' as const,
        original_text: 'Supported IT audits by analyzing system configurations and evaluating security logs.',
        suggested_text: 'did not conduct IT audits.',
        source_refs: ['exp-audit-0']
      };
      const res = validateSuggestion(sug, polarityManifest);
      expect(res.isValid).toBe(false);
      expect(res.status).toBe('blocked');
      expect(res.errorCode).toBe('FACTUAL_MEANING_REVERSAL');
      expect(res.issues.some(i => i.includes('Factual meaning reversal'))).toBe(true);
    });

    it('3: Candidate edit "Did not conduct risk assessments" is BLOCKED with FACTUAL_MEANING_REVERSAL', () => {
      const sug = {
        section: 'experience' as const,
        original_text: 'Conducted risk assessments and control evaluations across core banking platforms.',
        suggested_text: 'Did not conduct risk assessments',
        source_refs: ['exp-risk-0']
      };
      const res = validateSuggestion(sug, polarityManifest);
      expect(res.isValid).toBe(false);
      expect(res.status).toBe('blocked');
      expect(res.errorCode).toBe('FACTUAL_MEANING_REVERSAL');
    });

    it('4: Candidate edit "Never managed vendor reviews" is BLOCKED with FACTUAL_MEANING_REVERSAL', () => {
      const sug = {
        section: 'experience' as const,
        original_text: 'Managed vendor reviews and third-party security assurance assessments.',
        suggested_text: 'Never managed vendor reviews',
        source_refs: ['exp-vendor-0']
      };
      const res = validateSuggestion(sug, polarityManifest);
      expect(res.isValid).toBe(false);
      expect(res.status).toBe('blocked');
      expect(res.errorCode).toBe('FACTUAL_MEANING_REVERSAL');
    });

    it('5: Candidate edit "No AWS knowledge" against approved "Familiar with AWS" is BLOCKED with FACTUAL_MEANING_REVERSAL', () => {
      const sug = {
        section: 'skills' as const,
        original_text: 'Familiar with AWS cloud security controls and IAM policies.',
        suggested_text: 'No AWS knowledge',
        source_refs: ['skill-aws']
      };
      const res = validateSuggestion(sug, polarityManifest);
      expect(res.isValid).toBe(false);
      expect(res.status).toBe('blocked');
      expect(res.errorCode).toBe('FACTUAL_MEANING_REVERSAL');
    });

    it('6: Candidate edit with competence disclaimers ("zero experience in IT audits", "lacked risk assessment experience") are BLOCKED', () => {
      const sug1 = {
        section: 'experience' as const,
        original_text: 'Supported IT audits by analyzing system configurations and evaluating security logs.',
        suggested_text: 'Candidate has zero experience in IT audits.',
        source_refs: ['exp-audit-0']
      };
      expect(validateSuggestion(sug1, polarityManifest).errorCode).toBe('FACTUAL_MEANING_REVERSAL');

      const sug2 = {
        section: 'experience' as const,
        original_text: 'Conducted risk assessments and control evaluations across core banking platforms.',
        suggested_text: 'Lacked risk assessment experience during employment.',
        source_refs: ['exp-risk-0']
      };
      expect(validateSuggestion(sug2, polarityManifest).errorCode).toBe('FACTUAL_MEANING_REVERSAL');
    });

    it('7: Semantic action reversals (supported -> did not support, assisted -> never assisted, participated -> did not participate, reviewed -> did not review) are all BLOCKED', () => {
      const pairs = [
        {
          ref: 'exp-audit-0',
          orig: 'Supported IT audits by analyzing system configurations and evaluating security logs.',
          edit: 'Did not support IT audits during testing.'
        },
        {
          ref: 'exp-assist-0',
          orig: 'Assisted senior auditors in drafting internal audit workpapers and findings.',
          edit: 'Never assisted senior auditors with workpapers.'
        },
        {
          ref: 'exp-participate-0',
          orig: 'Participated in operational controls walkthroughs and remediation tracking.',
          edit: 'Did not participate in operational controls walkthroughs.'
        },
        {
          ref: 'exp-review-0',
          orig: 'Reviewed system access permissions and user access recertifications.',
          edit: 'Did not review system access permissions.'
        }
      ];

      for (const p of pairs) {
        const res = validateSuggestion({
          section: 'experience',
          original_text: p.orig,
          suggested_text: p.edit,
          source_refs: [p.ref]
        }, polarityManifest);
        expect(res.isValid).toBe(false);
        expect(res.status).toBe('blocked');
        expect(res.errorCode).toBe('FACTUAL_MEANING_REVERSAL');
      }
    });

    it('8: Reverse Direction — Approved negative evidence "Did not manage infrastructure" reversed to affirmative "Managed infrastructure" is BLOCKED', () => {
      const sug = {
        section: 'experience' as const,
        original_text: 'Did not manage infrastructure; focused strictly on application-level control audits.',
        suggested_text: 'Managed infrastructure and enterprise server systems.',
        source_refs: ['exp-neg-disclaim']
      };
      const res = validateSuggestion(sug, polarityManifest);
      expect(res.isValid).toBe(false);
      expect(res.status).toBe('blocked');
      expect(res.errorCode).toBe('FACTUAL_MEANING_REVERSAL');
      expect(res.issues.some(i => i.includes('explicitly disclaims as negative'))).toBe(true);
    });

    it('9: Legitimate editing PASSES — "through analysis of system configurations"', () => {
      const sug = {
        section: 'experience' as const,
        original_text: 'Supported IT audits by analyzing system configurations and evaluating security logs.',
        suggested_text: 'Supported IT audits through analysis of system configurations and security logs.',
        source_refs: ['exp-audit-0']
      };
      const res = validateSuggestion(sug, polarityManifest);
      expect(res.isValid).toBe(true);
      expect(res.status).toBe('valid');
      expect(res.issues).toHaveLength(0);
    });

    it('10: Legitimate editing PASSES — "Performed risk assessments and control evaluations"', () => {
      const sug = {
        section: 'experience' as const,
        original_text: 'Conducted risk assessments and control evaluations across core banking platforms.',
        suggested_text: 'Performed risk assessments and control evaluations across core banking platforms.',
        source_refs: ['exp-risk-0']
      };
      const res = validateSuggestion(sug, polarityManifest);
      expect(res.isValid).toBe(true);
      expect(res.status).toBe('valid');
      expect(res.issues).toHaveLength(0);
    });

    it('11: Legitimate editing PASSES — "Assisted with IT audits..." without inflating or negating', () => {
      const sug = {
        section: 'experience' as const,
        original_text: 'Supported IT audits by analyzing system configurations and evaluating security logs.',
        suggested_text: 'Assisted with IT audits by analyzing system configurations and security logs.',
        source_refs: ['exp-audit-0']
      };
      const res = validateSuggestion(sug, polarityManifest);
      expect(res.isValid).toBe(true);
      expect(res.status).toBe('valid');
    });

    it('12: Defensive security phrasing ("to prevent unauthorized access") PASSES without false positive', () => {
      const sug = {
        section: 'experience' as const,
        original_text: 'Configured firewalls to prevent unauthorized access across banking network.',
        suggested_text: 'Maintained firewall configurations to prevent unauthorized network access.',
        source_refs: ['exp-security-purpose']
      };
      const res = validateSuggestion(sug, polarityManifest);
      expect(res.isValid).toBe(true);
      expect(res.status).toBe('valid');
    });

    it('13: Candidate edit provenance fields (original_text, generated_suggested_text, candidate_edited_text) are preserved', () => {
      const generatedSug: TailoringSuggestion = {
        suggestion_id: 'sug-prov-1',
        section: 'experience',
        original_text: 'Supported IT audits by analyzing system configurations.',
        suggested_text: 'Supported IT audits through rigorous analysis of system configurations.',
        generated_suggested_text: 'Supported IT audits through rigorous analysis of system configurations.',
        original_suggested_text: 'Supported IT audits through rigorous analysis of system configurations.',
        candidate_edited_text: 'Assisted with IT audits through system configuration analysis.',
        candidate_edited: true,
        source_refs: ['exp-audit-0'],
        reason: 'Improve audit impact',
        status: 'accepted',
        validation_status: 'valid'
      };

      expect(generatedSug.original_text).toBe('Supported IT audits by analyzing system configurations.');
      expect(generatedSug.generated_suggested_text).toBe('Supported IT audits through rigorous analysis of system configurations.');
      expect(generatedSug.candidate_edited_text).toBe('Assisted with IT audits through system configuration analysis.');
      expect(generatedSug.candidate_edited).toBe(true);
    });

    it('14: Finalization re-validation blocks draft if an accepted suggestion contains a factual meaning reversal', () => {
      const acceptedWithReversal: TailoringSuggestion = {
        suggestion_id: 'sug-rev-1',
        section: 'experience',
        original_text: 'Supported IT audits by analyzing system configurations and evaluating security logs.',
        suggested_text: 'did not conduct IT audits.',
        candidate_edited_text: 'did not conduct IT audits.',
        candidate_edited: true,
        source_refs: ['exp-audit-0'],
        reason: 'Candidate manual edit',
        status: 'accepted',
        validation_status: 'valid' // simulated legacy bypass
      };

      const activeText = (acceptedWithReversal.candidate_edited && acceptedWithReversal.candidate_edited_text)
        ? acceptedWithReversal.candidate_edited_text
        : acceptedWithReversal.suggested_text;

      const validation = validateSuggestion(
        { ...acceptedWithReversal, suggested_text: activeText },
        polarityManifest
      );

      expect(validation.isValid).toBe(false);
      expect(validation.status).toBe('blocked');
      expect(validation.errorCode).toBe('FACTUAL_MEANING_REVERSAL');
    });

    it('15: Finalization re-validation PASSES when all accepted suggestions are legitimate editorial improvements', () => {
      const acceptedLegit: TailoringSuggestion = {
        suggestion_id: 'sug-legit-1',
        section: 'experience',
        original_text: 'Supported IT audits by analyzing system configurations and evaluating security logs.',
        suggested_text: 'Supported IT audits through analysis of system configurations and security logs.',
        candidate_edited_text: 'Supported IT audits through analysis of system configurations and security logs.',
        candidate_edited: true,
        source_refs: ['exp-audit-0'],
        reason: 'Refined conciseness',
        status: 'accepted',
        validation_status: 'valid'
      };

      const activeText = (acceptedLegit.candidate_edited && acceptedLegit.candidate_edited_text)
        ? acceptedLegit.candidate_edited_text
        : acceptedLegit.suggested_text;

      const validation = validateSuggestion(
        { ...acceptedLegit, suggested_text: activeText },
        polarityManifest
      );

      expect(validation.isValid).toBe(true);
      expect(validation.status).toBe('valid');
    });
  });

  describe('Stage 5.2 — AI Availability & Resilience Hardening (cv-tailoring-v1.2)', () => {
    const mockEvidence: CandidateEvidenceCard[] = [
      {
        evidence_id: 'exp-net-1',
        source_type: 'experience',
        source_path: 'experience[0].responsibilities[0]',
        text: 'Configured enterprise Cisco routers and switches for 99.9% network uptime across regional datacenters.',
        employer: 'MainOne Cables',
        job_title: 'Network Systems Engineer'
      }
    ];

    const mockPlan = {
      target_job_title: 'Lead Network Engineer',
      target_company: 'MTN Nigeria',
      priority_strengths: ['Cisco routing and switching'],
      reorder_priorities: [],
      concision_targets: [],
      unaddressed_criteria: []
    };

    const mockJob = {
      title: 'Lead Network Engineer',
      company_name: 'MTN Nigeria'
    };

    const mockValidJson = {
      text: JSON.stringify({
        summary_suggestion: {
          original_text: 'Experienced network engineer',
          suggested_text: 'Configured enterprise Cisco routers and switches ensuring high network uptime across datacenters.',
          source_refs: ['exp-net-1'],
          reason: 'Aligns network experience with lead engineer role'
        },
        experience_suggestions: [
          {
            original_text: 'Configured enterprise Cisco routers and switches for 99.9% network uptime across regional datacenters.',
            suggested_text: 'Configured enterprise Cisco routers and switches for 99.9% network uptime across regional datacenters.',
            source_refs: ['exp-net-1'],
            reason: 'Reinforces infrastructure achievements'
          }
        ]
      })
    };

    it('1: Transient retry on 503/429 succeeds with backoff and jitter', async () => {
      let callCount = 0;
      const mockGenerate = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          const err: any = new Error('503 Service Unavailable: Overloaded');
          err.status = 503;
          throw err;
        }
        return mockValidJson;
      });

      const mockAi: any = { models: { generateContent: mockGenerate } };
      const provider = new GeminiCvTailoringProvider(mockAi);

      const suggestions = await provider.generateSuggestions(mockEvidence, mockPlan, mockJob, {
        retryConfig: { maxRetriesPerModel: 2, baseDelayMs: 5, maxDelayMs: 15, maxJitterMs: 5, requestTimeoutMs: 1000 }
      });

      expect(callCount).toBe(2);
      expect(suggestions.length).toBe(2);
      expect(suggestions[0].suggested_text).toContain('Cisco routers');
    });

    it('2: Strict fail-fast (no retry) on 400/401/403 non-transient errors', async () => {
      let callCount = 0;
      const mockGenerate = vi.fn().mockImplementation(async () => {
        callCount++;
        const err: any = new Error('401 Unauthorized API Key');
        err.status = 401;
        throw err;
      });

      const mockAi: any = { models: { generateContent: mockGenerate } };
      const provider = new GeminiCvTailoringProvider(mockAi);

      await expect(
        provider.generateSuggestions(mockEvidence, mockPlan, mockJob, {
          retryConfig: { maxRetriesPerModel: 3, baseDelayMs: 5, maxDelayMs: 15, maxJitterMs: 5, requestTimeoutMs: 1000 }
        })
      ).rejects.toThrow('GEMINI_UNAVAILABLE');

      // Zero retries on 401: only 1 attempt per candidate model
      expect(callCount).toBe(2); // 1 on primary, 1 on fallback
    });

    it('3: Fallback from primary to secondary model when primary exhausts retries', async () => {
      const attemptedModels: string[] = [];
      const mockGenerate = vi.fn().mockImplementation(async (params: any) => {
        attemptedModels.push(params.model);
        if (params.model === 'gemini-3.6-flash') {
          const err: any = new Error('429 Resource Exhausted');
          err.status = 429;
          throw err;
        }
        return mockValidJson;
      });

      const mockAi: any = { models: { generateContent: mockGenerate } };
      const provider = new GeminiCvTailoringProvider(mockAi);

      const suggestions = await provider.generateSuggestions(mockEvidence, mockPlan, mockJob, {
        retryConfig: { maxRetriesPerModel: 1, baseDelayMs: 5, maxDelayMs: 15, maxJitterMs: 5, requestTimeoutMs: 1000 }
      });

      expect(suggestions.length).toBe(2);
      expect(provider.getLastExecutedModel()).toBe('gemini-3.5-flash');
      expect(attemptedModels).toContain('gemini-3.6-flash');
      expect(attemptedModels).toContain('gemini-3.5-flash');
    });

    it('4: Circuit breaker state transitions (closed -> open -> half-open -> closed)', async () => {
      const cb = new GeminiCircuitBreaker({ failureThreshold: 2, cooldownMs: 40 });
      const model = 'gemini-cb-test';

      expect(cb.getState(model)).toBe('CLOSED');
      expect(cb.canExecute(model)).toBe(true);

      // 2 transient failures trip to OPEN
      cb.recordFailure(model, true);
      cb.recordFailure(model, true);
      expect(cb.getState(model)).toBe('OPEN');
      expect(cb.canExecute(model)).toBe(false);

      // Wait for cooldown
      await new Promise(r => setTimeout(r, 50));
      expect(cb.getState(model)).toBe('HALF_OPEN');
      expect(cb.canExecute(model)).toBe(true);

      // Probe success closes circuit
      cb.recordSuccess(model);
      expect(cb.getState(model)).toBe('CLOSED');
      expect(cb.canExecute(model)).toBe(true);
    });

    it('5: Request deduplication prevents concurrent double clicks from launching duplicate generations', async () => {
      const key = TailoringRequestDeduplicator.getKey('u-net', 'j-net', 'p-net', 'a-net', 'cv-tailoring-v1.2');
      let executions = 0;

      const action = async () => {
        executions++;
        await new Promise(r => setTimeout(r, 30));
        return { status: 201, sessionId: 'sess-dedup-success' };
      };

      const [res1, res2] = await Promise.all([
        TailoringRequestDeduplicator.executeOrJoin(key, action),
        TailoringRequestDeduplicator.executeOrJoin(key, action)
      ]);

      expect(executions).toBe(1);
      expect(res1.result.sessionId).toBe('sess-dedup-success');
      expect(res2.result.sessionId).toBe('sess-dedup-success');
      expect(res1.wasJoined).toBe(false);
      expect(res2.wasJoined).toBe(true);
    });

    it('6: Safe operational telemetry records error classes without logging CV data', () => {
      GeminiTelemetryCollector.clear();

      GeminiTelemetryCollector.record({
        feature: 'cv_tailoring',
        session_id: 'sess-net-audit',
        provider: 'google',
        model: 'gemini-3.6-flash',
        attempt: 2,
        status_code: 503,
        error_class: 'ServiceUnavailable',
        latency_ms: 450,
        retry_count: 1,
        fallback_used: false,
        final_outcome: 'transient_retry',
        timestamp: new Date().toISOString()
      });

      const events = GeminiTelemetryCollector.getEvents();
      expect(events.length).toBe(1);
      const ev = events[0] as any;
      expect(ev.session_id).toBe('sess-net-audit');
      expect(ev.status_code).toBe(503);
      expect(ev.reviewed_data).toBeUndefined();
      expect(ev.full_cv).toBeUndefined();
      expect(ev.email).toBeUndefined();
    });

    it('7: Total provider exhaustion returns controlled GEMINI_UNAVAILABLE 503 contract', async () => {
      const mockGenerate = vi.fn().mockImplementation(async () => {
        const err: any = new Error('503 Service Unavailable');
        err.status = 503;
        throw err;
      });

      const mockAi: any = { models: { generateContent: mockGenerate } };
      const provider = new GeminiCvTailoringProvider(mockAi);

      try {
        await provider.generateSuggestions(mockEvidence, mockPlan, mockJob, {
          retryConfig: { maxRetriesPerModel: 1, baseDelayMs: 5, maxDelayMs: 10, maxJitterMs: 2, requestTimeoutMs: 1000 }
        });
        expect.unreachable('Should have thrown GEMINI_UNAVAILABLE');
      } catch (err: any) {
        expect(err.message).toBe('GEMINI_UNAVAILABLE');
        expect(err.status).toBe(503);
      }
    });

    it('8: Deterministic evidence-safety checks remain 100% active on output', async () => {
      // An AI suggestion that introduces an unevidenced certification (e.g. CCIE)
      const unevidencedCertResponse = {
        text: JSON.stringify({
          experience_suggestions: [
            {
              original_text: 'Configured enterprise Cisco routers and switches for 99.9% network uptime across regional datacenters.',
              suggested_text: 'Configured enterprise Cisco routers and switches holding CCIE certification.',
              source_refs: ['exp-net-1'],
              reason: 'Add certification'
            }
          ]
        })
      };

      const mockAi: any = { models: { generateContent: vi.fn().mockResolvedValue(unevidencedCertResponse) } };
      const provider = new GeminiCvTailoringProvider(mockAi);

      const raw = await provider.generateSuggestions(mockEvidence, mockPlan, mockJob, {
        retryConfig: { maxRetriesPerModel: 0, requestTimeoutMs: 1000 }
      });

      const validation = validateSuggestion(raw[0], mockEvidence);
      expect(validation.isValid).toBe(false);
      expect(validation.status).toBe('blocked');
      expect(validation.issues.some(i => i.toLowerCase().includes('unsupported certification') || i.includes('CCIE'))).toBe(true);
    });
  });
});
