/**
 * QWERTY Stage 6.2 — Source Attribution & Outbound Apply Types
 */

export const CURRENT_SOURCE_ATTRIBUTION_VERSION = 'source-attribution-v1';

export type JobSourceType = 
  | 'external_company'
  | 'external_job_board'
  | 'external_social'
  | 'external_recruiter'
  | 'qwerty_direct'
  | 'other_external';

export const JOB_SOURCE_TYPES: JobSourceType[] = [
  'external_company',
  'external_job_board',
  'external_social',
  'external_recruiter',
  'qwerty_direct',
  'other_external'
];

export interface OutboundApplyClickEvent {
  id: string;
  user_id: string;
  job_id: string;
  source_type: JobSourceType | string;
  apply_url_host: string | null;
  event_name: 'outbound_apply_click';
  clicked_at: string;
  created_at: string;
}

export interface OutboundApplyResponse {
  destination: string;
  source_type: JobSourceType | string;
  external: boolean;
}
