import { supabase } from './supabase.js';

export async function authFetch(endpoint: string, options: RequestInit = {}) {
  let session = null;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (!error && data?.session) {
      session = data.session;
    }
  } catch (authError) {
    console.warn('[authFetch] Could not retrieve session:', authError);
  }

  if (!session) {
    throw new Error('Your session has expired. Please sign in again.');
  }

  const isFormData = options.body instanceof FormData;
  const headers: any = {
    'Authorization': `Bearer ${session.access_token}`,
    ...(options.headers || {})
  };

  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;
  try {
    response = await fetch(endpoint, { ...options, headers });
  } catch {
    // If a transient network glitch occurs, retry once after a short delay
    await new Promise((resolve) => setTimeout(resolve, 300));
    try {
      response = await fetch(endpoint, { ...options, headers });
    } catch (retryErr: any) {
      throw new Error(retryErr.message || 'Network connection error. Please verify your connection.');
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error || errorData.message || `Request failed with status ${response.status}`;
    const err: any = new Error(message);
    err.status = response.status;
    err.endpoint = endpoint;
    err.errorData = errorData;
    throw err;
  }

  return response.json();
}
