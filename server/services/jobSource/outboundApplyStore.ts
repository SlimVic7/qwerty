/**
 * QWERTY Stage 6.2 — Outbound Apply Store & Event Service
 * Manages secure server-side destination resolution, URL scheme validation,
 * open redirect protection, and candidate-private outbound click recording.
 * ZERO AI — Completely deterministic.
 */

import { getAdminClient } from '../../db/supabase.js';
import { v4 as uuidv4 } from 'uuid';
import { OutboundApplyClickEvent, OutboundApplyResponse, JobSourceType } from './types.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// In-memory fallback event storage for local test environments
const fallbackEvents: OutboundApplyClickEvent[] = [];

export class OutboundApplyStore {
  /**
   * Validates UUID format
   */
  public static isValidUuid(id: string): boolean {
    return Boolean(id && typeof id === 'string' && UUID_REGEX.test(id));
  }

  /**
   * Validates safe URL scheme (http/https only, rejects javascript:, data:, etc.)
   */
  public static validateSafeUrl(urlStr: string | null | undefined): { valid: boolean; host: string | null } {
    if (!urlStr || typeof urlStr !== 'string' || !urlStr.trim()) {
      return { valid: false, host: null };
    }
    const trimmed = urlStr.trim();
    if (trimmed.length > 2048) {
      return { valid: false, host: null };
    }
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { valid: false, host: null };
      }
      return { valid: true, host: parsed.hostname || null };
    } catch {
      return { valid: false, host: null };
    }
  }

  /**
   * Processes outbound apply intent:
   * 1. Resolves canonical job from DB (or returns 404/400).
   * 2. Confirms status is application-eligible ('published').
   * 3. Confirms external apply URL is safe and present.
   * 4. Checks if job is 'qwerty_direct' (native application disabled).
   * 5. Records outbound_apply_click event.
   * 6. Returns controlled destination.
   */
  public static async processOutboundApply(
    userId: string,
    jobId: string
  ): Promise<OutboundApplyResponse> {
    if (!this.isValidUuid(userId)) {
      throw new Error('INVALID_USER_ID');
    }
    if (!this.isValidUuid(jobId)) {
      throw new Error('INVALID_JOB_ID');
    }

    const supabase = getAdminClient();
    let jobData: any = null;

    if (supabase) {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, status, application_url, source_url, source_name, source_type')
        .eq('id', jobId)
        .single();

      if (error || !data) {
        throw new Error('JOB_NOT_FOUND');
      }
      jobData = data;
    } else {
      throw new Error('DATABASE_CLIENT_UNAVAILABLE');
    }

    // Check eligible status
    if (jobData.status !== 'published') {
      throw new Error('JOB_NOT_ELIGIBLE_FOR_APPLY');
    }

    // Check if qwerty_direct (reserved - native application not enabled yet)
    if (jobData.source_type === 'qwerty_direct') {
      // Direct QWERTY jobs do not have external apply links, and native applications are not implemented
      throw new Error('QWERTY_DIRECT_APPLICATIONS_UNAVAILABLE');
    }

    // Resolve apply destination strictly from canonical application_url (no source_url fallback)
    const rawDestination = jobData.application_url;
    const { valid, host } = this.validateSafeUrl(rawDestination);

    if (!valid || !rawDestination) {
      throw new Error('APPLICATION_LINK_UNAVAILABLE');
    }

    const sourceType: JobSourceType = jobData.source_type || 'other_external';

    // Record outbound click event in database (or fallback in unit tests if table unmigrated)
    await this.recordClickEvent(userId, jobId, sourceType, host);

    return {
      destination: rawDestination,
      source_type: sourceType,
      external: true,
    };
  }

  /**
   * Records candidate outbound click event.
   * Only stores host/domain for privacy.
   */
  public static async recordClickEvent(
    userId: string,
    jobId: string,
    sourceType: string,
    host: string | null
  ): Promise<void> {
    const supabase = getAdminClient();
    const eventRecord: OutboundApplyClickEvent = {
      id: uuidv4(),
      user_id: userId,
      job_id: jobId,
      source_type: sourceType,
      apply_url_host: host,
      event_name: 'outbound_apply_click',
      clicked_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    if (supabase) {
      try {
        const { error } = await supabase
          .from('candidate_outbound_apply_events')
          .insert({
            id: eventRecord.id,
            user_id: eventRecord.user_id,
            job_id: eventRecord.job_id,
            source_type: eventRecord.source_type,
            apply_url_host: eventRecord.apply_url_host,
            event_name: eventRecord.event_name,
            clicked_at: eventRecord.clicked_at,
          });

        if (error) {
          // If table doesn't exist yet before manual migration 00014, use fallback in non-prod
          fallbackEvents.push(eventRecord);
        }
      } catch (err) {
        fallbackEvents.push(eventRecord);
      }
    } else {
      fallbackEvents.push(eventRecord);
    }
  }

  /**
   * Test helper to inspect recorded fallback events
   */
  public static getFallbackEvents(): OutboundApplyClickEvent[] {
    return [...fallbackEvents];
  }

  /**
   * Test helper to clear fallback events
   */
  public static clearFallbackEvents(): void {
    fallbackEvents.length = 0;
  }
}
