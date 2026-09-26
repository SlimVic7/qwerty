import fs from 'fs';
let content = fs.readFileSync('src/features/jobs/ops/imports/tests/jobImportsRouter.test.ts', 'utf-8');

// The original file had a generic mockSingle. Let's add it back.
content = content.replace(
  /const mockSelect = vi\.fn\(\);/g, 
  "const mockSingle = vi.fn();\nconst mockSelect = vi.fn();"
);

content = content.replace(
  /select: vi\.fn\(\)/g,
  "select: vi.fn().mockReturnValue({ single: mockSingle })"
);

fs.writeFileSync('src/features/jobs/ops/imports/tests/jobImportsRouter.test.ts', content);
