/**
 * QWERTY Stage 6.1 — Saved Jobs
 * Authoritative Type Definitions & Centralized Metadata
 */

export const CURRENT_SAVED_JOBS_VERSION = 'saved-jobs-v1';

export interface SavedJobRecord {
  id: string;
  user_id: string;
  job_id: string;
  saved_at: string;
  created_at: string;
  updated_at: string;
}

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
