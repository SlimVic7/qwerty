import fs from 'fs';
let content = fs.readFileSync('src/features/jobs/ops/imports/tests/jobImportsRouter.test.ts', 'utf-8');

const newTests = `
  it('Approve sends only review_status in p_updates and sends p_audit_action separately', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'item-1', batch_id: 'batch-1', review_status: 'ready', normalized_data: { title: 'Eng', company_name: 'Acme', description: 'desc' } }, error: null });
    const res = await request(app).patch('/api/ops/imports/items/item-1').set('Authorization', 'Bearer valid-token').send({ review_status: 'approved' });
    
    const callArgs = mockRpc.mock.calls[0][1];
    expect(callArgs.p_updates).toEqual({ review_status: 'approved' });
    expect(callArgs.p_audit_action).toBe('approved');
    expect(callArgs.p_actor_id).toBe('admin-id');
  });

  it('Reject sends only review_status in p_updates and sends p_audit_action separately', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'item-1', batch_id: 'batch-1', review_status: 'ready', normalized_data: { title: 'Eng', company_name: 'Acme', description: 'desc' } }, error: null });
    const res = await request(app).patch('/api/ops/imports/items/item-1').set('Authorization', 'Bearer valid-token').send({ review_status: 'rejected' });
    
    const callArgs = mockRpc.mock.calls[0][1];
    expect(callArgs.p_updates).toEqual({ review_status: 'rejected' });
    expect(callArgs.p_audit_action).toBe('rejected');
    expect(callArgs.p_actor_id).toBe('admin-id');
  });

  it('Mark Duplicate sends only allowed keys', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'item-1', batch_id: 'batch-1', review_status: 'ready', normalized_data: { title: 'Eng', company_name: 'Acme', description: 'desc' } }, error: null });
    const res = await request(app).patch('/api/ops/imports/items/item-1').set('Authorization', 'Bearer valid-token').send({ review_status: 'duplicate', duplicate_of_job_id: 'job-123' });
    
    const callArgs = mockRpc.mock.calls[0][1];
    expect(callArgs.p_updates).toEqual({ review_status: 'duplicate', duplicate_of_job_id: 'job-123' });
    expect(callArgs.p_audit_action).toBe('marked_duplicate');
  });

  it('Not Duplicate sends only allowed keys', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'item-1', batch_id: 'batch-1', review_status: 'duplicate', duplicate_of_job_id: 'job-123', normalized_data: { title: 'Eng', company_name: 'Acme', description: 'desc' } }, error: null });
    const res = await request(app).patch('/api/ops/imports/items/item-1').set('Authorization', 'Bearer valid-token').send({ review_status: 'needs_review' });
    
    const callArgs = mockRpc.mock.calls[0][1];
    expect(callArgs.p_updates).toEqual({ review_status: 'ready', duplicate_of_job_id: null });
    expect(callArgs.p_audit_action).toBe('unmarked_duplicate');
  });

  it('Save Corrections sends only allowed keys', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'item-1', batch_id: 'batch-1', review_status: 'needs_review', normalized_data: { title: 'Eng' } }, error: null });
    const res = await request(app).patch('/api/ops/imports/items/item-1').set('Authorization', 'Bearer valid-token').send({ normalized_data: { title: 'Eng', company_name: 'Acme', description: 'desc' } });
    
    const callArgs = mockRpc.mock.calls[0][1];
    expect(callArgs.p_updates.normalized_data).toBeDefined();
    expect(callArgs.p_updates.validation_issues).toBeDefined();
    expect(callArgs.p_updates.review_status).toBe('ready');
    expect(callArgs.p_updates).not.toHaveProperty('updated_at');
    expect(callArgs.p_audit_action).toBe('edited');
  });

  it('arbitrary browser fields are discarded/rejected', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'item-1', batch_id: 'batch-1', review_status: 'ready', normalized_data: { title: 'Eng', company_name: 'Acme', description: 'desc' } }, error: null });
    const res = await request(app).patch('/api/ops/imports/items/item-1').set('Authorization', 'Bearer valid-token').send({ review_status: 'approved', some_random_field: 'hacked' });
    
    const callArgs = mockRpc.mock.calls[0][1];
    expect(callArgs.p_updates).not.toHaveProperty('some_random_field');
  });
  
  it('covers existing UNSUPPORTED_UPDATE_FIELD regression', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'UNSUPPORTED_UPDATE_FIELD' } });
    mockSingle.mockResolvedValue({ data: { id: 'item-1', batch_id: 'batch-1', review_status: 'ready', normalized_data: { title: 'Eng', company_name: 'Acme', description: 'desc' } }, error: null });
    
    const res = await request(app).patch('/api/ops/imports/items/item-1').set('Authorization', 'Bearer valid-token').send({ review_status: 'approved' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('UNSUPPORTED_UPDATE_FIELD');
  });
});
`;

content = content.replace("});", newTests);
fs.writeFileSync('src/features/jobs/ops/imports/tests/jobImportsRouter.test.ts', content);
