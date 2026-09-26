import fs from 'fs';

let content = fs.readFileSync('src/features/jobs/ops/imports/tests/jobImports.test.tsx', 'utf-8');

content = content.replace(
  `const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});`,
  `const mockNavigate = vi.fn();
let mockParams: any = {};
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockParams
  };
});`
);

content = content.replace(
  /it\('invalid batchId makes no request and shows error', async \(\) => \{/g,
  `it('invalid batchId makes no request and shows error', async () => {
    mockParams = { batchId: 'invalid-uuid' };`
);

content = content.replace(
  /it\('loads and displays batch details and items', async \(\) => \{/g,
  `it('loads and displays batch details and items', async () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    mockParams = { batchId: validUuid };`
);

content = content.replace(
  /it\('displays error on 401\/403\/404\/500 and allows retry', async \(\) => \{/g,
  `it('displays error on 401/403/404/500 and allows retry', async () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    mockParams = { batchId: validUuid };`
);

fs.writeFileSync('src/features/jobs/ops/imports/tests/jobImports.test.tsx', content);
