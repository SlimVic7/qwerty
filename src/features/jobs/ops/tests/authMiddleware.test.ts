import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireAuth, requireRole } from '../../../../../server/middleware/auth.js';
import * as dbModule from '../../../../../server/db/supabase.js';

describe('Server Role & Auth Middleware', () => {
  it('rejects unauthenticated requests', async () => {
    const req = { headers: {} } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();
    
    await requireAuth(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing or invalid authorization header' });
  });

  it('rejects insufficient-role mutation requests', () => {
    const req = { user: { roles: ['editor'] } } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();
    
    const middleware = requireRole(['admin', 'super_admin']);
    middleware(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
    expect(next).not.toHaveBeenCalled();
  });

  it('allows sufficient role (admin)', () => {
    const req = { user: { roles: ['admin'] } } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();
    
    const middleware = requireRole(['admin', 'super_admin']);
    middleware(req, res, next);
    
    expect(next).toHaveBeenCalled();
  });

  it('allows candidate + editor when editor is authorized', () => {
    const req = { user: { roles: ['candidate', 'editor'] } } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();
    
    const middleware = requireRole(['editor']);
    middleware(req, res, next);
    
    expect(next).toHaveBeenCalled();
  });
  
  it('handles multiple roles lookup correctly', async () => {
    const mockSupabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [{ role: 'candidate' }, { role: 'editor' }], error: null })
    };
    vi.spyOn(dbModule, 'getAdminClient').mockReturnValue(mockSupabase as any);
    
    const req = { headers: { authorization: 'Bearer token' } } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();
    
    await requireAuth(req, res, next);
    expect(req.user.roles).toEqual(['candidate', 'editor']);
    expect(next).toHaveBeenCalled();
  });

  it('unexpected role lookup failure fails closed (500)', async () => {
    const mockSupabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB Error' } })
    };
    vi.spyOn(dbModule, 'getAdminClient').mockReturnValue(mockSupabase as any);
    
    const req = { headers: { authorization: 'Bearer token' } } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();
    
    await requireAuth(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error during authentication' });
    expect(next).not.toHaveBeenCalled();
  });
});
