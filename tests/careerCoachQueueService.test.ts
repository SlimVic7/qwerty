import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  jobs: new Map<string, any>(),
  threads: new Map<string, any>(),
  messages: [] as any[],
  notifications: [] as any[],
  activeProviderCalls: 0,
  maxProviderCalls: 0,
  providerCalls: 0,
  successfulClaims: [] as string[],
  notificationFailures: 0,
  suppressRetryWake: false
}));

vi.mock('../server/services/careerCoach/careerCoachStore.js', () => ({
  CareerCoachStore: {
    claimQueuedJob: vi.fn(async (id: string) => {
      const job = state.jobs.get(id);
      if (!job || job.status !== 'queued' || new Date(job.available_at).getTime() > Date.now()) return null;
      job.status = 'processing';
      state.successfulClaims.push(id);
      job.started_at = new Date().toISOString();
      job.updated_at = job.started_at;
      return { ...job };
    }),
    listEligibleQueuedJobs: vi.fn(async (limit: number) => [...state.jobs.values()]
      .filter((job) => job.status === 'queued' && new Date(job.available_at).getTime() <= Date.now())
      .sort((a, b) => a.created_at.localeCompare(b.created_at)).slice(0, limit).map((job) => ({ id: job.id }))),
    requeueDueRetryableJobs: vi.fn(async (maxAttempts: number, limit: number) => {
      let count = 0;
      for (const job of [...state.jobs.values()].filter((job) => job.status === 'failed_retryable' && !state.suppressRetryWake &&
        new Date(job.available_at).getTime() <= Date.now() && job.attempt_count < maxAttempts).slice(0, limit)) {
        job.status = 'queued'; job.started_at = null; count++;
      }
      return count;
    }),
    getNextRetryableAvailableAt: vi.fn(async (maxAttempts: number) => {
      if (state.suppressRetryWake) return null;
      const job = [...state.jobs.values()].filter((job) => job.status === 'failed_retryable' && job.attempt_count < maxAttempts)
        .sort((a, b) => a.available_at.localeCompare(b.available_at))[0];
      return job?.available_at || null;
    }),
    recoverStaleProcessingJobs: vi.fn(async (cutoff: string, maxAttempts: number) => {
      let count = 0;
      for (const job of state.jobs.values()) {
        if (job.status === 'processing' && job.started_at && job.started_at <= cutoff) {
          job.attempt_count += 1;
          job.status = job.attempt_count >= maxAttempts ? 'failed_permanent' : 'queued';
          job.started_at = null; job.available_at = new Date().toISOString();
          job.error_code = job.status === 'queued' ? 'STALE_WORKER_RECOVERED' : 'STALE_WORKER_ATTEMPT_LIMIT'; count++;
        }
      }
      return count;
    }),
    getAssistantResponseForJob: vi.fn(async (jobId: string, userId: string) =>
      state.messages.find((message) => message.user_id === userId && message.role === 'assistant' && message.grounding_metadata?.job_id === jobId) || null),
    getThreadById: vi.fn(async (threadId: string, userId: string) => {
      const thread = state.threads.get(threadId);
      return thread?.user_id === userId ? { ...thread } : null;
    }),
    getMessages: vi.fn(async (threadId: string, userId: string) => state.messages.filter((m) => m.thread_id === threadId && m.user_id === userId)),
    addMessage: vi.fn(async (threadId: string, userId: string, role: string, content: string, grounding_metadata: any = {}) => {
      const row = { id: 'message-' + (state.messages.length + 1), thread_id: threadId, user_id: userId, role, content, grounding_metadata, created_at: new Date().toISOString() };
      state.messages.push(row); return row;
    }),
    getNotificationForJob: vi.fn(async (userId: string, jobId: string, threadId: string) =>
      state.notifications.find((n) => n.user_id === userId && n.link_url === `/candidate/career/coach?threadId=${threadId}&jobId=${jobId}`) || null),
    createNotification: vi.fn(async (userId: string, title: string, message: string, link_url: string) => {
      if (state.notificationFailures > 0) { state.notificationFailures--; throw new Error('database operation failed (create notification)'); }
      const row = { id: 'notification-' + (state.notifications.length + 1), user_id: userId, title, message, link_url };
      state.notifications.push(row); return row;
    }),
    markJobCompleted: vi.fn(async (id: string, completedAt: string) => {
      const job = state.jobs.get(id);
      if (!job || job.status !== 'processing') return null;
      Object.assign(job, { status: 'completed', completed_at: completedAt, updated_at: completedAt });
      return { ...job };
    }),
    markJobRetryable: vi.fn(async (id: string, attempts: number, availableAt: string, errorCode: string) => {
      const job = state.jobs.get(id);
      if (!job || job.status !== 'processing') throw new Error('database operation returned no persisted row');
      Object.assign(job, { status: 'failed_retryable', attempt_count: attempts, available_at: availableAt, error_code: errorCode, started_at: null });
      return { ...job };
    }),
    markJobFailedPermanent: vi.fn(async (id: string, attempts: number, errorCode: string) => {
      const job = state.jobs.get(id);
      if (!job || job.status !== 'processing') throw new Error('database operation returned no persisted row');
      Object.assign(job, { status: 'failed_permanent', attempt_count: attempts, error_code: errorCode, started_at: null });
      return { ...job };
    })
  }
}));

