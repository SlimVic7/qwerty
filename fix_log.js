import fs from 'fs';
let content = fs.readFileSync('server/routes/jobImports.ts', 'utf-8');
content = content.replace("if (fetchError || !item) {", "console.log('ITEM IN ROUTE:', item);\n    if (fetchError || !item) {");
fs.writeFileSync('server/routes/jobImports.ts', content);
