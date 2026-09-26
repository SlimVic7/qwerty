/**
 * Frontend Talent Pool Safe Projection & Display Helpers
 * 
 * Guarantees that React components never crash with "Objects are not valid as a React child"
 * regardless of legacy vs modern API payloads or malformed structures.
 */

export interface CandidateWorkExperience {
  role?: string;
  title?: string;
  job_title?: string;
  company?: string;
  company_name?: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  is_current?: boolean;
  description?: string;
  achievements?: string[];
}

export interface CandidateEducation {
  degree?: string;
  qualification?: string;
  institution?: string;
  institution_name?: string;
  field_of_study?: string;
  graduation_year?: string;
  start_date?: string;
  end_date?: string;
}

export interface CandidateCertification {
  name?: string;
  title?: string;
  issuer?: string;
  organization?: string;
  date?: string;
  issue_date?: string;
}

/**
 * Safely extracts a clean display string from any skill representation.
 * If given a string: returns trimmed string.
 * If given an object: extracts name/skill/title.
 * If invalid: returns null.
 */
export function formatSkillName(skill: unknown): string | null {
  if (typeof skill === 'string') {
    const trimmed = skill.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (skill && typeof skill === 'object') {
    const name = (skill as any).name ?? (skill as any).skill ?? (skill as any).title;
    if (typeof name === 'string') {
      const trimmed = name.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
  }
  return null;
}

/**
 * Safely formats any certification entry into a human-readable display string.
 */
export function formatCertification(cert: unknown): string | null {
  if (typeof cert === 'string') {
    const trimmed = cert.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (cert && typeof cert === 'object') {
    const name = typeof (cert as any).name === 'string' && (cert as any).name.trim()
      ? (cert as any).name.trim()
      : typeof (cert as any).title === 'string' && (cert as any).title.trim()
      ? (cert as any).title.trim()
      : '';
    const issuer = typeof (cert as any).issuer === 'string' && (cert as any).issuer.trim()
      ? (cert as any).issuer.trim()
      : typeof (cert as any).organization === 'string' && (cert as any).organization.trim()
      ? (cert as any).organization.trim()
      : '';
    const date = typeof (cert as any).date === 'string' && (cert as any).date.trim()
      ? (cert as any).date.trim()
      : typeof (cert as any).issue_date === 'string' && (cert as any).issue_date.trim()
      ? (cert as any).issue_date.trim()
      : '';

    if (!name) return null;
    return [name, issuer ? `(${issuer})` : '', date ? `— ${date}` : ''].filter(Boolean).join(' ');
  }
  return null;
}
