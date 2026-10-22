/**
 * QWERTY Stage 7.5 — Personalized Development Roadmap View
 * Candidate-private explainable skill development plan.
 *
 * EVIDENCE-SAFE LANGUAGE ONLY:
 * - "EVIDENCE FOUND"
 * - "DEVELOPMENT FOCUS"
 * - "REVIEW NEEDED"
 * - "NOW", "NEXT", "LATER", "MAINTAIN"
 *
 * ZERO-AI GUARANTEE:
 * - Deterministic matching against candidate-owned evidence
 * - No arbitrary 0-100 readiness scores
 * - Explicit disclaimer that this is educational planning, not certification or hiring assessment.
 */

import React, { useState } from 'react';
import {
  CandidateDevelopmentPlan,
  CandidateDevelopmentPlanItem,
  CandidatePlanSummaryCounts,
  PlanPriority,
  careerService
} from './career.service.js';
import {
  Compass,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  BookOpen,
  GraduationCap,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Clock,
  ArrowRight,
  ShieldAlert,
  Info
} from 'lucide-react';

interface Props {
  roleSlug: string;
  roleTitle: string;
  plan: CandidateDevelopmentPlan | null;
  summaryCounts?: CandidatePlanSummaryCounts;
  isStale?: boolean;
  featureEnabled: boolean;
  onPlanUpdated: (newPlan: CandidateDevelopmentPlan, counts: CandidatePlanSummaryCounts) => void;
}

