import fs from 'fs';
let content = fs.readFileSync('src/features/candidate/tests/candidateRouter.test.ts', 'utf-8');

// I need to ensure mockUpdate, mockInsert, etc are defined BEFORE the builder.
// The easiest way is just to manually rewrite the mocking section.
const newMocking = `
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockIs = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockSingle = vi.fn();
const mockUpdate = vi.fn();
const mockInsert = vi.fn();
const mockUpload = vi.fn();
const mockCreateSignedUrl = vi.fn();
const mockRemove = vi.fn();

const builder = {
  select: mockSelect,
  eq: mockEq,
  is: mockIs,
  order: mockOrder,
  limit: mockLimit,
  single: mockSingle,
  update: mockUpdate,
  insert: mockInsert
};

mockSelect.mockReturnValue(builder);
mockEq.mockReturnValue(builder);
mockIs.mockReturnValue(builder);
mockOrder.mockReturnValue(builder);
mockLimit.mockReturnValue(builder);
mockUpdate.mockReturnValue(builder);
mockInsert.mockReturnValue(builder);

vi.mock('../../../../server/db/supabase.js', () => ({
  getAdminClient: () => ({
    from: (table: string) => builder,
    storage: {
      from: (bucket: string) => ({
        upload: mockUpload,
        createSignedUrl: mockCreateSignedUrl,
        remove: mockRemove
      })
    }
  })
}));
`;

content = content.replace(/const mockSelect = vi\.fn\(\);[\s\S]*?\}\)\s*\}\)\s*\)\);\s*/, newMocking);
fs.writeFileSync('src/features/candidate/tests/candidateRouter.test.ts', content);
