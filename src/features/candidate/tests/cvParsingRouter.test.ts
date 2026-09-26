import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import * as supabaseDb from '../../../../server/db/supabase.js';
import * as textExtractor from '../../../../server/services/cv/textExtractor.js';

// Mock auth
vi.mock('../../../../server/middleware/auth.js', () => {
  return {
    requireAuth: vi.fn((req, res, next) => {
      req.user = { id: 'user-1' };
      next();
    })
  };
});

import { cvParsingRouter } from '../../../../server/routes/cvParsing.js';

// Mock Gemini
vi.mock('../../../../server/services/extraction/providers/GeminiCVExtractionProvider.js', () => {
  return {
    GeminiCVExtractionProvider: class MockGeminiCVExtractionProvider {
      async extractCV() {
        return {
          personal: { full_name: 'John Doe', phone: '123' },
          professional: { headline: 'Developer' }
        };
      }
    }
  };
});

describe('cvParsingRouter', () => {
  let app: express.Application;
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      rpc: vi.fn().mockReturnThis(),
      storage: {
        from: vi.fn().mockReturnThis(),
        download: vi.fn()
      }
    };

    vi.spyOn(supabaseDb, 'getAdminClient').mockReturnValue(mockSupabase);

    app = express();
    app.use(express.json());
    app.use('/api/candidate/cvs', cvParsingRouter);
  });

  it('fails if cv not found or not owned', async () => {
    mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });
    
    const res = await request(app).post('/api/candidate/cvs/cv-1/parse');
    expect(res.status).toBe(404);
  });

  it('prevents duplicate processing if already processing', async () => {
    // 1. CV found
    mockSupabase.single.mockResolvedValueOnce({ data: { id: 'cv-1', storage_path: 'path', mime_type: 'application/pdf' }, error: null });
    // 2. Parse found and is pending
    mockSupabase.single.mockResolvedValueOnce({ data: { id: 'parse-1', status: 'processing' }, error: null });

    const res = await request(app).post('/api/candidate/cvs/cv-1/parse');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('processing');
  });

  it('handles unique constraint conflict by fetching active parse', async () => {
    // 1. CV found
    mockSupabase.single.mockResolvedValueOnce({ data: { id: 'cv-1', storage_path: 'path', mime_type: 'application/pdf' }, error: null });
    // 2. Parse initially not found
    mockSupabase.single.mockResolvedValueOnce({ data: null, error: null });
    // 3. Insert fails with 23505
    mockSupabase.single.mockResolvedValueOnce({ data: null, error: { code: '23505' } });
    // 4. Fetches active parse
    mockSupabase.single.mockResolvedValueOnce({ data: { id: 'parse-2', status: 'pending' }, error: null });

    const res = await request(app).post('/api/candidate/cvs/cv-1/parse');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('pending');
    expect(res.body.id).toBe('parse-2');
  });

  it('runs extraction flow', async () => {
    // 1. CV found
    mockSupabase.single.mockResolvedValueOnce({ data: { id: 'cv-1', storage_path: 'path', mime_type: 'application/pdf' }, error: null });
    // 2. Parse not found
    mockSupabase.single.mockResolvedValueOnce({ data: null, error: null });
    // 3. Insert parse
    mockSupabase.single.mockResolvedValueOnce({ data: { id: 'parse-new' }, error: null });
    
    // 4. Download
    mockSupabase.storage.download.mockResolvedValueOnce({ data: new Blob(['test']), error: null });

    vi.spyOn(textExtractor, 'extractTextFromCV').mockResolvedValueOnce({ text: 'CV content', hash: 'abc' });

    // 5. Update to processing
    // 6. Complete
    mockSupabase.single.mockResolvedValueOnce({ data: { id: 'parse-new', status: 'needs_review' }, error: null });

    const res = await request(app).post('/api/candidate/cvs/cv-1/parse');
    expect(res.status).toBe(200);
  });

  it('applies to profile properly and saves reviewed_data using RPC', async () => {
    // 1. RPC success
    mockSupabase.rpc.mockResolvedValueOnce({ error: null });

    // 2. Fetch updated parse record
    mockSupabase.single.mockResolvedValueOnce({ data: { id: 'parse-1', status: 'completed' }, error: null });

    const res = await request(app).post('/api/candidate/cvs/cv-1/parse/apply').send({
      parse_id: 'parse-1',
      profile_updates: { 
        personal: { full_name: 'Updated Name', hacker_field: 'discarded' }
      }
    });
    
    expect(res.status).toBe(200);

    // RPC should be called with parameters
    expect(mockSupabase.rpc).toHaveBeenCalledWith('candidate_apply_cv_parse', expect.objectContaining({
      p_parse_id: 'parse-1',
      p_user_id: 'user-1',
      p_reviewed_data: { 
        personal: { full_name: 'Updated Name' }
      }
    }));
  });
});