export const PersonalizedDevelopmentPlanView: React.FC<Props> = ({
  roleSlug,
  roleTitle,
  plan,
  summaryCounts,
  isStale,
  featureEnabled,
  onPlanUpdated
}) => {
  const [activePriority, setActivePriority] = useState<PlanPriority | 'all'>('all');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // If feature flag is disabled, show Coming Soon banner
  if (!featureEnabled) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4">
        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
          <Compass className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">
          Personalized Development Roadmap — Coming Soon
        </h3>
        <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
          The Personalized Development Roadmap matches your existing profile and CV evidence
          against the published skill benchmarks for {roleTitle} to build an explainable,
          evidence-backed development plan. This feature is currently in controlled preview.
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-medium rounded-full">
          <Clock className="w-3.5 h-3.5" />
          Preview Access Required
        </div>
      </div>
    );
  }

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const res = await careerService.generatePersonalizedDevelopmentPlan(roleSlug);
      if (res.plan && res.summary_counts) {
        onPlanUpdated(res.plan, res.summary_counts);
        setExpandedItemId(res.plan.items?.[0]?.id || null);
      }
    } catch (err: any) {
      console.error('Failed to generate personalized development plan:', err);
      setGenerateError(err?.message || 'Unable to generate personalized roadmap.');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedItemId(current => (current === id ? null : id));
  };

  const items = plan?.items || [];
  const filteredItems = activePriority === 'all'
    ? items
    : items.filter(i => i.priority === activePriority);

  return (
    <div className="space-y-6">
      {/* Educational Governance Disclaimer */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3 text-xs text-slate-600">
        <Info className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p>
            This roadmap is based only on the career evidence currently available in your QWERTY profile and approved CV data. Evidence not found here does not mean you do not have the skill.
          </p>
        </div>
      </div>

      {/* Stale Evidence Alert */}
      {plan && isStale && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <span className="font-medium">Your career evidence has changed since this roadmap was created.</span>
          </div>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition shadow-xs"
          >
            Refresh Roadmap
          </button>
        </div>
      )}

      {/* Header & Generation Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Personalized Development Roadmap</h2>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
              Ruleset v1
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Targeting: <span className="font-medium text-slate-800">{roleTitle}</span>
            {plan?.created_at && (
              <span className="text-slate-400 text-xs ml-2">
                • Updated {new Date(plan.created_at).toLocaleDateString()}
              </span>
            )}
          </p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50 shadow-sm cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
          {plan ? 'Refresh Roadmap' : 'Create My Development Roadmap'}
        </button>
      </div>

      {generateError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          {generateError}
        </div>
      )}

      {/* Summary Metrics */}
      {summaryCounts && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Focus Now</div>
            <div className="text-2xl font-bold text-rose-600 mt-1">{summaryCounts.priority_now}</div>
            <div className="text-xs text-slate-500 mt-0.5">Foundational focus</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Next</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">{summaryCounts.priority_next}</div>
            <div className="text-xs text-slate-500 mt-0.5">Core & review needed</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Later</div>
            <div className="text-2xl font-bold text-sky-600 mt-1">{summaryCounts.priority_later}</div>
            <div className="text-xs text-slate-500 mt-0.5">Advanced focus</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Evidence Found / Maintain</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{summaryCounts.evidence_found}</div>
            <div className="text-xs text-slate-500 mt-0.5">Supported in CV / profile</div>
          </div>
        </div>
      )}

      {/* Priority Filter Navigation */}
      {plan && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">Band:</span>
          {[
            { id: 'all', label: 'All Skills', count: items.length },
            { id: 'now', label: 'Focus Now', count: summaryCounts?.priority_now },
            { id: 'next', label: 'Next', count: summaryCounts?.priority_next },
            { id: 'later', label: 'Later', count: summaryCounts?.priority_later },
            { id: 'maintain', label: 'Evidence Found / Maintain', count: summaryCounts?.priority_maintain },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActivePriority(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                activePriority === tab.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activePriority === tab.id ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Roadmap Items List */}
      {!plan ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
            <Compass className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No Development Plan Generated Yet</h3>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Compare your uploaded CV and profile evidence against the published skill benchmarks for {roleTitle}.
          </p>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition shadow-sm cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            Create My Development Roadmap
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">
          No skills found under the selected priority band.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map(item => {
            const isExpanded = expandedItemId === item.id;
            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden transition shadow-xs hover:border-slate-300"
              >
                {/* Item Header */}
                <div
                  onClick={() => toggleExpand(item.id)}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {item.classification === 'evidence_found' && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      )}
                      {item.classification === 'development_focus' && (
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                      )}
                      {item.classification === 'review_needed' && (
                        <HelpCircle className="w-5 h-5 text-blue-500" />
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900 text-base">{item.skill_name}</span>
                        <span className="text-xs uppercase font-medium tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {item.stage}
                        </span>
                        {item.skill_category && (
                          <span className="text-xs text-slate-500">({item.skill_category})</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-1">{item.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {/* Classification Badge */}
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        item.classification === 'evidence_found'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : item.classification === 'development_focus'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {item.classification === 'evidence_found' && 'Evidence Found'}
                      {item.classification === 'development_focus' && 'Development Focus'}
                      {item.classification === 'review_needed' && 'Review Needed'}
                    </span>

                    {/* Priority Badge */}
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wider ${
                        item.priority === 'now'
                          ? 'bg-rose-100 text-rose-800'
                          : item.priority === 'next'
                          ? 'bg-amber-100 text-amber-800'
                          : item.priority === 'later'
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {item.priority}
                    </span>

                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-5 pb-6 pt-2 border-t border-slate-100 space-y-5 bg-slate-50/50">
                    {/* Evidence Explanation */}
                    <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        Evidence Analysis
                      </div>
                      {item.classification === 'evidence_found' ? (
                        <div className="space-y-1.5">
                          <p className="text-xs text-slate-700">
                            Candidate data contains explicit evidence related to this skill:
                          </p>
                          <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1">
                            {item.evidence_refs.map((ref, idx) => (
                              <li key={idx}>
                                <span className="font-medium text-slate-800">[{ref.source}]</span> {ref.snippet}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : item.classification === 'review_needed' ? (
                        <div className="space-y-1.5">
                          <p className="text-xs text-slate-700">
                            Available evidence is ambiguous or insufficient for deterministic classification:
                          </p>
                          <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1">
                            {item.evidence_refs.map((ref, idx) => (
                              <li key={idx}>
                                <span className="font-medium text-slate-800">[{ref.source}]</span> {ref.snippet}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-600 leading-relaxed">
                          We did not find sufficient evidence for this skill in the information currently available to QWERTY.
                        </p>
                      )}
                    </div>

                    {/* Competency & Context */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      {item.why_it_matters && (
                        <div className="bg-white p-3.5 rounded-lg border border-slate-200">
                          <div className="font-bold text-slate-800 mb-1">Why It Matters</div>
                          <p className="text-slate-600 leading-relaxed">{item.why_it_matters}</p>
                        </div>
                      )}
                      {item.competency_outcome && (
                        <div className="bg-white p-3.5 rounded-lg border border-slate-200">
                          <div className="font-bold text-slate-800 mb-1">Target Competency Outcome</div>
                          <p className="text-slate-600 leading-relaxed">{item.competency_outcome}</p>
                        </div>
                      )}
                    </div>

                    {/* Stage 7.3 Learning Resources */}
                    {item.resources && item.resources.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                          Curated Learning Resources ({item.resources.length})
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {item.resources.map(res => (
                            <a
                              key={res.id}
                              href={res.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-white p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:shadow-xs transition block group"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-900 group-hover:text-indigo-600">
                                  {res.title}
                                </span>
                                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-slate-500">{res.provider_name}</span>
                                <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                                  {res.access_type === 'free' ? 'Free' : 'Free Account'}
                                </span>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Stage 7.4 Curated Course Recommendations */}
                    {item.courses && item.courses.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                          Recommended Courses ({item.courses.length})
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {item.courses.map(course => (
                            <a
                              key={course.id}
                              href={course.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-white p-3.5 rounded-lg border border-slate-200 hover:border-emerald-300 hover:shadow-xs transition block group"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-900 group-hover:text-emerald-700">
                                  {course.title}
                                </span>
                                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 shrink-0" />
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-slate-500">{course.provider_name}</span>
                                <span className="text-[10px] px-1.5 py-0.2 bg-emerald-50 text-emerald-700 rounded font-medium">
                                  {course.access_type === 'free' ? 'Free Course' : 'Free Account Required'}
                                </span>
                              </div>
                              {course.why_this_course && (
                                <p className="text-[11px] text-slate-600 mt-1.5 line-clamp-2">
                                  {course.why_this_course}
                                </p>
                              )}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
