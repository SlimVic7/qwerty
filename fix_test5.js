import fs from 'fs';
let content = fs.readFileSync('src/features/jobs/ops/imports/tests/jobImportsRouter.test.ts', 'utf-8');

// Fix 1: normalized_data
content = content.replace(
  "mockSingle.mockResolvedValue({ data: { id: 'item-1', batch_id: 'batch-1', review_status: 'ready', normalized_data: { title: 'T', company_name: 'C', description: 'D' } }, error: null });",
  "mockSingle.mockResolvedValue({ data: { id: 'item-1', batch_id: 'batch-1', review_status: 'ready', normalized_data: { title: 'Engineer', company_name: 'Acme', description: 'desc', salary_min: null, salary_max: null } }, error: null });"
);

// Fix 2: mockRpc resolve error for validation
const oldValidationMock = `    mockRpc.mockImplementationOnce(async (method) => {
      if (method === 'ops_import_job_item') {
         throw new Error('VALIDATION_FAILED');
      }
      return { data: null, error: null };
    });`;

const newValidationMock = `    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'VALIDATION_FAILED' } });`;

content = content.replace(oldValidationMock, newValidationMock);

fs.writeFileSync('src/features/jobs/ops/imports/tests/jobImportsRouter.test.ts', content);
