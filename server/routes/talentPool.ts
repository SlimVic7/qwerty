import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getAdminClient } from '../db/supabase.js';
import {
  normalizeSkillNames,
  normalizeExperience,
  normalizeEducation,
  normalizeCertifications,
  normalizeLanguages
} from '../services/talent/talentProjection.js';

export const talentPoolRouter = Router();

// Enforce authentication and strict recruiter role authorization
talentPoolRouter.use(requireAuth);
talentPoolRouter.use(requireRole(['recruiter']));

// Helper to record immutable audit log entries (fails closed if audit cannot be persisted)
async function recordRecruiterAudit(
  supabase: any,
  recruiterId: string,
  candidateId: string,
  action: 'candidate_profile_viewed' | 'candidate_cv_accessed',
  objectId: string | null = null,
  metadata: Record<string, any> = {}
): Promise<void> {
  const { error } = await supabase.from('recruiter_access_audit_log').insert({
    recruiter_id: recruiterId,
    candidate_id: candidateId,
    action,
    object_id: objectId,
    metadata
  });
  if (error) {
    console.error(`[RECRUITER_AUDIT] Failed recording ${action} into recruiter_access_audit_log:`, error.message);
    throw new Error(`Security audit failed: ${error.message}`);
  }
}

/**
 * GET /api/ops/talent
 * Search and filter candidates who have explicitly opted into QWERTY recruitment.
 * Deterministic search only - NO AI ranking, scoring, or automated sorting.
 */
