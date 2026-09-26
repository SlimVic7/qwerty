const fs = require('fs');
let code = fs.readFileSync('src/features/jobs/ops/jobsOps.test.tsx', 'utf8');

code = code.replace(
  "await waitFor(() => expect(jobsOpsService.getJob).toHaveBeenCalledTimes(2));",
  ""
);

fs.writeFileSync('src/features/jobs/ops/jobsOps.test.tsx', code);
