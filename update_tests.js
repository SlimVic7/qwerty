import fs from 'fs';
let content = fs.readFileSync('src/features/candidate/tests/candidateRouter.test.ts', 'utf-8');

const newTest = `
    it('rejects plain ZIP file pretending to be DOCX', async () => {
      // PK\\x03\\x04 without word/ or [Content_Types].xml
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
`;

content = content.replace("    it('storage compensation runs if db fails', async () => {", newTest + "    it('storage compensation runs if db fails', async () => {");
fs.writeFileSync('src/features/candidate/tests/candidateRouter.test.ts', content);
