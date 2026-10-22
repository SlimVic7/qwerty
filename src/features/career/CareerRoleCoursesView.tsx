import React, { useState, useEffect, useMemo } from 'react';
import { careerService, CareerCourseWithSkill, RoleCourseRecommendationsResponse } from './career.service.js';

interface CareerRoleCoursesViewProps {
  roleSlug: string;
  roleTitle: string;
}

export function CareerRoleCoursesView({ roleSlug, roleTitle }: CareerRoleCoursesViewProps) {
  const [data, setData] = useState<RoleCourseRecommendationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'all' | 'foundation' | 'core' | 'advanced'>('all');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    careerService.getRoleCourses(roleSlug)
      .then((res) => {
        if (!mounted) return;
        setData(res);
      })
      .catch((err: any) => {
        if (!mounted) return;
        console.error('Failed to load role course recommendations:', err);
        setError(err.message || 'Unable to load course recommendations.');
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [roleSlug]);

  const courses = data?.courses || [];

  const filteredCourses = useMemo(() => {
    if (selectedDifficulty === 'all') return courses;
    return courses.filter((c) => {
      const courseDiff = (c.difficulty || '').toLowerCase();
      const skillStage = (c.skill?.stage || '').toLowerCase();
      return courseDiff === selectedDifficulty || skillStage === selectedDifficulty;
    });
  }, [courses, selectedDifficulty]);

  // Difficulty badge style helper
  const getDifficultyBadge = (difficulty: string | null) => {
    switch (difficulty?.toLowerCase()) {
      case 'foundation':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'core':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'advanced':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  // Access badge style helper
  const getAccessBadge = (accessType: string) => {
    if (accessType === 'free') {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto py-6 animate-pulse" data-testid="courses-loading">
        <div className="h-6 bg-slate-200 rounded w-1/3" />
        <div className="h-4 bg-slate-100 rounded w-2/3" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 space-y-3">
              <div className="h-4 bg-slate-200 rounded w-1/4" />
              <div className="h-5 bg-slate-200 rounded w-3/4" />
              <div className="h-16 bg-slate-100 rounded w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 p-6 rounded-xl text-center space-y-2 max-w-2xl mx-auto my-8">
        <h3 className="text-sm font-bold text-red-900">Failed to load courses</h3>
        <p className="text-xs text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto" data-testid="career-role-courses-view">
      {/* Editorial Overview Header */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-900">
            Curated Courses for {roleTitle}
          </h2>
          <span className="text-xs font-semibold px-2.5 py-1 bg-white border border-slate-200 rounded-full text-slate-600">
            {courses.length} {courses.length === 1 ? 'Structured Option' : 'Structured Options'}
          </span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
          Structured learning options mapped directly to the skills in the {roleTitle} roadmap.
          All course options are editorially curated for technical quality and provider neutrality.
        </p>
      </div>

      {/* Filter Toolbar */}
      {courses.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Filter by Stage:</span>
            <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200">
              {(['all', 'foundation', 'core', 'advanced'] as const).map((stage) => {
                const isSelected = selectedDifficulty === stage;
                const label = stage === 'all' ? 'All' : stage.charAt(0).toUpperCase() + stage.slice(1);
                return (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => setSelectedDifficulty(stage)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#0B3D2E] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="text-xs text-slate-500">
            Showing <strong>{filteredCourses.length}</strong> of {courses.length} courses
          </div>
        </div>
      )}

      {/* Zero Courses in Editorial Review Empty State */}
      {courses.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-4 max-w-2xl mx-auto my-8">
          <div className="text-3xl text-slate-400">📚</div>
          <h3 className="text-base font-bold text-slate-900">
            Curated courses for this role are currently in editorial review.
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
            We are actively reviewing structured courses from established university and open educational providers for <strong>{roleTitle}</strong>.
          </p>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3 max-w-xl mx-auto my-6">
          <p className="text-xs text-slate-600">
            No curated courses found matching the <strong>{selectedDifficulty}</strong> filter.
          </p>
          <button
            type="button"
            onClick={() => setSelectedDifficulty('all')}
            className="text-xs font-semibold text-emerald-800 hover:underline cursor-pointer"
          >
            Show all courses
          </button>
        </div>
      ) : (
        /* Course Recommendations Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredCourses.map((course) => (
            <div
              key={course.id}
              data-testid={`course-card-${course.id}`}
              className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 p-5 shadow-xs flex flex-col justify-between space-y-4 transition-all"
            >
              <div className="space-y-3">
                {/* Header Meta: Roadmap Skill & Badges */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-md truncate max-w-xs" title={course.skill?.skill_name}>
                    Skill: {course.skill?.skill_name || 'Roadmap Skill'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {course.difficulty && (
                      <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getDifficultyBadge(course.difficulty)}`}>
                        {course.difficulty}
                      </span>
                    )}
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getAccessBadge(course.access_type)}`}>
                      {course.access_type === 'free' ? 'Free' : 'Free account required'}
                    </span>
                  </div>
                </div>

                {/* Course Title & Provider */}
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {course.title}
                  </h3>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">
                    {course.provider_name}
                  </p>
                </div>

                {/* Course Description */}
                <p className="text-xs text-slate-600 leading-relaxed">
                  {course.description}
                </p>

                {/* Editorial "Why this course" */}
                {course.why_this_course && (
                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-3 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 block">
                      Why this course
                    </span>
                    <p className="text-[11px] text-emerald-950 leading-relaxed">
                      {course.why_this_course}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">
                  Canonical Course Provider
                </span>
                <a
                  href={course.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-[#0B3D2E] hover:bg-emerald-900 text-white text-xs font-semibold transition-colors shadow-xs"
                >
                  <span>View course</span>
                  <span aria-hidden="true">&rarr;</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editorial Content Integrity Note */}
      <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 text-[11px] text-slate-600 space-y-1">
        <div className="font-semibold text-slate-800">QWERTY Educational Standards</div>
        <p>
          All course recommendations are curated based on curriculum quality and alignment with verified industry competency benchmarks.
          QWERTY does not accept commercial placements, paid rankings, or promotional endorsements.
        </p>
      </div>
    </div>
  );
}
