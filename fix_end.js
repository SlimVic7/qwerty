import fs from 'fs';
let content = fs.readFileSync('src/features/candidate/tests/candidateRouter.test.ts', 'utf-8');
if (!content.trim().endsWith('});\n});')) {
  if (content.trim().endsWith('});')) {
    content = content + '\n});';
  } else {
    content = content + '\n});\n});';
  }
}
fs.writeFileSync('src/features/candidate/tests/candidateRouter.test.ts', content);
