import fs from 'fs';
let content = fs.readFileSync('src/features/jobs/ops/imports/tests/jobImportsRouter.test.ts', 'utf-8');

content = content.replace(
  "mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'UNSUPPORTED_UPDATE_FIELD' } });",
  "mockRpc.mockResolvedValueOnce({ data: null, error: new Error('UNSUPPORTED_UPDATE_FIELD') });"
);

fs.writeFileSync('src/features/jobs/ops/imports/tests/jobImportsRouter.test.ts', content);
