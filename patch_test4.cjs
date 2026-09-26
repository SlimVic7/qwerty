const fs = require('fs');
let code = fs.readFileSync('src/features/jobs/ops/jobsOps.test.tsx', 'utf8');

code = code.replace(
  "id: 'new-uuid-1234-5678-9012-345678901234'",
  "id: '12345678-1234-1234-1234-123456789012'"
);

fs.writeFileSync('src/features/jobs/ops/jobsOps.test.tsx', code);
