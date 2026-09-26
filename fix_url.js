import fs from 'fs';
let content = fs.readFileSync('src/features/jobs/ops/imports/tests/jobImportsRouter.test.ts', 'utf-8');

content = content.replace(".patch('/items/item-1')", ".patch('/api/ops/imports/items/item-1')");
content = content.replace(".post('/import')", ".post('/api/ops/imports/import')");

// Also ensure we mock normalized_data on item-1
content = content.replace(
  "mockSingle.mockResolvedValue({ data: { id: 'item-1', batch_id: 'batch-1', review_status: 'ready' }, error: null });",
  "mockSingle.mockResolvedValue({ data: { id: 'item-1', batch_id: 'batch-1', review_status: 'ready', normalized_data: { title: 'T', company_name: 'C', description: 'D' } }, error: null });"
);

fs.writeFileSync('src/features/jobs/ops/imports/tests/jobImportsRouter.test.ts', content);
