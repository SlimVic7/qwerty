import fs from 'fs';
let content = fs.readFileSync('src/features/jobs/ops/imports/tests/jobImportsRouter.test.ts', 'utf-8');

// The reason res.body[0] is undefined might be that `mockRpc` was called inside `syncBatchStatus` first?
// Wait, the router calls `syncBatchStatus` inside PATCH.
// Inside POST /import, it also calls `syncBatchStatus(firstItem.batch_id)`!
// Ah! `syncBatchStatus` is mocked! `vi.mock('../../../../../../server/services/extraction/syncBatch.js', () => ({ syncBatchStatus: vi.fn() }));`
// So it shouldn't call supabase.rpc.

// So why is `res.body[0]` undefined? 
// Let's print the entire res.body in the expect block just in case.
content = content.replace("expect(res.body[0].status).toBe('failed');", "expect(res.body).toEqual([{ itemId: 'item-1', status: 'failed', reason: 'VALIDATION_FAILED' }]);\n    expect(res.body[0].status).toBe('failed');");

fs.writeFileSync('src/features/jobs/ops/imports/tests/jobImportsRouter.test.ts', content);
