import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { careerService, CareerRole, CareerRoleRoadmap } from '../src/features/career/career.service.js';
import { CareerRoleDetailPage } from '../src/features/career/CareerRoleDetailPage.js';
import { SkillRoadmapView } from '../src/features/career/SkillRoadmapView.js';

vi.mock('../src/features/career/career.service.js', () => ({
  careerService: {
    getRoles: vi.fn(),
    getRoleBySlug: vi.fn(),
    getRoleRoadmap: vi.fn(),
    getAreas: vi.fn()
  }
}));

const mockRole: CareerRole = {
  id: 'a1000000-0000-0000-0000-000000000001',
  slug: 'frontend-engineer',
  title: 'Frontend Engineer',
  short_summary: 'Builds responsive, performant user interfaces.',
  career_area: 'Software Engineering',
  overview: 'Frontend Engineers specialize in user-facing client code.',
  responsibilities: ['Build UI components', 'Optimize web performance'],
  core_skills: ['TypeScript', 'React', 'CSS3'],
  supporting_skills: ['Vitest', 'Vite'],
  typical_background: 'Bootcamps, CS degrees, or self-directed portfolios.',
  career_progression: [
    { stage: 'Junior', title: 'Junior Frontend Developer', description: 'Builds basic components.' },
    { stage: 'Senior', title: 'Senior Frontend Engineer', description: 'Architects UI systems.' }
  ],
  related_roles: [
    { slug: 'full-stack-engineer', title: 'Full-Stack Engineer', career_area: 'Software Engineering' }
  ],
  status: 'published',
  display_order: 1,
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-01T00:00:00Z'
};

const mockRoadmap: CareerRoleRoadmap = {
  id: 'b1000000-0000-0000-0000-000000000001',
  career_role_id: 'a1000000-0000-0000-0000-000000000001',
  version: 1,
  version_label: 'v1',
  title: 'Frontend Engineering Skill Roadmap',
  summary: 'Structured progression from web standards to high-performance rendering.',
  status: 'published',
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-01T00:00:00Z',
  items: [
    {
      id: 'c1000000-0000-0000-0000-000000000001',
      roadmap_id: 'b1000000-0000-0000-0000-000000000001',
      stage: 'foundation',
      skill_name: 'Semantic HTML5 & Accessibility',
      skill_category: 'Web Standards',
      description: 'Document structure and accessible markup practices.',
      why_it_matters: 'Essential for screen reader accessibility and SEO indexing.',
      competency_outcome: 'Builds valid, accessible multi-page documents.',
      evidence_examples: [
        'Lighthouse 100% accessibility audit report',
        'Keyboard-navigable dialog modal demo'
      ],
      display_order: 1,
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z'
    },
    {
      id: 'c1000000-0000-0000-0000-000000000002',
      roadmap_id: 'b1000000-0000-0000-0000-000000000001',
      stage: 'core',
      skill_name: 'TypeScript for Client Applications',
      skill_category: 'Type Systems',
      description: 'Static typing and interfaces across React components.',
      why_it_matters: 'Prevents client-side runtime errors and improves refactoring safety.',
      competency_outcome: 'Can model complex UI states with zero untyped escape hatches.',
      evidence_examples: [
        'Strictly typed React application repository',
        'Generic data table component with inferred types'
      ],
      display_order: 2,
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z'
    },
    {
      id: 'c1000000-0000-0000-0000-000000000003',
      roadmap_id: 'b1000000-0000-0000-0000-000000000001',
      stage: 'advanced',
      skill_name: 'Web Performance & Core Web Vitals',
      skill_category: 'Performance Engineering',
      description: 'LCP, INP, and CLS diagnostic profiling and optimization.',
      why_it_matters: 'Fast page interaction drives user satisfaction and conversions.',
      competency_outcome: 'Can diagnose main-thread long tasks and optimize render pipelines.',
      evidence_examples: [
        'Case study improving LCP from 3.5s to <1.5s',
        'Virtualized list rendering 10k items at 60fps'
      ],
      display_order: 3,
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z'
    }
  ]
};

