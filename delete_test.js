import fs from 'fs';
let serviceTest = fs.readFileSync('src/features/jobs/ops/imports/tests/jobImports.service.test.ts', 'utf-8');
serviceTest = serviceTest.replace(/it\('importItems sends POST to \/api\/ops\/imports\/import'[\s\S]*?\}\);\s*\}\);/g, "});");
fs.writeFileSync('src/features/jobs/ops/imports/tests/jobImports.service.test.ts', serviceTest);
