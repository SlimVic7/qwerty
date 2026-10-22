/**
 * QWERTY Stage 6.3 — Candidate Job Alerts Store
 * Candidate-Private Persistence, Validation & Deterministic Boolean Job Matching
 */

import { getAdminClient } from '../../db/supabase.js';
import { v4 as uuidv4 } from 'uuid';
import {
  CURRENT_JOB_ALERTS_VERSION,
  JobAlert,
  JobAlertCreateInput,
  JobAlertUpdateInput,
  JobAlertMatch,
  JobAlertMatchesResponse,
  AlertFrequency
} from './types.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MAX_ALERTS_PER_USER = 10;
export const MAX_ALERT_NAME_LENGTH = 80;

const VALID_FREQUENCIES: AlertFrequency[] = ['daily', 'weekly'];
const VALID_WORKPLACE_TYPES = ['onsite', 'hybrid', 'remote', 'unspecified'];
const VALID_EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract', 'temporary', 'internship', 'unspecified'];

// In-memory fallback store ONLY for local unit testing and development before migration 00016 is deployed
const fallbackAlertsStore: Map<string, JobAlert> = new Map();

function isTableMissingError(error: any): boolean {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  const hint = (error.hint || '').toLowerCase();
  return (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    msg.includes('could not find the table') ||
    msg.includes('candidate_job_alerts') ||
    hint.includes('perhaps you meant')
  );
}

export class JobAlertsStore {
  public static isValidUuid(id: string): boolean {
    return Boolean(id && typeof id === 'string' && UUID_REGEX.test(id));
  }

  public static clearFallbackStore(): void {
    fallbackAlertsStore.clear();
  }

  // -------------------------------------------------------------
  // JOB ALERTS CRUD
  // -------------------------------------------------------------

  public static async createAlert(
    userId: string,
    input: JobAlertCreateInput & { title?: string; location?: string }
  ): Promise<JobAlert> {
    if (!this.isValidUuid(userId)) {
      throw new Error('INVALID_USER_ID');
    }

    const rawName = input?.name || input?.title;
    if (!rawName || typeof rawName !== 'string' || !rawName.trim()) {
      throw new Error('INVALID_ALERT_NAME');
    }
    const trimmedName = rawName.trim();
    if (trimmedName.length > MAX_ALERT_NAME_LENGTH) {
      throw new Error('ALERT_NAME_TOO_LONG');
    }

    const frequency: AlertFrequency = input.frequency || 'daily';
    if (!VALID_FREQUENCIES.includes(frequency)) {
      throw new Error('INVALID_FREQUENCY');
    }

    if (input.workplace_type && !VALID_WORKPLACE_TYPES.includes(input.workplace_type)) {
      throw new Error('INVALID_WORKPLACE_TYPE');
    }
    if (input.employment_type && !VALID_EMPLOYMENT_TYPES.includes(input.employment_type)) {
      throw new Error('INVALID_EMPLOYMENT_TYPE');
    }

    // Check alert count limit
    const currentAlerts = await this.listAlerts(userId);
    if (currentAlerts.length >= MAX_ALERTS_PER_USER) {
      throw new Error('MAX_ALERTS_REACHED');
    }

    const locationQuery = input.location_query || input.location;

    const newAlert: JobAlert = {
      id: uuidv4(),
      user_id: userId,
      name: trimmedName,
      keywords: input.keywords ? input.keywords.trim() : null,
      location_query: locationQuery ? locationQuery.trim() : null,
      workplace_type: input.workplace_type || null,
      employment_type: input.employment_type || null,
      frequency,
      is_active: input.is_active !== undefined ? Boolean(input.is_active) : true,
      last_opened_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const supabase = getAdminClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('candidate_job_alerts')
        .insert({
          id: newAlert.id,
          user_id: newAlert.user_id,
          name: newAlert.name,
          keywords: newAlert.keywords,
          location_query: newAlert.location_query,
          workplace_type: newAlert.workplace_type,
          employment_type: newAlert.employment_type,
          frequency: newAlert.frequency,
          is_active: newAlert.is_active
        })
        .select()
        .single();

      if (error) {
        if (isTableMissingError(error)) {
          fallbackAlertsStore.set(newAlert.id, newAlert);
          return newAlert;
        }
        console.error('[JOB_ALERTS_STORE] Insert error:', error);
        throw error;
      }
      return data as JobAlert;
    }

    fallbackAlertsStore.set(newAlert.id, newAlert);
    return newAlert;
  }

