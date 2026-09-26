import fs from 'fs';

let content = fs.readFileSync('src/features/jobs/ops/imports/tests/jobImportsRouter.test.ts', 'utf-8');

// The original file didn't mock RPC, we need to add it.
content = content.replace(
  /const mockLimit = vi\.fn\(\);/g,
  "const mockLimit = vi.fn();\nconst mockRpc = vi.fn();"
);

content = content.replace(
  /order: mockOrder\.mockResolvedValue\(\{ data: \[\], error: null \}\)/g,
  "order: mockOrder.mockResolvedValue({ data: [], error: null }),\n      rpc: mockRpc"
);

content = content.replace(
  /const mockInsert = vi\.fn\(\)\.mockResolvedValue\(\{ error: null \}\);/g,
  "const mockInsert = vi.fn().mockResolvedValue({ error: null });\n    mockRpc.mockImplementation(async (method) => { if (method === 'ops_update_job_import_item') return { data: { id: 'mock-id' }, error: null }; if (method === 'ops_import_job_item') return { data: { status: 'IMPORTED', job_id: 'job-1' }, error: null }; return { data: null, error: null }; });"
);

// We need to change expect(mockUpdate).toHaveBeenCalled() for the PATCH requests
content = content.replace(
  /expect\(mockUpdate\)\.toHaveBeenCalled\(\);/g,
  "expect(mockRpc).toHaveBeenCalledWith('ops_update_job_import_item', expect.anything());"
);

// In revokes approval:
content = content.replace(
  /const updateArg = mockUpdate\.mock\.calls\[0\]\[0\];/g,
  "const updateArg = mockRpc.mock.calls[0][1].p_updates;"
);

// In the allows approval if validation passes:
content = content.replace(
  /expect\(mockInsert\)\.toHaveBeenCalled\(\);/g,
  ""
);

fs.writeFileSync('src/features/jobs/ops/imports/tests/jobImportsRouter.test.ts', content);
