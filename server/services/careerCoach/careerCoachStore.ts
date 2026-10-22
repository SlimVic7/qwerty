import { getAdminClient } from '../../db/supabase.js';

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

// In-memory fallback stores for test/local resilience
const threadsMemoryStore: Map<string, CoachThread> = new Map();
const messagesMemoryStore: Map<string, CoachMessage[]> = new Map();
const jobsMemoryStore: Map<string, CoachJob> = new Map();
const notificationsMemoryStore: Map<string, CandidateNotification[]> = new Map();

export class CareerCoachStore {
  /**
   * Retrieves all threads for a candidate.
   */
  static async getThreads(userId: string): Promise<CoachThread[]> {
    try {
      const supabase = getAdminClient();
      const { data, error } = await supabase
        .from('candidate_career_coach_threads')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('updated_at', { ascending: false });

      if (!error && data) return data as CoachThread[];
    } catch (e) {
      // Fall through to memory
    }

    const userThreads = Array.from(threadsMemoryStore.values())
      .filter((t) => t.user_id === userId && t.status === 'active')
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    return userThreads;
  }

  /**
   * Retrieves a single thread by ID with candidate ownership verification.
   */
  static async getThreadById(threadId: string, userId: string): Promise<CoachThread | null> {
    try {
      const supabase = getAdminClient();
      const { data, error } = await supabase
        .from('candidate_career_coach_threads')
        .select('*')
        .eq('id', threadId)
        .eq('user_id', userId)
        .single();

      if (!error && data) return data as CoachThread;
    } catch (e) {
      // Fall through to memory
    }

    const thread = threadsMemoryStore.get(threadId);
    if (thread && thread.user_id === userId) return thread;
    return null;
  }

  /**
   * Creates a new Career Coach thread.
   */
  static async createThread(userId: string, careerRoleId?: string | null, title?: string): Promise<CoachThread> {
    const threadId = `thread-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const threadTitle = title || 'Career Coaching Session';

    const newThread: CoachThread = {
      id: threadId,
      user_id: userId,
      career_role_id: careerRoleId || null,
      title: threadTitle,
      status: 'active',
      created_at: now,
      updated_at: now
    };

    try {
      const supabase = getAdminClient();
      const { data, error } = await supabase
        .from('candidate_career_coach_threads')
        .insert({
          id: threadId,
          user_id: userId,
          career_role_id: careerRoleId || null,
          title: threadTitle,
          status: 'active'
        })
        .select('*')
        .single();

      if (!error && data) return data as CoachThread;
    } catch (e) {
      // Fall through to memory
    }

    threadsMemoryStore.set(threadId, newThread);
    messagesMemoryStore.set(threadId, []);
    return newThread;
  }

  /**
   * Gets message history for a thread.
   */
  static async getMessages(threadId: string, userId: string): Promise<CoachMessage[]> {
    // Verify thread ownership first
    const thread = await this.getThreadById(threadId, userId);
    if (!thread) return [];

    try {
      const supabase = getAdminClient();
      const { data, error } = await supabase
        .from('candidate_career_coach_messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (!error && data) return data as CoachMessage[];
    } catch (e) {
      // Fall through to memory
    }

    return messagesMemoryStore.get(threadId) || [];
  }

  /**
   * Adds a message to a thread.
   */
  static async addMessage(
    threadId: string,
    userId: string,
    role: 'user' | 'assistant' | 'system_event',
    content: string,
    groundingMetadata: Record<string, any> = {}
  ): Promise<CoachMessage> {
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const newMessage: CoachMessage = {
      id: messageId,
      thread_id: threadId,
      user_id: userId,
      role,
      content,
      grounding_metadata: groundingMetadata,
      created_at: now
    };

    try {
      const supabase = getAdminClient();
      const { data, error } = await supabase
        .from('candidate_career_coach_messages')
        .insert({
          id: messageId,
          thread_id: threadId,
          user_id: userId,
          role,
          content,
          grounding_metadata: groundingMetadata
        })
        .select('*')
        .single();

      // Touch thread updated_at
      await supabase
        .from('candidate_career_coach_threads')
        .update({ updated_at: now })
        .eq('id', threadId);

      if (!error && data) return data as CoachMessage;
    } catch (e) {
      // Fall through to memory
    }

    const list = messagesMemoryStore.get(threadId) || [];
    list.push(newMessage);
    messagesMemoryStore.set(threadId, list);

    const thread = threadsMemoryStore.get(threadId);
    if (thread) {
      thread.updated_at = now;
    }

    return newMessage;
  }

  /**
   * Creates a durable coach job record.
   */
  static async createJob(userId: string, threadId: string, userMessageId: string): Promise<CoachJob> {
    const jobId = `job-coach-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const newJob: CoachJob = {
      id: jobId,
      user_id: userId,
      thread_id: threadId,
      user_message_id: userMessageId,
      status: 'queued',
      attempt_count: 0,
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      available_at: now,
      created_at: now,
      updated_at: now
    };

    try {
      const supabase = getAdminClient();
      const { data, error } = await supabase
        .from('candidate_career_coach_jobs')
        .insert({
          id: jobId,
          user_id: userId,
          thread_id: threadId,
          user_message_id: userMessageId,
          status: 'queued',
          provider: 'gemini',
          model: 'gemini-2.5-flash'
        })
        .select('*')
        .single();

      if (!error && data) return data as CoachJob;
    } catch (e) {
      // Fall through to memory
    }

    jobsMemoryStore.set(jobId, newJob);
    return newJob;
  }

