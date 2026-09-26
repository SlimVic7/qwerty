/**
 * QWERTY Stage 5.2 — Evidence-Safe CV Tailoring Client Service
 */

import { supabase } from '../../lib/supabase.js';

export interface CandidateEvidenceCard {
  evidence_id: string;
  source_type: string;
  source_path: string;
  text: string;
  employer?: string;
  job_title?: string;
  dates?: any;
}

export interface TailoringSuggestion {
  suggestion_id: string;
  section: 'summary' | 'skills' | 'experience' | 'education' | 'certifications';
  target_item_id?: string;
  original_text: string;
  suggested_text: string;
  source_refs: string[];
  reason: string;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  validation_status: 'valid' | 'blocked';
  validation_issues?: string[];
  candidate_edited?: boolean;
  user_note?: string;
}

export interface UnaddressedJobCriterion {
  id: string;
  criterion_id?: string;
  type?: string;
  criterion: string;
  source_text?: string;
  category: 'required' | 'preferred' | 'experience' | 'general' | string;
  reason: string;
  guidance: string;
}

export interface TailoringPlan {
  target_job_title: string;
  target_company: string;
  priority_strengths: string[];
  reorder_priorities: string[];
  concision_targets: string[];
  unaddressed_criteria: UnaddressedJobCriterion[];
  unaddressed_count?: number;
}

export interface TailoredCvDraft {
  personal: {
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
    location?: string | null;
    links?: string[] | null;
  };
  professional: {
    headline?: string | null;
    summary?: string | null;
    years_experience?: number | null;
  };
  skills: Array<{
    name: string;
    category?: string;
    relevance_order?: number;
    is_supported: boolean;
  }>;
  experience: Array<{
    id: string;
    job_title: string;
    employer: string;
    start_date?: string | null;
    end_date?: string | null;
    is_current?: boolean;
    responsibilities: string[];
    achievements?: string[];
  }>;
  education: Array<{
    degree: string;
    institution: string;
    graduation_year?: string | number | null;
  }>;
  certifications: Array<{
    name: string;
    issuer?: string;
    issue_date?: string | null;
  }>;
}

export interface CandidateCvTailoringSession {
  id: string;
  user_id: string;
  job_id: string;
  cv_version_id: string;
  parse_id: string;
  alignment_id: string;
  status: 'pending' | 'preparing_evidence' | 'generating' | 'completed' | 'failed';
  tailoring_status: 'draft' | 'reviewing' | 'finalized';
  tailoring_engine_version: string;
  source_alignment_ruleset: string;
  job_updated_at: string;
  candidate_applied_at: string;
  job_title: string;
  company_name: string;
  evidence_manifest: CandidateEvidenceCard[];
  tailoring_plan?: TailoringPlan;
  suggestions: TailoringSuggestion[];
  draft_data?: TailoredCvDraft;
  generation_provider?: string;
  generation_model?: string;
  error_code?: string;
  created_at: string;
  completed_at?: string;
  finalized_at?: string;
  is_stale?: boolean;
  stale_reason?: string;
}

export interface JobTailoringStatusResponse {
  session?: CandidateCvTailoringSession | null;
  is_public_enabled?: boolean;
}

export interface ServiceError extends Error {
  status?: number;
  error?: string;
  sessionId?: string;
  session?: CandidateCvTailoringSession;
}

