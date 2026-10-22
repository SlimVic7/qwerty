import React, { useState, useEffect } from 'react';
import { authFetch } from '../../lib/authFetch.js';
import { CandidateCVAssessment } from './CandidateCVAssessment.js';

type CandidateCVParseReviewProps = {
  cvId: string;
  onApplied: () => void;
};

export function CandidateCVParseReview({ cvId, onApplied }: CandidateCVParseReviewProps) {
  const [parse, setParse] = useState<any>(null);
  const [editedData, setEditedData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    fetchParse();
  }, [cvId]);

  // Auto-poll when parsing is actively processing
  useEffect(() => {
    if (parse && ['pending', 'extracting_text', 'processing'].includes(parse.status)) {
      const timer = setTimeout(() => {
        fetchParse();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [parse?.status]);

  const fetchParse = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await authFetch(`/api/candidate/cvs/${cvId}/parse`);
      setParse(data);
      if (data?.reviewed_data || data?.extracted_data) {
        const baseExtracted = data?.extracted_data || {};
        const reviewed = data?.reviewed_data || {};
        const merged = {
          ...baseExtracted,
          ...reviewed,
          personal: {
            ...(baseExtracted.personal || {}),
            ...(reviewed.personal || {})
          },
          professional: {
            ...(baseExtracted.professional || {}),
            ...(reviewed.professional || {})
          },
          skills: reviewed.skills ?? baseExtracted.skills ?? null,
          experience: reviewed.experience ?? baseExtracted.experience ?? null,
          education: reviewed.education ?? baseExtracted.education ?? null,
          certifications: reviewed.certifications ?? baseExtracted.certifications ?? null,
          projects: reviewed.projects ?? baseExtracted.projects ?? null,
          languages: reviewed.languages ?? baseExtracted.languages ?? null
        };
        setEditedData(JSON.parse(JSON.stringify(merged)));
      }
    } catch (e: any) {
      if (e.message.includes('404')) {
        setParse(null);
      } else {
        setError(e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const startParse = async (isRetry = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = isRetry ? `/api/candidate/cvs/${cvId}/parse?retry=true` : `/api/candidate/cvs/${cvId}/parse`;
      const data = await authFetch(url, { method: 'POST' });
      setParse(data);
      if (data?.extracted_data) {
        setEditedData(JSON.parse(JSON.stringify(data.extracted_data)));
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const applyToProfile = async () => {
    if (!editedData) return;
    setApplying(true);
    try {
      const baseExtracted = parse?.extracted_data || {};
      const completePayload = {
        ...baseExtracted,
        ...editedData,
        personal: {
          ...(baseExtracted.personal || {}),
          ...(editedData.personal || {})
        },
        professional: {
          ...(baseExtracted.professional || {}),
          ...(editedData.professional || {})
        },
        skills: editedData.skills ?? baseExtracted.skills ?? null,
        experience: editedData.experience ?? baseExtracted.experience ?? null,
        education: editedData.education ?? baseExtracted.education ?? null,
        certifications: editedData.certifications ?? baseExtracted.certifications ?? null,
        projects: editedData.projects ?? baseExtracted.projects ?? null,
        languages: editedData.languages ?? baseExtracted.languages ?? null
      };

      await authFetch(`/api/candidate/cvs/${cvId}/parse/apply`, {
        method: 'POST',
        body: JSON.stringify({ 
          parse_id: parse.id,
          profile_updates: completePayload 
        })
      });
      onApplied();
      // Also update local state to reflect 'completed'
      setParse((prev: any) => prev ? { ...prev, status: 'completed', reviewed_data: completePayload } : null);
    } catch (e: any) {
      setError(e.message || 'Failed to apply profile');
    } finally {
      setApplying(false);
    }
  };

  const handleChange = (section: string, field: string, value: string | number | null) => {
    setEditedData((prev: any) => ({
      ...prev,
      [section]: {
        ...(prev?.[section] || {}),
        [field]: value
      }
    }));
  };

  const handleLinksChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const lines = e.target.value.split('\n').filter(Boolean);
    setEditedData((prev: any) => ({
      ...prev,
      personal: {
        ...(prev?.personal || {}),
        links: lines
      }
    }));
  };

  if (loading) {
    return <div className="text-xs sm:text-sm text-neutral-500 py-2">Checking CV analysis status...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg border border-red-200 mt-4">
        <p className="text-red-700 text-sm font-medium">{error}</p>
        <button onClick={fetchParse} className="mt-2 text-sm text-red-600 hover:underline font-medium">Retry</button>
      </div>
    );
  }

  if (!parse) {
    return (
      <div className="mt-4">
        <button onClick={() => startParse(false)} className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md text-sm transition-colors">
          Analyse CV
        </button>
        <p className="text-xs text-neutral-500 mt-1">Extract profile information automatically.</p>
      </div>
    );
  }

  if (parse.status === 'failed') {
    const getFailureMessage = (code: string) => {
      if (code === 'OCR_REQUIRED') return 'Scanned or image-based CV detected. Please upload a text-based PDF or DOCX file.';
      if (code === 'UNSUPPORTED_DOCUMENT') return 'Unsupported document format. Please upload a PDF or DOCX file.';
      return "We couldn't finish processing your CV yet. You can retry.";
    };

    return (
      <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 mt-4">
        <h4 className="text-amber-800 font-semibold mb-1 text-sm sm:text-base">Processing Not Completed</h4>
        <p className="text-amber-700 text-xs sm:text-sm mb-3">{getFailureMessage(parse.error_code)}</p>
        <button onClick={() => startParse(true)} className="bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 font-medium py-1.5 px-3 rounded-md text-xs sm:text-sm transition-colors">
          Retry Analysis
        </button>
      </div>
    );
  }

  if (['pending', 'extracting_text', 'processing'].includes(parse.status)) {
    return (
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mt-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
          <div>
            <h4 className="text-blue-800 font-semibold text-xs sm:text-sm">Analysing CV...</h4>
            <p className="text-blue-600 text-xs">Extracting structured profile data automatically.</p>
          </div>
        </div>
        <button onClick={fetchParse} className="text-xs sm:text-sm text-blue-700 hover:underline font-medium shrink-0">Refresh</button>
      </div>
    );
  }

  if (!editedData) return null;

  const isCompleted = parse.status === 'completed';

  return (
    <div className="bg-green-50 p-4 rounded-lg border border-green-200 mt-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="text-green-800 font-semibold">Analysis Complete</h4>
          <p className="text-green-700 text-sm">Review and edit extracted information before applying.</p>
        </div>
        {parse.status === 'needs_review' && (
          <button onClick={applyToProfile} disabled={applying} className="bg-green-600 hover:bg-green-700 text-white font-medium py-1.5 px-4 rounded-md text-sm shadow-sm disabled:opacity-50">
            {applying ? 'Applying...' : 'Apply to Profile'}
          </button>
        )}
        {isCompleted && (
          <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded border border-green-300">Applied</span>
        )}
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">Full Name</label>
            <input 
              type="text" 
              value={editedData.personal?.full_name || ''} 
              onChange={e => handleChange('personal', 'full_name', e.target.value)}
              disabled={isCompleted}
              className="w-full text-sm border-neutral-300 rounded-md disabled:bg-neutral-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">Phone</label>
            <input 
              type="text" 
              value={editedData.personal?.phone || ''} 
              onChange={e => handleChange('personal', 'phone', e.target.value)}
              disabled={isCompleted}
              className="w-full text-sm border-neutral-300 rounded-md disabled:bg-neutral-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">Location (City, Country)</label>
            <input 
              type="text" 
              value={editedData.personal?.location || ''} 
              onChange={e => handleChange('personal', 'location', e.target.value)}
              disabled={isCompleted}
              className="w-full text-sm border-neutral-300 rounded-md disabled:bg-neutral-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">Years Experience</label>
            <input 
              type="number" 
              value={editedData.professional?.years_experience || ''} 
              onChange={e => handleChange('professional', 'years_experience', e.target.value ? parseInt(e.target.value, 10) : null)}
              disabled={isCompleted}
              className="w-full text-sm border-neutral-300 rounded-md disabled:bg-neutral-100"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1">Headline</label>
          <input 
            type="text" 
            value={editedData.professional?.headline || ''} 
            onChange={e => handleChange('professional', 'headline', e.target.value)}
            disabled={isCompleted}
            className="w-full text-sm border-neutral-300 rounded-md disabled:bg-neutral-100"
          />
        </div>
        
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1">Summary</label>
          <textarea 
            rows={3}
            value={editedData.professional?.summary || ''} 
            onChange={e => handleChange('professional', 'summary', e.target.value)}
            disabled={isCompleted}
            className="w-full text-sm border-neutral-300 rounded-md disabled:bg-neutral-100"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1">Links (One per line)</label>
          <textarea 
            rows={2}
            value={(editedData.personal?.links || []).join('\n')} 
            onChange={handleLinksChange}
            disabled={isCompleted}
            className="w-full text-sm border-neutral-300 rounded-md disabled:bg-neutral-100"
            placeholder="https://linkedin.com/in/you&#10;https://github.com/you"
          />
        </div>

        {editedData.experience && editedData.experience.length > 0 && (
          <div className="text-sm border-t border-green-200 pt-2">
            <span className="font-semibold text-neutral-700 block mb-1">Recent Experience (Read Only)</span>
            {editedData.experience.slice(0, 2).map((exp: any, i: number) => (
              <div key={i} className="mb-2">
                <div className="font-medium">{exp.job_title} at {exp.company}</div>
                <div className="text-xs text-neutral-500">{exp.start_date} - {exp.end_date || 'Present'}</div>
                {exp.confidence === 'low' && <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded ml-2">Low Confidence</span>}
              </div>
            ))}
          </div>
        )}
      </div>
      <CandidateCVAssessment cvId={cvId} parseStatus={parse.status} />
    </div>
  );
}

