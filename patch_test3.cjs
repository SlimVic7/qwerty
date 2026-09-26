const fs = require('fs');

let code = fs.readFileSync('src/features/jobs/ops/jobsOps.test.tsx', 'utf8');

code = code.replace(
  "fireEvent.change(screen.getByRole('textbox', { name: /title \*/i }), { target: { value: 'New Job' } });",
  "fireEvent.change(document.querySelector('input[name=\"title\"]')!, { target: { value: 'New Job' } });"
);
code = code.replace(
  "fireEvent.change(screen.getByRole('textbox', { name: /company name \*/i }), { target: { value: 'Company' } });",
  "fireEvent.change(document.querySelector('input[name=\"company_name\"]')!, { target: { value: 'Company' } });"
);
code = code.replace(
  "fireEvent.change(screen.getByRole('textbox', { name: /description \*/i }), { target: { value: 'Desc' } });",
  "fireEvent.change(document.querySelector('textarea[name=\"description\"]')!, { target: { value: 'Desc' } });"
);
code = code.replace(
  "fireEvent.change(screen.getByRole('textbox', { name: /title/i }), { target: { value: 'Draft Job Modified' } });",
  "fireEvent.change(document.querySelector('input[name=\"title\"]')!, { target: { value: 'Draft Job Modified' } });"
);

code = code.replace(
  "// it navigates and rerenders the new route",
  "vi.mocked(jobsOpsService.getJob).mockResolvedValue({ id: 'new-uuid-1234-5678-9012-345678901234', title: 'New Job', status: 'draft' });\n    // it navigates and rerenders the new route"
);

fs.writeFileSync('src/features/jobs/ops/jobsOps.test.tsx', code);
