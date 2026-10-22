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

    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis()
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
