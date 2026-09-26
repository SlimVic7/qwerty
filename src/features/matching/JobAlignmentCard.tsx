import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  RefreshCw, 
  Sparkles, 
  ShieldCheck, 
  FileText, 
  Lightbulb, 
  Compass,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Award
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  jobAlignmentService, 
  CandidateJobAlignment, 
  AlignmentCriterion, 
  AlignmentComponent 
} from './jobAlignment.service.js';

interface JobAlignmentCardProps {
  jobId: string;
  jobTitle: string;
  companyName: string;
}

export function JobAlignmentCard({ jobId, jobTitle, companyName }: JobAlignmentCardProps) {
  const [alignment, setAlignment] = useState<CandidateJobAlignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'criteria' | 'prep'>('overview');
  const [filterCategory, setFilterCategory] = useState<'all' | 'required' | 'preferred' | 'experience'>('all');

  useEffect(() => {
    loadAlignment();
  }, [jobId]);

  async function loadAlignment() {
    setLoading(true);
    setError(null);
    try {
      const data = await jobAlignmentService.getJobAlignment(jobId);
      setAlignment(data);
    } catch (err: any) {
      // 404 is handled gracefully as null
      console.error('Failed loading alignment:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    setError(null);
    try {
      const result = await jobAlignmentService.createJobAlignment(jobId);
      setAlignment(result);
      setActiveTab('overview');
    } catch (err: any) {
      if (err?.message?.includes('NO_APPROVED_CV') || err?.error === 'NO_APPROVED_CV') {
        setError('You need an approved CV profile to check alignment. Please upload and approve your CV in your Profile workspace.');
      } else {
        setError(err.message || 'Unable to complete role alignment analysis. Please try again.');
      }
    } finally {
      setAnalyzing(false);
    }
  }

  const getBandBadge = (score: number) => {
    if (score >= 75) {
      return {
        label: 'Strong Alignment',
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        ring: 'text-emerald-600'
      };
    }
    if (score >= 50) {
      return {
        label: 'Moderate Alignment',
        bg: 'bg-blue-50 text-blue-800 border-blue-200',
        ring: 'text-blue-600'
      };
    }
    return {
      label: 'Emerging Alignment',
      bg: 'bg-amber-50 text-amber-800 border-amber-200',
      ring: 'text-amber-600'
    };
  };

  const renderCriterionStatus = (status: string) => {
    switch (status) {
      case 'matched':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Matched
          </span>
        );
      case 'partially_supported':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
            <HelpCircle className="w-3.5 h-3.5" />
            Partially Supported
          </span>
        );
      case 'not_applicable':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            Not Applicable
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
            <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
            Not found in profile
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 text-slate-500 animate-pulse">
          <RefreshCw className="w-5 h-5 animate-spin text-[#0B3D2E]" />
          <span className="text-sm font-medium">Checking profile alignment...</span>
        </div>
      </div>
    );
  }

  // Not analyzed yet
  if (!alignment && !analyzing) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#0B3D2E]/10 flex items-center justify-center shrink-0 text-[#0B3D2E]">
            <Compass className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-slate-900 text-lg">Check Role Alignment</h3>
              <span className="text-xs bg-[#0B3D2E]/10 text-[#0B3D2E] font-semibold px-2 py-0.5 rounded">Candidate Private</span>
            </div>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              Compare your approved QWERTY CV profile against the specific requirements and qualifications for this role.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p>{error}</p>
                  {error.includes('Profile') && (
                    <Link to="/candidate/profile" className="mt-1 inline-block font-semibold underline hover:text-red-900">
                      Go to Profile Workspace &rarr;
                    </Link>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="inline-flex items-center gap-2 bg-[#0B3D2E] hover:bg-[#155a44] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              Analyze Alignment
            </button>

            <p className="mt-3 text-xs text-slate-400">
              Deterministic, evidence-grounded analysis. Never visible to recruiters.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Analyzing state
  if (analyzing) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm text-center">
        <div className="w-12 h-12 rounded-full bg-[#0B3D2E]/10 flex items-center justify-center mx-auto mb-4 text-[#0B3D2E]">
          <RefreshCw className="w-6 h-6 animate-spin" />
        </div>
        <h4 className="font-bold text-slate-900 mb-1">Analyzing Role Alignment</h4>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          Comparing requirements with your approved profile evidence and generating tailored advisory insights...
        </p>
      </div>
    );
  }

  if (!alignment) return null;

  if (alignment.status === 'failed' || alignment.error_code === 'NO_EVALUABLE_CRITERIA') {
    return (
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-200/80 flex items-center justify-center shrink-0 text-slate-500">
            <Compass className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-slate-900 text-lg">Alignment Unavailable</h3>
              <span className="text-xs bg-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded">Unscored</span>
            </div>
            <p className="text-sm text-slate-700 mb-3 leading-relaxed">
              This job advert does not contain enough specific requirements to calculate a reliable alignment.
            </p>
            <p className="text-xs text-slate-500">
              No score was deducted from your profile. When job adverts omit evaluable criteria, role alignment is safely withheld rather than penalized.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const band = getBandBadge(alignment.score ?? 0);
  const criteria = alignment.criteria_breakdown || [];
  const components = alignment.component_results || [];
  const explanation = alignment.explanation;

  const filteredCriteria = criteria.filter(c => {
    if (filterCategory === 'all') return true;
    return c.category === filterCategory;
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex flex-col items-center justify-center font-bold shrink-0 shadow-sm">
              <span className="text-xl leading-none">{alignment.score ?? 0}%</span>
              <span className="text-[10px] text-slate-400 font-normal">Match</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">Profile-to-Job Alignment</h3>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${band.bg}`}>
                  {band.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluated against approved CV &bull; Rule version: {alignment.ruleset_version || 'v1'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Re-analyze
            </button>
          </div>
        </div>

        {/* Source Drift Notice */}
        {alignment.is_stale && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{alignment.stale_reason || 'Job advert or profile details have changed since this analysis.'}</span>
            </div>
            <button
              onClick={handleAnalyze}
              className="font-semibold underline hover:text-amber-900 shrink-0"
            >
              Update Now
            </button>
          </div>
        )}

        {/* Mandatory Disclaimer */}
        <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <p>
            <strong>Disclaimer:</strong> This analysis compares information in your approved QWERTY profile with requirements stated in the job advert. It is not a hiring prediction or recruiter decision.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-[#0B3D2E] text-[#0B3D2E]'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Insights & Advice
        </button>
        <button
          onClick={() => setActiveTab('criteria')}
          className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'criteria'
              ? 'border-[#0B3D2E] text-[#0B3D2E]'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Criteria Evidence ({criteria.length})
        </button>
        <button
          onClick={() => setActiveTab('prep')}
          className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'prep'
              ? 'border-[#0B3D2E] text-[#0B3D2E]'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Interview Prep
        </button>
      </div>

      {/* Tab Contents */}
      <div className="p-6">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Component Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {components.map(comp => (
                <div key={comp.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                  <div className="text-xs text-slate-500 font-medium truncate mb-1">{comp.label}</div>
                  <div className="flex items-baseline gap-1.5">
                    {comp.applicable ? (
                      <>
                        <span className="text-base font-bold text-slate-900">{comp.score}</span>
                        <span className="text-xs text-slate-400">/ {comp.max_score} pts</span>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium italic">N/A for role</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 line-clamp-1">{comp.summary}</div>
                </div>
              ))}
            </div>

            {/* AI Advisory Summary */}
            {explanation && (
              <div className="space-y-4">
                <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                    Advisory Summary
                  </h4>
                  <p className="text-sm text-emerald-950 leading-relaxed">
                    {explanation.summary}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Strengths */}
                  <div className="border border-slate-200 rounded-xl p-4">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Key Alignment Areas
                    </h5>
                    <ul className="space-y-2 text-xs text-slate-700">
                      {explanation.strengths.map((str, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                          <span>{str}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Profile Gaps */}
                  <div className="border border-slate-200 rounded-xl p-4">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-slate-400" />
                      Not Found in Profile
                    </h5>
                    <ul className="space-y-2 text-xs text-slate-700">
                      {explanation.gaps.map((gap, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                          <span>{gap}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Practical Recommendations */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2 flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    Practical Recommendations
                  </h5>
                  <ul className="space-y-2 text-xs text-slate-700">
                    {explanation.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-[#0B3D2E] font-bold">&bull;</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CRITERIA EVIDENCE TAB */}
        {activeTab === 'criteria' && (
          <div className="space-y-4">
            {/* Filter Pills */}
            <div className="flex flex-wrap gap-2 pb-2">
              <button
                onClick={() => setFilterCategory('all')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filterCategory === 'all'
                    ? 'bg-[#0B3D2E] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Criteria ({criteria.length})
              </button>
              <button
                onClick={() => setFilterCategory('required')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filterCategory === 'required'
                    ? 'bg-[#0B3D2E] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Required Qualifications ({criteria.filter(c => c.category === 'required').length})
              </button>
              <button
                onClick={() => setFilterCategory('preferred')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filterCategory === 'preferred'
                    ? 'bg-[#0B3D2E] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Preferred Qualifications ({criteria.filter(c => c.category === 'preferred').length})
              </button>
              <button
                onClick={() => setFilterCategory('experience')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filterCategory === 'experience'
                    ? 'bg-[#0B3D2E] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Experience Level ({criteria.filter(c => c.category === 'experience').length})
              </button>
            </div>

            {/* Criteria List */}
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {filteredCriteria.map(item => (
                <div key={item.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-400 capitalize">
                        [{item.category}]
                      </span>
                      <span className="text-sm font-bold text-slate-900">{item.criterion}</span>
                    </div>
                    <div>{renderCriterionStatus(item.status)}</div>
                  </div>

                  {item.candidate_evidence ? (
                    <div className="mt-2 bg-emerald-50/40 border border-emerald-100/80 rounded-lg p-3 text-xs">
                      <div className="font-semibold text-emerald-900 mb-0.5 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-emerald-700" />
                        Approved Profile Evidence ({item.candidate_source}):
                      </div>
                      <p className="text-emerald-950 italic">"{item.candidate_evidence}"</p>
                    </div>
                  ) : (
                    <div className="mt-1 text-xs text-slate-500">
                      {item.explanation}
                    </div>
                  )}
                </div>
              ))}
              {filteredCriteria.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-500">
                  No criteria in this category.
                </div>
              )}
            </div>
          </div>
        )}

        {/* INTERVIEW PREP TAB */}
        {activeTab === 'prep' && (
          <div className="space-y-4">
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-[#0B3D2E]" />
                Suggested Interview Discussion Topics
              </h4>
              {explanation?.suggested_interview_prep && explanation.suggested_interview_prep.length > 0 ? (
                <div className="space-y-3">
                  {explanation.suggested_interview_prep.map((topic, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-lg p-3 text-xs text-slate-800 flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#0B3D2E]/10 text-[#0B3D2E] font-bold flex items-center justify-center shrink-0 text-[11px]">
                        {idx + 1}
                      </span>
                      <p className="leading-relaxed mt-0.5">{topic}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Be prepared to discuss your direct experience with each required technical skill and the operational responsibilities listed in the role.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
