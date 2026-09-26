import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { candidateRouter } from '../../../../server/routes/candidate.js';
import { jobsRouter } from '../../../../server/routes/jobs.js';
import { jobImportsRouter } from '../../../../server/routes/jobImports.js';

vi.mock('../../../../server/middleware/auth.js', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    if (req.headers.authorization === 'Bearer candidate-token') {
      req.user = { id: 'candidate-id', roles: ['candidate'] };
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

const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockIs = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'new-cv-id', version_number: 1 }, error: null });
const mockUpdate = vi.fn();
const mockInsert = vi.fn();
const mockUpload = vi.fn();
const mockRpc = vi.fn();
const mockCreateSignedUrl = vi.fn();
const mockRemove = vi.fn();


const builder: any = {
  select: mockSelect,
  eq: mockEq,
  is: mockIs,
  order: mockOrder,
  limit: mockLimit,
  single: mockSingle,
  update: mockUpdate,
  insert: mockInsert,
  then: function(resolve, reject) {
    resolve({ data: null, error: null });
  }
};


mockSelect.mockImplementation(() => builder);
mockEq.mockImplementation(() => builder);
mockIs.mockImplementation(() => builder);
mockOrder.mockImplementation(() => builder);
mockLimit.mockImplementation(() => builder);
mockUpdate.mockImplementation(() => builder);
mockInsert.mockImplementation(() => builder);
mockInsert.mockImplementation(() => builder);

vi.mock('../../../../server/db/supabase.js', () => ({
  getAdminClient: () => ({
      from: (table: string) => builder,
      rpc: mockRpc,
      storage: {
        from: (bucket: string) => ({
          upload: mockUpload,
          createSignedUrl: mockCreateSignedUrl,
          remove: mockRemove
        })
      }
    }),
    getAuthClient: () => ({
    from: (table: string) => builder,
    rpc: mockRpc,
    storage: {
      from: (bucket: string) => ({
        upload: mockUpload,
        createSignedUrl: mockCreateSignedUrl,
        remove: mockRemove
      })
    }
  })
}));

const app = express();
app.use(express.json());
app.use('/api/candidate', candidateRouter);
app.use('/api/ops/jobs', jobsRouter);
app.use('/api/ops/imports', jobImportsRouter);

