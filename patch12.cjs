const fs = require('fs');
let code = fs.readFileSync('src/features/jobs/ops/jobsOps.test.tsx', 'utf8');

code = code.replace(
  "import { JobOpsEditor } from './JobOpsEditor';",
  "import { JobOpsEditor } from './JobOpsEditor';\nimport { JobOpsPreview } from './JobOpsPreview';"
);

code = code.replace(
  "describe('Internal Job Management UX', () => {",
  "describe('Internal Job Management UX', () => {\n  it('undefined ID causes no network call in preview', async () => {\n    vi.mocked(jobsOpsService.getJob).mockClear();\n    render(\n      <MemoryRouter initialEntries={['/0ps26/jobs/undefined/preview']}>\n        <Routes>\n          <Route path=\"/0ps26/jobs/:id/preview\" element={<JobOpsPreview />} />\n        </Routes>\n      </MemoryRouter>\n    );\n    await waitFor(() => {\n      expect(screen.getByText('Unable to determine this job record. Please return to the jobs list and try again.')).toBeDefined();\n    });\n    expect(jobsOpsService.getJob).not.toHaveBeenCalled();\n  });\n"
);

fs.writeFileSync('src/features/jobs/ops/jobsOps.test.tsx', code);
