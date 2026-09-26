import fs from 'fs';
let content = fs.readFileSync('src/features/candidate/tests/candidateRouter.test.ts', 'utf-8');

content = content.replace(/const mockUpdate = vi\.fn\(\)\.mockReturnThis\(\);/, 'const mockUpdate = vi.fn();');
content = content.replace(/const mockInsert = vi\.fn\(\)\.mockReturnThis\(\);/, 'const mockInsert = vi.fn();');
content = content.replace(/const mockSelect = vi\.fn\(\)\.mockReturnThis\(\);/, 'const mockSelect = vi.fn();');
content = content.replace(/const mockEq = vi\.fn\(\)\.mockReturnThis\(\);/, 'const mockEq = vi.fn();');
content = content.replace(/const mockIs = vi\.fn\(\)\.mockReturnThis\(\);/, 'const mockIs = vi.fn();');
content = content.replace(/const mockOrder = vi\.fn\(\)\.mockReturnThis\(\);/, 'const mockOrder = vi.fn();');
content = content.replace(/const mockLimit = vi\.fn\(\)\.mockReturnThis\(\);/, 'const mockLimit = vi.fn();');

const builderDef = `
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
`;

content = content.replace('const mockSingle = vi.fn();\n', 'const mockSingle = vi.fn();\n' + builderDef);
fs.writeFileSync('src/features/candidate/tests/candidateRouter.test.ts', content);
