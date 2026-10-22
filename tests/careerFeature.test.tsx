import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { careerService, CareerRole } from '../src/features/career/career.service.js';
import { CareerHubPage } from '../src/features/career/CareerHubPage.js';
import { CareerRoleLibraryPage } from '../src/features/career/CareerRoleLibraryPage.js';
import { CareerRoleDetailPage } from '../src/features/career/CareerRoleDetailPage.js';

vi.mock('../src/features/career/career.service.js', () => ({
  careerService: {
    getRoles: vi.fn(),
    getRoleBySlug: vi.fn(),
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

describe('Career Hub & Role Library Frontend (Stage 7.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CareerHubPage', () => {
    it('renders Career Hub hero, four roadmap pillars, and career areas', async () => {
      vi.mocked(careerService.getAreas).mockResolvedValue([
        { name: 'Software Engineering', count: 4 },
        { name: 'Data & Analytics', count: 3 }
      ]);

      render(
        <MemoryRouter>
          <CareerHubPage />
        </MemoryRouter>
      );

      expect(screen.getByText('QWERTY Career Hub')).toBeDefined();
      expect(screen.getByText('Career Role Library')).toBeDefined();
      expect(screen.getByText('Skill Roadmaps')).toBeDefined();
      expect(screen.getByText('Learning Resources')).toBeDefined();
      expect(screen.getByText('Course Recommendations')).toBeDefined();

      await waitFor(() => {
        expect(screen.getByText('Software Engineering')).toBeDefined();
        expect(screen.getByText('Data & Analytics')).toBeDefined();
      });
    });
  });

  describe('CareerRoleLibraryPage', () => {
    it('renders roles and allows filtering by search term', async () => {
      vi.mocked(careerService.getRoles).mockResolvedValue({
        roles: [mockRole],
        total: 1,
        areas: [{ name: 'Software Engineering', count: 1 }]
      });

      render(
        <MemoryRouter>
          <CareerRoleLibraryPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Frontend Engineer')).toBeDefined();
        expect(screen.getByText('Builds responsive, performant user interfaces.')).toBeDefined();
      });

      // Filter via search input
      const searchInput = screen.getByPlaceholderText(/e.g. Frontend/i);
      fireEvent.change(searchInput, { target: { value: 'Frontend' } });
      expect(screen.getByText('Frontend Engineer')).toBeDefined();

      // Non-matching query
      fireEvent.change(searchInput, { target: { value: 'UnmatchedSpecialist' } });
      expect(screen.getByText(/No matching career roles found/i)).toBeDefined();
    });
  });

  describe('CareerRoleDetailPage', () => {
    it('renders comprehensive role profile, responsibilities, skills, and progression', async () => {
      vi.mocked(careerService.getRoleBySlug).mockResolvedValue(mockRole);

      render(
        <MemoryRouter initialEntries={['/candidate/career/roles/frontend-engineer']}>
          <Routes>
            <Route path="/candidate/career/roles/:slug" element={<CareerRoleDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: 'Frontend Engineer' })).toBeDefined();
        expect(screen.getByText('Build UI components')).toBeDefined();
        expect(screen.getByText('TypeScript')).toBeDefined();
        expect(screen.getByText('Junior Frontend Developer')).toBeDefined();
        expect(screen.getByText('Full-Stack Engineer')).toBeDefined();
      });
    });

    it('renders not found state when slug does not exist', async () => {
      vi.mocked(careerService.getRoleBySlug).mockRejectedValue(new Error('ROLE_NOT_FOUND'));

      render(
        <MemoryRouter initialEntries={['/candidate/career/roles/unknown-role']}>
          <Routes>
            <Route path="/candidate/career/roles/:slug" element={<CareerRoleDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Career Role Not Found/i)).toBeDefined();
      });
    });
  });
});
