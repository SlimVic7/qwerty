import { getAdminClient } from '../../db/supabase.js';
import { extractTextFromCV } from './textExtractor.js';
import { GeminiCVExtractionProvider } from '../extraction/providers/GeminiCVExtractionProvider.js';
import { getPrimaryGeminiModel } from '../../config/gemini.js';

const geminiProvider = new GeminiCVExtractionProvider();

export const MAX_CONCURRENT_PARSE_WORKERS = 5;
export const STALE_JOB_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes conservative stale timeout

let activeWorkerCount = 0;

export type ParseServiceOptions = {
  forceRetry?: boolean;
};

/**
 * Gets or creates a durable CV parse job in PostgreSQL and triggers worker claim.
 * Idempotent, durable, and self-healing.
 */
export async function getOrStartCvParse(cvId: string, userId: string, options: ParseServiceOptions = {}) {
  const supabase = getAdminClient();

  // 1. Verify CV version ownership and existence
  const { data: cvRecord, error: fetchError } = await supabase
    .from('candidate_cv_versions')
    .select('*')
    .eq('id', cvId)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !cvRecord) {
    const error = new Error('CV_NOT_FOUND');
    (error as any).statusCode = 404;
    throw error;
  }

  // 2. Query existing parse records
  const { data: existingParse } = await supabase
    .from('candidate_cv_parses')
    .select('*')
    .eq('cv_version_id', cvId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (existingParse && !options.forceRetry) {
    // If job is in 'pending', trigger worker claim in case it was unstarted
    if (existingParse.status === 'pending') {
      triggerParseWorker(existingParse.id, cvRecord, userId);
    }
    return existingParse;
  }

  // 3. Atomically create a new DURABLE pending parse record in PostgreSQL
  let parseRecord: any;
  const { data: insertedParse, error: insertError } = await supabase
    .from('candidate_cv_parses')
    .insert({
      cv_version_id: cvId,
      user_id: userId,
      status: 'pending' // Insert as durable 'pending'
    })
    .select('*')
    .single();

  if (insertError) {
    // 23505 is PostgreSQL unique constraint violation on idx_single_active_parse_per_cv
    if (insertError.code === '23505') {
      const { data: activeParse } = await supabase
        .from('candidate_cv_parses')
        .select('*')
        .eq('cv_version_id', cvId)
        .eq('user_id', userId)
        .in('status', ['pending', 'extracting_text', 'processing'])
        .single();

      if (activeParse) {
        if (activeParse.status === 'pending') {
          triggerParseWorker(activeParse.id, cvRecord, userId);
        }
        return activeParse;
      }
    }
    throw insertError;
  }

  parseRecord = insertedParse;

  // 4. Trigger worker claim
  triggerParseWorker(parseRecord.id, cvRecord, userId);

  return parseRecord;
}

/**
 * Trigger background worker with concurrency bounding.
 */
export function triggerParseWorker(parseId: string, cvRecord: any, userId: string) {
  claimAndRunCvParseWorker(parseId, cvRecord, userId).catch((err) => {
    console.error(`[CV_PARSER_WORKER_BG_ERR] parseId=${parseId}:`, err);
  });
}

/**
 * Atomically claims a pending parse job in PostgreSQL and executes extraction.
 * Guarantees that only ONE worker successfully claims a job.
 */