vi.mock('../server/services/careerCoach/careerCoachContextService.js', () => ({
  CareerCoachContextService: {
    buildGroundedContext: vi.fn(async () => ({
      candidate: { fullName: 'Test Candidate', currentTitle: 'Junior Engineer', skills: ['TypeScript'], hasCvEvidence: true, cvSummary: 'Test CV' },
      careerRole: { title: 'Software Engineer', summary: 'Build software' },
      developmentPlan: { focusSkillTitles: ['Testing'] },
      roadmapSkills: [{ title: 'Testing', category: 'Engineering', targetLevel: 'Intermediate' }],
      learningResources: [{ title: 'Testing Guide', type: 'Article' }],
      courseRecommendations: [{ courseName: 'Testing Basics', platform: 'QWERTY' }],
      groundingSources: ['QWERTY Profile']
    }))
  }
}));

import {
  CAREER_COACH_MAX_ATTEMPTS,
  CAREER_COACH_MAX_CONCURRENT_WORKERS,
  CAREER_COACH_PROVIDER_TIMEOUT_MS,
  CareerCoachQueueService,
  resetCareerCoachQueueForTests,
  setCareerCoachProviderForTests
} from '../server/services/careerCoach/careerCoachQueueService.js';
import { CareerCoachStore } from '../server/services/careerCoach/careerCoachStore.js';

function addJob(id: string, overrides: Record<string, any> = {}) {
  const threadId = 'thread-' + id;
  const userId = 'candidate-' + id;
  const messageId = 'user-message-' + id;
  state.threads.set(threadId, { id: threadId, user_id: userId, career_role_id: null });
  state.messages.push({ id: messageId, thread_id: threadId, user_id: userId, role: 'user', content: 'How should I improve?', grounding_metadata: {} });
  const now = new Date().toISOString();
  const job = { id, user_id: userId, thread_id: threadId, user_message_id: messageId, status: 'queued',
    attempt_count: 0, available_at: now, started_at: null, created_at: now, updated_at: now, ...overrides };
  state.jobs.set(id, job);
  return job;
}
function sleep(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)); }
async function waitForCondition(predicate: () => boolean, timeoutMs = 10000) {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error('Timed out waiting for queue condition');
    await sleep(2);
  }
}

