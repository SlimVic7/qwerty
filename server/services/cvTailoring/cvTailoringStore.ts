/**
 * QWERTY Stage 5.2 — CV Tailoring Persistence Store
 * Provides durable Supabase storage with in-memory fallback prior to migration 00012 deployment.
 */

import { getAdminClient } from '../../db/supabase.js';
import { v4 as uuidv4 } from 'uuid';
import { 
  CandidateCvTailoringSession, 
  CURRENT_TAILORING_ENGINE_VERSION 
} from './types.js';
import { CURRENT_JOB_ALIGNMENT_RULESET_VERSION } from '../matching/jobAlignment.js';

const fallbackStore: Map<string, CandidateCvTailoringSession> = new Map();

/**
 * Determines whether in-memory fallback is permitted.
 * STRICT SECURITY PRINCIPLE: Never allowed in production.
 * Must be explicitly enabled via ALLOW_IN_MEMORY_TAILORING_STORE=true or in test runner.
 */
export function isMemoryFallbackAllowed(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  return (
    process.env.ALLOW_IN_MEMORY_TAILORING_STORE === 'true' ||
    process.env.VITEST === 'true' ||
    process.env.NODE_ENV === 'test'
  );
}

function isTableMissingError(error: any): boolean {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  const hint = (error.hint || '').toLowerCase();
  return (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    msg.includes('could not find the table') ||
    msg.includes('relation "public.candidate_cv_tailoring_sessions" does not exist') ||
    hint.includes('perhaps you meant')
  );
}

export class CvTailoringStore {
  /**
   * Diagnostic method to inspect the active store persistence backend.
   */
  public static getStoreBackend(): 'database' | 'memory_fallback' {
    return isMemoryFallbackAllowed() ? 'memory_fallback' : 'database';
  }

  /**
   * Resets in-memory storage (used in test suites).
   */
  public static clearMemoryStore(): void {
    fallbackStore.clear();
  }

