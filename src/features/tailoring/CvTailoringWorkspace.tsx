import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Sparkles, 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ShieldCheck, 
  FileText, 
  Briefcase, 
  Edit3, 
  RefreshCw, 
  Award, 
  GraduationCap, 
  Layers, 
  HelpCircle,
  Eye,
  Check,
  X
} from 'lucide-react';
import { cvTailoringService, CandidateCvTailoringSession, TailoringSuggestion } from './cvTailoring.service.js';

export function CvTailoringWorkspace() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<CandidateCvTailoringSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingSugId, setEditingSugId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'suggestions' | 'preview'>('suggestions');
  const [finalizing, setFinalizing] = useState(false);

  useEffect(() => {
    if (sessionId) {
      loadSession();
    }
  }, [sessionId]);

  async function loadSession() {
    setLoading(true);
    setError(null);
    try {
      const data = await cvTailoringService.getTailoringSession(sessionId!);
      setSession(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load tailoring workspace.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDecision(suggestionId: string, action: 'accept' | 'reject') {
    if (!session) return;
    setActionLoading(suggestionId);
    try {
      const updated = await cvTailoringService.updateSuggestion(session.id, suggestionId, action);
      setSession(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to update suggestion');
    } finally {
      setActionLoading(null);
    }
  }

  function startEdit(sug: TailoringSuggestion) {
    setEditingSugId(sug.suggestion_id);
    setEditText(sug.suggested_text);
  }

  function cancelEdit() {
    setEditingSugId(null);
    setEditText('');
  }

  async function saveEdit(suggestionId: string) {
    if (!session) return;
    setActionLoading(suggestionId);
    try {
      const updated = await cvTailoringService.updateSuggestion(session.id, suggestionId, 'edit', editText);
      setSession(updated);
      setEditingSugId(null);
    } catch (err: any) {
      alert(err.message || 'Validation failed for edited wording');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleFinalize() {
    if (!session) return;
    setFinalizing(true);
    try {
      const updated = await cvTailoringService.finalizeTailoredDraft(session.id);
      setSession(updated);
      setActiveTab('preview');
    } catch (err: any) {
      alert(err.message || 'Failed to finalize tailored CV draft');
    } finally {
      setFinalizing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B3D2E]"></div>
          <p className="text-sm font-medium">Loading tailoring workspace...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Tailoring Session Unavailable</h2>
          <p className="text-slate-600 text-sm mb-6">{error || 'This tailoring session could not be found.'}</p>
          <Link
            to="/jobs"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0B3D2E] text-white rounded-lg text-sm font-medium hover:bg-[#155a44] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Jobs
          </Link>
        </div>
      </div>
    );
  }

  const suggestions = session.suggestions || [];
  const pendingCount = suggestions.filter(s => s.status === 'pending').length;
  const acceptedCount = suggestions.filter(s => s.status === 'accepted').length;
  const plan = session.tailoring_plan;
  const draft = session.draft_data;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/jobs"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  <ShieldCheck className="w-3.5 h-3.5" /> Evidence-Safe
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {session.tailoring_engine_version}
                </span>
                {session.tailoring_status === 'finalized' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                    <CheckCircle2 className="w-3 h-3" /> Finalized
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold text-slate-900 mt-1">
                CV Tailoring: {session.job_title}
              </h1>
              <p className="text-xs text-slate-500">{session.company_name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
              <button
                onClick={() => setActiveTab('suggestions')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'suggestions'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Suggestions ({acceptedCount}/{suggestions.length} Accepted)
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'preview'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" /> Tailored CV Preview
              </button>
            </div>

            {session.tailoring_status !== 'finalized' && (
              <button
                onClick={handleFinalize}
                disabled={finalizing}
                className="px-4 py-2 bg-[#0B3D2E] hover:bg-[#155a44] text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {finalizing ? 'Finalizing...' : 'Save & Finalize Draft'}
              </button>
            )}
          </div>
        </div>

        {/* Drift Warning Banner */}
        {session.is_stale && (
          <div className="bg-amber-50 border-t border-amber-200 px-4 py-2 text-xs text-amber-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>{session.stale_reason || 'Your profile or this job has changed since this tailored CV was generated.'}</span>
            </div>
            <button
              onClick={() => cvTailoringService.createJobTailoringSession(session.job_id, true).then(() => loadSession())}
              className="font-bold underline hover:text-amber-900 ml-4 shrink-0"
            >
              Create Updated Tailored Version
            </button>
          </div>
        )}
      </div>

      {/* Main Workspace Body */}
      <div className="max-w-6xl mx-auto px-4 mt-8">
        
        {/* Core Safety Callout */}
        <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 mb-8 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-900">
            <strong className="font-semibold block mb-0.5">QWERTY Evidence-Safe Guarantee</strong>
            All suggestions below are strictly grounded in your candidate-approved profile evidence. 
            QWERTY enhances clarity, action verbs, and relevance, but will <em>never</em> invent metrics, employers, certifications, or technologies. 
            Your original approved CV remains 100% immutable and untouched.
          </div>
        </div>

        {activeTab === 'suggestions' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left: Review Suggestions Stream */}
            <div className="lg:col-span-2 space-y-6">
              
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  Proposed Tailoring Changes ({suggestions.length})
                </h3>
                <span className="text-xs text-slate-500">
                  {pendingCount} pending review
                </span>
              </div>

              {suggestions.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">No suggestions required. Your approved CV already aligns closely with this opportunity.</p>
                </div>
              ) : (
                suggestions.map((sug) => {
                  const isBlocked = sug.validation_status === 'blocked' || sug.status === 'blocked';
                  const isAccepted = sug.status === 'accepted';
                  const isRejected = sug.status === 'rejected';
                  const isEditing = editingSugId === sug.suggestion_id;

                  return (
                    <div 
                      key={sug.suggestion_id}
                      className={`bg-white rounded-xl border p-5 transition-all shadow-sm ${
                        isBlocked ? 'border-red-200 bg-red-50/20' :
                        isAccepted ? 'border-emerald-200 bg-emerald-50/10' :
                        isRejected ? 'border-slate-200 opacity-60 bg-slate-50/50' :
                        'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {/* Suggestion Header */}
                      <div className="flex items-center justify-between mb-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="uppercase font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {sug.section}
                          </span>
                          {isBlocked && (
                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> Blocked (Unverified Claim)
                            </span>
                          )}
                          {isAccepted && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Accepted into Draft
                            </span>
                          )}
                          {isRejected && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 font-medium">
                              Rejected (Original Kept)
                            </span>
                          )}
                          {sug.candidate_edited && (
                            <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-medium">
                              Candidate Edited
                            </span>
                          )}
                        </div>

                        {/* Evidence provenance refs */}
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                          Evidence: {sug.source_refs.join(', ')}
                        </div>
                      </div>

                      {/* Original vs Suggested Side-by-Side */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 rounded-lg p-3 text-xs mb-3 border border-slate-100">
                        <div>
                          <div className="font-semibold text-slate-500 mb-1 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Original Wording:
                          </div>
                          <p className="text-slate-700 italic leading-relaxed">
                            "{sug.original_text || '(Empty in original profile)'}"
                          </p>
                        </div>

                        <div>
                          <div className="font-semibold text-[#0B3D2E] mb-1 flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Tailored Suggestion:
                            </span>
                            {!isEditing && (
                              <button
                                onClick={() => startEdit(sug)}
                                className="text-slate-400 hover:text-slate-700 flex items-center gap-1"
                              >
                                <Edit3 className="w-3 h-3" /> Edit
                              </button>
                            )}
                          </div>

                          {isEditing ? (
                            <div className="space-y-2 mt-1">
                              <textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="w-full text-xs p-2 border border-slate-300 rounded bg-white focus:ring-1 focus:ring-[#0B3D2E] focus:outline-none"
                                rows={3}
                              />
                              <div className="flex items-center gap-2 justify-end">
                                <button
                                  onClick={cancelEdit}
                                  className="px-2.5 py-1 text-slate-500 hover:text-slate-800"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => saveEdit(sug.suggestion_id)}
                                  disabled={actionLoading === sug.suggestion_id}
                                  className="px-3 py-1 bg-[#0B3D2E] text-white rounded font-semibold text-xs"
                                >
                                  Save & Validate
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-slate-900 font-medium leading-relaxed">
                              "{sug.suggested_text}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Reason & Issues */}
                      <div className="text-xs mb-4">
                        <div className="text-slate-600 mb-1">
                          <strong className="text-slate-700 font-medium">Why this change?</strong> {sug.reason}
                        </div>

                        {sug.user_note && (
                          <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-amber-900 text-xs mt-2 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <span>{sug.user_note}</span>
                          </div>
                        )}

                        {sug.validation_issues && sug.validation_issues.length > 0 && (
                          <div className="p-2.5 rounded bg-red-50 border border-red-200 text-red-900 text-xs mt-2 space-y-1">
                            {sug.validation_issues.map((issue, idx) => (
                              <div key={idx} className="flex items-start gap-1.5">
                                <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                                <span>{issue}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 justify-end pt-3 border-t border-slate-100">
                        <button
                          onClick={() => handleDecision(sug.suggestion_id, 'reject')}
                          disabled={isRejected || actionLoading === sug.suggestion_id}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                            isRejected 
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>

                        <button
                          onClick={() => handleDecision(sug.suggestion_id, 'accept')}
                          disabled={isAccepted || isBlocked || actionLoading === sug.suggestion_id}
                          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                            isBlocked
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : isAccepted
                              ? 'bg-emerald-100 text-emerald-800 cursor-default'
                              : 'bg-[#0B3D2E] hover:bg-[#155a44] text-white shadow-sm'
                          }`}
                          title={isBlocked ? 'Blocked due to unverified claims' : undefined}
                        >
                          <Check className="w-3.5 h-3.5" /> Accept Suggestion
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right: Plan, Strengths & Unaddressed Criteria */}
            <div className="space-y-6">
              
              {/* Unaddressed Criteria (Requirement 15 & 38) */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Not Found in Approved Profile ({plan?.unaddressed_count ?? plan?.unaddressed_criteria?.length ?? 0})
                </div>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  These role requirements were not found in your approved profile. QWERTY will <strong>never</strong> insert them into your CV automatically.
                </p>

                {(!plan?.unaddressed_criteria || plan.unaddressed_criteria.length === 0) ? (
                  <div className="text-xs text-emerald-700 bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                    All evaluated job criteria are supported by your approved profile evidence.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {plan.unaddressed_criteria.map((gap) => (
                      <div key={gap.id} className="p-3 bg-amber-50/60 rounded-lg border border-amber-200/80 text-xs">
                        <div className="font-semibold text-amber-900 flex items-center justify-between">
                          <span>{gap.criterion || gap.source_text}</span>
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                            {gap.category || gap.type || 'required'}
                          </span>
                        </div>
                        <div className="text-amber-700 text-[11px] mt-1">
                          {gap.reason ? (gap.reason.endsWith('.') ? gap.reason : `${gap.reason}.`) : 'Not found in your approved profile.'}
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5 italic">
                          {gap.guidance}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Supported Strengths Emphasized */}
              {plan?.priority_strengths && plan.priority_strengths.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Target Strengths Emphasized
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {plan.priority_strengths.map((str, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0 mt-1.5"></span>
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Evidence Manifest Inspector */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm text-xs">
                <div className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-slate-500" />
                  Candidate Evidence Layer
                </div>
                <p className="text-slate-500 mb-3">
                  {session.evidence_manifest?.length || 0} discrete factual cards extracted from your approved profile.
                </p>
                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px]">
                  {session.evidence_manifest?.map((card) => (
                    <div key={card.evidence_id} className="p-2 bg-slate-50 rounded border border-slate-100">
                      <span className="font-bold text-[#0B3D2E]">{card.evidence_id}</span> ({card.source_type}): {card.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Tailored CV Preview Document */
          <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12 space-y-8">
            {/* CV Header */}
            <div className="border-b border-slate-200 pb-6">
              <h2 className="text-2xl font-bold text-slate-900">
                {draft?.personal?.full_name || 'Candidate Name'}
              </h2>
              <div className="text-slate-600 text-sm mt-1">
                {draft?.professional?.headline || session.job_title}
              </div>
              <div className="text-xs text-slate-400 mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {draft?.personal?.email && <span>{draft.personal.email}</span>}
                {draft?.personal?.phone && <span>{draft.personal.phone}</span>}
                {draft?.personal?.location && <span>{draft.personal.location}</span>}
              </div>
            </div>

            {/* Professional Summary */}
            {draft?.professional?.summary && (
              <section>
                <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-2">
                  Professional Summary
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {draft.professional.summary}
                </p>
              </section>
            )}

            {/* Skills */}
            {draft?.skills && draft.skills.length > 0 && (
              <section>
                <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-2">
                  Core Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {draft.skills.map((sk, idx) => (
                    <span 
                      key={idx} 
                      className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-md text-xs font-medium"
                    >
                      {sk.name}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Experience */}
            {draft?.experience && draft.experience.length > 0 && (
              <section className="space-y-6">
                <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                  Professional Experience
                </h3>
                {draft.experience.map((exp) => (
                  <div key={exp.id} className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <h4 className="text-sm font-bold text-slate-900">{exp.job_title}</h4>
                      <span className="text-xs text-slate-500">
                        {exp.start_date || ''} {exp.end_date ? `- ${exp.end_date}` : (exp.is_current ? '- Present' : '')}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-slate-600">{exp.employer}</div>
                    <ul className="list-disc list-outside ml-4 space-y-1 text-xs text-slate-700 leading-relaxed">
                      {exp.responsibilities.map((resp, rIdx) => (
                        <li key={rIdx}>{resp}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </section>
            )}

            {/* Certifications */}
            {draft?.certifications && draft.certifications.length > 0 && (
              <section>
                <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-2">
                  Certifications
                </h3>
                <ul className="space-y-1 text-xs text-slate-700">
                  {draft.certifications.map((c, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <Award className="w-3.5 h-3.5 text-amber-600" />
                      <strong>{c.name}</strong> {c.issuer ? `(${c.issuer})` : ''}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Education */}
            {draft?.education && draft.education.length > 0 && (
              <section>
                <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-2">
                  Education
                </h3>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {draft.education.map((edu, idx) => (
                    <li key={idx} className="flex items-center justify-between">
                      <span><strong>{edu.degree}</strong> - {edu.institution}</span>
                      {edu.graduation_year && <span className="text-slate-400">{edu.graduation_year}</span>}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
