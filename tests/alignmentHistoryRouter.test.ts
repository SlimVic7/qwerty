import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { candidateRouter } from '../server/routes/candidate.js';
import { JobAlignmentStore, CandidateJobAlignmentRecord } from '../server/services/matching/jobAlignmentStore.js';

let mockAuthenticatedUser: any = { id: 'candidate-user-1', roles: ['candidate'] };

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
  id: 'job-auditor-1',
  title: 'Senior Internal Auditor',
  company_name: 'Apex Digital',
  status: 'published',
  updated_at: '2026-09-21T10:00:00.000Z'
};

const mockParse = {
  id: 'parse-auditor-1',
  user_id: 'candidate-user-1',
  status: 'completed',
  reviewed_data: { skills: ['Internal Audit', 'CISA'] },
  reviewed_at: '2026-09-21T11:00:00.000Z',
  applied_at: '2026-09-21T11:05:00.000Z'
};

const mockAlign1: CandidateJobAlignmentRecord = {
  id: 'align-rec-1',
  user_id: 'candidate-user-1',
  cv_version_id: 'cv-1',
  parse_id: 'parse-auditor-1',
  job_id: 'job-auditor-1',
  job_updated_at: mockJob.updated_at,
  candidate_applied_at: mockParse.applied_at,
  job_title: mockJob.title,
  company_name: mockJob.company_name,
  status: 'completed',
  explanation_status: 'completed',
  ruleset_version: 'job-alignment-v1.3',
  score: 65,
  max_score: 100,
  created_at: '2026-09-21T11:30:00.000Z',
  criteria_breakdown: [
    { id: 'c1', criterion: 'CISA certification', status: 'matched' }
  ]
};

const mockAlign2: CandidateJobAlignmentRecord = {
  id: 'align-rec-2',
  user_id: 'candidate-user-1',
  cv_version_id: 'cv-0',
  parse_id: 'parse-auditor-0',
  job_id: 'job-auditor-1',
  job_updated_at: mockJob.updated_at,
  candidate_applied_at: '2026-09-10T10:00:00.000Z',
  job_title: mockJob.title,
  company_name: mockJob.company_name,
  status: 'completed',
  explanation_status: 'completed',
  ruleset_version: 'job-alignment-v1.2',
  score: 45,
  max_score: 100,
  created_at: '2026-09-10T10:30:00.000Z',
  criteria_breakdown: [
    { id: 'c1', criterion: 'CISA certification', status: 'not_found' }
  ]
};

let currentJob: any = mockJob;
let currentParse: any = mockParse;
let alignmentStoreList: CandidateJobAlignmentRecord[] = [mockAlign1, mockAlign2];

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
    listHistoryForCandidateAndJob: vi.fn(async (userId, jobId, limit) => {
      return alignmentStoreList.filter(a => a.user_id === userId && a.job_id === jobId);
    }),
    getAlignmentById: vi.fn(async (id) => {
      return alignmentStoreList.find(a => a.id === id) || null;
    }),
    getCompletedAlignment: vi.fn(async () => null)
  }
}));

const app = express();
app.use(express.json());
app.use('/api/candidate', candidateRouter);

describe('Stage 5.4 Alignment History & Comparison Endpoints', () => {
  beforeEach(() => {
    mockAuthenticatedUser = { id: 'candidate-user-1', roles: ['candidate'] };
    currentJob = { ...mockJob };
    currentParse = { ...mockParse };
    alignmentStoreList = [{ ...mockAlign1 }, { ...mockAlign2 }];
  });

  describe('GET /api/candidate/jobs/:jobId/alignment-history', () => {
    it('requires candidate authentication (returns 401)', async () => {
      const res = await request(app).get('/api/candidate/jobs/job-auditor-1/alignment-history');
      expect(res.status).toBe(401);
    });

    it('returns 404 if job does not exist', async () => {
      currentJob = null;
      const res = await request(app)
        .get('/api/candidate/jobs/unknown-job/alignment-history')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('JOB_NOT_FOUND');
    });

    it('returns 200 with complete history list and correctly resolves current alignment', async () => {
      const res = await request(app)
        .get('/api/candidate/jobs/job-auditor-1/alignment-history')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(200);
      expect(res.body.analysis_version).toBe('alignment-history-v1');
      expect(res.body.job_id).toBe('job-auditor-1');
      expect(res.body.current_alignment_id).toBe('align-rec-1');
      expect(res.body.has_current_alignment).toBe(true);
      expect(res.body.history).toHaveLength(2);

      const curr = res.body.history.find((h: any) => h.alignment_id === 'align-rec-1');
      expect(curr.is_current).toBe(true);
      expect(curr.is_stale).toBe(false);

      const older = res.body.history.find((h: any) => h.alignment_id === 'align-rec-2');
      expect(older.is_current).toBe(false);
      expect(older.is_stale).toBe(true);
      expect(older.stale_labels).toContain('Historical Methodology');
    });
  });

  describe('GET /api/candidate/jobs/:jobId/alignment-history/compare', () => {
    it('requires "from" and "to" parameters (returns 400)', async () => {
      const res = await request(app)
        .get('/api/candidate/jobs/job-auditor-1/alignment-history/compare')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('INVALID_COMPARISON_PARAMS');
    });

    it('enforces candidate ownership privacy (returns 403 ALIGNMENT_NOT_OWNED)', async () => {
      // Alien record belonging to candidate-user-2
      const alienRecord: CandidateJobAlignmentRecord = {
        ...mockAlign1,
        id: 'align-alien',
        user_id: 'candidate-user-2'
      };
      alignmentStoreList.push(alienRecord);

      const res = await request(app)
        .get('/api/candidate/jobs/job-auditor-1/alignment-history/compare?from=align-rec-2&to=align-alien')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('ALIGNMENT_NOT_OWNED');
    });

    it('enforces job boundary match (returns 400 ALIGNMENT_JOB_MISMATCH)', async () => {
      const otherJobRecord: CandidateJobAlignmentRecord = {
        ...mockAlign1,
        id: 'align-other-job',
        job_id: 'other-job-999'
      };
      alignmentStoreList.push(otherJobRecord);

      const res = await request(app)
        .get('/api/candidate/jobs/job-auditor-1/alignment-history/compare?from=align-rec-2&to=align-other-job')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('ALIGNMENT_JOB_MISMATCH');
    });

    it('returns 200 with deterministic comparison analysis', async () => {
      const res = await request(app)
        .get('/api/candidate/jobs/job-auditor-1/alignment-history/compare?from=align-rec-2&to=align-rec-1')
        .set('Authorization', 'Bearer valid-candidate-token');

      expect(res.status).toBe(200);
      expect(res.body.analysis_version).toBe('alignment-history-v1');
      expect(res.body.from_alignment_id).toBe('align-rec-2');
      expect(res.body.to_alignment_id).toBe('align-rec-1');
      expect(res.body.score_comparison.from_score).toBe(45);
      expect(res.body.score_comparison.to_score).toBe(65);
      expect(res.body.interpretation_notice).toBeTruthy();
    });
  });
});