export async function claimAndRunCvParseWorker(parseId: string, cvRecord: any, userId: string): Promise<any> {
  const supabase = getAdminClient();

  if (activeWorkerCount >= MAX_CONCURRENT_PARSE_WORKERS) {
    // Worker concurrency limit reached. The job remains durable in 'pending' in PostgreSQL.
    console.log(`[CV_PARSER_BOUNDED] Max worker limit (${MAX_CONCURRENT_PARSE_WORKERS}) reached. parseId=${parseId} remains queued in 'pending'.`);
    return null;
  }

  // ATOMIC CLAIM: Update status from 'pending' to 'extracting_text'
  const { data: claimedParse, error: claimError } = await supabase
    .from('candidate_cv_parses')
    .update({
      status: 'extracting_text',
      updated_at: new Date().toISOString()
    })
    .eq('id', parseId)
    .eq('status', 'pending') // MUST BE PENDING TO CLAIM!
    .select('*')
    .single();

  if (claimError || !claimedParse) {
    // Another worker claimed this job or it's no longer pending. Abort.
    return null;
  }

  activeWorkerCount++;
  const startTime = Date.now();

  try {
    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('candidate-cvs')
      .download(cvRecord.storage_path);

    if (downloadError || !fileData) {
      throw new Error('CV_NOT_FOUND');
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());

    // Extract text deterministically
    const extractionResult = await extractTextFromCV(buffer, cvRecord.mime_type);

    await supabase
      .from('candidate_cv_parses')
      .update({
        status: 'processing',
        raw_text_hash: extractionResult.hash,
        updated_at: new Date().toISOString()
      })
      .eq('id', parseId);

    // Call Gemini AI Extraction Provider
    let extractedData;
    try {
      extractedData = await geminiProvider.extractCV(extractionResult.text);
    } catch (aiErr: any) {
      console.warn(`[CV_PARSER_AI_PROVIDER_ERROR] parseId=${parseId}:`, aiErr?.message || aiErr);
      const aiError = new Error('AI_PROVIDER_ERROR');
      (aiError as any).cause = aiErr;
      throw aiError;
    }

    // Save completed extraction
    const { data: completedParse, error: completeError } = await supabase
      .from('candidate_cv_parses')
      .update({
        status: 'needs_review',
        extracted_data: extractedData,
        completed_at: new Date().toISOString(),
        ai_provider: 'gemini',
        ai_model: geminiProvider.getLastExecutedModel?.() || geminiProvider.getModelName?.() || getPrimaryGeminiModel(),
        parser_version: '1.0'
      })
      .eq('id', parseId)
      .select('*')
      .single();

    if (completeError) throw completeError;

    const durationMs = Date.now() - startTime;
    console.log(`[CV_PARSER_SUCCESS] parseId=${parseId} cvId=${cvRecord.id} duration=${durationMs}ms`);

    return completedParse;
  } catch (processError: any) {
    const durationMs = Date.now() - startTime;
    let errCode = 'UNKNOWN_ERROR';
    if (processError.message === 'CV_NOT_FOUND') errCode = processError.message;
    else if (processError.message === 'UNSUPPORTED_DOCUMENT') errCode = processError.message;
    else if (processError.message === 'OCR_REQUIRED') errCode = processError.message;
    else if (processError.message === 'AI_PROVIDER_ERROR' || processError.message?.includes('429')) errCode = 'AI_PROVIDER_ERROR';
    else if (processError.message === 'TEXT_EXTRACTION_FAILED') errCode = processError.message;
    else errCode = 'TEXT_EXTRACTION_FAILED';

    console.error(`[CV_PARSER_FAILED] parseId=${parseId} cvId=${cvRecord.id} errCode=${errCode} duration=${durationMs}ms:`, processError?.message || processError);

    const { data: failedParse } = await supabase
      .from('candidate_cv_parses')
      .update({
        status: 'failed',
        error_code: errCode,
        completed_at: new Date().toISOString()
      })
      .eq('id', parseId)
      .select('*')
      .single();

    return failedParse;
  } finally {
    activeWorkerCount--;
    // Continuous Queue Drain: When a worker finishes, automatically trigger processPendingCvParses to claim next pending job until queue is empty or concurrency limit is reached!
    processPendingCvParses().catch(() => {});
  }
}

/**
 * Recovers abandoned jobs stuck in 'extracting_text' or 'processing' if updated_at is older than STALE_JOB_TIMEOUT_MS.
 * Transitions them safely back to 'pending' so they can be claimed by active workers.
 */
export async function recoverStaleCvParses(): Promise<number> {
  try {
    const supabase = getAdminClient();
    const staleCutoffIso = new Date(Date.now() - STALE_JOB_TIMEOUT_MS).toISOString();

    // Find stale active jobs
    const queryRes = await supabase
      .from('candidate_cv_parses')
      .select('id')
      .in('status', ['extracting_text', 'processing'])
      .lt('updated_at', staleCutoffIso);

    const staleRows = queryRes?.data;
    const error = queryRes?.error;

    if (error || !staleRows || !Array.isArray(staleRows) || staleRows.length === 0) {
      return 0;
    }

    let resetCount = 0;
    for (const row of staleRows) {
      if (!row?.id) continue;
      const { data: resetRow } = await supabase
        .from('candidate_cv_parses')
        .update({
          status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', row.id)
        .in('status', ['extracting_text', 'processing'])
        .lt('updated_at', staleCutoffIso)
        .select('id')
        .single();

      if (resetRow) {
        resetCount++;
        console.log(`[CV_PARSER_RECOVERY] Reset stale parseId=${row.id} back to 'pending' for worker re-claiming.`);
      }
    }

    return resetCount;
  } catch (e) {
    return 0;
  }
}

/**
 * Recovery sweeper mechanism: Discovers pending jobs in PostgreSQL and processes them.
 * Safe for server restart recovery or background worker processing.
 */
export async function processPendingCvParses(limit = 10): Promise<number> {
  const supabase = getAdminClient();

  if (activeWorkerCount >= MAX_CONCURRENT_PARSE_WORKERS) {
    return 0;
  }

  // 1. Recover stale claimed jobs that were abandoned by process crash/restart
  await recoverStaleCvParses().catch((err) => {
    console.warn('[CV_PARSER_STALE_RECOVERY_ERR]', err);
  });

  // 2. Query durable pending parse records
  const { data: pendingParses, error } = await supabase
    .from('candidate_cv_parses')
    .select('*, candidate_cv_versions(*)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error || !pendingParses || pendingParses.length === 0) {
    return 0;
  }

  let claimedCount = 0;
  for (const parseRow of pendingParses) {
    if (activeWorkerCount >= MAX_CONCURRENT_PARSE_WORKERS) break;

    const cvRecord = parseRow.candidate_cv_versions || {
      id: parseRow.cv_version_id,
      user_id: parseRow.user_id,
      storage_path: `${parseRow.user_id}/${parseRow.cv_version_id}/cv.pdf`,
      mime_type: 'application/pdf'
    };

    // Atomic claim attempt
    const result = await claimAndRunCvParseWorker(parseRow.id, cvRecord, parseRow.user_id);
    if (result !== null) {
      claimedCount++;
    }
  }

  return claimedCount;
}

export function getActiveWorkerCount() {
  return activeWorkerCount;
}

export function resetActiveWorkerCount() {
  activeWorkerCount = 0;
}
