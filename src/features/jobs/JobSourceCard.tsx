'use client';

import React from 'react';
import { ExternalLink, Building2, Globe, Share2, Briefcase, Info } from 'lucide-react';
import { Job } from './jobs.service.js';

interface JobSourceCardProps {
  job: Job;
}

export function JobSourceCard({ job }: JobSourceCardProps) {
  const isDirect = job.source_type === 'qwerty_direct';
  const sourceName = job.source_name || (isDirect ? 'QWERTY Direct' : 'External Source');
  const sourceUrl = job.source_url && /^https?:\/\//i.test(job.source_url) ? job.source_url : null;

  const getSourceTypeLabel = (type?: string) => {
    switch (type) {
      case 'external_company':
        return 'Company Careers Page';
      case 'external_job_board':
        return 'Job Board';
      case 'external_social':
        return 'Professional Network';
      case 'external_recruiter':
        return 'Recruiter / Agency';
      case 'qwerty_direct':
        return 'QWERTY Direct Partner';
      default:
        return 'External Web Source';
    }
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
          <Info className="w-4 h-4 text-slate-500" />
          Job Source & Attribution
        </h3>
        <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
          {getSourceTypeLabel(job.source_type)}
        </span>
      </div>

      <div className="space-y-2 text-xs text-slate-600">
        <div>
          <span className="text-slate-400 block mb-0.5">Discovered via</span>
          <div className="font-medium text-slate-900 flex items-center gap-1.5">
            {sourceUrl ? (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0B3D2E] hover:underline inline-flex items-center gap-1"
              >
                <span>{sourceName}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <span>{sourceName}</span>
            )}
          </div>
        </div>

        {/* Source transparency disclosure */}
        <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed">
          {isDirect ? (
            <p>This opportunity is listed for direct employer engagement on QWERTY.</p>
          ) : (
            <p>
              This opportunity was sourced externally by QWERTY. QWERTY does not represent this employer or accept applications on their behalf.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