describe('Skill Roadmaps Frontend Feature (Stage 7.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SkillRoadmapView component', () => {
    it('renders roadmap title, summary, and all stages by default', () => {
      render(<SkillRoadmapView roleTitle="Frontend Engineer" roadmap={mockRoadmap} />);

      expect(screen.getByText('Skill Roadmap for Frontend Engineer')).toBeDefined();
      expect(screen.getByText(mockRoadmap.summary)).toBeDefined();
      expect(screen.getByText('Semantic HTML5 & Accessibility')).toBeDefined();
      expect(screen.getByText('TypeScript for Client Applications')).toBeDefined();
      expect(screen.getByText('Web Performance & Core Web Vitals')).toBeDefined();
    });

    it('filters roadmap items by stage when segmented tabs are clicked', () => {
      render(<SkillRoadmapView roleTitle="Frontend Engineer" roadmap={mockRoadmap} />);

      // Filter by Foundation only
      const foundationTab = screen.getByRole('button', { name: /Foundation/i });
      fireEvent.click(foundationTab);

      expect(screen.getByText('Semantic HTML5 & Accessibility')).toBeDefined();
      expect(screen.queryByText('TypeScript for Client Applications')).toBeNull();
      expect(screen.queryByText('Web Performance & Core Web Vitals')).toBeNull();

      // Filter by Core only
      const coreTab = screen.getByRole('button', { name: /Core Skills/i });
      fireEvent.click(coreTab);

      expect(screen.queryByText('Semantic HTML5 & Accessibility')).toBeNull();
      expect(screen.getByText('TypeScript for Client Applications')).toBeDefined();
      expect(screen.queryByText('Web Performance & Core Web Vitals')).toBeNull();
    });

    it('expands item to reveal why it matters, competency outcome, and evidence examples', () => {
      render(<SkillRoadmapView roleTitle="Frontend Engineer" roadmap={mockRoadmap} />);

      // The first item of foundation is open by default
      expect(screen.getByText('Essential for screen reader accessibility and SEO indexing.')).toBeDefined();
      expect(screen.getByText('Lighthouse 100% accessibility audit report')).toBeDefined();

      // Collapse all
      const collapseBtn = screen.getByRole('button', { name: /Collapse all/i });
      fireEvent.click(collapseBtn);

      expect(screen.queryByText('Essential for screen reader accessibility and SEO indexing.')).toBeNull();

      // Now click to expand Semantic HTML5 item
      const itemTrigger = screen.getByText('Semantic HTML5 & Accessibility');
      fireEvent.click(itemTrigger);

      expect(screen.getByText('Essential for screen reader accessibility and SEO indexing.')).toBeDefined();
      expect(screen.getByText('Lighthouse 100% accessibility audit report')).toBeDefined();
    });
  });

  describe('CareerRoleDetailPage Integration', () => {
    it('renders Role Benchmark tab by default and allows switching to Skill Roadmap', async () => {
      vi.mocked(careerService.getRoleBySlug).mockResolvedValue(mockRole);
      vi.mocked(careerService.getRoleRoadmap).mockResolvedValue({
        role: { id: mockRole.id, slug: mockRole.slug, title: mockRole.title, career_area: mockRole.career_area },
        roadmap: mockRoadmap
      });

      render(
        <MemoryRouter initialEntries={['/candidate/career/roles/frontend-engineer']}>
          <Routes>
            <Route path="/candidate/career/roles/:slug" element={<CareerRoleDetailPage />} />
            <Route path="/candidate/career/roles/:slug/roadmap" element={<CareerRoleDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: 'Frontend Engineer' })).toBeDefined();
        expect(screen.getByText('Role Overview')).toBeDefined();
      });

      // Switch to Skill Roadmap tab
      const roadmapTab = screen.getByTestId('tab-roadmap');
      fireEvent.click(roadmapTab);

      await waitFor(() => {
        expect(screen.getByText('Skill Roadmap for Frontend Engineer')).toBeDefined();
        expect(screen.getByText('Semantic HTML5 & Accessibility')).toBeDefined();
      });
    });

    it('opens directly in Roadmap tab when navigating to /roles/:slug/roadmap', async () => {
      vi.mocked(careerService.getRoleBySlug).mockResolvedValue(mockRole);
      vi.mocked(careerService.getRoleRoadmap).mockResolvedValue({
        role: { id: mockRole.id, slug: mockRole.slug, title: mockRole.title, career_area: mockRole.career_area },
        roadmap: mockRoadmap
      });

      render(
        <MemoryRouter initialEntries={['/candidate/career/roles/frontend-engineer/roadmap']}>
          <Routes>
            <Route path="/candidate/career/roles/:slug" element={<CareerRoleDetailPage />} />
            <Route path="/candidate/career/roles/:slug/roadmap" element={<CareerRoleDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Skill Roadmap for Frontend Engineer')).toBeDefined();
      });
    });

    it('renders restrained Roadmap coming soon when role has no published roadmap', async () => {
      vi.mocked(careerService.getRoleBySlug).mockResolvedValue(mockRole);
      vi.mocked(careerService.getRoleRoadmap).mockResolvedValue({
        role: { id: mockRole.id, slug: mockRole.slug, title: mockRole.title, career_area: mockRole.career_area },
        roadmap: null,
        message: 'No published roadmap'
      });

      render(
        <MemoryRouter initialEntries={['/candidate/career/roles/frontend-engineer/roadmap']}>
          <Routes>
            <Route path="/candidate/career/roles/:slug" element={<CareerRoleDetailPage />} />
            <Route path="/candidate/career/roles/:slug/roadmap" element={<CareerRoleDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: /Roadmap coming soon/i })).toBeDefined();
      });
    });
  });
});
