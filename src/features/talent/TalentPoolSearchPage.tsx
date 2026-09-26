import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { authFetch } from '../../lib/authFetch.js';
import { formatSkillName } from './talentProjection.js';

interface CandidateSearchResult {
  id: string;
  display_name: string;
  professional_headline: string | null;
  city: string | null;
  country: string | null;
  years_experience: number | null;
  top_skills: (string | { name?: string })[];
  has_current_cv: boolean;
  allow_cv_access: boolean;
  consented_at: string | null;
  updated_at: string | null;
}

export function TalentPoolSearchPage() {
  const [candidates, setCandidates] = useState<CandidateSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [skillsFilter, setSkillsFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [minExpFilter, setMinExpFilter] = useState('');
  const [hasCvOnly, setHasCvOnly] = useState(false);
  const [sortOrder, setSortOrder] = useState('recent');

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('q', searchQuery.trim());
      if (skillsFilter.trim()) params.append('skills', skillsFilter.trim());
      if (locationFilter.trim()) params.append('location', locationFilter.trim());
      if (minExpFilter) params.append('minExperience', minExpFilter);
      if (hasCvOnly) params.append('hasCvOnly', 'true');
      if (sortOrder) params.append('sort', sortOrder);

      const res = await authFetch(`/api/ops/talent?${params.toString()}`);
      setCandidates(res.candidates || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      console.error('Failed fetching talent pool candidates:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, skillsFilter, locationFilter, minExpFilter, hasCvOnly, sortOrder]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSkillsFilter('');
    setLocationFilter('');
    setMinExpFilter('');
    setHasCvOnly(false);
    setSortOrder('recent');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Talent Pool</h1>
          <p className="text-sm text-slate-500 mt-1">
            Search and evaluate candidates who have explicitly opted into QWERTY recruitment.
          </p>
        </div>
        <div className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-md self-start">
          {total} {total === 1 ? 'consented candidate' : 'consented candidates'}
        </div>
      </div>

      {/* Filter / Search Panel */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Search Keywords
            </label>
            <input
              type="text"
              placeholder="Name, headline, summary..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-sm rounded-md border border-slate-300 p-2 focus:ring-1 focus:ring-slate-800 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Skills (comma-separated)
            </label>
            <input
              type="text"
              placeholder="e.g. React, TypeScript, Python"
              value={skillsFilter}
              onChange={e => setSkillsFilter(e.target.value)}
              className="w-full text-sm rounded-md border border-slate-300 p-2 focus:ring-1 focus:ring-slate-800 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Location
            </label>
            <input
              type="text"
              placeholder="City or country"
              value={locationFilter}
              onChange={e => setLocationFilter(e.target.value)}
              className="w-full text-sm rounded-md border border-slate-300 p-2 focus:ring-1 focus:ring-slate-800 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-600">Min. Experience:</label>
              <select
                value={minExpFilter}
                onChange={e => setMinExpFilter(e.target.value)}
                className="text-sm rounded border border-slate-300 py-1 px-2 focus:outline-none"
              >
                <option value="">Any</option>
                <option value="1">1+ years</option>
                <option value="3">3+ years</option>
                <option value="5">5+ years</option>
                <option value="8">8+ years</option>
                <option value="10">10+ years</option>
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 select-none">
              <input
                type="checkbox"
                checked={hasCvOnly}
                onChange={e => setHasCvOnly(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-800 focus:ring-slate-800"
              />
              <span>CV Access Permitted Only</span>
            </label>

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-600">Order by:</label>
              <select
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value)}
                className="text-sm rounded border border-slate-300 py-1 px-2 focus:outline-none"
              >
                <option value="recent">Recently Opted-In</option>
                <option value="updated">Recently Updated</option>
                <option value="alphabetical">Alphabetical (Name)</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleResetFilters}
            className="text-xs text-slate-500 hover:text-slate-800 font-medium underline"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Results Section */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
          Searching Talent Pool...
        </div>
      ) : candidates.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <p className="text-base font-semibold text-slate-700">No candidates found</p>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Only candidates who have explicitly opted into QWERTY recruitment appear here. Try broadening your filter criteria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {candidates.map(candidate => (
            <div
              key={candidate.id}
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-lg font-bold text-slate-900 truncate">
                    {candidate.display_name}
                  </h3>
                  {candidate.allow_cv_access ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                      CV Available
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                      Profile Only
                    </span>
                  )}
                </div>

                {candidate.professional_headline && (
                  <p className="text-sm font-medium text-slate-700">
                    {candidate.professional_headline}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  {(candidate.city || candidate.country) && (
                    <span>📍 {[candidate.city, candidate.country].filter(Boolean).join(', ')}</span>
                  )}
                  {candidate.years_experience !== null && (
                    <span>💼 {candidate.years_experience} {candidate.years_experience === 1 ? 'year' : 'years'} experience</span>
                  )}
                  {candidate.consented_at && (
                    <span>⏱ Joined {new Date(candidate.consented_at).toLocaleDateString()}</span>
                  )}
                </div>

                {Array.isArray(candidate.top_skills) && candidate.top_skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {candidate.top_skills.map((skill, idx) => {
                      const skillName = formatSkillName(skill);
                      if (!skillName) return null;
                      return (
                        <span
                          key={idx}
                          className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs"
                        >
                          {skillName}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic pt-1">No skills listed</div>
                )}
              </div>

              <div className="shrink-0 flex items-center md:flex-col justify-end gap-3">
                <Link
                  to={`/0ps26/talent/${candidate.id}`}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-slate-900 text-white hover:bg-slate-800 text-sm font-medium transition-colors"
                >
                  View Profile
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
