import fs from 'fs';
let content = fs.readFileSync('src/features/jobs/ops/imports/tests/jobImportsRouter.test.ts', 'utf-8');

// I will remove the first mockSingle if it exists before line 45
content = content.replace("const mockSingle = vi.fn();\n\nvi.mock", "\nvi.mock");

fs.writeFileSync('src/features/jobs/ops/imports/tests/jobImportsRouter.test.ts', content);