  /**
   * Retrieves the latest tailoring session for a candidate and job with drift detection.
   */
  public static async getLatestSession(
    userId: string,
    jobId: string,
    currentJobUpdatedAt?: string,
    candidateLatestAppliedAt?: string
  ): Promise<CandidateCvTailoringSession | null> {
    const supabase = getAdminClient();

    try {
      const { data, error } = await supabase
        .from('candidate_cv_tailoring_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('job_id', jobId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        if (isMemoryFallbackAllowed()) {
          return this.getLatestFromFallback(userId, jobId, currentJobUpdatedAt, candidateLatestAppliedAt);
        }
        console.error('[CvTailoringStore] Database fetch error (fallback disallowed):', error.message);
        return null;
      }

      if (!data) {
        if (isMemoryFallbackAllowed() && fallbackStore.size > 0) {
          return this.getLatestFromFallback(userId, jobId, currentJobUpdatedAt, candidateLatestAppliedAt);
        }
        return null;
      }

      return this.enrichWithDrift(data, currentJobUpdatedAt, candidateLatestAppliedAt);
    } catch (err: any) {
      if (isMemoryFallbackAllowed()) {
        return this.getLatestFromFallback(userId, jobId, currentJobUpdatedAt, candidateLatestAppliedAt);
      }
      console.error('[CvTailoringStore] Database exception (fallback disallowed):', err.message);
      return null;
    }
  }

  /**
   * Checks for an active (pending/preparing/generating) session.
   */
  public static async getActiveSession(
    userId: string,
    jobId: string,
    parseId?: string,
    alignmentId?: string,
    tailoringEngineVersion: string = CURRENT_TAILORING_ENGINE_VERSION
  ): Promise<CandidateCvTailoringSession | null> {
    const supabase = getAdminClient();

    try {
      let query = supabase
        .from('candidate_cv_tailoring_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('job_id', jobId)
        .eq('tailoring_engine_version', tailoringEngineVersion)
        .in('status', ['pending', 'preparing_evidence', 'generating'])
        .limit(1);

      if (parseId) {
        query = query.eq('parse_id', parseId);
      }

      if (alignmentId) {
        query = query.eq('alignment_id', alignmentId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        if (isMemoryFallbackAllowed()) {
          return this.getActiveFromFallback(userId, jobId, parseId, alignmentId, tailoringEngineVersion);
        }
        return null;
      }

      if (!data) {
        if (isMemoryFallbackAllowed() && fallbackStore.size > 0) {
          return this.getActiveFromFallback(userId, jobId, parseId, alignmentId, tailoringEngineVersion);
        }
        return null;
      }
    } catch (err) {
      if (isMemoryFallbackAllowed()) {
        return this.getActiveFromFallback(userId, jobId, parseId, alignmentId, tailoringEngineVersion);
      }
      return null;
    }
  }

  /**
   * Gets a specific session by ID and candidate user ID.
   */
  public static async getSession(
    sessionId: string,
    userId: string,
    currentJobUpdatedAt?: string,
    candidateLatestAppliedAt?: string
  ): Promise<CandidateCvTailoringSession | null> {
    const supabase = getAdminClient();

    try {
      const { data, error } = await supabase
        .from('candidate_cv_tailoring_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (isMemoryFallbackAllowed()) {
          const rec = fallbackStore.get(sessionId);
          if (rec && rec.user_id === userId) {
            return this.enrichWithDrift(rec, currentJobUpdatedAt, candidateLatestAppliedAt);
          }
          return null;
        }
        return null;
      }

      if (!data) {
        if (isMemoryFallbackAllowed() && fallbackStore.size > 0) {
          const rec = fallbackStore.get(sessionId);
          if (rec && rec.user_id === userId) {
            return this.enrichWithDrift(rec, currentJobUpdatedAt, candidateLatestAppliedAt);
          }
        }
        return null;
      }
      return this.enrichWithDrift(data, currentJobUpdatedAt, candidateLatestAppliedAt);
    } catch (err) {
      if (isMemoryFallbackAllowed()) {
        const rec = fallbackStore.get(sessionId);
        if (rec && rec.user_id === userId) {
          return this.enrichWithDrift(rec, currentJobUpdatedAt, candidateLatestAppliedAt);
        }
      }
      return null;
    }
  }

  /**
   * Lists all tailoring sessions for a candidate.
   */
  public static async listForCandidate(userId: string): Promise<CandidateCvTailoringSession[]> {
    const supabase = getAdminClient();

    try {
      const { data, error } = await supabase
        .from('candidate_cv_tailoring_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        if (isTableMissingError(error) && isMemoryFallbackAllowed()) {
          return Array.from(fallbackStore.values())
            .filter(r => r.user_id === userId)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
        return [];
      }

      return data || [];
    } catch (err) {
      if (isMemoryFallbackAllowed()) {
        return Array.from(fallbackStore.values())
          .filter(r => r.user_id === userId)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
      return [];
    }
  }

  /**
   * Creates a new tailoring session record.
   * Fails closed in production if database is unavailable.
   */
  public static async createSession(
    session: Omit<CandidateCvTailoringSession, 'id' | 'created_at' | 'updated_at'>
  ): Promise<CandidateCvTailoringSession> {
    const supabase = getAdminClient();
    const id = uuidv4();
    const now = new Date().toISOString();

    const record: CandidateCvTailoringSession = {
      ...session,
      id,
      created_at: now,
      updated_at: now
    };

    try {
      const { data, error } = await supabase
        .from('candidate_cv_tailoring_sessions')
        .insert({
          id: record.id,
          user_id: record.user_id,
          job_id: record.job_id,
          cv_version_id: record.cv_version_id,
          parse_id: record.parse_id,
          alignment_id: record.alignment_id,
          status: record.status,
          tailoring_status: record.tailoring_status,
          tailoring_engine_version: record.tailoring_engine_version,
          source_alignment_ruleset: record.source_alignment_ruleset,
          job_updated_at: record.job_updated_at,
          candidate_applied_at: record.candidate_applied_at,
          job_title: record.job_title,
          company_name: record.company_name,
          evidence_manifest: record.evidence_manifest,
          tailoring_plan: record.tailoring_plan,
          suggestions: record.suggestions,
          draft_data: record.draft_data,
          validation_results: record.validation_results,
          generation_provider: record.generation_provider,
          generation_model: record.generation_model,
          error_code: record.error_code,
          completed_at: record.completed_at,
          finalized_at: record.finalized_at
        })
        .select('*')
        .single();

      if (error) {
        if (!isMemoryFallbackAllowed()) {
          console.error('[CvTailoringStore] Database persistence error (memory fallback disallowed):', error.message);
          throw new Error(`PERSISTENCE_UNAVAILABLE: Database write failed: ${error.message}`);
        }
        fallbackStore.set(id, record);
        return record;
      }

      return data as CandidateCvTailoringSession;
    } catch (err: any) {
      if (!isMemoryFallbackAllowed()) {
        console.error('[CvTailoringStore] Persistence exception in non-fallback mode:', err.message);
        throw err;
      }
      fallbackStore.set(id, record);
      return record;
    }
  }

  /**
   * Updates an existing session.
   * Fails closed in production if database is unavailable.
   */
  public static async updateSession(
    sessionId: string,
    updates: Partial<CandidateCvTailoringSession>
  ): Promise<CandidateCvTailoringSession | null> {
    const supabase = getAdminClient();
    const now = new Date().toISOString();

    try {
      const { data, error } = await supabase
        .from('candidate_cv_tailoring_sessions')
        .update({
          ...updates,
          updated_at: now
        })
        .eq('id', sessionId)
        .select('*')
        .single();

      if (error) {
        if (!isMemoryFallbackAllowed()) {
          console.error('[CvTailoringStore] Update persistence error (memory fallback disallowed):', error.message);
          throw new Error(`PERSISTENCE_UNAVAILABLE: Database update failed: ${error.message}`);
        }
        return this.updateFallback(sessionId, updates);
      }

      return { ...data, _backend: 'database' as any };
    } catch (err: any) {
      if (!isMemoryFallbackAllowed()) {
        console.error('[CvTailoringStore] Update exception in non-fallback mode:', err.message);
        throw err;
      }
      return this.updateFallback(sessionId, updates);
    }
  }

  private static getLatestFromFallback(
    userId: string,
    jobId: string,
    currentJobUpdatedAt?: string,
    candidateLatestAppliedAt?: string
  ): CandidateCvTailoringSession | null {
    const candidates = Array.from(fallbackStore.values())
      .filter(r => r.user_id === userId && r.job_id === jobId && r.status === 'completed')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (candidates.length === 0) return null;
    return this.enrichWithDrift(candidates[0], currentJobUpdatedAt, candidateLatestAppliedAt);
  }

  private static getActiveFromFallback(
    userId: string,
    jobId: string,
    parseId?: string,
    alignmentId?: string,
    tailoringEngineVersion: string = CURRENT_TAILORING_ENGINE_VERSION
  ): CandidateCvTailoringSession | null {
    return Array.from(fallbackStore.values()).find(r => 
      r.user_id === userId &&
      r.job_id === jobId &&
      r.tailoring_engine_version === tailoringEngineVersion &&
      ['pending', 'preparing_evidence', 'generating'].includes(r.status) &&
      (!parseId || r.parse_id === parseId) &&
      (!alignmentId || r.alignment_id === alignmentId)
    ) || null;
  }

  private static updateFallback(
    sessionId: string,
    updates: Partial<CandidateCvTailoringSession>
  ): CandidateCvTailoringSession | null {
    const existing = fallbackStore.get(sessionId);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString()
    };
    fallbackStore.set(sessionId, updated);
    return updated;
  }

  /**
   * Detects source drift between the original tailoring session and the current job / CV / ruleset state.
   */
  public static enrichWithDrift(
    record: CandidateCvTailoringSession,
    currentJobUpdatedAt?: string,
    candidateLatestAppliedAt?: string,
    currentAlignmentRuleset: string = CURRENT_JOB_ALIGNMENT_RULESET_VERSION
  ): CandidateCvTailoringSession {
    let isJobStale = false;
    let isCvStale = false;
    let isRulesetStale = false;

    if (currentJobUpdatedAt && record.job_updated_at) {
      const jobCurrent = new Date(currentJobUpdatedAt).getTime();
      const jobSnapshot = new Date(record.job_updated_at).getTime();
      if (jobCurrent > jobSnapshot) {
        isJobStale = true;
      }
    }

    if (candidateLatestAppliedAt && record.candidate_applied_at) {
      const cvApplied = new Date(candidateLatestAppliedAt).getTime();
      const sessionAppliedSnapshot = new Date(record.candidate_applied_at).getTime();
      if (cvApplied > sessionAppliedSnapshot) {
        isCvStale = true;
      }
    }

    if (record.source_alignment_ruleset && record.source_alignment_ruleset !== currentAlignmentRuleset) {
      isRulesetStale = true;
    }

    const reasons: string[] = [];
    if (isJobStale) {
      reasons.push('job advertisement has been updated');
    }
    if (isCvStale) {
      reasons.push('your approved profile has been updated');
    }
    if (isRulesetStale) {
      reasons.push('role alignment ruleset has been updated');
    }

    let staleReason: string | undefined = undefined;
    if (reasons.length > 0) {
      staleReason = `${reasons.map((r, i) => i === 0 ? r.charAt(0).toUpperCase() + r.slice(1) : r).join(' and ')} since this tailored CV was generated.`;
    }

    return {
      ...record,
      is_stale: isJobStale || isCvStale || isRulesetStale,
      stale_reason: staleReason
    };
  }
}
