import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { jobsOpsService } from './jobsOps.service.js';
import { useAuth } from '../../../lib/auth.js';

export function JobOpsEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { roles } = useAuth();
  
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = roles.includes('admin') || roles.includes('super_admin');

  useEffect(() => {
    if (id) {
      loadJob(id);
    }
  }, [id]);

  const loadJob = async (jobId: string) => {
    try {
      const data = await jobsOpsService.getJob(jobId);
      setJob(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setJob((prev: any) => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? null : Number(value)) : value
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await jobsOpsService.updateDraft(job.id, job);
      alert('Saved successfully');
      loadJob(job.id);
    } catch (err: any) {
      alert(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleLifecycle = async (action: 'publish' | 'unpublish' | 'close' | 'archive' | 'feature' | 'unfeature') => {
    if (!isAdmin) return;
    if (!confirm(`Are you sure you want to ${action} this job?`)) return;
    
    setSaving(true);
    try {
      await jobsOpsService[action](job.id);
      loadJob(job.id);
    } catch (err: any) {
      alert(err.message || `Failed to ${action}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;
  if (!job) return <div className="p-8">Job not found.</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Edit Job: {job.title}</h1>
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
        <form onSubmit={handleSave} className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input required type="text" name="title" value={job.title || ''} onChange={handleChange} className="w-full border rounded p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Company Name *</label>
                <input required type="text" name="company_name" value={job.company_name || ''} onChange={handleChange} className="w-full border rounded p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Company Logo URL</label>
                <input type="url" name="company_logo_url" value={job.company_logo_url || ''} onChange={handleChange} className="w-full border rounded p-2" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-4">Location & Work Arrangement</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Location Text</label>
                <input type="text" name="location_text" value={job.location_text || ''} onChange={handleChange} className="w-full border rounded p-2" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">City</label>
                  <input type="text" name="city" value={job.city || ''} onChange={handleChange} className="w-full border rounded p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Country</label>
                  <input type="text" name="country" value={job.country || ''} onChange={handleChange} className="w-full border rounded p-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Workplace Type</label>
                  <select name="workplace_type" value={job.workplace_type || 'unspecified'} onChange={handleChange} className="w-full border rounded p-2">
                    <option value="unspecified">Unspecified</option>
                    <option value="onsite">On-site</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="remote">Remote</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Employment Type</label>
                  <select name="employment_type" value={job.employment_type || 'unspecified'} onChange={handleChange} className="w-full border rounded p-2">
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
                <input type="text" name="experience_level" value={job.experience_level || ''} onChange={handleChange} className="w-full border rounded p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description *</label>
                <textarea required name="description" value={job.description || ''} onChange={handleChange} rows={6} className="w-full border rounded p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Responsibilities</label>
                <textarea name="responsibilities" value={job.responsibilities || ''} onChange={handleChange} rows={4} className="w-full border rounded p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Requirements</label>
                <textarea name="requirements" value={job.requirements || ''} onChange={handleChange} rows={4} className="w-full border rounded p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Preferred Qualifications</label>
                <textarea name="preferred_qualifications" value={job.preferred_qualifications || ''} onChange={handleChange} rows={3} className="w-full border rounded p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Benefits</label>
                <textarea name="benefits" value={job.benefits || ''} onChange={handleChange} rows={3} className="w-full border rounded p-2" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-4">Compensation & Application</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Salary Min</label>
                  <input type="number" name="salary_min" value={job.salary_min || ''} onChange={handleChange} className="w-full border rounded p-2" min="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Salary Max</label>
                  <input type="number" name="salary_max" value={job.salary_max || ''} onChange={handleChange} className="w-full border rounded p-2" min="0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Currency (e.g. USD)</label>
                  <input type="text" name="salary_currency" value={job.salary_currency || ''} onChange={handleChange} className="w-full border rounded p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Period (e.g. year, hour)</label>
                  <input type="text" name="salary_period" value={job.salary_period || ''} onChange={handleChange} className="w-full border rounded p-2" />
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <div>
                  <label className="block text-sm font-medium mb-1">Application URL</label>
                  <input type="url" name="application_url" value={job.application_url || ''} onChange={handleChange} className="w-full border rounded p-2" />
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-1">Application Email</label>
                  <input type="email" name="application_email" value={job.application_email || ''} onChange={handleChange} className="w-full border rounded p-2" />
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-1">Deadline</label>
                  <input type="datetime-local" name="application_deadline" value={job.application_deadline ? new Date(job.application_deadline).toISOString().slice(0,16) : ''} onChange={(e) => {
                    const date = e.target.value ? new Date(e.target.value).toISOString() : null;
                    setJob((prev: any) => ({ ...prev, application_deadline: date }));
                  }} className="w-full border rounded p-2" />
                </div>
              </div>
            </div>
          </div>
        </form>

        <div className="lg:col-span-1 space-y-6">
          {/* Admin Lifecycle Controls */}
          {isAdmin && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold mb-4">Publishing & Lifecycle</h2>
              <div className="flex flex-col gap-3">
                {job.status !== 'published' && (
                  <button onClick={() => handleLifecycle('publish')} disabled={saving} className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50 font-medium">Publish Job</button>
                )}
                {job.status === 'published' && (
                  <button onClick={() => handleLifecycle('unpublish')} disabled={saving} className="w-full bg-orange-500 text-white p-2 rounded hover:bg-orange-600 disabled:opacity-50 font-medium">Unpublish to Draft</button>
                )}
                {job.status !== 'closed' && (
                  <button onClick={() => handleLifecycle('close')} disabled={saving} className="w-full bg-slate-600 text-white p-2 rounded hover:bg-slate-700 disabled:opacity-50 font-medium">Close Job</button>
                )}
                {job.status !== 'archived' && (
                  <button onClick={() => handleLifecycle('archive')} disabled={saving} className="w-full bg-red-600 text-white p-2 rounded hover:bg-red-700 disabled:opacity-50 font-medium">Archive Job</button>
                )}
                
                <hr className="my-2" />
                
                {job.featured ? (
                  <button onClick={() => handleLifecycle('unfeature')} disabled={saving} className="w-full border border-yellow-500 text-yellow-600 p-2 rounded hover:bg-yellow-50 disabled:opacity-50 font-medium">Remove Feature</button>
                ) : (
                  <button onClick={() => handleLifecycle('feature')} disabled={saving} className="w-full bg-yellow-500 text-white p-2 rounded hover:bg-yellow-600 disabled:opacity-50 font-medium">Mark as Featured</button>
                )}
              </div>
            </div>
          )}
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-4">Preview</h2>
            <p className="text-sm text-slate-600 mb-4">View how this job will appear to public users. Draft previews are private.</p>
            {/* Note: In a real app, this might open a modal or dedicated preview route. For now, link to the public URL but maybe they can only see it if they are an admin via the public route, or we add an internal preview mode. We'll link to a specific preview route if needed, but per requirements we just need to provide a preview mechanism. Let's just make it a link to /jobs/:slug but the public route only shows published jobs! So we need an internal preview route or parameter. Or the public route itself can bypass the status='published' check if the user is an admin? Wait, the public service `getPublishedJobBySlug` explicitly restricts to 'published'. To fulfill "A draft preview must remain private", we should either render the JobDetailPage component inside a preview wrapper, or just pass a preview flag to it. */}
            <a href={`/0ps26/jobs/${job.id}/preview`} className="w-full inline-block text-center border border-slate-300 text-slate-700 p-2 rounded hover:bg-slate-50 font-medium">
              View Private Preview
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
