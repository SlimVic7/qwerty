const fs = require('fs');
let code = fs.readFileSync('server/routes/jobs.ts', 'utf8');

code = code.replace(
  "const validationError = validateJobData(jobData, true);\n  if (validationError) {\n    res.status(400).json({ error: validationError });\n    return;\n  }",
  "const validationError = validateJobData(jobData, true);\n  if (validationError) {\n    console.warn(\"Job create validation failed:\", validationError);\n    res.status(400).json({ error: validationError });\n    return;\n  }"
);

fs.writeFileSync('server/routes/jobs.ts', code);
