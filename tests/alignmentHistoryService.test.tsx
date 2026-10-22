import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import * as alignmentService from '../src/features/alignmentHistory/alignmentHistory.service.js';
import { AlignmentHistoryCard } from '../src/features/alignmentHistory/AlignmentHistoryCard.js';
import { authFetch } from '../src/lib/authFetch.js';

// Mock authFetch
vi.mock('../src/lib/authFetch.js', () => ({
  authFetch: vi.fn()
}));

// Mock useAuth
vi.mock('../src/lib/auth.js', () => ({
  useAuth: () => ({
    user: { id: 'candidate-123', email: 'auditor@example.com' },
    role: 'candidate',
    loading: false
  })
}));

describe('Alignment History Frontend Integration & Service Contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('A: AlignmentHistoryCard loads history without res.json error and renders', async () => {
    const mockHistoryResponse: alignmentService.AlignmentHistoryResponse = {
      analysis_version: 'alignment-history-v1',
      job_id: 'job-auditor-1',
      job_title: 'Senior Internal Auditor',
      company_name: 'Apex Finance',
      current_job_updated_at: '2026-09-20T10:00:00.000Z',
      current_alignment_id: 'align-v13-latest',
      current_parse_id: 'parse-100',
      current_applied_at: '2026-09-20T10:00:00.000Z',
      history: [
        {
          alignment_id: 'align-v13-latest',
          created_at: '2026-09-21T10:00:00.000Z',
          status: 'completed',
          score: 18,
          max_score: 100,
          ruleset_version: 'job-alignment-v1.3',
          parse_id: 'parse-100',
          candidate_applied_at: '2026-09-20T10:00:00.000Z',
          job_id: 'job-auditor-1',
          job_updated_at: '2026-09-20T10:00:00.000Z',
          job_title: 'Senior Internal Auditor',
          company_name: 'Apex Finance',
          matched_count: 2,
          partially_supported_count: 1,
          not_found_count: 7,
          not_applicable_count: 0,
          total_criteria_count: 10,
          is_current: true,
          is_stale: false,
          stale_reasons: [],
          stale_labels: []
        },
        {
          alignment_id: 'align-v12-prior',
          created_at: '2026-09-10T10:00:00.000Z',
          status: 'completed',
          score: 22,
          max_score: 100,
          ruleset_version: 'job-alignment-v1.2',
          parse_id: 'parse-100',
          candidate_applied_at: '2026-09-20T10:00:00.000Z',
          job_id: 'job-auditor-1',
          job_updated_at: '2026-09-20T10:00:00.000Z',
          job_title: 'Senior Internal Auditor',
          company_name: 'Apex Finance',
          matched_count: 2,
          partially_supported_count: 2,
          not_found_count: 6,
          not_applicable_count: 0,
          total_criteria_count: 10,
          is_current: false,
          is_stale: true,
          stale_reasons: ['RULESET_CHANGED'],
          stale_labels: ['Historical Methodology']
        }
      ],
      total_count: 2,
      has_current_alignment: true,
      interpretation_notice: 'QWERTY alignment notice'
    };

    // authFetch returns the already-parsed JSON data (NOT a Response object)
    (authFetch as any).mockResolvedValue(mockHistoryResponse);

    render(
      <BrowserRouter>
        <AlignmentHistoryCard
          jobId="job-auditor-1"
          jobTitle="Senior Internal Auditor"
          companyName="Apex Finance"
        />
      </BrowserRouter>
    );

    // Verify card renders successfully without any "res.json is not a function" error
    await waitFor(() => {
      expect(screen.getByText('Alignment History')).toBeDefined();
      expect(screen.getByText('2 historical analyses recorded')).toBeDefined();
      expect(screen.getByText('18%')).toBeDefined();
      expect(screen.getByText('22%')).toBeDefined();
      expect(screen.getByText('Compare Analyses')).toBeDefined();
    });

    expect(screen.queryByText(/res\.json is not a function/i)).toBeNull();
  });

  it('B: alignmentHistory.service getAlignmentHistory follows actual authFetch contract', async () => {
    const rawParsedData = {
      analysis_version: 'alignment-history-v1',
      job_id: 'job-1',
      history: []
    };
    (authFetch as any).mockResolvedValue(rawParsedData);

    const result = await alignmentService.getAlignmentHistory('job-1', 10);
    expect(authFetch).toHaveBeenCalledWith('/api/candidate/jobs/job-1/alignment-history?limit=10');
    expect(result).toBe(rawParsedData);
  });

  it('C: alignmentHistory.service compareAlignments follows same authFetch contract', async () => {
    const rawComparisonData = {
      analysis_version: 'alignment-history-v1',
      job_id: 'job-1',
      from_alignment_id: 'a1',
      to_alignment_id: 'a2',
      comparison_type: 'SAME_SNAPSHOT'
    };
    (authFetch as any).mockResolvedValue(rawComparisonData);

    const result = await alignmentService.compareAlignments('job-1', 'a1', 'a2');
    expect(authFetch).toHaveBeenCalledWith(
      '/api/candidate/jobs/job-1/alignment-history/compare?from=a1&to=a2'
    );
    expect(result).toBe(rawComparisonData);
  });

  it('D: skillsGapService.getSkillsGap consumes authFetch parsed JSON without res.json error', async () => {
    const { skillsGapService } = await import('../src/features/skillsGap/skillsGap.service.js');
    const mockSkillsGapData = {
      analysis_version: 'skills-gap-v1',
      job_id: 'job-1',
      job_title: 'Senior Internal Auditor',
      company_name: 'Apex Finance',
      candidate_parse_id: 'parse-1',
      alignment_id: 'align-1',
      ruleset_version: 'job-alignment-v1.3',
      generated_at: '2026-09-30T00:00:00Z',
      summary: {
        total_criteria: 10,
        evaluable_criteria_count: 10,
        supported_strengths_count: 5,
        partially_evidenced_count: 2,
        not_found_gaps_count: 3,
        excluded_count: 0,
        coverage_percentage: 60
      },
      supported_strengths: [],
      partially_evidenced: [],
      not_found_gaps: [],
      excluded: []
    };

    (authFetch as any).mockResolvedValue(mockSkillsGapData);

    const result = await skillsGapService.getSkillsGap('job-1');
    expect(authFetch).toHaveBeenCalledWith('/api/candidate/jobs/job-1/skills-gap');
    expect(result).toBe(mockSkillsGapData);
  });
});
