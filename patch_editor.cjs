const fs = require('fs');

const code = `import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { jobsOpsService } from './jobsOps.service.js';
import { useAuth } from '../../../lib/auth.js';

export function JobOpsEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { roles } = useAuth();
  
  const [job, setJob] = useState<any>(null);
  
  const getEditableFields = (data: any) => ({
    title: data?.title || '',
    company_name: data?.company_name || '',
    company_logo_url: data?.company_logo_url || '',
    location_text: data?.location_text || '',
    country: data?.country || '',
    city: data?.city || '',
    workplace_type: data?.workplace_type || 'unspecified',
    employment_type: data?.employment_type || 'unspecified',
    experience_level: data?.experience_level || '',
    description: data?.description || '',
    responsibilities: data?.responsibilities || '',
    requirements: data?.requirements || '',
    preferred_qualifications: data?.preferred_qualifications || '',
    benefits: data?.benefits || '',
    salary_min: data?.salary_min !== null && data?.salary_min !== undefined ? data.salary_min : '',
    salary_max: data?.salary_max !== null && data?.salary_max !== undefined ? data.salary_max : '',
    salary_currency: data?.salary_currency || 'USD',
    salary_period: data?.salary_period || 'yearly',
    application_url: data?.application_url || '',
    application_email: data?.application_email || '',
    source_name: data?.source_name || '',
    source_url: data?.source_url || '',
    application_deadline: data?.application_deadline ? new Date(data.application_deadline).toISOString().slice(0,16) : ''
  });

  const [form, setForm] = useState<any>(getEditableFields({}));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [confirmAction, setConfirmAction] = useState<'publish' | 'unpublish' | 'close' | 'archive' | 'feature' | 'unfeature' | null>(null);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const isAdmin = roles.includes('admin') || roles.includes('super_admin');

  useEffect(() => {
    if (id === 'undefined') {
      setError('Unable to determine this job record. Please return to the jobs list and try again.');
      setLoading(false);
    } else if (id) {
      loadJob(id);
    } else {
      setJob({ status: 'draft', featured: false });
      setForm(getEditableFields({}));
      setLoading(false);
    }
  }, [id]);

  const loadJob = async (jobId: string) => {
    try {
      const data = await jobsOpsService.getJob(jobId);
      setJob(data);
      setForm(getEditableFields(data));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm((prev: any) => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? null : Number(value)) : value
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let patchPayload = { ...form };
      if (patchPayload.application_deadline) {
        patchPayload.application_deadline = new Date(patchPayload.application_deadline).toISOString();
      } else {
        patchPayload.application_deadline = null;
      }
      
      if (id) {
        const updatedJob = await jobsOpsService.updateDraft(id, patchPayload);
        setJob(updatedJob);
        setForm(getEditableFields(updatedJob));
        showNotification('Saved successfully', 'success');
      } else {
        const newJob = await jobsOpsService.createDraft(patchPayload);
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!newJob || !newJob.id || !uuidRegex.test(newJob.id)) {
          throw new Error('Server returned invalid job UUID upon creation');
        }
        setJob(newJob);
        setForm(getEditableFields(newJob));
        showNotification('Created successfully', 'success');
        navigate(\`/0ps26/jobs/\${newJob.id}/edit\`, { replace: true });
      }
    } catch (err: any) {
      showNotification(err.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const requestLifecycleAction = (action: 'publish' | 'unpublish' | 'close' | 'archive' | 'feature' | 'unfeature') => {
    if (!isAdmin) return;
    if (!job || !job.id || job.id === 'undefined') {
      showNotification('Unable to determine this job record. Please return to the jobs list and try again.', 'error');
      return;
    }
    setConfirmAction(action);
  };

  const executeLifecycle = async () => {
    if (!confirmAction || !job || !job.id) return;
    const action = confirmAction;
    setConfirmAction(null);
    setSaving(true);
    try {
      let updatedJob;
      if (action === 'publish') updatedJob = await jobsOpsService.publishJob(job.id);
      else if (action === 'unpublish') updatedJob = await jobsOpsService.unpublishJob(job.id);
      else if (action === 'close') updatedJob = await jobsOpsService.closeJob(job.id);
      else if (action === 'archive') updatedJob = await jobsOpsService.archiveJob(job.id);
      else if (action === 'feature') updatedJob = await jobsOpsService.featureJob(job.id);
      else if (action === 'unfeature') updatedJob = await jobsOpsService.unfeatureJob(job.id);
      
      if (updatedJob) {
        setJob(updatedJob);
        setForm(getEditableFields(updatedJob));
      }
      showNotification(\`Job \${action}ed successfully\`, 'success');
    } catch (err: any) {
      showNotification(err.message || 'Failed to execute action', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;
  if (!job) return <div className="p-8">Job not found.</div>;

  return (
    <>
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{id ? \`Edit Job: \${job.title}\` : 'New Job'}</h1>
          <div className="text-sm text-slate-500 mt-1">Status: <span className="font-semibold uppercase">{job.status}</span></div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => navigate('/0ps26/jobs')}
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 font-medium"
          >
            Back
          </button>
          
          <button 
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-[#0B3D2E] text-white rounded hover:bg-[#155a44] font-medium disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input type="text" name="title" value={form.title} onChange={handleChange} required className="w-full border rounded p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Company Name *</label>
                <input type="text" name="company_name" value={form.company_name} onChange={handleChange} required className="w-full border rounded p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Company Logo URL</label>
                <input type="url" name="company_logo_url" value={form.company_logo_url} onChange={handleChange} className="w-full border rounded p-2" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-4">Location & Work Arrangement</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Location Text</label>
                <input type="text" name="location_text" value={form.location_text} onChange={handleChange} className="w-full border rounded p-2" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">City</label>
                  <input type="text" name="city" value={form.city} onChange={handleChange} className="w-full border rounded p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Country</label>
                  <input type="text" name="country" value={form.country} onChange={handleChange} className="w-full border rounded p-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Workplace Type</label>
                  <select name="workplace_type" value={form.workplace_type} onChange={handleChange} className="w-full border rounded p-2">
                    <option value="unspecified">Unspecified</option>
                    <option value="onsite">On-site</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="remote">Remote</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Employment Type</label>
                  <select name="employment_type" value={form.employment_type} onChange={handleChange} className="w-full border rounded p-2">
                    <option value="unspecified">Unspecified</option>
                    <option value="full_time">Full-time</option>
                    <option value="part_time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                    <option value="temporary">Temporary</option>
                    <option value="volunteer">Volunteer</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-4">Job Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Experience Level</label>
                <input type="text" name="experience_level" value={form.experience_level} onChange={handleChange} className="w-full border rounded p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description *</label>
                <textarea required name="description" value={form.description} onChange={handleChange} rows={6} className="w-full border rounded p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Responsibilities</label>
                <textarea name="responsibilities" value={form.responsibilities} onChange={handleChange} rows={4} className="w-full border rounded p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Requirements</label>
                <textarea name="requirements" value={form.requirements} onChange={handleChange} rows={4} className="w-full border rounded p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Preferred Qualifications</label>
                <textarea name="preferred_qualifications" value={form.preferred_qualifications} onChange={handleChange} rows={3} className="w-full border rounded p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Benefits</label>
                <textarea name="benefits" value={form.benefits} onChange={handleChange} rows={3} className="w-full border rounded p-2" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-4">Compensation & Application</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Salary Min</label>
                  <input type="number" name="salary_min" value={form.salary_min} onChange={handleChange} className="w-full border rounded p-2" min="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Salary Max</label>
                  <input type="number" name="salary_max" value={form.salary_max} onChange={handleChange} className="w-full border rounded p-2" min="0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Currency (e.g. USD)</label>
                  <input type="text" name="salary_currency" value={form.salary_currency} onChange={handleChange} className="w-full border rounded p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Period (e.g. year, hour)</label>
                  <input type="text" name="salary_period" value={form.salary_period} onChange={handleChange} className="w-full border rounded p-2" />
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <div>
                  <label className="block text-sm font-medium mb-1">Application URL</label>
                  <input type="url" name="application_url" value={form.application_url} onChange={handleChange} className="w-full border rounded p-2" />
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-1">Application Email</label>
                  <input type="email" name="application_email" value={form.application_email} onChange={handleChange} className="w-full border rounded p-2" />
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-1">Deadline</label>
                  <input type="datetime-local" name="application_deadline" value={form.application_deadline} onChange={handleChange} className="w-full border rounded p-2" />
                </div>
              </div>
            </div>
          </div>
        </form>

        <div className="lg:col-span-1 space-y-6">
          {/* Admin Lifecycle Controls */}
          {isAdmin && job.id && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold mb-4">Publishing & Lifecycle</h2>
              <div className="flex flex-col gap-3">
                {job.status === 'draft' && (
                  <>
                    <button type="button" onClick={() => requestLifecycleAction('publish')} disabled={saving} className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50 font-medium">Publish Job</button>
                    <button type="button" onClick={() => requestLifecycleAction('archive')} disabled={saving} className="w-full bg-red-600 text-white p-2 rounded hover:bg-red-700 disabled:opacity-50 font-medium">Archive Job</button>
                  </>
                )}
                {job.status === 'published' && (
                  <>
                    <button type="button" onClick={() => requestLifecycleAction('unpublish')} disabled={saving} className="w-full bg-orange-500 text-white p-2 rounded hover:bg-orange-600 disabled:opacity-50 font-medium">Unpublish to Draft</button>
                    <button type="button" onClick={() => requestLifecycleAction('close')} disabled={saving} className="w-full bg-slate-600 text-white p-2 rounded hover:bg-slate-700 disabled:opacity-50 font-medium">Close Job</button>
                    <hr className="my-2" />
                    {job.featured ? (
                      <button type="button" onClick={() => requestLifecycleAction('unfeature')} disabled={saving} className="w-full border border-yellow-500 text-yellow-600 p-2 rounded hover:bg-yellow-50 disabled:opacity-50 font-medium">Remove Feature</button>
                    ) : (
                      <button type="button" onClick={() => requestLifecycleAction('feature')} disabled={saving} className="w-full bg-yellow-500 text-white p-2 rounded hover:bg-yellow-600 disabled:opacity-50 font-medium">Mark as Featured</button>
                    )}
                  </>
                )}
                {job.status === 'closed' && (
                  <button type="button" onClick={() => requestLifecycleAction('archive')} disabled={saving} className="w-full bg-red-600 text-white p-2 rounded hover:bg-red-700 disabled:opacity-50 font-medium">Archive Job</button>
                )}
                {job.status === 'archived' && (
                  <button type="button" disabled className="w-full bg-slate-200 text-slate-400 p-2 rounded font-medium cursor-not-allowed">Archived (No actions available)</button>
                )}
              </div>
            </div>
          )}
            
          {job.id && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-4">Preview</h2>
            <p className="text-sm text-slate-600 mb-4">View how this job will appear to public users. Draft previews are private.</p>
            <a href={\`/0ps26/jobs/\${job.id}/preview\`} className="w-full inline-block text-center border border-slate-300 text-slate-700 p-2 rounded hover:bg-slate-50 font-medium">
              View Private Preview
            </a>
          </div>
          )}
        </div>
      </div>
    </div>
      {notification && (
        <div className={\`fixed bottom-4 right-4 p-4 rounded shadow-lg text-white font-medium z-50 \${notification.type === 'error' ? 'bg-red-600' : 'bg-green-600'}\`}>
          {notification.message}
        </div>
      )}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-xl font-bold mb-4 capitalize">{confirmAction} Job?</h3>
            <p className="text-slate-600 mb-6">
              {confirmAction === 'archive' && 'This job will no longer be available for editing or publishing.'}
              {confirmAction === 'publish' && 'This job will be visible to public users.'}
              {confirmAction === 'unpublish' && 'This job will be moved back to draft and hidden from the public.'}
              {confirmAction === 'close' && 'This job will be closed and no longer accept applications.'}
              {(confirmAction === 'feature' || confirmAction === 'unfeature') && \`Are you sure you want to \${confirmAction} this job?\`}
            </p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setConfirmAction(null)} className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded">
                Cancel
              </button>
              <button type="button" onClick={executeLifecycle} className="px-4 py-2 font-medium bg-blue-600 hover:bg-blue-700 text-white rounded capitalize">
                {confirmAction} Job
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
`;

fs.writeFileSync('src/features/jobs/ops/JobOpsEditor.tsx', code);
