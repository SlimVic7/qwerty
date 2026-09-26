import { supabase } from './supabase.js';

export async function authFetch(endpoint: string, options: RequestInit = {}) {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) throw new Error('Your session has expired. Please sign in again.');

    const isFormData = options.body instanceof FormData;
  const headers: any = {
    'Authorization': `Bearer ${session.access_token}`,
    ...(options.headers || {})
  };
  
  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  
  // If headers['Content-Type'] is explicitly set to null/undefined, we could delete it, but the above is safer.
  // Actually, if it's FormData, the browser sets Content-Type automatically with boundary. So we should NOT set it.


  const response = await fetch(endpoint, { ...options, headers });
  
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
