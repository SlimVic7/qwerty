/**
 * Talent Pool Recruiter Projection & Normalization Service
 * 
 * Enforces data minimization and strict privacy boundaries for recruiter access.
 * Normalizes both legacy (flat strings) and current (structured objects with evidence/confidence)
 * candidate-reviewed CV data into clean, recruiter-safe DTOs.
 * 
 * Invariants:
 * - Internal extraction internals (evidence, confidence, source_segment, warnings) MUST NEVER be exposed.
 * - Skills are always projected to clean string arrays (skill names only).
 * - Safe fallback handling for null, malformed, or mixed arrays.
 */

export interface RecruiterSafeExperience {
  role: string;
  company: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  is_current?: boolean;
  description?: string;
  achievements?: string[];
}

export interface RecruiterSafeEducation {
  degree: string;
  institution: string;
  field_of_study?: string;
  start_date?: string;
  end_date?: string;
  graduation_year?: string;
}

export interface RecruiterSafeCertification {
  name: string;
  issuer?: string;
  date?: string;
}

/**
 * Normalizes skills into clean, deduplicated, non-empty trimmed string array.
 * 
 * Supports:
 * - Legacy: string[] (e.g. ["IT Audit", "Cybersecurity"])
 * - Structured: { name: string, category?: string, evidence?: string, confidence?: string }[]
 * - Mixed / Malformed: null, empty, or non-string/non-object elements are discarded safely.
 * 
 * Never stringifies or exposes raw objects, evidence, or confidence.
 */
export function normalizeSkillNames(skills: unknown): string[] {
  if (!Array.isArray(skills)) return [];
  const result: string[] = [];
  const seen = new Set<string>();

  for (const item of skills) {
    if (!item) continue;
    let name: string | null = null;

    if (typeof item === 'string') {
      name = item.trim();
    } else if (typeof item === 'object') {
      const candidate = (item as any).name ?? (item as any).skill ?? (item as any).title;
      if (typeof candidate === 'string') {
        name = candidate.trim();
      }
    }

    if (name && name.length > 0) {
      const key = name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(name);
      }
    }
  }

  return result;
}

/**
 * Normalizes work experience into recruiter-safe objects.
 * Strips evidence, confidence, and internal parser metadata.
 */
export function normalizeExperience(experience: unknown): RecruiterSafeExperience[] {
  if (!Array.isArray(experience)) return [];
  const result: RecruiterSafeExperience[] = [];

  for (const item of experience) {
    if (!item) continue;

    if (typeof item === 'string' && item.trim()) {
      result.push({
        role: item.trim(),
        company: ''
      });
      continue;
    }

    if (typeof item === 'object') {
      const rawRole = (item as any).role ?? (item as any).job_title ?? (item as any).title;
      const rawCompany = (item as any).company ?? (item as any).company_name;
      const rawLocation = (item as any).location;
      const rawStartDate = (item as any).start_date;
      const rawEndDate = (item as any).end_date;
      const rawIsCurrent = (item as any).is_current;
      const rawDesc = (item as any).description;
      const rawAchievements = (item as any).achievements;

      const role = typeof rawRole === 'string' && rawRole.trim() ? rawRole.trim() : '';
      const company = typeof rawCompany === 'string' && rawCompany.trim() ? rawCompany.trim() : '';
      const location = typeof rawLocation === 'string' && rawLocation.trim() ? rawLocation.trim() : undefined;
      const start_date = typeof rawStartDate === 'string' && rawStartDate.trim() ? rawStartDate.trim() : undefined;
      const end_date = typeof rawEndDate === 'string' && rawEndDate.trim() ? rawEndDate.trim() : undefined;
      const is_current = typeof rawIsCurrent === 'boolean' ? rawIsCurrent : undefined;

      let description: string | undefined = undefined;
      if (typeof rawDesc === 'string' && rawDesc.trim()) {
        description = rawDesc.trim();
      } else if (Array.isArray(rawDesc)) {
        const joined = rawDesc.filter((d: any) => typeof d === 'string' && d.trim()).map((d: string) => d.trim()).join('\n');
        if (joined) description = joined;
      }

      let achievements: string[] | undefined = undefined;
      if (Array.isArray(rawAchievements)) {
        const filtered = rawAchievements
          .map((a: any) => (typeof a === 'string' ? a.trim() : (a && typeof a === 'object' && typeof a.text === 'string' ? a.text.trim() : '')))
          .filter((a: string) => a.length > 0);
        if (filtered.length > 0) achievements = filtered;
      }

      if (role || company || description) {
        result.push({
          role: role || 'Role Unspecified',
          company: company || '',
          ...(location ? { location } : {}),
          ...(start_date ? { start_date } : {}),
          ...(end_date ? { end_date } : {}),
          ...(is_current !== undefined ? { is_current } : {}),
          ...(description ? { description } : {}),
          ...(achievements ? { achievements } : {})
        });
      }
    }
  }

  return result;
}

