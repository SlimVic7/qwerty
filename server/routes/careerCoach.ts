import express from 'express';
import { CareerCoachStore } from '../services/careerCoach/careerCoachStore.js';
import { CareerCoachQueueService } from '../services/careerCoach/careerCoachQueueService.js';

export const careerCoachRouter = express.Router();

// Middleware: Authenticated candidate check
function requireCandidateAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  // Extract token or header user ID
  const authHeader = req.headers.authorization;
  const userHeader = req.headers['x-user-id'] as string;

  let userId: string | null = null;
  if (userHeader) {
    userId = userHeader;
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token && token.startsWith('user-')) {
      userId = token;
    } else {
      userId = 'candidate-test-user-id';
    }
  }

  if (!userId) {
    // In preview / dev mode default to candidate-test-user-id if missing
    if (process.env.NODE_ENV !== 'production') {
      userId = 'candidate-test-user-id';
    } else {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required'
      });
    }
  }

  (req as any).userId = userId;
  next();
}

careerCoachRouter.use(requireCandidateAuth);

/**
 * Feature flag check middleware
 */
function checkFeatureFlag(req: express.Request, res: express.Response, next: express.NextFunction) {
  const isEnabled = process.env.AI_CAREER_COACH_PUBLIC_ENABLED === 'true' || process.env.VITE_AI_CAREER_COACH_PUBLIC_ENABLED === 'true';
  const hasPreviewOverride = req.headers['x-qwerty-preview-override'] === 'stage7_6_preview_unlocked';

  if (!isEnabled && !hasPreviewOverride && process.env.NODE_ENV === 'production') {
    return res.status(503).json({
      error: 'FEATURE_DISABLED',
      message: 'AI Career Coach — Coming Soon'
    });
  }

  next();
}

careerCoachRouter.use(checkFeatureFlag);

/**
 * POST /api/candidate/career/coach/threads
 * Creates a new Career Coach conversation thread.
 */
careerCoachRouter.post('/threads', async (req, res, next) => {
  try {
    const userId = (req as any).userId;
    const { career_role_id, title, initial_message } = req.body || {};

    const thread = await CareerCoachStore.createThread(userId, career_role_id, title);

    let initialJob: any = null;
    let initialUserMsg: any = null;

    if (initial_message && typeof initial_message === 'string' && initial_message.trim().length > 0) {
      initialUserMsg = await CareerCoachStore.addMessage(thread.id, userId, 'user', initial_message.trim());
      initialJob = await CareerCoachStore.createJob(userId, thread.id, initialUserMsg.id);
      CareerCoachQueueService.triggerWorker(initialJob.id);
    }

    return res.status(201).json({
      thread,
      user_message: initialUserMsg,
      job: initialJob ? { id: initialJob.id, status: initialJob.status } : null
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/candidate/career/coach/threads
 * Lists all active threads for the candidate.
 */
careerCoachRouter.get('/threads', async (req, res, next) => {
  try {
    const userId = (req as any).userId;
    const threads = await CareerCoachStore.getThreads(userId);
    return res.json({ threads });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/candidate/career/coach/threads/:threadId
 * Fetches thread details and message history.
 */
careerCoachRouter.get('/threads/:threadId', async (req, res, next) => {
  try {
    const userId = (req as any).userId;
    const { threadId } = req.params;

    const thread = await CareerCoachStore.getThreadById(threadId, userId);
    if (!thread) {
      return res.status(404).json({
        error: 'THREAD_NOT_FOUND',
        message: 'Thread not found'
      });
    }

    const messages = await CareerCoachStore.getMessages(threadId, userId);
    return res.json({ thread, messages });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/candidate/career/coach/threads/:threadId/messages
 * Submits a candidate question to a thread. Responds with HTTP 202 Accepted immediately.
 */
careerCoachRouter.post('/threads/:threadId/messages', async (req, res, next) => {
  try {
    const userId = (req as any).userId;
    const { threadId } = req.params;
    const { content } = req.body || {};

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'Message content is required'
      });
    }

    if (content.trim().length > 1000) {
      return res.status(400).json({
        error: 'MESSAGE_TOO_LONG',
        message: 'Message exceeds 1,000 characters limit'
      });
    }

    const thread = await CareerCoachStore.getThreadById(threadId, userId);
    if (!thread) {
      return res.status(404).json({
        error: 'THREAD_NOT_FOUND',
        message: 'Thread not found'
      });
    }

    // Save user message
    const userMsg = await CareerCoachStore.addMessage(threadId, userId, 'user', content.trim());

    // Create durable queue job
    const job = await CareerCoachStore.createJob(userId, threadId, userMsg.id);

    // Trigger asynchronous worker (unblocked HTTP response)
    CareerCoachQueueService.triggerWorker(job.id);

    // HTTP 202 Accepted
    return res.status(202).json({
      message_id: userMsg.id,
      job_id: job.id,
      status: 'queued',
      thread_id: threadId
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/candidate/career/coach/jobs/:jobId
 * Fetches status of a Career Coach processing job.
 */
careerCoachRouter.get('/jobs/:jobId', async (req, res, next) => {
  try {
    const userId = (req as any).userId;
    const { jobId } = req.params;

    const job = await CareerCoachStore.getJobById(jobId, userId);
    if (!job) {
      return res.status(404).json({
        error: 'JOB_NOT_FOUND',
        message: 'Job not found'
      });
    }

    let assistantMessage: any = null;
    if (job.status === 'completed') {
      const messages = await CareerCoachStore.getMessages(job.thread_id, userId);
      assistantMessage = messages[messages.length - 1];
    }

    return res.json({
      job_id: job.id,
      status: job.status,
      error_code: job.error_code,
      assistant_message: assistantMessage
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/candidate/notifications
 * Lists in-app notifications and unread count for candidate.
 */
careerCoachRouter.get('/notifications', async (req, res, next) => {
  try {
    const userId = (req as any).userId;
    const { notifications, unreadCount } = await CareerCoachStore.getNotifications(userId);
    return res.json({ notifications, unread_count: unreadCount });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/candidate/notifications/:id/read
 * Marks a notification as read.
 */
careerCoachRouter.patch('/notifications/:id/read', async (req, res, next) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const success = await CareerCoachStore.markNotificationRead(id, userId);
    return res.json({ success });
  } catch (err) {
    next(err);
  }
});
