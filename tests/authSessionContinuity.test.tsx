import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PublicLayout } from '../src/app/layouts/PublicLayout.js';
import { JobDetailPage } from '../src/features/jobs/JobDetailPage.js';
import { SaveJobButton } from '../src/features/savedJobs/SaveJobButton.js';
import * as authLib from '../src/lib/auth.js';
import * as jobsService from '../src/features/jobs/jobs.service.js';
import { savedJobsService } from '../src/features/savedJobs/savedJobs.service.js';

vi.mock('../src/lib/auth.js', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../src/features/jobs/jobs.service.js', () => ({
  getPublishedJobBySlug: vi.fn(),
}));

vi.mock('../src/features/savedJobs/savedJobs.service.js', () => ({
  savedJobsService: {
    getSavedStatus: vi.fn(),
    saveJob: vi.fn(),
    unsaveJob: vi.fn(),
    getSavedJobs: vi.fn(),
  },
  CURRENT_SAVED_JOBS_VERSION: 'saved-jobs-v1',
}));

// Mock child cards in JobDetailPage to isolate auth header and layout behavior
vi.mock('../src/features/matching/JobAlignmentCard.js', () => ({
  JobAlignmentCard: () => <div data-testid="job-alignment-card">Job Alignment Content</div>,
}));
vi.mock('../src/features/skillsGap/SkillsGapCard.js', () => ({
  SkillsGapCard: () => <div data-testid="skills-gap-card">Skills Gap Content</div>,
}));
vi.mock('../src/features/tailoring/CvTailoringCard.js', () => ({
  CvTailoringCard: () => <div data-testid="cv-tailoring-card">CV Tailoring Content</div>,
}));
vi.mock('../src/features/alignmentHistory/AlignmentHistoryCard.js', () => ({
  AlignmentHistoryCard: () => <div data-testid="alignment-history-card">Alignment History Content</div>,
}));

