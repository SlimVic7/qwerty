import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { candidateRouter } from '../server/routes/candidate.js';

let mockAuthenticatedUser: any = { id: 'candidate-123', roles: ['candidate'] };

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

const mockJob = {
  id: 'job-test-1',
  title: 'Cloud Security Engineer',
  company_name: 'SecureTech',
  status: 'published',
  updated_at: '2026-09-25T10:00:00Z'
};

const mockParse = {
  id: 'parse-test-1',
  user_id: 'candidate-123',
  cv_version_id: 'cv-ver-1',
  status: 'completed',
  reviewed_data: {
    skills: [{ name: 'AWS' }, { name: 'Terraform' }],
    experience: [{ title: 'Security Analyst', duration_years: 3 }]
  },
  reviewed_at: '2026-09-25T11:00:00Z',
  applied_at: '2026-09-25T11:05:00Z'
};

const mockAlignment = {
  id: 'align-test-1',
  user_id: 'candidate-123',
  job_id: 'job-test-1',
  parse_id: 'parse-test-1',
  ruleset_version: 'job-alignment-v1.3',
  job_updated_at: mockJob.updated_at,
  candidate_applied_at: mockParse.applied_at,
  status: 'completed',
  score: 70,
  max_score: 100,
  criteria_breakdown: [
    {
      id: 'crit-aws',
      criterion: 'AWS Cloud Security architecture & IAM',
      category: 'required',
      status: 'matched',
      candidate_evidence: 'Implemented AWS IAM least-privilege policies.',
      explanation: 'Substantiated in technical experience.'
    },
    {
      id: 'crit-k8s',
      criterion: 'Kubernetes container security (CKA/CKS preferred)',
      category: 'required',
      status: 'not_found',
      explanation: 'Not found in approved profile.'
    },
    {
      id: 'crit-exp',
      criterion: '5+ years security engineering experience',
      category: 'experience',
      status: 'partially_supported',
      candidate_evidence: '3 years verified.',
      explanation: 'Partial duration demonstrated.'
    }
  ]
};

let currentJob: any = mockJob;
let currentParse: any = mockParse;
let currentAlignment: any = mockAlignment;

vi.mock('../server/db/supabase.js', () => ({
  getAdminClient: () => ({
    from: (table: string) => {
      const builder: any = {
        select: () => builder,
        eq: (col: string, val: any) => {
          builder._eqs = builder._eqs || {};
          builder._eqs[col] = val;
          return builder;
        },
        not: () => builder,
        order: () => builder,
        limit: () => builder,
        maybeSingle: async () => {
          if (table === 'jobs') {
            if (currentJob && currentJob.id === builder._eqs?.id) {
              return { data: currentJob, error: null };
            }
            return { data: null, error: null };
          }
          if (table === 'candidate_cv_parses') {
            if (currentParse && currentParse.user_id === builder._eqs?.user_id) {
              return { data: currentParse, error: null };
            }
            return { data: null, error: null };
          }
          return { data: null, error: null };
        }
      };
      return builder;
    }
  })
}));

vi.mock('../server/services/matching/jobAlignmentStore.js', () => ({
  JobAlignmentStore: {
    getCompletedAlignment: vi.fn(async (userId, jobId, parseId, rulesetVersion, jobUpdatedAt, candidateAppliedAt) => {
      if (!currentAlignment) return null;
      if (
        currentAlignment.user_id === userId &&
        currentAlignment.job_id === jobId &&
        currentAlignment.parse_id === parseId &&
        currentAlignment.ruleset_version === rulesetVersion &&
        currentAlignment.job_updated_at === jobUpdatedAt &&
        currentAlignment.candidate_applied_at === candidateAppliedAt
      ) {
        return currentAlignment;
      }
      return null;
    })
  }
}));

const app = express();
app.use(express.json());
app.use('/api/candidate', candidateRouter);

describe('GET /api/candidate/jobs/:jobId/skills-gap', () => {
  beforeEach(() => {
    currentJob = { ...mockJob };
    currentParse = { ...mockParse };
    currentAlignment = { ...mockAlignment };
  });

  it('requires candidate authentication (returns 401)', async () => {
    const res = await request(app).get('/api/candidate/jobs/job-test-1/skills-gap');
    expect(res.status).toBe(401);
  });

  it('returns 404 if job does not exist', async () => {
    currentJob = null;
    const res = await request(app)
      .get('/api/candidate/jobs/non-existent-job/skills-gap')
      .set('Authorization', 'Bearer valid-candidate-token');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('JOB_NOT_FOUND');
  });

  it('returns 400 if job is not published', async () => {
    currentJob.status = 'draft';
    const res = await request(app)
      .get('/api/candidate/jobs/job-test-1/skills-gap')
      .set('Authorization', 'Bearer valid-candidate-token');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('JOB_NOT_PUBLISHED');
  });

  it('returns 400 APPROVED_PROFILE_REQUIRED if candidate has no approved applied CV parse', async () => {
    currentParse = null;
    const res = await request(app)
      .get('/api/candidate/jobs/job-test-1/skills-gap')
      .set('Authorization', 'Bearer valid-candidate-token');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('APPROVED_PROFILE_REQUIRED');
  });

  it('returns 400 ALIGNMENT_REQUIRED if no exact matching completed alignment exists', async () => {
    currentAlignment = null;
    const res = await request(app)
      .get('/api/candidate/jobs/job-test-1/skills-gap')
      .set('Authorization', 'Bearer valid-candidate-token');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('ALIGNMENT_REQUIRED');
    expect(res.body.message).toContain('Check your Job Alignment first');
  });

  it('returns 400 ALIGNMENT_REQUIRED if alignment is stale (job updated after alignment)', async () => {
    currentJob.updated_at = '2026-09-26T00:00:00Z'; // Newer than alignment's 2026-09-25
    const res = await request(app)
      .get('/api/candidate/jobs/job-test-1/skills-gap')
      .set('Authorization', 'Bearer valid-candidate-token');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('ALIGNMENT_REQUIRED');
  });

  it('returns 200 with complete deterministic analysis when prerequisites are satisfied', async () => {
    const res = await request(app)
      .get('/api/candidate/jobs/job-test-1/skills-gap')
      .set('Authorization', 'Bearer valid-candidate-token');

    expect(res.status).toBe(200);
    expect(res.body.job_id).toBe('job-test-1');
    expect(res.body.summary.supported_strengths_count).toBe(1);
    expect(res.body.summary.partially_evidenced_count).toBe(1);
    expect(res.body.summary.not_found_count).toBe(1);
    expect(res.body.summary.coverage_percentage).toBe(50);

    // Language safety check
    const jsonStr = JSON.stringify(res.body);
    expect(jsonStr).not.toMatch(/you\s+do\s+not\s+have/i);
    expect(jsonStr).not.toMatch(/candidate\s+lacks/i);
  });
});
