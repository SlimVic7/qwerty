/**
 * QWERTY Stage 6.3 — Candidate Job Alerts
 * Authoritative Type Definitions
 */

export const CURRENT_JOB_ALERTS_VERSION = 'job-alerts-v1';

export type AlertFrequency = 'daily' | 'weekly';

export interface JobAlert {
  id: string;
  user_id: string;
  name: string;
  keywords?: string | null;
  location_query?: string | null;
  workplace_type?: string | null;
  employment_type?: string | null;
  frequency: AlertFrequency;
  is_active: boolean;
  last_opened_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobAlertCreateInput {
  name: string;
  keywords?: string | null;
  location_query?: string | null;
  workplace_type?: string | null;
  employment_type?: string | null;
  frequency?: AlertFrequency;
  is_active?: boolean;
}

export interface JobAlertUpdateInput {
  name?: string;
  keywords?: string | null;
  location_query?: string | null;
  workplace_type?: string | null;
  employment_type?: string | null;
  frequency?: AlertFrequency;
  is_active?: boolean;
  last_opened_at?: string | null;
}

export interface MatchedJobSummary {
  id: string;
  title: string;
  company_name: string;
  location_text?: string;
  country?: string;
  city?: string;
  workplace_type?: string;
  employment_type?: string;
  status: string;
  slug?: string;
  published_at?: string;
  created_at?: string;
}

export interface JobAlertMatch {
  matched: boolean;
  job: MatchedJobSummary;
  matched_criteria: string[];
}

export interface JobAlertMatchesResponse {
  version: string;
  alert?: JobAlert;
  matches: JobAlertMatch[];
  total: number;
}
