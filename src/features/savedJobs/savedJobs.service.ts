/**
 * QWERTY Stage 6.1 — Saved Jobs
 * Client-Side API Service
 */

import { authFetch } from '../../lib/authFetch.js';

export const CURRENT_SAVED_JOBS_VERSION = 'saved-jobs-v1';

export interface SavedJobStatusResponse {
  saved: boolean;
  saved_at?: string;
  saved_job_id?: string;
  deleted?: boolean;
}

export interface SavedJobSummary {
  id: string;
  title: string;
  company_name: string;
  location_text?: string;
  country?: string;
  city?: string;
  workplace_type?: string;
  employment_type?: string;
  experience_level?: string;
  status: string;
  published_at?: string;
  updated_at?: string;
  slug?: string;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string | null;
}

export interface SavedJobListItem {
  saved_job_id: string;
  saved_at: string;
  job: SavedJobSummary;
}

export interface SavedJobsListResponse {
  version: string;
  saved_jobs: SavedJobListItem[];
  total: number;
  limit: number;
  offset: number;
}

export const savedJobsService = {
  /**
   * Saves a job for the authenticated candidate (Idempotent).
   */
  async saveJob(jobId: string): Promise<SavedJobStatusResponse> {
    return (await authFetch(`/api/candidate/jobs/${jobId}/save`, {
      method: 'POST'
    })) as SavedJobStatusResponse;
  },

  /**
   * Unsaves a job for the authenticated candidate (Idempotent).
   */
  async unsaveJob(jobId: string): Promise<SavedJobStatusResponse> {
    return (await authFetch(`/api/candidate/jobs/${jobId}/save`, {
      method: 'DELETE'
    })) as SavedJobStatusResponse;
  },

  /**
   * Gets the saved status of a specific job for the authenticated candidate.
   */
  async getSavedStatus(jobId: string): Promise<SavedJobStatusResponse> {
    return (await authFetch(`/api/candidate/jobs/${jobId}/saved-status`)) as SavedJobStatusResponse;
  },

  /**
   * Lists candidate-owned saved jobs with pagination.
   */
  async getSavedJobs(limit: number = 20, offset: number = 0): Promise<SavedJobsListResponse> {
    return (await authFetch(`/api/candidate/saved-jobs?limit=${limit}&offset=${offset}`)) as SavedJobsListResponse;
  }
};
