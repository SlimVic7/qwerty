import { describe, it, expect, vi, beforeEach } from 'vitest';
import { savedJobsService, CURRENT_SAVED_JOBS_VERSION } from '../src/features/savedJobs/savedJobs.service.js';

vi.mock('../src/lib/authFetch.js', () => ({
  authFetch: vi.fn()
}));

import { authFetch } from '../src/lib/authFetch.js';

describe('Saved Jobs Client Service (Stage 6.1)', () => {
  const jobId = '22222222-2222-4222-a222-222222222222';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saveJob posts to candidate endpoint and returns result', async () => {
    const mockRes = { saved: true, saved_at: '2026-09-30T12:00:00Z', saved_job_id: 'save-123' };
    vi.mocked(authFetch).mockResolvedValueOnce(mockRes);

    const result = await savedJobsService.saveJob(jobId);
    expect(authFetch).toHaveBeenCalledWith(`/api/candidate/jobs/${jobId}/save`, {
      method: 'POST'
    });
    expect(result).toEqual(mockRes);
  });

  it('unsaveJob deletes to candidate endpoint and returns result', async () => {
    const mockRes = { saved: false };
    vi.mocked(authFetch).mockResolvedValueOnce(mockRes);

    const result = await savedJobsService.unsaveJob(jobId);
    expect(authFetch).toHaveBeenCalledWith(`/api/candidate/jobs/${jobId}/save`, {
      method: 'DELETE'
    });
    expect(result).toEqual(mockRes);
  });

  it('getSavedStatus fetches saved status', async () => {
    const mockRes = { saved: true, saved_at: '2026-09-30T12:00:00Z' };
    vi.mocked(authFetch).mockResolvedValueOnce(mockRes);

    const result = await savedJobsService.getSavedStatus(jobId);
    expect(authFetch).toHaveBeenCalledWith(`/api/candidate/jobs/${jobId}/saved-status`);
    expect(result.saved).toBe(true);
  });

  it('getSavedJobs requests paginated list', async () => {
    const mockRes = {
      version: CURRENT_SAVED_JOBS_VERSION,
      saved_jobs: [],
      total: 0,
      limit: 10,
      offset: 0
    };
    vi.mocked(authFetch).mockResolvedValueOnce(mockRes);

    const result = await savedJobsService.getSavedJobs(10, 0);
    expect(authFetch).toHaveBeenCalledWith('/api/candidate/saved-jobs?limit=10&offset=0');
    expect(result.total).toBe(0);
    expect(result.version).toBe('saved-jobs-v1');
  });
});
