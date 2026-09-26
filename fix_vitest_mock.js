import fs from 'fs';
let content = fs.readFileSync('src/features/jobs/ops/imports/tests/jobImportsRouter.test.ts', 'utf-8');

// The reason we are getting 404 is that the new tests do not mock the supabase select for item-1.
// Let's add the mock to both test blocks.

const mockSelectInsert = `    mockSelect.mockReturnValue({
      single: vi.fn().mockResolvedValue({ 
        data: { id: 'item-1', batch_id: 'batch-1', review_status: 'ready' }, 
        error: null 
      })
    });
`;

content = content.replace("mockRpc.mockResolvedValueOnce({ data: { id: 'item-1' }, error: null });", "mockRpc.mockResolvedValueOnce({ data: { id: 'item-1' }, error: null });\n" + mockSelectInsert);
fs.writeFileSync('src/features/jobs/ops/imports/tests/jobImportsRouter.test.ts', content);
