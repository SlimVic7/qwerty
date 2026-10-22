import { useState, useEffect } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  careerService,
  CareerRole,
  CareerRoleRoadmap,
  CandidateDevelopmentPlan,
  CandidatePlanSummaryCounts
} from './career.service.js';
import { SkillRoadmapView } from './SkillRoadmapView.js';
import { CareerRoleCoursesView } from './CareerRoleCoursesView.js';
import { PersonalizedDevelopmentPlanView } from './PersonalizedDevelopmentPlanView.js';

export function CareerRoleDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const getTabFromPath = (pathname: string): 'benchmark' | 'roadmap' | 'courses' | 'plan' => {
    if (pathname.endsWith('/plan')) return 'plan';
    if (pathname.endsWith('/courses')) return 'courses';
    if (pathname.endsWith('/roadmap')) return 'roadmap';
    return 'benchmark';
  };

  const [activeTab, setActiveTab] = useState<'benchmark' | 'roadmap' | 'courses' | 'plan'>(
    getTabFromPath(location.pathname)
  );

  const [role, setRole] = useState<CareerRole | null>(null);
  const [roadmap, setRoadmap] = useState<CareerRoleRoadmap | null>(null);
  const [plan, setPlan] = useState<CandidateDevelopmentPlan | null>(null);
  const [summaryCounts, setSummaryCounts] = useState<CandidatePlanSummaryCounts | undefined>(undefined);
  const [isStale, setIsStale] = useState(false);
  const [featureEnabled, setFeatureEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  // Sync activeTab when pathname changes
  useEffect(() => {
    setActiveTab(getTabFromPath(location.pathname));
  }, [location.pathname]);

  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      if (!slug) return;
      setLoading(true);
      setError(null);
      try {
        const roleData = await careerService.getRoleBySlug(slug);
        if (!mounted) return;
        setRole(roleData);

        // Fetch roadmap for this role with learning resources (Stage 7.3)
        try {
          if (typeof careerService.getRoleRoadmapResources === 'function') {
            const resourcesRes = await careerService.getRoleRoadmapResources(slug);
            if (mounted && resourcesRes?.roadmap) {
              setRoadmap(resourcesRes.roadmap as any);
            } else if (mounted) {
              setRoadmap(null);
            }
          } else {
            const roadmapRes = await careerService.getRoleRoadmap(slug);
            if (mounted) {
              setRoadmap(roadmapRes.roadmap);
            }
          }
        } catch {
          try {
            const roadmapRes = await careerService.getRoleRoadmap(slug);
            if (mounted) {
              setRoadmap(roadmapRes.roadmap);
            }
          } catch {
            // If roadmap fetch fails or has no roadmap, fail open to roadmap: null
            if (mounted) {
              setRoadmap(null);
            }
          }
        }

        // Fetch candidate-private personalized development plan (Stage 7.5)
        try {
          if (typeof careerService.getPersonalizedDevelopmentPlan === 'function') {
            const planRes = await careerService.getPersonalizedDevelopmentPlan(slug);
            if (mounted) {
              setPlan(planRes?.plan || null);
              setSummaryCounts(planRes?.summary_counts);
              setIsStale(Boolean(planRes?.is_stale));
              if (typeof planRes?.feature_enabled === 'boolean') {
                setFeatureEnabled(planRes.feature_enabled);
              }
            }
          }
        } catch {
          // Non-blocking for base role view
        }
      } catch (err: any) {
        if (mounted) {
          const isNotFound =
            err?.status === 404 ||
            err?.message === 'ROLE_NOT_FOUND' ||
            err?.errorData?.error === 'ROLE_NOT_FOUND';
          if (!isNotFound) {
            console.error('Failed to load career role profile:', err);
          }
          setError(err?.message || 'Unable to load role profile.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    fetchData();
    return () => {
      mounted = false;
    };
  }, [slug]);

  const handleTabChange = (tab: 'benchmark' | 'roadmap' | 'courses' | 'plan') => {
    setActiveTab(tab);
    if (!slug) return;
    if (tab === 'plan') {
      navigate(`/candidate/career/roles/${slug}/plan`);
    } else if (tab === 'courses') {
      navigate(`/candidate/career/roles/${slug}/courses`);
    } else if (tab === 'roadmap') {
      navigate(`/candidate/career/roles/${slug}/roadmap`);
    } else {
      navigate(`/candidate/career/roles/${slug}`);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-1/4" />
        <div className="bg-white p-8 rounded-xl border border-slate-200 space-y-4">
          <div className="h-6 bg-slate-200 rounded w-1/3" />
          <div className="h-10 bg-slate-200 rounded w-2/3" />
          <div className="h-20 bg-slate-100 rounded w-full" />
        </div>
      </div>
    );
  }

  if (error || !role) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center space-y-4">
        <div className="text-4xl text-slate-400">📄</div>
        <h2 className="text-2xl font-bold text-slate-900">Career Role Not Found</h2>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          We could not locate a published role profile matching <code>"{slug}"</code>.
        </p>
        <div className="pt-2">
          <Link
            to="/candidate/career/roles"
            className="inline-flex items-center px-4 py-2 bg-[#0B3D2E] text-white text-xs font-semibold rounded-lg hover:bg-emerald-900 transition-colors"
          >
            &larr; Back to Role Library
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/candidate/dashboard" className="hover:text-slate-800">Candidate Workspace</Link>
        <span>/</span>
        <Link to="/candidate/career" className="hover:text-slate-800">Career Hub</Link>
        <span>/</span>
        <Link to="/candidate/career/roles" className="hover:text-slate-800">Role Library</Link>
        <span>/</span>
        <span className="font-semibold text-slate-800 truncate">{role.title}</span>
        {activeTab === 'roadmap' && (
          <>
            <span>/</span>
            <span className="font-semibold text-emerald-800">Skill Roadmap</span>
          </>
        )}
        {activeTab === 'courses' && (
          <>
            <span>/</span>
            <span className="font-semibold text-emerald-800">Courses</span>
          </>
        )}
        {activeTab === 'plan' && (
          <>
            <span>/</span>
            <span className="font-semibold text-indigo-700">Personalized Plan</span>
          </>
        )}
      </nav>

      {/* Role Profile Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-emerald-800 uppercase tracking-wider">
              {role.career_area}
            </span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="text-slate-500 font-medium">
              Curated Role Benchmark
            </span>
          </div>
          <Link
            to="/candidate/career/roles"
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
          >
            &larr; All Roles
          </Link>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          {role.title}
        </h1>

        <p className="text-base sm:text-lg text-slate-700 leading-relaxed font-normal">
          {role.short_summary}
        </p>

        {/* Action Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3">
          <Link
            to={`/jobs?q=${encodeURIComponent(role.title)}`}
            className="inline-flex items-center px-4 py-2 bg-[#0B3D2E] text-white text-xs font-semibold rounded-lg hover:bg-emerald-900 transition-colors shadow-xs"
          >
            Search Open Jobs for {role.title} &rarr;
          </Link>
          <Link
            to={`/candidate/career/roles?area=${encodeURIComponent(role.career_area)}`}
            className="inline-flex items-center px-3 py-2 bg-slate-100 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-200 transition-colors"
          >
            More in {role.career_area}
          </Link>
        </div>
      </div>

      {/* Primary Section Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          data-testid="tab-benchmark"
          onClick={() => handleTabChange('benchmark')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'benchmark'
              ? 'bg-[#0B3D2E] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Role Benchmark
        </button>
        <button
          type="button"
          data-testid="tab-roadmap"
          onClick={() => handleTabChange('roadmap')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'roadmap'
              ? 'bg-[#0B3D2E] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>Skill Roadmap</span>
          {roadmap ? (
            <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
              activeTab === 'roadmap' ? 'bg-emerald-800 text-emerald-100' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {roadmap.items.length} skills
            </span>
          ) : (
            <span className="text-[10px] font-medium text-slate-400">
              (Soon)
            </span>
          )}
        </button>
        <button
          type="button"
          data-testid="tab-courses"
          onClick={() => handleTabChange('courses')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'courses'
              ? 'bg-[#0B3D2E] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Courses
        </button>
        <button
          type="button"
          data-testid="tab-plan"
          onClick={() => handleTabChange('plan')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'plan'
              ? 'bg-[#0B3D2E] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>Personalized Plan</span>
          {plan ? (
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
          ) : (
            <span className="text-[10px] font-semibold px-1 py-0.2 rounded bg-indigo-50 text-indigo-700">
              New
            </span>
          )}
        </button>
      </div>

      {/* Tab Content: Personalized Plan View */}
      {activeTab === 'plan' && (
        <PersonalizedDevelopmentPlanView
          roleSlug={role.slug}
          roleTitle={role.title}
          plan={plan}
          summaryCounts={summaryCounts}
          isStale={isStale}
          featureEnabled={featureEnabled}
          onPlanUpdated={(newPlan, counts) => {
            setPlan(newPlan);
            setSummaryCounts(counts);
            setIsStale(false);
          }}
        />
      )}

      {/* Tab Content: Skill Roadmap View */}
      {activeTab === 'roadmap' && (
        <div>
          {roadmap ? (
            <SkillRoadmapView roleTitle={role.title} roadmap={roadmap} />
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-4 max-w-2xl mx-auto my-8">
              <div className="text-3xl text-slate-400">🗺️</div>
              <h2 className="text-xl font-bold text-slate-900">Roadmap coming soon.</h2>
              <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
                A structured skill roadmap for <strong>{role.title}</strong> is currently in editorial preparation. In the meantime, review the core and supporting competencies detailed in the Role Benchmark tab.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleTabChange('benchmark')}
                  className="inline-flex items-center px-4 py-2 bg-slate-100 text-slate-800 text-xs font-semibold rounded-lg hover:bg-slate-200 transition-colors"
                >
                  &larr; View Role Benchmark
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Courses View */}
      {activeTab === 'courses' && (
        <CareerRoleCoursesView roleSlug={role.slug} roleTitle={role.title} />
      )}

      {/* Tab Content: Role Benchmark View */}
      {activeTab === 'benchmark' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Column: Core Narrative & Progressive Benchmarks */}
          <div className="lg:col-span-2 space-y-8">
            {/* Overview */}
            <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-3">
              <h2 className="text-lg font-bold text-slate-900">
                Role Overview
              </h2>
              <p className="text-sm text-slate-700 leading-relaxed">
                {role.overview}
              </p>
            </section>

            {/* Common Responsibilities */}
            <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-slate-900">
                Common Responsibilities
              </h2>
              <p className="text-xs text-slate-500">
                Typical duties and operational accountabilities expected of professionals in this role:
              </p>
              <ul className="space-y-2.5">
                {role.responsibilities.map((resp, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-slate-700">
                    <span className="mt-1 flex-shrink-0 w-2 h-2 rounded-full bg-emerald-600" aria-hidden="true" />
                    <span className="leading-normal">{resp}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Typical Background & Pathways */}
            <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-3">
              <h2 className="text-lg font-bold text-slate-900">
                Typical Background & Entry Pathways
              </h2>
              <p className="text-sm text-slate-700 leading-relaxed">
                {role.typical_background}
              </p>
            </section>

            {/* Career Progression Track */}
            <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-slate-900">
                Career Progression Track
              </h2>
              <p className="text-xs text-slate-500">
                Typical growth trajectory and seniority milestones:
              </p>
              <div className="space-y-4 pt-1">
                {role.career_progression.map((prog, idx) => (
                  <div
                    key={idx}
                    className="relative pl-6 pb-2 border-l-2 border-emerald-300 last:border-transparent space-y-1"
                  >
                    <div
                      className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full bg-white border-2 border-emerald-600 flex items-center justify-center text-[9px] font-bold text-emerald-800"
                      aria-hidden="true"
                    >
                      {idx + 1}
                    </div>
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                        {prog.stage}
                      </span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <h3 className="text-sm font-bold text-slate-900">
                        {prog.title}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed pt-1">
                      {prog.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar Column: Competencies & Roadmap Callout */}
          <div className="space-y-6">
            {/* Skill Roadmap Card */}
            {roadmap ? (
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-5 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Skill Roadmap Available
                </div>
                <h3 className="text-sm font-bold text-emerald-950">
                  {roadmap.title}
                </h3>
                <p className="text-xs text-emerald-900/80 leading-relaxed">
                  {roadmap.items.length} curated skills sequenced across Foundation, Core, and Advanced stages.
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => handleTabChange('roadmap')}
                    className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline"
                  >
                    View Skill Roadmap &rarr;
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Skill Roadmap
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  Roadmap coming soon.
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  A curated progression roadmap for this role is currently in editorial preparation.
                </p>
              </div>
            )}

            {/* Core & Supporting Skills */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
              <div>
                <h2 className="text-base font-bold text-slate-900 mb-1">
                  Core Competencies
                </h2>
                <p className="text-xs text-slate-500 mb-3">
                  Fundamental technical skills essential for this position:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {role.core_skills.map(skill => (
                    <span
                      key={skill}
                      className="text-xs font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200 px-2.5 py-1 rounded-md"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <h2 className="text-base font-bold text-slate-900 mb-1">
                  Supporting Competencies
                </h2>
                <p className="text-xs text-slate-500 mb-3">
                  Complementary tools, methodologies, and platforms:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {role.supporting_skills.map(skill => (
                    <span
                      key={skill}
                      className="text-xs font-medium bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Related Roles Card */}
            {role.related_roles && role.related_roles.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-3">
                <h2 className="text-base font-bold text-slate-900">
                  Related Career Roles
                </h2>
                <p className="text-xs text-slate-500">
                  Alternative or adjacent career specializations:
                </p>
                <div className="space-y-2 pt-1">
                  {role.related_roles.map(ref => (
                    <Link
                      key={ref.slug}
                      to={`/candidate/career/roles/${ref.slug}`}
                      className="block p-3 rounded-lg border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/30 transition-colors group"
                    >
                      <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-800">
                        {ref.title}
                      </div>
                      {ref.career_area && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {ref.career_area}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
