import fs from 'fs';

let content = fs.readFileSync('src/features/jobs/ops/imports/tests/jobImportsRouter.test.ts', 'utf-8');

content = content.replace("const mockRpc = vi.fn();\nconst mockRpc = vi.fn();", "const mockRpc = vi.fn();");
content = content.replace("const mockSingle = vi.fn();\nconst mockSingle = vi.fn();", "const mockSingle = vi.fn();");

fs.writeFileSync('src/features/jobs/ops/imports/tests/jobImportsRouter.test.ts', content);