describe('Stage 7.6 Career Coach queue service', () => {
  beforeEach(() => {
    state.jobs.clear(); state.threads.clear(); state.messages = []; state.notifications = [];
    state.activeProviderCalls = 0; state.maxProviderCalls = 0; state.providerCalls = 0; state.successfulClaims = []; state.notificationFailures = 0; state.suppressRetryWake = false;
    resetCareerCoachQueueForTests();
    setCareerCoachProviderForTests(async () => { state.providerCalls++; return 'Evidence-grounded response'; });
  });
  afterEach(() => { resetCareerCoachQueueForTests(); vi.useRealTimers(); });

  it('allows only one successful atomic claim for concurrent attempts at the same queued job', async () => {
    const job = addJob('atomic-1');
    const [first, second] = await Promise.all([
      CareerCoachStore.claimQueuedJob(job.id),
      CareerCoachStore.claimQueuedJob(job.id)
    ]);
    expect([first, second].filter(Boolean)).toHaveLength(1);
    expect(job.status).toBe('processing');
  });

  it('never exceeds the configured per-process provider concurrency with 1,000 jobs', async () => {
    expect(CAREER_COACH_MAX_CONCURRENT_WORKERS).toBe(3);
    const total = 1000;
    for (let i = 0; i < total; i++) addJob('scale-' + String(i).padStart(4, '0'));
    state.suppressRetryWake = true;
    let firstWaveRateLimits = 50;
    setCareerCoachProviderForTests(async () => {
      state.providerCalls++;
      state.activeProviderCalls++;
      state.maxProviderCalls = Math.max(state.maxProviderCalls, state.activeProviderCalls);
      try {
        await sleep(1);
        if (firstWaveRateLimits > 0) {
          firstWaveRateLimits--;
          const error: any = new Error('rate limited'); error.status = 429; throw error;
        }
        return 'Grounded response';
      } finally {
        state.activeProviderCalls--;
      }
    });

    await CareerCoachQueueService.processPendingJobs(1000);
    await waitForCondition(() => [...state.jobs.values()].every((job) => job.status === 'completed' || job.status === 'failed_retryable'), 20000);
    const firstWaveRetryable = [...state.jobs.values()].filter((job) => job.status === 'failed_retryable');
    expect(CareerCoachStore.markJobRetryable).toHaveBeenCalledTimes(50);
    expect(CareerCoachStore.markJobRetryable.mock.calls.every((call) => call[3] === 'PROVIDER_RATE_LIMITED')).toBe(true);
    expect(firstWaveRetryable).toHaveLength(50);
    firstWaveRetryable.forEach((job) => { job.available_at = new Date(Date.now() - 1000).toISOString(); });
    state.suppressRetryWake = false;
    firstWaveRateLimits = 0;

    await CareerCoachQueueService.processPendingJobs(1000);
    await waitForCondition(() => [...state.jobs.values()].every((job) => job.status === 'completed'), 20000);

    const jobs = [...state.jobs.values()];
    expect(jobs).toHaveLength(1000);
    expect(jobs.every((job) => job.status === 'completed')).toBe(true);
    expect(state.providerCalls).toBe(1050);
    expect(state.maxProviderCalls).toBeLessThanOrEqual(CAREER_COACH_MAX_CONCURRENT_WORKERS);
    expect(state.successfulClaims).toHaveLength(1050);
    const successfulClaimsByJob = new Map<string, number>();
    for (const id of state.successfulClaims) successfulClaimsByJob.set(id, (successfulClaimsByJob.get(id) || 0) + 1);
    expect(jobs.every((job) => successfulClaimsByJob.get(job.id) === job.attempt_count + 1)).toBe(true);
    expect(jobs.every((job) => job.attempt_count < CAREER_COACH_MAX_ATTEMPTS)).toBe(true);
    const successfulAssistantMessages = state.messages.filter((m) => m.role === 'assistant');
    expect(successfulAssistantMessages).toHaveLength(1000);
    expect(new Set(successfulAssistantMessages.map((m) => m.grounding_metadata.job_id)).size).toBe(1000);
    expect(state.notifications).toHaveLength(1000);
    expect(jobs.some((job) => job.status === 'queued' || job.status === 'processing' || job.status === 'failed_retryable')).toBe(false);
  });

  it('does not process a retryable job before available_at, then requeues and processes it when due', async () => {
    const job = addJob('retry-due', { status: 'failed_retryable', attempt_count: 1, available_at: new Date(Date.now() + 60000).toISOString() });
    await CareerCoachQueueService.processPendingJobs(10);
    expect(state.providerCalls).toBe(0);
    expect(job.status).toBe('failed_retryable');
    job.available_at = new Date(Date.now() - 1000).toISOString();
    await CareerCoachQueueService.processPendingJobs(10);
    await waitForCondition(() => job.status === 'completed');
    expect(job.status).toBe('completed');
    expect(CareerCoachStore.requeueDueRetryableJobs).toHaveBeenCalled();
  });

  it('makes 429 failures retryable with a future available_at', async () => {
    const job = addJob('rate-limit');
    setCareerCoachProviderForTests(async () => { const error: any = new Error('rate limited'); error.status = 429; throw error; });
    const result = await CareerCoachQueueService.claimAndRunJob(job.id);
    expect(result?.status).toBe('failed_retryable');
    expect(result?.error_code).toBe('PROVIDER_RATE_LIMITED');
    expect(new Date(result!.available_at).getTime()).toBeGreaterThan(Date.now());
  });

  it('aborts an actual provider request at the configured timeout and marks it retryable', async () => {
    const job = addJob('actual-timeout');
    vi.useFakeTimers();
    setCareerCoachProviderForTests(async (_prompt, _instruction, signal) => new Promise<string>((_resolve, reject) => {
      signal?.addEventListener('abort', () => {
        const error: any = new Error('aborted'); error.name = 'AbortError'; reject(error);
      }, { once: true });
    }));
    const processing = CareerCoachQueueService.claimAndRunJob(job.id);
    await vi.advanceTimersByTimeAsync(CAREER_COACH_PROVIDER_TIMEOUT_MS);
    const result = await processing;
    expect(result?.status).toBe('failed_retryable');
    expect(result?.error_code).toBe('PROVIDER_TIMEOUT');
    expect(job.status).toBe('failed_retryable');
  });

  it('classifies provider timeout and 5xx as retryable', async () => {
    const timeoutJob = addJob('timeout');
    setCareerCoachProviderForTests(async () => { throw new Error('provider request timed out'); });
    const timeoutResult = await CareerCoachQueueService.claimAndRunJob(timeoutJob.id);
    expect(timeoutResult?.status).toBe('failed_retryable');
    expect(timeoutResult?.error_code).toBe('PROVIDER_TIMEOUT');

    const serverErrorJob = addJob('server-error');
    setCareerCoachProviderForTests(async () => { const error: any = new Error('provider unavailable'); error.status = 503; throw error; });
    const serverErrorResult = await CareerCoachQueueService.claimAndRunJob(serverErrorJob.id);
    expect(serverErrorResult?.status).toBe('failed_retryable');
    expect(serverErrorResult?.error_code).toBe('PROVIDER_SERVER_ERROR');
  });

  it('stops retrying when the configured maximum attempt count is reached', async () => {
    const job = addJob('attempt-limit', { attempt_count: CAREER_COACH_MAX_ATTEMPTS - 1 });
    setCareerCoachProviderForTests(async () => { const error: any = new Error('rate limited'); error.status = 429; throw error; });
    const result = await CareerCoachQueueService.claimAndRunJob(job.id);
    expect(result?.status).toBe('failed_permanent');
    expect(result?.attempt_count).toBe(CAREER_COACH_MAX_ATTEMPTS);
  });

  it('marks empty provider output as a permanent application failure', async () => {
    const job = addJob('empty-output');
    setCareerCoachProviderForTests(async () => '   ');
    const result = await CareerCoachQueueService.claimAndRunJob(job.id);
    expect(result?.status).toBe('failed_permanent');
    expect(result?.error_code).toBe('EMPTY_PROVIDER_OUTPUT');
  });

  it('marks invalid application payloads permanently failed without calling the provider', async () => {
    const job = addJob('invalid-payload');
    state.messages = state.messages.filter((message) => message.id !== job.user_message_id);
    const result = await CareerCoachQueueService.claimAndRunJob(job.id);
    expect(result?.status).toBe('failed_permanent');
    expect(result?.error_code).toBe('INVALID_JOB_PAYLOAD');
    expect(state.providerCalls).toBe(0);
  });

  it('recovers stale processing jobs but leaves recent active jobs untouched', async () => {
    const stale = addJob('stale', { status: 'processing', started_at: new Date(Date.now() - 20 * 60 * 1000).toISOString() });
    const recent = addJob('recent', { status: 'processing', started_at: new Date(Date.now() - 60 * 1000).toISOString() });
    await CareerCoachQueueService.recoverAndDrain();
    await waitForCondition(() => stale.status === 'completed');
    expect(stale.error_code).toBe('STALE_WORKER_RECOVERED');
    expect(recent.status).toBe('processing');
  });

  it('recovers a durable stale job after simulated process loss without a provider duplicate', async () => {
    const job = addJob('process-loss', { status: 'processing', started_at: new Date(Date.now() - 30 * 60 * 1000).toISOString() });
    await CareerCoachQueueService.recoverAndDrain();
    await waitForCondition(() => job.status === 'completed');
    expect(state.providerCalls).toBe(1);
  });

  it('does not call the provider twice if notification persistence fails after the response is saved', async () => {
    const job = addJob('partial-completion');
    state.notificationFailures = 1;
    state.providerCalls = 0;
    setCareerCoachProviderForTests(async () => { state.providerCalls++; return 'Durable answer'; });
    const first = await CareerCoachQueueService.claimAndRunJob(job.id);
    expect(first?.status).toBe('failed_retryable');
    expect(state.messages.filter((m) => m.role === 'assistant' && m.grounding_metadata.job_id === job.id)).toHaveLength(1);
    // Let the real retry-wake timer make the retry eligible and dispatch it. Mutating
    // available_at here races the in-flight discovery pass and can suppress the only wake.
    await waitForCondition(() => job.status === 'completed', 10000);
    expect(state.providerCalls).toBe(1);
    expect(state.messages.filter((m) => m.role === 'assistant' && m.grounding_metadata.job_id === job.id)).toHaveLength(1);
    expect(state.notifications).toHaveLength(1);
  });

  it('deduplicates repeated dispatches for the same job', async () => {
    const job = addJob('duplicate-dispatch');
    let release!: () => void;
    setCareerCoachProviderForTests(async () => {
      state.providerCalls++;
      await new Promise<void>((resolve) => { release = resolve; });
      return 'One response';
    });
    const first = CareerCoachQueueService.claimAndRunJob(job.id);
    const second = CareerCoachQueueService.claimAndRunJob(job.id);
    await waitForCondition(() => state.providerCalls === 1);
    release();
    const [a, b] = await Promise.all([first, second]);
    expect(a?.status).toBe('completed');
    expect(b?.status).toBe('completed');
    expect(state.providerCalls).toBe(1);
  });
});
