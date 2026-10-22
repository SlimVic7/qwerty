import { useState, useMemo } from 'react';
import { CareerRoleRoadmap, CareerRoleRoadmapItem, RoadmapStage, CareerLearningResource } from './career.service.js';

function formatResourceType(type: string): string {
  switch (type) {
    case 'documentation': return 'Official Documentation';
    case 'guide': return 'Guide';
    case 'article': return 'Article';
    case 'video': return 'Video';
    case 'lab': return 'Practice Lab';
    case 'practice': return 'Interactive Practice';
    case 'standard': return 'Standard / Specification';
    case 'reference': return 'Technical Reference';
    default: return type.charAt(0).toUpperCase() + type.slice(1);
  }
}


interface SkillRoadmapViewProps {
  roleTitle: string;
  roadmap: CareerRoleRoadmap;
}

export function SkillRoadmapView({ roleTitle, roadmap }: SkillRoadmapViewProps) {
  const [selectedStage, setSelectedStage] = useState<'all' | RoadmapStage>('all');
  const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(() => {
    // Expand the first item of each stage by default for immediate context
    const initial = new Set<string>();
    const seenStages = new Set<string>();
    for (const item of roadmap.items) {
      if (!seenStages.has(item.stage)) {
        initial.add(item.id);
        seenStages.add(item.stage);
      }
    }
    return initial;
  });

  const toggleItem = (id: string) => {
    setExpandedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedItemIds(new Set(roadmap.items.map(i => i.id)));
  };

  const collapseAll = () => {
    setExpandedItemIds(new Set());
  };

  // Group items by stage
  const stageGroups = useMemo(() => {
    const groups: Record<RoadmapStage, CareerRoleRoadmapItem[]> = {
      foundation: [],
      core: [],
      advanced: []
    };
    for (const item of roadmap.items) {
      if (groups[item.stage]) {
        groups[item.stage].push(item);
      }
    }
    return groups;
  }, [roadmap.items]);

  const stagesToRender: RoadmapStage[] = selectedStage === 'all'
    ? ['foundation', 'core', 'advanced']
    : [selectedStage];

  const stageDescriptions: Record<RoadmapStage, { label: string; description: string; step: string }> = {
    foundation: {
      step: 'Stage 1',
      label: 'Foundation',
      description: 'Foundational concepts, programming languages, and core developer tools commonly developed before specialized role work.'
    },
    core: {
      step: 'Stage 2',
      label: 'Core Role Skills',
      description: 'Operational competencies and technical proficiencies routinely required to execute the day-to-day duties of this role.'
    },
    advanced: {
      step: 'Stage 3',
      label: 'Advanced & Scale',
      description: 'Specialized capabilities, architectural leadership, and scale considerations associated with greater autonomy and senior scope.'
    }
  };

  return (
    <div className="space-y-8">
      {/* Roadmap Overview Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Curated Reference Roadmap</span>
            <span aria-hidden="true">·</span>
            <span>Version {roadmap.version} ({roadmap.version_label})</span>
            <span aria-hidden="true">·</span>
            <span>{roadmap.items.length} Benchmarked Skills</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="text-xs text-emerald-800 hover:text-emerald-950 font-medium underline underline-offset-2"
            >
              Expand all
            </button>
            <span aria-hidden="true" className="text-slate-300">|</span>
            <button
              onClick={collapseAll}
              className="text-xs text-slate-600 hover:text-slate-900 font-medium underline underline-offset-2"
            >
              Collapse all
            </button>
          </div>
        </div>
        <h3 className="text-lg font-bold text-slate-900">
          Skill Roadmap for {roleTitle}
        </h3>
        <p className="text-sm text-slate-700 leading-relaxed max-w-4xl">
          {roadmap.summary}
        </p>
        <p className="text-xs text-slate-500 italic pt-1">
          Note: This educational roadmap outlines common progression pathways. It is not an exhaustive hiring mandate or checklist; candidates routinely transition into roles by demonstrating depth across a practical subset of these capabilities.
        </p>
      </div>

      {/* Stage Filter Segmented Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setSelectedStage('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              selectedStage === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Stages ({roadmap.items.length})
          </button>
          <button
            onClick={() => setSelectedStage('foundation')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              selectedStage === 'foundation'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Foundation ({stageGroups.foundation.length})
          </button>
          <button
            onClick={() => setSelectedStage('core')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              selectedStage === 'core'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Core Skills ({stageGroups.core.length})
          </button>
          <button
            onClick={() => setSelectedStage('advanced')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              selectedStage === 'advanced'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Advanced ({stageGroups.advanced.length})
          </button>
        </div>
      </div>

      {/* Stage Sections */}
      <div className="space-y-10">
        {stagesToRender.map(stage => {
          const items = stageGroups[stage];
          if (!items || items.length === 0) return null;
          const info = stageDescriptions[stage];

          return (
            <section key={stage} className="space-y-4">
              {/* Stage Header */}
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-slate-100 pb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                      {info.step}
                    </span>
                    <span className="text-slate-300">·</span>
                    <h4 className="text-base font-bold text-slate-900">
                      {info.label}
                    </h4>
                    <span className="text-xs text-slate-400 font-medium">
                      ({items.length} {items.length === 1 ? 'skill' : 'skills'})
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {info.description}
                  </p>
                </div>
              </div>

              {/* Skill Cards List */}
              <div className="space-y-3">
                {items.map(item => {
                  const isExpanded = expandedItemIds.has(item.id);

                  return (
                    <article
                      key={item.id}
                      className="bg-white rounded-xl border border-slate-200 transition-shadow hover:shadow-xs"
                    >
                      {/* Accordion Summary Trigger */}
                      <button
                        type="button"
                        onClick={() => toggleItem(item.id)}
                        aria-expanded={isExpanded}
                        className="w-full text-left p-4 sm:p-5 flex items-start justify-between gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 rounded-xl"
                      >
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <h5 className="text-sm font-bold text-slate-900">
                              {item.skill_name}
                            </h5>
                            <span className="text-xs text-slate-400 font-medium">·</span>
                            <span className="text-xs text-slate-500 font-medium">
                              {item.skill_category}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 pt-0.5">
                          <span className="text-xs font-semibold text-slate-500 hover:text-slate-800">
                            {isExpanded ? 'Less' : 'Details'}
                          </span>
                          <span
                            aria-hidden="true"
                            className={`text-slate-400 text-xs transition-transform transform ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                          >
                            ▼
                          </span>
                        </div>
                      </button>

                      {/* Expanded Detail Panel */}
                      {isExpanded && (
                        <div className="px-4 pb-5 sm:px-5 sm:pb-6 border-t border-slate-100 pt-4 space-y-4">
                          {/* Why It Matters */}
                          <div className="space-y-1">
                            <h6 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                              Why It Matters in this Role
                            </h6>
                            <p className="text-xs text-slate-700 leading-relaxed">
                              {item.why_it_matters}
                            </p>
                          </div>

                          {/* Competency Target Outcome */}
                          <div className="space-y-1">
                            <h6 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                              What Competency Looks Like
                            </h6>
                            <p className="text-xs text-slate-700 leading-relaxed">
                              {item.competency_outcome}
                            </p>
                          </div>

                          {/* Observable Evidence Examples */}
                          <div className="space-y-2 pt-1">
                            <h6 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                              Practical Ways to Demonstrate Evidence
                            </h6>
                            <ul className="space-y-1.5">
                              {item.evidence_examples.map((evidence, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-start gap-2.5 text-xs text-slate-700"
                                >
                                  <span
                                    className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-600"
                                    aria-hidden="true"
                                  />
                                  <span className="leading-relaxed">{evidence}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Stage 7.3: Learning & Practice Resources */}
                          <div className="space-y-3 pt-4 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                              <h6 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                <span>Where to Learn & Practise</span>
                                {item.resources && item.resources.length > 0 && (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                    {item.resources.length} {item.resources.length === 1 ? 'resource' : 'resources'}
                                  </span>
                                )}
                              </h6>
                            </div>

                            {item.resources && item.resources.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                                {item.resources.map(res => (
                                  <div
                                    key={res.id}
                                    data-testid={`resource-card-${res.id}`}
                                    className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex flex-col justify-between gap-3 transition-colors hover:border-slate-300 hover:bg-slate-50/80"
                                  >
                                    <div className="space-y-1.5">
                                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                                        <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                                          {formatResourceType(res.resource_type)}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-medium">
                                          {res.access_type === 'free' ? 'Free' : 'Free account required'}
                                        </span>
                                      </div>
                                      <h6 className="text-xs font-bold text-slate-900 leading-snug">
                                        {res.title}
                                      </h6>
                                      <p className="text-[11px] text-slate-500 font-medium">
                                        Source: {res.provider_name}
                                      </p>
                                      <p className="text-xs text-slate-600 leading-relaxed">
                                        {res.description}
                                      </p>
                                    </div>
                                    <div className="pt-1">
                                      <a
                                        href={res.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-900 hover:text-emerald-950 underline underline-offset-2"
                                      >
                                        <span>Open Resource</span>
                                        <span aria-hidden="true" className="text-[10px]">&rarr;</span>
                                      </a>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-500 italic">
                                Curated learning and practice resources for this skill are in editorial review.
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
