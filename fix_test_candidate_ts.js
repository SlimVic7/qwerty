import fs from 'fs';
let content = fs.readFileSync('src/features/candidate/tests/candidateRouter.test.ts', 'utf-8');

// The DB mock needs rpc mocked
content = content.replace("const mockUpload = vi.fn();", "const mockUpload = vi.fn();\nconst mockRpc = vi.fn();");
content = content.replace("from: (table: string) => builder,", "from: (table: string) => builder,\n    rpc: mockRpc,");

// Update the upload test
const oldUploadTest = `    it('candidate can upload valid PDF', async () => {
      mockLimit.mockResolvedValueOnce({ data: [{ version_number: 1 }], error: null }); // previous current
      mockUpload.mockResolvedValueOnce({ data: { path: '...' }, error: null });
      mockSingle.mockResolvedValueOnce({ data: { id: 'new-cv' }, error: null });

      const res = await request(app)
        .post('/api/candidate/cvs')
        .set('Authorization', 'Bearer candidate-token')
        .attach('cvFile', Buffer.from('fake-pdf'), { filename: 'resume.pdf', contentType: 'application/pdf' });
      
      expect(res.status).toBe(201);
      
      // Upload uses service role (which getAdminClient mocks) and specific path
      expect(mockUpload).toHaveBeenCalled();
      const pathArg = mockUpload.mock.calls[0][0];
      expect(pathArg).toContain('candidate-id/');
      
      // Makes old CV non-current
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ is_current: false }));
      
      // Inserts new CV
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'candidate-id', is_current: true, version_number: 2 }));
    });`;

const newUploadTest = `    it('candidate can upload valid PDF', async () => {
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
    });`;

content = content.replace(oldUploadTest, newUploadTest);
fs.writeFileSync('src/features/candidate/tests/candidateRouter.test.ts', content);
