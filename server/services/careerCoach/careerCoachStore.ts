import { getAdminClient } from '../../db/supabase.js';
import { v4 as uuidv4 } from 'uuid';

export interface CoachThread {
  id: string;
  user_id: string;
  career_role_id?: string | null;
  title: string;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}
export interface CoachMessage {
  id: string;
  thread_id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system_event';
  content: string;
  grounding_metadata: Record<string, any>;
  created_at: string;
}
export interface CoachJob {
  id: string;
  user_id: string;
  thread_id: string;
  user_message_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed_retryable' | 'failed_permanent';
  attempt_count: number;
  provider: string;
  model: string;
  error_code?: string | null;
  available_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}
export interface CandidateNotification {
  id: string;
  user_id: string;
  type: 'career_coach_response' | 'cv_parse_complete' | 'job_alert' | 'system';
  title: string;
  message: string;
  link_url?: string | null;
  is_read: boolean;
  created_at: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function throwOnDatabaseError(error: any, operation: string): void {
  if (error) {
    const failure = new Error(`Career Coach database operation failed (${operation}): ${error.message || 'unknown database error'}`);
    (failure as Error & { cause?: unknown }).cause = error;
    throw failure;
  }
}
function requirePersistedRow<T>(data: T | null | undefined, operation: string): T {
  if (!data) throw new Error(`Career Coach database operation returned no persisted row (${operation})`);
  return data;
}

export class CareerCoachStore {
  private static queueClient() {
    const client = getAdminClient();
    if (!client) throw new Error('Career Coach database client is not configured');
    return client;
  }

  /** PostgreSQL compare-and-set claim. A missing returned row means no claim. */
  static async claimQueuedJob(jobId: string): Promise<CoachJob | null> {
    const now = new Date().toISOString();
    const { data, error } = await this.queueClient().from('candidate_career_coach_jobs')
      .update({ status: 'processing', started_at: now, updated_at: now })
      .eq('id', jobId).eq('status', 'queued').lte('available_at', now).select('*').maybeSingle();
    throwOnDatabaseError(error, 'atomic queued job claim');
    return (data as CoachJob | null) || null;
  }

  static async listEligibleQueuedJobs(limit: number): Promise<Array<Pick<CoachJob, 'id'>>> {
    const now = new Date().toISOString();
    const { data, error } = await this.queueClient().from('candidate_career_coach_jobs')
      .select('id').eq('status', 'queued').lte('available_at', now).order('created_at', { ascending: true }).limit(limit);
    throwOnDatabaseError(error, 'list eligible queued jobs');
    return (data || []) as Array<Pick<CoachJob, 'id'>>;
  }

  /** Requeue due retryable rows conditionally; normal queued -> processing claim follows. */
  static async requeueDueRetryableJobs(maxAttempts: number, limit: number): Promise<number> {
    const now = new Date().toISOString();
    const { data, error } = await this.queueClient().from('candidate_career_coach_jobs')
      .select('id').eq('status', 'failed_retryable').lte('available_at', now)
      .lt('attempt_count', maxAttempts).order('available_at', { ascending: true }).limit(limit);
    throwOnDatabaseError(error, 'list due retryable jobs');
    let count = 0;
    for (const candidate of data || []) {
      const { data: updated, error: updateError } = await this.queueClient().from('candidate_career_coach_jobs')
        .update({ status: 'queued', started_at: null, updated_at: now })
        .eq('id', candidate.id).eq('status', 'failed_retryable').lte('available_at', now)
        .lt('attempt_count', maxAttempts).select('id').maybeSingle();
      throwOnDatabaseError(updateError, 'requeue due retryable job');
      if (updated) count += 1;
    }
    return count;
  }

  static async getNextRetryableAvailableAt(maxAttempts: number): Promise<string | null> {
    const { data, error } = await this.queueClient().from('candidate_career_coach_jobs')
      .select('available_at').eq('status', 'failed_retryable').lt('attempt_count', maxAttempts)
      .order('available_at', { ascending: true }).limit(1).maybeSingle();
    throwOnDatabaseError(error, 'get next retry availability');
    return data?.available_at || null;
  }

