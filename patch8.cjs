const fs = require('fs');
let code = fs.readFileSync('server/routes/jobs.ts', 'utf8');

code = code.replace(
  "p_salary_min: jobData.salary_min !== undefined ? Number(jobData.salary_min) : null,",
  "p_salary_min: (jobData.salary_min !== undefined && jobData.salary_min !== null) ? Number(jobData.salary_min) : null,"
);

code = code.replace(
  "p_salary_max: jobData.salary_max !== undefined ? Number(jobData.salary_max) : null,",
  "p_salary_max: (jobData.salary_max !== undefined && jobData.salary_max !== null) ? Number(jobData.salary_max) : null,"
);

fs.writeFileSync('server/routes/jobs.ts', code);
