'use client';

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { History, ArrowRight, Clock, Layers, CheckCircle2 } from 'lucide-react';
import { getAlignmentHistory, AlignmentHistoryResponse } from './alignmentHistory.service.js';
import { useAuth } from '../../lib/auth.js';

interface AlignmentHistoryCardProps {
  jobId: string;
  jobTitle: string;
  companyName: string;
}

export function AlignmentHistoryCard({ jobId, jobTitle, companyName }: AlignmentHistoryCardProps) {
  const { user } = useAuth();
  const [data, setData] = useState<AlignmentHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkHistory() {
      if (!user || !jobId) {
        setLoading(false);
        return;
      }
      try {
        const res = await getAlignmentHistory(jobId, 5);
        setData(res);
      } catch (err) {
        // Quietly handle errors - no alignment history card clutter
        setData(null);
      } finally {
        setLoading(false);
      }
    }
    checkHistory();
  }, [user, jobId]);

  if (!user || loading) return null;
  if (!data || data.history.length === 0) return null;

  const count = data.history.length;
  const current = data.history.find(h => h.is_current) || data.history[0];
  const prior = data.history.length >= 2 ? data.history.find(h => h.alignment_id !== current.alignment_id) : null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#0B3D2E] flex items-center justify-center">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm">Alignment History</h4>
            <p className="text-xs text-slate-500">
              {count === 1 ? '1 alignment analysis recorded' : `${count} historical analyses recorded`}
            </p>
          </div>
        </div>

        <Link
          to={`/candidate/jobs/${jobId}/history`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#0B3D2E] hover:text-[#155a44] transition-colors"
        >
          {count >= 2 ? 'View & Compare' : 'View History'}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {count >= 2 && prior && (
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <span>Prior: <strong>{prior.score}%</strong></span>
            <span>→</span>
            <span>Current: <strong className="text-slate-900">{current.score}%</strong></span>
          </div>

          <Link
            to={`/candidate/jobs/${jobId}/history`}
            className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded font-medium transition-colors"
          >
            Compare Analyses
          </Link>
        </div>
      )}
    </div>
  );
}
