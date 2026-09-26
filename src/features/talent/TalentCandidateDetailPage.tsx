import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { authFetch } from '../../lib/authFetch.js';
import {
  formatSkillName,
  formatCertification,
  CandidateWorkExperience,
  CandidateEducation,
  CandidateCertification
} from './talentProjection.js';

interface CandidateDetail {
  id: string;
  display_name: string;
  professional_headline: string | null;
  professional_summary: string | null;
  city: string | null;
  country: string | null;
  years_experience: number | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  skills: (string | { name?: string })[];
  experience: CandidateWorkExperience[];
  education: CandidateEducation[];
  certifications: (string | CandidateCertification)[];
  has_current_cv: boolean;
  allow_cv_access: boolean;
  consented_at: string | null;
}

export function TalentCandidateDetailPage() {
  const { candidateId } = useParams<{ candidateId: string }>();
  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const [cvLoading, setCvLoading] = useState(false);
  const [cvNotification, setCvNotification] = useState<string | null>(null);
  const [cvError, setCvError] = useState<string | null>(null);
  const [activeCvLink, setActiveCvLink] = useState<{ url: string; filename: string; expiresIn: number } | null>(null);

  useEffect(() => {
    async function loadCandidate() {
      if (!candidateId) return;
      setLoading(true);
      setIsUnavailable(false);
      setServerError(null);
      try {
        const data = await authFetch(`/api/ops/talent/${candidateId}`);
        setCandidate(data);
      } catch (err: any) {
        if (
          err.status === 404 ||
          err.message?.includes('404') ||
          err.message?.includes('withdrawn') ||
          err.message?.includes('not found')
        ) {
          setIsUnavailable(true);
        } else {
          console.error('Error fetching candidate detail:', err);
          setServerError('Unable to load this candidate. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    }
    loadCandidate();
  }, [candidateId]);

  const handleAccessCv = async () => {
    if (!candidateId) return;
    setCvLoading(true);
    setCvNotification(null);
    setCvError(null);
    setActiveCvLink(null);
    try {
      const res = await authFetch(`/api/ops/talent/${candidateId}/cv-url`, {
        method: 'POST'
      });
      if (res.signedUrl) {
        setActiveCvLink({
          url: res.signedUrl,
          filename: res.filename || 'Candidate_CV.pdf',
          expiresIn: res.expiresIn || 60
        });
        setCvNotification(`Temporary CV link generated for ${res.filename} (valid for ${res.expiresIn}s). Access has been recorded in the audit log.`);
      }
    } catch (err: any) {
      console.error('Error requesting CV access:', err);
      if (err.status === 404) {
        setCvError('This candidate or CV is no longer available in the QWERTY Talent Pool.');
      } else {
        setCvError('Failed to generate temporary CV access link. Please try again.');
      }
    } finally {
      setCvLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
        Loading candidate profile...
      </div>
    );
  }

  if (isUnavailable || (!candidate && !serverError)) {
    return (
      <div className="p-8 bg-white rounded-xl border border-slate-200 text-center space-y-4">
        <p className="text-lg font-semibold text-slate-800">Candidate Unavailable</p>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          This candidate is no longer available in the QWERTY Talent Pool.
        </p>
        <Link
          to="/0ps26/talent"
          className="inline-flex items-center text-sm font-medium text-slate-700 hover:text-slate-900 underline"
        >
          ← Back to Talent Pool Search
        </Link>
      </div>
    );
  }

  if (serverError) {
    return (
      <div className="p-8 bg-white rounded-xl border border-slate-200 text-center space-y-4">
        <p className="text-lg font-semibold text-slate-800">Candidate Unavailable</p>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          {serverError}
        </p>
        <Link
          to="/0ps26/talent"
          className="inline-flex items-center text-sm font-medium text-slate-700 hover:text-slate-900 underline"
        >
          ← Back to Talent Pool Search
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/0ps26/talent"
          className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          ← Back to Talent Pool
        </Link>
        <div className="text-xs text-slate-400">
          Consented to Recruitment: {candidate.consented_at ? new Date(candidate.consented_at).toLocaleDateString() : 'Active'}
        </div>
      </div>

      {/* Main Header Card */}
      <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              {candidate.display_name}
            </h1>
            {candidate.professional_headline && (
              <p className="text-base text-slate-600 font-medium mt-1">
                {candidate.professional_headline}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
              {(candidate.city || candidate.country) && (
                <span>📍 {[candidate.city, candidate.country].filter(Boolean).join(', ')}</span>
              )}
              {candidate.years_experience !== null && (
                <span>💼 {candidate.years_experience} years experience</span>
              )}
            </div>
          </div>

          {/* CV Access Status Action */}
          <div className="shrink-0 flex flex-col items-start sm:items-end gap-2">
            {candidate.allow_cv_access ? (
              <button
                onClick={handleAccessCv}
                disabled={cvLoading}
                className="inline-flex items-center px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition-colors shadow-sm"
              >
                {cvLoading ? 'Generating Temporary Link...' : '📄 View Candidate CV'}
              </button>
            ) : (
              <div className="text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-md text-right max-w-xs">
                Candidate has permitted profile view only (CV download not enabled)
              </div>
            )}
          </div>
        </div>

        {cvError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-md text-xs flex items-center justify-between gap-2">
            <span>{cvError}</span>
            <button
              onClick={() => setCvError(null)}
              className="text-rose-600 hover:text-rose-800 font-semibold text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {cvNotification && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-xs space-y-2">
            <div>{cvNotification}</div>
            {activeCvLink && (
              <div className="pt-1 flex items-center gap-3">
                <a
                  href={activeCvLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs shadow-xs transition-colors"
                >
                  Download / View {activeCvLink.filename} ↗
                </a>
                <span className="text-emerald-700/80 text-[11px]">
                  Link expires in {activeCvLink.expiresIn} seconds
                </span>
              </div>
            )}
          </div>
        )}

        {/* Links */}
        {(candidate.linkedin_url || candidate.github_url || candidate.portfolio_url) && (
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-100 text-xs">
            {candidate.linkedin_url && (
              <a
                href={candidate.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-600 hover:text-slate-900 underline"
              >
                LinkedIn Profile ↗
              </a>
            )}
            {candidate.github_url && (
              <a
                href={candidate.github_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-600 hover:text-slate-900 underline"
              >
                GitHub Profile ↗
              </a>
            )}
            {candidate.portfolio_url && (
              <a
                href={candidate.portfolio_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-600 hover:text-slate-900 underline"
              >
                Portfolio / Website ↗
              </a>
            )}
          </div>
        )}
      </div>

      {/* Professional Summary */}
      {candidate.professional_summary && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">
            Professional Summary
          </h2>
          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
            {candidate.professional_summary}
          </p>
        </div>
      )}

      {/* Approved Skills */}
      {Array.isArray(candidate.skills) && candidate.skills.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">
            Approved Skills
          </h2>
          <div className="flex flex-wrap gap-2">
            {candidate.skills.map((skill, i) => {
              const skillName = formatSkillName(skill);
              if (!skillName) return null;
              return (
                <span
                  key={i}
                  className="px-3 py-1 bg-slate-100 text-slate-800 rounded-md text-xs font-medium"
                >
                  {skillName}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Approved Work Experience */}
      {Array.isArray(candidate.experience) && candidate.experience.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">
            Approved Work Experience
          </h2>
          <div className="space-y-4 divide-y divide-slate-100">
            {candidate.experience.map((exp: any, i: number) => {
              if (!exp) return null;
              const roleTitle = typeof exp.role === 'string' && exp.role.trim()
                ? exp.role.trim()
                : typeof exp.title === 'string' && exp.title.trim()
                ? exp.title.trim()
                : typeof exp.job_title === 'string' && exp.job_title.trim()
                ? exp.job_title.trim()
                : 'Role Unspecified';
              const companyName = typeof exp.company === 'string' && exp.company.trim()
                ? exp.company.trim()
                : typeof exp.company_name === 'string' && exp.company_name.trim()
                ? exp.company_name.trim()
                : '';
              const dateRange = [exp.start_date, exp.end_date || (exp.is_current ? 'Present' : '')]
                .filter(Boolean)
                .map((d: any) => typeof d === 'string' ? d.trim() : '')
                .filter(Boolean)
                .join(' - ');

              return (
                <div key={i} className={i > 0 ? 'pt-4 space-y-1' : 'space-y-1'}>
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                    <h3 className="text-sm font-bold text-slate-900">
                      {roleTitle}
                    </h3>
                    {dateRange && (
                      <span className="text-xs text-slate-400 font-mono">
                        {dateRange}
                      </span>
                    )}
                  </div>
                  {companyName && (
                    <p className="text-xs font-medium text-slate-600">{companyName}</p>
                  )}
                  {exp.location && typeof exp.location === 'string' && (
                    <p className="text-xs text-slate-400">📍 {exp.location.trim()}</p>
                  )}
                  {exp.description && typeof exp.description === 'string' && (
                    <p className="text-xs text-slate-600 whitespace-pre-wrap pt-1 leading-relaxed">
                      {exp.description.trim()}
                    </p>
                  )}
                  {Array.isArray(exp.achievements) && exp.achievements.length > 0 && (
                    <ul className="list-disc list-inside space-y-0.5 pt-1 text-xs text-slate-600">
                      {exp.achievements.map((ach: any, idx: number) => {
                        const achText = typeof ach === 'string' ? ach.trim() : (ach && typeof ach.text === 'string' ? ach.text.trim() : '');
                        return achText ? <li key={idx}>{achText}</li> : null;
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Approved Education & Certifications */}
      {((Array.isArray(candidate.education) && candidate.education.length > 0) || (Array.isArray(candidate.certifications) && candidate.certifications.length > 0)) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.isArray(candidate.education) && candidate.education.length > 0 && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">
                Approved Education
              </h2>
              <div className="space-y-3">
                {candidate.education.map((edu: any, i: number) => {
                  if (!edu) return null;
                  const degree = typeof edu.degree === 'string' && edu.degree.trim()
                    ? edu.degree.trim()
                    : typeof edu.qualification === 'string' && edu.qualification.trim()
                    ? edu.qualification.trim()
                    : 'Degree / Qualification';
                  const institution = typeof edu.institution === 'string' && edu.institution.trim()
                    ? edu.institution.trim()
                    : typeof edu.institution_name === 'string' && edu.institution_name.trim()
                    ? edu.institution_name.trim()
                    : 'Institution';
                  const grad = typeof edu.graduation_year === 'string' && edu.graduation_year.trim()
                    ? edu.graduation_year.trim()
                    : typeof edu.end_date === 'string' && edu.end_date.trim()
                    ? edu.end_date.trim()
                    : null;
                  const field = typeof edu.field_of_study === 'string' && edu.field_of_study.trim()
                    ? edu.field_of_study.trim()
                    : null;

                  return (
                    <div key={i} className="text-xs space-y-0.5">
                      <p className="font-bold text-slate-900">{degree}</p>
                      <p className="text-slate-600">
                        {institution}
                        {field ? ` — ${field}` : ''}
                      </p>
                      {grad && (
                        <p className="text-slate-400 font-mono">{grad}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {Array.isArray(candidate.certifications) && candidate.certifications.length > 0 && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">
                Approved Certifications
              </h2>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-700">
                {candidate.certifications.map((cert, i) => {
                  const label = formatCertification(cert);
                  if (!label) return null;
                  return <li key={i}>{label}</li>;
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
