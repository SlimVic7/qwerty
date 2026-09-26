import fs from 'fs';

let content = fs.readFileSync('src/features/jobs/ops/imports/tests/jobImportsRouter.test.ts', 'utf-8');

// Replace mockUpdate and mockInsert with mockRpc
content = content.replace(/const mockUpdate = vi\.fn\(\)\.mockReturnValue\(\{ eq: vi\.fn\(\)\.mockReturnValue\(\{ select: vi\.fn\(\)\.mockReturnValue\(\{ single: mockSingle \}\) \}\) \}\);/g, "");
content = content.replace(/const mockInsert = vi\.fn\(\)\.mockResolvedValue\(\{ error: null \}\);/g, "");
content = content.replace(/update: mockUpdate,/g, "");
content = content.replace(/insert: mockInsert,/g, "");

content = content.replace(
  /const mockRpc = vi\.fn\(\)\.mockResolvedValue\(\{ data: \{ status: 'IMPORTED', job_id: 'job-1' \}, error: null \}\);/g,
  `const mockRpc = vi.fn().mockImplementation(async (method, args) => {
    if (method === 'ops_import_job_item') return { data: { status: 'IMPORTED', job_id: 'job-1' }, error: null };
    if (method === 'ops_update_job_import_item') return { data: { id: 'mock-id' }, error: null };
    return { data: null, error: null };
  });`
);

content = content.replace(
  /expect\(mockUpdate\)\.toHaveBeenCalled\(\);/g,
  "expect(mockRpc).toHaveBeenCalledWith('ops_update_job_import_item', expect.anything());"
);

content = content.replace(
  /expect\(mockInsert\)\.toHaveBeenCalled\(\);/g,
  "" // Handled by rpc now
);

// We need to fix the mock single reference.
content = content.replace(/const mockSingle = vi\.fn\(\);/g, "");
content = content.replace(/single: mockSingle/g, "");
content = content.replace(/select: vi\.fn\(\)\.mockReturnValue\(\{ \}\)/g, "select: vi.fn()");


fs.writeFileSync('src/features/jobs/ops/imports/tests/jobImportsRouter.test.ts', content);
