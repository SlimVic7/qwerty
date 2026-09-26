const fs = require('fs');
let code = fs.readFileSync('src/features/jobs/ops/JobOpsEditor.tsx', 'utf8');

code = code.replace(
  "return (\n    <div className=\"p-8 max-w-6xl mx-auto\">",
  "return (\n    <>\n      <div className=\"p-8 max-w-6xl mx-auto\">"
);

code = code.replace(
  "  );\n}",
  "    </>\n  );\n}"
);

fs.writeFileSync('src/features/jobs/ops/JobOpsEditor.tsx', code);
