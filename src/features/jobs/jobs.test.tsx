import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { JobsPage } from './JobsPage';
import { JobDetailPage } from './JobDetailPage';
import * as jobsService from './jobs.service';

vi.mock('./jobs.service', () => ({
  getPublishedJobs: vi.fn(),
  getPublishedJobBySlug: vi.fn()
}));

const mockJob: jobsService.Job = {
  id: '123',
  title: 'Software Engineer',
  slug: 'software-engineer',
  company_name: 'Tech Corp',
  company_logo_url: null,
  location_text: 'London',
  country: 'UK',
  city: 'London',
  workplace_type: 'hybrid',
  employment_type: 'full_time',
  experience_level: 'Mid-Level',
  description: 'Great role',
  responsibilities: 'Code things',
  requirements: 'Know TS',
  preferred_qualifications: null,
  benefits: null,
  salary_min: null,
  salary_max: null,
  salary_currency: null,
  salary_period: null,
  application_url: 'https://example.com',
  application_email: null,
  source_name: null,
  source_url: null,
  application_deadline: null,
  status: 'published',
  featured: false,
  published_at: new Date().toISOString(),
  created_by: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

describe('Jobs Public Foundation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders published jobs on the jobs page', async () => {
    vi.mocked(jobsService.getPublishedJobs).mockResolvedValue([mockJob]);

    render(
      <MemoryRouter>
        <JobsPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Loading opportunities...')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Software Engineer')).toBeDefined();
    });

    expect(screen.getByText('Tech Corp')).toBeDefined();
    expect(screen.getByText('London')).toBeDefined();
  });

  it('handles zero-job default empty state', async () => {
    vi.mocked(jobsService.getPublishedJobs).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <JobsPage />
      </MemoryRouter>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getAllByText('New opportunities are coming soon').length).toBeGreaterThan(0);
      expect(screen.queryByText('Clear all filters')).toBeNull();
    });
  });

  it('renders job detail page for valid slug', async () => {
    vi.mocked(jobsService.getPublishedJobBySlug).mockResolvedValue(mockJob);

    render(
      <MemoryRouter initialEntries={['/jobs/software-engineer']}>
        <Routes>
          <Route path="/jobs/:slug" element={<JobDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Software Engineer').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText('Tech Corp').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Great role').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Apply Now').length).toBeGreaterThan(0);
    
    // Check apply link href
    const applyButton = screen.getAllByText('Apply Now')[0].closest('a');
    expect(applyButton).toHaveProperty('href', 'https://example.com/');
  });

  it('handles unknown slug / not found state gracefully', async () => {
    vi.mocked(jobsService.getPublishedJobBySlug).mockResolvedValue(null);

    render(
      <MemoryRouter initialEntries={['/jobs/unknown-slug']}>
        <Routes>
          <Route path="/jobs/:slug" element={<JobDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Job Unavailable')).toBeDefined();
    });
    
    expect(screen.getByText('Job not found or is no longer available.')).toBeDefined();
  });
});