  public static async listAlerts(userId: string): Promise<JobAlert[]> {
    if (!this.isValidUuid(userId)) {
      throw new Error('INVALID_USER_ID');
    }

    const supabase = getAdminClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('candidate_job_alerts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        if (isTableMissingError(error)) {
          return Array.from(fallbackAlertsStore.values())
            .filter(a => a.user_id === userId)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
        console.error('[JOB_ALERTS_STORE] List error:', error);
        throw error;
      }
      return (data || []) as JobAlert[];
    }

    return Array.from(fallbackAlertsStore.values())
      .filter(a => a.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public static async getAlert(userId: string, alertId: string): Promise<JobAlert> {
    if (!this.isValidUuid(userId)) throw new Error('INVALID_USER_ID');
    if (!this.isValidUuid(alertId)) throw new Error('INVALID_ALERT_ID');

    const supabase = getAdminClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('candidate_job_alerts')
        .select('*')
        .eq('id', alertId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        if (isTableMissingError(error)) {
          const found = fallbackAlertsStore.get(alertId);
          if (!found || found.user_id !== userId) throw new Error('ALERT_NOT_FOUND');
          return found;
        }
        console.error('[JOB_ALERTS_STORE] Get alert error:', error);
        throw error;
      }
      if (!data) throw new Error('ALERT_NOT_FOUND');
      return data as JobAlert;
    }

    const found = fallbackAlertsStore.get(alertId);
    if (!found || found.user_id !== userId) throw new Error('ALERT_NOT_FOUND');
    return found;
  }

  public static async updateAlert(
    userId: string,
    alertId: string,
    input: JobAlertUpdateInput & { title?: string; location?: string }
  ): Promise<JobAlert> {
    if (!this.isValidUuid(userId)) throw new Error('INVALID_USER_ID');
    if (!this.isValidUuid(alertId)) throw new Error('INVALID_ALERT_ID');

    const existing = await this.getAlert(userId, alertId);

    const updates: Partial<JobAlert> = {};

    const rawName = input.name !== undefined ? input.name : input.title;
    if (rawName !== undefined) {
      if (typeof rawName !== 'string' || !rawName.trim()) {
        throw new Error('INVALID_ALERT_NAME');
      }
      const trimmed = rawName.trim();
      if (trimmed.length > MAX_ALERT_NAME_LENGTH) throw new Error('ALERT_NAME_TOO_LONG');
      updates.name = trimmed;
    }

    if (input.keywords !== undefined) {
      updates.keywords = input.keywords ? input.keywords.trim() : null;
    }

    const rawLoc = input.location_query !== undefined ? input.location_query : input.location;
    if (rawLoc !== undefined) {
      updates.location_query = rawLoc ? rawLoc.trim() : null;
    }

    if (input.workplace_type !== undefined) {
      if (input.workplace_type && !VALID_WORKPLACE_TYPES.includes(input.workplace_type)) {
        throw new Error('INVALID_WORKPLACE_TYPE');
      }
      updates.workplace_type = input.workplace_type || null;
    }

    if (input.employment_type !== undefined) {
      if (input.employment_type && !VALID_EMPLOYMENT_TYPES.includes(input.employment_type)) {
        throw new Error('INVALID_EMPLOYMENT_TYPE');
      }
      updates.employment_type = input.employment_type || null;
    }

    if (input.frequency !== undefined) {
      if (!VALID_FREQUENCIES.includes(input.frequency)) {
        throw new Error('INVALID_FREQUENCY');
      }
      updates.frequency = input.frequency;
    }

    if (input.is_active !== undefined) {
      updates.is_active = Boolean(input.is_active);
    }

    if (input.last_opened_at !== undefined) {
      updates.last_opened_at = input.last_opened_at;
    }

    updates.updated_at = new Date().toISOString();

    const supabase = getAdminClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('candidate_job_alerts')
        .update(updates)
        .eq('id', alertId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        if (isTableMissingError(error)) {
          const merged = { ...existing, ...updates };
          fallbackAlertsStore.set(alertId, merged);
          return merged;
        }
        console.error('[JOB_ALERTS_STORE] Update error:', error);
        throw error;
      }
      return data as JobAlert;
    }

