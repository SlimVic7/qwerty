import fs from 'fs';

let content = fs.readFileSync('src/features/jobs/ops/imports/tests/jobImportsRouter.test.ts', 'utf-8');

// Insert mockSingle definition
content = content.replace(
  /const mockRpc = vi\.fn\(\);/g, 
  "const mockRpc = vi.fn();\nconst mockSingle = vi.fn();"
);

// We need to fix the from(...) structure. It has `rpc: vi.fn()` which shouldn't be inside from
content = content.replace(/rpc: vi\.fn\(\)/g, "single: mockSingle");

fs.writeFileSync('src/features/jobs/ops/imports/tests/jobImportsRouter.test.ts', content);
