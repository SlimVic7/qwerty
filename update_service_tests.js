import fs from 'fs';

let content = fs.readFileSync('src/features/jobs/ops/imports/tests/jobImports.service.test.ts', 'utf-8');

const testCode = `
  it('importItems sends POST to /api/ops/imports/import', async () => {
    (authFetch as any).mockResolvedValue([{ itemId: '1', status: 'IMPORTED' }]);
    const result = await jobImportsService.importItems(['1']);
    expect(authFetch).toHaveBeenCalledWith('/api/ops/imports/import', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ itemIds: ['1'] })
    }));
    expect(result).toEqual([{ itemId: '1', status: 'IMPORTED' }]);
  });
`;

content = content.replace(/}\);\s*$/g, testCode + "});\n");

fs.writeFileSync('src/features/jobs/ops/imports/tests/jobImports.service.test.ts', content);
