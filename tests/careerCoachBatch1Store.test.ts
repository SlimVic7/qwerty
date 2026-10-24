import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbState = vi.hoisted(() => ({ inserted: [] as Array<{ table: string; value: Record<string, any> }>, failure: null as any }));
vi.mock('../server/db/supabase.js', () => ({
  getAdminClient: () => ({
    from: (table: string) => {
      let payload: Record<string, any> | null = null;
      const query: any = {
        insert: (value: Record<string, any>) => { payload = value; dbState.inserted.push({ table, value }); return query; },
        select: () => query,
        single: async () => ({
          data: dbState.failure ? null : (payload ? { ...payload, created_at: '2026-10-24T00:00:00.000Z', updated_at: '2026-10-24T00:00:00.000Z', available_at: '2026-10-24T00:00:00.000Z', attempt_count: 0 } : null),
          error: dbState.failure
        }),
        update: () => query, eq: () => query, order: () => query, limit: () => query,
        maybeSingle: async () => ({ data: null, error: dbState.failure }),
        then: (resolve: any, reject: any) => Promise.resolve({ data: [], error: dbState.failure }).then(resolve, reject)
      };
      return query;
    }
  })
}));
import { CareerCoachStore } from '../server/services/careerCoach/careerCoachStore.js';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('Stage 7.6 Batch 1 durable store', () => {
  beforeEach(() => { dbState.inserted = []; dbState.failure = null; });
  it('generates PostgreSQL-compatible UUIDs for thread, message, job, and notification rows', async () => {
    const userId = '11111111-1111-4111-8111-111111111111';
    const threadId = '22222222-2222-4222-8222-222222222222';
    const messageId = '33333333-3333-4333-8333-333333333333';
    await CareerCoachStore.createThread(userId);
    await CareerCoachStore.addMessage(threadId, userId, 'user', 'Hello');
    await CareerCoachStore.createJob(userId, threadId, messageId);
    await CareerCoachStore.createNotification(userId, 'Ready', 'Response ready');
    expect(dbState.inserted.map((entry) => entry.table)).toEqual([
      'candidate_career_coach_threads', 'candidate_career_coach_messages',
      'candidate_career_coach_jobs', 'candidate_notifications'
    ]);
    for (const entry of dbState.inserted) expect(entry.value.id).toMatch(UUID_RE);
  });
  it('surfaces durable insert failures instead of returning an in-memory success', async () => {
    dbState.failure = { code: 'XX000', message: 'database unavailable' };
    await expect(CareerCoachStore.createThread('11111111-1111-4111-8111-111111111111')).rejects.toThrow(/database operation failed/i);
  });
  it('surfaces durable read failures instead of substituting memory results', async () => {
    dbState.failure = { code: 'XX000', message: 'database unavailable' };
    await expect(CareerCoachStore.getThreads('11111111-1111-4111-8111-111111111111')).rejects.toThrow(/database operation failed/i);
  });
});
