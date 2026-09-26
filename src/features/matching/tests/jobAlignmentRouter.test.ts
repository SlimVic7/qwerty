import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { candidateRouter } from '../../../../server/routes/candidate.js';

const mockGenerateExplanation = vi.fn().mockResolvedValue({
  summary: 'Mock alignment summary',
  strengths: ['Strong CISA and ISO 27001 background'],
  gaps: ['Kubernetes not found in approved profile'],
  recommendations: ['Highlight cloud auditing accomplishments'],
  suggested_interview_prep: ['Prepare to discuss ITGC methodology']
});

vi.mock('../../../../server/services/extraction/providers/GeminiJobAlignmentProvider.js', () => ({
  GeminiJobAlignmentProvider: class {
    generateExplanation = mockGenerateExplanation;
    getLastExecutedModel() {
      return 'gemini-3.8-flash';
    }
  }
}));

let mockAuthenticatedUser: any = { id: 'candidate-123', roles: ['candidate'] };

vi.mock('../../../../server/middleware/auth.js', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    if (req.headers.authorization === 'Bearer valid-candidate-token') {
      req.user = mockAuthenticatedUser;
      return next();
    }
    if (req.headers.authorization === 'Bearer recruiter-token') {
      req.user = { id: 'recruiter-999', roles: ['recruiter'] };
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

const mockSupabaseQuery = vi.fn();
let savedAlignmentRecord: any = null;

function createMockBuilder(data: any = null, error: any = null) {
  const builder: any = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
    not: () => builder,
    is: () => builder,
    order: () => builder,
    limit: () => builder,
    maybeSingle: () => Promise.resolve({ data, error }),
    single: () => Promise.resolve({ data, error }),
    insert: (rec: any) => {
      savedAlignmentRecord = { ...rec };
      return {
        select: () => ({
          single: () => Promise.resolve({ data: savedAlignmentRecord, error: null })
        })
      };
    },
    update: (updates: any) => {
      savedAlignmentRecord = { ...savedAlignmentRecord, ...updates };
      return {
        eq: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: savedAlignmentRecord, error: null })
          })
        })
      };
    }
  };
  return builder;
}

vi.mock('../../../../server/db/supabase.js', () => ({
  getAdminClient: () => ({
    from: (tableName: string) => mockSupabaseQuery(tableName)
  }),
  getAuthClient: () => ({
    from: (tableName: string) => mockSupabaseQuery(tableName)
  })
}));