talentPoolRouter.get('/', async (req: Request, res: Response) => {
  try {
    const supabase = getAdminClient();
    if (!supabase) {
      return res.status(500).json({ message: 'Database connection unavailable' });
    }

    const {
      q,
      skills,
      location,
      minExperience,
      hasCvOnly,
      sort = 'recent'
    } = req.query;

    // 1. Fetch preferences for opted-in candidates ONLY
    const { data: optedInPrefs, error: prefError } = await supabase
      .from('talent_pool_preferences')
      .select('user_id, is_visible_to_qwerty_recruitment, allow_cv_access, consent_given_at, withdrawn_at, updated_at')
      .eq('is_visible_to_qwerty_recruitment', true);

    if (prefError) {
      console.error('[TALENT_POOL_SEARCH] Preferences fetch error:', prefError);
      return res.status(500).json({ message: 'Failed to query talent pool' });
    }

    if (!optedInPrefs || optedInPrefs.length === 0) {
      return res.json({ candidates: [], total: 0 });
    }

    const candidateUserIds = optedInPrefs.map(p => p.user_id);

    // 2. Fetch candidate profile details for opted-in candidates
    // Explicitly exclude private PII: NO phone, NO email
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name, city, country, professional_headline, professional_summary, years_experience, linkedin_url, github_url, portfolio_url')
      .in('id', candidateUserIds);

    if (profileError) {
      console.error('[TALENT_POOL_SEARCH] Profiles fetch error:', profileError);
      return res.status(500).json({ message: 'Failed to query profiles' });
    }

    // 3. Fetch candidate-approved reviewed_data from completed/applied CV parses
    // Explicitly exclude raw AI extractions, raw_text_hash, validation_issues
    const { data: parses, error: parseError } = await supabase
      .from('candidate_cv_parses')
      .select('user_id, reviewed_data, applied_at')
      .in('user_id', candidateUserIds)
      .eq('status', 'completed')
      .not('reviewed_data', 'is', null)
      .not('reviewed_at', 'is', null)
      .not('applied_at', 'is', null)
      .order('applied_at', { ascending: false });

    if (parseError) {
      console.warn('[TALENT_POOL_SEARCH] Parses fetch warning:', parseError.message);
    }

    // Map candidate parses to latest reviewed_data
    const reviewedDataByCandidate = new Map<string, any>();
    if (parses) {
      for (const p of parses) {
        if (!reviewedDataByCandidate.has(p.user_id) && p.reviewed_data) {
          reviewedDataByCandidate.set(p.user_id, p.reviewed_data);
        }
      }
    }

    // 4. Fetch current non-deleted CVs to determine file availability
    // Explicitly exclude raw storage_path
    const { data: currentCvs, error: cvError } = await supabase
      .from('candidate_cv_versions')
      .select('user_id, id, version_number, original_filename')
      .in('user_id', candidateUserIds)
      .eq('is_current', true)
      .is('deleted_at', null);

    if (cvError) {
      console.warn('[TALENT_POOL_SEARCH] CV fetch warning:', cvError.message);
    }

    const currentCvByCandidate = new Map<string, any>();
    if (currentCvs) {
      for (const cv of currentCvs) {
        currentCvByCandidate.set(cv.user_id, cv);
      }
    }

    const prefByCandidate = new Map<string, any>();
    for (const p of optedInPrefs) {
      prefByCandidate.set(p.user_id, p);
    }

    // 5. Combine and filter candidates
    let results = (profiles || []).map(profile => {
      const pref = prefByCandidate.get(profile.id) || {};
      const reviewedData = reviewedDataByCandidate.get(profile.id) || {};
      const hasCurrentCv = currentCvByCandidate.has(profile.id);
      const cvAccessConsented = Boolean(pref.allow_cv_access && hasCurrentCv);

      const approvedSkills: string[] = normalizeSkillNames(reviewedData.skills);

      return {
        id: profile.id,
        display_name: profile.display_name || 'Anonymous Candidate',
        professional_headline: profile.professional_headline || null,
        professional_summary: profile.professional_summary || null,
        city: profile.city || null,
        country: profile.country || null,
        years_experience: profile.years_experience !== null ? Number(profile.years_experience) : null,
        top_skills: approvedSkills.slice(0, 5),
        all_skills: approvedSkills,
        has_current_cv: hasCurrentCv,
        allow_cv_access: cvAccessConsented,
        consented_at: pref.consent_given_at || null,
        updated_at: pref.updated_at || null
      };
    });

    // 6. Apply deterministic filters
    if (q && typeof q === 'string' && q.trim()) {
      const queryLower = q.trim().toLowerCase();
      results = results.filter(c => 
        (c.display_name && c.display_name.toLowerCase().includes(queryLower)) ||
        (c.professional_headline && c.professional_headline.toLowerCase().includes(queryLower)) ||
        (c.professional_summary && c.professional_summary.toLowerCase().includes(queryLower)) ||
        c.all_skills.some(s => s.toLowerCase().includes(queryLower))
      );
    }

    if (skills && typeof skills === 'string' && skills.trim()) {
      const skillTerms = skills.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      results = results.filter(c => 
        skillTerms.some(term => c.all_skills.some(s => s.toLowerCase().includes(term)))
      );
    }

    if (location && typeof location === 'string' && location.trim()) {
      const locLower = location.trim().toLowerCase();
      results = results.filter(c => 
        (c.city && c.city.toLowerCase().includes(locLower)) ||
        (c.country && c.country.toLowerCase().includes(locLower))
      );
    }

    if (minExperience !== undefined && minExperience !== '') {
      const minYears = Number(minExperience);
      if (!isNaN(minYears)) {
        results = results.filter(c => c.years_experience !== null && c.years_experience >= minYears);
      }
    }

    if (hasCvOnly === 'true') {
      results = results.filter(c => c.allow_cv_access);
    }

    // 7. Apply neutral sorting (no AI ranking, no ranking by experience)
    if (sort === 'alphabetical') {
      results.sort((a, b) => a.display_name.localeCompare(b.display_name));
    } else if (sort === 'updated') {
      results.sort((a, b) => {
        const timeA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const timeB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return timeB - timeA;
      });
    } else {
      // Default: 'recent' (recently opted into recruitment)
      results.sort((a, b) => {
        const timeA = a.consented_at ? new Date(a.consented_at).getTime() : 0;
        const timeB = b.consented_at ? new Date(b.consented_at).getTime() : 0;
        return timeB - timeA;
      });
    }

    // Minimal search result projection
    const sanitizedResults = results.map(c => ({
      id: c.id,
      display_name: c.display_name,
      professional_headline: c.professional_headline,
      city: c.city,
      country: c.country,
      years_experience: c.years_experience,
      top_skills: c.top_skills,
      has_current_cv: c.has_current_cv,
      allow_cv_access: c.allow_cv_access,
      consented_at: c.consented_at,
      updated_at: c.updated_at
    }));

    res.json({
      candidates: sanitizedResults,
      total: sanitizedResults.length
    });
  } catch (error: any) {
    console.error('[TALENT_POOL_SEARCH] Unexpected error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * GET /api/ops/talent/:candidateId
 * Candidate detail view for authorized recruiters.
 * Re-checks consent dynamically at request time.
 * Audits the view action.
 */
talentPoolRouter.get('/:candidateId', async (req: Request, res: Response) => {
  try {
    const supabase = getAdminClient();
    if (!supabase) {
      return res.status(500).json({ message: 'Database connection unavailable' });
    }

    const { candidateId } = req.params;
    const recruiterId = req.user!.id;

    // 1. Re-check candidate consent at request time
    const { data: pref, error: prefError } = await supabase
      .from('talent_pool_preferences')
      .select('user_id, is_visible_to_qwerty_recruitment, allow_cv_access, consent_given_at, withdrawn_at')
      .eq('user_id', candidateId)
      .maybeSingle();

    if (prefError || !pref || !pref.is_visible_to_qwerty_recruitment) {
      return res.status(404).json({ message: 'Candidate not found or has withdrawn from Talent Pool' });
    }

    // 2. Fetch candidate profile details
    // Explicitly exclude private PII: phone, email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name, city, country, professional_headline, professional_summary, years_experience, linkedin_url, github_url, portfolio_url')
      .eq('id', candidateId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ message: 'Candidate profile record not found' });
    }

    // 3. Fetch candidate's approved reviewed_data
    // Explicitly exclude raw AI extractions, raw_text_hash, validation_issues
    const { data: parseRecord } = await supabase
      .from('candidate_cv_parses')
      .select('reviewed_data')
      .eq('user_id', candidateId)
      .eq('status', 'completed')
      .not('reviewed_data', 'is', null)
      .not('reviewed_at', 'is', null)
      .not('applied_at', 'is', null)
      .order('applied_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const reviewedData = parseRecord?.reviewed_data || {};

    // 4. Check current CV metadata
    // Explicitly exclude storage_path
    const { data: currentCv } = await supabase
      .from('candidate_cv_versions')
      .select('id, version_number, original_filename')
      .eq('user_id', candidateId)
      .eq('is_current', true)
      .is('deleted_at', null)
      .maybeSingle();

    // 5. Record audit entry: candidate_profile_viewed (fails closed)
    try {
      await recordRecruiterAudit(
        supabase,
        recruiterId,
        candidateId,
        'candidate_profile_viewed',
        candidateId,
        { view_context: 'ops_talent_pool_detail' }
      );
    } catch (auditErr: any) {
      console.error('[TALENT_POOL_DETAIL] Audit log failure, denying profile access:', auditErr.message);
      return res.status(500).json({ message: 'Security audit logging failed; access denied' });
    }

    // 6. Return candidate-approved structured details
    res.json({
      id: profile.id,
      display_name: profile.display_name || 'Anonymous Candidate',
      professional_headline: profile.professional_headline || null,
      professional_summary: profile.professional_summary || null,
      city: profile.city || null,
      country: profile.country || null,
      years_experience: profile.years_experience !== null ? Number(profile.years_experience) : null,
      linkedin_url: profile.linkedin_url || null,
      github_url: profile.github_url || null,
      portfolio_url: profile.portfolio_url || null,
      skills: normalizeSkillNames(reviewedData.skills),
      experience: normalizeExperience(reviewedData.experience),
      education: normalizeEducation(reviewedData.education),
      certifications: normalizeCertifications(reviewedData.certifications),
      projects: Array.isArray(reviewedData.projects) ? reviewedData.projects.map((p: any) => typeof p === 'string' ? p.trim() : (p && typeof p.name === 'string' ? p.name.trim() : '')).filter(Boolean) : [],
      languages: normalizeLanguages(reviewedData.languages),
      has_current_cv: Boolean(currentCv),
      allow_cv_access: Boolean(pref.allow_cv_access && currentCv),
      consented_at: pref.consent_given_at || null
    });
  } catch (error: any) {
    console.error('[TALENT_POOL_DETAIL] Unexpected error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * POST /api/ops/talent/:candidateId/cv-url
 * Generate short-lived signed URL for candidate's current CV.
 * Strict conditions:
 * - Recruiter role verified
 * - Candidate currently opted in
 * - Candidate explicitly permitted CV access (allow_cv_access = true)
 * - Current non-deleted CV exists
 * - Audited via recruiter_access_audit_log
 * - URL expires in 60 seconds
 */
talentPoolRouter.post('/:candidateId/cv-url', async (req: Request, res: Response) => {
  try {
    const supabase = getAdminClient();
    if (!supabase) {
      return res.status(500).json({ message: 'Database connection unavailable' });
    }

    const { candidateId } = req.params;
    const recruiterId = req.user!.id;

    // 1. Re-verify candidate consent at request time
    const { data: pref, error: prefError } = await supabase
      .from('talent_pool_preferences')
      .select('user_id, is_visible_to_qwerty_recruitment, allow_cv_access')
      .eq('user_id', candidateId)
      .maybeSingle();

    if (prefError || !pref || !pref.is_visible_to_qwerty_recruitment) {
      return res.status(404).json({ message: 'Candidate is not participating in the Talent Pool' });
    }

    // 2. Verify candidate has explicitly allowed CV access
    if (!pref.allow_cv_access) {
      return res.status(403).json({ message: 'Candidate has not permitted CV file access to recruiters' });
    }

    // 3. Resolve candidate's current non-deleted CV version
    const { data: currentCv, error: cvError } = await supabase
      .from('candidate_cv_versions')
      .select('id, storage_path, original_filename, version_number')
      .eq('user_id', candidateId)
      .eq('is_current', true)
      .is('deleted_at', null)
      .maybeSingle();

    if (cvError || !currentCv) {
      return res.status(404).json({ message: 'Candidate does not have an active CV file available' });
    }

    // 4. Generate short-lived signed URL (60 seconds duration) from candidate-cvs bucket
    const CV_BUCKET = process.env.CV_STORAGE_BUCKET || 'candidate-cvs';
    let { data: signedData, error: signError } = await supabase
      .storage
      .from(CV_BUCKET)
      .createSignedUrl(currentCv.storage_path, 60);

    // Fallback: If primary bucket lookup fails with object not found and bucket was custom, attempt candidate-cvs
    if ((signError || !signedData?.signedUrl) && CV_BUCKET !== 'candidate-cvs') {
      const fallback = await supabase.storage
        .from('candidate-cvs')
        .createSignedUrl(currentCv.storage_path, 60);
      if (fallback.data?.signedUrl) {
        signedData = fallback.data;
        signError = null;
      }
    }

    if (signError || !signedData?.signedUrl) {
      console.error('[TALENT_POOL_CV_URL] Storage signing error:', signError);
      return res.status(500).json({ message: 'Failed to generate temporary CV access link' });
    }

    // 5. Record audit entry: candidate_cv_accessed (fails closed)
    try {
      await recordRecruiterAudit(
        supabase,
        recruiterId,
        candidateId,
        'candidate_cv_accessed',
        currentCv.id,
        {
          cv_version_number: currentCv.version_number,
          expires_in_seconds: 60
        }
      );
    } catch (auditErr: any) {
      console.error('[TALENT_POOL_CV_URL] Audit log failure, withholding signed URL:', auditErr.message);
      return res.status(500).json({ message: 'Security audit logging failed; CV access link withheld' });
    }

    // 6. Return short-lived URL (never expose storage_path)
    res.json({
      signedUrl: signedData.signedUrl,
      expiresIn: 60,
      filename: currentCv.original_filename,
      versionNumber: currentCv.version_number
    });
  } catch (error: any) {
    console.error('[TALENT_POOL_CV_URL] Unexpected error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
