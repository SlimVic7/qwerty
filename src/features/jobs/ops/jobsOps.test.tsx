import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { JobsOpsList } from './JobsOpsList';
import { JobOpsEditor } from './JobOpsEditor';
import { JobOpsPreview } from './JobOpsPreview';
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
    publishJob: vi.fn(),
    unpublishJob: vi.fn(),
    closeJob: vi.fn(),
    archiveJob: vi.fn(),
    featureJob: vi.fn(),
    unfeatureJob: vi.fn(),
  }
}));

describe('Internal Job Management UX', () => {
  it('undefined ID causes no network call in preview', async () => {
    vi.mocked(jobsOpsService.getJob).mockClear();
    render(
      <MemoryRouter initialEntries={['/0ps26/jobs/undefined/preview']}>
        <Routes>
          <Route path="/0ps26/jobs/:id/preview" element={<JobOpsPreview />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Unable to determine this job record. Please return to the jobs list and try again.')).toBeDefined();
    });
    expect(jobsOpsService.getJob).not.toHaveBeenCalled();
  });

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
      { id: '12345678-1234-1234-1234-123456789012', title: 'Test Job', company_name: 'Test Co', status: 'draft' }
    ]);
    renderListWithRole('recruiter');
    await waitFor(() => {
      expect(screen.getByText('Test Job')).toBeDefined();
    });
    expect(screen.queryByText('New Job')).toBeNull();
    expect(screen.queryByText('Edit')).toBeNull();
  });

  it('editor can create draft and edit draft', async () => {
    vi.mocked(jobsOpsService.listJobs).mockResolvedValue([
      { id: '12345678-1234-1234-1234-123456789012', title: 'Test Job', company_name: 'Test Co', status: 'draft' }
    ]);
    renderListWithRole('editor');
    await waitFor(() => {
      expect(screen.getByText('New Job')).toBeDefined();
      expect(screen.getByText('Edit')).toBeDefined();
    });
  });

  it('super_admin clicking New Job resolves to /0ps26/jobs/new', async () => {
    vi.mocked(jobsOpsService.listJobs).mockResolvedValue([]);
    vi.mocked(useAuth).mockReturnValue({ roles: ['super_admin'], session: {} as any, loading: false } as any);
    
    render(
      <MemoryRouter initialEntries={['/0ps26/jobs']}>
        <Routes>
          <Route path="/0ps26/jobs" element={<JobsOpsList />} />
          <Route path="/0ps26/jobs/new" element={<div data-testid="new-job-page">New Job Page</div>} />
          <Route path="*" element={null} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('New Job')).toBeDefined();
    });
    const newJobLink = screen.getByText('New Job');
    expect(newJobLink.getAttribute('href')).toBe('/0ps26/jobs/new');
  });

  it('editor cannot publish or access lifecycle buttons', async () => {
    vi.mocked(jobsOpsService.getJob).mockResolvedValue({
      id: '12345678-1234-1234-1234-123456789012', title: 'Test Job', status: 'draft', company_name: 'Test Co'
    });
    renderEditorWithRole('editor');
    await waitFor(() => expect(screen.getByText('Edit Job: Test Job')).toBeDefined());
    expect(screen.queryByText('Publish Job')).toBeNull();
    expect(screen.queryByText('Archive Job')).toBeNull();
  });

  it('super_admin lifecycle: draft job -> Publish / Archive works', async () => {
    vi.mocked(jobsOpsService.getJob).mockResolvedValue({ id: '12345678-1234-1234-1234-123456789012', title: 'Draft Job', status: 'draft' });
    renderEditorWithRole('super_admin');
    await waitFor(() => expect(screen.getByText('Publish Job')).toBeDefined());
    expect(screen.getByText('Archive Job')).toBeDefined();
    expect(screen.queryByText('Close Job')).toBeNull();
    expect(screen.queryByText('Mark as Featured')).toBeNull();

    await fireEvent.click(screen.getByText('Publish Job'));
    await waitFor(() => expect(screen.getByText('publish Job?')).toBeDefined());
    await fireEvent.click(screen.getByText('publish Job'));
    expect(jobsOpsService.publishJob).toHaveBeenCalledWith('12345678-1234-1234-1234-123456789012');
    
  });

  it('super_admin lifecycle: published job -> Close / Feature / Unfeature / Unpublish works', async () => {
    vi.mocked(jobsOpsService.getJob).mockResolvedValue({ id: '12345678-1234-1234-1234-123456789012', title: 'Pub Job', status: 'published', featured: false });
    renderEditorWithRole('super_admin');
    await waitFor(() => expect(screen.getByText('Unpublish to Draft')).toBeDefined());
    expect(screen.getByText('Close Job')).toBeDefined();
    expect(screen.getByText('Mark as Featured')).toBeDefined();
    expect(screen.queryByText('Archive Job')).toBeNull();
    expect(screen.queryByText('Publish Job')).toBeNull();

    await fireEvent.click(screen.getByText('Close Job'));
    await waitFor(() => expect(screen.getByText('close Job?')).toBeDefined());
    await fireEvent.click(screen.getByText('close Job'));
    await waitFor(() => expect(jobsOpsService.closeJob).toHaveBeenCalledWith('12345678-1234-1234-1234-123456789012'));

    await fireEvent.click(screen.getByText('Mark as Featured'));
    await waitFor(() => expect(screen.getByText('feature Job?')).toBeDefined());
    await fireEvent.click(screen.getByText('feature Job'));
    await waitFor(() => expect(jobsOpsService.featureJob).toHaveBeenCalledWith('12345678-1234-1234-1234-123456789012'));

    await fireEvent.click(screen.getByText('Unpublish to Draft'));
    await waitFor(() => expect(screen.getByText('unpublish Job?')).toBeDefined());
    await fireEvent.click(screen.getByText('unpublish Job'));
    await waitFor(() => expect(jobsOpsService.unpublishJob).toHaveBeenCalledWith('12345678-1234-1234-1234-123456789012'));
  });

  it('super_admin lifecycle: closed job -> Archive works', async () => {
    vi.mocked(jobsOpsService.getJob).mockResolvedValue({ id: '12345678-1234-1234-1234-123456789012', title: 'Closed Job', status: 'closed' });
    renderEditorWithRole('super_admin');
    await waitFor(() => expect(screen.getByText('Archive Job')).toBeDefined());
    expect(screen.queryByText('Publish Job')).toBeNull();
    expect(screen.queryByText('Close Job')).toBeNull();

    await fireEvent.click(screen.getByText('Archive Job'));
    await waitFor(() => expect(screen.getByText('archive Job?')).toBeDefined());
    await fireEvent.click(screen.getByText('archive Job'));
    expect(jobsOpsService.archiveJob).toHaveBeenCalledWith('12345678-1234-1234-1234-123456789012');
  });


  it('archived job renders no lifecycle actions', async () => {
    vi.mocked(jobsOpsService.getJob).mockResolvedValue({ id: '12345678-1234-1234-1234-123456789012', title: 'Archived Job', status: 'archived' });
    renderEditorWithRole('super_admin');
    await waitFor(() => expect(screen.getByText('Archived (No actions available)')).toBeDefined());
    expect(screen.queryByText('Publish Job')).toBeNull();
    expect(screen.queryByText('Archive Job')).toBeNull();
  });

  it('Save Changes payload does NOT contain status, featured, or id', async () => {
    vi.mocked(jobsOpsService.getJob).mockResolvedValue({ id: '12345678-1234-1234-1234-123456789012', title: 'Draft Job', status: 'draft', featured: true });
    vi.mocked(jobsOpsService.updateDraft).mockResolvedValue({ id: '12345678-1234-1234-1234-123456789012', title: 'Draft Job Modified', status: 'draft', featured: true });
    
    renderEditorWithRole('super_admin');
    await waitFor(() => expect(screen.getByText('Edit Job: Draft Job')).toBeDefined());
    
    // Change a field
    fireEvent.change(document.querySelector('input[name="title"]')!, { target: { value: 'Draft Job Modified' } });
    
    await fireEvent.click(screen.getByText('Save Changes'));
    
    await waitFor(() => {
      expect(jobsOpsService.updateDraft).toHaveBeenCalled();
    });
    
    const patchPayload = vi.mocked(jobsOpsService.updateDraft).mock.calls[0][1];
    expect(patchPayload).not.toHaveProperty('status');
    expect(patchPayload).not.toHaveProperty('featured');
    expect(patchPayload).not.toHaveProperty('id');
    expect(patchPayload.title).toBe('Draft Job Modified');
  });

  it('successful PATCH preserves returned job.status and lifecycle buttons remain visible after editing a draft', async () => {
    vi.mocked(jobsOpsService.getJob).mockResolvedValue({ id: '12345678-1234-1234-1234-123456789012', title: 'Draft Job', status: 'draft' });
    vi.mocked(jobsOpsService.updateDraft).mockResolvedValue({ id: '12345678-1234-1234-1234-123456789012', title: 'Draft Job Modified', status: 'draft' });
    
    renderEditorWithRole('super_admin');
    await waitFor(() => expect(screen.getByText('Publish Job')).toBeDefined());
    
    fireEvent.change(document.querySelector('input[name="title"]')!, { target: { value: 'Draft Job Modified' } });
    
    await fireEvent.click(screen.getByText('Save Changes'));
    
    await waitFor(() => {
      expect(screen.getByText('Saved successfully')).toBeDefined();
    });
    
    // Lifecycle buttons should still be there because status='draft' was preserved
    expect(screen.getByText('Publish Job')).toBeDefined();
    expect(screen.getByText('Archive Job')).toBeDefined();
  });

  it('successful create returns draft and renders draft lifecycle actions', async () => {
    vi.mocked(useAuth).mockReturnValue({ roles: ['super_admin'], session: {} as any, loading: false } as any);
    vi.mocked(jobsOpsService.createDraft).mockResolvedValue({ id: '12345678-1234-1234-1234-123456789012', title: 'New Job', status: 'draft' });
    
    render(
      <MemoryRouter initialEntries={['/0ps26/jobs/new']}>
        <Routes>
          <Route path="/0ps26/jobs/new" element={<JobOpsEditor />} />
          <Route path="/0ps26/jobs/:id/edit" element={<JobOpsEditor />} />
        </Routes>
      </MemoryRouter>
    );
    
    await waitFor(() => expect(screen.getByText('New Job')).toBeDefined());
    
    fireEvent.change(document.querySelector('input[name="title"]')!, { target: { value: 'New Job' } });
    fireEvent.change(document.querySelector('input[name="company_name"]')!, { target: { value: 'Company' } });
    fireEvent.change(document.querySelector('textarea[name="description"]')!, { target: { value: 'Desc' } });
    
    await fireEvent.click(screen.getByText('Save Changes'));
    
    await waitFor(() => {
      expect(screen.getByText('Created successfully')).toBeDefined();
    });
    
    vi.mocked(jobsOpsService.getJob).mockResolvedValue({ id: 'new-uuid-1234-5678-9012-345678901234', title: 'New Job', status: 'draft' });
    // it navigates and rerenders the new route
    await waitFor(() => expect(screen.getByText('Publish Job')).toBeDefined());
  });

  it('lifecycle buttons remain correct after PATCH refresh', async () => {
    vi.mocked(jobsOpsService.getJob).mockResolvedValue({ id: '12345678-1234-1234-1234-123456789012', title: 'Pub Job', status: 'published' });
    vi.mocked(jobsOpsService.updateDraft).mockResolvedValue({ id: '12345678-1234-1234-1234-123456789012', title: 'Pub Job Mod', status: 'published' });
    
    renderEditorWithRole('super_admin');
    await waitFor(() => expect(screen.getByText('Unpublish to Draft')).toBeDefined());
    
    await fireEvent.click(screen.getByText('Save Changes'));
    
    await waitFor(() => {
      expect(screen.getByText('Saved successfully')).toBeDefined();
    });
    
    expect(screen.getByText('Unpublish to Draft')).toBeDefined();
  });

  it('super_admin lifecycle: handles API failure and alerts user visibly', async () => {
    vi.mocked(jobsOpsService.getJob).mockResolvedValue({ id: '12345678-1234-1234-1234-123456789012', title: 'Draft Job', status: 'draft' });
    vi.mocked(jobsOpsService.publishJob).mockRejectedValue(new Error('Backend error'));
    
    
    renderEditorWithRole('super_admin');
    await waitFor(() => expect(screen.getByText('Publish Job')).toBeDefined());

    await fireEvent.click(screen.getByText('Publish Job'));
    await waitFor(() => expect(screen.getByText('publish Job?')).toBeDefined());
    await fireEvent.click(screen.getByText('publish Job'));
    await waitFor(() => {
      expect(screen.getByText('Backend error')).toBeDefined();
    });
  });

  it('Stage 2.2: /new does not show lifecycle controls before persistence', async () => {
    vi.mocked(useAuth).mockReturnValue({ roles: ['super_admin'], session: {} as any, loading: false } as any);
    render(
      <MemoryRouter initialEntries={['/0ps26/jobs/new']}>
        <Routes>
          <Route path="/0ps26/jobs/new" element={<JobOpsEditor />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('New Job')).toBeDefined());
    expect(screen.queryByText('Publishing & Lifecycle')).toBeNull();
    expect(screen.queryByText('Publish Job')).toBeNull();
  });

  it('Stage 2.2: successful create navigates to /:id/edit and draft shows Publish + Archive', async () => {
    const validUUID = '12345678-1234-1234-1234-123456789012';
    vi.mocked(useAuth).mockReturnValue({ roles: ['super_admin'], session: {} as any, loading: false } as any);
    vi.mocked(jobsOpsService.createDraft).mockResolvedValue({ id: validUUID, title: 'Test Title', status: 'draft' });
    vi.mocked(jobsOpsService.getJob).mockResolvedValue({ id: validUUID, title: 'Test Title', status: 'draft' });

    let currentLocation = '';
    const LocationDisplay = () => {
      const location = require('react-router-dom').useLocation();
      currentLocation = location.pathname;
      return null;
    };

    render(
      <MemoryRouter initialEntries={['/0ps26/jobs/new']}>
        <LocationDisplay />
        <Routes>
          <Route path="/0ps26/jobs/new" element={<JobOpsEditor />} />
          <Route path="/0ps26/jobs/:id/edit" element={<JobOpsEditor />} />
        </Routes>
      </MemoryRouter>
    );
    
    await waitFor(() => expect(screen.getByText('New Job')).toBeDefined());
    expect(screen.queryByText('Publish Job')).toBeNull();
    
    // Fill out form
    fireEvent.change(document.querySelector('input[name="title"]')!, { target: { value: 'Test Title' } });
    fireEvent.change(document.querySelector('input[name="company_name"]')!, { target: { value: 'Test Co' } });
    fireEvent.change(document.querySelector('textarea[name="description"]')!, { target: { value: 'Desc' } });
    
    fireEvent.click(screen.getByText('Save Changes'));
    
    await waitFor(() => {
      expect(currentLocation).toBe(`/0ps26/jobs/${validUUID}/edit`);
    });
    
    // It should now render the edit page and show Publish / Archive
    await waitFor(() => {
      expect(screen.getByText('Publish Job')).toBeDefined();
      expect(screen.getByText('Archive Job')).toBeDefined();
    });
  });

  it('Stage 2.2: candidate + super_admin roles still show admin lifecycle controls', async () => {
    const validUUID = '12345678-1234-1234-1234-123456789012';
    vi.mocked(useAuth).mockReturnValue({ roles: ['candidate', 'super_admin'], session: {} as any, loading: false } as any);
    vi.mocked(jobsOpsService.getJob).mockResolvedValue({ id: validUUID, title: 'Test Title', status: 'draft' });

    render(
      <MemoryRouter initialEntries={[`/0ps26/jobs/${validUUID}/edit`]}>
        <Routes>
          <Route path="/0ps26/jobs/:id/edit" element={<JobOpsEditor />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('Publishing & Lifecycle')).toBeDefined());
    expect(screen.getByText('Publish Job')).toBeDefined();
  });

  it('Stage 2.2: candidate-only does not show lifecycle panel', async () => {
    const validUUID = '12345678-1234-1234-1234-123456789012';
    vi.mocked(useAuth).mockReturnValue({ roles: ['candidate'], session: {} as any, loading: false } as any);
    vi.mocked(jobsOpsService.getJob).mockResolvedValue({ id: validUUID, title: 'Test Title', status: 'draft' });

    render(
      <MemoryRouter initialEntries={[`/0ps26/jobs/${validUUID}/edit`]}>
        <Routes>
          <Route path="/0ps26/jobs/:id/edit" element={<JobOpsEditor />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.queryByText('Publishing & Lifecycle')).toBeNull());
  });

  it('Stage 2.2: missing status does not silently masquerade as a valid job', async () => {
    const validUUID = '12345678-1234-1234-1234-123456789012';
    vi.mocked(useAuth).mockReturnValue({ roles: ['super_admin'], session: {} as any, loading: false } as any);
    // Returning job with missing status
    vi.mocked(jobsOpsService.getJob).mockResolvedValue({ id: validUUID, title: 'Test Title' });

    render(
      <MemoryRouter initialEntries={[`/0ps26/jobs/${validUUID}/edit`]}>
        <Routes>
          <Route path="/0ps26/jobs/:id/edit" element={<JobOpsEditor />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByDisplayValue('Test Title')).toBeDefined());
    // The panel should not be there because status is undefined
    expect(screen.queryByText('Publishing & Lifecycle')).toBeNull();
  });

});
