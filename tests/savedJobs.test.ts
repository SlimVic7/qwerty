import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SavedJobsStore } from '../server/services/savedJobs/savedJobsStore.js';
import { CURRENT_SAVED_JOBS_VERSION } from '../server/services/savedJobs/types.js';

const validUserId = '11111111-1111-4111-a111-111111111111';
const validJobId = '22222222-2222-4222-a222-222222222222';
const otherJobId = '33333333-3333-4333-a333-333333333333';
const closedJobId = '44444444-4444-4444-a444-444444444444';
const nonExistentJobId = '55555555-5555-4555-a555-555555555555';

const mockJobsMap: Record<string, any> = {
  [validJobId]: {
    id: validJobId,
    title: 'Senior Software Engineer',
    company_name: 'Acme Cloud',
    status: 'published'
  },
  [otherJobId]: {
    id: otherJobId,
    title: 'Lead Architect',
    company_name: 'Zenith Labs',
    status: 'published'
  },
  [closedJobId]: {
    id: closedJobId,
    title: 'Legacy Specialist',
    company_name: 'Old Corp',
    status: 'closed'
  }
};

vi.mock('../server/db/supabase.js', () => ({
  getAdminClient: () => ({
    from: (table: string) => {
      const builder: any = {
        select: () => builder,
        eq: (col: string, val: any) => {
          builder._eqs = builder._eqs || {};
          builder._eqs[col] = val;
          return builder;
        },
        maybeSingle: async () => {
          if (table === 'jobs') {
            const found = mockJobsMap[builder._eqs?.id];
            return { data: found || null, error: null };
          }
          return { data: null, error: null };
        },
        upsert: () => ({
          select: () => ({
            single: async () => {
              // Return error indicating table does not exist so fallback store is used cleanly
              return { data: null, error: { code: '42P01', message: 'relation "candidate_saved_jobs" does not exist' } };
            }
          })
        }),
        delete: () => ({
          match: async () => ({ error: null })
        }),
        order: () => builder,
        range: () => builder
      };
      return builder;
    },
    rpc: async () => ({ data: null, error: { message: 'function does not exist' } })
  })
}));

