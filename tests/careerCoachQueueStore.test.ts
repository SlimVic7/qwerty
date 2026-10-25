import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  job: { id: '00000000-0000-4000-8000-000000000001', status: 'queued', available_at: new Date(Date.now() - 1000).toISOString(), attempt_count: 0 },
  errors: null as any,
  calls: [] as any[]
}));
vi.mock('../server/db/supabase.js', () => ({
  getAdminClient: () => ({
    from: (table: string) => {
      const query: any = { table, action: 'select', payload: null, filters: {}, lteFilters: {}, selected: '*',
        update(value: any) { query.action = 'update'; query.payload = value; return query; },
        select(value = '*') { query.selected = value; return query; },
        eq(key: string, value: any) { query.filters[key] = value; return query; },
        lte(key: string, value: any) { query.lteFilters[key] = value; return query; },
        maybeSingle: async () => {
          db.calls.push({ table, action: query.action, payload: query.payload, filters: { ...query.filters }, lteFilters: { ...query.lteFilters } });
          if (db.errors) return { data: null, error: db.errors };
          const row = db.job;
          const matches = Object.entries(query.filters).every(([key, value]) => (row as any)[key] === value) &&
            Object.entries(query.lteFilters).every(([key, value]) => new Date((row as any)[key]).getTime() <= new Date(String(value)).getTime());
          if (!matches) return { data: null, error: null };
          if (query.action === 'update') Object.assign(row, query.payload);
          return { data: { ...row }, error: null };
        }
      };
      return query;
    }
  })
}));
import { CareerCoachStore } from '../server/services/careerCoach/careerCoachStore.js';

describe('Career Coach durable queue store', () => {
  beforeEach(() => {
    db.job = { id: '00000000-0000-4000-8000-000000000001', status: 'queued', available_at: new Date(Date.now() - 1000).toISOString(), attempt_count: 0 };
    db.errors = null;
    db.calls = [];
  });

  it('uses a PostgreSQL status predicate and returns exactly one successful concurrent claim', async () => {
    const [first, second] = await Promise.all([
      CareerCoachStore.claimQueuedJob(db.job.id),
      CareerCoachStore.claimQueuedJob(db.job.id)
    ]);
    expect([first, second].filter(Boolean)).toHaveLength(1);
    expect(db.job.status).toBe('processing');
    expect(db.calls.every((call) => call.filters.status === 'queued')).toBe(true);
    expect(db.calls.every((call) => call.lteFilters.available_at)).toBe(true);
  });

  it('does not claim a job before available_at', async () => {
    db.job.available_at = new Date(Date.now() + 60000).toISOString();
    const result = await CareerCoachStore.claimQueuedJob(db.job.id);
    expect(result).toBeNull();
    expect(db.job.status).toBe('queued');
  });

  it('surfaces claim persistence errors rather than falling back to memory', async () => {
    db.errors = { code: 'XX000', message: 'database unavailable' };
    await expect(CareerCoachStore.claimQueuedJob(db.job.id)).rejects.toThrow(/database operation failed/i);
  });
});
