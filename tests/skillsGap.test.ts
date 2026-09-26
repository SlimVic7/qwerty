import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateSkillsGapAnalysis, getGapTypeLabel } from '../server/services/skillsGap/skillsGapEngine.js';
import { CandidateJobAlignmentRecord } from '../server/services/matching/jobAlignmentStore.js';

describe('Deterministic Skills Gap & Development Insights Engine (Stage 5.3)', () => {
  const mockJob = {
    id: 'job-net-123',
    title: 'Senior Network Engineer',
    company_name: 'Acme Telecom',
    updated_at: '2026-09-25T12:00:00Z'
  };

  const mockParse = {
    id: 'parse-candidate-456',
    applied_at: '2026-09-25T14:00:00Z'
  };

  const mockAlignment: CandidateJobAlignmentRecord = {
    id: 'align-789',
    user_id: 'user-001',
    cv_version_id: 'cv-ver-1',
    parse_id: mockParse.id,
    job_id: mockJob.id,
    job_updated_at: mockJob.updated_at,
    candidate_applied_at: mockParse.applied_at,
    job_title: mockJob.title,
    company_name: mockJob.company_name,
    status: 'completed',
    explanation_status: 'completed',
    ruleset_version: 'job-alignment-v1.3',
    score: 65,
    max_score: 100,
    created_at: '2026-09-25T14:30:00Z',
    criteria_breakdown: [
      {
        id: 'crit-1',
        criterion: 'Cisco routing & switching (CCNP or equivalent)',
        category: 'required',
        status: 'matched',
        candidate_evidence: 'Managed enterprise Cisco Nexus 9000 routers and Core Catalyst switches across 4 datacenters.',
        candidate_source: 'experience',
        explanation: 'Requirement fully substantiated by approved CV evidence.'
      },
      {
        id: 'crit-2',
        criterion: 'BGP and OSPF routing protocols',
        category: 'required',
        status: 'matched',
        candidate_evidence: 'Configured multiprotocol BGP peering and multi-area OSPF routing.',
        candidate_source: 'skills',
        explanation: 'Direct match for BGP and OSPF in technical skills.'
      },
      {
        id: 'crit-3',
        criterion: '5+ years experience in enterprise network administration',
        category: 'experience',
        status: 'partially_supported',
        candidate_evidence: 'Candidate profile demonstrates 3.5 years of verifiable network administration.',
        candidate_source: 'experience',
        explanation: 'Partial duration demonstrated (3.5 years of 5+ years required).'
      },
      {
        id: 'crit-4',
        criterion: 'Bachelor of Science in Computer Science or related field',
        category: 'education',
        status: 'matched',
        candidate_evidence: 'B.Sc. in Computer Engineering from University of Lagos',
        candidate_source: 'education',
        explanation: 'Related engineering discipline degree substantiated.'
      },
      {
        id: 'crit-5',
        criterion: 'Python network automation (Netmiko, Nornir, Ansible)',
        category: 'preferred',
        status: 'not_found',
        explanation: 'Requirement not found in candidate approved profile.'
      },
      {
        id: 'crit-6',
        criterion: 'CCNP Enterprise Certification',
        category: 'required',
        status: 'not_found',
        explanation: 'Certification not found in candidate approved profile.'
      },
      {
        id: 'crit-7',
        criterion: 'Attributes & Skills (Required):',
        category: 'required',
        status: 'not_applicable',
        explanation: 'Structural heading.'
      }
    ]
  };

  it('generates deterministic skills gap analysis without calling external AI', () => {
    const analysis = generateSkillsGapAnalysis(mockJob, mockParse, mockAlignment);

    expect(analysis).toBeDefined();
    expect(analysis.job_id).toBe(mockJob.id);
    expect(analysis.candidate_parse_id).toBe(mockParse.id);
    expect(analysis.alignment_id).toBe(mockAlignment.id);
    expect(analysis.ruleset_version).toBe('job-alignment-v1.3');

    // Summary counts
    expect(analysis.summary.total_criteria).toBe(7);
    expect(analysis.summary.supported_strengths_count).toBe(3); // crit-1, crit-2, crit-4
    expect(analysis.summary.partially_evidenced_count).toBe(1); // crit-3
    expect(analysis.summary.not_found_count).toBe(2); // crit-5, crit-6
    expect(analysis.summary.excluded_count).toBe(1); // crit-7 (structural)
    expect(analysis.summary.evaluable_criteria_count).toBe(6);
  });

  it('maps criteria statuses deterministically to standard Stage 5.3 categories', () => {
    const analysis = generateSkillsGapAnalysis(mockJob, mockParse, mockAlignment);

    // Supported Strengths
    const strengthIds = analysis.supported_strengths.map(s => s.id);
    expect(strengthIds).toContain('crit-1');
    expect(strengthIds).toContain('crit-2');
    expect(strengthIds).toContain('crit-4');

    // Partially Evidenced
    expect(analysis.partially_evidenced.length).toBe(1);
    expect(analysis.partially_evidenced[0].id).toBe('crit-3');
    expect(analysis.partially_evidenced[0].gap_type).toBe('EXPERIENCE_DURATION');
    expect(analysis.partially_evidenced[0].documentation_step).toBeTruthy();
    expect(analysis.partially_evidenced[0].development_step).toBeTruthy();

    // Not Found Gaps
    const gapIds = analysis.not_found_gaps.map(g => g.id);
    expect(gapIds).toContain('crit-5');
    expect(gapIds).toContain('crit-6');

    // Excluded
    expect(analysis.excluded.length).toBe(1);
    expect(analysis.excluded[0].id).toBe('crit-7');
  });

  it('strictly adheres to evidence-safety language principle (NO "You do not have this skill")', () => {
    const analysis = generateSkillsGapAnalysis(mockJob, mockParse, mockAlignment);
    const jsonString = JSON.stringify(analysis);

    // Check language rules: NEVER assert absence of candidate capability
    expect(jsonString).not.toMatch(/you\s+do\s+not\s+have/i);
    expect(jsonString).not.toMatch(/you\s+lack/i);
    expect(jsonString).not.toMatch(/candidate\s+lacks/i);
    expect(jsonString).not.toMatch(/does\s+not\s+possess/i);

    // Assert neutral, profile-grounded language
    for (const gap of analysis.not_found_gaps) {
      expect(gap.explanation).toContain('Your approved profile does not currently evidence this requirement.');
      expect(gap.documentation_step).toContain('If you have experience or credentials matching this requirement');
      expect(gap.development_step).toBeTruthy();
    }
  });

  it('correctly classifies requirement gap types using generic classifier', () => {
    const analysis = generateSkillsGapAnalysis(mockJob, mockParse, mockAlignment);

    // Python automation -> TECHNICAL_SKILL
    const pythonGap = analysis.not_found_gaps.find(g => g.id === 'crit-5');
    expect(pythonGap?.gap_type).toBe('TECHNICAL_SKILL');
    expect(pythonGap?.gap_type_label).toBe('Technical Skill / Tooling');

    // CCNP Certification -> CERTIFICATION
    const ccnpGap = analysis.not_found_gaps.find(g => g.id === 'crit-6');
    expect(ccnpGap?.gap_type).toBe('CERTIFICATION');
    expect(ccnpGap?.gap_type_label).toBe('Professional Credential / Certification');

    // 5+ years experience -> EXPERIENCE_DURATION
    const tenurePartial = analysis.partially_evidenced.find(p => p.id === 'crit-3');
    expect(tenurePartial?.gap_type).toBe('EXPERIENCE_DURATION');
    expect(tenurePartial?.gap_type_label).toBe('Experience Tenure & Seniority');
  });

  it('computes coverage percentage accurately', () => {
    const analysis = generateSkillsGapAnalysis(mockJob, mockParse, mockAlignment);
    // 3 strengths + 1 partial * 0.5 = 3.5 / 6 = 58%
    expect(analysis.summary.coverage_percentage).toBe(58);
  });

  describe('Stage 5.3 Semantic Guidance Corrections (Behavioral & Certification-or-Equivalent)', () => {
    it('applies evidence-strengthening guidance to communication skills without technical lab recommendations (Item A & B)', () => {
      const alignment: CandidateJobAlignmentRecord = {
        ...mockAlignment,
        criteria_breakdown: [
          {
            id: 'comm-1',
            criterion: 'Excellent written and verbal communication skills',
            category: 'required',
            status: 'not_found'
          },
          {
            id: 'comm-2',
            criterion: 'Strong communication skills presenting internal audit and risk matters to diverse stakeholders',
            category: 'required',
            status: 'not_found'
          }
        ]
      };

      const analysis = generateSkillsGapAnalysis(mockJob, mockParse, alignment);
      expect(analysis.not_found_gaps).toHaveLength(2);

      for (const gap of analysis.not_found_gaps) {
        expect(gap.development_guidance_category).toBe('BEHAVIORAL_OR_EVIDENCE_LIMITED');
        expect(gap.development_step).toContain('This type of capability may not be reliably demonstrated from CV evidence alone');
        expect(gap.development_step).not.toContain('labs');
        expect(gap.development_step).not.toContain('code repositories');
        expect(gap.development_step).not.toContain('technical proficiency');
      }
    });

    it('handles time management and competing priorities without arbitrary course/initiative guidance (Item C)', () => {
      const alignment: CandidateJobAlignmentRecord = {
        ...mockAlignment,
        criteria_breakdown: [
          {
            id: 'time-1',
            criterion: 'Strong time management skills and the ability to manage competing priorities effectively',
            category: 'required',
            status: 'not_found'
          }
        ]
      };

      const analysis = generateSkillsGapAnalysis(mockJob, mockParse, alignment);
      const gap = analysis.not_found_gaps[0];
      expect(gap.development_guidance_category).toBe('BEHAVIORAL_OR_EVIDENCE_LIMITED');
      expect(gap.development_step).toContain('This type of capability may not be reliably demonstrated from CV evidence alone');
      expect(gap.development_step).not.toContain('Volunteer to lead initiatives');
      expect(gap.development_step).not.toContain('hands-on labs');
    });

    it('guides independent work and stakeholder collaboration conservatively (Item D)', () => {
      const alignment: CandidateJobAlignmentRecord = {
        ...mockAlignment,
        criteria_breakdown: [
          {
            id: 'stakeholder-1',
            criterion: 'Ability to work independently and with diverse stakeholders',
            category: 'required',
            status: 'not_found'
          }
        ]
      };

      const analysis = generateSkillsGapAnalysis(mockJob, mockParse, alignment);
      const gap = analysis.not_found_gaps[0];
      expect(gap.development_guidance_category).toBe('BEHAVIORAL_OR_EVIDENCE_LIMITED');
      expect(gap.development_step).toContain('This type of capability may not be reliably demonstrated from CV evidence alone');
    });

    it('guides general critical thinking as behavioral while leaving technical analytical tools intact (Item E)', () => {
      const alignment: CandidateJobAlignmentRecord = {
        ...mockAlignment,
        criteria_breakdown: [
          {
            id: 'crit-thinking-1',
            criterion: 'Strong analytical and critical-thinking skills, with the ability to interpret information and draw meaningful conclusions',
            category: 'required',
            status: 'not_found'
          },
          {
            id: 'tech-tool-1',
            criterion: 'Advanced Audit command language and skills.',
            category: 'required',
            status: 'not_found'
          }
        ]
      };

      const analysis = generateSkillsGapAnalysis(mockJob, mockParse, alignment);
      const behGap = analysis.not_found_gaps.find(g => g.id === 'crit-thinking-1');
      const techGap = analysis.not_found_gaps.find(g => g.id === 'tech-tool-1');

      expect(behGap?.development_guidance_category).toBe('BEHAVIORAL_OR_EVIDENCE_LIMITED');
      expect(behGap?.development_step).toContain('This type of capability may not be reliably demonstrated from CV evidence alone');

      expect(techGap?.development_guidance_category).toBe('TECHNICAL_SKILL');
      expect(techGap?.development_step).toContain('targeted hands-on labs, structured training, code repositories');
    });

    it('preserves true technical skills guidance for networking and office tooling (Items F & G)', () => {
      const alignment: CandidateJobAlignmentRecord = {
        ...mockAlignment,
        criteria_breakdown: [
          {
            id: 'tcp-1',
            criterion: 'Strong TCP/IP knowledge',
            category: 'required',
            status: 'not_found'
          },
          {
            id: 'cisco-1',
            criterion: 'Fortinet/Cisco experience',
            category: 'required',
            status: 'not_found'
          },
          {
            id: 'office-1',
            criterion: 'Proficiency in Microsoft Office applications, particularly Excel, Word and PowerPoint',
            category: 'responsibility',
            status: 'not_found'
          }
        ]
      };

      const analysis = generateSkillsGapAnalysis(mockJob, mockParse, alignment);
      const tcpGap = analysis.not_found_gaps.find(g => g.id === 'tcp-1');
      const ciscoGap = analysis.not_found_gaps.find(g => g.id === 'cisco-1');
      const officeGap = analysis.not_found_gaps.find(g => g.id === 'office-1');

      expect(tcpGap?.development_guidance_category).toBe('TECHNICAL_SKILL');
      expect(tcpGap?.development_step).toContain('targeted hands-on labs');

      expect(ciscoGap?.development_guidance_category).toBe('TECHNICAL_SKILL');
      expect(ciscoGap?.development_step).toContain('targeted hands-on labs');

      expect(officeGap?.development_guidance_category).toBe('TECHNICAL_SKILL');
      expect(officeGap?.development_step).toContain('targeted hands-on labs');
    });

    it('differentiates certification-or-equivalent from certification-only (Items H & I)', () => {
      const alignment: CandidateJobAlignmentRecord = {
        ...mockAlignment,
        criteria_breakdown: [
          {
            id: 'cert-equiv-1',
            criterion: 'CCNA or equivalent knowledge',
            category: 'required',
            status: 'not_found'
          },
          {
            id: 'cert-only-1',
            criterion: 'CCNA certification required',
            category: 'required',
            status: 'not_found'
          }
        ]
      };

      const analysis = generateSkillsGapAnalysis(mockJob, mockParse, alignment);
      const equivGap = analysis.not_found_gaps.find(g => g.id === 'cert-equiv-1');
      const onlyGap = analysis.not_found_gaps.find(g => g.id === 'cert-only-1');

      expect(equivGap?.development_guidance_category).toBe('CERTIFICATION_OR_EQUIVALENT');
      expect(equivGap?.development_step).toContain('This requirement allows either the named certification or equivalent demonstrable knowledge');

      expect(onlyGap?.development_guidance_category).toBe('CERTIFICATION_ONLY');
      expect(onlyGap?.development_step).toContain('Consider pursuing this certification if it directly aligns with your career goals');
      expect(onlyGap?.development_step).not.toContain('equivalent demonstrable knowledge');
    });

    it('enforces academic and duration guidance boundaries (Items J & K)', () => {
      const alignment: CandidateJobAlignmentRecord = {
        ...mockAlignment,
        criteria_breakdown: [
          {
            id: 'edu-1',
            criterion: 'Bachelor of Science in Computer Science or related field',
            category: 'required',
            status: 'not_found'
          },
          {
            id: 'tenure-1',
            criterion: 'Minimum 3 years network engineering experience',
            category: 'experience',
            status: 'not_found'
          }
        ]
      };

      const analysis = generateSkillsGapAnalysis(mockJob, mockParse, alignment);
      const eduGap = analysis.not_found_gaps.find(g => g.id === 'edu-1');
      const tenureGap = analysis.not_found_gaps.find(g => g.id === 'tenure-1');

      expect(eduGap?.development_guidance_category).toBe('EDUCATION');
      expect(eduGap?.development_step).toContain('short courses, labs, or bootcamps do not substitute for formal academic degrees');

      expect(tenureGap?.development_guidance_category).toBe('EXPERIENCE_DURATION');
      expect(tenureGap?.development_step).toContain('Coursework or certifications cannot substitute for elapsed professional tenure');
    });

    it('verifies cross-role fixture coverage across 8 domains (Section 10.G)', () => {
      const crossRoleBreakdown = [
        // 1. Software Engineering
        { id: 'swe-1', criterion: 'React, TypeScript and modern web architectures', category: 'required', status: 'not_found' },
        // 2. Cloud
        { id: 'cloud-1', criterion: 'AWS Solutions Architect certification or equivalent knowledge', category: 'required', status: 'not_found' },
        // 3. Cybersecurity
        { id: 'sec-1', criterion: 'CISSP certification required', category: 'required', status: 'not_found' },
        // 4. Finance / Accounting
        { id: 'fin-1', criterion: 'Bachelor of Science in Accounting, Finance or Economics', category: 'required', status: 'not_found' },
        // 5. Audit / Risk
        { id: 'audit-1', criterion: 'Hands-on experience in internal controls testing and audit fieldwork', category: 'required', status: 'not_found' },
        // 6. Networking
        { id: 'net-1', criterion: '5+ years experience in enterprise network administration', category: 'experience', status: 'not_found' },
        // 7. Data / Analytics
        { id: 'data-1', criterion: 'Familiarity with ERP platforms and business systems', category: 'required', status: 'not_found' },
        // 8. Operations
        { id: 'ops-1', criterion: 'Strong time management skills and the ability to manage competing priorities effectively', category: 'required', status: 'not_found' }
      ];

      const alignment: CandidateJobAlignmentRecord = {
        ...mockAlignment,
        criteria_breakdown: crossRoleBreakdown
      };

      const analysis = generateSkillsGapAnalysis(mockJob, mockParse, alignment);
      expect(analysis.not_found_gaps).toHaveLength(8);

      const categories = analysis.not_found_gaps.map(g => g.development_guidance_category);
      expect(categories).toContain('TECHNICAL_SKILL');
      expect(categories).toContain('CERTIFICATION_OR_EQUIVALENT');
      expect(categories).toContain('CERTIFICATION_ONLY');
      expect(categories).toContain('EDUCATION');
      expect(categories).toContain('PRACTICAL_EXPERIENCE');
      expect(categories).toContain('EXPERIENCE_DURATION');
      expect(categories).toContain('DOMAIN_KNOWLEDGE');
      expect(categories).toContain('BEHAVIORAL_OR_EVIDENCE_LIMITED');
    });
  });
});
