import fs from 'fs';
let content = fs.readFileSync('src/features/jobs/ops/imports/tests/jobImportsRouter.test.ts', 'utf-8');

// I accidentally broke the syntax when running the regex replaces, likely removing `async () => {` somewhere or breaking a block.
// Let's print out around line 223 to see what happened.

const lines = content.split('\n');
const start = Math.max(0, 223 - 10);
const end = Math.min(lines.length, 223 + 10);

console.log(lines.slice(start, end).join('\n'));
