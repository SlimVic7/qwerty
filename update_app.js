import fs from 'fs';
let content = fs.readFileSync('server/app.ts', 'utf-8');

// Insert import if not there
if (!content.includes("import { candidateRouter }")) {
  content = content.replace(
    "import { jobImportsRouter } from './routes/jobImports.js';",
    "import { jobImportsRouter } from './routes/jobImports.js';\nimport { candidateRouter } from './routes/candidate.js';"
  );
}

// Insert route if not there
if (!content.includes("app.use('/api/candidate', candidateRouter);")) {
  content = content.replace(
    "app.use('/api/ops/jobs', jobsRouter);",
    "app.use('/api/candidate', candidateRouter);\n  app.use('/api/ops/jobs', jobsRouter);"
  );
}

fs.writeFileSync('server/app.ts', content);