export async function parseResponseSafe<T = any>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.toLowerCase().includes('application/json');

  let text = '';
  try {
    text = await res.text();
  } catch (err: any) {
    if (!res.ok) {
      const error: ServiceError = new Error(`Network response error (${res.status})`);
      error.status = res.status;
      error.error = `HTTP_${res.status}`;
      throw error;
    }
    return {} as T;
  }

  const trimmed = text.trim();
  let parsed: any = null;

  // Only attempt JSON parsing if Content-Type is json or body looks like JSON object/array
  if (isJson || trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      parsed = JSON.parse(trimmed);
    } catch (parseErr) {
      console.warn('[cvTailoringService] Failed to parse JSON response body:', trimmed.slice(0, 120));
      parsed = null;
    }
  }

  if (!res.ok) {
    // 503 or GEMINI_UNAVAILABLE
    if (res.status === 503 || parsed?.error === 'GEMINI_UNAVAILABLE' || parsed?.error === 'TAILORING_PERSISTENCE_UNAVAILABLE') {
      const error: ServiceError = new Error(
        parsed?.message ||
        'CV tailoring is temporarily unavailable because the AI service could not complete this request. Your original CV and profile are unchanged. Please try again.'
      );
      error.status = 503;
      error.error = parsed?.error || 'GEMINI_UNAVAILABLE';
      error.sessionId = parsed?.sessionId || parsed?.session?.id;
      error.session = parsed?.session;
      throw error;
    }

    if (parsed && (parsed.message || parsed.error)) {
      const error: ServiceError = new Error(parsed.message || parsed.error);
      error.status = res.status;
      error.error = parsed.error;
      error.sessionId = parsed.sessionId || parsed.session?.id;
      error.session = parsed.session;
      throw error;
    }

    // Controlled error for non-JSON or HTML responses (e.g. 404, 502, 500)
    const error: ServiceError = new Error(
      res.status === 404
        ? 'CV tailoring endpoint not found.'
        : `CV tailoring service error (${res.status}). Please try again later.`
    );
    error.status = res.status;
    error.error = `HTTP_${res.status}`;
    throw error;
  }

  // Response is ok (2xx), but body was not JSON
  if (parsed === null) {
    if (trimmed.length === 0) {
      return {} as T;
    }
    console.warn('[cvTailoringService] Received non-JSON 200 response:', trimmed.slice(0, 120));
    const error: ServiceError = new Error('Unexpected server response format. Please try again.');
    error.status = res.status;
    error.error = 'INVALID_RESPONSE_FORMAT';
    throw error;
  }

  return parsed as T;
}

class CvTailoringService {
  private async getAuthHeader(): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Candidate not authenticated');
    }
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    };
  }

  public async getJobTailoringStatus(jobId: string): Promise<JobTailoringStatusResponse> {
    const headers = await this.getAuthHeader();
    const res = await fetch(`/api/candidate/jobs/${jobId}/tailoring`, { headers });
    if (res.status === 404) return { session: null, is_public_enabled: false };
    const data = await parseResponseSafe<JobTailoringStatusResponse>(res);
    return { session: data?.session || null, is_public_enabled: data?.is_public_enabled ?? false };
  }

  public async getJobTailoringSession(jobId: string): Promise<CandidateCvTailoringSession | null> {
    const status = await this.getJobTailoringStatus(jobId);
    return status.session || null;
  }

  public async createJobTailoringSession(jobId: string, forceNew = false): Promise<CandidateCvTailoringSession> {
    const headers = await this.getAuthHeader();
    const url = `/api/candidate/jobs/${jobId}/tailoring${forceNew ? '?force_new=true' : ''}`;
    const res = await fetch(url, {
      method: 'POST',
      headers
    });
    return parseResponseSafe<CandidateCvTailoringSession>(res);
  }

  public async getTailoringSession(sessionId: string): Promise<CandidateCvTailoringSession> {
    const headers = await this.getAuthHeader();
    const res = await fetch(`/api/candidate/tailoring/${sessionId}`, { headers });
    return parseResponseSafe<CandidateCvTailoringSession>(res);
  }

  public async listTailoringSessions(): Promise<CandidateCvTailoringSession[]> {
    const headers = await this.getAuthHeader();
    const res = await fetch('/api/candidate/tailoring', { headers });
    return parseResponseSafe<CandidateCvTailoringSession[]>(res);
  }

  public async updateSuggestion(
    sessionId: string,
    suggestionId: string,
    action: 'accept' | 'reject' | 'edit',
    editedText?: string
  ): Promise<CandidateCvTailoringSession> {
    const headers = await this.getAuthHeader();
    const res = await fetch(`/api/candidate/tailoring/${sessionId}/suggestions/${suggestionId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ action, edited_text: editedText })
    });
    return parseResponseSafe<CandidateCvTailoringSession>(res);
  }

  public async finalizeTailoredDraft(sessionId: string): Promise<CandidateCvTailoringSession> {
    const headers = await this.getAuthHeader();
    const res = await fetch(`/api/candidate/tailoring/${sessionId}/finalize`, {
      method: 'POST',
      headers
    });
    return parseResponseSafe<CandidateCvTailoringSession>(res);
  }
}

export const cvTailoringService = new CvTailoringService();
