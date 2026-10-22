import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { careerService, CareerAreaSummary } from './career.service.js';

export function CareerHubPage() {
  const [areas, setAreas] = useState<CareerAreaSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadAreas() {
      try {
        const areaData = await careerService.getAreas();
        if (mounted) {
          setAreas(areaData);
        }
      } catch (err) {
        console.error('Failed to load career areas:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    loadAreas();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-[#0B3D2E] text-white rounded-xl p-8 shadow-sm">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-emerald-200 border border-emerald-400/20">
            <span>Stage 7.1</span>
            <span>•</span>
            <span>Curated Career Guidance</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            QWERTY Career Hub
          </h1>
          <p className="text-emerald-100 text-base sm:text-lg leading-relaxed">
            Educational career navigation and role benchmarks tailored for technology professionals.
            Explore career pathways, core competencies, and verified progression tracks.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              to="/candidate/career/roles"
              className="inline-flex items-center px-5 py-2.5 rounded-lg bg-white text-[#0B3D2E] font-semibold text-sm hover:bg-emerald-50 transition-colors shadow-sm"
            >
              Browse Role Library &rarr;
            </Link>
            <Link
              to="/candidate/dashboard"
              className="inline-flex items-center px-4 py-2.5 rounded-lg bg-emerald-900/60 text-white font-medium text-sm hover:bg-emerald-900 transition-colors border border-emerald-700/50"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Career Roadmap Pillars */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Career Hub Framework</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Pillar 1: Role Library (Active) */}
          <div className="bg-white p-5 rounded-xl border-2 border-emerald-600 shadow-sm flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                  Available Now
                </span>
                <span className="text-xs font-semibold text-slate-400">Pillar 1</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">Career Role Library</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Curated role benchmarks covering responsibilities, key technologies, typical backgrounds, and career stages.
              </p>
            </div>
            <div className="pt-4">
              <Link
                to="/candidate/career/roles"
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                Explore roles &rarr;
              </Link>
            </div>
          </div>

          {/* Pillar 2: Skill Roadmaps (Planned) */}
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between opacity-85">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-600 bg-slate-200 px-2.5 py-0.5 rounded-full">
                  Stage 7.2
                </span>
                <span className="text-xs font-semibold text-slate-400">Pillar 2</span>
              </div>
              <h3 className="text-lg font-bold text-slate-800">Skill Roadmaps</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Step-by-step competency roadmaps to bridge skill gaps and master high-demand technical capabilities.
              </p>
            </div>
            <div className="pt-4">
              <span className="text-xs text-slate-400 font-medium">Coming in Stage 7.2</span>
            </div>
          </div>

          {/* Pillar 3: Learning Resources (Planned) */}
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between opacity-85">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-600 bg-slate-200 px-2.5 py-0.5 rounded-full">
                  Stage 7.3
                </span>
                <span className="text-xs font-semibold text-slate-400">Pillar 3</span>
              </div>
              <h3 className="text-lg font-bold text-slate-800">Learning Resources</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Verified educational materials, documentation, and free community learning tracks.
              </p>
            </div>
            <div className="pt-4">
              <span className="text-xs text-slate-400 font-medium">Coming in Stage 7.3</span>
            </div>
          </div>

          {/* Pillar 4: Course Recommendations (Planned) */}
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between opacity-85">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-600 bg-slate-200 px-2.5 py-0.5 rounded-full">
                  Stage 7.4
                </span>
                <span className="text-xs font-semibold text-slate-400">Pillar 4</span>
              </div>
              <h3 className="text-lg font-bold text-slate-800">Course Recommendations</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Accredited certification guides and practical courses mapped directly to verified industry competencies.
              </p>
            </div>
            <div className="pt-4">
              <span className="text-xs text-slate-400 font-medium">Coming in Stage 7.4</span>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Career Areas */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Explore by Career Area</h2>
            <p className="text-sm text-slate-600">Select a discipline to view structured role descriptions and skill requirements.</p>
          </div>
          <Link
            to="/candidate/career/roles"
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
          >
            View all roles &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
            {areas.map(area => (
              <Link
                key={area.name}
                to={`/candidate/career/roles?area=${encodeURIComponent(area.name)}`}
                className="group p-4 rounded-lg border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/40 transition-all flex items-center justify-between"
              >
                <div>
                  <h4 className="font-semibold text-slate-900 group-hover:text-emerald-800 transition-colors text-sm">
                    {area.name}
                  </h4>
                  <span className="text-xs text-slate-500">
                    {area.count} {area.count === 1 ? 'role' : 'roles'} available
                  </span>
                </div>
                <span className="text-slate-400 group-hover:text-emerald-600 text-sm font-semibold">
                  &rarr;
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Integrity & Zero-AI Disclosure Note */}
      <div className="bg-slate-100 border border-slate-200 rounded-xl p-5 text-xs text-slate-600 space-y-2">
        <div className="font-semibold text-slate-800 text-sm">QWERTY Content Standards & Integrity</div>
        <p>
          All career role profiles are human-curated and editorially governed to reflect standard UK and remote technology practice.
          In accordance with QWERTY’s core principles, this guidance uses <strong>zero dynamic AI generation</strong> and does not publish speculative salary estimates.
        </p>
      </div>
    </div>
  );
}