describe('QWERTY Stage 6.1 — Auth Session Continuity & Public Header Suite', () => {
  const mockJob = {
    id: '11111111-2222-3333-4444-555555555555',
    title: 'Staff Full-Stack Engineer',
    company_name: 'Acme Cloud',
    slug: 'staff-full-stack-engineer-acme',
    status: 'published',
    workplace_type: 'hybrid',
    employment_type: 'full_time',
    description: 'Lead next-generation platform development.',
    salary_min: 150000,
    salary_max: 180000,
    salary_currency: 'USD',
    salary_period: 'year',
    location_text: 'London, UK',
    country: 'United Kingdom',
    published_at: '2026-09-01T10:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(jobsService.getPublishedJobBySlug).mockResolvedValue(mockJob as any);
  });

  afterEach(() => {
    cleanup();
  });

  // A & B: Authenticated user on public Job Detail has authenticated header without Sign In/Get Started
  it('A & B: authenticated candidate on public Job Detail retains session and header does NOT show Sign In or Get Started', async () => {
    vi.mocked(authLib.useAuth).mockReturnValue({
      loading: false,
      session: { access_token: 'fake-jwt' } as any,
      user: { id: 'cand-123', email: 'candidate@qwerty.test' } as any,
      roles: ['candidate'],
    });

    vi.mocked(savedJobsService.getSavedStatus).mockResolvedValue({ saved: true, saved_job_id: 'sj-1' });

    render(
      <MemoryRouter initialEntries={['/jobs/staff-full-stack-engineer-acme']}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/jobs/:slug" element={<JobDetailPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Staff Full-Stack Engineer')).toBeDefined();
    });

    // Public Header MUST show authenticated candidate navigation
    expect(screen.getByText('Saved Jobs')).toBeDefined();
    expect(screen.getByText('Dashboard')).toBeDefined();
    expect(screen.getByText('Sign Out')).toBeDefined();

    // Public Header must NOT show anonymous Sign In / Get Started
    expect(screen.queryByText('Sign In')).toBeNull();
    expect(screen.queryByText('Get Started')).toBeNull();
  });

  // C: Logged-out user on same Job Detail shows Sign In and Get Started
  it('C: logged-out anonymous user on public Job Detail DOES show Sign In and Get Started in header', async () => {
    vi.mocked(authLib.useAuth).mockReturnValue({
      loading: false,
      session: null,
      user: null,
      roles: [],
    });

    render(
      <MemoryRouter initialEntries={['/jobs/staff-full-stack-engineer-acme']}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/jobs/:slug" element={<JobDetailPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Staff Full-Stack Engineer')).toBeDefined();
    });

    // Anonymous header controls present
    expect(screen.getByRole('link', { name: 'Sign In' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Get Started' })).toBeDefined();

    // Candidate private shortcuts absent
    expect(screen.queryByRole('link', { name: 'Saved Jobs' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Sign Out' })).toBeNull();
  });

  // D: Refresh persistence test (initial loading state -> session restored)
  it('D: displays neutral loading state on initial auth restoration without flashing logged-out controls', async () => {
    vi.mocked(authLib.useAuth).mockReturnValue({
      loading: true,
      session: null,
      user: null,
      roles: [],
    });

    render(
      <MemoryRouter initialEntries={['/jobs/staff-full-stack-engineer-acme']}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/jobs/:slug" element={<JobDetailPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    // During loading, neither Sign In / Get Started nor candidate private buttons should appear
    expect(screen.queryByText('Sign In')).toBeNull();
    expect(screen.queryByText('Get Started')).toBeNull();
    expect(screen.queryByText('Dashboard')).toBeNull();

    await waitFor(() => {
      expect(screen.getByText('Staff Full-Stack Engineer')).toBeDefined();
    });
  });

  // E: Existing saved job shows Saved state on Job Detail
  it('E: existing saved job resolves to Saved state on Job Detail for authenticated candidate', async () => {
    vi.mocked(authLib.useAuth).mockReturnValue({
      loading: false,
      session: { access_token: 'fake-jwt' } as any,
      user: { id: 'cand-123', email: 'candidate@qwerty.test' } as any,
      roles: ['candidate'],
    });

    vi.mocked(savedJobsService.getSavedStatus).mockResolvedValue({ saved: true, saved_job_id: 'sj-999' });

    render(
      <MemoryRouter initialEntries={['/jobs/staff-full-stack-engineer-acme']}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/jobs/:slug" element={<JobDetailPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Saved')).toBeDefined();
    });

    const button = screen.getByRole('button', { name: /Remove .* from saved jobs/i });
    expect(button).toBeDefined();
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });

  // F: Anonymous Save Job opens registration/sign-in gate modal with return destination
  it('F: anonymous Save Job click triggers registration gate modal with return destination', async () => {
    vi.mocked(authLib.useAuth).mockReturnValue({
      loading: false,
      session: null,
      user: null,
      roles: [],
    });

    render(
      <MemoryRouter initialEntries={['/jobs/staff-full-stack-engineer-acme']}>
        <SaveJobButton jobId={mockJob.id} jobTitle={mockJob.title} />
      </MemoryRouter>
    );

    const saveButton = screen.getByRole('button', { name: /Save Staff Full-Stack Engineer/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Save Jobs with QWERTY')).toBeDefined();
      expect(screen.getByText('Create Free Account')).toBeDefined();
    });

    // Ensure link contains returnTo parameter
    const createAccountLink = screen.getByRole('link', { name: /Create Free Account/i });
    expect(createAccountLink.getAttribute('href')).toContain('returnTo');
  });

  // G: Public job advert remains accessible without auth
  it('G: public job advert details, overview and description remain fully readable without authentication', async () => {
    vi.mocked(authLib.useAuth).mockReturnValue({
      loading: false,
      session: null,
      user: null,
      roles: [],
    });

    render(
      <MemoryRouter initialEntries={['/jobs/staff-full-stack-engineer-acme']}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/jobs/:slug" element={<JobDetailPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Staff Full-Stack Engineer')).toBeDefined();
      expect(screen.getByText('Acme Cloud')).toBeDefined();
      expect(screen.getByText('About the Role')).toBeDefined();
      expect(screen.getByText('Lead next-generation platform development.')).toBeDefined();
      expect(screen.getByText('Job Overview')).toBeDefined();
      expect(screen.getByText('Check Role Alignment')).toBeDefined();
    });
  });
});
