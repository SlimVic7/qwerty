import fs from 'fs';
let content = fs.readFileSync('src/features/jobs/ops/imports/tests/jobImportsRouter.test.ts', 'utf-8');

content = content.replace("vi.clearAllMocks();", "vi.resetAllMocks();\nmockRpc.mockResolvedValue({ data: { status: 'IMPORTED', job_id: 'new-job-123' }, error: null });");

fs.writeFileSync('src/features/jobs/ops/imports/tests/jobImportsRouter.test.ts', content);
