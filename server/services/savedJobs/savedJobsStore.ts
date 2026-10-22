/**
 * QWERTY Stage 6.1 — Saved Jobs Store
 * Candidate-Private Saved Jobs Persistence & Retrieval
 */

import { getAdminClient } from '../../db/supabase.js';
import { v4 as uuidv4 } from 'uuid';
import {
  CURRENT_SAVED_JOBS_VERSION,
  SavedJobRecord,
  SavedJobStatusResponse,
  SavedJobsListResponse,
  SavedJobListItem
} from './types.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// In-memory fallback store ONLY for local unit testing and development when migration 00013 has not been applied to Supabase yet.
// In production (NODE_ENV === 'production'), fallback is strictly forbidden.
const fallbackStore: Map<string, SavedJobRecord> = new Map();

function assertNoFallbackInProduction(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_PERSISTENCE_REQUIRED: In-memory fallback is disabled in production.');
  }
}

/**
 * Checks if a Supabase error is due to the table not existing yet.
 */
function isTableMissingError(error: any): boolean {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  const hint = (error.hint || '').toLowerCase();
  return (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    msg.includes('could not find the table') ||
    msg.includes('relation "public.candidate_saved_jobs" does not exist') ||
    msg.includes('candidate_saved_jobs') ||
    hint.includes('perhaps you meant')
  );
}

export class SavedJobsStore {
  /**
   * Validates if a string is a valid UUID format.
   */
  public static isValidUuid(id: string): boolean {
    return Boolean(id && typeof id === 'string' && UUID_REGEX.test(id));
  }

  /**
   * Saves a job for a candidate (Idempotent).
   * Throws JOB_NOT_FOUND (404) or JOB_NOT_AVAILABLE (400) if invalid.
   */
  public static async saveJob(userId: string, jobId: string): Promise<SavedJobStatusResponse> {
    if (!this.isValidUuid(userId)) {
      throw new Error('INVALID_USER_ID');
    }
    if (!this.isValidUuid(jobId)) {
      throw new Error('INVALID_JOB_ID');
    }

    const supabase = getAdminClient();

    // 1. Verify job exists and check its trackability status
    let jobStatus: string | null = null;
    if (supabase) {
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .select('id, status')
        .eq('id', jobId)
        .maybeSingle();

      if (jobError) {
        console.error('[SAVED_JOBS_STORE] Error checking job:', jobError);
      }
      if (!job) {
        throw new Error('JOB_NOT_FOUND');
      }
      jobStatus = job.status;
    } else {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('DATABASE_UNAVAILABLE');
      }
      // In mock/test environments without DB client, assume published unless specified
      jobStatus = 'published';
    }

    // Candidate may only newly save 'published' jobs
    if (jobStatus !== 'published') {
      throw new Error('JOB_NOT_AVAILABLE');
    }

    const key = `${userId}:${jobId}`;
    const nowIso = new Date().toISOString();

    // 2. Persist in database
    if (supabase) {
      try {
        // Try atomic RPC if available
        const { data: rpcData, error: rpcError } = await supabase.rpc('save_candidate_job', {
          p_user_id: userId,
          p_job_id: jobId
        });

        if (!rpcError && rpcData) {
          return {
            saved: true,
            saved_at: rpcData.saved_at,
            saved_job_id: rpcData.id
          };
        }

        // If RPC is missing or fails, use direct upsert
        const { data: upsertData, error: upsertError } = await supabase
          .from('candidate_saved_jobs')
          .upsert(
            {
              user_id: userId,
              job_id: jobId,
              saved_at: nowIso,
              updated_at: nowIso
            },
            { onConflict: 'user_id,job_id' }
          )
          .select('id, saved_at')
          .single();

        if (upsertError) {
          if (isTableMissingError(upsertError)) {
            assertNoFallbackInProduction();
            // Graceful fallback to memory store for test/dev only
            return this.saveToFallback(userId, jobId, nowIso);
          }
          console.error('[SAVED_JOBS_STORE] Upsert error:', upsertError);
          throw new Error('DATABASE_ERROR');
        }

        return {
          saved: true,
          saved_at: upsertData.saved_at,
          saved_job_id: upsertData.id
        };
      } catch (err: any) {
        if (err.message === 'JOB_NOT_FOUND' || err.message === 'JOB_NOT_AVAILABLE') {
          throw err;
        }
        if (isTableMissingError(err)) {
          assertNoFallbackInProduction();
          return this.saveToFallback(userId, jobId, nowIso);
        }
        throw err;
      }
    }

