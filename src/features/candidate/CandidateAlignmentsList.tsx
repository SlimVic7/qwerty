import React, { useState, useEffect } from 'react';
import { Compass, ExternalLink, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { jobAlignmentService, CandidateJobAlignment } from '../matching/jobAlignment.service.js';

export function CandidateAlignmentsList() {
  const [alignments, setAlignments] = useState<CandidateJobAlignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlignments();
  }, []);

  async function loadAlignments() {
    try {
      const data = await jobAlignmentService.listCandidateAlignments();
      setAlignments(data);
    } catch (e) {
      console.error('Failed to load candidate alignments:', e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-xl border border-neutral-200 animate-pulse">
        <div className="h-5 w-40 bg-neutral-200 rounded mb-4"></div>
        <div className="h-10 bg-neutral-100 rounded"></div>
      </div>
    );
  }

  if (alignments.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Compass className="w-5 h-5 text-[#0B3D2E]" />
          <h2 className="text-lg font-semibold text-neutral-900">Role Alignments</h2>
        </div>
        <p className="text-sm text-neutral-600 mb-4">
          You haven't checked alignment against any roles yet. Visit any job listing to see how your approved profile matches its requirements.
        </p>
        <Link
          to="/jobs"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B3D2E] hover:underline"
        >
          Explore published jobs &rarr;
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-[#0B3D2E]" />
          <h2 className="text-lg font-semibold text-neutral-900">Role Alignments</h2>
        </div>
        <span className="text-xs font-medium text-neutral-500">{alignments.length} analyzed</span>
      </div>

      <div className="space-y-3">
        {alignments.map(item => (
          <div
            key={item.id}
            className="p-3.5 rounded-lg border border-neutral-100 hover:border-neutral-200 bg-neutral-50/50 hover:bg-neutral-50 transition-colors flex items-center justify-between gap-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-bold text-sm text-neutral-900 truncate">
                  {item.job_title}
                </span>
                <span className="text-xs text-neutral-400">&bull;</span>
                <span className="text-xs text-neutral-600 truncate">{item.company_name}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-neutral-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-neutral-400" />
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
                {item.is_stale && (
                  <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[11px]">
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                    Updated
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                {item.status === 'failed' || item.error_code === 'NO_EVALUABLE_CRITERIA' ? (
                  <>
                    <div className="text-xs font-semibold text-neutral-500">
                      Unavailable
                    </div>
                    <div className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                      Unscored
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-base font-bold text-neutral-900">
                      {item.score ?? 0}%
                    </div>
                    <div className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                      Alignment
                    </div>
                  </>
                )}
              </div>
              <Link
                to={`/jobs`}
                className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
                title="View job"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