/**
 * Normalizes education into recruiter-safe objects.
 * Strips evidence, confidence, and internal parser metadata.
 */
export function normalizeEducation(education: unknown): RecruiterSafeEducation[] {
  if (!Array.isArray(education)) return [];
  const result: RecruiterSafeEducation[] = [];

  for (const item of education) {
    if (!item) continue;

    if (typeof item === 'string' && item.trim()) {
      result.push({
        degree: item.trim(),
        institution: ''
      });
      continue;
    }

    if (typeof item === 'object') {
      const rawDegree = (item as any).degree ?? (item as any).qualification;
      const rawInstitution = (item as any).institution ?? (item as any).institution_name;
      const rawGradYear = (item as any).graduation_year ?? (item as any).end_date;
      const rawStartDate = (item as any).start_date;
      const rawEndDate = (item as any).end_date;
      const rawField = (item as any).field_of_study;

      const degree = typeof rawDegree === 'string' && rawDegree.trim() ? rawDegree.trim() : '';
      const institution = typeof rawInstitution === 'string' && rawInstitution.trim() ? rawInstitution.trim() : '';
      const graduation_year = typeof rawGradYear === 'string' && rawGradYear.trim() ? rawGradYear.trim() : undefined;
      const start_date = typeof rawStartDate === 'string' && rawStartDate.trim() ? rawStartDate.trim() : undefined;
      const end_date = typeof rawEndDate === 'string' && rawEndDate.trim() ? rawEndDate.trim() : undefined;
      const field_of_study = typeof rawField === 'string' && rawField.trim() ? rawField.trim() : undefined;

      if (degree || institution || field_of_study) {
        result.push({
          degree: degree || 'Degree / Qualification',
          institution: institution || '',
          ...(graduation_year ? { graduation_year } : {}),
          ...(start_date ? { start_date } : {}),
          ...(end_date ? { end_date } : {}),
          ...(field_of_study ? { field_of_study } : {})
        });
      }
    }
  }

  return result;
}

/**
 * Normalizes certifications into recruiter-safe objects.
 * Strips evidence, confidence, credential URLs/IDs, and internal parser metadata.
 */
export function normalizeCertifications(certifications: unknown): RecruiterSafeCertification[] {
  if (!Array.isArray(certifications)) return [];
  const result: RecruiterSafeCertification[] = [];

  for (const item of certifications) {
    if (!item) continue;

    if (typeof item === 'string' && item.trim()) {
      result.push({
        name: item.trim()
      });
      continue;
    }

    if (typeof item === 'object') {
      const rawName = (item as any).name ?? (item as any).title;
      const rawIssuer = (item as any).issuer ?? (item as any).organization;
      const rawDate = (item as any).issue_date ?? (item as any).date;

      const name = typeof rawName === 'string' && rawName.trim() ? rawName.trim() : '';
      const issuer = typeof rawIssuer === 'string' && rawIssuer.trim() ? rawIssuer.trim() : undefined;
      const date = typeof rawDate === 'string' && rawDate.trim() ? rawDate.trim() : undefined;

      if (name) {
        result.push({
          name,
          ...(issuer ? { issuer } : {}),
          ...(date ? { date } : {})
        });
      }
    }
  }

  return result;
}

/**
 * Normalizes languages into safe string array.
 */
export function normalizeLanguages(languages: unknown): string[] {
  if (!Array.isArray(languages)) return [];
  return languages
    .map((lang: any) => {
      if (typeof lang === 'string' && lang.trim()) return lang.trim();
      if (lang && typeof lang === 'object') {
        const name = (lang as any).language ?? (lang as any).name;
        const prof = (lang as any).proficiency;
        if (typeof name === 'string' && name.trim()) {
          return typeof prof === 'string' && prof.trim() ? `${name.trim()} (${prof.trim()})` : name.trim();
        }
      }
      return '';
    })
    .filter((l: string) => l.length > 0);
}
