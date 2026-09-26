import fs from 'fs';
let content = fs.readFileSync('src/features/candidate/tests/candidateRouter.test.ts', 'utf-8');

// The best way to mock supabase is to use a proxy or just make the builder return itself but act as a thenable.
const thenableBuilder = `
const builder = {
  select: mockSelect,
  eq: mockEq,
  is: mockIs,
  order: mockOrder,
  limit: mockLimit,
  single: mockSingle,
  update: mockUpdate,
  insert: mockInsert,
  then: function(resolve, reject) {
    resolve({ data: null, error: null });
  }
};
`;

content = content.replace(
`const builder = {
  select: mockSelect,
  eq: mockEq,
  is: mockIs,
  order: mockOrder,
  limit: mockLimit,
  single: mockSingle,
  update: mockUpdate,
  insert: mockInsert
};`, thenableBuilder);

fs.writeFileSync('src/features/candidate/tests/candidateRouter.test.ts', content);