  /** Recover stale processing rows idempotently while counting lost attempts against the retry cap. */
  static async recoverStaleProcessingJobs(cutoffIso: string, maxAttempts: number): Promise<number> {
    const { data, error } = await this.queueClient().from('candidate_career_coach_jobs')
      .select('id, attempt_count').eq('status', 'processing').lte('started_at', cutoffIso);
    throwOnDatabaseError(error, 'list stale processing jobs');
    let recovered = 0;
    for (const candidate of data || []) {
      const nextAttempt = Number(candidate.attempt_count || 0) + 1;
      const now = new Date().toISOString();
      const terminal = nextAttempt >= maxAttempts;
      const { data: updated, error: updateError } = await this.queueClient().from('candidate_career_coach_jobs')
        .update({
          status: terminal ? 'failed_permanent' : 'queued',
          attempt_count: nextAttempt,
          started_at: null,
          available_at: now,
          error_code: terminal ? 'STALE_WORKER_ATTEMPT_LIMIT' : 'STALE_WORKER_RECOVERED',
          updated_at: now
        })
        .eq('id', candidate.id).eq('status', 'processing')
        .eq('attempt_count', Number(candidate.attempt_count || 0))
        .lte('started_at', cutoffIso).select('id').maybeSingle();
      throwOnDatabaseError(updateError, 'recover stale processing job');
      if (updated) recovered += 1;
    }
    return recovered;
  }

  static async getAssistantResponseForJob(jobId: string, userId: string): Promise<CoachMessage | null> {
    const { data, error } = await this.queueClient().from('candidate_career_coach_messages')
      .select('*').eq('user_id', userId).eq('role', 'assistant')
      .contains('grounding_metadata', { job_id: jobId }).maybeSingle();
    throwOnDatabaseError(error, 'find persisted assistant response');
    return (data as CoachMessage | null) || null;
  }

  static async getNotificationForJob(userId: string, jobId: string, threadId: string): Promise<CandidateNotification | null> {
    const { data, error } = await this.queueClient().from('candidate_notifications')
      .select('*').eq('user_id', userId)
      .eq('link_url', `/candidate/career/coach?threadId=${threadId}&jobId=${jobId}`).maybeSingle();
    throwOnDatabaseError(error, 'find completion notification');
    return (data as CandidateNotification | null) || null;
  }

  static async markJobRetryable(jobId: string, attempts: number, availableAt: string, errorCode: string): Promise<CoachJob> {
    const now = new Date().toISOString();
    const { data, error } = await this.queueClient().from('candidate_career_coach_jobs')
      .update({ status: 'failed_retryable', attempt_count: attempts, available_at: availableAt, error_code: errorCode, started_at: null, updated_at: now })
      .eq('id', jobId).eq('status', 'processing').select('*').maybeSingle();
    throwOnDatabaseError(error, 'mark job retryable');
    return requirePersistedRow(data as CoachJob | null, 'mark job retryable');
  }

  static async markJobFailedPermanent(jobId: string, attempts: number, errorCode: string): Promise<CoachJob> {
    const now = new Date().toISOString();
    const { data, error } = await this.queueClient().from('candidate_career_coach_jobs')
      .update({ status: 'failed_permanent', attempt_count: attempts, error_code: errorCode, started_at: null, updated_at: now })
      .eq('id', jobId).eq('status', 'processing').select('*').maybeSingle();
    throwOnDatabaseError(error, 'mark job permanently failed');
    return requirePersistedRow(data as CoachJob | null, 'mark job permanently failed');
  }

  static async markJobCompleted(jobId: string, completedAt: string): Promise<CoachJob | null> {
    const { data, error } = await this.queueClient().from('candidate_career_coach_jobs')
      .update({ status: 'completed', completed_at: completedAt, updated_at: completedAt, error_code: null })
      .eq('id', jobId).eq('status', 'processing').select('*').maybeSingle();
    throwOnDatabaseError(error, 'mark job completed');
    return (data as CoachJob | null) || null;
  }

  static async getThreads(userId: string): Promise<CoachThread[]> {
    const { data, error } = await getAdminClient().from('candidate_career_coach_threads')
      .select('*').eq('user_id', userId).eq('status', 'active').order('updated_at', { ascending: false });
    throwOnDatabaseError(error, 'get threads');
    return (data || []) as CoachThread[];
  }

