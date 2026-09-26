import fs from 'fs';

// 1. Fix server/routes/jobImports.ts
let routesContent = fs.readFileSync('server/routes/jobImports.ts', 'utf-8');
routesContent = routesContent.replace(/validateExtraction\(\{\s*fields: (.+?),\s*confidence: (.+?),\s*warnings: \[\]\s*\}\)/g, 
  "validateExtraction({ fields: $1, confidence: $2, warnings: [], source_segment: '', field_evidence: {} })");
fs.writeFileSync('server/routes/jobImports.ts', routesContent);

// 2. Fix JobBatchReviewPage.tsx error TS2345: Argument of type 'unknown[]' is not assignable to parameter of type 'string[]'.
let uiContent = fs.readFileSync('src/features/jobs/ops/imports/JobBatchReviewPage.tsx', 'utf-8');
uiContent = uiContent.replace(/const results = await jobImportsService\.importItems\(idsToImport\);/g, 
    "const results = await jobImportsService.importItems(idsToImport as string[]);");
fs.writeFileSync('src/features/jobs/ops/imports/JobBatchReviewPage.tsx', uiContent);

// 3. Fix jobImports.service.test.ts
let testContent = fs.readFileSync('src/features/jobs/ops/imports/tests/jobImports.service.test.ts', 'utf-8');
testContent = testContent.replace(/import \{ jobImportsService \} from '\.\.\/jobImports\.service\.js';/g, 
  "import { jobImportsService } from '../jobImports.service.js';\nimport { authFetch } from '../../../../../lib/authFetch.js';");
fs.writeFileSync('src/features/jobs/ops/imports/tests/jobImports.service.test.ts', testContent);

