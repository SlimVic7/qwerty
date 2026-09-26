import fs from 'fs';
let content = fs.readFileSync('server/routes/jobImports.ts', 'utf-8');
content = content.replace(/console\.log\('ERROR IS:', error, 'DATA IS:', data\);\n      if \(error\) \{/g, "if (error) {");
fs.writeFileSync('server/routes/jobImports.ts', content);
