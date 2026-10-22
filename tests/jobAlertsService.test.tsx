import { describe, it, expect, vi, beforeEach } from 'vitest';
import { jobAlertsService } from '../src/features/jobAlerts/jobAlerts.service.js';

vi.mock('../src/lib/authFetch.js', () => ({
  authFetch: vi.fn()
}));

import { authFetch } from '../src/lib/authFetch.js';

describe('Job Alerts Service Client Unit Tests (Stage 6.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls GET /api/candidate/job-alerts when fetching alerts', async () => {
    const mockResponse = { alerts: [{ id: 'alert-1', name: 'React Lead' }], total: 1 };
    (authFetch as any).mockResolvedValueOnce(mockResponse);

    const result = await jobAlertsService.getAlerts();
    expect(authFetch).toHaveBeenCalledWith('/api/candidate/job-alerts');
    expect(result.alerts.length).toBe(1);
    expect(result.alerts[0].name).toBe('React Lead');
  });

  it('calls POST /api/candidate/job-alerts when creating an alert', async () => {
    const mockInput = { name: 'Backend Lead', frequency: 'daily' as const };
    (authFetch as any).mockResolvedValueOnce({ id: 'alert-2', ...mockInput });

    const result = await jobAlertsService.createAlert(mockInput);
    expect(authFetch).toHaveBeenCalledWith('/api/candidate/job-alerts', {
      method: 'POST',
      body: JSON.stringify(mockInput)
    });
    expect(result.id).toBe('alert-2');
  });

  it('calls PATCH /api/candidate/job-alerts/:id when toggling an alert', async () => {
    (authFetch as any).mockResolvedValueOnce({ id: 'alert-1', is_active: false });

    const result = await jobAlertsService.toggleAlert('alert-1', false);
    expect(authFetch).toHaveBeenCalledWith('/api/candidate/job-alerts/alert-1', {
      method: 'PATCH',
      body: JSON.stringify({ is_active: false })
    });
    expect(result.is_active).toBe(false);
  });

  it('calls DELETE /api/candidate/job-alerts/:id when deleting an alert', async () => {
    (authFetch as any).mockResolvedValueOnce({ success: true, message: 'Deleted' });

    const result = await jobAlertsService.deleteAlert('alert-1');
    expect(authFetch).toHaveBeenCalledWith('/api/candidate/job-alerts/alert-1', {
      method: 'DELETE'
    });
    expect(result.success).toBe(true);
  });

  it('calls GET /api/candidate/job-alerts/:id/matches when fetching matches', async () => {
    (authFetch as any).mockResolvedValueOnce({ version: 'job-alerts-v1', matches: [], total: 0 });

    const result = await jobAlertsService.getAlertMatches('alert-1', 10);
    expect(authFetch).toHaveBeenCalledWith('/api/candidate/job-alerts/alert-1/matches?limit=10');
    expect(result.total).toBe(0);
  });
});