  static async getThreadById(threadId: string, userId: string): Promise<CoachThread | null> {
    if (!UUID_REGEX.test(threadId)) return null;
    const { data, error } = await getAdminClient().from('candidate_career_coach_threads')
      .select('*').eq('id', threadId).eq('user_id', userId).maybeSingle();
    throwOnDatabaseError(error, 'get thread');
    return (data as CoachThread | null) || null;
  }

  static async createThread(userId: string, careerRoleId?: string | null, title?: string): Promise<CoachThread> {
    const { data, error } = await getAdminClient().from('candidate_career_coach_threads').insert({
      id: uuidv4(), user_id: userId, career_role_id: careerRoleId || null,
      title: title || 'Career Coaching Session', status: 'active'
    }).select('*').single();
    throwOnDatabaseError(error, 'create thread');
    return requirePersistedRow(data as CoachThread | null, 'create thread');
  }

  static async getMessages(threadId: string, userId: string): Promise<CoachMessage[]> {
    const thread = await this.getThreadById(threadId, userId);
    if (!thread) return [];
    const { data, error } = await getAdminClient().from('candidate_career_coach_messages')
      .select('*').eq('thread_id', threadId).eq('user_id', userId).order('created_at', { ascending: true });
    throwOnDatabaseError(error, 'get messages');
    return (data || []) as CoachMessage[];
  }

  static async addMessage(threadId: string, userId: string, role: 'user' | 'assistant' | 'system_event',
    content: string, groundingMetadata: Record<string, any> = {}): Promise<CoachMessage> {
    if (!UUID_REGEX.test(threadId)) throw new Error('Invalid Career Coach thread UUID');
    const supabase = getAdminClient();
    const now = new Date().toISOString();
    const { data, error } = await supabase.from('candidate_career_coach_messages').insert({
      id: uuidv4(), thread_id: threadId, user_id: userId, role, content, grounding_metadata: groundingMetadata
    }).select('*').single();
    throwOnDatabaseError(error, 'create message');
    const message = requirePersistedRow(data as CoachMessage | null, 'create message');
    const { error: updateError } = await supabase.from('candidate_career_coach_threads')
      .update({ updated_at: now }).eq('id', threadId).eq('user_id', userId);
    throwOnDatabaseError(updateError, 'update thread timestamp');
    return message;
  }

  static async createJob(userId: string, threadId: string, userMessageId: string): Promise<CoachJob> {
    const { data, error } = await getAdminClient().from('candidate_career_coach_jobs').insert({
      id: uuidv4(), user_id: userId, thread_id: threadId, user_message_id: userMessageId,
      status: 'queued', provider: 'gemini', model: 'gemini-2.5-flash'
    }).select('*').single();
    throwOnDatabaseError(error, 'create job');
    return requirePersistedRow(data as CoachJob | null, 'create job');
  }

  static async getJobById(jobId: string, userId: string): Promise<CoachJob | null> {
    if (!UUID_REGEX.test(jobId)) return null;
    const { data, error } = await getAdminClient().from('candidate_career_coach_jobs')
      .select('*').eq('id', jobId).eq('user_id', userId).maybeSingle();
    throwOnDatabaseError(error, 'get job');
    return (data as CoachJob | null) || null;
  }

  static async createNotification(userId: string, title: string, message: string, linkUrl?: string): Promise<CandidateNotification> {
    const { data, error } = await getAdminClient().from('candidate_notifications').insert({
      id: uuidv4(), user_id: userId, type: 'career_coach_response', title, message,
      link_url: linkUrl || null, is_read: false
    }).select('*').single();
    throwOnDatabaseError(error, 'create notification');
    return requirePersistedRow(data as CandidateNotification | null, 'create notification');
  }

  static async getNotifications(userId: string): Promise<{ notifications: CandidateNotification[]; unreadCount: number }> {
    const { data, error } = await getAdminClient().from('candidate_notifications').select('*')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(20);
    throwOnDatabaseError(error, 'get notifications');
    const notifications = (data || []) as CandidateNotification[];
    return { notifications, unreadCount: notifications.filter((item) => !item.is_read).length };
  }

  static async markNotificationRead(notifId: string, userId: string): Promise<boolean> {
    if (!UUID_REGEX.test(notifId)) return false;
    const { data, error } = await getAdminClient().from('candidate_notifications').update({ is_read: true })
      .eq('id', notifId).eq('user_id', userId).select('id').maybeSingle();
    throwOnDatabaseError(error, 'mark notification read');
    return Boolean(data);
  }
}
