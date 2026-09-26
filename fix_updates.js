import fs from 'fs';
let content = fs.readFileSync('server/routes/jobImports.ts', 'utf-8');
content = content.replace(/updates\.updated_at = new Date\(\)\.toISOString\(\);\s+/, "");
fs.writeFileSync('server/routes/jobImports.ts', content);
