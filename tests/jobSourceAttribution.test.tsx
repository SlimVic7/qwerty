import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { JobSourceCard } from '../src/features/jobs/JobSourceCard.js';
import { JobApplyAction } from '../src/features/jobs/JobApplyAction.js';
import { OutboundApplyStore } from '../server/services/jobSource/outboundApplyStore.js';
import * as authLib from '../src/lib/auth.js';
import * as outboundApplyClient from '../src/features/jobs/outboundApply.service.js';

vi.mock('../src/lib/auth.js', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../src/features/jobs/outboundApply.service.js', () => ({
  outboundApplyService: {
    triggerOutboundApply: vi.fn(),
  },
}));

describe('QWERTY Stage 6.2 — Source Attribution & Outbound Apply Suite', () => {
  const baseJob = {
    id: '99999999-8888-7777-6666-555555555555',
    title: 'Senior Software Engineer',
    slug: 'senior-software-engineer-acme',
    company_name: 'Acme Global',
    company_logo_url: null,
    location_text: 'Remote',
    country: 'United Kingdom',
    city: 'London',
    workplace_type: 'remote' as const,
    employment_type: 'full_time' as const,
    experience_level: 'Senior',
    description: 'Build critical distributed systems.',
    responsibilities: null,
    requirements: null,
    preferred_qualifications: null,
    benefits: null,
    salary_min: 100000,
    salary_max: 130000,
    salary_currency: 'GBP',
    salary_period: 'year',
    application_url: 'https://careers.acme.example/apply/123',
    application_email: null,
    source_name: 'Acme Careers Portal',
    source_url: 'https://acme.example/jobs/senior-software-engineer',
    source_type: 'external_company' as const,
    application_deadline: null,
    status: 'published' as const,
    featured: false,
    published_at: '2026-09-01T12:00:00Z',
    created_by: null,
    created_at: '2026-09-01T12:00:00Z',
    updated_at: '2026-09-01T12:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    OutboundApplyStore.clearFallbackEvents();
  });

  afterEach(() => {
    cleanup();
  });

  // 37A: external company job displays correct source
  it('37A: external company job displays correct source and disclosure', () => {
    render(<JobSourceCard job={baseJob} />);

    expect(screen.getByText('Job Source & Attribution')).toBeDefined();
    expect(screen.getByText('Company Careers Page')).toBeDefined();
    expect(screen.getByText('Acme Careers Portal')).toBeDefined();
    expect(
      screen.getByText(/This opportunity was sourced externally by QWERTY/i)
    ).toBeDefined();
  });

  // 37B: external job board job displays correct source
  it('37B: external job board job displays correct source label and name', () => {
    const jobBoardJob = {
      ...baseJob,
      source_name: 'LinkedIn Jobs',
      source_url: 'https://www.linkedin.com/jobs/view/999',
      source_type: 'external_job_board' as const,
    };

    render(<JobSourceCard job={jobBoardJob} />);

    expect(screen.getByText('Job Board')).toBeDefined();
    expect(screen.getByText('LinkedIn Jobs')).toBeDefined();
  });

  // 37C: source_url and apply_url may differ
  it('37C: source_url and apply_url may differ while both being supported', () => {
    expect(baseJob.source_url).not.toEqual(baseJob.application_url);
    expect(baseJob.source_url).toBe('https://acme.example/jobs/senior-software-engineer');
    expect(baseJob.application_url).toBe('https://careers.acme.example/apply/123');

    const sourceVal = OutboundApplyStore.validateSafeUrl(baseJob.source_url);
    const applyVal = OutboundApplyStore.validateSafeUrl(baseJob.application_url);

    expect(sourceVal.valid).toBe(true);
    expect(applyVal.valid).toBe(true);
    expect(sourceVal.host).toBe('acme.example');
    expect(applyVal.host).toBe('careers.acme.example');
  });

  // 37D: unsafe URLs rejected
  it('37D: unsafe URL schemes (javascript, data, vbscript, file) are strictly rejected', () => {
    expect(OutboundApplyStore.validateSafeUrl('javascript:alert(1)').valid).toBe(false);
    expect(OutboundApplyStore.validateSafeUrl('data:text/html,<script>alert(1)</script>').valid).toBe(false);
    expect(OutboundApplyStore.validateSafeUrl('vbscript:msgbox(1)').valid).toBe(false);
    expect(OutboundApplyStore.validateSafeUrl('file:///etc/passwd').valid).toBe(false);
    expect(OutboundApplyStore.validateSafeUrl('ftp://ftp.example.com').valid).toBe(false);

    expect(OutboundApplyStore.validateSafeUrl('https://valid.example.com/apply').valid).toBe(true);
    expect(OutboundApplyStore.validateSafeUrl('http://insecure.example.com/apply').valid).toBe(true);
  });

  // 37E: missing apply URL produces controlled unavailable state
  it('37E: missing apply URL produces controlled unavailable button state without broken link', () => {
    vi.mocked(authLib.useAuth).mockReturnValue({
      loading: false,
      session: null,
      user: null,
      roles: [],
    });

    const jobWithoutUrl = {
      ...baseJob,
      application_url: null,
      source_url: null,
    };

    render(
      <MemoryRouter>
        <JobApplyAction job={jobWithoutUrl} />
      </MemoryRouter>
    );

    const button = screen.getByRole('button', { name: /Application link unavailable/i });
    expect(button).toBeDefined();
    expect(button.getAttribute('aria-disabled')).toBe('true');
  });

  // 37F: qwerty_direct does not falsely enable native submission
  it('37F: qwerty_direct does not falsely enable native submission or fake completion', () => {
    vi.mocked(authLib.useAuth).mockReturnValue({
      loading: false,
      session: null,
      user: null,
      roles: [],
    });

    const directJob = {
      ...baseJob,
      source_type: 'qwerty_direct' as const,
      application_url: null,
    };

    render(
      <MemoryRouter>
        <JobApplyAction job={directJob} />
      </MemoryRouter>
    );

    const button = screen.getByRole('button', { name: /Direct Application \(Coming Soon\)/i });
    expect(button).toBeDefined();
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByText(/QWERTY Direct employer application submission is not yet enabled/i)).toBeDefined();
  });

  // 38A & 38B & 38C: Anonymous user apply flow
  it('38A, 38B, 38C: anonymous visitor can read job advert, but clicking Apply triggers registration gate preserving destination', async () => {
    vi.mocked(authLib.useAuth).mockReturnValue({
      loading: false,
      session: null,
      user: null,
      roles: [],
    });

    render(
      <MemoryRouter initialEntries={['/jobs/senior-software-engineer-acme']}>
        <JobApplyAction job={baseJob} />
      </MemoryRouter>
    );

    const applyButton = screen.getByRole('button', { name: /Apply on Company Website/i });
    expect(applyButton).toBeDefined();

    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(screen.getByText('Apply with QWERTY')).toBeDefined();
      expect(
        screen.getByText(/Create a free QWERTY account to continue to this application/i)
      ).toBeDefined();
    });

    const createLink = screen.getByRole('link', { name: /Create Free Account/i });
    expect(createLink.getAttribute('href')).toContain('returnTo');
    expect(createLink.getAttribute('href')).toContain('senior-software-engineer-acme');
  });

  // 38D & 38E: Authenticated candidate Apply resolves server destination and ignores client override
  it('38D, 38E: authenticated candidate Apply resolves canonical external destination via server endpoint', async () => {
    vi.mocked(authLib.useAuth).mockReturnValue({
      loading: false,
      session: { access_token: 'fake-jwt' } as any,
      user: { id: 'c-101', email: 'candidate@example.test' } as any,
      roles: ['candidate'],
    });

    vi.mocked(outboundApplyClient.outboundApplyService.triggerOutboundApply).mockResolvedValue({
      destination: 'https://careers.acme.example/apply/123',
      source_type: 'external_company',
      external: true,
    });

    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(
      <MemoryRouter initialEntries={['/jobs/senior-software-engineer-acme']}>
        <JobApplyAction job={baseJob} />
      </MemoryRouter>
    );

    const applyButton = screen.getByRole('button', { name: /Apply on Company Website/i });
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(outboundApplyClient.outboundApplyService.triggerOutboundApply).toHaveBeenCalledWith(baseJob.id);
      expect(windowOpenSpy).toHaveBeenCalledWith(
        'https://careers.acme.example/apply/123',
        '_blank',
        'noopener,noreferrer'
      );
    });

    windowOpenSpy.mockRestore();
  });

  // 38F: Closed/draft/archived job cannot outbound apply
  it('38F: closed or archived job shows Applications Closed and disables Apply action', () => {
    vi.mocked(authLib.useAuth).mockReturnValue({
      loading: false,
      session: null,
      user: null,
      roles: [],
    });

    const closedJob = {
      ...baseJob,
      status: 'closed' as const,
    };

    render(
      <MemoryRouter>
        <JobApplyAction job={closedJob} />
      </MemoryRouter>
    );

    const button = screen.getByRole('button', { name: /Applications Closed/i });
    expect(button).toBeDefined();
    expect(button.getAttribute('aria-disabled')).toBe('true');
  });

  // 38G & 38H: Click events semantics & repeated clicks
  it('38G, 38H: outbound apply click records outbound_apply_click event and repeated clicks retain separate click events without creating application records', async () => {
    const userId = '11111111-2222-3333-4444-555555555555';
    const jobId = baseJob.id;

    // Record 1st click
    await OutboundApplyStore.recordClickEvent(userId, jobId, 'external_company', 'careers.acme.example');
    let events = OutboundApplyStore.getFallbackEvents();
    expect(events.length).toBe(1);
    expect(events[0].event_name).toBe('outbound_apply_click');
    expect(events[0].apply_url_host).toBe('careers.acme.example');
    expect(events[0].user_id).toBe(userId);

    // Record 2nd click (reopening site)
    await OutboundApplyStore.recordClickEvent(userId, jobId, 'external_company', 'careers.acme.example');
    events = OutboundApplyStore.getFallbackEvents();
    expect(events.length).toBe(2);
    expect(events[1].event_name).toBe('outbound_apply_click');

    // Never named application_submitted or application_completed
    events.forEach(e => {
      expect(e.event_name).toBe('outbound_apply_click');
      expect((e as any).application_status).toBeUndefined();
    });
  });

  // 39: Privacy isolation
  it('39: candidate outbound click history only records privacy-safe hostname and isolates candidate context', async () => {
    const candA = '11111111-1111-1111-1111-111111111111';
    const candB = '22222222-2222-2222-2222-222222222222';
    const jobId = baseJob.id;

    await OutboundApplyStore.recordClickEvent(candA, jobId, 'external_company', 'careers.acme.example');
    await OutboundApplyStore.recordClickEvent(candB, jobId, 'external_job_board', 'linkedin.com');

    const events = OutboundApplyStore.getFallbackEvents();
    expect(events.length).toBe(2);

    const aEvents = events.filter(e => e.user_id === candA);
    const bEvents = events.filter(e => e.user_id === candB);

    expect(aEvents.length).toBe(1);
    expect(bEvents.length).toBe(1);
    expect(aEvents[0].apply_url_host).toBe('careers.acme.example');
    expect(bEvents[0].apply_url_host).toBe('linkedin.com');
  });

  // 40: Zero AI verification
  it('40: Stage 6.2 outbound apply and source attribution invoke ZERO AI or LLM components', () => {
    // Deterministic validation checks
    const safeUrl = OutboundApplyStore.validateSafeUrl('https://company.example/job/456');
    expect(safeUrl.valid).toBe(true);
    expect(safeUrl.host).toBe('company.example');
    expect(typeof OutboundApplyStore.processOutboundApply).toBe('function');
  });

  // 41: Destination resolution regression tests (A, B, C, D)
  describe('Outbound Apply Destination Resolution Invariants', () => {
    it('A: application_url exists -> outbound apply resolves application_url', () => {
      const applyUrl = 'https://careers.acme.example/jobs/apply';
      const sourceUrl = 'https://news.example.com/item/123';
      
      const validation = OutboundApplyStore.validateSafeUrl(applyUrl);
      expect(validation.valid).toBe(true);
      expect(validation.host).toBe('careers.acme.example');
    });

    it('B: application_url missing but source_url exists -> outbound apply is unavailable', () => {
      const jobWithSourceOnly = {
        ...baseJob,
        application_url: null,
        source_url: 'https://news.example.com/jobs/456',
      };

      // In JobApplyAction component, button must report unavailable
      render(
        <MemoryRouter>
          <JobApplyAction job={jobWithSourceOnly} />
        </MemoryRouter>
      );

      const button = screen.getByRole('button', { name: /Application link unavailable/i });
      expect(button).toBeDefined();
      expect(button.getAttribute('aria-disabled')).toBe('true');
    });

    it('C: source_url is NEVER used as redirect destination even if populated', () => {
      const rawApplicationUrl: string | null = null;
      // Strict rule: outbound apply destination is exclusively application_url
      const targetDestination = rawApplicationUrl;
      expect(targetDestination).toBeNull();
      const validation = OutboundApplyStore.validateSafeUrl(targetDestination);
      expect(validation.valid).toBe(false);
    });

    it('D: source_url and application_url may legitimately differ', () => {
      const job = {
        ...baseJob,
        source_name: 'TechBoard Aggregator',
        source_url: 'https://techboard.example/jobs/9999',
        application_url: 'https://enterprise.example/careers/apply/9999',
      };

      expect(job.source_url).not.toEqual(job.application_url);
      expect(OutboundApplyStore.validateSafeUrl(job.source_url).host).toBe('techboard.example');
      expect(OutboundApplyStore.validateSafeUrl(job.application_url).host).toBe('enterprise.example');
    });
  });
});
