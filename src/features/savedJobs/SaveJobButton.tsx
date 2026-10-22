'use client';

import React, { useState, useEffect } from 'react';
import { Bookmark, Check, UserPlus, LogIn, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth.js';
import { savedJobsService } from './savedJobs.service.js';

interface SaveJobButtonProps {
  jobId: string;
  jobTitle?: string;
  className?: string;
  onStatusChange?: (isSaved: boolean) => void;
}

export function SaveJobButton({
  jobId,
  jobTitle,
  className = '',
  onStatusChange
}: SaveJobButtonProps) {
  const { user, roles, loading: authLoading } = useAuth();
  const isCandidate = Boolean(user && (roles.includes('candidate') || roles.length === 0));

  const [saved, setSaved] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [showGate, setShowGate] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function checkStatus() {
      if (authLoading || !isCandidate || !jobId) return;
      try {
        const res = await savedJobsService.getSavedStatus(jobId);
        if (mounted) {
          setSaved(Boolean(res.saved));
          onStatusChange?.(Boolean(res.saved));
        }
      } catch (err) {
        // Silently treat failure as not saved
      }
    }
    checkStatus();
    return () => {
      mounted = false;
    };
  }, [authLoading, isCandidate, jobId]);

  const handleToggleSave = async () => {
    // If not authenticated as candidate, present registration gate prompt
    if (!isCandidate) {
      setShowGate(true);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      if (saved) {
        await savedJobsService.unsaveJob(jobId);
        setSaved(false);
        onStatusChange?.(false);
      } else {
        await savedJobsService.saveJob(jobId);
        setSaved(true);
        onStatusChange?.(true);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to update saved job.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative inline-block w-full">
      <button
        type="button"
        onClick={handleToggleSave}
        disabled={loading}
        aria-pressed={saved}
        aria-label={saved ? `Remove ${jobTitle || 'job'} from saved jobs` : `Save ${jobTitle || 'job'}`}
        className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm ${
          saved
            ? 'bg-emerald-50 text-[#0B3D2E] border border-emerald-300 hover:bg-emerald-100/80'
            : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400'
        } ${loading ? 'opacity-70 cursor-wait' : ''} ${className}`}
      >
        {saved ? (
          <>
            <Bookmark className="w-4 h-4 fill-[#0B3D2E] text-[#0B3D2E]" aria-hidden="true" />
            <span>Saved</span>
          </>
        ) : (
          <>
            <Bookmark className="w-4 h-4 text-slate-500" aria-hidden="true" />
            <span>Save Job</span>
          </>
        )}
      </button>

      {errorMessage && (
        <div className="mt-1 text-xs text-red-600 text-center font-medium">
          {errorMessage}
        </div>
      )}

      {/* Registration Gate Modal / Popover for Anonymous Visitors */}
      {showGate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 relative">
            <button
              onClick={() => setShowGate(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
              aria-label="Close registration prompt"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#0B3D2E] flex items-center justify-center shrink-0">
                <Bookmark className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Save Jobs with QWERTY</h3>
            </div>

            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Create a free QWERTY account to save jobs and access your personalized career tools.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to={`/register?returnTo=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/jobs')}`}
                state={{ from: typeof window !== 'undefined' ? window.location.pathname : '/jobs' }}
                onClick={() => setShowGate(false)}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-[#0B3D2E] hover:bg-[#155a44] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm"
              >
                <UserPlus className="w-4 h-4" />
                Create Free Account
              </Link>
              <Link
                to={`/login?returnTo=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/jobs')}`}
                state={{ from: typeof window !== 'undefined' ? window.location.pathname : '/jobs' }}
                onClick={() => setShowGate(false)}
                className="inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
