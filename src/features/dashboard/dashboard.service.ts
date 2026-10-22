/**
 * QWERTY Stage 6.4 — Candidate Dashboard Client Service
 */

import { authFetch } from '../../lib/authFetch.js';
import { SavedJobListItem } from '../savedJobs/savedJobs.service.js';
import { JobAlert } from '../jobAlerts/jobAlerts.service.js';

export const CURRENT_DASHBOARD_VERSION = 'candidate-dashboard-v1';

export interface DashboardCandidateInfo {
  id: string;
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  professional_headline?: string | null;
}

export interface DashboardProfileReadiness {
  profile_completed: boolean;
  cv_uploaded: boolean;
  cv_filename?: string | null;
  cv_uploaded_at?: string | null;
  cv_parse_status?: string | null;
  profile_applied: boolean;
  ats_readiness: {
    available: boolean;
    score?: number | null;
    max_score?: number | null;
    status?: string | null;
  };
}

export interface DashboardSavedJobsSummary {
  total: number;
  recent: SavedJobListItem[];
}

export interface DashboardJobAlertsSummary {
  total: number;
  active: number;
  unique_matching_jobs_count: number;
  recent: JobAlert[];
}

export interface DashboardRecentAlignmentItem {
  id: string;
  job_id: string;
  job_title: string;
  company_name: string;
  score?: number;
  max_score?: number;
  ruleset_version?: string;
  status: string;
  created_at: string;
}

export interface DashboardAlignmentsSummary {
  total: number;
  recent: DashboardRecentAlignmentItem[];
}

export interface DashboardNextAction {
  id: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  priority: number;
}

export interface CandidateDashboardResponse {
  version: string;
  candidate: DashboardCandidateInfo;
  profile_readiness: DashboardProfileReadiness;
  saved_jobs: DashboardSavedJobsSummary;
  job_alerts: DashboardJobAlertsSummary;
  recent_alignments: DashboardAlignmentsSummary;
  next_actions: DashboardNextAction[];
}

export const candidateDashboardService = {
  /**
   * Fetches the complete aggregated dashboard for the authenticated candidate.
   */
  async getDashboard(): Promise<CandidateDashboardResponse> {
    return (await authFetch('/api/candidate/dashboard')) as CandidateDashboardResponse;
  }
};