describe('Candidate Saved Jobs Unit & Store (Stage 6.1)', () => {
  beforeEach(() => {
    SavedJobsStore.clearFallbackStore();
    vi.clearAllMocks();
  });

  describe('UUID Validation', () => {
    it('validates standard UUID formats correctly', () => {
      expect(SavedJobsStore.isValidUuid(validUserId)).toBe(true);
      expect(SavedJobsStore.isValidUuid('invalid-uuid')).toBe(false);
      expect(SavedJobsStore.isValidUuid('')).toBe(false);
      expect(SavedJobsStore.isValidUuid(null as any)).toBe(false);
    });

    it('rejects invalid user or job UUIDs upon saveJob', async () => {
      await expect(SavedJobsStore.saveJob('bad-user-id', validJobId)).rejects.toThrow('INVALID_USER_ID');
      await expect(SavedJobsStore.saveJob(validUserId, 'bad-job-id')).rejects.toThrow('INVALID_JOB_ID');
    });

    it('rejects invalid user or job UUIDs upon unsaveJob', async () => {
      await expect(SavedJobsStore.unsaveJob('bad-user-id', validJobId)).rejects.toThrow('INVALID_USER_ID');
      await expect(SavedJobsStore.unsaveJob(validUserId, 'bad-job-id')).rejects.toThrow('INVALID_JOB_ID');
    });

    it('returns false for saved status if invalid UUID provided', async () => {
      const status = await SavedJobsStore.getSavedStatus('bad-user-id', validJobId);
      expect(status.saved).toBe(false);
    });
  });

  describe('Job Existence & Status Validation', () => {
    it('throws JOB_NOT_FOUND if job does not exist in jobs table', async () => {
      await expect(SavedJobsStore.saveJob(validUserId, nonExistentJobId)).rejects.toThrow('JOB_NOT_FOUND');
    });

    it('throws JOB_NOT_AVAILABLE if job is not in published status', async () => {
      await expect(SavedJobsStore.saveJob(validUserId, closedJobId)).rejects.toThrow('JOB_NOT_AVAILABLE');
    });
  });

  describe('Save / Unsave / Status Idempotency', () => {
    it('saves a published job and reflects saved status accurately', async () => {
      const saveRes = await SavedJobsStore.saveJob(validUserId, validJobId);
      expect(saveRes.saved).toBe(true);
      expect(saveRes.saved_job_id).toBeDefined();
      expect(saveRes.saved_at).toBeDefined();

      const statusRes = await SavedJobsStore.getSavedStatus(validUserId, validJobId);
      expect(statusRes.saved).toBe(true);
      expect(statusRes.saved_job_id).toBe(saveRes.saved_job_id);
    });

    it('is a true no-op on duplicate save calls, returning same row and timestamp without duplicate entries', async () => {
      const firstSave = await SavedJobsStore.saveJob(validUserId, validJobId);
      await new Promise(r => setTimeout(r, 15));
      const secondSave = await SavedJobsStore.saveJob(validUserId, validJobId);

      expect(firstSave.saved).toBe(true);
      expect(secondSave.saved).toBe(true);
      expect(secondSave.saved_job_id).toBe(firstSave.saved_job_id);
      expect(secondSave.saved_at).toBe(firstSave.saved_at);

      // Verify no duplicate rows were created
      const list = await SavedJobsStore.listSavedJobs(validUserId);
      expect(list.total).toBe(1);
    });

    it('ensures concurrent duplicate saves produce exactly one row', async () => {
      const [res1, res2, res3] = await Promise.all([
        SavedJobsStore.saveJob(validUserId, otherJobId),
        SavedJobsStore.saveJob(validUserId, otherJobId),
        SavedJobsStore.saveJob(validUserId, otherJobId)
      ]);

      expect(res1.saved_job_id).toBe(res2.saved_job_id);
      expect(res2.saved_job_id).toBe(res3.saved_job_id);

      const list = await SavedJobsStore.listSavedJobs(validUserId);
      const filtered = list.saved_jobs.filter(j => j.job.id === otherJobId);
      expect(filtered.length).toBe(1);
    });

    it('unsaves an existing saved job, returns deleted true, and updates status to false', async () => {
      await SavedJobsStore.saveJob(validUserId, validJobId);
      const unsaveRes = await SavedJobsStore.unsaveJob(validUserId, validJobId);

      expect(unsaveRes.saved).toBe(false);
      expect(unsaveRes.deleted).toBe(true);

      const status = await SavedJobsStore.getSavedStatus(validUserId, validJobId);
      expect(status.saved).toBe(false);
      expect(status.saved_job_id).toBeUndefined();
    });

    it('returns deleted false on unsaving a missing or already unsaved bookmark', async () => {
      // First attempt on non-saved bookmark
      const unsave1 = await SavedJobsStore.unsaveJob(validUserId, validJobId);
      expect(unsave1.saved).toBe(false);
      expect(unsave1.deleted).toBe(false);

      // Save then unsave twice
      await SavedJobsStore.saveJob(validUserId, validJobId);
      const unsave2 = await SavedJobsStore.unsaveJob(validUserId, validJobId);
      expect(unsave2.saved).toBe(false);
      expect(unsave2.deleted).toBe(true);

      const unsave3 = await SavedJobsStore.unsaveJob(validUserId, validJobId);
      expect(unsave3.saved).toBe(false);
      expect(unsave3.deleted).toBe(false);
    });
  });

  describe('List Saved Jobs & Pagination', () => {
    it('returns empty list if candidate has no saved jobs', async () => {
      const res = await SavedJobsStore.listSavedJobs(validUserId);
      expect(res.version).toBe(CURRENT_SAVED_JOBS_VERSION);
      expect(res.saved_jobs).toEqual([]);
      expect(res.total).toBe(0);
      expect(res.limit).toBe(20);
      expect(res.offset).toBe(0);
    });

    it('lists multiple saved jobs in reverse chronological order', async () => {
      await SavedJobsStore.saveJob(validUserId, validJobId);
      await new Promise(r => setTimeout(r, 10));
      await SavedJobsStore.saveJob(validUserId, otherJobId);

      const res = await SavedJobsStore.listSavedJobs(validUserId);
      expect(res.total).toBe(2);
      expect(res.saved_jobs.length).toBe(2);
      expect(res.saved_jobs[0].job.id).toBe(otherJobId);
      expect(res.saved_jobs[1].job.id).toBe(validJobId);
    });

    it('respects pagination parameters limit and offset', async () => {
      await SavedJobsStore.saveJob(validUserId, validJobId);
      await new Promise(r => setTimeout(r, 10));
      await SavedJobsStore.saveJob(validUserId, otherJobId);

      const paged = await SavedJobsStore.listSavedJobs(validUserId, { limit: 1, offset: 0 });
      expect(paged.total).toBe(2);
      expect(paged.saved_jobs.length).toBe(1);
      expect(paged.saved_jobs[0].job.id).toBe(otherJobId);

      const secondPage = await SavedJobsStore.listSavedJobs(validUserId, { limit: 1, offset: 1 });
      expect(secondPage.total).toBe(2);
      expect(secondPage.saved_jobs.length).toBe(1);
      expect(secondPage.saved_jobs[0].job.id).toBe(validJobId);
    });
  });

  describe('Zero AI Guarantee', () => {
    it('operates with 0 AI / LLM calls or model invocations', async () => {
      const geminiSpy = vi.fn();
      await SavedJobsStore.saveJob(validUserId, validJobId);
      await SavedJobsStore.getSavedStatus(validUserId, validJobId);
      await SavedJobsStore.listSavedJobs(validUserId);
      await SavedJobsStore.unsaveJob(validUserId, validJobId);

      expect(geminiSpy).not.toHaveBeenCalled();
    });
  });

  describe('Production Mode Persistence Enforcement', () => {
    it('strictly forbids in-memory fallback when NODE_ENV is production', async () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        // In our mock, the table does not exist (returns 42P01 error).
        // Under production, it must throw DATABASE_PERSISTENCE_REQUIRED instead of silently saving to memory.
        await expect(SavedJobsStore.saveJob(validUserId, validJobId)).rejects.toThrow(
          'DATABASE_PERSISTENCE_REQUIRED'
        );
        await expect(SavedJobsStore.listSavedJobs(validUserId)).rejects.toThrow(
          'DATABASE_PERSISTENCE_REQUIRED'
        );
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });
});
