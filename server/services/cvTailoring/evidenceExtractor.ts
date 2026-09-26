/**
 * QWERTY Stage 5.2 — Candidate Evidence Card Normalizer
 * Extracts discrete factual evidence units from candidate's approved reviewed_data.
 */

import { CandidateEvidenceCard } from './types.js';

export function buildEvidenceCards(reviewedData: any, profile?: any): CandidateEvidenceCard[] {
  const cards: CandidateEvidenceCard[] = [];

  if (!reviewedData) {
    return cards;
  }

  // 1. Professional Summary
  const summary = reviewedData.professional?.summary || profile?.summary;
  if (summary && typeof summary === 'string' && summary.trim().length > 0) {
    cards.push({
      evidence_id: 'prof-summary',
      source_type: 'summary',
      source_path: 'professional.summary',
      text: summary.trim()
    });
  }

  // 2. Headline
  const headline = reviewedData.professional?.headline || profile?.headline;
  if (headline && typeof headline === 'string' && headline.trim().length > 0) {
    cards.push({
      evidence_id: 'prof-headline',
      source_type: 'headline',
      source_path: 'professional.headline',
      text: headline.trim()
    });
  }

  // 3. Skills
  const skills = Array.isArray(reviewedData.skills) ? reviewedData.skills : [];
  skills.forEach((skill: any, idx: number) => {
    const skillName = typeof skill === 'string' ? skill : (skill?.name || '');
    if (skillName && skillName.trim().length > 0) {
      cards.push({
        evidence_id: `skill-${idx}`,
        source_type: 'skills',
        source_path: `skills[${idx}]`,
        text: skillName.trim(),
        metadata: typeof skill === 'object' ? { ...skill } : undefined
      });
    }
  });

  // 4. Experience Entries & Bullets
  const experience = Array.isArray(reviewedData.experience) ? reviewedData.experience : [];
  experience.forEach((exp: any, expIdx: number) => {
    const employer = exp.employer || exp.company || '';
    const jobTitle = exp.job_title || exp.title || '';
    const dates = {
      start_date: exp.start_date || undefined,
      end_date: exp.end_date || undefined,
      is_current: exp.is_current || false
    };

    // Card for role tenure/identity
    if (employer || jobTitle) {
      cards.push({
        evidence_id: `exp-${expIdx}-role`,
        source_type: 'experience',
        source_path: `experience[${expIdx}]`,
        text: `${jobTitle} at ${employer}`.trim(),
        employer: employer.trim(),
        job_title: jobTitle.trim(),
        dates,
        metadata: {
          experience_index: expIdx,
          is_role_title: true,
          immutable: true
        }
      });
    }

    // Individual responsibility bullets
    const responsibilities = Array.isArray(exp.responsibilities) 
      ? exp.responsibilities 
      : (typeof exp.responsibilities === 'string' ? exp.responsibilities.split('\n') : []);

    responsibilities.forEach((resp: any, respIdx: number) => {
      const respText = typeof resp === 'string' ? resp.trim() : (resp?.text || '').trim();
      if (respText.length > 0) {
        cards.push({
          evidence_id: `exp-${expIdx}-resp-${respIdx}`,
          source_type: 'experience',
          source_path: `experience[${expIdx}].responsibilities[${respIdx}]`,
          text: respText,
          employer: employer.trim(),
          job_title: jobTitle.trim(),
          dates,
          metadata: {
            experience_index: expIdx,
            is_responsibility: true
          }
        });
      }
    });

    // Individual descriptive work-history statements from description
    if (exp.description && typeof exp.description === 'string' && exp.description.trim().length > 0) {
      const descSentences = exp.description
        .split(/(?<=[.!?])\s+|\n+/)
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0);

      descSentences.forEach((sentence: string, sIdx: number) => {
        const isDuplicate = responsibilities.some((r: any) => {
          const t = typeof r === 'string' ? r.trim() : (r?.text || '').trim();
          return t.toLowerCase() === sentence.toLowerCase();
        });
        if (!isDuplicate) {
          cards.push({
            evidence_id: `exp-${expIdx}-desc-${sIdx}`,
            source_type: 'experience',
            source_path: `experience[${expIdx}].description[${sIdx}]`,
            text: sentence,
            employer: employer.trim(),
            job_title: jobTitle.trim(),
            dates,
            metadata: {
              experience_index: expIdx,
              is_responsibility: true,
              is_description: true
            }
          });
        }
      });
    }

    // Individual achievement bullets
    const achievements = Array.isArray(exp.achievements)
      ? exp.achievements
      : (typeof exp.achievements === 'string' ? exp.achievements.split('\n') : []);

    achievements.forEach((ach: any, achIdx: number) => {
      const achText = typeof ach === 'string' ? ach.trim() : (ach?.text || '').trim();
      if (achText.length > 0) {
        cards.push({
          evidence_id: `exp-${expIdx}-ach-${achIdx}`,
          source_type: 'experience',
          source_path: `experience[${expIdx}].achievements[${achIdx}]`,
          text: achText,
          employer: employer.trim(),
          job_title: jobTitle.trim(),
          dates,
          metadata: {
            experience_index: expIdx,
            is_achievement: true
          }
        });
      }
    });
  });

  // 5. Certifications
  const certifications = Array.isArray(reviewedData.certifications) ? reviewedData.certifications : [];
  certifications.forEach((cert: any, certIdx: number) => {
    const certName = typeof cert === 'string' ? cert : (cert?.name || '');
    const issuer = cert?.issuer || '';
    if (certName && certName.trim().length > 0) {
      cards.push({
        evidence_id: `cert-${certIdx}`,
        source_type: 'certifications',
        source_path: `certifications[${certIdx}]`,
        text: issuer ? `${certName.trim()} (${issuer.trim()})` : certName.trim(),
        metadata: {
          name: certName.trim(),
          issuer: issuer.trim(),
          issue_date: cert?.issue_date,
          expiry_date: cert?.expiry_date
        }
      });
    }
  });

  // 6. Education
  const education = Array.isArray(reviewedData.education) ? reviewedData.education : [];
  education.forEach((edu: any, eduIdx: number) => {
    const degree = edu?.degree || '';
    const institution = edu?.institution || '';
    if (degree || institution) {
      cards.push({
        evidence_id: `edu-${eduIdx}`,
        source_type: 'education',
        source_path: `education[${eduIdx}]`,
        text: degree && institution ? `${degree.trim()} - ${institution.trim()}` : (degree || institution).trim(),
        metadata: {
          degree: degree.trim(),
          institution: institution.trim(),
          graduation_year: edu?.graduation_year,
          start_date: edu?.start_date,
          end_date: edu?.end_date
        }
      });
    }
  });

  // 7. Projects
  const projects = Array.isArray(reviewedData.projects) ? reviewedData.projects : [];
  projects.forEach((proj: any, projIdx: number) => {
    const name = proj?.name || '';
    const desc = proj?.description || '';
    if (name || desc) {
      cards.push({
        evidence_id: `proj-${projIdx}`,
        source_type: 'projects',
        source_path: `projects[${projIdx}]`,
        text: name && desc ? `${name.trim()}: ${desc.trim()}` : (name || desc).trim(),
        metadata: { ...proj }
      });
    }
  });

  return cards;
}
