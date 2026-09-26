import fs from 'fs';
let content = fs.readFileSync('src/features/jobs/ops/imports/tests/jobImportsRouter.test.ts', 'utf-8');
content = content.replace(/limit: mockLimit\.mockResolvedValue\(\{ data: \[\], error: null \}\),\s*,/g, "limit: mockLimit.mockResolvedValue({ data: [], error: null }),");
fs.writeFileSync('src/features/jobs/ops/imports/tests/jobImportsRouter.test.ts', content);
