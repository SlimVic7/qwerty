const fs = require('fs');
let code = fs.readFileSync('src/features/jobs/ops/jobsOps.test.tsx', 'utf8');

code = code.replace(
  "vi.spyOn(window, 'alert').mockImplementation(() => {});\n    vi.spyOn(window, 'confirm').mockImplementation(() => true);",
  ""
);

code = code.replace(
  "await fireEvent.click(screen.getByText('Publish Job'));\n    expect(jobsOpsService.publishJob).toHaveBeenCalledWith('1');\n    expect(jobsOpsService.getJob).toHaveBeenCalledTimes(2);",
  "await fireEvent.click(screen.getByText('Publish Job'));\n    await waitFor(() => expect(screen.getByText('publish Job?')).toBeDefined());\n    await fireEvent.click(screen.getByRole('button', { name: /publish job/i }));\n    expect(jobsOpsService.publishJob).toHaveBeenCalledWith('1');\n    await waitFor(() => expect(jobsOpsService.getJob).toHaveBeenCalledTimes(2));"
);

code = code.replace(
  "await fireEvent.click(screen.getByText('Close Job'));\n    await waitFor(() => expect(jobsOpsService.closeJob).toHaveBeenCalledWith('1'));",
  "await fireEvent.click(screen.getByText('Close Job'));\n    await waitFor(() => expect(screen.getByText('close Job?')).toBeDefined());\n    await fireEvent.click(screen.getByRole('button', { name: /close job/i }));\n    await waitFor(() => expect(jobsOpsService.closeJob).toHaveBeenCalledWith('1'));"
);

code = code.replace(
  "await fireEvent.click(screen.getByText('Mark as Featured'));\n    await waitFor(() => expect(jobsOpsService.featureJob).toHaveBeenCalledWith('1'));",
  "await fireEvent.click(screen.getByText('Mark as Featured'));\n    await waitFor(() => expect(screen.getByText('feature Job?')).toBeDefined());\n    await fireEvent.click(screen.getByRole('button', { name: /feature job/i }));\n    await waitFor(() => expect(jobsOpsService.featureJob).toHaveBeenCalledWith('1'));"
);

code = code.replace(
  "await fireEvent.click(screen.getByText('Unpublish to Draft'));\n    await waitFor(() => expect(jobsOpsService.unpublishJob).toHaveBeenCalledWith('1'));",
  "await fireEvent.click(screen.getByText('Unpublish to Draft'));\n    await waitFor(() => expect(screen.getByText('unpublish Job?')).toBeDefined());\n    await fireEvent.click(screen.getByRole('button', { name: /unpublish job/i }));\n    await waitFor(() => expect(jobsOpsService.unpublishJob).toHaveBeenCalledWith('1'));"
);

code = code.replace(
  "await fireEvent.click(screen.getByText('Archive Job'));\n    expect(jobsOpsService.archiveJob).toHaveBeenCalledWith('1');",
  "await fireEvent.click(screen.getByText('Archive Job'));\n    await waitFor(() => expect(screen.getByText('archive Job?')).toBeDefined());\n    await fireEvent.click(screen.getByRole('button', { name: /archive job/i }));\n    expect(jobsOpsService.archiveJob).toHaveBeenCalledWith('1');"
);

code = code.replace(
  "const alertSpy = vi.spyOn(window, 'alert');",
  ""
);

code = code.replace(
  "await fireEvent.click(screen.getByText('Publish Job'));\n    await waitFor(() => {\n      expect(alertSpy).toHaveBeenCalledWith('Unable to publish this job. Please try again.');\n    });",
  "await fireEvent.click(screen.getByText('Publish Job'));\n    await waitFor(() => expect(screen.getByText('publish Job?')).toBeDefined());\n    await fireEvent.click(screen.getByRole('button', { name: /publish job/i }));\n    await waitFor(() => {\n      expect(screen.getByText('Unable to publish this job. Please try again.')).toBeDefined();\n    });"
);

fs.writeFileSync('src/features/jobs/ops/jobsOps.test.tsx', code);
