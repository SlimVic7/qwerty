import fs from 'fs';
let content = fs.readFileSync('src/features/jobs/ops/imports/tests/jobImportsRouter.test.ts', 'utf-8');

// I'll just rewrite the tests appended at the end clearly by finding the "caller cannot spoof" test string and cutting off everything from there, then re-appending cleanly.
const cutoff = content.indexOf("it('rejects unsupported fields in updates'");

if (cutoff > -1) {
  content = content.substring(0, cutoff);
}

const newTests = `it('rejects unsupported fields in updates', async () => {
    mockRpc.mockImplementationOnce(async (method, args) => {
      if (method === 'ops_update_job_import_item' && args.p_updates.hacked_field) {
         throw new Error('UNSUPPORTED_UPDATE_FIELD');
      }
      return { data: null, error: null };
    });
  });

  it('caller cannot spoof reviewed_by or reviewed_at', async () => {
    mockSelect.mockReturnValue({
      single: vi.fn().mockResolvedValue({ 
        data: { id: 'item-1', batch_id: 'batch-1', review_status: 'ready' }, 
        error: null 
      })
    });
    mockRpc.mockResolvedValueOnce({ data: { id: 'item-1' }, error: null });
    
    const res = await request(app)
      .patch('/items/item-1')
      .set('Authorization', 'Bearer valid-token')
      .send({ review_status: 'approved', reviewed_by: 'hacked-id' });
      
    expect(res.status).toBe(200);
    const updatesArg = mockRpc.mock.calls[mockRpc.mock.calls.length - 1][1].p_updates;
    expect(updatesArg).not.toHaveProperty('reviewed_by');
    expect(updatesArg).not.toHaveProperty('reviewed_at');
  });

  it('validation blocks import', async () => {
    mockSelect.mockReturnValue({
      single: vi.fn().mockResolvedValue({ 
        data: { id: 'item-1', batch_id: 'batch-1', review_status: 'ready' }, 
        error: null 
      })
    });
    mockRpc.mockImplementationOnce(async (method) => {
      if (method === 'ops_import_job_item') {
         throw new Error('VALIDATION_FAILED');
      }
      return { data: null, error: null };
    });
    
    const res = await request(app)
      .post('/import')
      .set('Authorization', 'Bearer valid-token')
      .send({ itemIds: ['item-1'] });
      
    expect(res.status).toBe(200); 
    expect(res.body[0].status).toBe('failed');
    expect(res.body[0].reason).toBe('VALIDATION_FAILED');
  });
});
`;

fs.writeFileSync('src/features/jobs/ops/imports/tests/jobImportsRouter.test.ts', content + newTests);