describe('candidateRouter & role security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Ops routes negative access', () => {
    it('blocks candidate from /api/ops/jobs', async () => {
      const res = await request(app).get('/api/ops/jobs').set('Authorization', 'Bearer candidate-token');
      expect(res.status).toBe(403);
    });

    it('blocks candidate from /api/ops/imports/batches', async () => {
      const res = await request(app).get('/api/ops/imports/batches').set('Authorization', 'Bearer candidate-token');
      expect(res.status).toBe(403);
    });
  });

  describe('Candidate Profile', () => {
    it('candidate can read own profile', async () => {
      mockSingle.mockResolvedValueOnce({ data: { id: 'candidate-id', display_name: 'John' }, error: null });
      const res = await request(app).get('/api/candidate/profile').set('Authorization', 'Bearer candidate-token');
      
      expect(res.status).toBe(200);
      expect(res.body.display_name).toBe('John');
      expect(mockEq).toHaveBeenCalledWith('id', 'candidate-id');
    });

    it('candidate can update allowed profile fields', async () => {
      mockSingle.mockResolvedValueOnce({ data: { id: 'candidate-id', display_name: 'John Updated' }, error: null });
      const res = await request(app)
        .patch('/api/candidate/profile')
        .set('Authorization', 'Bearer candidate-token')
        .send({ display_name: 'John Updated', role: 'admin', profile_status: 'published' });
      
      expect(res.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ display_name: 'John Updated' }));
      expect(mockUpdate).not.toHaveBeenCalledWith(expect.objectContaining({ role: 'admin' }));
      expect(mockUpdate).not.toHaveBeenCalledWith(expect.objectContaining({ profile_status: 'published' }));
    });
  });

  describe('Candidate CV Storage', () => {
    it('candidate can list own CVs', async () => {
      mockOrder.mockResolvedValueOnce({ data: [{ id: 'cv-1' }], error: null });
      const res = await request(app).get('/api/candidate/cvs').set('Authorization', 'Bearer candidate-token');
      expect(res.status).toBe(200);
      expect(mockEq).toHaveBeenCalledWith('user_id', 'candidate-id');
    });

    it('invalid MIME rejected', async () => {
      const res = await request(app)
        .post('/api/candidate/cvs')
        .set('Authorization', 'Bearer candidate-token')
        .attach('cvFile', Buffer.from('console.log("hacked")'), { filename: 'hacked.js', contentType: 'application/javascript' });
      
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid file format');
    });

    it('candidate can upload valid PDF', async () => {
      mockUpload.mockResolvedValueOnce({ data: { path: '...' }, error: null });
      mockRpc.mockResolvedValueOnce({ data: { id: 'new-cv' }, error: null });

      // fake-pdf won't pass magic bytes. Needs to be a valid pdf signature
      const validPdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34]);

      const res = await request(app)
        .post('/api/candidate/cvs')
        .set('Authorization', 'Bearer candidate-token')
        .attach('cvFile', validPdfBuffer, { filename: 'resume.pdf', contentType: 'application/pdf' });
      
      expect(res.status).toBe(201);
      
      // Upload uses service role (which getAdminClient mocks) and specific path
      expect(mockUpload).toHaveBeenCalled();
      const pathArg = mockUpload.mock.calls[0][0];
      expect(pathArg).toContain('candidate-id/');
      
      // Uses RPC
      // Uses RPC
      expect(mockRpc).toHaveBeenCalledWith('candidate_add_cv_version', expect.objectContaining({
        p_user_id: 'candidate-id',
        p_mime_type: 'application/pdf'
      }));
    });
    
    it('invalid magic bytes rejected despite valid extension/MIME', async () => {
      // Buffer starts with arbitrary fake bytes, not %PDF-
      const invalidBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
      
      const res = await request(app)
        .post('/api/candidate/cvs')
        .set('Authorization', 'Bearer candidate-token')
        .attach('cvFile', invalidBuffer, { filename: 'resume.pdf', contentType: 'application/pdf' });
        
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid file signature');
    });


    it('rejects plain ZIP file pretending to be DOCX', async () => {
      // PK\x03\x04 without word/ or [Content_Types].xml
      const zipBuffer = Buffer.from('504b0304140008000800', 'hex');
      const res = await request(app)
        .post('/api/candidate/cvs')
        .set('Authorization', 'Bearer candidate-token')
        .attach('cvFile', zipBuffer, { filename: 'resume.docx', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid file signature');
    });

    it('accepts valid DOCX file', async () => {
      mockUpload.mockResolvedValueOnce({ data: { path: '...' }, error: null });
      mockRpc.mockResolvedValueOnce({ data: { id: 'new-cv' }, error: null });
      
      const docxHeader = Buffer.from('504b0304', 'hex');
      const contentTypes = Buffer.from('[Content_Types].xml', 'ascii');
      const docxBuffer = Buffer.concat([docxHeader, Buffer.alloc(10), contentTypes]);
      
      const res = await request(app)
        .post('/api/candidate/cvs')
        .set('Authorization', 'Bearer candidate-token')
        .attach('cvFile', docxBuffer, { filename: 'resume.docx', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        
      expect(res.status).toBe(201);
    });
    it('storage compensation runs if db fails', async () => {
      mockUpload.mockResolvedValueOnce({ data: { path: '...' }, error: null });
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'db error' } });
      mockRemove.mockResolvedValueOnce({ data: null, error: null });

      const validPdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34]);

      const res = await request(app)
        .post('/api/candidate/cvs')
        .set('Authorization', 'Bearer candidate-token')
        .attach('cvFile', validPdfBuffer, { filename: 'resume.pdf', contentType: 'application/pdf' });
      
      expect(res.status).toBe(500);
      expect(mockRemove).toHaveBeenCalled();
    });

    it('candidate can obtain own short-lived access URL', async () => {
      mockSingle.mockResolvedValueOnce({ data: { storage_path: 'candidate-id/uuid/resume.pdf' }, error: null });
      mockCreateSignedUrl.mockResolvedValueOnce({ data: { signedUrl: 'http://signed' }, error: null });

      const res = await request(app).get('/api/candidate/cvs/cv-1/access').set('Authorization', 'Bearer candidate-token');
      expect(res.status).toBe(200);
      expect(res.body.signedUrl).toBe('http://signed');
      
      expect(mockEq).toHaveBeenCalledWith('user_id', 'candidate-id');
    });


});});
