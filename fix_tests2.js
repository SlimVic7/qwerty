import fs from 'fs';
let content = fs.readFileSync('src/features/jobs/ops/imports/tests/jobImportsRouter.test.ts', 'utf-8');

content = content.replace(/normalized_data: { title: 'Eng', company_name: 'Acme', description: 'desc' }/g, 
"normalized_data: { title: 'Eng', company_name: 'Acme', description: 'desc', salary_min: null, salary_max: null }");

content = content.replace(/normalized_data: { title: 'Eng', company_name: 'Acme', description: 'desc' }/g, 
"normalized_data: { title: 'Eng', company_name: 'Acme', description: 'desc', salary_min: null, salary_max: null }");

content = content.replace(/send\({ normalized_data: { title: 'Eng', company_name: 'Acme', description: 'desc' } }\)/g, 
"send({ normalized_data: { title: 'Eng', company_name: 'Acme', description: 'desc', salary_min: null, salary_max: null } })");

fs.writeFileSync('src/features/jobs/ops/imports/tests/jobImportsRouter.test.ts', content);
