import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { isCvTailoringPublicEnabled } from '../server/config/featureFlags.js';
import { CvTailoringStore } from '../server/services/cvTailoring/cvTailoringStore.js';
import { CvTailoringEngine } from '../server/services/cvTailoring/cvTailoringEngine.js';
import { CURRENT_TAILORING_ENGINE_VERSION } from '../server/services/cvTailoring/types.js';
import { CURRENT_JOB_ALIGNMENT_RULESET_VERSION } from '../server/services/matching/jobAlignment.js';

// Setup Mock Auth Middleware before importing candidateRouter
vi.mock('../server/middleware/auth.js', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    if (req.headers.authorization === 'Bearer valid-candidate-token') {
      req.user = { id: 'candidate-gate-test', roles: ['candidate'] };
      return next();
    }
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  },
  requireRole: (allowedRoles: string[]) => (req: any, res: any, next: any) => {
    if (!req.user || !allowedRoles.some(r => req.user.roles?.includes(r))) {
      return res.status(403).json({ error: 'INSUFFICIENT_PERMISSIONS' });
    }
    return next();
  }
}));

// Now import candidateRouter with mocked auth middleware
const { candidateRouter } = await import('../server/routes/candidate.js');

describe('Stage 5.2 — Public Coming Soon Feature Gate & Regression Protection', () => {
  const originalEnv = process.env.CV_TAILORING_PUBLIC_ENABLED;
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/candidate', candidateRouter);
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.CV_TAILORING_PUBLIC_ENABLED = originalEnv;
    } else {
      delete process.env.CV_TAILORING_PUBLIC_ENABLED;
    }
    vi.restoreAllMocks();
  });

  it('A: flag absent -> defaults OFF (false)', () => {
    delete process.env.CV_TAILORING_PUBLIC_ENABLED;
    expect(isCvTailoringPublicEnabled()).toBe(false);
  });

  it('B: flag explicitly false -> returns false', () => {
    process.env.CV_TAILORING_PUBLIC_ENABLED = 'false';
    expect(isCvTailoringPublicEnabled()).toBe(false);

    process.env.CV_TAILORING_PUBLIC_ENABLED = '0';
    expect(isCvTailoringPublicEnabled()).toBe(false);

    process.env.CV_TAILORING_PUBLIC_ENABLED = 'no';
    expect(isCvTailoringPublicEnabled()).toBe(false);
  });

  it('C: flag explicitly true -> returns true', () => {
    process.env.CV_TAILORING_PUBLIC_ENABLED = 'true';
    expect(isCvTailoringPublicEnabled()).toBe(true);

    process.env.CV_TAILORING_PUBLIC_ENABLED = 'TRUE ';
    expect(isCvTailoringPublicEnabled()).toBe(true);
  });

  it('D: flag false -> POST /jobs/:jobId/tailoring returns 403 FEATURE_NOT_AVAILABLE', async () => {
    process.env.CV_TAILORING_PUBLIC_ENABLED = 'false';

    const createSessionSpy = vi.spyOn(CvTailoringStore, 'createSession');
    const executeTailoringSpy = vi.spyOn(CvTailoringEngine, 'executeTailoring');

    const res = await request(app)
      .post('/api/candidate/jobs/job-gate-1/tailoring')
      .set('Authorization', 'Bearer valid-candidate-token')
      .send({});

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FEATURE_NOT_AVAILABLE');
    expect(res.body.message).toBe('AI CV Tailoring is coming soon.');

    // E: Zero Gemini provider execution
    expect(executeTailoringSpy).not.toHaveBeenCalled();

    // F: Zero DB tailoring session created
    expect(createSessionSpy).not.toHaveBeenCalled();
  });

  it('E: flag false -> PATCH /tailoring/:sessionId/suggestions/:suggestionId returns 403 FEATURE_NOT_AVAILABLE', async () => {
    process.env.CV_TAILORING_PUBLIC_ENABLED = 'false';

    const res = await request(app)
      .patch('/api/candidate/tailoring/sess-1/suggestions/sug-1')
      .set('Authorization', 'Bearer valid-candidate-token')
      .send({ action: 'accept' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FEATURE_NOT_AVAILABLE');
    expect(res.body.message).toBe('AI CV Tailoring is coming soon.');
  });

  it('F: flag false -> POST /tailoring/:sessionId/finalize returns 403 FEATURE_NOT_AVAILABLE', async () => {
    process.env.CV_TAILORING_PUBLIC_ENABLED = 'false';

    const res = await request(app)
      .post('/api/candidate/tailoring/sess-1/finalize')
      .set('Authorization', 'Bearer valid-candidate-token')
      .send({});

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FEATURE_NOT_AVAILABLE');
    expect(res.body.message).toBe('AI CV Tailoring is coming soon.');
  });

  it('G: flag false -> GET /jobs/:jobId/tailoring reports is_public_enabled = false while preserving historical session read access', async () => {
    process.env.CV_TAILORING_PUBLIC_ENABLED = 'false';

    vi.spyOn(CvTailoringStore, 'getLatestSession').mockResolvedValueOnce({
      id: 'sess-hist-1',
      user_id: 'candidate-gate-test',
      job_id: 'job-gate-1',
      cv_version_id: 'cv-1',
      parse_id: 'parse-1',
      alignment_id: 'align-1',
      status: 'completed',
      tailoring_status: 'draft',
      tailoring_engine_version: CURRENT_TAILORING_ENGINE_VERSION,
      source_alignment_ruleset: CURRENT_JOB_ALIGNMENT_RULESET_VERSION,
      job_updated_at: new Date().toISOString(),
      candidate_applied_at: new Date().toISOString(),
      job_title: 'Network Engineer',
      company_name: 'Apex Systems',
      evidence_manifest: [],
      suggestions: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    const res = await request(app)
      .get('/api/candidate/jobs/job-gate-1/tailoring')
      .set('Authorization', 'Bearer valid-candidate-token');

    expect(res.status).toBe(200);
    expect(res.body.is_public_enabled).toBe(false);
    expect(res.body.session).toBeDefined();
    expect(res.body.session.id).toBe('sess-hist-1');
  });

  it('H: flag true -> GET /jobs/:jobId/tailoring reports is_public_enabled = true', async () => {
    process.env.CV_TAILORING_PUBLIC_ENABLED = 'true';

    vi.spyOn(CvTailoringStore, 'getLatestSession').mockResolvedValueOnce(null);

    const res = await request(app)
      .get('/api/candidate/jobs/job-gate-1/tailoring')
      .set('Authorization', 'Bearer valid-candidate-token');

    expect(res.status).toBe(200);
    expect(res.body.is_public_enabled).toBe(true);
  });

  it('I: flag false -> GET /tailoring/:sessionId allows historical read-only access', async () => {
    process.env.CV_TAILORING_PUBLIC_ENABLED = 'false';

    vi.spyOn(CvTailoringStore, 'getSession').mockResolvedValueOnce({
      id: 'sess-hist-readonly',
      user_id: 'candidate-gate-test',
      job_id: 'job-gate-1',
      cv_version_id: 'cv-1',
      parse_id: 'parse-1',
      alignment_id: 'align-1',
      status: 'completed',
      tailoring_status: 'draft',
      tailoring_engine_version: CURRENT_TAILORING_ENGINE_VERSION,
      source_alignment_ruleset: CURRENT_JOB_ALIGNMENT_RULESET_VERSION,
      job_updated_at: new Date().toISOString(),
      candidate_applied_at: new Date().toISOString(),
      job_title: 'Network Engineer',
      company_name: 'Apex Systems',
      evidence_manifest: [],
      suggestions: [],
      draft_data: {} as any,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    const res = await request(app)
      .get('/api/candidate/tailoring/sess-hist-readonly')
      .set('Authorization', 'Bearer valid-candidate-token');

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('sess-hist-readonly');
    expect(res.body.status).toBe('completed');
  });

  it('J: flag false -> GET /tailoring lists candidate historical tailoring sessions', async () => {
    process.env.CV_TAILORING_PUBLIC_ENABLED = 'false';

    vi.spyOn(CvTailoringStore, 'listForCandidate').mockResolvedValueOnce([
      {
        id: 'sess-hist-list-1',
        user_id: 'candidate-gate-test',
        job_id: 'job-gate-1',
        cv_version_id: 'cv-1',
        parse_id: 'parse-1',
        alignment_id: 'align-1',
        status: 'completed',
        tailoring_status: 'draft',
        tailoring_engine_version: CURRENT_TAILORING_ENGINE_VERSION,
        source_alignment_ruleset: CURRENT_JOB_ALIGNMENT_RULESET_VERSION,
        job_updated_at: new Date().toISOString(),
        candidate_applied_at: new Date().toISOString(),
        job_title: 'Network Engineer',
        company_name: 'Apex Systems',
        evidence_manifest: [],
        suggestions: [],
        created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
      }
    ]);

    const res = await request(app)
      .get('/api/candidate/tailoring')
      .set('Authorization', 'Bearer valid-candidate-token');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].id).toBe('sess-hist-list-1');
  });
});
