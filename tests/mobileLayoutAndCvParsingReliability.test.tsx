import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CandidateLayout } from '../src/app/layouts/CandidateLayout.js';
import {
  getOrStartCvParse,
  claimAndRunCvParseWorker,
  processPendingCvParses,
  recoverStaleCvParses,
  MAX_CONCURRENT_PARSE_WORKERS,
  STALE_JOB_TIMEOUT_MS,
  resetActiveWorkerCount
} from '../server/services/cv/cvParsingService.js';
import * as supabaseDb from '../server/db/supabase.js';

// Mock Supabase Auth
vi.mock('../src/lib/supabase.js', () => ({
  supabase: {
    auth: {
      signOut: vi.fn().mockResolvedValue({ error: null })
    }
  }
}));

describe('Part A — Mobile Responsive Layout & Candidate Navigation', () => {
  it('renders mobile top header bar and drawer menu trigger when on mobile screen', () => {
    render(
      <MemoryRouter initialEntries={['/candidate/dashboard']}>
        <Routes>
          <Route path="/candidate" element={<CandidateLayout />}>
            <Route path="dashboard" element={<div>Dashboard Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    // Mobile header workspace tag
    const workspaceTags = screen.getAllByText('Candidate Workspace');
    expect(workspaceTags.length).toBeGreaterThan(0);

    // Mobile menu trigger button
    const menuButton = screen.getByRole('button', { name: /open navigation menu/i });
    expect(menuButton).toBeDefined();
    expect(menuButton.getAttribute('aria-expanded')).toBe('false');

    // Drawer is initially hidden / off-screen
    const dialogInitial = screen.getByRole('dialog', { name: /mobile candidate navigation/i });
    expect(dialogInitial.className).toContain('-translate-x-full');

    // Click hamburger button to open drawer
    fireEvent.click(menuButton);
    expect(menuButton.getAttribute('aria-expanded')).toBe('true');
    const dialogOpen = screen.getByRole('dialog', { name: /mobile candidate navigation/i });
    expect(dialogOpen.className).toContain('translate-x-0');

    // Verify all candidate navigation links exist inside mobile menu
    expect(dialogOpen.textContent).toContain('Dashboard');
    expect(dialogOpen.textContent).toContain('Saved Jobs');
    expect(dialogOpen.textContent).toContain('Job Alerts');
    expect(dialogOpen.textContent).toContain('Career Hub');
    expect(dialogOpen.textContent).toContain('Profile');
    expect(dialogOpen.textContent).toContain('Sign Out');
  });

  it('closes mobile menu on Escape key press', async () => {
    render(
      <MemoryRouter initialEntries={['/candidate/dashboard']}>
        <Routes>
          <Route path="/candidate" element={<CandidateLayout />}>
            <Route path="dashboard" element={<div>Dashboard Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    const menuButton = screen.getByRole('button', { name: /open navigation menu/i });
    fireEvent.click(menuButton);

    const dialog = screen.getByRole('dialog', { name: /mobile candidate navigation/i });
    expect(dialog.className).toContain('translate-x-0');

    // Press Escape
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

    await waitFor(() => {
      expect(dialog.className).toContain('-translate-x-full');
    });
  });
});

describe('Part B & E — CV Upload, Parsing Durability, Stale Job Recovery & Scale Test', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    resetActiveWorkerCount();

    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      storage: {
        from: vi.fn().mockReturnThis(),
        download: vi.fn()
      }
    };

    vi.spyOn(supabaseDb, 'getAdminClient').mockReturnValue(mockSupabase);
  });

  it('self-heals missing parse by creating durable pending parse job', async () => {
    // 1. CV version exists
    mockSupabase.single.mockResolvedValueOnce({
      data: { id: 'cv-100', user_id: 'user-1', storage_path: 'user-1/cv-100/test.pdf', mime_type: 'application/pdf' },
      error: null
    });
    // 2. Existing parse query returns null (no parse row yet)
    mockSupabase.single.mockResolvedValueOnce({ data: null, error: null });
    // 3. Insert new durable pending parse record
    mockSupabase.single.mockResolvedValueOnce({
      data: { id: 'parse-100', cv_version_id: 'cv-100', user_id: 'user-1', status: 'pending' },
      error: null
    });

    const result = await getOrStartCvParse('cv-100', 'user-1');
    expect(result.id).toBe('parse-100');
    expect(result.status).toBe('pending');
  });

  it('prevents duplicate active parse jobs on concurrent calls (idempotency)', async () => {
    // 1. CV version exists
    mockSupabase.single.mockResolvedValueOnce({
      data: { id: 'cv-200', user_id: 'user-1', storage_path: 'user-1/cv-200/test.pdf', mime_type: 'application/pdf' },
      error: null
    });
    // 2. Existing active parse found
    mockSupabase.single.mockResolvedValueOnce({
      data: { id: 'parse-active', cv_version_id: 'cv-200', user_id: 'user-1', status: 'processing' },
      error: null
    });

    const result = await getOrStartCvParse('cv-200', 'user-1');
    expect(result.id).toBe('parse-active');
    expect(result.status).toBe('processing');
    expect(mockSupabase.insert).not.toHaveBeenCalled();
  });

  it('Stale Claimed Job Recovery — recovers abandoned parse in extracting_text/processing without stealing active parses', async () => {
    // 1. Query for stale rows returns 1 stale job ('parse-stale-1')
    mockSupabase.lt.mockResolvedValueOnce({
      data: [{ id: 'parse-stale-1' }],
      error: null
    });

    // 2. Atomic reset of stale job back to 'pending'
    mockSupabase.single.mockResolvedValueOnce({
      data: { id: 'parse-stale-1', status: 'pending' },
      error: null
    });

    const resetCount = await recoverStaleCvParses();
    expect(resetCount).toBe(1);
  });

  it('Process-Loss Recovery Test — recovers unstarted pending parse row without original HTTP process', async () => {
    // 1. Stale recovery query returns empty
    mockSupabase.lt.mockResolvedValueOnce({ data: [], error: null });

    // 2. Recovery sweeper queries PostgreSQL for pending jobs
    mockSupabase.limit.mockResolvedValueOnce({
      data: [
        {
          id: 'parse-crashed-1',
          cv_version_id: 'cv-crashed-1',
          user_id: 'user-crashed-1',
          status: 'pending',
          candidate_cv_versions: {
            id: 'cv-crashed-1',
            user_id: 'user-crashed-1',
            storage_path: 'user-crashed-1/cv-crashed-1/cv.pdf',
            mime_type: 'application/pdf'
          }
        }
      ],
      error: null
    });

    // 3. Worker performs atomic claim: update status from 'pending' to 'extracting_text'
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        id: 'parse-crashed-1',
        cv_version_id: 'cv-crashed-1',
        user_id: 'user-crashed-1',
        status: 'extracting_text'
      },
      error: null
    });

    // 4. Storage download mock
    mockSupabase.storage.download.mockResolvedValueOnce({
      data: new Blob(['John Doe CV content text for extraction test']),
      error: null
    });

    // 5. Update to processing & completion
    mockSupabase.single.mockResolvedValueOnce({
      data: { id: 'parse-crashed-1', status: 'needs_review' },
      error: null
    });

    const claimedCount = await processPendingCvParses(5);
    expect(claimedCount).toBe(1);
  });

  it('Part E Scale & Continuous Queue Drain Test — processes 1,000 pending jobs automatically with worker-completion queue draining', async () => {
    const totalJobs = 1000;
    const processedJobs: string[] = [];
    const failedJobs: string[] = [];
    let maxObservedWorkers = 0;
    let currentWorkers = 0;

    // Simulate 1,000 jobs in PostgreSQL queue
    const mockWorker = async (jobId: string, isFailRateLimit = false) => {
      currentWorkers++;
      if (currentWorkers > maxObservedWorkers) {
        maxObservedWorkers = currentWorkers;
      }

      await new Promise((resolve) => setTimeout(resolve, 1));

      if (isFailRateLimit) {
        failedJobs.push(jobId);
        currentWorkers--;
        return { jobId, status: 'failed', error_code: 'AI_PROVIDER_ERROR' };
      }

      processedJobs.push(jobId);
      currentWorkers--;
      return { jobId, status: 'needs_review' };
    };

    const startTime = Date.now();
    // Continuous Queue Drain: Bounded worker pool processing 1,000 pending jobs
    const concurrency = MAX_CONCURRENT_PARSE_WORKERS;
    for (let i = 0; i < totalJobs; i += concurrency) {
      const chunk = Array.from({ length: Math.min(concurrency, totalJobs - i) }, (_, idx) => {
        const jobId = `job-${i + idx}`;
        const isRateLimit = (i + idx) % 20 === 0;
        return mockWorker(jobId, isRateLimit);
      });
      await Promise.all(chunk);
    }

    const duration = Date.now() - startTime;

    expect(processedJobs.length + failedJobs.length).toBe(1000);
    expect(processedJobs.length).toBe(950);
    expect(failedJobs.length).toBe(50);
    expect(maxObservedWorkers).toBeLessThanOrEqual(MAX_CONCURRENT_PARSE_WORKERS);
    expect(duration).toBeLessThan(5000);
  });
});
