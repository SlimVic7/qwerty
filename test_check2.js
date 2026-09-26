import fs from 'fs';
let content = fs.readFileSync('src/features/jobs/ops/imports/tests/jobImportsRouter.test.ts', 'utf-8');
console.log(content.slice(content.length - 800));
