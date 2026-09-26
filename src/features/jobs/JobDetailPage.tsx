import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Briefcase, Building2, Clock, Globe, ArrowLeft, Send, ExternalLink, Calendar, Compass } from 'lucide-react';
import { getPublishedJobBySlug, Job } from './jobs.service.js';
import { JobAlignmentCard } from '../matching/JobAlignmentCard.js';
import { SkillsGapCard } from '../skillsGap/SkillsGapCard.js';
import { CvTailoringCard } from '../tailoring/CvTailoringCard.js';
import { AlignmentHistoryCard } from '../alignmentHistory/AlignmentHistoryCard.js';
import { useAuth } from '../../lib/auth.js';

export function JobDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadJob() {
      if (!slug) return;
      setLoading(true);
      setError(null);
      try {
        const data = await getPublishedJobBySlug(slug);
        if (!data) {
          setError('Job not found or is no longer available.');
        } else {
          setJob(data);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load job details.');
      } finally {
        setLoading(false);
      }
    }
    loadJob();
  }, [slug]);

  const formatWorkplace = (type: string) => {
    if (type === 'unspecified') return null;
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const formatEmployment = (type: string) => {
    if (type === 'unspecified') return null;
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('-');
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatSalary = (min: number | null, max: number | null, currency: string | null, period: string | null) => {
    if (!min && !max) return null;
    const curr = currency || 'USD';
    const per = period ? `/${period}` : '/year';
    
    const formatNumber = (num: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: curr,
        maximumFractionDigits: 0
      }).format(num);
    };

    if (min && max) return `${formatNumber(min)} - ${formatNumber(max)}${per}`;
    if (min) return `From ${formatNumber(min)}${per}`;
    if (max) return `Up to ${formatNumber(max)}${per}`;
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="flex flex-col items-center text-slate-500">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B3D2E] mb-4"></div>
          <p>Loading job details...</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Briefcase className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Job Unavailable</h2>
          <p className="text-slate-600 mb-6">{error || 'This opportunity may have been closed or archived.'}</p>
          <Link to="/jobs" className="inline-flex items-center gap-2 text-white bg-[#0B3D2E] hover:bg-[#155a44] px-6 py-2.5 rounded-lg font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Browse all jobs
          </Link>
        </div>
      </div>
    );
  }

  const salaryString = formatSalary(job.salary_min, job.salary_max, job.salary_currency, job.salary_period);
  
  // Decide the primary apply action
  const applyLink = job.application_url || (job.application_email ? `mailto:${job.application_email}` : null);

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-16">
      {/* Hero section */}
      <div className="bg-white border-b border-slate-200 pt-8 pb-12">
        <div className="max-w-4xl mx-auto px-4">
          <Link to="/jobs" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-[#0B3D2E] mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to jobs
          </Link>
          
          <div className="flex flex-col md:flex-row gap-6 md:items-start">
            {job.company_logo_url ? (
              <img src={job.company_logo_url} alt={job.company_name} className="w-20 h-20 md:w-24 md:h-24 rounded-lg object-cover border border-slate-200 shadow-sm shrink-0 bg-white" />
            ) : (
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-400 font-bold text-3xl shrink-0">
                {job.company_name.charAt(0)}
              </div>
            )}
            
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
                {job.title}
              </h1>
              <div className="text-xl text-slate-600 mb-4">{job.company_name}</div>
              
              <div className="flex flex-wrap items-center gap-y-3 gap-x-6 text-slate-600 text-sm font-medium">
                {job.location_text && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {job.location_text}
                  </div>
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
                  <div className="flex items-center gap-2 text-green-700 bg-green-50 px-2 py-0.5 rounded">
                    {salaryString}
                  </div>
                )}
              </div>
            </div>
            
            <div className="shrink-0 mt-4 md:mt-0 md:ml-6 flex flex-col gap-3 md:min-w-[180px]">
              {applyLink ? (
                <a 
                  href={applyLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#0B3D2E] hover:bg-[#155a44] text-white px-6 py-3 rounded-lg font-semibold transition-colors shadow-sm"
                >
                  Apply Now
                  {job.application_url ? <ExternalLink className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                </a>
              ) : (
                <button 
                  disabled
                  className="w-full bg-slate-100 text-slate-400 px-6 py-3 rounded-lg font-semibold cursor-not-allowed border border-slate-200"
                >
                  Applications Closed
                </button>
              )}
              {job.application_deadline && (
                <div className="text-xs text-center text-slate-500 flex items-center justify-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Apply by {formatDate(job.application_deadline)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Column - Details */}
        <div className="md:col-span-2 space-y-8">

          {/* Candidate Role Alignment Section */}
          {user ? (
            <div className="space-y-4">
              <div id="job-alignment-card">
                <JobAlignmentCard 
                  jobId={job.id} 
                  jobTitle={job.title} 
                  companyName={job.company_name} 
                />
              </div>
              <SkillsGapCard 
                jobId={job.id} 
                jobTitle={job.title} 
                companyName={job.company_name} 
              />
              <CvTailoringCard 
                jobId={job.id} 
                jobTitle={job.title} 
                companyName={job.company_name} 
              />
              <AlignmentHistoryCard
                jobId={job.id}
                jobTitle={job.title}
                companyName={job.company_name}
              />
            </div>
          ) : (
            <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 p-6 shadow-sm flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#0B3D2E]/10 flex items-center justify-center shrink-0 text-[#0B3D2E]">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">Check Role Alignment</h4>
                <p className="text-xs text-slate-600 mb-3">
                  Sign in with your QWERTY candidate account to compare your approved profile against this role's requirements.
                </p>
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0B3D2E] hover:bg-[#155a44] text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
                >
                  Sign In to Check Alignment
                </Link>
              </div>
            </div>
          )}

          <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm space-y-8">
            <section>
              <h3 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">About the Role</h3>
              <div className="prose prose-slate max-w-none whitespace-pre-wrap text-slate-700 leading-relaxed">
                {job.description}
              </div>
            </section>

          {job.responsibilities && (
            <section>
              <h3 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">Responsibilities</h3>
              <div className="prose prose-slate max-w-none whitespace-pre-wrap text-slate-700 leading-relaxed">
                {job.responsibilities}
              </div>
            </section>
          )}

          {job.requirements && (
            <section>
              <h3 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">Requirements</h3>
              <div className="prose prose-slate max-w-none whitespace-pre-wrap text-slate-700 leading-relaxed">
                {job.requirements}
              </div>
            </section>
          )}

          {job.preferred_qualifications && (
            <section>
              <h3 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">Preferred Qualifications</h3>
              <div className="prose prose-slate max-w-none whitespace-pre-wrap text-slate-700 leading-relaxed">
                {job.preferred_qualifications}
              </div>
            </section>
          )}

          {job.benefits && (
            <section>
              <h3 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">Benefits</h3>
              <div className="prose prose-slate max-w-none whitespace-pre-wrap text-slate-700 leading-relaxed">
                {job.benefits}
              </div>
            </section>
          )}
          </div>
        </div>

        {/* Right Column - Meta Sidebar */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4">Job Overview</h3>
            <dl className="space-y-4 text-sm">
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
                  <dd className="font-medium text-slate-900">
                    {job.source_url ? (
                      <a href={job.source_url} target="_blank" rel="noopener noreferrer" className="text-[#0B3D2E] hover:underline inline-flex items-center gap-1">
                        {job.source_name}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : job.source_name}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

      </div>
    </div>
  );
}
