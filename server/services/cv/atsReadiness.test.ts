import { describe, it, expect } from 'vitest';
import { calculateAtsReadiness } from './atsReadiness.js';

describe('atsReadiness', () => {
  it('calculates score deterministically for perfect profile', () => {
    const extractedData = {
      personal: {
        full_name: 'Jane Doe',
        phone: '123456789',
        location: 'London',
        links: ['https://linkedin.com']
      },
      professional: {
        headline: 'Developer',
        summary: 'A highly motivated developer with extensive experience building ATS readiness systems.'
      },
      experience: [
        {
          job_title: 'Senior Dev',
          company_name: 'Acme Corp',
          start_date: '2020-01',
          description: 'Did a lot of great programming and delivered key features on time.'
        }
      ],
      skills: ['TypeScript', 'React'],
      education: [
        {
          institution_name: 'University of Technology',
          qualification: 'BSc Computer Science'
        }
      ]
    };

    const assessment = calculateAtsReadiness(extractedData, null, { hasExtractedData: true, hasRawTextHash: true });

    expect(assessment.total_score).toBe(100);
    expect(assessment.components.length).toBe(6);
    expect(assessment.components.find((c: any) => c.id === 'machine_readability')?.score).toBe(10);
    expect(assessment.components.find((c: any) => c.id === 'contact_information')?.score).toBe(15);
    expect(assessment.components.find((c: any) => c.id === 'professional_profile')?.score).toBe(15);
    expect(assessment.components.find((c: any) => c.id === 'experience_structure')?.score).toBe(30);
    expect(assessment.components.find((c: any) => c.id === 'skills')?.score).toBe(15);
    expect(assessment.components.find((c: any) => c.id === 'education')?.score).toBe(15);
  });

  it('handles missing data', () => {
    const extractedData = {
      personal: {},
      professional: {},
      experience: []
    };

    const assessment = calculateAtsReadiness(extractedData, null, { hasExtractedData: false, hasRawTextHash: false });

    expect(assessment.total_score).toBe(0);
  });

  it('selects reviewed_data over extracted_data when present', () => {
    const extractedData = {
      personal: { full_name: 'Original Extracted Name' },
      professional: { headline: 'Junior Dev' }
    };
    const reviewedData = {
      personal: { full_name: 'Reviewed Name', phone: '12345', location: 'London' },
      professional: { headline: 'Lead Architect', summary: 'A comprehensive summary of experience and accomplishments over 10 years.' }
    };

    const assessment = calculateAtsReadiness(extractedData, reviewedData, { hasExtractedData: true, hasRawTextHash: true });
    // Contact: full_name (+5), phone (+5), location (+3) = 13
    // Profile: headline (+5), summary > 50 chars (+10) = 15
    // Machine readability: 10
    expect(assessment.components.find(c => c.id === 'contact_information')?.score).toBe(13);
    expect(assessment.components.find(c => c.id === 'professional_profile')?.score).toBe(15);
  });

  it('reproduces exact 28/100 score for the live assessment source object', () => {
    const liveSource = {
      personal: {
        phone: '08140618409, 08039899965漂流瓶/08140618409, 08039899965 (08140618409, 08039899965)',
        location: 'lagos',
        full_name: 'Victor ALABI'
      },
      professional: {
        headline: 'IT Audit | Cybersecurity | Risk & Cloud Security',
        years_experience: 6
      }
    };

    const assessment = calculateAtsReadiness(null, liveSource, { hasExtractedData: true, hasRawTextHash: true });
    expect(assessment.total_score).toBe(28);

    const scores = Object.fromEntries(assessment.components.map(c => [c.id, c.score]));
    expect(scores['machine_readability']).toBe(10);
    expect(scores['contact_information']).toBe(13);
    expect(scores['professional_profile']).toBe(5);
    expect(scores['experience_structure']).toBe(0);
    expect(scores['skills']).toBe(0);
    expect(scores['education']).toBe(0);
  });

  it('ensures populated experience, skills, and education cannot incorrectly score 0', () => {
    const dataWithProviderAliases = {
      personal: { full_name: 'Test Candidate', phone: '555-1234', location: 'Berlin' },
      professional: { headline: 'Software Engineer', summary: 'Experienced engineer with expertise in distributed systems and cloud platforms.' },
      experience: [
        {
          job_title: 'Systems Auditor',
          company: 'Access Microfinance Holding',
          start_date: '2023-12',
          achievements: ['Conducted comprehensive audits across 10 global business units successfully.']
        }
      ],
      skills: ['Audit', 'Security', 'Risk Assessment'],
      education: [
        {
          institution: 'VALAR INSTITUTE',
          degree: 'MBA in Leadership and Management'
        }
      ]
    };

    const assessment = calculateAtsReadiness(dataWithProviderAliases, null, { hasExtractedData: true, hasRawTextHash: true });
    const scores = Object.fromEntries(assessment.components.map(c => [c.id, c.score]));

    expect(scores['experience_structure']).toBeGreaterThan(0);
    expect(scores['experience_structure']).toBe(30); // 10 base + 10 single role prorate + 2.5*4
    expect(scores['skills']).toBe(15);
    expect(scores['education']).toBe(15); // 5 base + 10 institution & degree
    expect(assessment.total_score).toBeGreaterThan(80);
  });
});
