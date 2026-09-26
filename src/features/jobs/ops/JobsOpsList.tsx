import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { jobsOpsService } from './jobsOps.service.js';
import { useAuth } from '../../../lib/auth.js';
import { ExternalLink, Edit2, ShieldAlert } from 'lucide-react';

export function JobsOpsList() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const { roles } = useAuth();
  const isAdmin = roles.includes('admin') || roles.includes('super_admin');
  const isEditor = roles.includes('editor');
  
  const canCreate = isAdmin || isEditor;

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const data = await jobsOpsService.listJobs();
      setJobs(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Internal Job Management</h1>
        {canCreate && (
          <Link 
            to="/0ps26/jobs/new"
            className="bg-[#0B3D2E] text-white px-4 py-2 rounded font-medium hover:bg-[#155a44]"
          >
            New Job
          </Link>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Job Title / Company</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Featured</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Updated</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {jobs.map(job => (
              <tr key={job.id}>
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-900">{job.title}</div>
                  <div className="text-sm text-slate-500">{job.company_name}</div>
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${job.status === 'published' ? 'bg-green-100 text-green-800' : 
                      job.status === 'draft' ? 'bg-slate-100 text-slate-800' : 
                      job.status === 'archived' ? 'bg-red-100 text-red-800' : 
                      'bg-yellow-100 text-yellow-800'}`}>
                    {job.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {job.featured ? 'Yes' : 'No'}
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {new Date(job.updated_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium">
                  {/* Recruiter can only view, no edit link */}
                  {(canCreate && (isAdmin || job.status === 'draft')) ? (
                    <Link to={`/0ps26/jobs/${job.id}/edit`} className="text-[#0B3D2E] hover:underline flex items-center justify-end gap-1">
                      <Edit2 className="w-4 h-4" /> Edit
                    </Link>
                  ) : (
                    <span className="text-slate-400 flex items-center justify-end gap-1" title="View Only">
                       <ShieldAlert className="w-4 h-4" /> View Only
                    </span>
                  )}
                  {job.status === 'published' && (
                    <a href={`/jobs/${job.slug}`} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-slate-700 ml-3 inline-flex items-center gap-1">
                      Public <ExternalLink className="w-3 h-3"/>
                    </a>
                  )}
                </td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  No jobs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
