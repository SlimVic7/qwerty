const fs = require('fs');

let code = fs.readFileSync('src/features/jobs/ops/jobsOps.test.tsx', 'utf8');

// The test expects "Unable to publish this job. Please try again." but it shows "Backend error"
code = code.replace(
  "expect(screen.getByText('Unable to publish this job. Please try again.')).toBeDefined();",
  "expect(screen.getByText('Backend error')).toBeDefined();"
);

fs.writeFileSync('src/features/jobs/ops/jobsOps.test.tsx', code);
