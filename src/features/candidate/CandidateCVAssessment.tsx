import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface ComponentResult {
  id: string;
  score: number;
  max_score: number;
  status: 'pass' | 'fail' | 'warn' | 'not_evaluated';
  reason: string;
}

interface Assessment {
  id: string;
  status: string;
  recommendation_status: string;
  score: number | null;
  max_score: number | null;
  component_results: ComponentResult[] | null;
  recommendations: {
    strengths: string[];
    issues: string[];
    recommendations: string[];
  } | null;
  error_code: string | null;
  recommendation_error_code: string | null;
  created_at: string;
}

export function CandidateCVAssessment({ cvId, parseStatus }: { cvId: string, parseStatus?: string }) {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAssessment = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const res = await fetch(`/api/candidate/cvs/${cvId}/assessment`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setAssessment(data);
      } else if (res.status !== 404) {
        const errData = await res.json();
        if (errData.error !== 'PARSE_NOT_READY') {
          setError(errData.error || 'Failed to fetch assessment');
        }
      }
    } catch (e: any) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAssessment();
  }, [cvId, parseStatus]);

  const runAssessment = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const res = await fetch(`/api/candidate/cvs/${cvId}/assessment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setAssessment(data);
      } else {
        setError(data.error || 'Failed to run assessment');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!parseStatus || !['completed', 'needs_review'].includes(parseStatus)) {
    return null; // Don't show if CV isn't parsed
  }

  const getBand = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Strong';
    if (score >= 60) return 'Needs improvement';
    return 'Significant issues detected';
  };

  return (
    <div className="mt-4 pt-4 border-t border-green-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-neutral-900 text-base">ATS Readiness</h3>
        {!assessment && (
          <button 
            onClick={runAssessment} 
            disabled={loading}
            className="text-sm bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-800 py-1.5 px-3 rounded-md font-medium shadow-xs transition-colors"
          >
            {loading ? 'Analyzing...' : 'Run Assessment'}
          </button>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-100/70 border border-red-200 p-3 rounded mb-4">
          Error: {error}
        </div>
      )}

      {assessment && (
        <div className="space-y-6">
          {assessment.status !== 'completed' && assessment.status !== 'failed' && (
            <div className="text-sm text-neutral-800 animate-pulse bg-white/70 border border-green-200 p-3 rounded-md">
              Assessment rules are currently processing...
            </div>
          )}

          {assessment.score !== null && (
            <div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-extrabold text-neutral-900">{assessment.score}</span>
                <span className="text-lg font-medium text-neutral-700">/ {assessment.max_score}</span>
                <span className="inline-block bg-white/90 border border-neutral-300 text-neutral-800 px-2.5 py-0.5 rounded-md text-xs font-semibold ml-2 shadow-xs">
                  {getBand(assessment.score)}
                </span>
              </div>
              <p className="text-xs text-neutral-700 mb-4">
                This evaluates how easily automated systems can read and structure your CV. It is not a hiring probability.
              </p>

              {assessment.component_results && (
                <div className="space-y-3 mb-6 bg-neutral-50 dark:bg-neutral-900 p-4 rounded border border-neutral-200 dark:border-neutral-700">
                  {assessment.component_results.map(comp => (
                    <div key={comp.id} className="text-sm">
                      <div className="flex justify-between items-center font-medium text-neutral-800 dark:text-neutral-200">
                        <span className="capitalize">{comp.id.replace('_', ' ')}</span>
                        <span>{comp.score}/{comp.max_score}</span>
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{comp.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {assessment.recommendation_status === 'failed' && (
            <div className="text-xs text-amber-800 bg-amber-100/70 border border-amber-200 p-2.5 rounded mb-3">
              Advisory AI recommendations are temporarily unavailable. Deterministic ATS scores remain valid.
            </div>
          )}

          {assessment.recommendations && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-sm text-emerald-900 mb-1.5">Strengths</h4>
                <ul className="list-disc pl-5 text-sm text-neutral-800 space-y-1.5">
                  {assessment.recommendations.strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
              
              {assessment.recommendations.issues && assessment.recommendations.issues.length > 0 && (
                <div>
                  <h4 className="font-bold text-sm text-amber-900 mb-1.5">Issues Detected</h4>
                  <ul className="list-disc pl-5 text-sm text-neutral-800 space-y-1.5">
                    {assessment.recommendations.issues.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}

              <div>
                <h4 className="font-bold text-sm text-blue-900 mb-1.5">Recommended Improvements</h4>
                <ul className="list-disc pl-5 text-sm text-neutral-800 space-y-1.5">
                  {assessment.recommendations.recommendations.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            </div>
          )}

          {assessment.status === 'failed' && (
            <div className="text-sm text-red-700 bg-red-100/70 border border-red-200 p-3 rounded">
              Assessment failed: {assessment.error_code}
            </div>
          )}
          
          <div className="pt-2">
            <button 
              onClick={runAssessment} 
              disabled={loading}
              className="text-xs text-neutral-700 hover:text-neutral-900 font-semibold underline cursor-pointer"
            >
              {loading ? 'Re-running...' : 'Re-run Assessment'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
