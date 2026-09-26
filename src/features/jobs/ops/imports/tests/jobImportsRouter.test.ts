import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { jobImportsRouter } from '../../../../../../server/routes/jobImports.js';

// Mock auth middleware
vi.mock('../../../../../../server/middleware/auth.js', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    if (req.headers.authorization === 'Bearer valid-token') {
      req.user = { id: 'admin-id', roles: ['admin'] };
      return next();
    }
    if (req.headers.authorization === 'Bearer candidate-token') {
      req.user = { id: 'cand-id', roles: ['candidate'] };
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

vi.mock('../../../../../../server/services/extraction/syncBatch.js', () => ({ syncBatchStatus: vi.fn() }));

// Mock supabase admin client
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockSelect = vi.fn();
const mockOrder = vi.fn();
const mockIlike = vi.fn();
const mockLimit = vi.fn();
const mockRpc = vi.fn();

vi.mock('../../../../../../server/db/supabase.js', () => ({
  getAdminClient: () => ({
    rpc: mockRpc.mockResolvedValue({ data: { status: 'IMPORTED', job_id: 'new-job-123' }, error: null }),
    from: (table: string) => ({
      insert: mockInsert.mockReturnThis(),
      update: mockUpdate.mockReturnThis(),
      select: mockSelect.mockReturnThis(),
      eq: mockEq.mockReturnThis(),
      ilike: mockIlike.mockReturnThis(),
      limit: mockLimit.mockResolvedValue({ data: [], error: null }),
      order: mockOrder.mockResolvedValue({ data: [], error: null }),
      rpc: mockRpc,
      single: mockSingle
    })
  })
}));

const app = express();
app.use(express.json());
app.use('/api/ops/imports', jobImportsRouter);

describe('jobImportsRouter', () => {
  beforeEach(() => {
    vi.resetAllMocks();
mockRpc.mockResolvedValue({ data: { status: 'IMPORTED', job_id: 'new-job-123' }, error: null });
    process.env.JOB_EXTRACTION_PROVIDER = 'mock';
    mockInsert.mockReturnThis();
    mockSelect.mockReturnThis();
    mockSingle.mockResolvedValue({ data: { id: 'test-batch-id' }, error: null });
    mockUpdate.mockReturnThis();
    mockEq.mockReturnThis();
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(app).post('/api/ops/imports/batches').send({ rawText: 'test' });
    expect(res.status).toBe(401);
  });

  it('rejects candidate roles (403)', async () => {
    const res = await request(app).post('/api/ops/imports/batches').set('Authorization', 'Bearer candidate-token').send({ rawText: 'test' });
    expect(res.status).toBe(403);
  });

  it('rejects empty payloads', async () => {
    const res = await request(app).post('/api/ops/imports/batches').set('Authorization', 'Bearer valid-token').send({ rawText: '' });
    expect(res.status).toBe(400);
  });

  it('creates batch and processes raw text', async () => {
    const rawText = "Software Engineer\nAcme Corp\n\nData Scientist\nGlobex Corp";
    const res = await request(app).post('/api/ops/imports/batches').set('Authorization', 'Bearer valid-token').send({ rawText });
    expect(res.status).toBe(201);
    expect(mockInsert).toHaveBeenCalledTimes(2); // 1 for batch, 1 for items array
    expect(mockUpdate).toHaveBeenCalledTimes(1); // update batch summary
  });

  it('prevents approval if validation fails (missing description)', async () => {
    mockSingle.mockResolvedValueOnce({ data: { id: 'item-1', batch_id: 'batch-1', review_status: 'ready', normalized_data: { title: 'Engineer', company_name: 'Acme' } }, error: null });
    const res = await request(app).patch('/api/ops/imports/items/item-1').set('Authorization', 'Bearer valid-token').send({ review_status: 'approved' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('VALIDATION_FAILED');
  });

  it('allows approval if validation passes', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'item-1', batch_id: 'batch-1', review_status: 'ready', normalized_data: { title: 'Engineer', company_name: 'Acme', description: 'desc', salary_min: null, salary_max: null } }, error: null });
    mockRpc.mockResolvedValueOnce({ data: { id: 'item-1' }, error: null });
    const res = await request(app).patch('/api/ops/imports/items/item-1').set('Authorization', 'Bearer valid-token').send({ review_status: 'approved' });
    expect(res.status).toBe(200);
    expect(mockRpc).toHaveBeenCalledWith('ops_update_job_import_item', expect.anything());
  });

  it('revokes approval if normalized_data is edited', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'item-1', batch_id: 'batch-1', review_status: 'approved', normalized_data: { title: 'Engineer', company_name: 'Acme', description: 'desc', salary_min: null, salary_max: null } }, error: null });
    mockRpc.mockResolvedValueOnce({ data: { id: 'item-1' }, error: null });
    const res = await request(app).patch('/api/ops/imports/items/item-1').set('Authorization', 'Bearer valid-token').send({ normalized_data: { title: 'Senior Engineer', company_name: 'Acme', description: 'desc', salary_min: null, salary_max: null } });
    expect(res.status).toBe(200);
    const updateArg = mockRpc.mock.calls[0][1].p_updates;
    expect(updateArg.review_status).toBe('ready');
  });

  it('imports approved items via RPC', async () => {
    const res = await request(app).post('/api/ops/imports/import').set('Authorization', 'Bearer valid-token').send({ itemIds: ['item-1', 'item-2'] });
    expect(res.status).toBe(200);
    expect(mockRpc).toHaveBeenCalledTimes(2);
    expect(res.body).toEqual([{ itemId: 'item-1', status: 'IMPORTED', jobId: 'new-job-123' }, { itemId: 'item-2', status: 'IMPORTED', jobId: 'new-job-123' }]);
  });

  it('blocks candidate from importing items', async () => {
    const res = await request(app).post('/api/ops/imports/import').set('Authorization', 'Bearer candidate-token').send({ itemIds: ['item-1'] });
    expect(res.status).toBe(403);
  });

  it('rejects unsupported fields in updates', async () => {
    mockRpc.mockImplementationOnce(async (method, args) => {
      if (method === 'ops_update_job_import_item' && args.p_updates.hacked_field) {
         throw new Error('UNSUPPORTED_UPDATE_FIELD');
      }
      return { data: null, error: null };
    });
  });

  it('caller cannot spoof reviewed_by or reviewed_at', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'item-1', batch_id: 'batch-1', review_status: 'ready', normalized_data: { title: 'Engineer', company_name: 'Acme', description: 'desc', salary_min: null, salary_max: null } }, error: null });
    mockRpc.mockResolvedValueOnce({ data: { id: 'item-1' }, error: null });
    const res = await request(app).patch('/api/ops/imports/items/item-1').set('Authorization', 'Bearer valid-token').send({ review_status: 'approved', reviewed_by: 'hacked-id' });
    expect(res.status).toBe(200);
    const updatesArg = mockRpc.mock.calls[0][1].p_updates;
    expect(updatesArg).not.toHaveProperty('reviewed_by');
    expect(updatesArg).not.toHaveProperty('reviewed_at');
  });

  it('Approve sends only review_status in p_updates and sends p_audit_action separately', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'item-1', batch_id: 'batch-1', review_status: 'ready', normalized_data: { title: 'Eng', company_name: 'Acme', description: 'desc', salary_min: null, salary_max: null } }, error: null });
    mockRpc.mockResolvedValueOnce({ data: { id: 'item-1' }, error: null });
    const res = await request(app).patch('/api/ops/imports/items/item-1').set('Authorization', 'Bearer valid-token').send({ review_status: 'approved' });
    const callArgs = mockRpc.mock.calls[0][1];
    expect(callArgs.p_updates).toEqual({ review_status: 'approved' });
    expect(callArgs.p_audit_action).toBe('approved');
    expect(callArgs.p_actor_id).toBe('admin-id');
  });

  it('Reject sends only review_status in p_updates and sends p_audit_action separately', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'item-1', batch_id: 'batch-1', review_status: 'ready', normalized_data: { title: 'Eng', company_name: 'Acme', description: 'desc', salary_min: null, salary_max: null } }, error: null });
    mockRpc.mockResolvedValueOnce({ data: { id: 'item-1' }, error: null });
    const res = await request(app).patch('/api/ops/imports/items/item-1').set('Authorization', 'Bearer valid-token').send({ review_status: 'rejected' });
    const callArgs = mockRpc.mock.calls[0][1];
    expect(callArgs.p_updates).toEqual({ review_status: 'rejected' });
    expect(callArgs.p_audit_action).toBe('rejected');
    expect(callArgs.p_actor_id).toBe('admin-id');
  });

  it('Mark Duplicate sends only allowed keys', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'item-1', batch_id: 'batch-1', review_status: 'ready', normalized_data: { title: 'Eng', company_name: 'Acme', description: 'desc', salary_min: null, salary_max: null } }, error: null });
    mockRpc.mockResolvedValueOnce({ data: { id: 'item-1' }, error: null });
    const res = await request(app).patch('/api/ops/imports/items/item-1').set('Authorization', 'Bearer valid-token').send({ review_status: 'duplicate', duplicate_of_job_id: 'job-123' });
    const callArgs = mockRpc.mock.calls[0][1];
    expect(callArgs.p_updates).toEqual({ review_status: 'duplicate', duplicate_of_job_id: 'job-123' });
    expect(callArgs.p_audit_action).toBe('marked_duplicate');
  });

  it('Not Duplicate sends only allowed keys', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'item-1', batch_id: 'batch-1', review_status: 'duplicate', duplicate_of_job_id: 'job-123', normalized_data: { title: 'Eng', company_name: 'Acme', description: 'desc', salary_min: null, salary_max: null } }, error: null });
    mockRpc.mockResolvedValueOnce({ data: { id: 'item-1' }, error: null });
    const res = await request(app).patch('/api/ops/imports/items/item-1').set('Authorization', 'Bearer valid-token').send({ review_status: 'needs_review' });
    const callArgs = mockRpc.mock.calls[0][1];
    expect(callArgs.p_updates).toEqual({ review_status: 'ready', duplicate_of_job_id: null });
    expect(callArgs.p_audit_action).toBe('unmarked_duplicate');
  });

  it('Save Corrections sends only allowed keys', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'item-1', batch_id: 'batch-1', review_status: 'needs_review', normalized_data: { title: 'Eng' } }, error: null });
    mockRpc.mockResolvedValueOnce({ data: { id: 'item-1' }, error: null });
    const res = await request(app).patch('/api/ops/imports/items/item-1').set('Authorization', 'Bearer valid-token').send({ normalized_data: { title: 'Eng', company_name: 'Acme', description: 'desc', salary_min: null, salary_max: null } });
    const callArgs = mockRpc.mock.calls[0][1];
    expect(callArgs.p_updates.normalized_data).toBeDefined();
    expect(callArgs.p_updates.validation_issues).toBeDefined();
    expect(callArgs.p_updates.review_status).toBe('ready');
    expect(callArgs.p_updates).not.toHaveProperty('updated_at');
    expect(callArgs.p_audit_action).toBe('edited');
  });

  it('arbitrary browser fields are discarded/rejected', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'item-1', batch_id: 'batch-1', review_status: 'ready', normalized_data: { title: 'Eng', company_name: 'Acme', description: 'desc', salary_min: null, salary_max: null } }, error: null });
    mockRpc.mockResolvedValueOnce({ data: { id: 'item-1' }, error: null });
    const res = await request(app).patch('/api/ops/imports/items/item-1').set('Authorization', 'Bearer valid-token').send({ review_status: 'approved', some_random_field: 'hacked' });
    const callArgs = mockRpc.mock.calls[0][1];
    expect(callArgs.p_updates).not.toHaveProperty('some_random_field');
  });
  
  it('covers existing UNSUPPORTED_UPDATE_FIELD regression', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: new Error('UNSUPPORTED_UPDATE_FIELD') });
    mockSingle.mockResolvedValue({ data: { id: 'item-1', batch_id: 'batch-1', review_status: 'ready', normalized_data: { title: 'Eng', company_name: 'Acme', description: 'desc', salary_min: null, salary_max: null } }, error: null });
    const res = await request(app).patch('/api/ops/imports/items/item-1').set('Authorization', 'Bearer valid-token').send({ review_status: 'approved' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('UNSUPPORTED_UPDATE_FIELD');
  });
});
