import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { JobsOpsList } from './JobsOpsList';
import { JobOpsEditor } from './JobOpsEditor';
import { jobsOpsService } from './jobsOps.service';
import { useAuth } from '../../../lib/auth.js';

vi.mock('../../../lib/auth.js', () => ({
  useAuth: vi.fn()
}));

vi.mock('./jobsOps.service', () => ({
  jobsOpsService: {
    listJobs: vi.fn(),
    getJob: vi.fn(),
    createDraft: vi.fn(),
    updateDraft: vi.fn(),
    publish: vi.fn(),
    unpublish: vi.fn(),
    close: vi.fn(),
    archive: vi.fn(),
    feature: vi.fn(),
    unfeature: vi.fn(),
  }
}));

describe('Internal Job Management UX', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const renderListWithRole = (role: string) => {
    vi.mocked(useAuth).mockReturnValue({ roles: [role], session: {} as any, loading: false } as any);
    return render(<MemoryRouter><JobsOpsList /></MemoryRouter>);
  };

  const renderEditorWithRole = (role: string) => {
    vi.mocked(useAuth).mockReturnValue({ roles: [role], session: {} as any, loading: false } as any);
    return render(
      <MemoryRouter initialEntries={['/0ps26/jobs/1/edit']}>
        <Routes>
          <Route path="/0ps26/jobs/:id/edit" element={<JobOpsEditor />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('recruiter can view but cannot mutate', async () => {
    vi.mocked(jobsOpsService.listJobs).mockResolvedValue([
      { id: '1', title: 'Test Job', company_name: 'Test Co', status: 'draft' }
    ]);
    renderListWithRole('recruiter');

    await waitFor(() => {
      expect(screen.getByText('Test Job')).toBeDefined();
    });

    // New Job button should NOT be visible
    expect(screen.queryByText('New Job')).toBeNull();
    // Edit link should NOT be visible
    expect(screen.queryByText('Edit')).toBeNull();
    expect(screen.getByText('View Only')).toBeDefined();
  });

  it('editor can create draft and edit draft', async () => {
    vi.mocked(jobsOpsService.listJobs).mockResolvedValue([
      { id: '1', title: 'Test Job', company_name: 'Test Co', status: 'draft' }
    ]);
    renderListWithRole('editor');

    await waitFor(() => {
      expect(screen.getByText('New Job')).toBeDefined();
      expect(screen.getByText('Edit')).toBeDefined();
    });
  });

  it('admin can publish and manage lifecycle', async () => {
    vi.mocked(jobsOpsService.getJob).mockResolvedValue({
      id: '1', title: 'Test Job', status: 'draft', company_name: 'Test Co'
    });
    renderEditorWithRole('admin');

    await waitFor(() => {
      expect(screen.getByText('Publish Job')).toBeDefined();
      expect(screen.getByText('Archive Job')).toBeDefined();
      expect(screen.getByText('Close Job')).toBeDefined();
    });
  });

  it('editor cannot publish', async () => {
    vi.mocked(jobsOpsService.getJob).mockResolvedValue({
      id: '1', title: 'Test Job', status: 'draft', company_name: 'Test Co'
    });
    renderEditorWithRole('editor');

    await waitFor(() => {
      expect(screen.getByText('Edit Job: Test Job')).toBeDefined();
    });

    expect(screen.queryByText('Publish Job')).toBeNull();
    expect(screen.queryByText('Archive Job')).toBeNull();
  });
});
