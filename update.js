import fs from 'fs';
let content = fs.readFileSync('src/features/jobs/ops/imports/jobImports.service.ts', 'utf-8');
content = content.replace(/\}\}\;$/, '};\n');
fs.writeFileSync('src/features/jobs/ops/imports/jobImports.service.ts', content);
