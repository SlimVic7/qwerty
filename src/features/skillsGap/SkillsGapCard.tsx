import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  RefreshCw, 
  Compass, 
  FileText, 
  Target, 
  BookOpen, 
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Award,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  skillsGapService, 
  SkillsGapAnalysisResult, 
  SupportedStrengthItem, 
  PartiallyEvidencedItem, 
  NotFoundGapItem 
} from './skillsGap.service.js';

interface SkillsGapCardProps {
  jobId: string;
  jobTitle: string;
  companyName: string;
}

export function SkillsGapCard({ jobId, jobTitle, companyName }: SkillsGapCardProps) {
  const [analysis, setAnalysis] = useState<SkillsGapAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ code?: string; message: string } | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'strengths' | 'partial' | 'gaps'>('all');
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadAnalysis();
  }, [jobId]);

  async function loadAnalysis() {
    setLoading(true);
    setError(null);
    try {
      const data = await skillsGapService.getSkillsGap(jobId);
      setAnalysis(data);
    } catch (err: any) {
      console.warn('[SkillsGapCard] Error fetching skills gap:', err);
      setError({
        code: err.code || 'UNKNOWN_ERROR',
        message: err.message || 'Unable to retrieve skills gap analysis.'
      });
    } finally {
      setLoading(false);
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 text-slate-500 animate-pulse">
          <RefreshCw className="w-5 h-5 animate-spin text-[#0B3D2E]" />
          <span className="text-sm font-medium">Evaluating profile requirements and development insights...</span>
        </div>
      </div>
    );
  }

  // Handle ALIGNMENT_REQUIRED error
  if (error && error.code === 'ALIGNMENT_REQUIRED') {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#0B3D2E]/10 flex items-center justify-center shrink-0 text-[#0B3D2E]">
            <Target className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-slate-900 text-lg">Skills Gap & Development Insights</h3>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded">Deterministic</span>
            </div>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              Discover which requirements are supported by your approved profile, which are partially evidenced, and review honest, realistic steps to develop or document any gaps.
            </p>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 mb-4 flex items-start gap-3">
              <Compass className="w-5 h-5 text-[#0B3D2E] shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-950">
                <span className="font-semibold block mb-0.5">Role Alignment Required First</span>
                Check your Job Alignment first to see your current evidence against this role. Your skills gap insights will generate automatically once alignment is complete.
              </div>
            </div>
            <button
              onClick={() => {
                const el = document.getElementById('job-alignment-card');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth' });
                } else {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="inline-flex items-center gap-2 bg-[#0B3D2E] hover:bg-[#155a44] text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors shadow-sm"
            >
              <Compass className="w-4 h-4" />
              Scroll to Role Alignment
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle APPROVED_PROFILE_REQUIRED error
  if (error && error.code === 'APPROVED_PROFILE_REQUIRED') {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-900 text-lg mb-1">Approved Profile Required</h3>
            <p className="text-sm text-slate-600 mb-4">
              You must have an approved CV profile to view skills gap insights. Please upload and review your CV in your Profile.
            </p>
            <Link
              to="/candidate/profile"
              className="inline-flex items-center gap-2 bg-[#0B3D2E] hover:bg-[#155a44] text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
            >
              Go to Profile Workspace &rarr;
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Generic error fallback
  if (error || !analysis) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-slate-700 text-sm">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            <span>{error?.message || 'Unable to load skills gap insights at this time.'}</span>
          </div>
          <button
            onClick={loadAnalysis}
            className="text-xs text-[#0B3D2E] font-semibold hover:underline flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { summary, supported_strengths, partially_evidenced, not_found_gaps } = analysis;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-[#0B3D2E]" />
              Skills Gap & Development Insights
            </h3>
            <span className="text-xs bg-[#0B3D2E]/10 text-[#0B3D2E] font-semibold px-2 py-0.5 rounded">
              Deterministic v1.0
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Evidence-grounded analysis comparing your approved profile with canonical requirements for {jobTitle}.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          <span>Candidate Private · Evidence-Safe</span>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-emerald-50/70 border border-emerald-100 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-semibold mb-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Supported Strengths
          </div>
          <div className="text-2xl font-bold text-emerald-900">
            {summary.supported_strengths_count}
          </div>
          <p className="text-[11px] text-emerald-700 mt-0.5">Fully substantiated in CV</p>
        </div>

        <div className="bg-blue-50/70 border border-blue-100 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-xs text-blue-800 font-semibold mb-1">
            <HelpCircle className="w-3.5 h-3.5" />
            Partially Evidenced
          </div>
          <div className="text-2xl font-bold text-blue-900">
            {summary.partially_evidenced_count}
          </div>
          <p className="text-[11px] text-blue-700 mt-0.5">Found with partial coverage</p>
        </div>

        <div className="bg-amber-50/70 border border-amber-100 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-xs text-amber-800 font-semibold mb-1">
            <BookOpen className="w-3.5 h-3.5" />
            Areas for Development
          </div>
          <div className="text-2xl font-bold text-amber-900">
            {summary.not_found_count}
          </div>
          <p className="text-[11px] text-amber-700 mt-0.5">Not evidenced in profile</p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            Evidence Coverage
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {summary.coverage_percentage}%
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-[#0B3D2E] h-full rounded-full transition-all duration-500" 
              style={{ width: `${summary.coverage_percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-100 pb-2 text-xs overflow-x-auto">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
            activeFilter === 'all' 
              ? 'bg-[#0B3D2E] text-white' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Requirements ({summary.evaluable_criteria_count})
        </button>
        <button
          onClick={() => setActiveFilter('strengths')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
            activeFilter === 'strengths' 
              ? 'bg-emerald-700 text-white' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Supported Strengths ({summary.supported_strengths_count})
        </button>
        <button
          onClick={() => setActiveFilter('partial')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
            activeFilter === 'partial' 
              ? 'bg-blue-700 text-white' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Partially Evidenced ({summary.partially_evidenced_count})
        </button>
        <button
          onClick={() => setActiveFilter('gaps')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
            activeFilter === 'gaps' 
              ? 'bg-amber-700 text-white' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Development Gaps ({summary.not_found_count})
        </button>
      </div>

      {/* Requirements List */}
      <div className="space-y-3">
        {/* Supported Strengths */}
        {(activeFilter === 'all' || activeFilter === 'strengths') && supported_strengths.map(item => (
          <div 
            key={item.id} 
            className="border border-emerald-100 rounded-lg p-4 bg-emerald-50/20 hover:border-emerald-200 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Supported Strength
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {item.gap_type_label}
                  </span>
                  {item.category && (
                    <span className="text-[11px] font-medium text-slate-400 capitalize">
                      {item.category}
                    </span>
                  )}
                </div>
                <h4 className="font-semibold text-slate-900 text-sm mb-2">{item.criterion}</h4>
                <div className="bg-white border border-emerald-200 rounded p-2.5 text-xs text-emerald-950 flex items-start gap-2">
                  <FileText className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-emerald-900 block mb-0.5">Approved CV Evidence:</span>
                    <p className="italic">"{item.candidate_evidence}"</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Partially Evidenced */}
        {(activeFilter === 'all' || activeFilter === 'partial') && partially_evidenced.map(item => (
          <div 
            key={item.id} 
            className="border border-blue-200 rounded-lg p-4 bg-blue-50/20 hover:border-blue-300 transition-colors"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    <HelpCircle className="w-3.5 h-3.5" />
                    Partially Evidenced
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {item.gap_type_label}
                  </span>
                  {item.category && (
                    <span className="text-[11px] font-medium text-slate-400 capitalize">
                      {item.category}
                    </span>
                  )}
                </div>
                <h4 className="font-semibold text-slate-900 text-sm mb-1">{item.criterion}</h4>
                <p className="text-xs text-blue-900 mb-3">{item.explanation}</p>
                {item.existing_evidence && (
                  <div className="bg-white border border-blue-200 rounded p-2 text-xs text-slate-700 mb-3">
                    <span className="font-semibold text-blue-900 block mb-0.5">Current Profile Mention:</span>
                    <p className="italic">"{item.existing_evidence}"</p>
                  </div>
                )}
              </div>
            </div>

            {/* Next Steps Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-blue-100">
              <div className="bg-white/80 border border-blue-100 rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
                  <FileText className="w-3.5 h-3.5 text-blue-700" />
                  Documentation Next Step
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {item.documentation_step}
                </p>
              </div>

              <div className="bg-white/80 border border-blue-100 rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-[#0B3D2E]" />
                  Capability Next Step
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {item.development_step}
                </p>
              </div>
            </div>
          </div>
        ))}

        {/* Not Found in Approved Profile */}
        {(activeFilter === 'all' || activeFilter === 'gaps') && not_found_gaps.map(item => (
          <div 
            key={item.id} 
            className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 hover:border-slate-300 transition-colors"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                    Not found in approved profile
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
                    {item.gap_type_label}
                  </span>
                  {item.category && (
                    <span className="text-[11px] font-medium text-slate-400 capitalize">
                      {item.category}
                    </span>
                  )}
                </div>
                <h4 className="font-semibold text-slate-900 text-sm mb-1">{item.criterion}</h4>
                <p className="text-xs text-slate-500 mb-3 italic">
                  "Your approved profile does not currently evidence this requirement."
                </p>
              </div>
            </div>

            {/* Actionable Honest Pathways */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200">
              <div className="bg-white border border-slate-200 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
                  <FileText className="w-3.5 h-3.5 text-slate-600" />
                  If You Have This Experience
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-2">
                  {item.documentation_step}
                </p>
                <Link
                  to="/candidate/profile"
                  className="inline-flex items-center gap-1 text-xs text-[#0B3D2E] font-semibold hover:underline"
                >
                  Update profile &rarr;
                </Link>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
                  <BookOpen className="w-3.5 h-3.5 text-[#0B3D2E]" />
                  To Develop This Capability
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {item.development_step}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Guidance & Disclaimers */}
      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          <span>Factual Grounding: Absence of evidence in your CV is not proof that you lack the capability.</span>
        </div>
        <p className="italic">Ruleset: {analysis.ruleset_version}</p>
      </div>
    </div>
  );
}
