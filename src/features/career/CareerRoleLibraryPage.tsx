import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { careerService, CareerRole, CareerAreaSummary } from './career.service.js';

export function CareerRoleLibraryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialArea = searchParams.get('area') || 'all';

  const [roles, setRoles] = useState<CareerRole[]>([]);
  const [areas, setAreas] = useState<CareerAreaSummary[]>([]);
  const [selectedArea, setSelectedArea] = useState<string>(initialArea);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const areaFromUrl = searchParams.get('area') || 'all';
    setSelectedArea(areaFromUrl);
  }, [searchParams]);

  const loadData = () => {
    setLoading(true);
    setError(null);
    careerService
      .getRoles({
        area: selectedArea !== 'all' ? selectedArea : undefined
      })
      .then((data) => {
        setRoles(data.roles);
        setAreas(data.areas);
        setError(null);
      })
      .catch((err: any) => {
        console.error('Failed to load career roles:', err);
        setError(err.message || 'Unable to load role library. Please try again.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    careerService
      .getRoles({
        area: selectedArea !== 'all' ? selectedArea : undefined
      })
      .then((data) => {
        if (!mounted) return;
        setRoles(data.roles);
        setAreas(data.areas);
        setError(null);
      })
      .catch((err: any) => {
        if (!mounted) return;
        console.error('Failed to load career roles:', err);
        setError(err.message || 'Unable to load role library. Please try again.');
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [selectedArea]);

  // Client-side instant filter on search query
  const filteredRoles = useMemo(() => {
    if (!searchTerm.trim()) return roles;
    const term = searchTerm.toLowerCase().trim();
    return roles.filter(role => {
      return (
        role.title.toLowerCase().includes(term) ||
        role.short_summary.toLowerCase().includes(term) ||
        role.career_area.toLowerCase().includes(term) ||
        role.core_skills.some(skill => skill.toLowerCase().includes(term)) ||
        role.supporting_skills.some(skill => skill.toLowerCase().includes(term))
      );
    });
  }, [roles, searchTerm]);

  const handleAreaChange = (area: string) => {
    setSelectedArea(area);
    if (area === 'all') {
      searchParams.delete('area');
    } else {
      searchParams.set('area', area);
    }
    setSearchParams(searchParams);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedArea('all');
    searchParams.delete('area');
    setSearchParams(searchParams);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header and Breadcrumbs */}
      <div>
        <nav className="flex items-center gap-2 text-xs text-slate-500 mb-2">
          <Link to="/candidate/dashboard" className="hover:text-slate-800">Candidate Workspace</Link>
          <span>/</span>
          <Link to="/candidate/career" className="hover:text-slate-800">Career Hub</Link>
          <span>/</span>
          <span className="font-semibold text-slate-700">Role Library</span>
        </nav>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Career Role Library
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Curated role benchmarks, core competencies, and career progressions for tech roles.
            </p>
          </div>
          <Link
            to="/candidate/career"
            className="self-start sm:self-auto text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
          >
            &larr; Back to Career Hub
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        {/* Search Input */}
        <div>
          <label htmlFor="role-search" className="block text-xs font-semibold text-slate-700 mb-1">
            Search Roles or Technologies
          </label>
          <div className="relative">
            <input
              id="role-search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="e.g. Frontend, PostgreSQL, React, Product Manager, Security..."
              className="w-full pl-3 pr-9 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm p-1"
                aria-label="Clear search"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {/* Career Area Pills */}
        <div>
          <span className="block text-xs font-semibold text-slate-700 mb-2">
            Filter by Career Area
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleAreaChange('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                selectedArea === 'all'
                  ? 'bg-[#0B3D2E] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Disciplines ({roles.length})
            </button>
            {areas.map((area) => (
              <button
                key={area.name}
                type="button"
                onClick={() => handleAreaChange(area.name)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  selectedArea.toLowerCase() === area.name.toLowerCase()
                    ? 'bg-[#0B3D2E] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {area.name} ({area.count})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Showing <strong>{filteredRoles.length}</strong> {filteredRoles.length === 1 ? 'role' : 'roles'}
          {selectedArea !== 'all' && ` in ${selectedArea}`}
          {searchTerm && ` matching "${searchTerm}"`}
        </span>
        {(searchTerm || selectedArea !== 'all') && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={loadData}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 rounded font-semibold text-xs transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 space-y-3 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/3" />
              <div className="h-6 bg-slate-200 rounded w-3/4" />
              <div className="h-12 bg-slate-100 rounded w-full" />
              <div className="h-4 bg-slate-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredRoles.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
          <div className="text-3xl text-slate-400">🔍</div>
          <h3 className="text-lg font-bold text-slate-900">No matching career roles found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search query or selecting a different career area.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-4 py-2 bg-[#0B3D2E] text-white text-xs font-semibold rounded-lg hover:bg-emerald-900 transition-colors cursor-pointer"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      )}

      {/* Roles Grid */}
      {!loading && !error && filteredRoles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRoles.map(role => (
            <div
              key={role.id}
              className="bg-white rounded-xl border border-slate-200 hover:border-emerald-600 hover:shadow-md transition-all flex flex-col justify-between p-5 group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    {role.career_area}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-900 transition-colors">
                  {role.title}
                </h3>
                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                  {role.short_summary}
                </p>

                {/* Core Skills Preview */}
                <div className="pt-1">
                  <div className="text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Core Skills
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {role.core_skills.slice(0, 3).map(skill => (
                      <span
                        key={skill}
                        className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                    {role.core_skills.length > 3 && (
                      <span className="text-[11px] text-slate-400 font-medium px-1 py-0.5">
                        +{role.core_skills.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* View Role Profile CTA */}
              <div className="pt-5 border-t border-slate-100 mt-4 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">
                  {role.career_progression.length} progression stages
                </span>
                <Link
                  to={`/candidate/career/roles/${role.slug}`}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 group-hover:underline"
                >
                  View Profile &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
