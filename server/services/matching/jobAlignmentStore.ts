import { getAdminClient } from '../../db/supabase.js';
import { v4 as uuidv4 } from 'uuid';

export interface CandidateJobAlignmentRecord {
  id: string;
  user_id: string;
  cv_version_id: string;
  parse_id: string;
  job_id: string;
  job_updated_at: string;
  candidate_applied_at: string;
  job_title: string;
  company_name: string;
  status: 'pending' | 'processing_rules' | 'completed' | 'failed';
  explanation_status: 'not_started' | 'processing' | 'completed' | 'failed';
  ruleset_version: string;
  score?: number;
  max_score?: number;
  raw_score?: number;
  raw_max_score?: number;
  component_results?: any;
  criteria_breakdown?: any;
  explanation?: any;
  ai_provider?: string;
  ai_model?: string;
  error_code?: string;
  explanation_error_code?: string;
  created_at: string;
  completed_at?: string;
  is_stale?: boolean;
  stale_reason?: string;
}

// In-memory fallback store when migration 00011 has not been applied to Supabase yet
const fallbackStore: Map<string, CandidateJobAlignmentRecord> = new Map();

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
    msg.includes('relation "public.candidate_job_alignments" does not exist') ||
    hint.includes('perhaps you meant')
  );
}

