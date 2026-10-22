/**
 * QWERTY Stage 7.5 — Personalized Development Plan UI Tests
 * Validates rendering of PersonalizedDevelopmentPlanView, Coming Soon state,
 * priority metrics, filter tabs, evidence-safe classifications, and item expansions.
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PersonalizedDevelopmentPlanView } from '../src/features/career/PersonalizedDevelopmentPlanView.js';
import { CandidateDevelopmentPlan, CandidatePlanSummaryCounts } from '../src/features/career/career.service.js';

describe('Stage 7.5 — PersonalizedDevelopmentPlanView Component', () => {
  const roleSlug = 'frontend-engineer';
  const roleTitle = 'Frontend Engineer';

  const mockPlan: CandidateDevelopmentPlan = {
    id: 'plan-test-1',
    user_id: 'user-1',
    career_role_id: 'role-fe-1',
    roadmap_id: 'roadmap-fe-1',
    status: 'active',
    ruleset_version: 'personalized-development-roadmap-v1',
    summary: 'Plan for Frontend Engineer',
    created_at: '2026-10-21T00:00:00Z',
    updated_at: '2026-10-21T00:00:00Z',
    archived_at: null,
    items: [
      {
        id: 'item-1',
        plan_id: 'plan-test-1',
        roadmap_item_id: 'rm-1',
        classification: 'evidence_found',
        priority: 'maintain',
        evidence_refs: [
          {
            source: 'cv_skills',
            snippet: 'Explicit skill evidence in candidate CV: "TypeScript"',
            matched_text: 'TypeScript',
            confidence: 'explicit',
          },
        ],
        display_order: 1,
        created_at: '2026-10-21T00:00:00Z',
        updated_at: '2026-10-21T00:00:00Z',
        skill_name: 'TypeScript & Type Safety',
        stage: 'core',
        skill_category: 'Programming Languages',
        description: 'Static typing and robust generics.',
        why_it_matters: 'Scale codebases without runtime defects.',
        competency_outcome: 'Build typed components with strict safety.',
        resources: [
          {
            id: 'res-1',
            roadmap_item_id: 'rm-1',
            title: 'TypeScript Handbook Official',
            provider_name: 'Microsoft',
            resource_type: 'documentation',
            url: 'https://www.typescriptlang.org/docs/handbook/intro.html',
            description: 'Comprehensive language reference.',
            access_type: 'free',
            difficulty: 'core',
            display_order: 1,
            status: 'published',
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
        ],
        courses: [
          {
            id: 'course-1',
            roadmap_item_id: 'rm-1',
            title: 'TypeScript in Depth',
            provider_name: 'TotalTypeScript',
            url: 'https://www.totaltypescript.com/tutorials',
            description: 'Deep dive into advanced TypeScript types.',
            why_this_course: 'High quality hands-on type challenges.',
            access_type: 'free',
            difficulty: 'core',
            display_order: 1,
            status: 'published',
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
        ],
      },
      {
        id: 'item-2',
        plan_id: 'plan-test-1',
        roadmap_item_id: 'rm-2',
        classification: 'development_focus',
        priority: 'now',
        evidence_refs: [],
        display_order: 2,
        created_at: '2026-10-21T00:00:00Z',
        updated_at: '2026-10-21T00:00:00Z',
        skill_name: 'Semantic HTML5 & Accessible Markup',
        stage: 'foundation',
        skill_category: 'Web Standards',
        description: 'Accessible DOM and WCAG standards.',
        why_it_matters: 'Forms the baseline of inclusive design.',
        competency_outcome: 'Build semantic HTML with valid ARIA.',
      },
    ],
  };

  const mockSummaryCounts: CandidatePlanSummaryCounts = {
    total_skills: 2,
    evidence_found: 1,
    development_focus: 1,
    review_needed: 0,
    priority_now: 1,
    priority_next: 0,
    priority_later: 0,
    priority_maintain: 1,
  };

  it('renders Coming Soon banner when featureEnabled is false', () => {
    render(
      <PersonalizedDevelopmentPlanView
        roleSlug={roleSlug}
        roleTitle={roleTitle}
        plan={null}
        featureEnabled={false}
        onPlanUpdated={vi.fn()}
      />
    );

    expect(screen.getByText(/Personalized Development Roadmap — Coming Soon/i)).toBeDefined();
    expect(screen.getByText(/Preview Access Required/i)).toBeDefined();
  });

  it('renders empty state prompting generation with Create My Development Roadmap when featureEnabled is true and plan is null', () => {
    render(
      <PersonalizedDevelopmentPlanView
        roleSlug={roleSlug}
        roleTitle={roleTitle}
        plan={null}
        featureEnabled={true}
        onPlanUpdated={vi.fn()}
      />
    );

    expect(screen.getByText(/No Development Plan Generated Yet/i)).toBeDefined();
    expect(screen.getAllByRole('button', { name: /Create My Development Roadmap/i }).length).toBeGreaterThan(0);
  });

  it('renders summary metrics, priority tabs, disclaimer, and skill items when plan is present', () => {
    render(
      <PersonalizedDevelopmentPlanView
        roleSlug={roleSlug}
        roleTitle={roleTitle}
        plan={mockPlan}
        summaryCounts={mockSummaryCounts}
        featureEnabled={true}
        onPlanUpdated={vi.fn()}
      />
    );

    // Metrics & Tabs
    expect(screen.getAllByText('Focus Now').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Evidence Found / Maintain').length).toBeGreaterThan(0);

    // Skill names
    expect(screen.getByText('TypeScript & Type Safety')).toBeDefined();
    expect(screen.getByText('Semantic HTML5 & Accessible Markup')).toBeDefined();

    // Classification badges
    expect(screen.getByText('Evidence Found')).toBeDefined();
    expect(screen.getByText('Development Focus')).toBeDefined();

    // Exact disclaimer required by Stage 7.5
    expect(
      screen.getByText(
        /This roadmap is based only on the career evidence currently available in your QWERTY profile and approved CV data/i
      )
    ).toBeDefined();
  });

  it('renders stale evidence banner when isStale is true without auto-regenerating', () => {
    render(
      <PersonalizedDevelopmentPlanView
        roleSlug={roleSlug}
        roleTitle={roleTitle}
        plan={mockPlan}
        summaryCounts={mockSummaryCounts}
        isStale={true}
        featureEnabled={true}
        onPlanUpdated={vi.fn()}
      />
    );

    expect(
      screen.getByText('Your career evidence has changed since this roadmap was created.')
    ).toBeDefined();
    expect(screen.getAllByRole('button', { name: /Refresh Roadmap/i }).length).toBeGreaterThan(0);
  });

  it('filters skills when clicking priority filter tabs', () => {
    render(
      <PersonalizedDevelopmentPlanView
        roleSlug={roleSlug}
        roleTitle={roleTitle}
        plan={mockPlan}
        summaryCounts={mockSummaryCounts}
        featureEnabled={true}
        onPlanUpdated={vi.fn()}
      />
    );

    // Click Focus Now filter button
    const nowButton = screen.getByRole('button', { name: /^Focus Now/ });
    fireEvent.click(nowButton);

    // Should only show the Focus Now item
    expect(screen.getByText('Semantic HTML5 & Accessible Markup')).toBeDefined();
    expect(screen.queryByText('TypeScript & Type Safety')).toBeNull();
  });

  it('expands skill item to reveal evidence analysis, learning resources, and courses', () => {
    render(
      <PersonalizedDevelopmentPlanView
        roleSlug={roleSlug}
        roleTitle={roleTitle}
        plan={mockPlan}
        summaryCounts={mockSummaryCounts}
        featureEnabled={true}
        onPlanUpdated={vi.fn()}
      />
    );

    // Click on TypeScript skill card to expand
    const tsSkillHeader = screen.getByText('TypeScript & Type Safety');
    fireEvent.click(tsSkillHeader);

    // Verify expanded details
    expect(screen.getByText(/Explicit skill evidence in candidate CV/i)).toBeDefined();
    expect(screen.getByText(/TypeScript Handbook Official/i)).toBeDefined();
    expect(screen.getByText(/TypeScript in Depth/i)).toBeDefined();
  });
});
