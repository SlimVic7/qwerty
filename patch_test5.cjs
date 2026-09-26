const fs = require('fs');
let code = fs.readFileSync('src/features/jobs/ops/jobsOps.test.tsx', 'utf8');

code = code.replaceAll(
  "fireEvent.change(screen.getByRole('textbox', { name: /title/i }), { target: { value: 'Draft Job Modified' } });",
  "fireEvent.change(document.querySelector('input[name=\"title\"]')!, { target: { value: 'Draft Job Modified' } });"
);

fs.writeFileSync('src/features/jobs/ops/jobsOps.test.tsx', code);