describe('Stage 5.1: Candidate Job Alignment API Endpoints', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    savedAlignmentRecord = null;
    mockAuthenticatedUser = { id: 'candidate-123', roles: ['candidate'] };
    app = express();
    app.use(express.json());
    app.use('/api/candidate', candidateRouter);
  });

  it('rejects unauthenticated requests to job alignment (401)', async () => {
    const res = await request(app)
      .get('/api/candidate/jobs/job-1/alignment');
    expect(res.status).toBe(401);
  });

  it('rejects alignment check if the job is not published (400)', async () => {
    // Mock jobs query returning a draft or archived job
    mockSupabaseQuery.mockImplementation((table: string) => {
      if (table === 'jobs') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({
                data: {
                  id: 'job-draft',
                  title: 'Draft Engineer',
                  company_name: 'Acme',
                  status: 'draft',
                  updated_at: '2026-01-01T00:00:00Z'
                },
                error: null
              })
            })
          })
        };
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null })
          })
        })
      };
    });

    const res = await request(app)
      .post('/api/candidate/jobs/job-draft/alignment')
      .set('Authorization', 'Bearer valid-candidate-token');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('JOB_NOT_PUBLISHED');
  });

  it('rejects alignment check if the candidate has no approved CV (400)', async () => {
    mockSupabaseQuery.mockImplementation((table: string) => {
      if (table === 'jobs') {
        return createMockBuilder({
          id: 'job-pub',
          title: 'IT Auditor',
          company_name: 'Acme',
          status: 'published',
          updated_at: '2026-01-01T00:00:00Z'
        });
      }
      if (table === 'candidate_cv_parses') {
        return createMockBuilder(null);
      }
      return createMockBuilder(null);
    });

    const res = await request(app)
      .post('/api/candidate/jobs/job-pub/alignment')
      .set('Authorization', 'Bearer valid-candidate-token');

    expect(res.status).toBe(400);
    expect(['APPROVED_PROFILE_REQUIRED', 'NO_APPROVED_CV']).toContain(res.body.error);
  });

  it('rejects recruiter attempts to access candidate job alignment (403)', async () => {
    const res = await request(app)
      .get('/api/candidate/jobs/job-101/alignment')
      .set('Authorization', 'Bearer recruiter-token');

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Insufficient permissions');
  });

  it('allows candidate to view historical alignment even if the job is closed or archived', async () => {
    mockSupabaseQuery.mockImplementation((table: string) => {
      if (table === 'jobs') {
        return createMockBuilder({
          id: 'job-closed-1',
          title: 'Archived IT Auditor',
          company_name: 'Old Corp',
          status: 'closed',
          updated_at: '2026-03-01T00:00:00Z'
        });
      }
      if (table === 'candidate_cv_parses') {
        return createMockBuilder({ id: 'p-1', applied_at: '2026-02-01T00:00:00Z' });
      }
      if (table === 'candidate_job_alignments') {
        return createMockBuilder({
          id: 'align-hist-1',
          user_id: 'candidate-123',
          job_id: 'job-closed-1',
          job_title: 'Archived IT Auditor',
          company_name: 'Old Corp',
          status: 'completed',
          score: 85,
          job_updated_at: '2026-03-01T00:00:00Z',
          created_at: '2026-02-15T00:00:00Z'
        });
      }
      return createMockBuilder(null);
    });

    const res = await request(app)
      .get('/api/candidate/jobs/job-closed-1/alignment')
      .set('Authorization', 'Bearer valid-candidate-token');

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('align-hist-1');
    expect(res.body.score).toBe(85);
  });

  it('rejects closed job when requesting a NEW alignment analysis (400)', async () => {
    mockSupabaseQuery.mockImplementation((table: string) => {
      if (table === 'jobs') {
        return createMockBuilder({
          id: 'job-closed-1',
          title: 'Closed Auditor',
          company_name: 'Corp',
          status: 'closed',
          updated_at: '2026-03-01T00:00:00Z'
        });
      }
      return createMockBuilder(null);
    });

    const res = await request(app)
      .post('/api/candidate/jobs/job-closed-1/alignment')
      .set('Authorization', 'Bearer valid-candidate-token');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('JOB_NOT_PUBLISHED');
  });

  it('successfully computes deterministic job alignment for published job and candidate with approved CV', async () => {
    mockSupabaseQuery.mockImplementation((table: string) => {
      if (table === 'jobs') {
        return createMockBuilder({
          id: 'job-101',
          title: 'Senior IT Auditor',
          company_name: 'Apex Group',
          status: 'published',
          requirements: '• CISA certification\n• ISO 27001 audit experience',
          preferred_qualifications: '• AWS cloud security',
          experience_level: '5+ years',
          updated_at: '2026-03-01T00:00:00Z'
        });
      }
      if (table === 'candidate_cv_parses') {
        return createMockBuilder({
          id: 'parse-1',
          cv_version_id: 'cv-1',
          user_id: 'candidate-123',
          status: 'completed',
          reviewed_data: {
            skills: [
              { name: 'CISA', evidence: 'Certified Information Systems Auditor' },
              { name: 'ISO 27001', evidence: 'Lead Auditor ISO 27001' }
            ],
            experience: [
              { job_title: 'IT Auditor', company_name: 'Corp', description: 'Conducted audits' }
            ]
          },
          applied_at: '2026-02-01T00:00:00Z'
        });
      }
      if (table === 'profiles') {
        return createMockBuilder({ id: 'candidate-123', years_experience: 6 });
      }
      if (table === 'candidate_job_alignments') {
        return createMockBuilder(null);
      }
      return createMockBuilder(null);
    });

    const res = await request(app)
      .post('/api/candidate/jobs/job-101/alignment')
      .set('Authorization', 'Bearer valid-candidate-token');

    expect(res.status).toBe(201);
    expect(res.body).toBeDefined();
    expect(res.body.score).toBeGreaterThan(0);
    expect(res.body.criteria_breakdown).toBeDefined();
    expect(res.body.component_results).toBeDefined();
    expect(res.body.raw_score).toBeDefined();
    expect(res.body.raw_max_score).toBeDefined();
    expect(res.body.raw_score).toBeLessThanOrEqual(res.body.raw_max_score);
    expect(res.body.ruleset_version).toBe('job-alignment-v1.3');
    expect(res.body.candidate_applied_at).toBe('2026-02-01T00:00:00Z');
  });

  it('blocks active duplicate analysis for same candidate, job, parse, and ruleset (409)', async () => {
    mockSupabaseQuery.mockImplementation((table: string) => {
      if (table === 'jobs') {
        return createMockBuilder({
          id: 'job-101',
          title: 'Senior IT Auditor',
          company_name: 'Apex Group',
          status: 'published',
          updated_at: '2026-03-01T00:00:00Z'
        });
      }
      if (table === 'candidate_cv_parses') {
        return createMockBuilder({
          id: 'parse-1',
          cv_version_id: 'cv-1',
          user_id: 'candidate-123',
          status: 'completed',
          reviewed_data: { skills: [{ name: 'CISA' }] },
          applied_at: '2026-02-01T00:00:00Z'
        });
      }
      if (table === 'candidate_job_alignments') {
        // Return an active pending/processing alignment
        return createMockBuilder({
          id: 'align-active-1',
          user_id: 'candidate-123',
          job_id: 'job-101',
          parse_id: 'parse-1',
          ruleset_version: 'job-alignment-v1.1',
          status: 'processing_rules'
        });
      }
      return createMockBuilder(null);
    });

    const res = await request(app)
      .post('/api/candidate/jobs/job-101/alignment')
      .set('Authorization', 'Bearer valid-candidate-token');

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('ALIGNMENT_ALREADY_RUNNING');
  });

  it('allows new alignment analysis when candidate has a newer parse version (not blocked)', async () => {
    const { JobAlignmentStore } = await import('../../../../server/services/matching/jobAlignmentStore.js');

    // Existing active alignment was for parse-1
    mockSupabaseQuery.mockImplementation((table: string) => {
      if (table === 'candidate_job_alignments') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                in: () => ({
                  eq: (_col: string, val: string) => ({
                    eq: () => ({
                      limit: () => ({
                        maybeSingle: () => {
                          if (val === 'parse-1') {
                            return Promise.resolve({
                              data: {
                                id: 'align-1',
                                user_id: 'candidate-123',
                                job_id: 'job-101',
                                parse_id: 'parse-1',
                                ruleset_version: 'job-alignment-v1.1',
                                status: 'processing_rules'
                              },
                              error: null
                            });
                          }
                          return Promise.resolve({ data: null, error: null });
                        }
                      })
                    })
                  })
                })
              })
            })
          })
        };
      }
      return createMockBuilder(null);
    });

    // Active check with parse-2 should NOT be blocked
    const activeForNewParse = await JobAlignmentStore.getActiveAlignment(
      'candidate-123',
      'job-101',
      'parse-2',
      'job-alignment-v1.1'
    );
    expect(activeForNewParse).toBeNull();
  });

  it('allows future ruleset version without being blocked by previous ruleset active analysis', async () => {
    const { JobAlignmentStore } = await import('../../../../server/services/matching/jobAlignmentStore.js');

    mockSupabaseQuery.mockImplementation((table: string) => {
      if (table === 'candidate_job_alignments') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                in: () => ({
                  eq: () => ({
                    eq: (_col: string, val: string) => ({
                      limit: () => ({
                        maybeSingle: () => {
                          if (val === 'job-alignment-v1') {
                            return Promise.resolve({
                              data: {
                                id: 'align-v1',
                                user_id: 'candidate-123',
                                job_id: 'job-101',
                                parse_id: 'parse-1',
                                ruleset_version: 'job-alignment-v1',
                                status: 'processing_rules'
                              },
                              error: null
                            });
                          }
                          return Promise.resolve({ data: null, error: null });
                        }
                      })
                    })
                  })
                })
              })
            })
          })
        };
      }
      return createMockBuilder(null);
    });

    // Querying for newer ruleset 'job-alignment-v1.1' should NOT be blocked by previous active 'job-alignment-v1'
    const activeV1_1 = await JobAlignmentStore.getActiveAlignment(
      'candidate-123',
      'job-101',
      'parse-1',
      'job-alignment-v1.1'
    );
    expect(activeV1_1).toBeNull();
  });

  it('handles zero evaluable criteria by returning controlled deterministic failure without 0/100 scoring or Gemini call', async () => {
    mockSupabaseQuery.mockImplementation((table: string) => {
      if (table === 'jobs') {
        return createMockBuilder({
          id: 'job-zero-crit',
          title: 'General Support Worker',
          company_name: 'Corp',
          status: 'published',
          // Omit requirements, preferred, responsibilities, experience_level
          requirements: '',
          preferred_qualifications: null,
          responsibilities: null,
          experience_level: null,
          updated_at: '2026-03-01T00:00:00Z'
        });
      }
      if (table === 'candidate_cv_parses') {
        return createMockBuilder({
          id: 'parse-1',
          cv_version_id: 'cv-1',
          user_id: 'candidate-123',
          status: 'completed',
          reviewed_data: { skills: [{ name: 'CISA' }] },
          applied_at: '2026-02-01T00:00:00Z'
        });
      }
      if (table === 'candidate_job_alignments') {
        return createMockBuilder(null);
      }
      return createMockBuilder(null);
    });

    const res = await request(app)
      .post('/api/candidate/jobs/job-zero-crit/alignment')
      .set('Authorization', 'Bearer valid-candidate-token');

    expect(res.status).toBe(201);
    expect(res.body).toBeDefined();

    // Must be a controlled deterministic failure
    expect(res.body.status).toBe('failed');
    expect(res.body.error_code).toBe('NO_EVALUABLE_CRITERIA');
    expect(res.body.completed_at).toBeDefined();

    // Must NOT be numerical 0 or 0/100
    expect(res.body.score).toBeFalsy();
    expect(res.body.raw_score).toBeFalsy();
    expect(res.body.raw_max_score).toBeFalsy();
    expect(res.body.max_score).toBe(100);

    // Gemini explanation must NOT be invoked
    expect(mockGenerateExplanation).not.toHaveBeenCalled();
  });
});