export class JobAlignmentStore {
  /**
   * Retrieves the latest completed alignment for a candidate and job, computing drift.
   */
  public static async getLatestAlignment(
    userId: string,
    jobId: string,
    currentJobUpdatedAt?: string,
    candidateLatestAppliedAt?: string
  ): Promise<CandidateJobAlignmentRecord | null> {
    const supabase = getAdminClient();

    try {
      const { data, error } = await supabase
        .from('candidate_job_alignments')
        .select('*')
        .eq('user_id', userId)
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        if (isTableMissingError(error)) {
          return this.getLatestFromFallback(userId, jobId, currentJobUpdatedAt, candidateLatestAppliedAt);
        }
        console.error('[JobAlignmentStore] Error fetching alignment:', error);
        return null;
      }

      if (!data) return null;

      return this.enrichWithDrift(data, currentJobUpdatedAt, candidateLatestAppliedAt);
    } catch (err) {
      return this.getLatestFromFallback(userId, jobId, currentJobUpdatedAt, candidateLatestAppliedAt);
    }
  }

  /**
   * Retrieves the latest completed alignment matching candidate, job, parse, specific ruleset version,
   * and exact current source markers (job_updated_at, candidate_applied_at).
   */
  public static async getCompletedAlignment(
    userId: string,
    jobId: string,
    parseId: string,
    rulesetVersion: string,
    jobUpdatedAt?: string,
    candidateAppliedAt?: string
  ): Promise<CandidateJobAlignmentRecord | null> {
    const supabase = getAdminClient();

    try {
      let query = supabase
        .from('candidate_job_alignments')
        .select('*')
        .eq('user_id', userId)
        .eq('job_id', jobId)
        .eq('parse_id', parseId)
        .eq('ruleset_version', rulesetVersion)
        .eq('status', 'completed');

      if (jobUpdatedAt) {
        query = query.eq('job_updated_at', jobUpdatedAt);
      }
      if (candidateAppliedAt) {
        query = query.eq('candidate_applied_at', candidateAppliedAt);
      }

      const { data, error } = await query
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        if (isTableMissingError(error)) {
          for (const item of Array.from(fallbackStore.values()).reverse()) {
            const jobMatch = !jobUpdatedAt ||
              item.job_updated_at === jobUpdatedAt ||
              new Date(item.job_updated_at).getTime() === new Date(jobUpdatedAt).getTime();
            const cvMatch = !candidateAppliedAt ||
              item.candidate_applied_at === candidateAppliedAt ||
              new Date(item.candidate_applied_at).getTime() === new Date(candidateAppliedAt).getTime();

            if (
              item.user_id === userId &&
              item.job_id === jobId &&
              item.parse_id === parseId &&
              item.ruleset_version === rulesetVersion &&
              item.status === 'completed' &&
              jobMatch &&
              cvMatch
            ) {
              return item;
            }
          }
          return null;
        }
        console.error('[JobAlignmentStore] Error fetching completed alignment:', error);
        return null;
      }

      return data || null;
    } catch (err) {
      for (const item of Array.from(fallbackStore.values()).reverse()) {
        const jobMatch = !jobUpdatedAt ||
          item.job_updated_at === jobUpdatedAt ||
          new Date(item.job_updated_at).getTime() === new Date(jobUpdatedAt).getTime();
        const cvMatch = !candidateAppliedAt ||
          item.candidate_applied_at === candidateAppliedAt ||
          new Date(item.candidate_applied_at).getTime() === new Date(candidateAppliedAt).getTime();

        if (
          item.user_id === userId &&
          item.job_id === jobId &&
          item.parse_id === parseId &&
          item.ruleset_version === rulesetVersion &&
          item.status === 'completed' &&
          jobMatch &&
          cvMatch
        ) {
          return item;
        }
      }
      return null;
    }
  }

  /**
   * Checks if an active (pending/processing) alignment is currently running.
   */
  public static async getActiveAlignment(
    userId: string,
    jobId: string,
    parseId?: string,
    rulesetVersion?: string
  ): Promise<CandidateJobAlignmentRecord | null> {
    const supabase = getAdminClient();

    try {
      let query = supabase
        .from('candidate_job_alignments')
        .select('*')
        .eq('user_id', userId)
        .eq('job_id', jobId)
        .in('status', ['pending', 'processing_rules']);

      if (parseId) {
        query = query.eq('parse_id', parseId);
      }
      if (rulesetVersion) {
        query = query.eq('ruleset_version', rulesetVersion);
      }

      const { data, error } = await query.limit(1).maybeSingle();

      if (error) {
        if (isTableMissingError(error)) {
          for (const item of fallbackStore.values()) {
            if (
              item.user_id === userId &&
              item.job_id === jobId &&
              (!parseId || item.parse_id === parseId) &&
              (!rulesetVersion || item.ruleset_version === rulesetVersion) &&
              (item.status === 'pending' || item.status === 'processing_rules')
            ) {
              return item;
            }
          }
          return null;
        }
        return null;
      }

      return data || null;
    } catch (err) {
      return null;
    }
  }

  /**
   * Inserts a new alignment record.
   */
  public static async createAlignment(
    record: Omit<CandidateJobAlignmentRecord, 'id' | 'created_at'>
  ): Promise<CandidateJobAlignmentRecord> {
    const supabase = getAdminClient();
    const id = uuidv4();
    const now = new Date().toISOString();

    const fullRecord: CandidateJobAlignmentRecord = {
      ...record,
      id,
      created_at: now
    };

    try {
      const { data, error } = await supabase
        .from('candidate_job_alignments')
        .insert(fullRecord)
        .select()
        .single();

      if (error) {
        if (process.env.NODE_ENV !== 'production' && isTableMissingError(error)) {
          fallbackStore.set(id, fullRecord);
          return fullRecord;
        }
        console.error('[JobAlignmentStore] Database insert error:', error);
        throw new Error(`PERSISTENCE_FAILURE: ${error.message}`);
      }

      return data;
    } catch (err: any) {
      if (process.env.NODE_ENV !== 'production' && isTableMissingError(err)) {
        fallbackStore.set(id, fullRecord);
        return fullRecord;
      }
      throw err;
    }
  }

  /**
   * Updates an existing alignment record.
   */
  public static async updateAlignment(
    id: string,
    updates: Partial<CandidateJobAlignmentRecord>
  ): Promise<CandidateJobAlignmentRecord | null> {
    const supabase = getAdminClient();

    try {
      const { data, error } = await supabase
        .from('candidate_job_alignments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (process.env.NODE_ENV !== 'production' && isTableMissingError(error)) {
          return this.updateFallback(id, updates);
        }
        console.error('[JobAlignmentStore] Database update error:', error);
        throw new Error(`PERSISTENCE_FAILURE: ${error.message}`);
      }

      return data;
    } catch (err: any) {
      if (process.env.NODE_ENV !== 'production' && isTableMissingError(err)) {
        return this.updateFallback(id, updates);
      }
      throw err;
    }
  }

  /**
   * Lists completed alignment history for a given candidate and job.
   */
  public static async listHistoryForCandidateAndJob(
    userId: string,
    jobId: string,
    limit: number = 20
  ): Promise<CandidateJobAlignmentRecord[]> {
    const supabase = getAdminClient();
    const boundedLimit = Math.min(Math.max(limit, 1), 100);

    try {
      const { data, error } = await supabase
        .from('candidate_job_alignments')
        .select('*')
        .eq('user_id', userId)
        .eq('job_id', jobId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(boundedLimit);

      if (error) {
        if (isTableMissingError(error)) {
          return Array.from(fallbackStore.values())
            .filter(r => r.user_id === userId && r.job_id === jobId && r.status === 'completed')
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, boundedLimit);
        }
        return [];
      }

      return data || [];
    } catch (err) {
      return Array.from(fallbackStore.values())
        .filter(r => r.user_id === userId && r.job_id === jobId && r.status === 'completed')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, boundedLimit);
    }
  }

  /**
   * Retrieves an alignment record by its ID.
   */
  public static async getAlignmentById(id: string): Promise<CandidateJobAlignmentRecord | null> {
    const supabase = getAdminClient();

    try {
      const { data, error } = await supabase
        .from('candidate_job_alignments')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        if (isTableMissingError(error)) {
          return fallbackStore.get(id) || null;
        }
        return null;
      }

      return data || null;
    } catch (err) {
      return fallbackStore.get(id) || null;
    }
  }

  /**
   * Lists all alignments for a given candidate.
   */
  public static async listForCandidate(userId: string): Promise<CandidateJobAlignmentRecord[]> {
    const supabase = getAdminClient();

    try {
      const { data, error } = await supabase
        .from('candidate_job_alignments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        if (isTableMissingError(error)) {
          return Array.from(fallbackStore.values())
            .filter(r => r.user_id === userId)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
        return [];
      }

      return data || [];
    } catch (err) {
      return Array.from(fallbackStore.values())
        .filter(r => r.user_id === userId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  }

  private static getLatestFromFallback(
    userId: string,
    jobId: string,
    currentJobUpdatedAt?: string,
    candidateLatestAppliedAt?: string
  ): CandidateJobAlignmentRecord | null {
    const matches = Array.from(fallbackStore.values())
      .filter(r => r.user_id === userId && r.job_id === jobId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (matches.length === 0) return null;
    return this.enrichWithDrift(matches[0], currentJobUpdatedAt, candidateLatestAppliedAt);
  }

  private static updateFallback(
    id: string,
    updates: Partial<CandidateJobAlignmentRecord>
  ): CandidateJobAlignmentRecord | null {
    const existing = fallbackStore.get(id);
    if (!existing) return null;

    const updated = { ...existing, ...updates };
    fallbackStore.set(id, updated);
    return updated;
  }

  /**
   * Detects source drift between the original analysis and the current job / CV state.
   */
  private static enrichWithDrift(
    record: CandidateJobAlignmentRecord,
    currentJobUpdatedAt?: string,
    candidateLatestAppliedAt?: string
  ): CandidateJobAlignmentRecord {
    let isStale = false;
    let staleReason = '';

    if (currentJobUpdatedAt && record.job_updated_at) {
      const jobCurrent = new Date(currentJobUpdatedAt).getTime();
      const jobSnapshot = new Date(record.job_updated_at).getTime();
      if (jobCurrent > jobSnapshot) {
        isStale = true;
        staleReason = 'Job advertisement has been updated since this analysis.';
      }
    }

    if (candidateLatestAppliedAt && record.created_at) {
      const cvApplied = new Date(candidateLatestAppliedAt).getTime();
      const analysisCreated = new Date(record.created_at).getTime();
      if (cvApplied > analysisCreated) {
        isStale = true;
        staleReason = isStale
          ? 'Both the job advert and your approved profile have been updated since this analysis.'
          : 'Your approved profile has been updated since this analysis.';
      }
    }

    return {
      ...record,
      is_stale: isStale,
      stale_reason: staleReason || undefined
    };
  }
}
