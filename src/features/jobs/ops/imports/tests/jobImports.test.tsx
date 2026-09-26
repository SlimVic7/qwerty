import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { JobBulkImportPage } from '../JobBulkImportPage.js';
import { JobBatchReviewPage } from '../JobBatchReviewPage.js';
import { jobImportsService } from '../jobImports.service.js';

// Mock the service
vi.mock('../jobImports.service.js', () => ({
  jobImportsService: {
    createBatch: vi.fn(),
    getBatchDetails: vi.fn(),
    updateItem: vi.fn()
  }
}));

const mockNavigate = vi.fn();
let mockParams: any = {};
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockParams
  };
});

describe('JobBulkImportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    cleanup();
  });

  it('renders correctly', () => {
    render(
      <MemoryRouter>
        <JobBulkImportPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Bulk Job Import')).toBeTruthy();
  });

  it('disables submit button if empty text is present', async () => {
    render(
      <MemoryRouter>
        <JobBulkImportPage />
      </MemoryRouter>
    );
    const btn = screen.getByText('Analyse Jobs');
    expect((btn as HTMLButtonElement).disabled).toBeTruthy();
  });

  it('navigates to review page on successful submission', async () => {
    (jobImportsService.createBatch as any).mockResolvedValue({ id: 'test-batch-123' });
    render(
      <MemoryRouter>
        <JobBulkImportPage />
      </MemoryRouter>
    );
    const textarea = screen.getByPlaceholderText(/Paste content/i);
    fireEvent.change(textarea, { target: { value: 'Software Engineer\nAcme Corp' } });
    fireEvent.click(screen.getByText('Analyse Jobs'));
    
    await waitFor(() => {
      expect(jobImportsService.createBatch).toHaveBeenCalledWith('Software Engineer\nAcme Corp');
      expect(mockNavigate).toHaveBeenCalledWith('/0ps26/jobs/imports/test-batch-123');
    });
  });

  it('displays session expired error if service throws specific error', async () => {
    (jobImportsService.createBatch as any).mockRejectedValue(new Error('Your session has expired. Please sign in again.'));
    render(
      <MemoryRouter>
        <JobBulkImportPage />
      </MemoryRouter>
    );
    const textarea = screen.getByPlaceholderText(/Paste content/i);
    fireEvent.change(textarea, { target: { value: 'Software Engineer' } });
    fireEvent.click(screen.getByText('Analyse Jobs'));
    
    await waitFor(() => {
      expect(screen.getByText('Your session has expired. Please sign in again.')).toBeTruthy();
    });
  });
});

describe('JobBatchReviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    cleanup();
  });

  const renderReviewPage = (batchId) => {
    render(
      <MemoryRouter initialEntries={['/batches/' + batchId]}>
        <Routes>
          <Route path="/batches/:batchId" element={<JobBatchReviewPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('invalid batchId makes no request and shows error', async () => {
    mockParams = { batchId: 'invalid-uuid' };
    renderReviewPage('invalid-uuid');
    expect(screen.getByText('Invalid batch ID format.')).toBeTruthy();
    expect(jobImportsService.getBatchDetails).not.toHaveBeenCalled();
  });

  it('loads and displays batch details and items', async () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
mockParams = { batchId: validUuid };
    (jobImportsService.getBatchDetails as any).mockResolvedValue({
      batch: { id: validUuid, total_detected: 1, ready_count: 0, review_count: 1, duplicate_count: 0 },
      items: [
        {
          id: 'item-1',
          sequence_number: 1,
          raw_text: 'Software Engineer',
          extracted_data: { fields: { title: 'Software Engineer', company_name: 'Acme Corp' } },
          normalized_data: { title: 'Software Engineer', company_name: 'Acme Corp' },
          validation_issues: ['Missing company'],
          review_status: 'needs_review'
        }
      ]
    });

    renderReviewPage(validUuid);
    
    expect(screen.getByText('Loading batch details...')).toBeTruthy();
    
    await waitFor(() => {
      expect(jobImportsService.getBatchDetails).toHaveBeenCalledWith(validUuid);
      expect(jobImportsService.getBatchDetails).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Total: 1')).toBeTruthy();
      expect(screen.getByText('Needs Review: 1')).toBeTruthy();
      expect(screen.getAllByText('Software Engineer').length).toBeGreaterThan(0);
      expect(screen.queryByText('Loading batch details...')).toBeNull();
    });
  });

  it('displays error on 401/403/404/500 and allows retry', async () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
mockParams = { batchId: validUuid };
    (jobImportsService.getBatchDetails as any).mockRejectedValueOnce(new Error('Failed'));
    (jobImportsService.getBatchDetails as any).mockResolvedValueOnce({
      batch: { id: validUuid, total_detected: 0, ready_count: 0, review_count: 0, duplicate_count: 0 },
      items: []
    });

    renderReviewPage(validUuid);

    await waitFor(() => {
      expect(screen.getByText('Unable to load this import batch. Please try again.')).toBeTruthy();
    });

    expect(jobImportsService.getBatchDetails).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Retry'));

    await waitFor(() => {
      expect(jobImportsService.getBatchDetails).toHaveBeenCalledTimes(2);
      expect(screen.getByText('No jobs extracted from this batch.')).toBeTruthy();
    });
  });
});
