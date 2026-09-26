import fs from 'fs';
let content = fs.readFileSync('src/features/jobs/ops/imports/tests/jobImportsRouter.test.ts', 'utf-8');

// The reason it fails with 404 is because the `mockSelectInsert` might have been inserted incorrectly or overrides previous mocks in a weird way, or doesn't persist across tests because of beforeEach mock clears.
// Let's add it directly inside the it blocks.

content = content.replace(
  "mockRpc.mockResolvedValueOnce({ data: { id: 'item-1' }, error: null });\n    mockSelect.mockReturnValue({",
  "mockSelect.mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'item-1', batch_id: 'batch-1', review_status: 'ready' }, error: null }) });\n    mockRpc.mockResolvedValueOnce({ data: { id: 'item-1' }, error: null });"
);

content = content.replace(
  "mockSelect.mockReturnValue({\n      single: vi.fn().mockResolvedValue({ \n        data: { id: 'item-1', batch_id: 'batch-1', review_status: 'ready' }, \n        error: null \n      })\n    });\n",
  ""
);

content = content.replace(
  "mockRpc.mockImplementationOnce(async (method) => {\n      if (method === 'ops_import_job_item') {",
  "mockSelect.mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'item-1', batch_id: 'batch-1', review_status: 'ready' }, error: null }) });\n    mockRpc.mockImplementationOnce(async (method) => {\n      if (method === 'ops_import_job_item') {"
);

fs.writeFileSync('src/features/jobs/ops/imports/tests/jobImportsRouter.test.ts', content);
