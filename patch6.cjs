const fs = require('fs');
let code = fs.readFileSync('src/features/jobs/ops/tests/jobsRouter.test.ts', 'utf8');

code = code.replace(
  "describe('Jobs Express Router (RPC Hardening)', () => {",
  "describe('Jobs Express Router (RPC Hardening)', () => {\n  it('POST missing description returns 400', async () => {\n    const res = await runRoute('POST', '/', { title: 'T', company_name: 'C' }, { 'x-mock-role': 'admin' });\n    expect(res.status).toHaveBeenCalledWith(400);\n    expect(res.json).toHaveBeenCalledWith({ error: 'Title, company name, and description are required' });\n  });\n"
);

fs.writeFileSync('src/features/jobs/ops/tests/jobsRouter.test.ts', code);
