'use client';

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Bookmark,
  Bell,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  Compass,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Mail,
  ShieldCheck,
  Target
} from 'lucide-react';
import {
  candidateDashboardService,
  CandidateDashboardResponse
} from './dashboard.service.js';

export function CandidateDashboardPage() {
  const [dashboard, setDashboard] = useState<CandidateDashboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const data = await candidateDashboardService.getDashboard();
      setDashboard(data);
    } catch (err: any) {
      console.error('[CandidateDashboardPage] Load error:', err);
      setError(err.message || 'Unable to load candidate dashboard.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-20 text-center">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#0B3D2E] mb-3" />
        <p className="text-sm font-medium text-slate-600">Loading your candidate workspace...</p>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-base">Dashboard Error</h3>
            <p className="text-sm mt-1">{error || 'Could not load your activity data.'}</p>
            <button
              onClick={loadDashboard}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { candidate, profile_readiness, saved_jobs, job_alerts, recent_alignments, next_actions } = dashboard;
  const candidateName = candidate.first_name || candidate.display_name || 'Candidate';
  const isNewCandidate = !profile_readiness.cv_uploaded && saved_jobs.total === 0 && job_alerts.total === 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* ---------------------------------------------------- */}
      {/* SECTION A: WELCOME AREA & REFRESH                    */}
      {/* ---------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Welcome back, {candidateName}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Continue your job search, review saved opportunities and keep track of your career progress.
          </p>
        </div>

        <button
          onClick={loadDashboard}
          title="Refresh dashboard data"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded-md text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors self-start sm:self-auto shadow-2xs"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          Refresh
        </button>
      </div>

      {/* ---------------------------------------------------- */}
      {/* SECTION B: QUICK ACTIONS BAR                         */}
      {/* ---------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Link
          to="/jobs"
          className="flex items-center gap-2.5 p-3 rounded-lg bg-white border border-slate-200 hover:border-[#0B3D2E] hover:shadow-xs transition-all text-slate-800 text-sm font-semibold group"
        >
          <div className="w-8 h-8 rounded-md bg-emerald-50 text-[#0B3D2E] flex items-center justify-center shrink-0 group-hover:bg-[#0B3D2E] group-hover:text-white transition-colors">
            <Briefcase className="w-4 h-4" />
          </div>
          <span>Browse Jobs</span>
        </Link>

        <Link
          to="/candidate/saved-jobs"
          className="flex items-center gap-2.5 p-3 rounded-lg bg-white border border-slate-200 hover:border-[#0B3D2E] hover:shadow-xs transition-all text-slate-800 text-sm font-semibold group"
        >
          <div className="w-8 h-8 rounded-md bg-emerald-50 text-[#0B3D2E] flex items-center justify-center shrink-0 group-hover:bg-[#0B3D2E] group-hover:text-white transition-colors">
            <Bookmark className="w-4 h-4" />
          </div>
          <div className="truncate">
            <span>Saved Jobs</span>
            {saved_jobs.total > 0 && (
              <span className="ml-1.5 text-xs text-slate-500 font-normal">({saved_jobs.total})</span>
            )}
          </div>
        </Link>

        <Link
          to="/candidate/job-alerts"
          className="flex items-center gap-2.5 p-3 rounded-lg bg-white border border-slate-200 hover:border-[#0B3D2E] hover:shadow-xs transition-all text-slate-800 text-sm font-semibold group"
        >
          <div className="w-8 h-8 rounded-md bg-emerald-50 text-[#0B3D2E] flex items-center justify-center shrink-0 group-hover:bg-[#0B3D2E] group-hover:text-white transition-colors">
            <Bell className="w-4 h-4" />
          </div>
          <div className="truncate">
            <span>Job Alerts</span>
            {job_alerts.total > 0 && (
              <span className="ml-1.5 text-xs text-slate-500 font-normal">({job_alerts.total})</span>
            )}
          </div>
        </Link>

        <Link
          to="/candidate/profile"
          className="flex items-center gap-2.5 p-3 rounded-lg bg-white border border-slate-200 hover:border-[#0B3D2E] hover:shadow-xs transition-all text-slate-800 text-sm font-semibold group"
        >
          <div className="w-8 h-8 rounded-md bg-emerald-50 text-[#0B3D2E] flex items-center justify-center shrink-0 group-hover:bg-[#0B3D2E] group-hover:text-white transition-colors">
            <FileText className="w-4 h-4" />
          </div>
          <span>My Profile & CV</span>
        </Link>

        <Link
          to="/career"
          className="flex items-center gap-2.5 p-3 rounded-lg bg-white border border-slate-200 hover:border-[#0B3D2E] hover:shadow-xs transition-all text-slate-800 text-sm font-semibold group col-span-2 sm:col-span-1"
        >
          <div className="w-8 h-8 rounded-md bg-emerald-50 text-[#0B3D2E] flex items-center justify-center shrink-0 group-hover:bg-[#0B3D2E] group-hover:text-white transition-colors">
            <Compass className="w-4 h-4" />
          </div>
          <span>Career Hub</span>
        </Link>
      </div>

      {/* ---------------------------------------------------- */}
      {/* NEW CANDIDATE GUIDANCE (EMPTY STATE)                 */}
      {/* ---------------------------------------------------- */}
      {isNewCandidate && (
        <div className="bg-linear-to-br from-emerald-900 to-[#0B3D2E] text-white rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-800/80 text-emerald-100 mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Welcome to QWERTY
            </span>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Get Started with Your Career Workspace
            </h2>
            <p className="text-sm text-emerald-100 mt-2">
              Follow these three simple steps to prepare your profile, discover relevant opportunities, and configure automated job tracking.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-xs border border-white/10">
              <div className="text-emerald-300 text-xs font-bold uppercase tracking-wider mb-1">Step 1</div>
              <h3 className="font-semibold text-white text-base">Upload Your CV</h3>
              <p className="text-xs text-emerald-100 mt-1">
                Upload your CV to unlock job alignment scoring and evidence-safe insights.
              </p>
              <Link
                to="/candidate/profile"
                className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-emerald-200 hover:text-white"
              >
                Go to Profile <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-xs border border-white/10">
              <div className="text-emerald-300 text-xs font-bold uppercase tracking-wider mb-1">Step 2</div>
              <h3 className="font-semibold text-white text-base">Browse Open Roles</h3>
              <p className="text-xs text-emerald-100 mt-1">
                Explore published vacancies across sectors and bookmark positions of interest.
              </p>
              <Link
                to="/jobs"
                className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-emerald-200 hover:text-white"
              >
                Browse Jobs <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-xs border border-white/10">
              <div className="text-emerald-300 text-xs font-bold uppercase tracking-wider mb-1">Step 3</div>
              <h3 className="font-semibold text-white text-base">Create a Job Alert</h3>
              <p className="text-xs text-emerald-100 mt-1">
                Set targeted keyword and workplace preferences to discover matching vacancies.
              </p>
              <Link
                to="/candidate/job-alerts"
                className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-emerald-200 hover:text-white"
              >
                Create Alert <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* SECTION C: DETERMINISTIC NEXT ACTIONS                */}
      {/* ---------------------------------------------------- */}
      {next_actions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Target className="w-4 h-4 text-[#0B3D2E]" />
              Recommended Next Actions
            </h2>
            <span className="text-xs text-slate-500">Prioritized for your progress</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {next_actions.map(action => (
              <div
                key={action.id}
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-emerald-50 text-[#0B3D2E]">
                      Priority {action.priority}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-900 text-base">{action.title}</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {action.description}
                  </p>
                </div>

                <div className="pt-4 mt-2">
                  <Link
                    to={action.href}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0B3D2E] hover:bg-[#1E6B50] text-white rounded-md text-xs font-semibold transition-colors shadow-2xs"
                  >
                    {action.cta}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* SECTION D: 3-COLUMN ACTIVITY OVERVIEW                */}
      {/* ---------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CARD 1: PROFILE & CV READINESS */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#0B3D2E]" />
                Profile & CV Readiness
              </h2>
              <Link
                to="/candidate/profile"
                className="text-xs text-[#0B3D2E] hover:underline font-semibold"
              >
                Edit
              </Link>
            </div>

            <div className="space-y-3.5 mt-4 text-xs">
              {/* CV Status */}
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-600">Active CV Document</span>
                {profile_readiness.cv_uploaded ? (
                  <div className="text-right">
                    <span className="font-semibold text-slate-900 flex items-center gap-1 justify-end">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Uploaded
                    </span>
                    <span className="text-[11px] text-slate-500 block truncate max-w-[150px]">
                      {profile_readiness.cv_filename}
                    </span>
                  </div>
                ) : (
                  <span className="text-amber-600 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Not Uploaded
                  </span>
                )}
              </div>

              {/* Profile Applied / Reviewed */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600">CV Extraction Status</span>
                {profile_readiness.profile_applied ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[11px]">
                    Reviewed & Active
                  </span>
                ) : profile_readiness.cv_parse_status === 'completed' || profile_readiness.cv_parse_status === 'needs_review' ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold text-[11px]">
                    Pending Confirmation
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium text-[11px]">
                    Incomplete
                  </span>
                )}
              </div>

              {/* ATS Readiness Assessment */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600">ATS Readiness</span>
                {profile_readiness.ats_readiness.available ? (
                  <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                    {profile_readiness.ats_readiness.score} / {profile_readiness.ats_readiness.max_score}
                  </span>
                ) : (
                  <span className="text-slate-400 font-medium">Not Assessed</span>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100">
            <Link
              to="/candidate/profile"
              className="text-xs font-semibold text-[#0B3D2E] hover:underline inline-flex items-center gap-1"
            >
              Manage Profile & CV
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* CARD 2: SAVED JOBS SUMMARY */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-[#0B3D2E]" />
                <h2 className="font-bold text-slate-900 text-base">Saved Jobs</h2>
              </div>
              <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                {saved_jobs.total}
              </span>
            </div>

            <div className="mt-3">
              {saved_jobs.recent.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  <Bookmark className="w-6 h-6 mx-auto mb-1.5 text-slate-300" />
                  <p>No saved opportunities yet.</p>
                  <Link to="/jobs" className="text-[#0B3D2E] font-semibold hover:underline mt-1 inline-block">
                    Explore published jobs
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {saved_jobs.recent.map(item => (
                    <div key={item.saved_job_id} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          to={`/jobs/${item.job.slug || item.job.id}`}
                          className="font-semibold text-slate-900 hover:text-[#0B3D2E] text-xs truncate block"
                        >
                          {item.job.title}
                        </Link>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {item.job.company_name} {item.job.location_text ? `• ${item.job.location_text}` : ''}
                        </p>
                      </div>

                      <Link
                        to={`/jobs/${item.job.slug || item.job.id}`}
                        className="text-[11px] font-semibold text-[#0B3D2E] hover:underline shrink-0"
                      >
                        View
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
            <Link
              to="/candidate/saved-jobs"
              className="text-xs font-semibold text-[#0B3D2E] hover:underline inline-flex items-center gap-1"
            >
              View All Saved Jobs
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* CARD 3: JOB ALERTS SUMMARY */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#0B3D2E]" />
                <h2 className="font-bold text-slate-900 text-base">Job Alerts</h2>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-semibold text-slate-700">{job_alerts.active} active</span>
                <span className="text-slate-300">/</span>
                <span className="text-slate-500">{job_alerts.total} total</span>
              </div>
            </div>

            {/* Current Matching Vacancies Badge */}
            <div className="mt-3 p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-100 flex items-center justify-between text-xs">
              <span className="text-emerald-950 font-medium">Matching Published Roles</span>
              <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full text-[11px]">
                {job_alerts.unique_matching_jobs_count} {job_alerts.unique_matching_jobs_count === 1 ? 'job' : 'jobs'}
              </span>
            </div>

            <div className="mt-3">
              {job_alerts.recent.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-500">
                  <Bell className="w-6 h-6 mx-auto mb-1.5 text-slate-300" />
                  <p>No job alerts configured.</p>
                  <Link to="/candidate/job-alerts" className="text-[#0B3D2E] font-semibold hover:underline mt-1 inline-block">
                    Create your first alert
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {job_alerts.recent.map(alert => (
                    <div key={alert.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-900 truncate block">
                          {alert.name}
                        </span>
                        <span className="text-[11px] text-slate-500 capitalize">
                          {alert.frequency} digest
                        </span>
                      </div>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                          alert.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {alert.is_active ? 'Active' : 'Paused'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notification Delivery status notice */}
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-500">
              <Mail className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              <span>Email delivery & alerts — Coming Soon</span>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100">
            <Link
              to="/candidate/job-alerts"
              className="text-xs font-semibold text-[#0B3D2E] hover:underline inline-flex items-center gap-1"
            >
              Manage Job Alerts
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* SECTION E: RECENT JOB ANALYSES (ALIGNMENT HISTORY)   */}
      {/* ---------------------------------------------------- */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#0B3D2E]" />
              Recent Job Analyses
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review stored Job Alignment evidence scores and compare analysis history.
            </p>
          </div>

          {recent_alignments.total > 0 && (
            <span className="text-xs text-slate-500">
              Completed Analyses: <strong className="text-slate-800">{recent_alignments.total}</strong>
            </span>
          )}
        </div>

        {recent_alignments.recent.length === 0 ? (
          <div className="py-10 text-center text-slate-500 text-sm">
            <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No Job Alignments Analysed Yet</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
              Check your Job Alignment on any published role to calculate deterministic evidence match scores and development insights.
            </p>
            <Link
              to="/jobs"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0B3D2E] text-white rounded-md text-xs font-semibold hover:bg-[#1E6B50] transition-colors"
            >
              Browse Jobs to Analyse
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recent_alignments.recent.map(item => (
              <div key={item.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/jobs/${item.job_id}`}
                      className="font-semibold text-slate-900 hover:text-[#0B3D2E] text-sm"
                    >
                      {item.job_title}
                    </Link>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                      {item.ruleset_version || 'job-alignment-v1.3'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                    <span className="font-medium text-slate-700">{item.company_name}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  {item.score !== undefined && (
                    <div className="text-right">
                      <span className="text-xs text-slate-500 block">Alignment Score</span>
                      <span className="text-base font-bold text-[#0B3D2E]">
                        {item.score} <span className="text-xs text-slate-400 font-normal">/ {item.max_score || 100}</span>
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/jobs/${item.job_id}`}
                      className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      View Analysis
                    </Link>
                    <Link
                      to={`/candidate/jobs/${item.job_id}/history`}
                      className="px-3 py-1.5 bg-[#0B3D2E] text-white rounded text-xs font-semibold hover:bg-[#1E6B50] transition-colors"
                    >
                      Match History
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* SECTION F: CAREER HUB ENTRY POINT                    */}
      {/* ---------------------------------------------------- */}
      <div className="bg-slate-900 text-white rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-sm">
        <div className="max-w-xl">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Compass className="w-4 h-4" />
            Career Exploration
          </div>
          <h2 className="text-lg font-bold text-white">QWERTY Career Hub</h2>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            Discover role benchmarks, skill taxonomies, and learning pathways to plan your professional development trajectory.
          </p>
        </div>

        <Link
          to="/career"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-semibold transition-colors shrink-0 self-start sm:self-auto"
        >
          Explore Career Hub
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
