const fs = require('fs');

let code = fs.readFileSync('src/features/jobs/ops/jobsOps.test.tsx', 'utf8');

const additionalTests = `
  it('archived job renders no lifecycle actions', async () => {
    vi.mocked(jobsOpsService.getJob).mockResolvedValue({ id: '1', title: 'Archived Job', status: 'archived' });
    renderEditorWithRole('super_admin');
    await waitFor(() => expect(screen.getByText('Archived (No actions available)')).toBeDefined());
    expect(screen.queryByText('Publish Job')).toBeNull();
    expect(screen.queryByText('Archive Job')).toBeNull();
  });

  it('Save Changes payload does NOT contain status, featured, or id', async () => {
    vi.mocked(jobsOpsService.getJob).mockResolvedValue({ id: '1', title: 'Draft Job', status: 'draft', featured: true });
    vi.mocked(jobsOpsService.updateDraft).mockResolvedValue({ id: '1', title: 'Draft Job Modified', status: 'draft', featured: true });
    
    renderEditorWithRole('super_admin');
    await waitFor(() => expect(screen.getByText('Edit Job: Draft Job')).toBeDefined());
    
    // Change a field
    fireEvent.change(screen.getByRole('textbox', { name: /title/i }), { target: { value: 'Draft Job Modified' } });
    
    await fireEvent.click(screen.getByText('Save Changes'));
    
    await waitFor(() => {
      expect(jobsOpsService.updateDraft).toHaveBeenCalled();
    });
    
    const patchPayload = vi.mocked(jobsOpsService.updateDraft).mock.calls[0][1];
    expect(patchPayload).not.toHaveProperty('status');
    expect(patchPayload).not.toHaveProperty('featured');
    expect(patchPayload).not.toHaveProperty('id');
    expect(patchPayload.title).toBe('Draft Job Modified');
  });

  it('successful PATCH preserves returned job.status and lifecycle buttons remain visible after editing a draft', async () => {
    vi.mocked(jobsOpsService.getJob).mockResolvedValue({ id: '1', title: 'Draft Job', status: 'draft' });
    vi.mocked(jobsOpsService.updateDraft).mockResolvedValue({ id: '1', title: 'Draft Job Modified', status: 'draft' });
    
    renderEditorWithRole('super_admin');
    await waitFor(() => expect(screen.getByText('Publish Job')).toBeDefined());
    
    fireEvent.change(screen.getByRole('textbox', { name: /title/i }), { target: { value: 'Draft Job Modified' } });
    
    await fireEvent.click(screen.getByText('Save Changes'));
    
    await waitFor(() => {
      expect(screen.getByText('Saved successfully')).toBeDefined();
    });
    
    // Lifecycle buttons should still be there because status='draft' was preserved
    expect(screen.getByText('Publish Job')).toBeDefined();
    expect(screen.getByText('Archive Job')).toBeDefined();
  });

  it('successful create returns draft and renders draft lifecycle actions', async () => {
    vi.mocked(useAuth).mockReturnValue({ roles: ['super_admin'], session: {} as any, loading: false } as any);
    vi.mocked(jobsOpsService.createDraft).mockResolvedValue({ id: 'new-uuid-1234-5678-9012-345678901234', title: 'New Job', status: 'draft' });
    
    render(
      <MemoryRouter initialEntries={['/0ps26/jobs/new']}>
        <Routes>
          <Route path="/0ps26/jobs/new" element={<JobOpsEditor />} />
          <Route path="/0ps26/jobs/:id/edit" element={<JobOpsEditor />} />
        </Routes>
      </MemoryRouter>
    );
    
    await waitFor(() => expect(screen.getByText('New Job')).toBeDefined());
    
    fireEvent.change(screen.getByRole('textbox', { name: /title \*/i }), { target: { value: 'New Job' } });
    fireEvent.change(screen.getByRole('textbox', { name: /company name \*/i }), { target: { value: 'Company' } });
    fireEvent.change(screen.getByRole('textbox', { name: /description \*/i }), { target: { value: 'Desc' } });
    
    await fireEvent.click(screen.getByText('Save Changes'));
    
    await waitFor(() => {
      expect(screen.getByText('Created successfully')).toBeDefined();
    });
    
    // it navigates and rerenders the new route
    await waitFor(() => expect(screen.getByText('Publish Job')).toBeDefined());
  });

  it('lifecycle buttons remain correct after PATCH refresh', async () => {
    vi.mocked(jobsOpsService.getJob).mockResolvedValue({ id: '1', title: 'Pub Job', status: 'published' });
    vi.mocked(jobsOpsService.updateDraft).mockResolvedValue({ id: '1', title: 'Pub Job Mod', status: 'published' });
    
    renderEditorWithRole('super_admin');
    await waitFor(() => expect(screen.getByText('Unpublish to Draft')).toBeDefined());
    
    await fireEvent.click(screen.getByText('Save Changes'));
    
    await waitFor(() => {
      expect(screen.getByText('Saved successfully')).toBeDefined();
    });
    
    expect(screen.getByText('Unpublish to Draft')).toBeDefined();
  });
`;

code = code.replace(
  "  it('super_admin lifecycle: handles API failure and alerts user visibly', async () => {",
  additionalTests + "\n  it('super_admin lifecycle: handles API failure and alerts user visibly', async () => {"
);

fs.writeFileSync('src/features/jobs/ops/jobsOps.test.tsx', code);
