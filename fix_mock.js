import fs from 'fs';
let content = fs.readFileSync('src/features/candidate/tests/candidateRouter.test.ts', 'utf-8');

// Simplest mock that just returns itself endlessly
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
};

mockSelect.mockReturnValue(builder);
mockEq.mockReturnValue(builder);
mockIs.mockReturnValue(builder);
mockOrder.mockReturnValue(builder);
mockLimit.mockReturnValue(builder);
mockUpdate.mockReturnValue(builder);
mockInsert.mockReturnValue(builder);`,
`const builder = {
  select: mockSelect,
  eq: mockEq,
  is: mockIs,
  order: mockOrder,
  limit: mockLimit,
  single: mockSingle,
  update: mockUpdate,
  insert: mockInsert
};

mockSelect.mockImplementation(() => builder);
mockEq.mockImplementation(() => builder);
mockIs.mockImplementation(() => builder);
mockOrder.mockImplementation(() => builder);
mockLimit.mockImplementation(() => builder);
mockUpdate.mockImplementation(() => builder);
mockInsert.mockImplementation(() => builder);`
);
fs.writeFileSync('src/features/candidate/tests/candidateRouter.test.ts', content);
