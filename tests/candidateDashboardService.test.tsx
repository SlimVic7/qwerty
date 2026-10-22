import { describe, it, expect, vi, beforeEach } from 'vitest';
import { candidateDashboardService } from '../src/features/dashboard/dashboard.service.js';

vi.mock('../src/lib/authFetch.js', () => ({
  authFetch: vi.fn()
}));

import { authFetch } from '../src/lib/authFetch.js';

describe('Candidate Dashboard Client Service (Stage 6.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls GET /api/candidate/dashboard and returns payload', async () => {
    const mockDashboard = {
      version: 'candidate-dashboard-v1',
      candidate: { id: 'user-1', display_name: 'Jane Doe' },
      profile_readiness: { profile_completed: true, cv_uploaded: true, profile_applied: true, ats_readiness: { available: true } },
      saved_jobs: { total: 2, recent: [] },
      job_alerts: { total: 1, active: 1, unique_matching_jobs_count: 3, recent: [] },
      recent_alignments: { total: 1, recent: [] },
      next_actions: [{ id: 'review_matches', title: 'Review matching jobs', description: 'desc', href: '/candidate/job-alerts', cta: 'View', priority: 4 }]
    };

    (authFetch as any).mockResolvedValueOnce(mockDashboard);

    const result = await candidateDashboardService.getDashboard();
    expect(authFetch).toHaveBeenCalledWith('/api/candidate/dashboard');
    expect(result.version).toBe('candidate-dashboard-v1');
    expect(result.candidate.display_name).toBe('Jane Doe');
    expect(result.saved_jobs.total).toBe(2);
    expect(result.job_alerts.unique_matching_jobs_count).toBe(3);
    expect(result.next_actions.length).toBe(1);
  });
});
