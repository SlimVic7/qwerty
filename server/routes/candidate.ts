import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getAdminClient, getAuthClient } from '../db/supabase.js';
import multer from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { calculateJobAlignment, CURRENT_JOB_ALIGNMENT_RULESET_VERSION } from '../services/matching/jobAlignment.js';
import { JobAlignmentStore } from '../services/matching/jobAlignmentStore.js';
import { GeminiJobAlignmentProvider } from '../services/extraction/providers/GeminiJobAlignmentProvider.js';
import { getPrimaryGeminiModel } from '../config/gemini.js';
import { CvTailoringStore } from '../services/cvTailoring/cvTailoringStore.js';
import { CvTailoringEngine } from '../services/cvTailoring/cvTailoringEngine.js';
import { validateSuggestion } from '../services/cvTailoring/claimValidator.js';
import { CURRENT_TAILORING_ENGINE_VERSION, TailoringSuggestion } from '../services/cvTailoring/types.js';
import { TailoringRequestDeduplicator } from '../services/cvTailoring/geminiResilience.js';
import { isCvTailoringPublicEnabled } from '../config/featureFlags.js';
import { generateSkillsGapAnalysis } from '../services/skillsGap/skillsGapEngine.js';
import {
  buildAlignmentHistoryResponse,
  buildAlignmentComparisonResponse
} from '../services/alignmentHistory/alignmentHistoryEngine.js';


function validateMagicBytes(buffer: Buffer): { valid: boolean, format: string | null } {
  if (buffer.length < 8) return { valid: false, format: null };
  
  // PDF: %PDF- (25 50 44 46 2D)
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46 && buffer[4] === 0x2D) {
    return { valid: true, format: 'pdf' };
  }
  
  // DOC (OLE Compound File): D0 CF 11 E0 A1 B1 1A E1
  if (buffer[0] === 0xD0 && buffer[1] === 0xCF && buffer[2] === 0x11 && buffer[3] === 0xE0 && 
      buffer[4] === 0xA1 && buffer[5] === 0xB1 && buffer[6] === 0x1A && buffer[7] === 0xE1) {
    return { valid: true, format: 'doc' };
  }
  
  // DOCX / ZIP: PK\x03\x04 (50 4B 03 04)
  if (buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04) {
    // To distinguish DOCX from a generic ZIP, we check for common Office OpenXML strings
    // within the first few KB of the file.
    const searchArea = buffer.subarray(0, Math.min(buffer.length, 8192)).toString('ascii');
    if (searchArea.includes('[Content_Types].xml') || searchArea.includes('word/')) {
      return { valid: true, format: 'docx' };
    }
  }
  
  return { valid: false, format: null };
}

export const candidateRouter = Router();

// Configure multer (in-memory, up to 5MB)
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024, files: 1 }, // 5 MB
});

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];

candidateRouter.use(requireAuth);
candidateRouter.use(requireRole(['candidate']));

