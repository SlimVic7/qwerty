import { supabase } from '../../../lib/supabase.js';

async function authFetch(endpoint: string, options: RequestInit = {}) {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) throw new Error('Not authenticated');

  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  };

  const response = await fetch(endpoint, { ...options, headers });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export const jobsOpsService = {
  listJobs: () => authFetch('/api/ops/jobs'),
  
  getJob: (id: string) => authFetch(`/api/ops/jobs/${id}`),
  
  createDraft: (title: string, company_name: string) => 
    authFetch('/api/ops/jobs', { 
      method: 'POST', 
      body: JSON.stringify({ title, company_name }) 
    }),
    
  updateDraft: (id: string, updates: any) => 
    authFetch(`/api/ops/jobs/${id}`, { 
      method: 'PATCH', 
      body: JSON.stringify(updates) 
    }),
    
  publish: (id: string) => authFetch(`/api/ops/jobs/${id}/publish`, { method: 'POST' }),
  
  unpublish: (id: string) => authFetch(`/api/ops/jobs/${id}/unpublish`, { method: 'POST' }),
  
  close: (id: string) => authFetch(`/api/ops/jobs/${id}/close`, { method: 'POST' }),
  
  archive: (id: string) => authFetch(`/api/ops/jobs/${id}/archive`, { method: 'POST' }),
  
  feature: (id: string) => authFetch(`/api/ops/jobs/${id}/feature`, { method: 'POST' }),
  
  unfeature: (id: string) => authFetch(`/api/ops/jobs/${id}/unfeature`, { method: 'POST' })
};
