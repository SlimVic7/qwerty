'use client';

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bookmark,
  MapPin,
  Building2,
  Calendar,
  Briefcase,
  Trash2,
  ArrowRight,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { savedJobsService, SavedJobListItem } from './savedJobs.service.js';

export function SavedJobsPage() {
  const [savedJobs, setSavedJobs] = useState<SavedJobListItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [page, setPage] = useState<number>(1);
  const limit = 20;

  useEffect(() => {
    loadSavedJobs(page);
  }, [page]);

  async function loadSavedJobs(currentPage: number) {
    setLoading(true);
    setError(null);
    try {
      const offset = (currentPage - 1) * limit;
      const res = await savedJobsService.getSavedJobs(limit, offset);
      setSavedJobs(res.saved_jobs || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      console.error('[SavedJobsPage] Error loading saved jobs:', err);
      setError(err.message || 'Unable to load your saved jobs.');
    } finally {
      setLoading(false);
    }
  }

  const handleRemove = async (jobId: string) => {
    setRemovingId(jobId);
    try {
      await savedJobsService.unsaveJob(jobId);
      setSavedJobs(prev => prev.filter(item => item.job.id !== jobId));
      setTotal(prev => Math.max(0, prev - 1));
    } catch (err: any) {
      console.error('[SavedJobsPage] Error removing job:', err);
    } finally {
      setRemovingId(null);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0B3D2E] flex items-center justify-center font-bold">
            <Bookmark className="w-5 h-5 fill-[#0B3D2E]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Saved Jobs</h1>
            <p className="text-sm text-slate-600">
              Jobs you've saved to review, compare or apply to later.
            </p>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => loadSavedJobs(page)}
            className="text-xs font-semibold underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="py-16 text-center text-slate-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0B3D2E] mx-auto mb-3"></div>
          <p className="text-sm font-medium">Loading saved jobs...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && savedJobs.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400 border border-slate-200">
            <Bookmark className="w-8 h-8 text-slate-300" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">No saved jobs yet.</h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
            Save jobs you're interested in and they will appear here.
          </p>
          <Link
            to="/jobs"
            className="inline-flex items-center gap-2 bg-[#0B3D2E] hover:bg-[#155a44] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            <Briefcase className="w-4 h-4" />
            Browse Jobs
          </Link>
        </div>
      )}

      {/* Saved Jobs List */}
      {!loading && !error && savedJobs.length > 0 && (
        <div className="space-y-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {total} {total === 1 ? 'saved opportunity' : 'saved opportunities'}
          </div>

          <div className="divide-y divide-slate-100 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {savedJobs.map(item => {
              const { job } = item;
              const isClosedOrArchived = job.status === 'closed' || job.status === 'archived';
              const jobUrl = `/jobs/${job.slug || job.id}`;

              return (
                <div
                  key={item.saved_job_id}
                  className="p-5 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <Link
                        to={jobUrl}
                        className="text-base font-bold text-slate-900 hover:text-[#0B3D2E] transition-colors"
                      >
                        {job.title}
                      </Link>

                      {/* Status Badges */}
                      {isClosedOrArchived ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          Closed
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Active
                        </span>
                      )}

                      {job.workplace_type && job.workplace_type !== 'unspecified' && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200 capitalize">
                          {job.workplace_type}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">{job.company_name}</span>
                      {job.location_text && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {job.location_text}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Saved {formatDate(item.saved_at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      to={jobUrl}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-[#0B3D2E] hover:bg-[#155a44] text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
                    >
                      <span>View Job</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleRemove(job.id)}
                      disabled={removingId === job.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-red-50 text-slate-500 hover:text-red-700 border border-slate-200 hover:border-red-200 rounded-lg text-xs font-medium transition-colors"
                      aria-label={`Remove ${job.title} from saved jobs`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{removingId === job.id ? 'Removing...' : 'Remove'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
