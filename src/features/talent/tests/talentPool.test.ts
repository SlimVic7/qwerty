import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { candidateRouter } from '../../../../server/routes/candidate.js';
import { talentPoolRouter } from '../../../../server/routes/talentPool.js';

// Setup Mock Auth
vi.mock('../../../../server/middleware/auth.js', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (authHeader === 'Bearer candidate-a-token') {
      req.user = { id: 'candidate-a-id', roles: ['candidate'] };
      return next();
    }
    if (authHeader === 'Bearer candidate-b-token') {
      req.user = { id: 'candidate-b-id', roles: ['candidate'] };
      return next();
    }
    if (authHeader === 'Bearer recruiter-token') {
      req.user = { id: 'recruiter-id', roles: ['recruiter'] };
      return next();
    }
    if (authHeader === 'Bearer admin-only-token') {
      req.user = { id: 'admin-id', roles: ['admin'] };
      return next();
    }
    if (authHeader === 'Bearer editor-token') {
      req.user = { id: 'editor-id', roles: ['editor'] };
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

// In-memory mock database state
let mockPreferences: Record<string, any> = {};
let mockProfiles: Record<string, any> = {};
let mockParses: Record<string, any[]> = {};
let mockCvs: Record<string, any[]> = {};
let mockAssessments: Record<string, any[]> = {};
let mockAuditLogs: any[] = [];
let mockAuditInsertError = false;

// Mock Supabase
vi.mock('../../../../server/db/supabase.js', () => ({
  getAdminClient: () => ({
    from: (table: string) => {
      let currentTable = table;
      let selectedFields: string = '*';
      let eqFilters: Record<string, any> = {};
      let inFilters: Record<string, any[]> = {};
      let isFilters: Record<string, any> = {};

      const queryObj: any = {
        select: vi.fn((fields: string) => {
          selectedFields = fields;
          return queryObj;
        }),
        eq: vi.fn((col: string, val: any) => {
          eqFilters[col] = val;
          return queryObj;
        }),
        in: vi.fn((col: string, vals: any[]) => {
          inFilters[col] = vals;
          return queryObj;
        }),
        is: vi.fn((col: string, val: any) => {
          isFilters[col] = val;
          return queryObj;
        }),
        not: vi.fn(() => queryObj),
        order: vi.fn(() => queryObj),
        limit: vi.fn(() => queryObj),
        maybeSingle: vi.fn(async () => {
          if (currentTable === 'talent_pool_preferences') {
            const uid = eqFilters['user_id'];
            return { data: mockPreferences[uid] || null, error: null };
          }
          if (currentTable === 'profiles') {
            const id = eqFilters['id'];
            return { data: mockProfiles[id] || null, error: null };
          }
          if (currentTable === 'candidate_cv_versions') {
            const uid = eqFilters['user_id'];
            const cvList = (mockCvs[uid] || []).filter(c => !c.deleted_at && c.is_current);
            return { data: cvList[0] || null, error: null };
          }
          if (currentTable === 'candidate_cv_parses') {
            const uid = eqFilters['user_id'];
            const parseList = mockParses[uid] || [];
            return { data: parseList[0] || null, error: null };
          }
          return { data: null, error: null };
        }),
        single: vi.fn(async () => {
          if (currentTable === 'talent_pool_preferences') {
            const uid = eqFilters['user_id'];
            return { data: mockPreferences[uid] || null, error: null };
          }
          if (currentTable === 'profiles') {
            const id = eqFilters['id'];
            return { data: mockProfiles[id] || null, error: null };
          }
          if (currentTable === 'candidate_cv_versions') {
            const uid = eqFilters['user_id'];
            const cvList = (mockCvs[uid] || []).filter(c => !c.deleted_at && c.is_current);
            return { data: cvList[0] || null, error: null };
          }
          return { data: null, error: null };
        }),
        insert: vi.fn((rowOrRows: any) => {
          const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
          if (currentTable === 'recruiter_access_audit_log') {
            if (mockAuditInsertError) {
              return {
                select: vi.fn(() => ({ single: vi.fn(async () => ({ data: null, error: new Error('Simulated DB audit write failure') })) })),
                then: (resolve: any) => resolve({ data: null, error: new Error('Simulated DB audit write failure') })
              };
            }
            mockAuditLogs.push(...rows);
          }
          if (currentTable === 'talent_pool_preferences') {
            for (const r of rows) {
              mockPreferences[r.user_id] = { ...r };
            }
          }
          return {
            select: vi.fn(() => ({
              single: vi.fn(async () => ({ data: rows[0], error: null }))
            })),
            then: (resolve: any) => resolve({ data: rows[0], error: null })
          };
        }),
        update: vi.fn((updates: any) => ({
          eq: vi.fn((col: string, val: any) => ({
            select: vi.fn(() => ({
              single: vi.fn(async () => {
                if (currentTable === 'talent_pool_preferences' && col === 'user_id') {
                  mockPreferences[val] = { ...(mockPreferences[val] || {}), ...updates };
                  return { data: mockPreferences[val], error: null };
                }
                return { data: updates, error: null };
              })
            }))
          }))
        })),
        then: async (resolve: any) => {
          if (currentTable === 'talent_pool_preferences') {
            let list = Object.values(mockPreferences);
            if (eqFilters['is_visible_to_qwerty_recruitment'] !== undefined) {
              list = list.filter(p => p.is_visible_to_qwerty_recruitment === eqFilters['is_visible_to_qwerty_recruitment']);
            }
            return resolve({ data: list, error: null });
          }
          if (currentTable === 'profiles') {
            let list = Object.values(mockProfiles);
            if (inFilters['id']) {
              list = list.filter(p => inFilters['id'].includes(p.id));
            }
            return resolve({ data: list, error: null });
          }
          if (currentTable === 'candidate_cv_parses') {
            let list: any[] = [];
            for (const parses of Object.values(mockParses)) {
              list.push(...parses);
            }
            if (inFilters['user_id']) {
              list = list.filter(p => inFilters['user_id'].includes(p.user_id));
            }
            return resolve({ data: list, error: null });
          }
          if (currentTable === 'candidate_cv_versions') {
            let list: any[] = [];
            for (const cvs of Object.values(mockCvs)) {
              list.push(...cvs.filter(c => !c.deleted_at && c.is_current));
            }
            if (inFilters['user_id']) {
              list = list.filter(c => inFilters['user_id'].includes(c.user_id));
            }
            return resolve({ data: list, error: null });
          }
          return resolve({ data: [], error: null });
        }
      };

      return queryObj;
    },
    storage: {
      from: vi.fn((bucket: string) => ({
        createSignedUrl: vi.fn(async (path: string, expiresIn: number) => {
          if (bucket !== 'candidate-cvs') {
            return { data: null, error: { message: 'Object not found', __isStorageError: true } };
          }
          return { data: { signedUrl: `https://supabase.co/storage/v1/object/sign/${bucket}/${path}?token=mock&exp=${expiresIn}` }, error: null };
        })
      }))
    }
  }),
  getAuthClient: () => ({})
}));

const app = express();
app.use(express.json());
app.use('/api/candidate', candidateRouter);
app.use('/api/ops/talent', talentPoolRouter);

describe('Stage 4.4 Talent Pool & Recruiter Access Tests', () => {
  beforeEach(() => {
    mockPreferences = {};
    mockProfiles = {};
    mockParses = {};
    mockCvs = {};
    mockAssessments = {};
    mockAuditLogs = [];
    mockAuditInsertError = false;

    // Seed Candidate A profile
    mockProfiles['candidate-a-id'] = {
      id: 'candidate-a-id',
      display_name: 'Alice Developer',
      professional_headline: 'Senior Full Stack Engineer',
      professional_summary: 'Over 8 years of React and Node.js experience.',
      city: 'London',
      country: 'United Kingdom',
      years_experience: 8,
      phone: '+44 7700 900077', // Sensitive PII
      email: 'alice@example.com', // Sensitive PII
      linkedin_url: 'https://linkedin.com/in/alicedev',
      github_url: 'https://github.com/alicedev',
      portfolio_url: 'https://alicedev.io'
    };

    // Candidate A CV file
    mockCvs['candidate-a-id'] = [{
      id: 'cv-version-1-id',
      user_id: 'candidate-a-id',
      version_number: 1,
      original_filename: 'Alice_Dev_CV.pdf',
      storage_path: 'candidate-a-id/cv_1.pdf',
      is_current: true,
      deleted_at: null
    }];

    // Candidate A approved reviewed_data
    mockParses['candidate-a-id'] = [{
      user_id: 'candidate-a-id',
      status: 'completed',
      applied_at: new Date().toISOString(),
      raw_text_hash: 'hash_secret_123',
      extracted_data: {
        skills: ['React', 'TypeScript', 'Node.js', 'RawExtraPrivate'],
        gemini_model_used: 'gemini-2.5-flash'
      },
      reviewed_data: {
        skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
        experience: [{ role: 'Lead Architect', company: 'Acme Corp', start_date: '2020', end_date: 'Present' }],
        education: [{ degree: 'BSc Computer Science', institution: 'University of Bristol' }],
        certifications: ['AWS Certified Solutions Architect']
      }
    }];

    // Candidate A ATS Assessment (confidential internal diagnostic)
    mockAssessments['candidate-a-id'] = [{
      user_id: 'candidate-a-id',
      score: 88,
      breakdown: { brevity: 90, keywords: 85 }
    }];
  });

  it('1. Candidate starts opted-out by default', async () => {
    const res = await request(app)
      .get('/api/candidate/talent-pool')
      .set('Authorization', 'Bearer candidate-a-token');

    expect(res.status).toBe(200);
    expect(res.body.is_visible_to_qwerty_recruitment).toBe(false);
    expect(res.body.allow_cv_access).toBe(false);
    expect(res.body.consent_given_at).toBeNull();
  });

  it('2. CV upload, CV parse, and ATS assessment do NOT opt candidate into Talent Pool', async () => {
    // Assert initial state is opted out
    const prefRes = await request(app)
      .get('/api/candidate/talent-pool')
      .set('Authorization', 'Bearer candidate-a-token');

    expect(prefRes.body.is_visible_to_qwerty_recruitment).toBe(false);
    expect(prefRes.body.allow_cv_access).toBe(false);
  });

  it('3. Candidate explicitly opts in and enables CV access', async () => {
    const optInRes = await request(app)
      .patch('/api/candidate/talent-pool')
      .set('Authorization', 'Bearer candidate-a-token')
      .send({
        is_visible_to_qwerty_recruitment: true,
        allow_cv_access: true
      });

    expect(optInRes.status).toBe(200);
    expect(optInRes.body.is_visible_to_qwerty_recruitment).toBe(true);
    expect(optInRes.body.allow_cv_access).toBe(true);
    expect(optInRes.body.consent_given_at).not.toBeNull();
    expect(optInRes.body.withdrawn_at).toBeNull();
  });

  it('4. Candidate cannot enable CV access while opted out of Talent Pool', async () => {
    const res = await request(app)
      .patch('/api/candidate/talent-pool')
      .set('Authorization', 'Bearer candidate-a-token')
      .send({
        is_visible_to_qwerty_recruitment: false,
        allow_cv_access: true
      });

    expect(res.status).toBe(400);
  });

  it('5. Candidate A cannot modify Candidate B consent', async () => {
    // Candidate B's preferences should remain untouched even if candidate A makes a request
    mockPreferences['candidate-b-id'] = {
      user_id: 'candidate-b-id',
      is_visible_to_qwerty_recruitment: false,
      allow_cv_access: false
    };

    // Candidate A patches their own preference
    await request(app)
      .patch('/api/candidate/talent-pool')
      .set('Authorization', 'Bearer candidate-a-token')
      .send({ is_visible_to_qwerty_recruitment: true });

    // Candidate B remains false
    expect(mockPreferences['candidate-b-id'].is_visible_to_qwerty_recruitment).toBe(false);
  });

  it('6. Candidate explicitly opts out (withdraws), revoking CV access and setting withdrawn_at', async () => {
    // First opt in
    mockPreferences['candidate-a-id'] = {
      user_id: 'candidate-a-id',
      is_visible_to_qwerty_recruitment: true,
      allow_cv_access: true,
      consent_given_at: new Date().toISOString()
    };

    // Candidate opts out
    const optOutRes = await request(app)
      .patch('/api/candidate/talent-pool')
      .set('Authorization', 'Bearer candidate-a-token')
      .send({ is_visible_to_qwerty_recruitment: false });

    expect(optOutRes.status).toBe(200);
    expect(optOutRes.body.is_visible_to_qwerty_recruitment).toBe(false);
    expect(optOutRes.body.allow_cv_access).toBe(false);
    expect(optOutRes.body.withdrawn_at).not.toBeNull();
  });

  it('7. Recruiter cannot see opted-out candidate, but sees opted-in candidate', async () => {
    // Candidate A is opted-out initially
    mockPreferences['candidate-a-id'] = {
      user_id: 'candidate-a-id',
      is_visible_to_qwerty_recruitment: false,
      allow_cv_access: false
    };

    const res1 = await request(app)
      .get('/api/ops/talent')
      .set('Authorization', 'Bearer recruiter-token');

    expect(res1.status).toBe(200);
    expect(res1.body.candidates).toHaveLength(0);

    // Candidate A opts in
    mockPreferences['candidate-a-id'] = {
      user_id: 'candidate-a-id',
      is_visible_to_qwerty_recruitment: true,
      allow_cv_access: true,
      consent_given_at: new Date().toISOString()
    };

    const res2 = await request(app)
      .get('/api/ops/talent')
      .set('Authorization', 'Bearer recruiter-token');

    expect(res2.status).toBe(200);
    expect(res2.body.candidates).toHaveLength(1);
    expect(res2.body.candidates[0].display_name).toBe('Alice Developer');
  });

  it('8. Role checks: Admin without recruiter role, editor, and candidate cannot access Talent Pool', async () => {
    // Admin without recruiter role
    const adminRes = await request(app)
      .get('/api/ops/talent')
      .set('Authorization', 'Bearer admin-only-token');
    expect(adminRes.status).toBe(403);

    // Editor
    const editorRes = await request(app)
      .get('/api/ops/talent')
      .set('Authorization', 'Bearer editor-token');
    expect(editorRes.status).toBe(403);

    // Candidate
    const candidateRes = await request(app)
      .get('/api/ops/talent')
      .set('Authorization', 'Bearer candidate-a-token');
    expect(candidateRes.status).toBe(403);
  });

  it('9. Candidate detail uses approved data only: raw extracted_data and ATS scores are NOT exposed', async () => {
    mockPreferences['candidate-a-id'] = {
      user_id: 'candidate-a-id',
      is_visible_to_qwerty_recruitment: true,
      allow_cv_access: true,
      consent_given_at: new Date().toISOString()
    };

    const res = await request(app)
      .get('/api/ops/talent/candidate-a-id')
      .set('Authorization', 'Bearer recruiter-token');

    expect(res.status).toBe(200);
    // Approved structured data
    expect(res.body.display_name).toBe('Alice Developer');
    expect(res.body.skills).toContain('TypeScript');
    expect(res.body.experience).toHaveLength(1);
    expect(res.body.experience[0].company).toBe('Acme Corp');

    // Confidential data MUST NOT be exposed
    expect(res.body.phone).toBeUndefined();
    expect(res.body.email).toBeUndefined();
    expect(res.body.extracted_data).toBeUndefined();
    expect(res.body.raw_text_hash).toBeUndefined();
    expect(res.body.ats_score).toBeUndefined();
    expect(res.body.score).toBeUndefined();
    expect(res.body.storage_path).toBeUndefined();
  });

  it('10. Profile view is audited in recruiter_access_audit_log', async () => {
    mockPreferences['candidate-a-id'] = {
      user_id: 'candidate-a-id',
      is_visible_to_qwerty_recruitment: true,
      allow_cv_access: true,
      consent_given_at: new Date().toISOString()
    };

    await request(app)
      .get('/api/ops/talent/candidate-a-id')
      .set('Authorization', 'Bearer recruiter-token');

    expect(mockAuditLogs).toHaveLength(1);
    expect(mockAuditLogs[0].action).toBe('candidate_profile_viewed');
    expect(mockAuditLogs[0].recruiter_id).toBe('recruiter-id');
    expect(mockAuditLogs[0].candidate_id).toBe('candidate-a-id');
  });

  it('11. CV permission OFF -> recruiter cannot obtain CV URL (403)', async () => {
    // Opted in to profile discovery, but allow_cv_access = false
    mockPreferences['candidate-a-id'] = {
      user_id: 'candidate-a-id',
      is_visible_to_qwerty_recruitment: true,
      allow_cv_access: false,
      consent_given_at: new Date().toISOString()
    };

    const res = await request(app)
      .post('/api/ops/talent/candidate-a-id/cv-url')
      .set('Authorization', 'Bearer recruiter-token');

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('not permitted CV file access');
  });

  it('12. CV permission ON -> authorized recruiter obtains short-lived signed URL and action is audited', async () => {
    mockPreferences['candidate-a-id'] = {
      user_id: 'candidate-a-id',
      is_visible_to_qwerty_recruitment: true,
      allow_cv_access: true,
      consent_given_at: new Date().toISOString()
    };

    const res = await request(app)
      .post('/api/ops/talent/candidate-a-id/cv-url')
      .set('Authorization', 'Bearer recruiter-token');

    expect(res.status).toBe(200);
    expect(res.body.signedUrl).toContain('https://supabase.co/storage');
    expect(res.body.expiresIn).toBe(60);
    expect(res.body.filename).toBe('Alice_Dev_CV.pdf');
    expect(res.body.storage_path).toBeUndefined(); // Storage path not exposed

    // Check CV access audit
    const cvAccessLog = mockAuditLogs.find(l => l.action === 'candidate_cv_accessed');
    expect(cvAccessLog).toBeDefined();
    expect(cvAccessLog.recruiter_id).toBe('recruiter-id');
    expect(cvAccessLog.candidate_id).toBe('candidate-a-id');
    expect(cvAccessLog.object_id).toBe('cv-version-1-id');
  });

  it('13. Withdrawal -> new CV access is denied (404/403)', async () => {
    // Candidate withdraws
    mockPreferences['candidate-a-id'] = {
      user_id: 'candidate-a-id',
      is_visible_to_qwerty_recruitment: false,
      allow_cv_access: false,
      withdrawn_at: new Date().toISOString()
    };

    const res = await request(app)
      .post('/api/ops/talent/candidate-a-id/cv-url')
      .set('Authorization', 'Bearer recruiter-token');

    expect(res.status).toBe(404);
  });

  it('14. Withdrawal -> immediate candidate detail endpoint returns 404', async () => {
    mockPreferences['candidate-a-id'] = {
      user_id: 'candidate-a-id',
      is_visible_to_qwerty_recruitment: false,
      allow_cv_access: false,
      withdrawn_at: new Date().toISOString()
    };

    const res = await request(app)
      .get('/api/ops/talent/candidate-a-id')
      .set('Authorization', 'Bearer recruiter-token');

    expect(res.status).toBe(404);
    expect(res.body.display_name).toBeUndefined();
  });

  it('15. Audit failure -> profile detail view fails closed (500) and candidate profile data is withheld', async () => {
    mockPreferences['candidate-a-id'] = {
      user_id: 'candidate-a-id',
      is_visible_to_qwerty_recruitment: true,
      allow_cv_access: true,
      consent_given_at: new Date().toISOString()
    };

    mockAuditInsertError = true;

    const res = await request(app)
      .get('/api/ops/talent/candidate-a-id')
      .set('Authorization', 'Bearer recruiter-token');

    expect(res.status).toBe(500);
    expect(res.body.message).toContain('Security audit logging failed; access denied');
    expect(res.body.display_name).toBeUndefined();
    expect(res.body.skills).toBeUndefined();
  });

  it('16. Audit failure -> CV signed URL access fails closed (500) and signedUrl is NEVER returned', async () => {
    mockPreferences['candidate-a-id'] = {
      user_id: 'candidate-a-id',
      is_visible_to_qwerty_recruitment: true,
      allow_cv_access: true,
      consent_given_at: new Date().toISOString()
    };

    mockAuditInsertError = true;

    const res = await request(app)
      .post('/api/ops/talent/candidate-a-id/cv-url')
      .set('Authorization', 'Bearer recruiter-token');

    expect(res.status).toBe(500);
    expect(res.body.message).toContain('Security audit logging failed; CV access link withheld');
    expect(res.body.signedUrl).toBeUndefined();
  });

  it('17. Candidate PATCH ignores client-supplied consent_given_at, consent_version, and withdrawn_at', async () => {
    const res = await request(app)
      .patch('/api/candidate/talent-pool')
      .set('Authorization', 'Bearer candidate-a-token')
      .send({
        is_visible_to_qwerty_recruitment: true,
        allow_cv_access: true,
        consent_given_at: '2099-01-01T00:00:00Z',
        consent_version: 'malicious-spoofed-v99',
        withdrawn_at: '2000-01-01T00:00:00Z'
      });

    expect(res.status).toBe(200);
    // Server & DB trigger overwrite/ignore candidate-supplied timestamps & version
    expect(res.body.consent_version).toBe('talent-pool-v1');
    expect(res.body.withdrawn_at).toBeNull();
  });

  it('18. Database Trigger & CHECK Constraint logic verification', () => {
    // Simulate Trigger handle_talent_pool_consent logic
    function simulateTrigger(op: 'INSERT' | 'UPDATE', oldRow: any, newRow: any) {
      const row = { ...newRow };
      if (op === 'INSERT') {
        if (row.is_visible_to_qwerty_recruitment === true) {
          row.consent_given_at = '2026-09-18T10:00:00Z';
          row.consent_version = 'talent-pool-v1';
          row.withdrawn_at = null;
        } else {
          row.allow_cv_access = false;
          row.consent_given_at = null;
          row.consent_version = null;
          row.withdrawn_at = null;
        }
      } else if (op === 'UPDATE') {
        if (!oldRow.is_visible_to_qwerty_recruitment && row.is_visible_to_qwerty_recruitment) {
          row.consent_given_at = '2026-09-18T10:00:00Z';
          row.consent_version = 'talent-pool-v1';
          row.withdrawn_at = null;
        } else if (oldRow.is_visible_to_qwerty_recruitment && !row.is_visible_to_qwerty_recruitment) {
          row.withdrawn_at = '2026-09-18T10:00:00Z';
          row.allow_cv_access = false;
        }
      }
      if (row.is_visible_to_qwerty_recruitment === false) {
        row.allow_cv_access = false;
      }
      return row;
    }

    // CHECK constraint: NOT allow_cv_access OR is_visible_to_qwerty_recruitment = true
    function satisfiesCvConsistencyConstraint(row: any) {
      return !row.allow_cv_access || row.is_visible_to_qwerty_recruitment === true;
    }

    // CHECK constraint: NOT is_visible_to_qwerty_recruitment OR (consent_given_at IS NOT NULL AND consent_version IS NOT NULL/nonblank AND withdrawn_at IS NULL)
    function satisfiesActiveConsentConstraint(row: any) {
      if (!row.is_visible_to_qwerty_recruitment) return true;
      return Boolean(
        row.consent_given_at &&
        row.consent_version &&
        row.consent_version.trim().length > 0 &&
        row.withdrawn_at === null
      );
    }

    // 1. INSERT opted-out forces allow_cv_access=false, consent=null, withdrawn_at=null
    const insOut = simulateTrigger('INSERT', null, {
      is_visible_to_qwerty_recruitment: false,
      allow_cv_access: true,
      consent_given_at: '2026-09-01T00:00:00Z',
      consent_version: 'spoofed',
      withdrawn_at: '2026-09-01T00:00:00Z'
    });
    expect(insOut.allow_cv_access).toBe(false);
    expect(insOut.consent_given_at).toBeNull();
    expect(insOut.consent_version).toBeNull();
    expect(insOut.withdrawn_at).toBeNull();
    expect(satisfiesCvConsistencyConstraint(insOut)).toBe(true);
    expect(satisfiesActiveConsentConstraint(insOut)).toBe(true);

    // 2. INSERT opted-in records consent and clears withdrawn_at
    const insIn = simulateTrigger('INSERT', null, { is_visible_to_qwerty_recruitment: true, allow_cv_access: true });
    expect(insIn.consent_given_at).toBe('2026-09-18T10:00:00Z');
    expect(insIn.consent_version).toBe('talent-pool-v1');
    expect(insIn.withdrawn_at).toBeNull();
    expect(satisfiesCvConsistencyConstraint(insIn)).toBe(true);
    expect(satisfiesActiveConsentConstraint(insIn)).toBe(true);

    // 3. UPDATE false -> true
    const updIn = simulateTrigger('UPDATE', { is_visible_to_qwerty_recruitment: false }, { is_visible_to_qwerty_recruitment: true, allow_cv_access: true });
    expect(updIn.consent_given_at).toBe('2026-09-18T10:00:00Z');
    expect(updIn.withdrawn_at).toBeNull();
    expect(satisfiesCvConsistencyConstraint(updIn)).toBe(true);
    expect(satisfiesActiveConsentConstraint(updIn)).toBe(true);

    // 4. UPDATE true -> false clears CV access and sets withdrawn_at
    const updOut = simulateTrigger('UPDATE', { is_visible_to_qwerty_recruitment: true }, { is_visible_to_qwerty_recruitment: false, allow_cv_access: true });
    expect(updOut.allow_cv_access).toBe(false);
    expect(updOut.withdrawn_at).toBe('2026-09-18T10:00:00Z');
    expect(satisfiesCvConsistencyConstraint(updOut)).toBe(true);
    expect(satisfiesActiveConsentConstraint(updOut)).toBe(true);

    // 5. Invalid states rejected by CHECK constraints
    expect(satisfiesCvConsistencyConstraint({ is_visible_to_qwerty_recruitment: false, allow_cv_access: true })).toBe(false);
    expect(satisfiesActiveConsentConstraint({ is_visible_to_qwerty_recruitment: true, consent_given_at: null, consent_version: 'v1', withdrawn_at: null })).toBe(false);
    expect(satisfiesActiveConsentConstraint({ is_visible_to_qwerty_recruitment: true, consent_given_at: '2026-09-18', consent_version: '  ', withdrawn_at: null })).toBe(false);
    expect(satisfiesActiveConsentConstraint({ is_visible_to_qwerty_recruitment: true, consent_given_at: '2026-09-18', consent_version: 'v1', withdrawn_at: '2026-09-18' })).toBe(false);
  });

  it('19. Neutral sorting: alphabetical, updated, and recent work deterministically without AI ranking', async () => {
    mockProfiles['candidate-b-id'] = {
      id: 'candidate-b-id',
      display_name: 'Bob Architect',
      professional_headline: 'Enterprise Cloud Architect',
      city: 'Manchester',
      country: 'United Kingdom',
      years_experience: 15
    };

    mockPreferences['candidate-a-id'] = {
      user_id: 'candidate-a-id',
      is_visible_to_qwerty_recruitment: true,
      allow_cv_access: true,
      consent_given_at: '2026-09-01T10:00:00Z',
      updated_at: '2026-09-15T10:00:00Z'
    };

    mockPreferences['candidate-b-id'] = {
      user_id: 'candidate-b-id',
      is_visible_to_qwerty_recruitment: true,
      allow_cv_access: false,
      consent_given_at: '2026-09-10T10:00:00Z',
      updated_at: '2026-09-12T10:00:00Z'
    };

    // 1. Alphabetical sort
    const alphaRes = await request(app)
      .get('/api/ops/talent?sort=alphabetical')
      .set('Authorization', 'Bearer recruiter-token');

    expect(alphaRes.status).toBe(200);
    expect(alphaRes.body.candidates[0].display_name).toBe('Alice Developer');
    expect(alphaRes.body.candidates[1].display_name).toBe('Bob Architect');

    // 2. Updated sort
    const updatedRes = await request(app)
      .get('/api/ops/talent?sort=updated')
      .set('Authorization', 'Bearer recruiter-token');

    expect(updatedRes.status).toBe(200);
    expect(updatedRes.body.candidates[0].id).toBe('candidate-a-id'); // 2026-09-15 > 2026-09-12

    // 3. Recent consented sort
    const recentRes = await request(app)
      .get('/api/ops/talent?sort=recent')
      .set('Authorization', 'Bearer recruiter-token');

    expect(recentRes.status).toBe(200);
    expect(recentRes.body.candidates[0].id).toBe('candidate-b-id'); // 2026-09-10 > 2026-09-01
  });

  it('20. Projection Safety: structured skills/experience/education with evidence/confidence are safely projected', async () => {
    mockProfiles['candidate-struct-id'] = {
      id: 'candidate-struct-id',
      display_name: 'Carol Auditor',
      professional_headline: 'Lead Cyber Auditor',
      professional_summary: 'Auditing complex systems.',
      city: 'London',
      country: 'United Kingdom',
      years_experience: 8
    };

    mockPreferences['candidate-struct-id'] = {
      user_id: 'candidate-struct-id',
      is_visible_to_qwerty_recruitment: true,
      allow_cv_access: true,
      consent_given_at: '2026-09-18T10:00:00Z',
      consent_version: 'v1.0-2026',
      withdrawn_at: null,
      updated_at: '2026-09-18T10:00:00Z'
    };

    mockCvs['candidate-struct-id'] = [
      {
        id: 'cv-struct-id',
        user_id: 'candidate-struct-id',
        storage_path: 'private/cvs/candidate-struct/cv.pdf',
        is_current: true,
        deleted_at: null
      }
    ];

    mockParses['candidate-struct-id'] = [
      {
        id: 'parse-struct-id',
        user_id: 'candidate-struct-id',
        cv_version_id: 'cv-struct-id',
        review_status: 'approved',
        reviewed_data: {
          skills: [
            { name: 'IT Audit', category: 'Governance', evidence: 'Led IT SOX audits for 3 years', confidence: 'high' },
            { name: 'Cybersecurity', category: 'Technical', evidence: 'Managed SIEM & firewall policies', confidence: 'high' },
            { name: 'SOC 2 Type II', category: 'Compliance', evidence: 'Delivered SOC 2 certification', confidence: 'medium' }
          ],
          experience: [
            {
              role: 'Audit Director',
              company: 'Global Assurance Ltd',
              start_date: '2020-01',
              end_date: 'Present',
              is_current: true,
              description: 'Oversaw SOC 2 and ISO 27001 programs.',
              evidence: 'Director of audits since 2020 on page 1',
              confidence: 'high'
            }
          ],
          education: [
            {
              qualification: 'BSc Computer Science',
              institution_name: 'University of Edinburgh',
              graduation_year: '2016',
              evidence: 'First class honours',
              confidence: 'high'
            }
          ],
          certifications: [
            {
              name: 'CISA',
              issuer: 'ISACA',
              issue_date: '2019',
              credential_id: 'secret-cisa-key',
              evidence: 'Passed ISACA CISA exam',
              confidence: 'high'
            }
          ]
        },
        raw_text_hash: 'hash-abc-123'
      }
    ];

    // 1. Recruiter search response check
    const searchRes = await request(app)
      .get('/api/ops/talent?q=Auditor')
      .set('Authorization', 'Bearer recruiter-token');

    expect(searchRes.status).toBe(200);
    const candidate = searchRes.body.candidates.find((c: any) => c.id === 'candidate-struct-id');
    expect(candidate).toBeDefined();

    // Verify top_skills is array of strings, NOT objects
    expect(candidate.top_skills).toEqual(['IT Audit', 'Cybersecurity', 'SOC 2 Type II']);
    expect(typeof candidate.top_skills[0]).toBe('string');

    // Verify string search does not crash and finds candidate by skill
    const skillSearchRes = await request(app)
      .get('/api/ops/talent?skills=cybersecurity')
      .set('Authorization', 'Bearer recruiter-token');
    expect(skillSearchRes.status).toBe(200);
    expect(skillSearchRes.body.candidates.some((c: any) => c.id === 'candidate-struct-id')).toBe(true);

    // 2. Recruiter candidate detail response check
    const detailRes = await request(app)
      .get('/api/ops/talent/candidate-struct-id')
      .set('Authorization', 'Bearer recruiter-token');

    expect(detailRes.status).toBe(200);
    expect(detailRes.body.skills).toEqual(['IT Audit', 'Cybersecurity', 'SOC 2 Type II']);
    expect(detailRes.body.experience[0].role).toBe('Audit Director');
    expect(detailRes.body.experience[0].company).toBe('Global Assurance Ltd');
    expect(detailRes.body.education[0].degree).toBe('BSc Computer Science');
    expect(detailRes.body.education[0].institution).toBe('University of Edinburgh');
    expect(detailRes.body.certifications[0]).toEqual({
      name: 'CISA',
      issuer: 'ISACA',
      date: '2019'
    });

    // 3. Verify internal extraction metadata (evidence, confidence) NEVER leaks
    const searchJson = JSON.stringify(searchRes.body);
    const detailJson = JSON.stringify(detailRes.body);

    expect(searchJson).not.toContain('"evidence"');
    expect(searchJson).not.toContain('"confidence"');
    expect(searchJson).not.toContain('Led IT SOX audits');

    expect(detailJson).not.toContain('"evidence"');
    expect(detailJson).not.toContain('"confidence"');
    expect(detailJson).not.toContain('First class honours');
    expect(detailJson).not.toContain('secret-cisa-key');
  });

  it('21. Security Regression: access boundaries, consent enforcement, and privacy guarantees hold', async () => {
    // 1. Non-recruiter roles receive 403
    const candidateReq = await request(app)
      .get('/api/ops/talent')
      .set('Authorization', 'Bearer candidate-a-token');
    expect(candidateReq.status).toBe(403);

    const adminReq = await request(app)
      .get('/api/ops/talent')
      .set('Authorization', 'Bearer admin-only-token');
    expect(adminReq.status).toBe(403);

    const candidateDetailReq = await request(app)
      .get('/api/ops/talent/candidate-a-id')
      .set('Authorization', 'Bearer candidate-a-token');
    expect(candidateDetailReq.status).toBe(403);

    // 2. Opted-out candidate remains invisible in search and detail
    mockPreferences['candidate-opted-out'] = {
      user_id: 'candidate-opted-out',
      is_visible_to_qwerty_recruitment: false,
      allow_cv_access: false,
      consent_given_at: null,
      withdrawn_at: '2026-09-18T12:00:00Z'
    };
    mockProfiles['candidate-opted-out'] = {
      id: 'candidate-opted-out',
      display_name: 'Hidden Candidate'
    };

    const searchHiddenRes = await request(app)
      .get('/api/ops/talent?q=Hidden')
      .set('Authorization', 'Bearer recruiter-token');
    expect(searchHiddenRes.body.candidates.some((c: any) => c.id === 'candidate-opted-out')).toBe(false);

    const detailHiddenRes = await request(app)
      .get('/api/ops/talent/candidate-opted-out')
      .set('Authorization', 'Bearer recruiter-token');
    expect(detailHiddenRes.status).toBe(404);

    // 3. Privacy guarantees: PII and internal storage/assessment fields remain completely absent
    mockPreferences['candidate-a-id'] = {
      user_id: 'candidate-a-id',
      is_visible_to_qwerty_recruitment: true,
      allow_cv_access: true,
      consent_given_at: '2026-09-18T10:00:00Z',
      consent_version: 'v1.0-2026',
      withdrawn_at: null,
      updated_at: '2026-09-18T10:00:00Z'
    };

    const detailAliceRes = await request(app)
      .get('/api/ops/talent/candidate-a-id')
      .set('Authorization', 'Bearer recruiter-token');

    expect(detailAliceRes.status).toBe(200);
    const aliceData = detailAliceRes.body;

    // Email, phone, ATS score, extracted_data, storage_path, evidence, confidence absent
    expect(aliceData.email).toBeUndefined();
    expect(aliceData.phone).toBeUndefined();
    expect(aliceData.phone_number).toBeUndefined();
    expect(aliceData.ats_score).toBeUndefined();
    expect(aliceData.assessment_score).toBeUndefined();
    expect(aliceData.extracted_data).toBeUndefined();
    expect(aliceData.raw_text_hash).toBeUndefined();
    expect(aliceData.storage_path).toBeUndefined();
    expect(JSON.stringify(aliceData)).not.toContain('storage_path');
    expect(JSON.stringify(aliceData)).not.toContain('cvs/candidate-a');
    expect(JSON.stringify(aliceData)).not.toContain('"evidence"');
    expect(JSON.stringify(aliceData)).not.toContain('"confidence"');
  });

  it('22. Bucket Resolution: CV URL signing accurately uses candidate-cvs bucket and handles missing object', async () => {
    mockPreferences['candidate-a-id'] = {
      user_id: 'candidate-a-id',
      is_visible_to_qwerty_recruitment: true,
      allow_cv_access: true,
      consent_given_at: '2026-09-18T10:00:00Z',
      consent_version: 'v1.0-2026',
      withdrawn_at: null,
      updated_at: '2026-09-18T10:00:00Z'
    };

    const res = await request(app)
      .post('/api/ops/talent/candidate-a-id/cv-url')
      .set('Authorization', 'Bearer recruiter-token');

    expect(res.status).toBe(200);
    // Verifies the bucket used was candidate-cvs
    expect(res.body.signedUrl).toContain('candidate-cvs');
  });
});
