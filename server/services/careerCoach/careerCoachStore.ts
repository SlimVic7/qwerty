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
