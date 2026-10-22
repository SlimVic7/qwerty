'use client';

import React, { useState } from 'react';
import { ExternalLink, Lock, UserPlus, LogIn, X, AlertCircle } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/auth.js';
import { Job } from './jobs.service.js';
import { outboundApplyService } from './outboundApply.service.js';

interface JobApplyActionProps {
  job: Job;
  className?: string;
}

export function JobApplyAction({ job, className = '' }: JobApplyActionProps) {
  const location = useLocation();
  const currentPath = location.pathname !== '/' ? location.pathname : `/jobs/${job.slug || job.id}`;
  const { user, roles, loading: authLoading } = useAuth();
  const isCandidate = Boolean(user && (roles.includes('candidate') || roles.length === 0));

  const [loading, setLoading] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Status checks
  const isClosedOrArchived = job.status === 'closed' || job.status === 'archived' || job.status === 'draft';
  const isDirectJob = job.source_type === 'qwerty_direct';
  const hasExternalLink = Boolean(
    job.application_url && /^https?:\/\//i.test(job.application_url)
  );

  // Button label determination
  const getButtonLabel = () => {
    if (isDirectJob) {
      return 'Direct Application (Coming Soon)';
    }
    if (job.source_type === 'external_company') {
      return 'Apply on Company Website';
    }
    if (job.source_name && job.source_name.toLowerCase().includes('careers')) {
      return 'Apply on Company Website';
    }
    return 'Apply on External Site';
  };

  const handleApplyClick = async () => {
    if (isClosedOrArchived) return;

    if (isDirectJob) {
      setErrorMessage('Direct applications on QWERTY are not available yet.');
      return;
    }

    if (!hasExternalLink) {
      setErrorMessage('Application link unavailable');
      return;
    }

    // Anonymous visitor: trigger registration/sign-in gate
    if (!isCandidate) {
      setShowGate(true);
      return;
    }

    // Authenticated candidate: request server-controlled destination & record event
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await outboundApplyService.triggerOutboundApply(job.id);
      if (result?.destination) {
        // Open safe server destination
        window.open(result.destination, '_blank', 'noopener,noreferrer');
      } else {
        throw new Error('Application link unavailable');
      }
    } catch (err: any) {
      console.error('[JobApplyAction] Error:', err);
      setErrorMessage(err.message || 'Unable to open application link.');
    } finally {
      setLoading(false);
    }
  };

  if (isClosedOrArchived) {
    return (
      <div className="w-full space-y-1.5">
        <button
          disabled
          aria-disabled="true"
          className="w-full bg-slate-100 text-slate-400 px-6 py-3 rounded-lg font-semibold cursor-not-allowed border border-slate-200 text-sm"
        >
          Applications Closed
        </button>
      </div>
    );
  }

  if (!hasExternalLink && !isDirectJob) {
    return (
      <div className="w-full space-y-1.5">
        <button
          disabled
          aria-disabled="true"
          className="w-full bg-slate-100 text-slate-500 px-6 py-3 rounded-lg font-semibold cursor-not-allowed border border-slate-200 text-sm"
        >
          Application link unavailable
        </button>
        <p className="text-[11px] text-slate-500 text-center">
          The external application link has not been provided or verified for this role.
        </p>
      </div>
    );
  }

  if (isDirectJob) {
    return (
      <div className="w-full space-y-1.5">
        <button
          disabled
          aria-disabled="true"
          className="w-full bg-slate-100 text-slate-500 px-6 py-3 rounded-lg font-semibold cursor-not-allowed border border-slate-200 text-sm"
        >
          Direct Application (Coming Soon)
        </button>
        <p className="text-[11px] text-slate-500 text-center">
          QWERTY Direct employer application submission is not yet enabled.
        </p>
      </div>
    );
  }

  return (
    <div className={`w-full space-y-2 ${className}`}>
      <button
        type="button"
        onClick={handleApplyClick}
        disabled={loading}
        aria-label={getButtonLabel()}
        className={`w-full inline-flex items-center justify-center gap-2 bg-[#0B3D2E] hover:bg-[#155a44] text-white px-6 py-3 rounded-lg font-semibold transition-colors shadow-sm text-sm cursor-pointer ${
          loading ? 'opacity-70 cursor-wait' : ''
        }`}
      >
        <span>{loading ? 'Continuing...' : getButtonLabel()}</span>
        <ExternalLink className="w-4 h-4 shrink-0" aria-hidden="true" />
      </button>

      {/* Candidate-facing notice of external application */}
      <p className="text-[11px] text-slate-500 text-center leading-tight">
        You'll continue to an external website to complete your application. QWERTY does not submit the application on your behalf.
      </p>

      {errorMessage && (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200 text-center flex items-center justify-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Anonymous Registration Gate Modal */}
      {showGate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 relative">
            <button
              onClick={() => setShowGate(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
              aria-label="Close application registration prompt"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#0B3D2E] flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Apply with QWERTY</h3>
            </div>

            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Create a free QWERTY account to continue to this application and access your personalized career tools.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to={`/register?returnTo=${encodeURIComponent(currentPath)}`}
                state={{ from: currentPath }}
                onClick={() => setShowGate(false)}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-[#0B3D2E] hover:bg-[#155a44] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm"
              >
                <UserPlus className="w-4 h-4" />
                Create Free Account
              </Link>
              <Link
                to={`/login?returnTo=${encodeURIComponent(currentPath)}`}
                state={{ from: currentPath }}
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
