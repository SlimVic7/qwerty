import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Briefcase, Building2, Clock, Globe, ArrowLeft, Send, ExternalLink, Calendar } from 'lucide-react';
import { jobsOpsService } from './jobsOps.service.js';

export function JobOpsPreview() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadJob() {
      if (!id) return;
      try {
        const data = await jobsOpsService.getJob(id);
        setJob(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load job details.');
      } finally {
        setLoading(false);
      }
    }
    loadJob();
  }, [id]);

  const formatWorkplace = (type: string) => type === 'unspecified' ? null : type.charAt(0).toUpperCase() + type.slice(1);
  const formatEmployment = (type: string) => type === 'unspecified' ? null : type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('-');
  const formatDate = (dateStr: string | null) => dateStr ? new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null;

  const formatSalary = (min: number | null, max: number | null, currency: string | null, period: string | null) => {
    if (!min && !max) return null;
    const curr = currency || 'USD';
    const per = period ? `/${period}` : '/year';
    const formatNumber = (num: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: curr, maximumFractionDigits: 0 }).format(num);
    if (min && max) return `${formatNumber(min)} - ${formatNumber(max)}${per}`;
    if (min) return `From ${formatNumber(min)}${per}`;
    if (max) return `Up to ${formatNumber(max)}${per}`;
    return null;
  };

  if (loading) return <div className="p-8 text-center">Loading preview...</div>;
  if (error || !job) return <div className="p-8 text-center text-red-600">{error || 'Job not found'}</div>;

  const salaryString = formatSalary(job.salary_min, job.salary_max, job.salary_currency, job.salary_period);
  const applyLink = job.application_url || (job.application_email ? `mailto:${job.application_email}` : null);

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-16">
      {/* Internal Preview Banner */}
      <div className="bg-orange-500 text-white text-center py-2 font-bold flex justify-center items-center gap-4">
        <span>INTERNAL PREVIEW ONLY</span>
        <Link to={`/0ps26/jobs/${job.id}/edit`} className="underline hover:text-orange-100 text-sm">Back to Editor</Link>
      </div>

      <div className="bg-white border-b border-slate-200 pt-8 pb-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-6 md:items-start">
            {job.company_logo_url ? (
              <img src={job.company_logo_url} alt={job.company_name} className="w-20 h-20 md:w-24 md:h-24 rounded-lg object-cover border border-slate-200 shadow-sm shrink-0 bg-white" />
            ) : (
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-400 font-bold text-3xl shrink-0">
                {job.company_name.charAt(0)}
              </div>
            )}
            
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">{job.title}</h1>
              <div className="text-xl text-slate-600 mb-4">{job.company_name}</div>
              
              <div className="flex flex-wrap items-center gap-y-3 gap-x-6 text-slate-600 text-sm font-medium">
                {job.location_text && (
                  <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-400" />{job.location_text}</div>
                )}
                {job.workplace_type !== 'unspecified' && (
                  <div className="flex items-center gap-2">
                    {job.workplace_type === 'remote' ? <Globe className="w-4 h-4 text-slate-400" /> : <Building2 className="w-4 h-4 text-slate-400" />}
                    {formatWorkplace(job.workplace_type)}
                  </div>
                )}
                {job.employment_type !== 'unspecified' && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-slate-400" />
                    {formatEmployment(job.employment_type)}
                  </div>
                )}
                {salaryString && (
                  <div className="flex items-center gap-2 text-green-700 bg-green-50 px-2 py-0.5 rounded">{salaryString}</div>
                )}
              </div>
            </div>
            
            <div className="shrink-0 mt-4 md:mt-0 md:ml-6 flex flex-col gap-3 md:min-w-[180px]">
              {applyLink ? (
                <button disabled className="w-full inline-flex items-center justify-center gap-2 bg-slate-200 text-slate-500 px-6 py-3 rounded-lg font-semibold cursor-not-allowed shadow-sm">
                  Apply Now (Disabled)
                </button>
              ) : (
                <button disabled className="w-full bg-slate-100 text-slate-400 px-6 py-3 rounded-lg font-semibold cursor-not-allowed border border-slate-200">
                  Applications Closed
                </button>
              )}
              {job.application_deadline && (
                <div className="text-xs text-center text-slate-500 flex items-center justify-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Apply by {formatDate(job.application_deadline)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8 bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm">
          <section>
            <h3 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">About the Role</h3>
            <div className="prose prose-slate max-w-none whitespace-pre-wrap text-slate-700 leading-relaxed">{job.description}</div>
          </section>
          {job.responsibilities && (
            <section>
              <h3 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">Responsibilities</h3>
              <div className="prose prose-slate max-w-none whitespace-pre-wrap text-slate-700 leading-relaxed">{job.responsibilities}</div>
            </section>
          )}
          {job.requirements && (
            <section>
              <h3 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">Requirements</h3>
              <div className="prose prose-slate max-w-none whitespace-pre-wrap text-slate-700 leading-relaxed">{job.requirements}</div>
            </section>
          )}
          {job.preferred_qualifications && (
            <section>
              <h3 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">Preferred Qualifications</h3>
              <div className="prose prose-slate max-w-none whitespace-pre-wrap text-slate-700 leading-relaxed">{job.preferred_qualifications}</div>
            </section>
          )}
          {job.benefits && (
            <section>
              <h3 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">Benefits</h3>
              <div className="prose prose-slate max-w-none whitespace-pre-wrap text-slate-700 leading-relaxed">{job.benefits}</div>
            </section>
          )}
        </div>
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4">Job Overview</h3>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-slate-500 mb-1">Status</dt>
                <dd className="font-medium text-slate-900 uppercase">{job.status}</dd>
              </div>
              {job.published_at && (
                <div>
                  <dt className="text-slate-500 mb-1">Posted</dt>
                  <dd className="font-medium text-slate-900">{formatDate(job.published_at)}</dd>
                </div>
              )}
              {job.experience_level && (
                <div>
                  <dt className="text-slate-500 mb-1">Experience Level</dt>
                  <dd className="font-medium text-slate-900">{job.experience_level}</dd>
                </div>
              )}
              {job.country && (
                <div>
                  <dt className="text-slate-500 mb-1">Country</dt>
                  <dd className="font-medium text-slate-900">{job.country}</dd>
                </div>
              )}
              {job.source_name && (
                <div>
                  <dt className="text-slate-500 mb-1">Source</dt>
                  <dd className="font-medium text-slate-900">{job.source_name}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
