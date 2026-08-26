import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Briefcase, Building2, Clock, Globe } from 'lucide-react';
import { getPublishedJobs, Job, JobFilters } from './jobs.service';

export function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<JobFilters>({
    keyword: '',
    location: '',
    workplace_type: 'all',
    employment_type: 'all'
  });

  const loadJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPublishedJobs(filters);
      setJobs(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load jobs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadJobs();
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    setFilters(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const getWorkplaceIcon = (type: string) => {
    if (type === 'remote') return <Globe className="w-4 h-4" />;
    if (type === 'hybrid') return <Briefcase className="w-4 h-4" />;
    return <Building2 className="w-4 h-4" />;
  };

  const formatWorkplace = (type: string) => {
    if (type === 'unspecified') return null;
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const formatEmployment = (type: string) => {
    if (type === 'unspecified') return null;
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('-');
  };

  const timeAgo = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 30) return `${diffDays} days ago`;
    return '30+ days ago';
  };

  return (
    <div className="bg-[#f8f9fa] min-h-screen">
      {/* Header section */}
      <div className="bg-[#0B3D2E] py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Discover Your Next Role
          </h1>
          <p className="text-[#a5b4ac] text-lg max-w-2xl">
            Explore the latest opportunities verified by QWERTY. 
            Find remote, hybrid, and onsite roles tailored to your career aspirations.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Search & Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-8 -mt-16 z-10 relative">
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-4 relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-slate-400" />
              </div>
              <input
                type="text"
                name="keyword"
                value={filters.keyword}
                onChange={handleFilterChange}
                placeholder="Job title or company"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3D2E] focus:border-transparent"
              />
            </div>
            
            <div className="md:col-span-3 relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <MapPin className="w-5 h-5 text-slate-400" />
              </div>
              <input
                type="text"
                name="location"
                value={filters.location}
                onChange={handleFilterChange}
                placeholder="City or country"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3D2E] focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <select
                name="workplace_type"
                value={filters.workplace_type}
                onChange={handleFilterChange}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3D2E] focus:border-transparent text-slate-700 appearance-none"
              >
                <option value="all">Any Workplace</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">On-site</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <select
                name="employment_type"
                value={filters.employment_type}
                onChange={handleFilterChange}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3D2E] focus:border-transparent text-slate-700 appearance-none"
              >
                <option value="all">Any Type</option>
                <option value="full_time">Full-time</option>
                <option value="part_time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
              </select>
            </div>

            <div className="md:col-span-1">
              <button
                type="submit"
                className="w-full py-3 px-4 bg-[#0B3D2E] hover:bg-[#155a44] text-white rounded-lg font-medium transition-colors h-full flex items-center justify-center"
              >
                Search
              </button>
            </div>
          </form>
        </div>

        {/* Results */}
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-20 text-slate-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0B3D2E] mx-auto mb-4"></div>
              Loading opportunities...
            </div>
          ) : error ? (
            <div className="text-center py-20 bg-white rounded-lg border border-red-100 p-8 shadow-sm">
              <p className="text-red-600 mb-4">{error}</p>
              <button onClick={loadJobs} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 transition-colors">
                Try Again
              </button>
            </div>
          ) : jobs.length === 0 ? (
            (() => {
              const hasFilters = filters.keyword !== '' || filters.location !== '' || filters.workplace_type !== 'all' || filters.employment_type !== 'all';
              if (!hasFilters) {
                return (
                  <div className="text-center py-20 bg-white rounded-lg border border-slate-200 shadow-sm p-8">
                    <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-800 mb-2">New opportunities are coming soon</h3>
                    <p className="text-slate-500 max-w-md mx-auto">
                      There are currently no published roles available. Check back soon for new opportunities from QWERTY.
                    </p>
                  </div>
                );
              }
              return (
                <div className="text-center py-20 bg-white rounded-lg border border-slate-200 shadow-sm p-8">
                  <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-800 mb-2">No jobs found</h3>
                  <p className="text-slate-500 max-w-md mx-auto">
                    We couldn't find any opportunities matching your current filters. Try adjusting your search criteria.
                  </p>
                  <button 
                    onClick={() => {
                      setFilters({ keyword: '', location: '', workplace_type: 'all', employment_type: 'all' });
                      setTimeout(() => document.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })), 0);
                    }}
                    className="mt-6 text-[#0B3D2E] font-medium hover:underline"
                  >
                    Clear all filters
                  </button>
                </div>
              );
            })()
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job) => (
                <Link 
                  key={job.id} 
                  to={`/jobs/${job.slug}`}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col group h-full relative overflow-hidden"
                >
                  {job.featured && (
                    <div className="absolute top-0 right-0 bg-[#0B3D2E] text-white text-[10px] font-bold uppercase tracking-wider py-1 px-3 rounded-bl-lg">
                      Featured
                    </div>
                  )}
                  
                  <div className="flex items-start gap-4 mb-4">
                    {job.company_logo_url ? (
                      <img src={job.company_logo_url} alt={job.company_name} className="w-12 h-12 rounded object-cover border border-slate-100" />
                    ) : (
                      <div className="w-12 h-12 rounded bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-400 font-bold text-lg shrink-0">
                        {job.company_name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 pr-4">
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#0B3D2E] transition-colors truncate">
                        {job.title}
                      </h3>
                      <p className="text-slate-600 truncate">{job.company_name}</p>
                    </div>
                  </div>

                  <div className="space-y-2 mt-auto pt-4 border-t border-slate-100 text-sm text-slate-600">
                    {job.location_text && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="truncate">{job.location_text}</span>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-2 pt-2">
                      {job.workplace_type !== 'unspecified' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                          {getWorkplaceIcon(job.workplace_type)}
                          {formatWorkplace(job.workplace_type)}
                        </span>
                      )}
                      {job.employment_type !== 'unspecified' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                          <Clock className="w-4 h-4" />
                          {formatEmployment(job.employment_type)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                    <span>{timeAgo(job.published_at || job.created_at)}</span>
                    <span className="font-medium text-[#0B3D2E] opacity-0 group-hover:opacity-100 transition-opacity">View Details →</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