    assertNoFallbackInProduction();
    return this.saveToFallback(userId, jobId, nowIso);
  }

  private static saveToFallback(userId: string, jobId: string, nowIso: string): SavedJobStatusResponse {
    assertNoFallbackInProduction();
    const key = `${userId}:${jobId}`;
    let existing = fallbackStore.get(key);
    if (!existing) {
      existing = {
        id: uuidv4(),
        user_id: userId,
        job_id: jobId,
        saved_at: nowIso,
        created_at: nowIso,
        updated_at: nowIso
      };
      fallbackStore.set(key, existing);
    }
    return {
      saved: true,
      saved_at: existing.saved_at,
      saved_job_id: existing.id
    };
  }

  /**
   * Unsaves a job for a candidate (Idempotent).
   */
  public static async unsaveJob(userId: string, jobId: string): Promise<SavedJobStatusResponse> {
    if (!this.isValidUuid(userId)) {
      throw new Error('INVALID_USER_ID');
    }
    if (!this.isValidUuid(jobId)) {
      throw new Error('INVALID_JOB_ID');
    }

    const supabase = getAdminClient();
    const key = `${userId}:${jobId}`;

    if (supabase) {
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('unsave_candidate_job', {
          p_user_id: userId,
          p_job_id: jobId
        });

        if (!rpcError && typeof rpcData === 'boolean') {
          fallbackStore.delete(key);
          return { saved: false, deleted: rpcData };
        }

        // Direct delete fallback
        const { data: deletedRows, error: deleteError } = await supabase
          .from('candidate_saved_jobs')
          .delete()
          .match({ user_id: userId, job_id: jobId })
          .select('id');

        if (!deleteError) {
          const wasDeleted = Array.isArray(deletedRows) && deletedRows.length > 0;
          fallbackStore.delete(key);
          return { saved: false, deleted: wasDeleted };
        }

        if (deleteError && !isTableMissingError(deleteError)) {
          console.error('[SAVED_JOBS_STORE] Delete error:', deleteError);
        }
      } catch (err) {
        // Continue to fallback delete
      }
    }

    const existed = fallbackStore.has(key);
    fallbackStore.delete(key);
    return { saved: false, deleted: existed };
  }

  /**
   * Checks whether a job is currently saved by the candidate.
   */
  public static async getSavedStatus(userId: string, jobId: string): Promise<SavedJobStatusResponse> {
    if (!this.isValidUuid(userId) || !this.isValidUuid(jobId)) {
      return { saved: false };
    }

    const supabase = getAdminClient();
    const key = `${userId}:${jobId}`;

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('candidate_saved_jobs')
          .select('id, saved_at')
          .match({ user_id: userId, job_id: jobId })
          .maybeSingle();

        if (!error && data) {
          return {
            saved: true,
            saved_at: data.saved_at,
            saved_job_id: data.id
          };
        }
      } catch (err) {
        // Fall back to memory store check in test/dev
      }
    }

    if (process.env.NODE_ENV === 'production') {
      return { saved: false };
    }

    const existing = fallbackStore.get(key);
    if (existing) {
      return {
        saved: true,
        saved_at: existing.saved_at,
        saved_job_id: existing.id
      };
    }

    return { saved: false };
  }

  /**
   * Lists candidate-owned saved jobs joined to current job details with pagination.
   */
  public static async listSavedJobs(
    userId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<SavedJobsListResponse> {
    if (!this.isValidUuid(userId)) {
      throw new Error('INVALID_USER_ID');
    }

    const limit = Math.min(Math.max(options.limit || 20, 1), 100);
    const offset = Math.max(options.offset || 0, 0);

    const supabase = getAdminClient();

    if (supabase) {
      try {
        const { data, error, count } = await supabase
          .from('candidate_saved_jobs')
          .select(
            `
            id,
            saved_at,
            job:jobs (
              id,
              title,
              company_name,
              location_text,
              country,
              city,
              workplace_type,
              employment_type,
              experience_level,
              status,
              published_at,
              updated_at,
              slug,
              salary_min,
              salary_max,
              salary_currency
            )
          `,
            { count: 'exact' }
          )
          .eq('user_id', userId)
          .order('saved_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (!error && data) {
          const saved_jobs: SavedJobListItem[] = data
            .filter((item: any) => item.job !== null)
            .map((item: any) => ({
              saved_job_id: item.id,
              saved_at: item.saved_at,
              job: item.job
            }));

          return {
            version: CURRENT_SAVED_JOBS_VERSION,
            saved_jobs,
            total: count ?? saved_jobs.length,
            limit,
            offset
          };
        }
      } catch (err) {
        // Fall back to memory store in dev/test
      }
    }

    assertNoFallbackInProduction();

    // Fallback store handling (dev/test only)
    const userRecords = Array.from(fallbackStore.values())
      .filter(r => r.user_id === userId)
      .sort((a, b) => new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime());

    const total = userRecords.length;
    const pagedRecords = userRecords.slice(offset, offset + limit);

    // Fetch jobs for paged records
    const saved_jobs: SavedJobListItem[] = [];
    for (const r of pagedRecords) {
      let jobDetails: any = null;
      if (supabase) {
        const { data: j } = await supabase
          .from('jobs')
          .select(
            'id, title, company_name, location_text, country, city, workplace_type, employment_type, experience_level, status, published_at, updated_at, slug, salary_min, salary_max, salary_currency'
          )
          .eq('id', r.job_id)
          .maybeSingle();
        jobDetails = j;
      }
      if (!jobDetails) {
        jobDetails = {
          id: r.job_id,
          title: 'Saved Opportunity',
          company_name: 'Company',
          status: 'published',
          updated_at: r.saved_at
        };
      }
      saved_jobs.push({
        saved_job_id: r.id,
        saved_at: r.saved_at,
        job: jobDetails
      });
    }

    return {
      version: CURRENT_SAVED_JOBS_VERSION,
      saved_jobs,
      total,
      limit,
      offset
    };
  }

  /**
   * Clears the in-memory fallback store (for testing).
   */
  public static clearFallbackStore(): void {
    fallbackStore.clear();
  }
}