// Profile Endpoints
candidateRouter.get('/profile', async (req, res) => {
  try {
    const supabase = getAdminClient();
    const userId = req.user!.id;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, display_name, phone, country, city, professional_headline, professional_summary, years_experience, linkedin_url, portfolio_url, github_url')
      .eq('id', userId)
      .single();

    if (error) throw error;
    res.json(profile);
  } catch (error: any) {
    console.error('[CANDIDATE_PROFILE_READ] Fetch profile error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message || error });
  }
});

candidateRouter.patch('/profile', async (req, res) => {
  try {
    const supabase = getAdminClient();
    const userId = req.user!.id;

    const allowedFields = [
      'display_name',
      'first_name',
      'last_name',
      'phone',
      'country',
      'city',
      'professional_headline',
      'professional_summary',
      'years_experience',
      'linkedin_url',
      'portfolio_url',
      'github_url'
    ];

    const updates: any = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    // updates.updated_at = new Date().toISOString();

    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select('id, first_name, last_name, display_name, phone, country, city, professional_headline, professional_summary, years_experience, linkedin_url, portfolio_url, github_url')
      .single();

    if (error) throw error;
    res.json(updatedProfile);
  } catch (error: any) {
    console.error('[CANDIDATE_PROFILE_PATCH] Update profile error:', JSON.stringify(error, null, 2));
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Talent Pool Preferences Endpoints
candidateRouter.get('/talent-pool', async (req, res) => {
  try {
    const supabase = getAdminClient() || getAuthClient(req.headers.authorization || '');
    const userId = req.user!.id;

    const { data: pref, error } = await supabase
      .from('talent_pool_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.warn('[CANDIDATE_TALENT_POOL_READ] DB Warning:', error.message);
    }

    if (!pref) {
      // Default opted-out preference representation
      return res.json({
        user_id: userId,
        is_visible_to_qwerty_recruitment: false,
        allow_cv_access: false,
        consent_given_at: null,
        withdrawn_at: null,
        consent_version: 'talent-pool-v1',
        updated_at: new Date().toISOString()
      });
    }

    res.json({
      user_id: pref.user_id,
      is_visible_to_qwerty_recruitment: Boolean(pref.is_visible_to_qwerty_recruitment),
      allow_cv_access: Boolean(pref.allow_cv_access),
      consent_given_at: pref.consent_given_at || null,
      withdrawn_at: pref.withdrawn_at || null,
      consent_version: pref.consent_version || 'talent-pool-v1',
      availability_status: pref.availability_status || null,
      preferred_locations: pref.preferred_locations || [],
      remote_preference: pref.remote_preference || null,
      updated_at: pref.updated_at || new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[CANDIDATE_TALENT_POOL_READ] Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

candidateRouter.patch('/talent-pool', async (req, res) => {
  try {
    const supabase = getAdminClient() || getAuthClient(req.headers.authorization || '');
    const userId = req.user!.id;
    const { is_visible_to_qwerty_recruitment, allow_cv_access } = req.body;

    if (is_visible_to_qwerty_recruitment === undefined && allow_cv_access === undefined) {
      return res.status(400).json({ message: 'No valid preference fields to update' });
    }

    // Read current state to handle transitions safely
    const { data: currentPref } = await supabase
      .from('talent_pool_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const currentVisible = Boolean(currentPref?.is_visible_to_qwerty_recruitment);
    const targetVisible = is_visible_to_qwerty_recruitment !== undefined 
      ? Boolean(is_visible_to_qwerty_recruitment) 
      : currentVisible;

    // Reject attempt to allow CV access when opted out
    if (allow_cv_access === true && !targetVisible) {
      return res.status(400).json({ message: 'Cannot allow CV access while opted out of Talent Pool' });
    }

    const updates: Record<string, any> = {};

    if (is_visible_to_qwerty_recruitment !== undefined) {
      updates.is_visible_to_qwerty_recruitment = targetVisible;
      if (targetVisible && !currentVisible) {
        updates.consent_given_at = new Date().toISOString();
        updates.withdrawn_at = null;
        updates.consent_version = 'talent-pool-v1';
      } else if (!targetVisible && currentVisible) {
        updates.withdrawn_at = new Date().toISOString();
        updates.allow_cv_access = false;
      }
    }

    if (allow_cv_access !== undefined) {
      updates.allow_cv_access = targetVisible ? Boolean(allow_cv_access) : false;
    }

    updates.updated_at = new Date().toISOString();

    let updatedResult: any = null;

    if (!currentPref) {
      const newRow = {
        user_id: userId,
        is_visible_to_qwerty_recruitment: targetVisible,
        allow_cv_access: targetVisible ? Boolean(updates.allow_cv_access) : false,
        consent_given_at: targetVisible ? new Date().toISOString() : null,
        withdrawn_at: targetVisible ? null : new Date().toISOString(),
        consent_version: 'talent-pool-v1',
        ...updates
      };
      const { data, error } = await supabase
        .from('talent_pool_preferences')
        .insert(newRow)
        .select()
        .single();
      if (error) throw error;
      updatedResult = data;
    } else {
      const { data, error } = await supabase
        .from('talent_pool_preferences')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      updatedResult = data;
    }

    res.json({
      user_id: userId,
      is_visible_to_qwerty_recruitment: Boolean(updatedResult?.is_visible_to_qwerty_recruitment ?? updates.is_visible_to_qwerty_recruitment),
      allow_cv_access: Boolean(updatedResult?.allow_cv_access ?? updates.allow_cv_access ?? false),
      consent_given_at: updatedResult?.consent_given_at ?? updates.consent_given_at ?? currentPref?.consent_given_at ?? null,
      withdrawn_at: updatedResult?.withdrawn_at ?? updates.withdrawn_at ?? currentPref?.withdrawn_at ?? null,
      consent_version: updatedResult?.consent_version ?? updates.consent_version ?? 'talent-pool-v1',
      updated_at: updatedResult?.updated_at ?? updates.updated_at
    });
  } catch (error: any) {
    console.error('[CANDIDATE_TALENT_POOL_PATCH] Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// CV Endpoints
candidateRouter.get('/cvs', async (req, res) => {
  try {
    const supabase = getAdminClient();
    const userId = req.user!.id;

    const { data: cvs, error } = await supabase
      .from('candidate_cv_versions')
      .select('id, original_filename, file_size_bytes, version_number, is_current, uploaded_at')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('version_number', { ascending: false });

    if (error) throw error;
    res.json(cvs);
  } catch (error: any) {
    console.error('[CV_LIST] Fetch CVs error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

candidateRouter.post('/cvs', upload.single('cvFile'), async (req, res) => {
  try {
    const supabase = getAdminClient();
    const userId = req.user!.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Validate mime type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return res.status(400).json({ message: 'Invalid file format. Only PDF, DOC, and DOCX are allowed.' });
    }

    // Validate extension
    const ext = extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return res.status(400).json({ message: 'Invalid file extension. Only .pdf, .doc, and .docx are allowed.' });
    }

    // Validate size (redundant with multer limit but safe to explicitly check)
    if (file.size > 5 * 1024 * 1024) { 
      return res.status(400).json({ message: 'File exceeds 5MB limit.' });
    }

    // Magic Bytes Validation
    const magic = validateMagicBytes(file.buffer);
    if (!magic.valid) {
      return res.status(400).json({ message: 'Invalid file signature. File appears corrupted or disguised.' });
    }

    const cvId = uuidv4();
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${userId}/${cvId}/${sanitizedFilename}`;

    // 1. Upload to Supabase Storage using service role
    const { error: uploadError } = await supabase.storage
      .from('candidate-cvs')
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return res.status(500).json({ message: 'Failed to upload file securely' });
    }

    // 2. Database changes via atomic RPC
    const { data: newCv, error: insertError } = await supabase.rpc('candidate_add_cv_version', {
      p_user_id: userId,
      p_storage_path: storagePath,
      p_original_filename: file.originalname,
      p_mime_type: file.mimetype,
      p_file_size_bytes: file.size
    });

    if (insertError) {
      // Compensation: Rollback storage if DB fails
      console.error('[METADATA_RPC] Database insert error, rolling back storage:', JSON.stringify(insertError, null, 2));
      await supabase.storage.from('candidate-cvs').remove([storagePath]);
      return res.status(500).json({ message: 'Failed to save CV record' });
    }

    res.status(201).json(newCv);
  } catch (error: any) {
    console.error('CV Upload Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

candidateRouter.get('/cvs/:id/access', async (req, res) => {
  try {
    const supabase = getAdminClient();
    const userId = req.user!.id;
    const cvId = req.params.id;

    // Validate ownership
    const { data: cvRecord, error: fetchError } = await supabase
      .from('candidate_cv_versions')
      .select('storage_path')
      .eq('id', cvId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();

    if (fetchError || !cvRecord) {
      return res.status(404).json({ message: 'CV not found' });
    }

    // Generate signed URL (expires in 60s)
    const { data, error: signedUrlError } = await supabase.storage
      .from('candidate-cvs')
      .createSignedUrl(cvRecord.storage_path, 60);

    if (signedUrlError) throw signedUrlError;

    res.json({ signedUrl: data.signedUrl });
  } catch (error: any) {
    console.error('Access CV error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

candidateRouter.delete('/cvs/:id', async (req, res) => {
  try {
    const supabase = getAdminClient();
    const userId = req.user!.id;
    const cvId = req.params.id;

    // Validate ownership and existence
    const { data: cvRecord, error: fetchError } = await supabase
      .from('candidate_cv_versions')
      .select('id, is_current, storage_path')
      .eq('id', cvId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();

    if (fetchError || !cvRecord) {
      return res.status(404).json({ message: 'CV not found' });
    }

    // Soft delete
    const { error: updateError } = await supabase
      .from('candidate_cv_versions')
      .update({ 
        deleted_at: new Date().toISOString(),
        is_current: false
      })
      .eq('id', cvId);

    if (updateError) throw updateError;

    // We do not physically delete the file right now to keep audit trail,
    // or we could physically delete it. The prompt says "Be conservative with deletion. Prefer soft deletion of CV metadata ... Document retention behavior as a future privacy-policy decision."

    res.json({ message: 'CV deleted successfully' });
  } catch (error: any) {
    console.error('Delete CV error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ============================================================
// Stage 5.1: Candidate Job Alignment Endpoints
// ============================================================

/**
 * GET /api/candidate/jobs/:jobId/alignment
 * Retrieves the latest alignment analysis for the authenticated candidate and job.
 */
candidateRouter.get('/jobs/:jobId/alignment', async (req, res) => {
  try {
    const supabase = getAdminClient();
    const userId = req.user!.id;
    const jobId = req.params.jobId;

    // 1. Fetch current job state (for drift detection)
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, title, company_name, updated_at, status')
      .eq('id', jobId)
      .maybeSingle();

    if (jobError || !job) {
      return res.status(404).json({ error: 'JOB_NOT_FOUND', message: 'Job not found' });
    }

    // 2. Fetch candidate latest approved CV parse applied timestamp (for drift detection)
    const { data: latestParse } = await supabase
      .from('candidate_cv_parses')
      .select('applied_at')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .not('reviewed_data', 'is', null)
      .not('applied_at', 'is', null)
      .order('applied_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const alignment = await JobAlignmentStore.getLatestAlignment(
      userId,
      jobId,
      job.updated_at,
      latestParse?.applied_at
    );

    if (!alignment) {
      return res.status(404).json({ error: 'ALIGNMENT_NOT_FOUND', message: 'No previous alignment found for this role.' });
    }

    return res.json(alignment);
  } catch (error: any) {
    console.error('[CANDIDATE_JOB_ALIGNMENT_GET] Error:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to retrieve job alignment' });
  }
});

/**
 * POST /api/candidate/jobs/:jobId/alignment
 * Generates or refreshes candidate alignment for a published job.
 */
candidateRouter.post('/jobs/:jobId/alignment', async (req, res) => {
  try {
    const supabase = getAdminClient();
    const userId = req.user!.id;
    const jobId = req.params.jobId;

    // 1. Fetch canonical job and enforce status = 'published'
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .maybeSingle();

    if (jobError || !job) {
      return res.status(404).json({ error: 'JOB_NOT_FOUND', message: 'Job not found.' });
    }

    if (job.status !== 'published') {
      return res.status(400).json({ 
        error: 'JOB_NOT_PUBLISHED', 
        message: 'Job alignment is only available for published jobs.' 
      });
    }

    // 2. Verify candidate has an approved/completed CV parse
    const { data: parseRecord, error: parseError } = await supabase
      .from('candidate_cv_parses')
      .select('id, cv_version_id, user_id, status, reviewed_data, reviewed_at, applied_at')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .not('reviewed_data', 'is', null)
      .not('reviewed_at', 'is', null)
      .not('applied_at', 'is', null)
      .order('applied_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (parseError || !parseRecord || !parseRecord.reviewed_data) {
      // Check if candidate has a pending or unreviewed parse
      const { data: anyParse } = await supabase
        .from('candidate_cv_parses')
        .select('id, status, applied_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (anyParse && (!anyParse.applied_at || anyParse.status !== 'completed')) {
        return res.status(400).json({
          error: 'PARSE_NOT_READY',
          message: 'Your CV parse is not yet approved and applied. Please review and approve your CV data before checking alignment.'
        });
      }

      return res.status(400).json({
        error: 'APPROVED_PROFILE_REQUIRED',
        message: 'You must have an approved CV profile to check alignment against a job. Please upload and review your CV in your Profile.'
      });
    }

    // 3. Fetch candidate profile for supplementary context (e.g. years of experience)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, years_experience, city, country')
      .eq('id', userId)
      .maybeSingle();

    // 4. Prevent concurrent active executions for the same candidate, job, parse, and ruleset
    const rulesetVersion = CURRENT_JOB_ALIGNMENT_RULESET_VERSION;
    const active = await JobAlignmentStore.getActiveAlignment(userId, jobId, parseRecord.id, rulesetVersion);
    if (active) {
      return res.status(409).json({ 
        error: 'ALIGNMENT_ALREADY_RUNNING', 
        message: 'An alignment analysis is currently being processed for this role and profile version.' 
      });
    }

    // 5. Execute deterministic alignment engine
    let deterministicResult;
    try {
      deterministicResult = calculateJobAlignment(
        {
          id: job.id,
          title: job.title,
          company_name: job.company_name,
          description: job.description,
          requirements: job.requirements,
          preferred_qualifications: job.preferred_qualifications,
          responsibilities: job.responsibilities,
          experience_level: job.experience_level,
          updated_at: job.updated_at
        },
        parseRecord.reviewed_data,
        profile,
        parseRecord.id
      );
    } catch (engineError: any) {
      console.error('[CANDIDATE_JOB_ALIGNMENT] Deterministic engine error:', engineError);
      return res.status(500).json({
        error: 'ENGINE_FAILURE',
        message: 'Failed to calculate job alignment.'
      });
    }

    // 5b. Handle zero evaluable criteria (max applicable points = 0)
    // Controlled deterministic failure: status = 'failed', error_code = 'NO_EVALUABLE_CRITERIA', completed_at populated
    // Do NOT calculate a numerical score. Do NOT invoke Gemini explanation.
    if (deterministicResult.status === 'failed') {
      try {
        const failedRecord = await JobAlignmentStore.createAlignment({
          user_id: userId,
          cv_version_id: parseRecord.cv_version_id,
          parse_id: parseRecord.id,
          job_id: job.id,
          job_updated_at: job.updated_at,
          candidate_applied_at: parseRecord.applied_at,
          job_title: job.title,
          company_name: job.company_name,
          status: 'failed',
          error_code: deterministicResult.error_code || 'NO_EVALUABLE_CRITERIA',
          explanation_status: 'not_started',
          ruleset_version: deterministicResult.ruleset_version,
          score: undefined,
          max_score: 100,
          raw_score: undefined,
          raw_max_score: undefined,
          component_results: deterministicResult.components,
          criteria_breakdown: deterministicResult.criteria,
          completed_at: new Date().toISOString()
        });

        return res.status(201).json(failedRecord);
      } catch (createErr: any) {
        console.error('[CANDIDATE_JOB_ALIGNMENT] Persistence failure for failed alignment:', createErr);
        return res.status(500).json({
          error: 'PERSISTENCE_FAILURE',
          message: 'Failed to record job alignment to database.'
        });
      }
    }

    // 6. Create initial record with completed deterministic score
    let initialRecord;
    try {
      initialRecord = await JobAlignmentStore.createAlignment({
        user_id: userId,
        cv_version_id: parseRecord.cv_version_id,
        parse_id: parseRecord.id,
        job_id: job.id,
        job_updated_at: job.updated_at,
        candidate_applied_at: parseRecord.applied_at,
        job_title: job.title,
        company_name: job.company_name,
        status: 'completed',
        explanation_status: 'processing',
        ruleset_version: deterministicResult.ruleset_version,
        score: deterministicResult.score ?? undefined,
        max_score: deterministicResult.max_score,
        raw_score: deterministicResult.raw_score ?? undefined,
        raw_max_score: deterministicResult.raw_max_score ?? undefined,
        component_results: deterministicResult.components,
        criteria_breakdown: deterministicResult.criteria,
        completed_at: new Date().toISOString()
      });
    } catch (createErr: any) {
      console.error('[CANDIDATE_JOB_ALIGNMENT] Persistence failure:', createErr);
      return res.status(500).json({
        error: 'PERSISTENCE_FAILURE',
        message: 'Failed to record job alignment to database.'
      });
    }

    // 7. Generate Gemini advisory plain-language explanation
    const aiProvider = new GeminiJobAlignmentProvider();
    let explanation = null;
    let explanationStatus: 'completed' | 'failed' = 'completed';
    let explanationErrorCode = null;
    let successfulAiModel: string | undefined = undefined;

    try {
      explanation = await aiProvider.generateExplanation(
        deterministicResult,
        parseRecord.reviewed_data,
        {
          title: job.title,
          company_name: job.company_name,
          description: job.description,
          requirements: job.requirements,
          preferred_qualifications: job.preferred_qualifications
        }
      );
      successfulAiModel = aiProvider.getLastExecutedModel();
    } catch (aiErr: any) {
      console.warn('[CANDIDATE_JOB_ALIGNMENT] AI advisory generation skipped or failed:', aiErr.message);
      explanationStatus = 'failed';
      explanationErrorCode = 'AI_EXPLANATION_FAILED';
      explanation = null;
    }

    // 8. Update alignment record with AI advisory results
    const completedRecord = await JobAlignmentStore.updateAlignment(initialRecord.id, {
      explanation: explanationStatus === 'completed' ? explanation : null,
      explanation_status: explanationStatus,
      ai_provider: explanationStatus === 'completed' ? 'google' : undefined,
      ai_model: successfulAiModel,
      explanation_error_code: explanationErrorCode || undefined
    });

    return res.status(201).json(completedRecord || initialRecord);
  } catch (error: any) {
    console.error('[CANDIDATE_JOB_ALIGNMENT_POST] Error:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to process job alignment' });
  }
});

/**
 * GET /api/candidate/alignments
 * Lists all alignment analyses completed by the authenticated candidate.
 */
candidateRouter.get('/alignments', async (req, res) => {
  try {
    const userId = req.user!.id;
    const alignments = await JobAlignmentStore.listForCandidate(userId);
    return res.json(alignments);
  } catch (error: any) {
    console.error('[CANDIDATE_ALIGNMENTS_LIST] Error:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to list job alignments' });
  }
});

// ============================================================
// STAGE 5.3: SKILLS GAP & DEVELOPMENT INSIGHTS ENDPOINT
// ============================================================

/**
 * GET /api/candidate/jobs/:jobId/skills-gap
 * Deterministic Skills Gap & Development Insights (Stage 5.3)
 * Derived from canonical job, latest approved applied parse, and matching completed alignment.
 */
candidateRouter.get('/jobs/:jobId/skills-gap', async (req, res) => {
  try {
    const supabase = getAdminClient();
    const userId = req.user!.id;
    const jobId = req.params.jobId;

    // 1. Fetch canonical job and enforce status = 'published'
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .maybeSingle();

    if (jobError || !job) {
      return res.status(404).json({ error: 'JOB_NOT_FOUND', message: 'Job not found.' });
    }

    if (job.status !== 'published') {
      return res.status(400).json({ 
        error: 'JOB_NOT_PUBLISHED', 
        message: 'Skills gap analysis is only available for published jobs.' 
      });
    }

    // 2. Fetch latest approved applied CV parse
    const { data: parseRecord, error: parseError } = await supabase
      .from('candidate_cv_parses')
      .select('id, cv_version_id, user_id, status, reviewed_data, reviewed_at, applied_at')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .not('reviewed_data', 'is', null)
      .not('reviewed_at', 'is', null)
      .not('applied_at', 'is', null)
      .order('applied_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (parseError || !parseRecord || !parseRecord.reviewed_data || !parseRecord.applied_at) {
      return res.status(400).json({
        error: 'APPROVED_PROFILE_REQUIRED',
        message: 'You must have an approved CV profile to view skills gap insights. Please upload and review your CV in your Profile.'
      });
    }

    // 3. Fetch exact matching completed alignment
    const rulesetVersion = CURRENT_JOB_ALIGNMENT_RULESET_VERSION;
    const alignment = await JobAlignmentStore.getCompletedAlignment(
      userId,
      jobId,
      parseRecord.id,
      rulesetVersion,
      job.updated_at,
      parseRecord.applied_at
    );

    if (!alignment || alignment.status !== 'completed' || !alignment.criteria_breakdown) {
      return res.status(400).json({
        error: 'ALIGNMENT_REQUIRED',
        message: 'Check your Job Alignment first to see your current evidence against this role.'
      });
    }

    // 4. Generate deterministic skills gap analysis
    const analysis = generateSkillsGapAnalysis(
      {
        id: job.id,
        title: job.title,
        company_name: job.company_name,
        updated_at: job.updated_at
      },
      {
        id: parseRecord.id,
        applied_at: parseRecord.applied_at
      },
      alignment
    );

    return res.json(analysis);
  } catch (error: any) {
    console.error('[CANDIDATE_SKILLS_GAP_GET] Error:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to retrieve skills gap analysis' });
  }
});

// ============================================================
// STAGE 5.4: JOB ALIGNMENT HISTORY & COMPARISON ENDPOINTS
// ============================================================

/**
 * GET /api/candidate/jobs/:jobId/alignment-history
 * Retrieves immutable historical alignment analyses for the authenticated candidate and job.
 */
candidateRouter.get('/jobs/:jobId/alignment-history', async (req, res) => {
  try {
    const supabase = getAdminClient();
    const userId = req.user!.id;
    const jobId = req.params.jobId;
    const limit = parseInt(req.query.limit as string, 10) || 20;

    // 1. Fetch canonical job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, title, company_name, updated_at, status')
      .eq('id', jobId)
      .maybeSingle();

    if (jobError || !job) {
      return res.status(404).json({ error: 'JOB_NOT_FOUND', message: 'Job not found.' });
    }

    // 2. Fetch latest approved applied CV parse
    const { data: parseRecord } = await supabase
      .from('candidate_cv_parses')
      .select('id, cv_version_id, user_id, status, reviewed_data, reviewed_at, applied_at')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .not('reviewed_data', 'is', null)
      .not('reviewed_at', 'is', null)
      .not('applied_at', 'is', null)
      .order('applied_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 3. Fetch historical completed alignments for authenticated candidate and job
    const records = await JobAlignmentStore.listHistoryForCandidateAndJob(userId, jobId, limit);

    // 4. Deterministically assemble alignment history
    const response = buildAlignmentHistoryResponse(job, parseRecord || null, records);

    return res.json(response);
  } catch (error: any) {
    console.error('[CANDIDATE_ALIGNMENT_HISTORY_GET] Error:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to retrieve alignment history.' });
  }
});

/**
 * GET /api/candidate/jobs/:jobId/alignment-history/compare
 * Compares two historical alignment analyses deterministically without AI.
 */
candidateRouter.get('/jobs/:jobId/alignment-history/compare', async (req, res) => {
  try {
    const supabase = getAdminClient();
    const userId = req.user!.id;
    const jobId = req.params.jobId;
    const fromId = req.query.from as string;
    const toId = req.query.to as string;

    if (!fromId || !toId) {
      return res.status(400).json({
        error: 'INVALID_COMPARISON_PARAMS',
        message: 'Both "from" and "to" query parameters are required for comparison.'
      });
    }

    // 1. Fetch canonical job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, title, company_name, updated_at, status')
      .eq('id', jobId)
      .maybeSingle();

    if (jobError || !job) {
      return res.status(404).json({ error: 'JOB_NOT_FOUND', message: 'Job not found.' });
    }

    // 2. Fetch both alignment records
    const [fromRecord, toRecord] = await Promise.all([
      JobAlignmentStore.getAlignmentById(fromId),
      JobAlignmentStore.getAlignmentById(toId)
    ]);

    if (!fromRecord || !toRecord) {
      return res.status(404).json({
        error: 'ALIGNMENT_NOT_FOUND',
        message: 'One or both of the specified alignment records could not be found.'
      });
    }

    // 3. Enforce candidate ownership (candidate-private guarantee)
    if (fromRecord.user_id !== userId || toRecord.user_id !== userId) {
      return res.status(403).json({
        error: 'ALIGNMENT_NOT_OWNED',
        message: 'You do not have permission to view or compare these alignment records.'
      });
    }

    // 4. Enforce job scoping
    if (fromRecord.job_id !== jobId || toRecord.job_id !== jobId) {
      return res.status(400).json({
        error: 'ALIGNMENT_JOB_MISMATCH',
        message: 'Both alignment records must belong to the requested job.'
      });
    }

    // 5. Fetch latest approved applied parse for context
    const { data: parseRecord } = await supabase
      .from('candidate_cv_parses')
      .select('id, applied_at')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .not('reviewed_data', 'is', null)
      .not('applied_at', 'is', null)
      .order('applied_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 6. Build deterministic comparison
    const comparison = buildAlignmentComparisonResponse(
      fromRecord,
      toRecord,
      job,
      parseRecord || null
    );

    return res.json(comparison);
  } catch (error: any) {
    console.error('[CANDIDATE_ALIGNMENT_COMPARE_GET] Error:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to generate alignment comparison.' });
  }
});

// ============================================================
// STAGE 5.2: EVIDENCE-SAFE CV TAILORING ENDPOINTS
// ============================================================

/**
 * POST /api/candidate/jobs/:jobId/tailoring
 * Initiates or retrieves an evidence-safe CV tailoring session for a published job.
 */
candidateRouter.post('/jobs/:jobId/tailoring', async (req, res) => {
  try {
    if (!isCvTailoringPublicEnabled()) {
      return res.status(403).json({
        error: 'FEATURE_NOT_AVAILABLE',
        message: 'AI CV Tailoring is coming soon.'
      });
    }
    const userId = req.user!.id;
    const jobId = req.params.jobId;
    const supabase = getAdminClient();

    // 1. Fetch the target canonical job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, title, company_name, description, responsibilities, requirements, preferred_qualifications, status, updated_at')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return res.status(404).json({ error: 'JOB_NOT_FOUND', message: 'The specified job opportunity was not found.' });
    }

    if (job.status !== 'published') {
      return res.status(400).json({
        error: 'JOB_NOT_PUBLISHED',
        message: 'Tailoring is only available for active published job opportunities.'
      });
    }

    // 2. Fetch candidate's latest approved applied CV parse
    const { data: parseRecord, error: parseError } = await supabase
      .from('candidate_cv_parses')
      .select('id, cv_version_id, user_id, status, reviewed_data, reviewed_at, applied_at')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .not('reviewed_data', 'is', null)
      .not('reviewed_at', 'is', null)
      .not('applied_at', 'is', null)
      .order('applied_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (parseError || !parseRecord || !parseRecord.reviewed_data) {
      return res.status(400).json({
        error: 'NO_APPROVED_CV',
        message: 'You need an approved CV profile to tailor your CV. Please upload and verify your CV in your Profile workspace.'
      });
    }

    // 3. Fetch candidate profile metadata
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // 4. Resolve Stage 5.1 alignment
    // Stage 5.2 MUST reference a completed Stage 5.1 alignment matching:
    // authenticated candidate, canonical job, latest approved applied parse,
    // ruleset_version = CURRENT_JOB_ALIGNMENT_RULESET_VERSION, status = completed,
    // alignment.job_updated_at = current job.updated_at, and
    // alignment.candidate_applied_at = current parseRecord.applied_at.
    // Stale alignments (job updated or CV updated after alignment) are strictly rejected.
    // Low alignment score does NOT block tailoring.
    const alignmentRecord = await JobAlignmentStore.getCompletedAlignment(
      userId,
      job.id,
      parseRecord.id,
      CURRENT_JOB_ALIGNMENT_RULESET_VERSION,
      job.updated_at,
      parseRecord.applied_at
    );

    const isJobSnapshotCurrent = Boolean(
      alignmentRecord && (
        alignmentRecord.job_updated_at === job.updated_at ||
        new Date(alignmentRecord.job_updated_at).getTime() === new Date(job.updated_at).getTime()
      )
    );
    const isCvSnapshotCurrent = Boolean(
      alignmentRecord && (
        alignmentRecord.candidate_applied_at === parseRecord.applied_at ||
        new Date(alignmentRecord.candidate_applied_at).getTime() === new Date(parseRecord.applied_at).getTime()
      )
    );

    if (!alignmentRecord || !isJobSnapshotCurrent || !isCvSnapshotCurrent) {
      return res.status(400).json({
        error: 'ALIGNMENT_REQUIRED',
        message: 'A completed role alignment check matching the current job and profile is required before tailoring your CV. Please check your alignment for this role first.'
      });
    }

    // 5. Active session idempotency check
    const activeSession = await CvTailoringStore.getActiveSession(userId, job.id, parseRecord.id, alignmentRecord.id);
    if (activeSession && !req.query.force_new) {
      return res.status(409).json({
        error: 'ACTIVE_SESSION_EXISTS',
        message: 'A tailoring session is currently in progress for this role.',
        session: activeSession
      });
    }

    // 5b. Request deduplication: prevent rapid double-clicks from running parallel generations
    const dedupKey = TailoringRequestDeduplicator.getKey(
      userId,
      job.id,
      parseRecord.id,
      alignmentRecord.id,
      CURRENT_TAILORING_ENGINE_VERSION
    );

    if (TailoringRequestDeduplicator.isInFlight(dedupKey) && !req.query.force_new) {
      // Re-use active in-flight request rather than launching duplicate Gemini calls
      const { result } = await TailoringRequestDeduplicator.executeOrJoin(dedupKey, async () => {
        throw new Error('DEDUP_UNEXPECTED');
      });
      return res.status(200).json(result);
    }

    const { result: sessionResult } = await TailoringRequestDeduplicator.executeOrJoin(
      dedupKey,
      async () => {
        // 6. Create initial pending record
        const initialSession = await CvTailoringStore.createSession({
          user_id: userId,
          job_id: job.id,
          cv_version_id: parseRecord.cv_version_id,
          parse_id: parseRecord.id,
          alignment_id: alignmentRecord.id,
          status: 'generating',
          tailoring_status: 'draft',
          tailoring_engine_version: CURRENT_TAILORING_ENGINE_VERSION,
          source_alignment_ruleset: alignmentRecord.ruleset_version || CURRENT_JOB_ALIGNMENT_RULESET_VERSION,
          job_updated_at: job.updated_at,
          candidate_applied_at: parseRecord.applied_at,
          job_title: job.title,
          company_name: job.company_name,
          evidence_manifest: [],
          suggestions: []
        });

        // 7. Execute tailoring pipeline
        try {
          const generated = await CvTailoringEngine.executeTailoring(
            parseRecord.reviewed_data,
            profile,
            {
              title: job.title,
              company_name: job.company_name,
              description: job.description,
              requirements: job.requirements,
              preferred_qualifications: job.preferred_qualifications,
              responsibilities: job.responsibilities
            },
            alignmentRecord,
            { sessionId: initialSession.id }
          );

          const completedSession = await CvTailoringStore.updateSession(initialSession.id, {
            status: 'completed',
            evidence_manifest: generated.evidence_manifest,
            tailoring_plan: generated.tailoring_plan,
            suggestions: generated.suggestions,
            draft_data: generated.draft_data,
            generation_provider: generated.generation_provider,
            generation_model: generated.generation_model,
            completed_at: new Date().toISOString()
          });

          return completedSession || initialSession;
        } catch (engineError: any) {
          console.warn('[CV_TAILORING_POST] Generation failure:', engineError.message);
          
          const failedSession = await CvTailoringStore.updateSession(initialSession.id, {
            status: 'failed',
            error_code: engineError.message?.includes('503') || engineError.message?.includes('GEMINI_UNAVAILABLE') || engineError.code === 'GEMINI_UNAVAILABLE' ? 'GEMINI_UNAVAILABLE' : 'GENERATION_FAILED',
            completed_at: new Date().toISOString()
          });

          const sessionObj = failedSession || initialSession;
          const unavailableError = new Error('GEMINI_UNAVAILABLE');
          (unavailableError as any).status = 503;
          (unavailableError as any).sessionId = sessionObj.id;
          (unavailableError as any).session = sessionObj;
          throw unavailableError;
        }
      }
    );

    return res.status(201).json(sessionResult);
  } catch (error: any) {
    if (error.status === 503 || error.message?.includes('GEMINI_UNAVAILABLE') || error.code === 'GEMINI_UNAVAILABLE') {
      return res.status(503).json({
        error: 'GEMINI_UNAVAILABLE',
        message: 'CV tailoring is temporarily unavailable because the AI service could not complete this request. Your original CV and profile are unchanged. Please try again.',
        sessionId: error.sessionId,
        session: error.session
      });
    }
    if (error.message?.includes('PERSISTENCE_UNAVAILABLE')) {
      return res.status(503).json({
        error: 'TAILORING_PERSISTENCE_UNAVAILABLE',
        message: 'CV tailoring persistence is currently unavailable. Your profile and original CV are unaffected. Please try again later.'
      });
    }
    console.error('[CV_TAILORING_POST] Fatal error:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to process CV tailoring session' });
  }
});

/**
 * GET /api/candidate/jobs/:jobId/tailoring
 * Gets the latest tailoring session for a job with drift detection.
 */
candidateRouter.get('/jobs/:jobId/tailoring', async (req, res) => {
  try {
    const userId = req.user!.id;
    const jobId = req.params.jobId;
    const supabase = getAdminClient();

    const { data: job } = await supabase
      .from('jobs')
      .select('id, updated_at')
      .eq('id', jobId)
      .single();

    const { data: parseRecord } = await supabase
      .from('candidate_cv_parses')
      .select('applied_at')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('applied_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const session = await CvTailoringStore.getLatestSession(
      userId,
      jobId,
      job?.updated_at,
      parseRecord?.applied_at
    );

    return res.json({ session, is_public_enabled: isCvTailoringPublicEnabled() });
  } catch (error: any) {
    console.error('[CV_TAILORING_JOB_GET] Error:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to fetch job tailoring session' });
  }
});

/**
 * GET /api/candidate/tailoring/:sessionId
 * Gets a specific tailoring session by ID.
 */
candidateRouter.get('/tailoring/:sessionId', async (req, res) => {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.sessionId;

    const session = await CvTailoringStore.getSession(sessionId, userId);
    if (!session) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Tailoring session not found.' });
    }

    if (session.status === 'failed') {
      return res.status(400).json({
        error: 'SESSION_FAILED',
        message: 'This CV tailoring session failed during generation and has no draft content.',
        session
      });
    }

    return res.json(session);
  } catch (error: any) {
    console.error('[CV_TAILORING_GET] Error:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to fetch tailoring session' });
  }
});

/**
 * GET /api/candidate/tailoring
 * Lists all tailoring sessions for the authenticated candidate.
 */
candidateRouter.get('/tailoring', async (req, res) => {
  try {
    const userId = req.user!.id;
    const sessions = await CvTailoringStore.listForCandidate(userId);
    return res.json(sessions);
  } catch (error: any) {
    console.error('[CV_TAILORING_LIST] Error:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to list tailoring sessions' });
  }
});

/**
 * PATCH /api/candidate/tailoring/:sessionId/suggestions/:suggestionId
 * Accept, reject, or edit a suggestion with deterministic factual validation.
 */
candidateRouter.patch('/tailoring/:sessionId/suggestions/:suggestionId', async (req, res) => {
  try {
    if (!isCvTailoringPublicEnabled()) {
      return res.status(403).json({
        error: 'FEATURE_NOT_AVAILABLE',
        message: 'AI CV Tailoring is coming soon.'
      });
    }
    const userId = req.user!.id;
    const { sessionId, suggestionId } = req.params;
    const { action, edited_text } = req.body; // action: 'accept' | 'reject' | 'edit'

    const session = await CvTailoringStore.getSession(sessionId, userId);
    if (!session) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Tailoring session not found.' });
    }

    if (session.status !== 'completed') {
      return res.status(400).json({ error: 'INVALID_SESSION_STATUS', message: 'Suggestions can only be updated on completed tailoring sessions.' });
    }

    const suggestions: TailoringSuggestion[] = session.suggestions || [];
    const targetIdx = suggestions.findIndex(s => s.suggestion_id === suggestionId);

    if (targetIdx === -1) {
      return res.status(404).json({ error: 'SUGGESTION_NOT_FOUND', message: 'Suggestion not found in session.' });
    }

    const targetSug = { ...suggestions[targetIdx] };

    if (action === 'edit') {
      const newText = (edited_text || '').trim();
      if (!newText) {
        return res.status(400).json({ error: 'INVALID_TEXT', message: 'Edited text cannot be empty.' });
      }

      // Preserve original generated wording prior to candidate manual edits
      if (!targetSug.generated_suggested_text) {
        targetSug.generated_suggested_text = targetSug.original_suggested_text || targetSug.suggested_text;
      }
      if (!targetSug.original_suggested_text) {
        targetSug.original_suggested_text = targetSug.generated_suggested_text;
      }
      targetSug.candidate_edited_text = newText;
      targetSug.candidate_edited = true;

      // Re-run deterministic claim validation on candidate edit
      const validation = validateSuggestion(
        { ...targetSug, suggested_text: newText },
        session.evidence_manifest || []
      );

      if (!validation.isValid) {
        targetSug.suggested_text = newText;
        targetSug.status = 'blocked';
        targetSug.validation_status = 'blocked';
        targetSug.validation_issues = validation.issues;
        targetSug.user_note = validation.errorCode === 'FACTUAL_MEANING_REVERSAL'
          ? 'This edit reverses the factual meaning of your approved profile evidence. Edits must remain consistent with verified profile facts.'
          : 'This information is not currently supported by your approved QWERTY profile. Update your profile first if you want QWERTY to use it as verified evidence.';
      } else {
        targetSug.suggested_text = newText;
        targetSug.status = 'pending';
        targetSug.validation_status = 'valid';
        targetSug.validation_issues = [];
        targetSug.user_note = undefined;
      }
    } else if (action === 'accept') {
      if (targetSug.validation_status !== 'valid' || targetSug.status === 'blocked') {
        return res.status(400).json({
          error: 'CANNOT_ACCEPT_BLOCKED_SUGGESTION',
          message: 'Cannot accept a suggestion containing unverified claims or blocked statements.'
        });
      }
      targetSug.status = 'accepted';
    } else if (action === 'reject') {
      targetSug.status = 'rejected';
    } else {
      return res.status(400).json({ error: 'INVALID_ACTION', message: 'Action must be accept, reject, or edit.' });
    }

    suggestions[targetIdx] = targetSug;

    // Fetch parse reviewed_data to recompile draft
    const supabase = getAdminClient();
    const { data: parseRecord } = await supabase
      .from('candidate_cv_parses')
      .select('reviewed_data')
      .eq('id', session.parse_id)
      .single();

    const recompiledDraft = CvTailoringEngine.compileTailoredDraft(
      parseRecord?.reviewed_data || {},
      suggestions
    );

    const updated = await CvTailoringStore.updateSession(sessionId, {
      suggestions,
      draft_data: recompiledDraft,
      tailoring_status: 'reviewing'
    });

    return res.json(updated);
  } catch (error: any) {
    if (error.message?.includes('PERSISTENCE_UNAVAILABLE')) {
      return res.status(503).json({
        error: 'TAILORING_PERSISTENCE_UNAVAILABLE',
        message: 'CV tailoring persistence is currently unavailable. Your profile and original CV are unaffected. Please try again later.'
      });
    }
    console.error('[CV_TAILORING_SUGGESTION_PATCH] Error:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to update suggestion' });
  }
});

/**
 * POST /api/candidate/tailoring/:sessionId/finalize
 * Finalizes the candidate-tailored CV draft.
 */
candidateRouter.post('/tailoring/:sessionId/finalize', async (req, res) => {
  try {
    if (!isCvTailoringPublicEnabled()) {
      return res.status(403).json({
        error: 'FEATURE_NOT_AVAILABLE',
        message: 'AI CV Tailoring is coming soon.'
      });
    }
    const userId = req.user!.id;
    const { sessionId } = req.params;

    const session = await CvTailoringStore.getSession(sessionId, userId);
    if (!session) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Tailoring session not found.' });
    }

    if (session.status !== 'completed' || !session.draft_data) {
      return res.status(400).json({ error: 'INCOMPLETE_SESSION', message: 'Only completed sessions can be finalized.' });
    }

    // Re-verify that all accepted suggestions remain validated against approved evidence
    const acceptedSuggestions = (session.suggestions || []).filter(s => s.status === 'accepted');
    for (const sug of acceptedSuggestions) {
      const activeText = (sug.candidate_edited && sug.candidate_edited_text)
        ? sug.candidate_edited_text
        : sug.suggested_text;

      const validation = validateSuggestion(
        { ...sug, suggested_text: activeText },
        session.evidence_manifest || []
      );
      if (!validation.isValid) {
        return res.status(400).json({
          error: 'CANNOT_FINALIZE_UNVALIDATED_DRAFT',
          code: validation.errorCode || 'FACTUAL_VALIDATION_FAILED',
          message: `Accepted suggestion "${sug.suggestion_id}" fails factual validation: ${validation.issues.join('; ')}`
        });
      }
    }

    const updated = await CvTailoringStore.updateSession(sessionId, {
      tailoring_status: 'finalized',
      finalized_at: new Date().toISOString()
    });

    return res.json(updated);
  } catch (error: any) {
    if (error.message?.includes('PERSISTENCE_UNAVAILABLE')) {
      return res.status(503).json({
        error: 'TAILORING_PERSISTENCE_UNAVAILABLE',
        message: 'CV tailoring persistence is currently unavailable. Your profile and original CV are unaffected. Please try again later.'
      });
    }
    console.error('[CV_TAILORING_FINALIZE] Error:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to finalize tailored CV' });
  }
});

