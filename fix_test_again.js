import fs from 'fs';

// 1. Fix server mock in jobImportsRouter.test.ts
let routerTest = fs.readFileSync('src/features/jobs/ops/imports/tests/jobImportsRouter.test.ts', 'utf-8');
routerTest = routerTest.replace(
  "single: mockSingle.mockResolvedValue({ data: { id: 'mock-id' }, error: null })",
  "single: mockSingle"
);
routerTest = routerTest.replace(
    "console.log('ITEM IN ROUTE:', item);", ""
);
fs.writeFileSync('src/features/jobs/ops/imports/tests/jobImportsRouter.test.ts', routerTest);

// 2. Fix frontend mock in jobImports.service.test.ts
let serviceTest = fs.readFileSync('src/features/jobs/ops/imports/tests/jobImports.service.test.ts', 'utf-8');
serviceTest = serviceTest.replace(
  /vi\.mocked\(authFetch\)\.mockResolvedValue/g,
  "(authFetch as any).mockImplementation(async () =>"
);
serviceTest = serviceTest.replace(
  /\[\{ itemId: '1', status: 'IMPORTED' \}\]\);/g,
  "[{ itemId: '1', status: 'IMPORTED' }]);"
);
fs.writeFileSync('src/features/jobs/ops/imports/tests/jobImports.service.test.ts', serviceTest);

