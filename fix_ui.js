import fs from 'fs';
let content = fs.readFileSync('src/features/jobs/ops/imports/JobBatchReviewPage.tsx', 'utf-8');
content = content.replace(
  "{items.map(item => {",
  "{items.length === 0 && <div className=\"p-4 text-slate-500 text-sm\">No jobs extracted from this batch.</div>}\n          {items.map(item => {"
);
fs.writeFileSync('src/features/jobs/ops/imports/JobBatchReviewPage.tsx', content);
