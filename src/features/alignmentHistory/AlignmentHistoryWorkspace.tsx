'use client';

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  History,
  ArrowLeft,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  TrendingUp,
  Layers,
  ArrowRight,
  Filter,
  Info,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  getAlignmentHistory,
  compareAlignments,
  AlignmentHistoryResponse,
  AlignmentComparisonResponse,
  AlignmentHistoryItem
} from './alignmentHistory.service.js';

export function AlignmentHistoryWorkspace() {
  const { jobId } = useParams<{ jobId: string }>();
  const [historyData, setHistoryData] = useState<AlignmentHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Comparison selection
  const [fromId, setFromId] = useState<string>('');
  const [toId, setToId] = useState<string>('');
  const [comparison, setComparison] = useState<AlignmentComparisonResponse | null>(null);
  const [comparing, setComparing] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);

  // Filter for criteria transition
  const [filterType, setFilterType] = useState<string>('all');
  const [showAllTimeline, setShowAllTimeline] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!jobId) return;
      setLoading(true);
      setError(null);
      try {
        const data = await getAlignmentHistory(jobId);
        setHistoryData(data);

        // Auto-select comparison: Current (or latest) vs Prior
        if (data.history.length >= 2) {
          const currentOrLatest = data.current_alignment_id
            ? data.history.find(h => h.alignment_id === data.current_alignment_id) || data.history[0]
            : data.history[0];

          const prior = data.history.find(h => h.alignment_id !== currentOrLatest.alignment_id) || data.history[1];

          // Set "From" = prior (older baseline), "To" = current/latest (newer target)
          setFromId(prior.alignment_id);
          setToId(currentOrLatest.alignment_id);
        } else if (data.history.length === 1) {
          setToId(data.history[0].alignment_id);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load alignment history.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [jobId]);

  // Run comparison when fromId and toId change
  useEffect(() => {
    async function runComparison() {
      if (!jobId || !fromId || !toId) return;
      setComparing(true);
      setComparisonError(null);
      try {
        const comp = await compareAlignments(jobId, fromId, toId);
        setComparison(comp);
      } catch (err: any) {
        setComparisonError(err.message || 'Failed to generate alignment comparison.');
        setComparison(null);
      } finally {
        setComparing(false);
      }
    }

    if (fromId && toId) {
      runComparison();
    }
  }, [jobId, fromId, toId]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 flex flex-col items-center justify-center text-slate-500">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B3D2E] mb-4"></div>
        <p className="text-sm font-medium">Loading alignment history & snapshots...</p>
      </div>
    );
  }

  if (error || !historyData) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl border border-red-200 p-8 text-center shadow-sm">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Unable to Load History</h2>
          <p className="text-slate-600 text-sm mb-6">{error || 'Job alignment history could not be retrieved.'}</p>
          <Link
            to="/jobs"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0B3D2E] hover:bg-[#155a44] text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Jobs
          </Link>
        </div>
      </div>
    );
  }

  const { history } = historyData;
  const currentAlignment = history.find(h => h.is_current);

  const filteredCriteria = comparison?.criteria_comparisons.filter(c => {
    if (filterType === 'all') return true;
    if (filterType === 'newly_supported') return c.transition === 'NEWLY_SUPPORTED';
    if (filterType === 'strengthened') return c.transition === 'STRENGTHENED';
    if (filterType === 'weakened') return c.transition === 'WEAKENED' || c.transition === 'NO_LONGER_EVIDENCED';
    if (filterType === 'added_removed') return c.transition === 'ADDED_REQUIREMENT' || c.transition === 'REMOVED_REQUIREMENT';
    if (filterType === 'unchanged') return c.transition.startsWith('UNCHANGED');
    return true;
  }) || [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* 1. Header & Role Context */}
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
          <Link to="/jobs" className="hover:text-[#0B3D2E] transition-colors flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Back to Jobs
          </Link>
          <span>/</span>
          <span>Role Alignment History</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-2">
              <History className="w-3.5 h-3.5" />
              Stage 5.4 · Alignment History & Comparison
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              {historyData.job_title}
            </h1>
            <p className="text-slate-600 font-medium text-sm mt-1">
              {historyData.company_name}
            </p>
          </div>

          <div className="text-right flex flex-col items-start md:items-end justify-center border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Recorded Analyses</span>
            <span className="text-2xl font-black text-slate-900">{history.length}</span>
            <span className="text-xs text-slate-400">Deterministic snapshots</span>
          </div>
        </div>
      </div>

      {/* Empty State: 0 or 1 Analysis */}
      {history.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <History className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No Alignment History Yet</h3>
          <p className="text-slate-600 text-sm max-w-md mx-auto mb-6">
            You have not run an alignment analysis for this job yet. Visit the job detail page and check your alignment to begin.
          </p>
        </div>
      ) : history.length === 1 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-sm">
          <div className="w-12 h-12 bg-emerald-50 text-[#0B3D2E] rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Single Alignment Analysis Recorded</h3>
          <p className="text-slate-600 text-sm max-w-md mx-auto mb-4">
            This is your first alignment analysis for this role. When you update your profile or when the employer updates the job requirements, future analyses can be compared here.
          </p>
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700">
            <span>Score: <strong className="text-slate-900">{history[0].score}%</strong></span>
            <span>·</span>
            <span>Ruleset: <strong>{history[0].ruleset_version}</strong></span>
            <span>·</span>
            <span>Date: <strong>{formatDate(history[0].created_at)}</strong></span>
          </div>
        </div>
      ) : (
        <>
          {/* 2. Current Alignment Summary Box */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-[#0B3D2E] to-[#155a44] text-white p-5 rounded-xl shadow-sm flex flex-col justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-emerald-200 font-semibold mb-1">
                  Current Alignment
                </div>
                <div className="text-3xl font-black">
                  {currentAlignment ? `${currentAlignment.score}%` : 'Not Current'}
                </div>
              </div>
              <div className="text-xs text-emerald-100 mt-4 space-y-1">
                <div>Ruleset: <span className="font-semibold text-white">{currentAlignment?.ruleset_version || 'None current'}</span></div>
                <div>Status: <span className="font-semibold text-white">{currentAlignment ? 'Matches active sources' : 'Action needed'}</span></div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">
                  Active Candidate Profile
                </div>
                <div className="text-sm font-bold text-slate-900 truncate">
                  {historyData.current_applied_at ? formatDate(historyData.current_applied_at) : 'No approved profile'}
                </div>
              </div>
              <div className="text-xs text-slate-500 mt-4">
                Parse snapshot applied to current matching evaluations.
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">
                  Active Job Advertisement
                </div>
                <div className="text-sm font-bold text-slate-900 truncate">
                  {formatDate(historyData.current_job_updated_at)}
                </div>
              </div>
              <div className="text-xs text-slate-500 mt-4">
                Latest modification timestamp for this role advert.
              </div>
            </div>
          </div>

          {/* 3. Alignment History Timeline */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                Historical Analysis Timeline ({history.length})
              </h3>
              {history.length > 3 && (
                <button
                  onClick={() => setShowAllTimeline(!showAllTimeline)}
                  className="text-xs text-[#0B3D2E] hover:underline flex items-center gap-1 font-medium"
                >
                  {showAllTimeline ? 'Show Less' : `Show All ${history.length}`}
                  {showAllTimeline ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-100">
              {(showAllTimeline ? history : history.slice(0, 3)).map((item) => (
                <div key={item.alignment_id} className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-sm shrink-0 border border-slate-200">
                      {item.score}%
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900 text-sm">
                          {formatDateTime(item.created_at)}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-mono border border-slate-200">
                          {item.ruleset_version}
                        </span>
                        {item.is_current ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold">
                            Current
                          </span>
                        ) : (
                          item.stale_labels.map((lbl, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded-full text-xs font-medium border border-amber-200">
                              {lbl}
                            </span>
                          ))
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                        <span>Profile snapshot: {formatDate(item.candidate_applied_at)}</span>
                        <span>·</span>
                        <span>Criteria: {item.matched_count} supported, {item.partially_supported_count} partial, {item.not_found_count} not evidenced</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setFromId(item.alignment_id)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded border transition-colors ${
                        fromId === item.alignment_id
                          ? 'bg-[#0B3D2E] text-white border-[#0B3D2E]'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {fromId === item.alignment_id ? 'Baseline (From)' : 'Set as From'}
                    </button>
                    <button
                      onClick={() => setToId(item.alignment_id)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded border transition-colors ${
                        toId === item.alignment_id
                          ? 'bg-[#0B3D2E] text-white border-[#0B3D2E]'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {toId === item.alignment_id ? 'Target (To)' : 'Set as To'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Compare Analyses Controls & Context */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#0B3D2E]" />
                Compare Alignment Snapshots
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Select an earlier baseline snapshot (From) and a newer comparison snapshot (To) to analyze shifts in requirements or evidence.
              </p>
            </div>

            {/* Selection Dropdowns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Baseline Analysis (From)
                </label>
                <select
                  value={fromId}
                  onChange={(e) => setFromId(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B3D2E]"
                >
                  {history.map((h) => (
                    <option key={h.alignment_id} value={h.alignment_id}>
                      {formatDateTime(h.created_at)} — {h.score}% ({h.ruleset_version}) {h.is_current ? '★ Current' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Target Analysis (To)
                </label>
                <select
                  value={toId}
                  onChange={(e) => setToId(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B3D2E]"
                >
                  {history.map((h) => (
                    <option key={h.alignment_id} value={h.alignment_id}>
                      {formatDateTime(h.created_at)} — {h.score}% ({h.ruleset_version}) {h.is_current ? '★ Current' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {comparing && (
              <div className="py-8 flex flex-col items-center justify-center text-slate-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0B3D2E] mb-2"></div>
                <p className="text-xs font-medium">Assembling snapshot delta...</p>
              </div>
            )}

            {comparisonError && (
              <div className="p-4 bg-red-50 text-red-700 rounded-lg text-xs border border-red-200">
                {comparisonError}
              </div>
            )}

            {comparison && !comparing && (
              <div className="space-y-6 pt-2">
                {/* 5. Comparison Context Banner */}
                <div className={`p-4 rounded-xl border ${
                  comparison.directly_comparable
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : comparison.result_variance_detected
                    ? 'bg-red-50 border-red-200'
                    : 'bg-amber-50/70 border-amber-200'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {comparison.directly_comparable ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                      ) : (
                        <Info className="w-5 h-5 text-amber-700" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900">
                          {comparison.comparison_headline}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          comparison.directly_comparable
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {comparison.comparison_type}
                        </span>
                        {comparison.directly_comparable && (
                          <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded text-xs font-semibold">
                            Direct Candidate Progress
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                        {comparison.comparison_explanation}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 6. Score Comparison */}
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Alignment Evidence Score Delta
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-black text-slate-700">
                          {comparison.score_comparison.from_score}%
                        </span>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                        <span className="text-3xl font-black text-slate-900">
                          {comparison.score_comparison.to_score}%
                        </span>
                        <span className={`px-2.5 py-1 rounded-md text-sm font-bold ${
                          comparison.score_comparison.display_type === 'PROGRESS_DELTA'
                            ? comparison.score_comparison.score_delta > 0
                              ? 'bg-emerald-100 text-emerald-800'
                              : comparison.score_comparison.score_delta < 0
                              ? 'bg-red-100 text-red-800'
                              : 'bg-slate-200 text-slate-700'
                            : 'bg-slate-200 text-slate-800'
                        }`}>
                          {comparison.score_comparison.delta_label}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 max-w-sm sm:text-right">
                      {comparison.score_comparison.message}
                    </div>
                  </div>
                </div>

                {/* 7. Criterion Transitions Breakdown */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h4 className="font-bold text-slate-900 text-base">
                      Criterion-Level Transitions ({comparison.criteria_comparisons.length})
                    </h4>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => setFilterType('all')}
                        className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                          filterType === 'all'
                            ? 'bg-[#0B3D2E] text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        All ({comparison.criteria_comparisons.length})
                      </button>
                      <button
                        onClick={() => setFilterType('newly_supported')}
                        className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                          filterType === 'newly_supported'
                            ? 'bg-emerald-700 text-white'
                            : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                        }`}
                      >
                        Newly Supported ({comparison.summary_counts.newly_supported})
                      </button>
                      <button
                        onClick={() => setFilterType('strengthened')}
                        className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                          filterType === 'strengthened'
                            ? 'bg-emerald-700 text-white'
                            : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                        }`}
                      >
                        Strengthened ({comparison.summary_counts.strengthened})
                      </button>
                      <button
                        onClick={() => setFilterType('weakened')}
                        className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                          filterType === 'weakened'
                            ? 'bg-amber-700 text-white'
                            : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                        }`}
                      >
                        Reduced ({comparison.summary_counts.weakened + comparison.summary_counts.no_longer_evidenced})
                      </button>
                      <button
                        onClick={() => setFilterType('unchanged')}
                        className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                          filterType === 'unchanged'
                            ? 'bg-slate-700 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Unchanged ({comparison.summary_counts.unchanged_supported + comparison.summary_counts.unchanged_partial + comparison.summary_counts.unchanged_not_found})
                      </button>
                    </div>
                  </div>

                  {/* Transition Items List */}
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {filteredCriteria.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-xs">
                        No criteria match the selected filter.
                      </div>
                    ) : (
                      filteredCriteria.map((item, idx) => (
                        <div key={idx} className="p-4 bg-white hover:bg-slate-50/50 transition-colors">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1.5 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                  item.transition === 'NEWLY_SUPPORTED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : item.transition === 'STRENGTHENED'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : item.transition === 'WEAKENED' || item.transition === 'NO_LONGER_EVIDENCED'
                                    ? 'bg-red-50 text-red-800 border border-red-200'
                                    : item.transition === 'METHODOLOGY_CHANGED'
                                    ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                                    : item.transition.startsWith('UNCHANGED')
                                    ? 'bg-slate-100 text-slate-700'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                                }`}>
                                  {item.transition_label}
                                </span>

                                <span className="text-xs text-slate-400 font-mono">
                                  {item.from_status || 'not evaluated'} → {item.to_status || 'not evaluated'}
                                </span>
                              </div>

                              <p className="text-sm font-medium text-slate-900 leading-snug">
                                {item.criterion_text}
                              </p>

                              <p className="text-xs text-slate-600">
                                {item.explanation}
                              </p>

                              {item.to_evidence && (
                                <div className="mt-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-slate-700">
                                  <span className="font-semibold text-slate-900">Current Evidence:</span> {item.to_evidence}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 8. Important Interpretation Notice */}
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 text-xs text-slate-600 leading-relaxed flex items-start gap-3">
            <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900 block mb-1">
                Important Interpretation Notice
              </span>
              {historyData.interpretation_notice}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
