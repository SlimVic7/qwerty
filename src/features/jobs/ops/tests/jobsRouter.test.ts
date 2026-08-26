import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import { jobsRouter } from '../../../../../server/routes/jobs.js';
import * as authModule from '../../../../../server/middleware/auth.js';
import * as dbModule from '../../../../../server/db/supabase.js';

vi.mock('../../../../../server/middleware/auth.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../../server/middleware/auth.js')>();
  return {
    ...actual,
    requireAuth: vi.fn((req, res, next) => {
      req.user = { id: 'u1', roles: req.headers['x-mock-role'] ? (req.headers['x-mock-role'] as string).split(',') : ['editor'] };
      next();
    }),
  };
});

const mockRpc = vi.fn();
vi.mock('../../../../../server/db/supabase.js', () => ({
  getAdminClient: vi.fn(() => ({
    rpc: mockRpc,
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn()
  }))
}));

describe('Jobs Express Router (RPC Hardening)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const runRoute = async (method: string, path: string, body: any, headers: any = {}) => {
    const req = { method, url: path, body, headers, params: {} } as any;
    
    // Extrapolate params
    let matchPath = path;
    if (path.startsWith('/') && path !== '/') {
      const parts = path.split('/');
      if (parts.length > 2) {
        matchPath = '/:id/' + parts[2];
        req.params.id = parts[1];
      } else {
        matchPath = '/:id';
        req.params.id = parts[1];
      }
    }

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as any;

    const route = jobsRouter.stack.find(l => l.route && (l.route as any).path === matchPath && (l.route as any).methods[method.toLowerCase()]);
    
    if (!route) {
      throw new Error(`Route ${method} ${path} not found`);
    }

    // Run middlewares
    for (const handler of route.route.stack) {
      let isNextCalled = false;
      const next = () => { isNextCalled = true; };
      await handler.handle(req, res, next);
      if (!isNextCalled) break;
    }
    return res;
  };

  it('create request rejects arbitrary unexpected payload fields and enforces valid data', async () => {
    mockRpc.mockResolvedValue({ data: { id: 'job1' }, error: null });
    
    const res = await runRoute('POST', '/', {
      title: 'Valid', company_name: 'Co', description: 'Desc', 
      sneaky_field: 'hacked'
    });
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid update field: sneaky_field' });
  });

  it('create request maps DB validation errors correctly', async () => {
    const res = await runRoute('POST', '/', { title: 'Missing Rest' });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Title, company name, and description are required' });
  });

  it('mutation RPC failure produces no successful API response', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'Insufficient permissions' } });
    
    const res = await runRoute('POST', '/', { title: 'Valid', company_name: 'Co', description: 'Desc' });
    
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
  });

  it('privileged mutation endpoints use transactional RPC functions (publish)', async () => {
    mockRpc.mockResolvedValue({ data: { id: 'j1', status: 'published' }, error: null });
    const res = await runRoute('POST', '/j1/publish', {}, { 'x-mock-role': 'admin' });
    
    expect(res.status).not.toHaveBeenCalledWith(400);
    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(res.status).not.toHaveBeenCalledWith(404);
    expect(mockRpc).toHaveBeenCalledWith('ops_transition_job', {
      p_job_id: 'j1',
      p_actor_id: 'u1',
      p_transition: 'publish'
    });
  });

  it('PATCH title only preserves all other fields', async () => {
    mockRpc.mockResolvedValue({ data: { id: 'j1', title: 'New Title' }, error: null });
    const res = await runRoute('PATCH', '/j1', { title: 'New Title' }, { 'x-mock-role': 'admin' });
    
    expect(res.status).not.toHaveBeenCalledWith(400);
    expect(mockRpc).toHaveBeenCalledWith('ops_update_job', {
      p_job_id: 'j1',
      p_actor_id: 'u1',
      p_updates: { title: 'New Title' }
    });
  });

  it('PATCH one optional field to null clears only that field', async () => {
    mockRpc.mockResolvedValue({ data: { id: 'j1' }, error: null });
    const res = await runRoute('PATCH', '/j1', { salary_max: null }, { 'x-mock-role': 'admin' });
    
    expect(res.status).not.toHaveBeenCalledWith(400);
    expect(mockRpc).toHaveBeenCalledWith('ops_update_job', {
      p_job_id: 'j1',
      p_actor_id: 'u1',
      p_updates: { salary_max: null }
    });
  });

  it('unknown PATCH keys are rejected', async () => {
    const res = await runRoute('PATCH', '/j1', { title: 'New', status: 'published' }, { 'x-mock-role': 'admin' });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid update field: status' });
  });

  it('empty PATCH is rejected', async () => {
    const res = await runRoute('PATCH', '/j1', {}, { 'x-mock-role': 'admin' });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Empty patch payload' });
  });
});
