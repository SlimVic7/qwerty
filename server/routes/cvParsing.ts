import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getAdminClient } from '../db/supabase.js';
import { extractTextFromCV } from '../services/cv/textExtractor.js';
import { GeminiCVExtractionProvider } from '../services/extraction/providers/GeminiCVExtractionProvider.js';
import { calculateAtsReadiness } from '../services/cv/atsReadiness.js';
import { GeminiAtsRecommendationProvider } from '../services/extraction/providers/GeminiAtsRecommendationProvider.js';
import { getPrimaryGeminiModel } from '../config/gemini.js';
import { z } from 'zod';

export const cvParsingRouter = Router();
cvParsingRouter.use(requireAuth);

const geminiProvider = new GeminiCVExtractionProvider();

const cvReviewSchema = z.object({
  personal: z.object({
    full_name: z.string().nullable().optional(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    links: z.array(z.string()).nullable().optional()
  }).optional(),
  professional: z.object({
    headline: z.string().nullable().optional(),
    summary: z.string().nullable().optional(),
    years_experience: z.number().nullable().optional()
  }).optional(),
  skills: z.array(z.any()).nullable().optional(),
  experience: z.array(z.any()).nullable().optional(),
  education: z.array(z.any()).nullable().optional(),
  certifications: z.array(z.any()).nullable().optional(),
  projects: z.array(z.any()).nullable().optional(),
  languages: z.array(z.any()).nullable().optional()
}).passthrough();

import { getOrStartCvParse } from '../services/cv/cvParsingService.js';

cvParsingRouter.post('/:id/parse', async (req, res) => {
  try {
    const userId = req.user!.id;
    const cvId = req.params.id;
    const forceRetry = req.query.retry === 'true';

    const parseRecord = await getOrStartCvParse(cvId, userId, { forceRetry });
    return res.json(parseRecord);
  } catch (error: any) {
    if (error.statusCode === 404 || error.message === 'CV_NOT_FOUND') {
      return res.status(404).json({ message: 'CV not found' });
    }
    console.error('[CV_PARSE] Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

cvParsingRouter.get('/:id/parse', async (req, res) => {
  try {
    const userId = req.user!.id;
    const cvId = req.params.id;

    // Self-healing: if CV version exists but has no parse record, automatically starts parse job
    const parseRecord = await getOrStartCvParse(cvId, userId);
    return res.json(parseRecord);
  } catch (error: any) {
    if (error.statusCode === 404 || error.message === 'CV_NOT_FOUND') {
      return res.status(404).json({ message: 'CV not found' });
    }
    console.error('[CV_PARSE_GET] Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

cvParsingRouter.post('/:id/parse/apply', async (req, res) => {
  try {
    const supabase = getAdminClient();
    const userId = req.user!.id;
    const cvId = req.params.id;
    const { parse_id, profile_updates } = req.body;

    if (!parse_id || typeof parse_id !== 'string') {
      return res.status(400).json({ message: 'Invalid parse_id provided' });
    }

    if (!profile_updates || typeof profile_updates !== 'object') {
      return res.status(400).json({ message: 'Invalid profile updates provided' });
    }

    const validationResult = cvReviewSchema.safeParse(profile_updates);
    if (!validationResult.success) {
      return res.status(400).json({ message: 'Invalid reviewed_data structure', errors: validationResult.error.issues });
    }

    // Call the atomic PostgreSQL RPC
    const { data: applyResult, error: applyError } = await supabase.rpc('candidate_apply_cv_parse', {
      p_parse_id: parse_id,
      p_user_id: userId,
      p_reviewed_data: validationResult.data
    });

    if (applyError) {
      console.error('[CV_PARSE_APPLY] RPC Error:', applyError);
      throw applyError;
    }

    // If already applied, you can optionally return differently, but 200 is fine
    // return res.json(applyResult) for example, but we can also just fetch the updated parse
    
    // After successful apply, fetch the updated parse to return
    const { data: updatedParse, error: fetchError } = await supabase
      .from('candidate_cv_parses')
      .select('*')
      .eq('id', parse_id)
      .eq('user_id', userId)
      .single();

    if (fetchError) throw fetchError;

    res.json({ message: 'Profile updated successfully', parse: updatedParse });
  } catch (error: any) {
    console.error('[CV_PARSE_APPLY] Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

cvParsingRouter.get('/:id/assessment', async (req, res) => {
  try {
    const supabase = getAdminClient();
    const userId = req.user!.id;
    const cvId = req.params.id; // cv_version_id

    // No need to query candidate_cv_versions first, just get the latest assessment 
    // bounded by user_id and cv_version_id directly.
    const { data: assessment, error: assessmentError } = await supabase
      .from('candidate_cv_assessments')
      .select('*')
      .eq('cv_version_id', cvId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (assessmentError || !assessment) {
      return res.status(404).json({ error: 'ASSESSMENT_NOT_FOUND' });
    }

    return res.json(assessment);
  } catch (error: any) {
    console.error('[CV_ASSESSMENT_GET] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

cvParsingRouter.post('/:id/assessment', async (req, res) => {
  try {
    const supabase = getAdminClient();
    const userId = req.user!.id;
    const cvId = req.params.id; // cv_version_id

    // 1. Verify CV ownership & get latest parse
    const { data: parseRecord, error: parseError } = await supabase
      .from('candidate_cv_parses')
      .select('id, status, extracted_data, reviewed_data, raw_text_hash')
      .eq('cv_version_id', cvId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (parseError || !parseRecord) {
      return res.status(404).json({ error: 'PARSE_NOT_FOUND' });
    }

    if (parseRecord.status !== 'completed' && parseRecord.status !== 'needs_review') {
      return res.status(400).json({ error: 'PARSE_NOT_READY' });
    }

    // 2. Prevent concurrent assessment for the SAME parse
    const { data: existingActive } = await supabase
      .from('candidate_cv_assessments')
      .select('id')
      .eq('parse_id', parseRecord.id)
      .in('status', ['pending', 'processing_rules'])
      .limit(1)
      .single();

    if (existingActive) {
      return res.status(409).json({ error: 'ASSESSMENT_ALREADY_RUNNING' });
    }

    // 3. Create initial assessment record
    const { data: newAssessment, error: insertError } = await supabase
      .from('candidate_cv_assessments')
      .insert({
        user_id: userId,
        cv_version_id: cvId,
        parse_id: parseRecord.id,
        status: 'processing_rules',
        recommendation_status: 'not_started'
      })
      .select()
      .single();

    if (insertError || !newAssessment) {
      console.error('Insert Error:', insertError);
      return res.status(500).json({ error: 'Failed to create assessment record' });
    }

    const hasExtractedData = !!parseRecord.extracted_data;
    const hasRawTextHash = !!parseRecord.raw_text_hash;

    // 4. Run deterministic rules
    let assessmentResult;
    try {
      assessmentResult = calculateAtsReadiness(
        parseRecord.extracted_data,
        parseRecord.reviewed_data,
        { hasExtractedData, hasRawTextHash }
      );
    } catch (error: any) {
      await supabase.from('candidate_cv_assessments').update({
        status: 'failed',
        error_code: 'RULE_ENGINE_FAILED',
        completed_at: new Date().toISOString()
      }).eq('id', newAssessment.id);
      return res.status(500).json({ error: 'RULE_ENGINE_FAILED' });
    }

    // Update DB with rule results and mark deterministic as completed
    await supabase.from('candidate_cv_assessments').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      ruleset_version: assessmentResult.ruleset_version,
      score: assessmentResult.total_score,
      max_score: assessmentResult.max_score,
      component_results: assessmentResult.components,
      recommendation_status: 'processing'
    }).eq('id', newAssessment.id);

    // 5. Run AI recommendations
    const recommendationProvider = new GeminiAtsRecommendationProvider();
    let recommendations = null;
    let recStatus = 'completed';
    let recErrorCode = null;

    try {
      const cvData = parseRecord.reviewed_data || parseRecord.extracted_data || {};
      recommendations = await recommendationProvider.generateRecommendations(assessmentResult, cvData);
    } catch (error: any) {
      console.error('[CV_ASSESSMENT_POST] AI recommendation failed:', error);
      recStatus = 'failed';
      recErrorCode = 'AI_RECOMMENDATIONS_FAILED';
    }

    // 6. Complete assessment AI portion
    const { data: completedAssessment } = await supabase.from('candidate_cv_assessments').update({
      recommendation_status: recStatus,
      recommendations: recommendations,
      ai_provider: 'google',
      ai_model: recommendationProvider.getLastExecutedModel?.() || recommendationProvider.getModelName?.() || getPrimaryGeminiModel(),
      recommendation_error_code: recErrorCode
    }).eq('id', newAssessment.id).select().single();

    return res.json(completedAssessment);
  } catch (error: any) {
    console.error('[CV_ASSESSMENT_POST] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
