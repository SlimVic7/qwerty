import { authFetch } from '../../../lib/authFetch.js';

const guardId = (id: string) => {
  if (!id || id === 'undefined') throw new Error('Missing job ID');
  return id;
};

export const jobsOpsService = {
  listJobs: () => authFetch('/api/ops/jobs'),
  
  getJob: (id: string) => authFetch(`/api/ops/jobs/${guardId(id)}`),
  
  createDraft: (jobData: any) => 
    authFetch('/api/ops/jobs', { 
      method: 'POST', 
      body: JSON.stringify(jobData) 
    }),
    
  updateDraft: (id: string, updates: any) => 
    authFetch(`/api/ops/jobs/${guardId(id)}`, { 
      method: 'PATCH', 
      body: JSON.stringify(updates) 
    }),
    
  publishJob: (id: string) => authFetch(`/api/ops/jobs/${guardId(id)}/publish`, { method: 'POST' }),
  
  unpublishJob: (id: string) => authFetch(`/api/ops/jobs/${guardId(id)}/unpublish`, { method: 'POST' }),
  
  closeJob: (id: string) => authFetch(`/api/ops/jobs/${guardId(id)}/close`, { method: 'POST' }),
  
  archiveJob: (id: string) => authFetch(`/api/ops/jobs/${guardId(id)}/archive`, { method: 'POST' }),
  
  featureJob: (id: string) => authFetch(`/api/ops/jobs/${guardId(id)}/feature`, { method: 'POST' }),
  
  unfeatureJob: (id: string) => authFetch(`/api/ops/jobs/${guardId(id)}/unfeature`, { method: 'POST' })
};
