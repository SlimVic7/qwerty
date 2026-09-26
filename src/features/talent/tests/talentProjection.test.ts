import { describe, it, expect } from 'vitest';
import {
  normalizeSkillNames,
  normalizeExperience,
  normalizeEducation,
  normalizeCertifications,
  normalizeLanguages
} from '../../../../server/services/talent/talentProjection.js';
import { formatSkillName, formatCertification } from '../talentProjection.js';

describe('Talent Pool Safe Normalization & Projection', () => {
  describe('Skills Normalization', () => {
    it('normalizes legacy string[] skills cleanly', () => {
      const input = ['  IT Audit  ', 'Cybersecurity', 'SOC 2'];
      const result = normalizeSkillNames(input);
      expect(result).toEqual(['IT Audit', 'Cybersecurity', 'SOC 2']);
    });

    it('normalizes structured object[] skills and extracts only names', () => {
      const input = [
        {
          name: 'IT Audit',
          category: 'Governance',
          evidence: 'Audit lead snippet',
          confidence: 'high'
        },
        {
          name: 'Penetration Testing',
          category: 'Technical',
          evidence: 'CEH cert evidence',
          confidence: 'medium'
        }
      ];
      const result = normalizeSkillNames(input);
      expect(result).toEqual(['IT Audit', 'Penetration Testing']);
      // Ensure no internal metadata leaked
      expect(JSON.stringify(result)).not.toContain('evidence');
      expect(JSON.stringify(result)).not.toContain('confidence');
      expect(JSON.stringify(result)).not.toContain('Governance');
    });

    it('handles mixed skills array with strings, objects, and malformed elements', () => {
      const input = [
        'React',
        { name: 'TypeScript', confidence: 'high' },
        null,
        undefined,
        12345,
        { invalid: 'no-name-here' },
        { name: '  PostgreSQL  ' },
        'React', // duplicate
        { name: 'react' } // case-insensitive duplicate
      ];
      const result = normalizeSkillNames(input);
      expect(result).toEqual(['React', 'TypeScript', 'PostgreSQL']);
    });

    it('handles empty skills array and non-array safely', () => {
      expect(normalizeSkillNames([])).toEqual([]);
      expect(normalizeSkillNames(null)).toEqual([]);
      expect(normalizeSkillNames(undefined)).toEqual([]);
      expect(normalizeSkillNames('single-string-not-array')).toEqual([]);
    });
  });

  describe('Frontend Safe Skill Formatting', () => {
    it('formats string skill safely', () => {
      expect(formatSkillName('  Cloud Security  ')).toBe('Cloud Security');
      expect(formatSkillName('')).toBeNull();
    });

    it('formats structured skill safely without throwing object React child error', () => {
      const structured = {
        name: 'Risk Management',
        category: 'Compliance',
        evidence: 'Risk assessment lead',
        confidence: 'high'
      };
      expect(formatSkillName(structured)).toBe('Risk Management');
    });

    it('returns null safely for malformed objects', () => {
      expect(formatSkillName(null)).toBeNull();
      expect(formatSkillName(undefined)).toBeNull();
      expect(formatSkillName({})).toBeNull();
      expect(formatSkillName({ category: 'Compliance' })).toBeNull();
      expect(formatSkillName(123)).toBeNull();
    });
  });

  describe('Experience Normalization', () => {
    it('normalizes structured experience and strips evidence and confidence', () => {
      const input = [
        {
          job_title: 'Senior Security Consultant',
          company_name: 'SecureCorp UK',
          location: 'London, UK',
          start_date: '2021-01',
          end_date: 'Present',
          is_current: true,
          description: 'Leading penetration testing and cloud security audits.',
          achievements: ['Reduced incident response time by 40%', 'Achieved ISO 27001'],
          evidence: 'Exact quote snippet from page 2',
          confidence: 'high'
        }
      ];

      const result = normalizeExperience(input);
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('Senior Security Consultant');
      expect(result[0].company).toBe('SecureCorp UK');
      expect(result[0].location).toBe('London, UK');
      expect(result[0].start_date).toBe('2021-01');
      expect(result[0].end_date).toBe('Present');
      expect(result[0].is_current).toBe(true);
      expect(result[0].achievements).toEqual([
        'Reduced incident response time by 40%',
        'Achieved ISO 27001'
      ]);

      // Prove private fields are completely stripped
      expect((result[0] as any).evidence).toBeUndefined();
      expect((result[0] as any).confidence).toBeUndefined();
      expect(JSON.stringify(result)).not.toContain('evidence');
      expect(JSON.stringify(result)).not.toContain('confidence');
    });

    it('normalizes legacy/sparse experience', () => {
      const input = [
        { role: 'Developer', company: 'Acme' },
        'Freelance Consultant'
      ];
      const result = normalizeExperience(input);
      expect(result).toHaveLength(2);
      expect(result[0].role).toBe('Developer');
      expect(result[0].company).toBe('Acme');
      expect(result[1].role).toBe('Freelance Consultant');
    });
  });

  describe('Education Normalization', () => {
    it('normalizes structured education and excludes evidence/confidence', () => {
      const input = [
        {
          qualification: 'MSc Information Security',
          institution_name: 'Royal Holloway',
          field_of_study: 'Cybersecurity',
          start_date: '2019',
          end_date: '2020',
          evidence: 'Graduated with distinction',
          confidence: 'high'
        }
      ];

      const result = normalizeEducation(input);
      expect(result).toHaveLength(1);
      expect(result[0].degree).toBe('MSc Information Security');
      expect(result[0].institution).toBe('Royal Holloway');
      expect(result[0].field_of_study).toBe('Cybersecurity');
      expect(result[0].graduation_year).toBe('2020');

      expect((result[0] as any).evidence).toBeUndefined();
      expect((result[0] as any).confidence).toBeUndefined();
    });
  });

  describe('Certifications Normalization', () => {
    it('normalizes structured certifications and excludes credentials/evidence', () => {
      const input = [
        {
          name: 'Certified Information Systems Auditor (CISA)',
          issuer: 'ISACA',
          issue_date: '2022',
          credential_id: 'secret-cisa-1234',
          credential_url: 'https://isaca.org/verify/1234',
          evidence: 'Passed in top 5%',
          confidence: 'high'
        },
        'AWS Solutions Architect Associate'
      ];

      const result = normalizeCertifications(input);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'Certified Information Systems Auditor (CISA)',
        issuer: 'ISACA',
        date: '2022'
      });
      expect(result[1]).toEqual({
        name: 'AWS Solutions Architect Associate'
      });

      expect((result[0] as any).evidence).toBeUndefined();
      expect((result[0] as any).confidence).toBeUndefined();
      expect((result[0] as any).credential_id).toBeUndefined();
    });

    it('formats certification display labels on frontend', () => {
      expect(formatCertification('CISSP')).toBe('CISSP');
      expect(formatCertification({ name: 'CISM', issuer: 'ISACA', date: '2023' })).toBe('CISM (ISACA) — 2023');
      expect(formatCertification({ name: 'Security+' })).toBe('Security+');
      expect(formatCertification(null)).toBeNull();
      expect(formatCertification({})).toBeNull();
    });
  });

  describe('Languages Normalization', () => {
    it('normalizes languages cleanly', () => {
      const input = [
        'English',
        { language: 'French', proficiency: 'Professional working' },
        null
      ];
      expect(normalizeLanguages(input)).toEqual(['English', 'French (Professional working)']);
    });
  });
});
