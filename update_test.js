import fs from 'fs';
const content = fs.readFileSync('src/features/jobs/ops/imports/tests/jobImports.test.tsx', 'utf-8');
const newContent = content.replace(
  /await waitFor\(\(\) => \{[\s\S]*?\}\);/m,
  `await waitFor(() => {
      expect(jobImportsService.getBatchDetails).toHaveBeenCalledWith('test-batch-123');
      expect(screen.getByText('Total: 1')).toBeTruthy();
      expect(screen.getByText('Needs Review: 1')).toBeTruthy();
      expect(screen.getAllByText('Software Engineer').length).toBeGreaterThan(0);
    });`
);
fs.writeFileSync('src/features/jobs/ops/imports/tests/jobImports.test.tsx', newContent);