  /**
   * Fetches a coach job by ID with candidate ownership verification.
   */
  static async getJobById(jobId: string, userId: string): Promise<CoachJob | null> {
    try {
      const supabase = getAdminClient();
      const { data, error } = await supabase
        .from('candidate_career_coach_jobs')
        .select('*')
        .eq('id', jobId)
        .eq('user_id', userId)
        .single();

      if (!error && data) return data as CoachJob;
    } catch (e) {
      // Fall through to memory
    }

    const job = jobsMemoryStore.get(jobId);
    if (job && job.user_id === userId) return job;
    return null;
  }

  /**
   * Creates an in-app candidate notification.
   */
  static async createNotification(
    userId: string,
    title: string,
    message: string,
    linkUrl?: string
  ): Promise<CandidateNotification> {
    const notifId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const newNotif: CandidateNotification = {
      id: notifId,
      user_id: userId,
      type: 'career_coach_response',
      title,
      message,
      link_url: linkUrl || null,
      is_read: false,
      created_at: now
    };

    try {
      const supabase = getAdminClient();
      const { data, error } = await supabase
        .from('candidate_notifications')
        .insert({
          id: notifId,
          user_id: userId,
          type: 'career_coach_response',
          title,
          message,
          link_url: linkUrl || null,
          is_read: false
        })
        .select('*')
        .single();

      if (!error && data) return data as CandidateNotification;
    } catch (e) {
      // Fall through to memory
    }

    const list = notificationsMemoryStore.get(userId) || [];
    list.unshift(newNotif);
    notificationsMemoryStore.set(userId, list);

    return newNotif;
  }

  /**
   * Retrieves notifications for a candidate.
   */
  static async getNotifications(userId: string): Promise<{ notifications: CandidateNotification[]; unreadCount: number }> {
    try {
      const supabase = getAdminClient();
      const { data, error } = await supabase
        .from('candidate_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        const unreadCount = data.filter((n) => !n.is_read).length;
        return { notifications: data as CandidateNotification[], unreadCount };
      }
    } catch (e) {
      // Fall through to memory
    }

    const list = notificationsMemoryStore.get(userId) || [];
    const unreadCount = list.filter((n) => !n.is_read).length;
    return { notifications: list, unreadCount };
  }

  /**
   * Marks a notification as read.
   */
  static async markNotificationRead(notifId: string, userId: string): Promise<boolean> {
    try {
      const supabase = getAdminClient();
      const { error } = await supabase
        .from('candidate_notifications')
        .update({ is_read: true })
        .eq('id', notifId)
        .eq('user_id', userId);

      if (!error) return true;
    } catch (e) {
      // Fall through to memory
    }

    const list = notificationsMemoryStore.get(userId) || [];
    const item = list.find((n) => n.id === notifId);
    if (item) {
      item.is_read = true;
      return true;
    }
    return false;
  }
}
