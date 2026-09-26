import fs from 'fs';
let content = fs.readFileSync('src/features/jobs/ops/imports/tests/jobImports.service.test.ts', 'utf-8');
content = content.replace("import { vi } from 'vitest';", "");
fs.writeFileSync('src/features/jobs/ops/imports/tests/jobImports.service.test.ts', content);
