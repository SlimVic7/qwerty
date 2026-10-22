/**
 * QWERTY Stage 6.3 — Candidate Job Alerts
 * Client-Side API Service
 */

import { authFetch } from '../../lib/authFetch.js';

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

export const jobAlertsService = {
  /**
   * Retrieves all job alerts for current candidate
   */
  async getAlerts(): Promise<{ alerts: JobAlert[]; total: number }> {
    return (await authFetch('/api/candidate/job-alerts')) as { alerts: JobAlert[]; total: number };
  },

  /**
   * Creates a new job alert
   */
  async createAlert(input: JobAlertCreateInput): Promise<JobAlert> {
    return (await authFetch('/api/candidate/job-alerts', {
      method: 'POST',
      body: JSON.stringify(input)
    })) as JobAlert;
  },

  /**
   * Gets single job alert by ID
   */
  async getAlert(alertId: string): Promise<JobAlert> {
    return (await authFetch(`/api/candidate/job-alerts/${alertId}`)) as JobAlert;
  },

  /**
   * Updates an alert
   */
  async updateAlert(alertId: string, input: JobAlertUpdateInput): Promise<JobAlert> {
    return (await authFetch(`/api/candidate/job-alerts/${alertId}`, {
      method: 'PATCH',
      body: JSON.stringify(input)
    })) as JobAlert;
  },

  /**
   * Deletes an alert
   */
  async deleteAlert(alertId: string): Promise<{ success: boolean; message: string }> {
    return (await authFetch(`/api/candidate/job-alerts/${alertId}`, {
      method: 'DELETE'
    })) as { success: boolean; message: string };
  },

  /**
   * Toggles alert active/inactive
   */
  async toggleAlert(alertId: string, isActive: boolean): Promise<JobAlert> {
    return this.updateAlert(alertId, { is_active: isActive });
  },

  /**
   * Preview matching jobs for an alert (deterministic boolean filtering)
   */
  async getAlertMatches(alertId: string, limit = 20): Promise<JobAlertMatchesResponse> {
    return (await authFetch(`/api/candidate/job-alerts/${alertId}/matches?limit=${limit}`)) as JobAlertMatchesResponse;
  }
};
