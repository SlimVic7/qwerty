import fs from 'fs';

let content = fs.readFileSync('src/features/jobs/ops/imports/tests/jobImportsRouter.test.ts', 'utf-8');

// Add rpc to the mock
content = content.replace(
  "order: mockOrder.mockResolvedValue({ data: [], error: null })",
  "order: mockOrder.mockResolvedValue({ data: [], error: null }),\n    rpc: vi.fn()"
);

content = content.replace(
  "const mockLimit = vi.fn();",
  "const mockLimit = vi.fn();\nconst mockRpc = vi.fn();"
);

content = content.replace(
  "getAdminClient: () => ({",
  "getAdminClient: () => ({\n    rpc: mockRpc.mockResolvedValue({ data: { status: 'IMPORTED', job_id: 'new-job-123' }, error: null }),"
);

// Add tests
const newTests = `
  it('prevents approval if validation fails (missing description)', async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'item-1',
        batch_id: 'batch-1',
        review_status: 'ready',
        normalized_data: { title: 'Engineer', company_name: 'Acme' } // Missing description
      },
      error: null
    });
    
    const res = await request(app)
      .patch('/api/ops/imports/items/item-1')
      .set('Authorization', 'Bearer valid-token')
      .send({ review_status: 'approved' });
      
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('VALIDATION_FAILED');
  });

  it('allows approval if validation passes', async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: 'item-1',
        batch_id: 'batch-1',
        review_status: 'ready',
        normalized_data: { title: 'Engineer', company_name: 'Acme', description: 'desc' }
      },
      error: null
    });
    
    const res = await request(app)
      .patch('/api/ops/imports/items/item-1')
      .set('Authorization', 'Bearer valid-token')
      .send({ review_status: 'approved' });
      
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('revokes approval if normalized_data is edited', async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: 'item-1',
        batch_id: 'batch-1',
        review_status: 'approved',
        normalized_data: { title: 'Engineer', company_name: 'Acme', description: 'desc' }
      },
      error: null
    });
    
    const res = await request(app)
      .patch('/api/ops/imports/items/item-1')
      .set('Authorization', 'Bearer valid-token')
      .send({ normalized_data: { title: 'Senior Engineer', company_name: 'Acme', description: 'desc' } });
      
    expect(res.status).toBe(200);
    // review_status should revert to ready since it still has all fields
    const updateArg = mockUpdate.mock.calls[0][0];
    expect(updateArg.review_status).toBe('ready');
  });

  it('imports approved items via RPC', async () => {
    const res = await request(app)
      .post('/api/ops/imports/import')
      .set('Authorization', 'Bearer valid-token')
      .send({ itemIds: ['item-1', 'item-2'] });
      
    expect(res.status).toBe(200);
    expect(mockRpc).toHaveBeenCalledTimes(2);
    expect(res.body).toEqual([
      { itemId: 'item-1', status: 'IMPORTED', jobId: 'new-job-123' },
      { itemId: 'item-2', status: 'IMPORTED', jobId: 'new-job-123' }
    ]);
  });
  
  it('blocks candidate from importing items', async () => {
    const res = await request(app)
      .post('/api/ops/imports/import')
      .set('Authorization', 'Bearer candidate-token')
      .send({ itemIds: ['item-1'] });
      
    expect(res.status).toBe(403);
  });
`;

content = content.replace(/}\);\s*$/g, newTests + "});\n");

fs.writeFileSync('src/features/jobs/ops/imports/tests/jobImportsRouter.test.ts', content);
