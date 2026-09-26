import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CvTailoringCard } from '../CvTailoringCard.js';
import { cvTailoringService } from '../cvTailoring.service.js';

describe('CvTailoringCard Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('B: flag false -> displays Evidence-Safe CV Tailoring title, Coming Soon badge, and explanatory body', async () => {
    vi.spyOn(cvTailoringService, 'getJobTailoringStatus').mockResolvedValue({
      session: null,
      is_public_enabled: false
    });

    render(
      <BrowserRouter>
        <CvTailoringCard jobId="job-1" jobTitle="Network Engineer" companyName="Acme Corp" />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Evidence-Safe CV Tailoring')).toBeDefined();
      expect(screen.getByText('Coming Soon', { exact: false })).toBeDefined();
      expect(screen.getByText(/Tailor your CV to a specific role while keeping every claim grounded/i)).toBeDefined();
      expect(screen.getByText(/QWERTY is preparing this feature for a future release/i)).toBeDefined();
    });

    // C: Tailor My CV button must be absent
    expect(screen.queryByText(/Tailor My CV for This Role/i)).toBeNull();
    expect(screen.queryByText(/Generate Fresh Version/i)).toBeNull();

    // G: no quota or provider error displayed
    expect(screen.queryByText(/temporarily unavailable/i)).toBeNull();
    expect(screen.queryByText(/quota/i)).toBeNull();
    expect(screen.queryByText(/billing/i)).toBeNull();
    expect(screen.queryByText(/GEMINI/i)).toBeNull();
  });

  it('H: flag true -> existing Tailor My CV button remains available', async () => {
    vi.spyOn(cvTailoringService, 'getJobTailoringStatus').mockResolvedValue({
      session: null,
      is_public_enabled: true
    });

    render(
      <BrowserRouter>
        <CvTailoringCard jobId="job-1" jobTitle="Network Engineer" companyName="Acme Corp" />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Tailor My CV for This Role/i)).toBeDefined();
    });

    expect(screen.queryByText(/Coming Soon/i)).toBeNull();
  });

  it('allows inspectable historical draft button when previous completed session exists even when flag is false', async () => {
    vi.spyOn(cvTailoringService, 'getJobTailoringStatus').mockResolvedValue({
      session: {
        id: 'sess-historical-1',
        status: 'completed',
        tailoring_status: 'draft',
      } as any,
      is_public_enabled: false
    });

    render(
      <BrowserRouter>
        <CvTailoringCard jobId="job-1" jobTitle="Network Engineer" companyName="Acme Corp" />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Coming Soon/i)).toBeDefined();
      expect(screen.getByText(/View Historical Draft/i)).toBeDefined();
    });

    // Still no mutate buttons
    expect(screen.queryByText(/Tailor My CV for This Role/i)).toBeNull();
    expect(screen.queryByText(/Generate Fresh Version/i)).toBeNull();
  });
});
