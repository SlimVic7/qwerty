
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { jobImportsService } from '../jobImports.service.js';
import { authFetch } from '../../../../../lib/authFetch.js';
import { supabase } from '../../../../../lib/supabase.js';

// Mock the global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock('../../../../../lib/supabase.js', () => ({
  supabase: {
    auth: {
      getSession: vi.fn()
    }
  }
}));

describe('jobImportsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('missing Supabase session causes no API request and throws session expired', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null }, error: null });

    await expect(jobImportsService.getBatches()).rejects.toThrow('Your session has expired. Please sign in again.');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('GET batch requests include Bearer token', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({ 
      data: { session: { access_token: 'mock-token' } }, 
      error: null 
    });
    mockFetch.mockResolvedValue({ ok: true, json: async () => ([]) });

    await jobImportsService.getBatches();
    
    expect(mockFetch).toHaveBeenCalledWith('/api/ops/imports/batches', expect.objectContaining({
      headers: expect.objectContaining({
        'Authorization': 'Bearer mock-token'
      })
    }));
  });

  it('POST batch request includes Authorization Bearer token', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({ 
      data: { session: { access_token: 'mock-token' } }, 
      error: null 
    });
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });

    await jobImportsService.createBatch('raw text');
    
    expect(mockFetch).toHaveBeenCalledWith('/api/ops/imports/batches', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'Authorization': 'Bearer mock-token',
        'Content-Type': 'application/json'
      })
    }));
  });

  it('PATCH item requests include Bearer token', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({ 
      data: { session: { access_token: 'mock-token' } }, 
      error: null 
    });
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });

    await jobImportsService.updateItem('item-123', { review_status: 'approved' });
    
    expect(mockFetch).toHaveBeenCalledWith('/api/ops/imports/items/item-123', expect.objectContaining({
      method: 'PATCH',
      headers: expect.objectContaining({
        'Authorization': 'Bearer mock-token',
        'Content-Type': 'application/json'
      })
    }));
  });
  
  it('token itself is never logged in error messages', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({ 
      data: { session: { access_token: 'secret-mock-token' } }, 
      error: null 
    });
    mockFetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: 'Internal Error' }) });

    try {
      await jobImportsService.getBatches();
    } catch (e: any) {
      expect(e.message).not.toContain('secret-mock-token');
      expect(e.message).toContain('Internal Error');
    }
  });

    });

