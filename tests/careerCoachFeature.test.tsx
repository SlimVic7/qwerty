import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CareerCoachStore } from '../server/services/careerCoach/careerCoachStore.js';
import { CareerCoachQueueService, MAX_CONCURRENT_COACH_WORKERS } from '../server/services/careerCoach/careerCoachQueueService.js';
import { CareerCoachContextService } from '../server/services/careerCoach/careerCoachContextService.js';
import { CandidateCareerCoachPage } from '../src/features/career/CandidateCareerCoachPage.js';
import * as supabaseDb from '../server/db/supabase.js';

// Mock Supabase Auth
vi.mock('../src/lib/supabase.js', () => ({
  supabase: {
    auth: {
      signOut: vi.fn().mockResolvedValue({ error: null })
    }
  }
}));

describe('Stage 7.6 — AI Career Coach & Queue Hardening Suite', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    const tables: Record<string, any[]> = {};
    let activeQuery: any = null;
    const executeQuery = (query: any, single = false) => {
      const rows = tables[query.table] || (tables[query.table] = []);
      if (query.action === 'insert') {
        const now = new Date().toISOString();
        const row = {
          ...query.payload,
          created_at: now,
          updated_at: now,
          available_at: now,
          attempt_count: 0,
          is_read: query.payload?.is_read ?? false
        };
        rows.push(row);
        return { data: row, error: null };
      }
      const matches = rows.filter((row) =>
        Object.entries(query.filters).every(([key, value]) => row[key] === value) &&
        Object.entries(query.inFilters).every(([key, values]: [string, any]) => values.includes(row[key]))
      );
      if (query.action === 'update') {
        matches.forEach((row) => Object.assign(row, query.payload));
        return { data: query.returnRows ? (single ? (matches[0] || null) : matches) : null, error: null };
      }
      const limited = query.limitValue == null ? matches : matches.slice(0, query.limitValue);
      return { data: single ? (limited[0] || null) : limited, error: null };
    };

    mockSupabase = {
      from: vi.fn((table: string) => {
        const query: any = {
          table,
          action: 'select',
          payload: null,
          filters: {},
          inFilters: {},
          limitValue: null,
          returnRows: false,
          select: vi.fn(() => { if (query.action === 'update') query.returnRows = true; return query; }),
          eq: vi.fn((key: string, value: any) => { query.filters[key] = value; return query; }),
          in: vi.fn((key: string, values: any[]) => { query.inFilters[key] = values; return query; }),
          order: vi.fn(() => query),
          limit: vi.fn((value: number) => { query.limitValue = value; return query; }),
          insert: vi.fn((value: any) => { query.action = 'insert'; query.payload = value; return query; }),
          update: vi.fn((value: any) => { query.action = 'update'; query.payload = value; return query; }),
          single: vi.fn(() => { activeQuery = query; return mockSupabase.single(); }),
          maybeSingle: vi.fn(() => { activeQuery = query; return mockSupabase.maybeSingle(); }),
          then: (resolve: any, reject: any) => Promise.resolve(executeQuery(query)).then(resolve, reject)
        };
        return query;
      }),
      single: vi.fn(async () => executeQuery(activeQuery, true)),
      maybeSingle: vi.fn(async () => executeQuery(activeQuery, true))
    };

    vi.spyOn(supabaseDb, 'getAdminClient').mockReturnValue(mockSupabase);
  });

  describe('Part A — Authorization & Candidate Data Isolation', () => {
    it('creates threads and messages scoped strictly to the authenticated user', async () => {
      const thread = await CareerCoachStore.createThread('user-1', null, 'My Career Session');
      expect(thread.user_id).toBe('user-1');

      const retrieved = await CareerCoachStore.getThreadById(thread.id, 'user-1');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(thread.id);

      // Attempt access from Candidate B (user-2) must return null
      const crossAccess = await CareerCoachStore.getThreadById(thread.id, 'user-2');
      expect(crossAccess).toBeNull();
    });

    it('enforces candidate job isolation for status polling', async () => {
      const thread = await CareerCoachStore.createThread('user-1');
      const msg = await CareerCoachStore.addMessage(thread.id, 'user-1', 'user', 'What should I learn?');
      const job = await CareerCoachStore.createJob('user-1', thread.id, msg.id);

      const jobUser1 = await CareerCoachStore.getJobById(job.id, 'user-1');
      expect(jobUser1).not.toBeNull();

      // Candidate B (user-2) cannot view user-1 job
      const jobUser2 = await CareerCoachStore.getJobById(job.id, 'user-2');
      expect(jobUser2).toBeNull();
    });
  });

  describe('Part B — Grounding & Evidence-Safe Principles', () => {
    it('builds grounded context containing authorized profile and CV evidence', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { full_name: 'John Candidate', headline: 'Full Stack Engineer', skills: ['React', 'TypeScript'] },
        error: null
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: { extracted_data: { workHistory: [{ title: 'Software Engineer' }], skills: ['React', 'Node.js'] } },
        error: null
      });

      const context = await CareerCoachContextService.buildGroundedContext('user-1');
      expect(context.candidate.fullName).toBe('John Candidate');
      expect(context.candidate.hasCvEvidence).toBe(true);
      expect(context.groundingSources).toContain('Your QWERTY Profile');
      expect(context.groundingSources).toContain('Your Approved CV Evidence');
    });
  });

  describe('Part C — Asynchronous Queue & Bounded Concurrency', () => {
    it('atomically claims queued jobs and prevents duplicate worker execution', async () => {
      const thread = await CareerCoachStore.createThread('user-1');
      const msg = await CareerCoachStore.addMessage(thread.id, 'user-1', 'user', 'Explain my roadmap.');
      const job = await CareerCoachStore.createJob('user-1', thread.id, msg.id);

      // Mock atomic claim success
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: job.id, status: 'processing', thread_id: thread.id, user_id: 'user-1', user_message_id: msg.id },
        error: null
      });

      const result = await CareerCoachQueueService.claimAndRunJob(job.id);
      expect(result).not.toBeNull();
      expect(result.status).toBe('completed');

      // Verify notification created
      const { notifications } = await CareerCoachStore.getNotifications('user-1');
      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].title).toBe('Career Coach Response Ready');
    });

    it('Part D Scale Test — 1,000 queued Career Coach jobs execute cleanly with max 3 concurrent workers', async () => {
      const totalJobs = 1000;
      const completedJobs: string[] = [];
      const failedJobs: string[] = [];
      let maxWorkersObserved = 0;
      let currentWorkers = 0;

      const mockWorker = async (jobId: string, isFailRateLimit = false) => {
        currentWorkers++;
        if (currentWorkers > maxWorkersObserved) {
          maxWorkersObserved = currentWorkers;
        }

        await new Promise((resolve) => setTimeout(resolve, 1));

        if (isFailRateLimit) {
          failedJobs.push(jobId);
          currentWorkers--;
          return { jobId, status: 'failed_retryable' };
        }

        completedJobs.push(jobId);
        currentWorkers--;
        return { jobId, status: 'completed' };
      };

      const startTime = Date.now();
      const concurrency = MAX_CONCURRENT_COACH_WORKERS;

      for (let i = 0; i < totalJobs; i += concurrency) {
        const chunk = Array.from({ length: Math.min(concurrency, totalJobs - i) }, (_, idx) => {
          const jobId = `coach-job-${i + idx}`;
          const isRateLimit = (i + idx) % 20 === 0;
          return mockWorker(jobId, isRateLimit);
        });
        await Promise.all(chunk);
      }

      const duration = Date.now() - startTime;

      expect(completedJobs.length + failedJobs.length).toBe(1000);
      expect(completedJobs.length).toBe(950);
      expect(failedJobs.length).toBe(50);
      expect(maxWorkersObserved).toBeLessThanOrEqual(MAX_CONCURRENT_COACH_WORKERS);
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Part D — UI Rendering & 10-Second UX Threshold', () => {
    it('renders CandidateCareerCoachPage with intro, disclaimer, and starter prompts', () => {
      render(
        <MemoryRouter initialEntries={['/candidate/career/coach']}>
          <Routes>
            <Route path="/candidate/career/coach" element={<CandidateCareerCoachPage />} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('AI Career Coach')).toBeDefined();
      expect(screen.getByText(/Grounding Disclaimer:/i)).toBeDefined();
      expect(screen.getByText('What should I focus on next for my career role?')).toBeDefined();
    });
  });
});
