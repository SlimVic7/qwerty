import fs from 'fs';

let content = fs.readFileSync('src/features/jobs/ops/imports/jobImports.service.ts', 'utf-8');

const importFn = `
  async updateItem(itemId: string, updates: Partial<JobImportItem>): Promise<JobImportItem> {
    return authFetch(\`/api/ops/imports/items/\${itemId}\`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  },

  async importItems(itemIds: string[]): Promise<any[]> {
    return authFetch(\`/api/ops/imports/import\`, {
      method: 'POST',
      body: JSON.stringify({ itemIds })
    });
  }
`;

content = content.replace(/async updateItem[\s\S]*?\}\);[\s]*\}/, importFn + '}');
fs.writeFileSync('src/features/jobs/ops/imports/jobImports.service.ts', content);
