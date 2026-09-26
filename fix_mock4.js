import fs from 'fs';
let content = fs.readFileSync('src/features/jobs/ops/imports/tests/jobImportsRouter.test.ts', 'utf-8');

content = content.replace(/mockSelect\.mockReturnValue\(\{[\s\S]*?\}\);/g, 
  "mockSingle.mockResolvedValue({ data: { id: 'item-1', batch_id: 'batch-1', review_status: 'ready' }, error: null });"
);

fs.writeFileSync('src/features/jobs/ops/imports/tests/jobImportsRouter.test.ts', content);
