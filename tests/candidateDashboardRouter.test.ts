import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { candidateRouter } from '../server/routes/candidate.js';
import { CandidateDashboardStore } from '../server/services/dashboard/candidateDashboardStore.js';
import { SavedJobsStore } from '../server/services/savedJobs/savedJobsStore.js';
import { JobAlertsStore } from '../server/services/jobAlerts/jobAlertsStore.js';

let mockAuthenticatedUser: any = { id: '11111111-1111-4111-a111-111111111111', roles: ['candidate'] };

vi.mock('../server/db/supabase.js', () => ({
  getAdminClient: () => null,
  getAuthClient: () => null
}));

vi.mock('../server/middleware/auth.js', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    if (req.headers.authorization === 'Bearer valid-candidate-token') {
      req.user = mockAuthenticatedUser;
      return next();
    }
    return res.status(401).json({ error: 'Not authenticated' });
  },
  requireRole: (roles: string[]) => (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const hasRole = req.user.roles.some((r: string) => roles.includes(r));
    if (!hasRole) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    return next();
  }
}));

describe('Candidate Dashboard API Endpoint (Stage 6.4)', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/candidate', candidateRouter);

  beforeEach(() => {
    CandidateDashboardStore.clearFallbackStore();
    JobAlertsStore.clearFallbackStore();
    mockAuthenticatedUser = { id: '11111111-1111-4111-a111-111111111111', roles: ['candidate'] };
  });

  describe('Security & Access Control', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/candidate/dashboard');
      expect(res.status).toBe(401);
    });

    it('rejects non-candidate roles with 403', async () => {
      mockAuthenticatedUser = { id: '11111111-1111-4111-a111-111111111111', roles: ['recruiter'] };
      const res = await request(app)
        .get('/api/candidate/dashboard')
        .set('Authorization', 'Bearer valid-candidate-token');
      expect(res.status).toBe(403);
    });

    it('ignores user_id in query string or body and strictly uses auth identity', async () => {
      const attackerId = '99999999-9999-4999-a999-999999999999';
      CandidateDashboardStore.setFallbackProfile(attackerId, {
        profile: { display_name: 'Attacker Profile' }
      });

      const res = await request(app)
        .get(`/api/candidate/dashboard?user_id=${attackerId}`)
        .set('Authorization', 'Bearer valid-candidate-token')
        .send({ user_id: attackerId });

      expect(res.status).toBe(200);
      expect(res.body.candidate.id).toBe(mockAuthenticatedUser.id);
      expect(res.body.candidate.display_name).not.toBe('Attacker Profile');
    });
  });

  describe('Dashboard Payload Aggregation', () => {
    it('GET /api/candidate/dashboard returns 200 with complete aggregated response', async () => {
      await SavedJobsStore.saveJob(mockAuthenticatedUser.id, '22222222-2222-4222-a222-222222222222');
      await JobAlertsStore.createAlert(mockAuthenticatedUser.id, { name: 'Full Stack Alert' });

      const res = await request(app)
        .get('/api/candidate/dashboard')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(200);
      expect(res.body.version).toBe('candidate-dashboard-v1');
      expect(res.body.candidate.id).toBe(mockAuthenticatedUser.id);
      expect(res.body.saved_jobs.total).toBe(1);
      expect(res.body.job_alerts.total).toBe(1);
      expect(Array.isArray(res.body.next_actions)).toBe(true);
      expect(res.body.next_actions.length).toBeLessThanOrEqual(3);
    });
  });
});
