import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  RefreshCw, 
  FileText,
  Clock
} from 'lucide-react';
import { cvTailoringService, CandidateCvTailoringSession } from './cvTailoring.service.js';

interface CvTailoringCardProps {
  jobId: string;
  jobTitle: string;
  companyName: string;
}

export function CvTailoringCard({ jobId, jobTitle, companyName }: CvTailoringCardProps) {
  const navigate = useNavigate();
  const [session, setSession] = useState<CandidateCvTailoringSession | null>(null);
  const [isPublicEnabled, setIsPublicEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSession();
  }, [jobId]);

  async function loadSession() {
    setLoading(true);
    setError(null);
    try {
      const data = await cvTailoringService.getJobTailoringStatus(jobId);
      setSession(data.session || null);
      setIsPublicEnabled(Boolean(data.is_public_enabled));
    } catch (err: any) {
      // Gracefully handle 404 or unauthenticated
      setIsPublicEnabled(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleStartTailoring(forceNew = false) {
    setGenerating(true);
    setError(null);
    try {
      const newSession = await cvTailoringService.createJobTailoringSession(jobId, forceNew);
      navigate(`/candidate/tailoring/${newSession.id}`);
    } catch (err: any) {
      if (err?.error === 'FEATURE_NOT_AVAILABLE') {
        setError('AI CV Tailoring is coming soon.');
      } else if (err?.message?.includes('ALIGNMENT_REQUIRED') || err?.error === 'ALIGNMENT_REQUIRED') {
        setError('A completed role alignment check is required before tailoring your CV. Please check your alignment for this role above first.');
      } else if (err?.message?.includes('NO_APPROVED_CV') || err?.error === 'NO_APPROVED_CV') {
        setError('You need an approved CV profile to tailor your CV. Please upload and verify your CV in your Profile workspace first.');
      } else if (
        err?.status === 503 ||
        err?.error === 'GEMINI_UNAVAILABLE' ||
        err?.error === 'TAILORING_PERSISTENCE_UNAVAILABLE' ||
        err?.message?.includes('temporarily unavailable')
      ) {
        setError('CV tailoring is temporarily unavailable because the AI service could not complete this request. Your original CV and profile are unchanged. Please try again.');
      } else {
        // Controlled candidate fallback: never surface raw syntax errors, HTML, or provider exceptions
        setError('CV tailoring is temporarily unavailable because the AI service could not complete this request. Your original CV and profile are unchanged. Please try again.');
      }
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 text-slate-400 text-xs">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#0B3D2E]"></div>
          Loading tailoring status...
        </div>
      </div>
    );
  }

  // ============================================================
  // PUBLIC COMING SOON CARD PRESENTATION (when feature flag is false)
  // ============================================================
  if (!isPublicEnabled) {
    return (
      <div className="bg-gradient-to-br from-white via-slate-50 to-emerald-50/20 rounded-xl border border-emerald-100/80 p-6 shadow-sm relative overflow-hidden">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#0B3D2E]/10 flex items-center justify-center shrink-0 text-[#0B3D2E]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <h4 className="font-bold text-slate-900 text-sm">Evidence-Safe CV Tailoring</h4>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-[#0B3D2E] border border-emerald-200/60">
                  <Clock className="w-3 h-3" /> Coming Soon
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                  <ShieldCheck className="w-3 h-3 text-[#0B3D2E]" /> Factual Protection
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
                Tailor your CV to a specific role while keeping every claim grounded in your approved experience and qualifications.
              </p>
              <p className="text-xs text-slate-400 mt-2 font-medium">
                QWERTY is preparing this feature for a future release.
              </p>
            </div>
          </div>

          {/* Historical inspectable badge for existing tester/developer review */}
          {session && session.status === 'completed' && (
            <button
              onClick={() => navigate(`/candidate/tailoring/${session.id}`)}
              title="Inspect previously generated draft (read-only)"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors shrink-0 shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5 text-[#0B3D2E]" />
              View Historical Draft
              <ArrowRight className="w-3 h-3 text-slate-400" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ============================================================
  // INTERNAL / CONTROLLED ACTIVE CARD PRESENTATION (when CV_TAILORING_PUBLIC_ENABLED=true)
  // ============================================================
  return (
    <div className="bg-gradient-to-br from-white via-slate-50 to-emerald-50/20 rounded-xl border border-emerald-100 p-6 shadow-sm relative overflow-hidden">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0B3D2E]/10 flex items-center justify-center shrink-0 text-[#0B3D2E]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-bold text-slate-900 text-sm">Evidence-Safe CV Tailoring</h4>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                <ShieldCheck className="w-3 h-3" /> Factual Protection
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
              Optimize presentation, action verbs, and skill ordering specifically for this role without inventing new facts. Your original approved CV remains completely unchanged.
            </p>
          </div>
        </div>

        {session && session.status === 'completed' && (
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 shrink-0">
            <FileText className="w-3.5 h-3.5 text-[#0B3D2E]" />
            {session.tailoring_status === 'finalized' ? 'Draft Finalized' : 'Draft In Review'}
          </span>
        )}
      </div>

      {session?.is_stale && (
        <div className="mt-4 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>{session.stale_reason || 'Job advert or your approved profile has been updated since this tailored CV was generated.'}</span>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            {session && session.status === 'completed' ? 'Fresh Version Generation Unavailable' : 'Tailoring Unavailable'}
          </div>
          <p className="text-amber-800">{error}</p>
          {session && session.status === 'completed' && (
            <p className="text-emerald-800 font-medium pt-0.5">
              Your previously tailored draft below remains intact and ready for review.
            </p>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {session && session.status === 'completed' ? (
          <>
            <button
              onClick={() => navigate(`/candidate/tailoring/${session.id}`)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0B3D2E] hover:bg-[#155a44] text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
            >
              Open Tailoring Workspace <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleStartTailoring(true)}
              disabled={generating}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-medium border border-slate-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
              Generate Fresh Version
            </button>
          </>
        ) : (
          <button
            onClick={() => handleStartTailoring(false)}
            disabled={generating}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0B3D2E] hover:bg-[#155a44] text-white rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Preparing Evidence & Suggestions...' : 'Tailor My CV for This Role'}
          </button>
        )}
      </div>
    </div>
  );
}
