import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { candidateRouter } from '../server/routes/candidate.js';
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

describe('Job Alerts Candidate API Routes (Stage 6.3)', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/candidate', candidateRouter);

  beforeEach(() => {
    JobAlertsStore.clearFallbackStore();
    mockAuthenticatedUser = { id: '11111111-1111-4111-a111-111111111111', roles: ['candidate'] };
  });

  describe('Security & Access Controls', () => {
    it('rejects unauthenticated requests to job alerts with 401', async () => {
      const res = await request(app).get('/api/candidate/job-alerts');
      expect(res.status).toBe(401);
    });

    it('rejects non-candidate role with 403', async () => {
      mockAuthenticatedUser = { id: '11111111-1111-4111-a111-111111111111', roles: ['recruiter'] };
      const res = await request(app)
        .get('/api/candidate/job-alerts')
        .set('Authorization', 'Bearer valid-candidate-token');
      expect(res.status).toBe(403);
    });
  });

  describe('Alerts Endpoints', () => {
    it('POST /api/candidate/job-alerts creates alert (201)', async () => {
      const res = await request(app)
        .post('/api/candidate/job-alerts')
        .set('Authorization', 'Bearer valid-candidate-token')
        .send({
          name: 'Full Stack Engineer',
          keywords: 'React Node',
          location_query: 'London',
          workplace_type: 'hybrid',
          frequency: 'daily'
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Full Stack Engineer');
      expect(res.body.frequency).toBe('daily');
      expect(res.body.user_id).toBe(mockAuthenticatedUser.id);
    });

    it('POST /api/candidate/job-alerts rejects missing name with 400', async () => {
      const res = await request(app)
        .post('/api/candidate/job-alerts')
        .set('Authorization', 'Bearer valid-candidate-token')
        .send({
          name: '   '
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('INVALID_ALERT_NAME');
    });

    it('POST /api/candidate/job-alerts rejects instant frequency with 400', async () => {
      const res = await request(app)
        .post('/api/candidate/job-alerts')
        .set('Authorization', 'Bearer valid-candidate-token')
        .send({
          name: 'Instant Alert',
          frequency: 'instant'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('INVALID_FREQUENCY');
    });

    it('GET /api/candidate/job-alerts returns candidate alert list', async () => {
      await JobAlertsStore.createAlert(mockAuthenticatedUser.id, { name: 'First Alert' });
      await JobAlertsStore.createAlert(mockAuthenticatedUser.id, { name: 'Second Alert' });

      const res = await request(app)
        .get('/api/candidate/job-alerts')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(200);
      expect(res.body.alerts.length).toBe(2);
      expect(res.body.total).toBe(2);
    });

    it('GET /api/candidate/job-alerts/:alertId returns 400 for bad UUID and 404 for missing', async () => {
      const badRes = await request(app)
        .get('/api/candidate/job-alerts/invalid-uuid')
        .set('Authorization', 'Bearer valid-candidate-token');
      expect(badRes.status).toBe(400);

      const notFoundRes = await request(app)
        .get('/api/candidate/job-alerts/99999999-9999-4999-a999-999999999999')
        .set('Authorization', 'Bearer valid-candidate-token');
      expect(notFoundRes.status).toBe(404);
    });

    it('PATCH /api/candidate/job-alerts/:alertId updates alert', async () => {
      const alert = await JobAlertsStore.createAlert(mockAuthenticatedUser.id, { name: 'Original' });

      const res = await request(app)
        .patch(`/api/candidate/job-alerts/${alert.id}`)
        .set('Authorization', 'Bearer valid-candidate-token')
        .send({ name: 'Updated Name', is_active: false });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Name');
      expect(res.body.is_active).toBe(false);
    });

    it('DELETE /api/candidate/job-alerts/:alertId deletes alert', async () => {
      const alert = await JobAlertsStore.createAlert(mockAuthenticatedUser.id, { name: 'To Delete' });

      const res = await request(app)
        .delete(`/api/candidate/job-alerts/${alert.id}`)
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const list = await JobAlertsStore.listAlerts(mockAuthenticatedUser.id);
      expect(list.length).toBe(0);
    });

    it('GET /api/candidate/job-alerts/:alertId/matches returns matching jobs without match_score', async () => {
      const alert = await JobAlertsStore.createAlert(mockAuthenticatedUser.id, { name: 'React Dev' });

      const res = await request(app)
        .get(`/api/candidate/job-alerts/${alert.id}/matches`)
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(200);
      expect(res.body.alert.id).toBe(alert.id);
      expect(Array.isArray(res.body.matches)).toBe(true);
    });
  });
});
