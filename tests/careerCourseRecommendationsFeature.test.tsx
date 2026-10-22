/**
 * QWERTY Stage 7.4 — Career Course Recommendations UI Component Tests
 * Tests CareerRoleCoursesView rendering, stage filtering, safe link attributes, provider neutrality, and empty states.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CareerRoleCoursesView } from '../src/features/career/CareerRoleCoursesView.js';
import { careerService, RoleCourseRecommendationsResponse } from '../src/features/career/career.service.js';

const mockCourseResponse: RoleCourseRecommendationsResponse = {
  role: {
    id: 'a1000000-0000-0000-0000-000000000001',
    slug: 'frontend-engineer',
    title: 'Frontend Engineer',
    career_area: 'Software Engineering'
  },
  roadmap: {
    id: 'b1000000-0000-0000-0000-000000000001',
    title: 'Frontend Engineering Skill Roadmap',
    version: 1,
    version_label: 'v1',
    status: 'published'
  },
  total_courses: 3,
  courses: [
    {
      id: 'course-1',
      roadmap_item_id: 'item-1',
      title: 'W3C Introduction to Web Accessibility',
      provider_name: 'W3C & edX',
      url: 'https://www.edx.org/learn/web-development/w3c-introduction-to-web-accessibility',
      description: 'Foundational course covering digital accessibility principles and WCAG standards.',
      why_this_course: 'Provides authoritative instruction directly from the standards body.',
      access_type: 'free',
      difficulty: 'foundation',
      display_order: 1,
      status: 'published',
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
      skill: {
        id: 'item-1',
        skill_name: 'Semantic HTML5 & Accessible Markup',
        stage: 'foundation',
        display_order: 1
      }
    },
    {
      id: 'course-2',
      roadmap_item_id: 'item-2',
      title: 'Full Stack Open: React Component Architecture',
      provider_name: 'University of Helsinki',
      url: 'https://fullstackopen.com/en/part1',
      description: 'In-depth university curriculum covering modern React component design and state management.',
      why_this_course: 'Teaches functional component patterns and lifecycle management.',
      access_type: 'free',
      difficulty: 'core',
      display_order: 2,
      status: 'published',
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
      skill: {
        id: 'item-2',
        skill_name: 'React Component Architecture & Hooks',
        stage: 'core',
        display_order: 2
      }
    },
    {
      id: 'course-3',
      roadmap_item_id: 'item-3',
      title: 'Advanced Web Performance Engineering',
      provider_name: 'web.dev by Google',
      url: 'https://web.dev/learn/performance/',
      description: 'Comprehensive course on Core Web Vitals optimization and runtime profiling.',
      why_this_course: 'Directly aligned with real-world browser rendering engines and latency metrics.',
      access_type: 'free_account_required',
      difficulty: 'advanced',
      display_order: 3,
      status: 'published',
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
      skill: {
        id: 'item-3',
        skill_name: 'Web Performance Optimization',
        stage: 'advanced',
        display_order: 3
      }
    }
  ]
};

describe('Stage 7.4 — CareerRoleCoursesView Component Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders curated courses with titles, providers, skills, descriptions, and why_this_course', async () => {
    vi.spyOn(careerService, 'getRoleCourses').mockResolvedValue(mockCourseResponse);

    render(<CareerRoleCoursesView roleSlug="frontend-engineer" roleTitle="Frontend Engineer" />);

    await waitFor(() => {
      expect(screen.getByText('W3C Introduction to Web Accessibility')).toBeDefined();
    });

    expect(screen.getByText('W3C & edX')).toBeDefined();
    expect(screen.getByText(/Semantic HTML5 & Accessible Markup/)).toBeDefined();
    expect(screen.getByText('Full Stack Open: React Component Architecture')).toBeDefined();
    expect(screen.getByText('University of Helsinki')).toBeDefined();
    expect(screen.getByText('Advanced Web Performance Engineering')).toBeDefined();
    expect(screen.getByText('web.dev by Google')).toBeDefined();

    // Check "Why this course" sections
    const whyHeadings = screen.getAllByText('Why this course');
    expect(whyHeadings.length).toBe(3);
  });

  it('renders safe external links with target="_blank" and rel="noopener noreferrer"', async () => {
    vi.spyOn(careerService, 'getRoleCourses').mockResolvedValue(mockCourseResponse);

    render(<CareerRoleCoursesView roleSlug="frontend-engineer" roleTitle="Frontend Engineer" />);

    await waitFor(() => {
      expect(screen.getByText('W3C Introduction to Web Accessibility')).toBeDefined();
    });

    const links = screen.getAllByRole('link', { name: /View course/i });
    expect(links.length).toBe(3);

    for (const link of links) {
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
      expect(link.getAttribute('href')?.startsWith('https://')).toBe(true);
    }
  });

  it('filters courses by stage (foundation, core, advanced)', async () => {
    vi.spyOn(careerService, 'getRoleCourses').mockResolvedValue(mockCourseResponse);

    render(<CareerRoleCoursesView roleSlug="frontend-engineer" roleTitle="Frontend Engineer" />);

    await waitFor(() => {
      expect(screen.getByText('W3C Introduction to Web Accessibility')).toBeDefined();
    });

    // Filter to Foundation
    const foundationBtn = screen.getByRole('button', { name: 'Foundation' });
    fireEvent.click(foundationBtn);

    expect(screen.getByText('W3C Introduction to Web Accessibility')).toBeDefined();
    expect(screen.queryByText('Full Stack Open: React Component Architecture')).toBeNull();
    expect(screen.queryByText('Advanced Web Performance Engineering')).toBeNull();

    // Filter to Core
    const coreBtn = screen.getByRole('button', { name: 'Core' });
    fireEvent.click(coreBtn);

    expect(screen.queryByText('W3C Introduction to Web Accessibility')).toBeNull();
    expect(screen.getByText('Full Stack Open: React Component Architecture')).toBeDefined();
    expect(screen.queryByText('Advanced Web Performance Engineering')).toBeNull();

    // Reset to All
    const allBtn = screen.getByRole('button', { name: 'All' });
    fireEvent.click(allBtn);

    expect(screen.getByText('W3C Introduction to Web Accessibility')).toBeDefined();
    expect(screen.getByText('Full Stack Open: React Component Architecture')).toBeDefined();
    expect(screen.getByText('Advanced Web Performance Engineering')).toBeDefined();
  });

  it('shows editorial empty state when no courses exist for role', async () => {
    vi.spyOn(careerService, 'getRoleCourses').mockResolvedValue({
      role: {
        id: 'a1000000-0000-0000-0000-000000000004',
        slug: 'mobile-developer',
        title: 'Mobile Developer',
        career_area: 'Mobile Engineering'
      },
      roadmap: null,
      courses: [],
      total_courses: 0
    });

    render(<CareerRoleCoursesView roleSlug="mobile-developer" roleTitle="Mobile Developer" />);

    await waitFor(() => {
      expect(screen.getByText(/Curated courses for this role are currently in editorial review/i)).toBeDefined();
    });
  });

  it('does not display commercial badges, ratings, star icons, or salary claims', async () => {
    vi.spyOn(careerService, 'getRoleCourses').mockResolvedValue(mockCourseResponse);

    const { container } = render(<CareerRoleCoursesView roleSlug="frontend-engineer" roleTitle="Frontend Engineer" />);

    await waitFor(() => {
      expect(screen.getByText('W3C Introduction to Web Accessibility')).toBeDefined();
    });

    const renderedText = container.textContent || '';

    // No salary speculation
    expect(renderedText).not.toMatch(/£\d+|\$\d+|salary|compensation/i);
    // No commercial / affiliate claims on course cards
    expect(renderedText).not.toMatch(/sponsored badge|promoted course|best course|#1 course|highest rated/i);
    // No AI claims
    expect(renderedText).not.toMatch(/ai recommended|recommended for you|perfect for you|get hired|boost your salary/i);
  });
});