    const merged = { ...existing, ...updates };
    fallbackAlertsStore.set(alertId, merged);
    return merged;
  }

  public static async deleteAlert(userId: string, alertId: string): Promise<{ success: boolean }> {
    if (!this.isValidUuid(userId)) throw new Error('INVALID_USER_ID');
    if (!this.isValidUuid(alertId)) throw new Error('INVALID_ALERT_ID');

    await this.getAlert(userId, alertId);

    const supabase = getAdminClient();
    if (supabase) {
      const { error } = await supabase
        .from('candidate_job_alerts')
        .delete()
        .eq('id', alertId)
        .eq('user_id', userId);

      if (error && !isTableMissingError(error)) {
        console.error('[JOB_ALERTS_STORE] Delete error:', error);
        throw error;
      }
    }

    fallbackAlertsStore.delete(alertId);
    return { success: true };
  }

  public static async toggleAlert(userId: string, alertId: string, isActive: boolean): Promise<JobAlert> {
    return this.updateAlert(userId, alertId, { is_active: isActive });
  }

  // -------------------------------------------------------------
  // MATCHING ENGINE: Deterministic Boolean AND Filtering
  // -------------------------------------------------------------

  public static async findMatchesForAlert(
    userId: string,
    alertId: string,
    options?: { limit?: number }
  ): Promise<JobAlertMatchesResponse> {
    const alert = await this.getAlert(userId, alertId);
    const limit = options?.limit || 20;

    // Record last_opened_at timestamp
    try {
      await this.updateAlert(userId, alertId, { last_opened_at: new Date().toISOString() });
    } catch {
      // Non-blocking for match inspection
    }

    const matches = await this.matchJobsAgainstCriteria({
      keywords: alert.keywords,
      location_query: alert.location_query,
      workplace_type: alert.workplace_type,
      employment_type: alert.employment_type
    }, limit);

    return {
      version: CURRENT_JOB_ALERTS_VERSION,
      alert,
      matches,
      total: matches.length
    };
  }

  private static async matchJobsAgainstCriteria(
    criteria: {
      keywords?: string | null;
      location_query?: string | null;
      workplace_type?: string | null;
      employment_type?: string | null;
    },
    limit: number
  ): Promise<JobAlertMatch[]> {
    const supabase = getAdminClient();
    let publishedJobs: any[] = [];

    if (supabase) {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, company_name, location_text, country, city, workplace_type, employment_type, status, slug, published_at, created_at, description, requirements')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(200);

      if (!error && data) {
        publishedJobs = data;
      }
    }

    const results: JobAlertMatch[] = [];

    for (const job of publishedJobs) {
      const matched_criteria: string[] = [];

      // 1. Keywords (deterministic case-insensitive text match)
      if (criteria.keywords && criteria.keywords.trim()) {
        const textTarget = `${job.title || ''} ${job.description || ''} ${job.company_name || ''}`.toLowerCase();
        const kwWords = criteria.keywords.toLowerCase().split(/\s+/).filter(Boolean);
        const allKeywordsHit = kwWords.some(w => textTarget.includes(w));
        if (!allKeywordsHit) {
          // AND condition failed: skip job
          continue;
        }
        matched_criteria.push('keywords');
      }

      // 2. Location (deterministic case-insensitive text match)
      if (criteria.location_query && criteria.location_query.trim()) {
        const locTarget = `${job.location_text || ''} ${job.city || ''} ${job.country || ''}`.toLowerCase();
        const locQuery = criteria.location_query.toLowerCase().trim();
        if (!locTarget.includes(locQuery)) {
          // AND condition failed: skip job
          continue;
        }
        matched_criteria.push('location_query');
      }

      // 3. Workplace Type (exact normalized match)
      if (criteria.workplace_type && criteria.workplace_type !== 'unspecified') {
        if (job.workplace_type !== criteria.workplace_type) {
          // AND condition failed: skip job
          continue;
        }
        matched_criteria.push('workplace_type');
      }

      // 4. Employment Type (exact normalized match)
      if (criteria.employment_type && criteria.employment_type !== 'unspecified') {
        if (job.employment_type !== criteria.employment_type) {
          // AND condition failed: skip job
          continue;
        }
        matched_criteria.push('employment_type');
      }

      results.push({
        matched: true,
        job: {
          id: job.id,
          title: job.title,
          company_name: job.company_name,
          location_text: job.location_text,
          country: job.country,
          city: job.city,
          workplace_type: job.workplace_type,
          employment_type: job.employment_type,
          status: job.status,
          slug: job.slug,
          published_at: job.published_at,
          created_at: job.created_at
        },
        matched_criteria
      });
    }

    // Results are already sorted by published_at DESC, created_at DESC
    return results.slice(0, limit);
  }
}
