import fs from 'fs';

let content = fs.readFileSync('src/features/jobs/ops/imports/tests/jobImportsRouter.test.ts', 'utf-8');

// The file has multiple mockRpc and mockSingle declarations
content = content.replace(/const mockRpc = vi\.fn\(\);\nconst mockRpc = vi\.fn\(\);/g, "const mockRpc = vi.fn();");
content = content.replace(/const mockSingle = vi\.fn\(\);\nconst mockSingle = vi\.fn\(\);/g, "const mockSingle = vi.fn();");

// Wait, the error is:
// The symbol "mockRpc" has already been declared
// 43 | const mockRpc = vi.fn();
// 44 | const mockRpc = vi.fn();
// 45 | const mockSingle = vi.fn();

// The symbol "mockSingle" has already been declared... Wait, let's just delete lines 44, 45, etc if they are duplicates.

content = content.replace(/const mockRpc = vi\.fn\(\);\nconst mockRpc = vi\.fn\(\);\nconst mockSingle = vi\.fn\(\);/g, "const mockRpc = vi.fn();\nconst mockSingle = vi.fn();");

fs.writeFileSync('src/features/jobs/ops/imports/tests/jobImportsRouter.test.ts', content);
