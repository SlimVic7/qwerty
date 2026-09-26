const fs = require('fs');
let code = fs.readFileSync('src/features/jobs/ops/JobOpsEditor.tsx', 'utf8');

code = code.replace(
  "const newJob = await jobsOpsService.createDraft(job);\n        showNotification('Created successfully', 'success');\n        navigate(`/0ps26/jobs/${newJob.id}/edit`);",
  "const newJob = await jobsOpsService.createDraft(job);\n        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;\n        if (!newJob || !newJob.id || !uuidRegex.test(newJob.id)) {\n          throw new Error('Server returned invalid job UUID upon creation');\n        }\n        showNotification('Created successfully', 'success');\n        navigate(`/0ps26/jobs/${newJob.id}/edit`);"
);

fs.writeFileSync('src/features/jobs/ops/JobOpsEditor.tsx', code);
