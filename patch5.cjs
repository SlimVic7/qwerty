const fs = require('fs');
let code = fs.readFileSync('src/features/jobs/ops/JobOpsEditor.tsx', 'utf8');

code = code.replace(
  "return (\n    <div className=\"max-w-4xl mx-auto p-4 md:p-8\">",
  "return (\n    <>\n    <div className=\"max-w-4xl mx-auto p-4 md:p-8\">"
);

fs.writeFileSync('src/features/jobs/ops/JobOpsEditor.tsx', code);
