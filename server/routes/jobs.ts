import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getAdminClient } from '../db/supabase.js';
import crypto from 'crypto';

export const jobsRouter = Router();

function generateSlug(title: string, company: string): string {
  const base = `${title}-${company}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  const randomSuffix = crypto.randomBytes(4).toString('hex');
  return `${base}-${randomSuffix}`;
}

// Extract exact allowed patch fields, discarding anything else (and throwing on unknown if we wanted to, but we'll manually check inside)
function extractPatchFields(body: any): any {
  const allowed = [
    'title', 'company_name', 'company_logo_url', 'location_text', 'country', 'city',
    'workplace_type', 'employment_type', 'experience_level', 'description',
    'responsibilities', 'requirements', 'preferred_qualifications', 'benefits',
    'salary_min', 'salary_max', 'salary_currency', 'salary_period',
    'application_url', 'application_email', 'source_name', 'source_url', 'application_deadline'
  ];

  const updates: any = {};
  for (const key of Object.keys(body)) {
    if (!allowed.includes(key)) {
      throw new Error(`Invalid update field: ${key}`);
    }
    updates[key] = body[key];
  }
  return updates;
}

function validateJobData(data: any, isCreate = false) {
  if (isCreate && (!data.title || !data.company_name || !data.description)) {
    return 'Title, company name, and description are required';
  }
  if ('title' in data && (!data.title || typeof data.title !== 'string' || !data.title.trim())) return 'Title cannot be empty';
  if ('company_name' in data && (!data.company_name || typeof data.company_name !== 'string' || !data.company_name.trim())) return 'Company name cannot be empty';
  if ('description' in data && (!data.description || typeof data.description !== 'string' || !data.description.trim())) return 'Description cannot be empty';
  
  if ('workplace_type' in data && data.workplace_type && !['onsite', 'hybrid', 'remote', 'unspecified'].includes(data.workplace_type)) {
    return 'Invalid workplace type';
  }
  if ('employment_type' in data && data.employment_type && !['full_time', 'part_time', 'contract', 'internship', 'temporary', 'volunteer', 'unspecified'].includes(data.employment_type)) {
    return 'Invalid employment type';
  }
  if ('salary_min' in data && data.salary_min !== null && Number(data.salary_min) < 0) return 'Salary minimum must be non-negative';
  if ('salary_max' in data && data.salary_max !== null && Number(data.salary_max) < 0) return 'Salary maximum must be non-negative';
  if ('salary_min' in data && 'salary_max' in data && data.salary_min !== null && data.salary_max !== null && Number(data.salary_min) > Number(data.salary_max)) {
    return 'Salary minimum cannot exceed maximum';
  }
  if ('application_email' in data && data.application_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.application_email)) {
    return 'Invalid application email format';
  }
  if ('application_url' in data && data.application_url && !/^https?:\/\/.+/.test(data.application_url)) {
    return 'Application URL must be HTTP or HTTPS';
  }
  if ('source_url' in data && data.source_url && !/^https?:\/\/.+/.test(data.source_url)) {
    return 'Source URL must be HTTP or HTTPS';
  }
  if ('application_deadline' in data && data.application_deadline && isNaN(Date.parse(data.application_deadline))) {
    return 'Invalid application deadline format';
  }
  return null;
}

// GET all jobs (Internal view)
jobsRouter.get('/', requireAuth, requireRole(['recruiter', 'editor', 'admin', 'super_admin']), async (req, res) => {
  const supabase = getAdminClient();
  if (!supabase) { res.status(500).json({ error: 'DB not configured' }); return; }

  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error listing internal jobs:", error);
    res.status(500).json({ error: 'Failed to list jobs' });
    return;
  }
  res.json(data);
});

// GET single job (Internal view)
jobsRouter.get('/:id', requireAuth, requireRole(['recruiter', 'editor', 'admin', 'super_admin']), async (req, res) => {
  const supabase = getAdminClient();
  if (!supabase) { res.status(500).json({ error: 'DB not configured' }); return; }

  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }
  res.json(data);
});

// POST new job (Draft)
jobsRouter.post('/', requireAuth, requireRole(['editor', 'admin', 'super_admin']), async (req, res) => {
  const supabase = getAdminClient();
  if (!supabase) { res.status(500).json({ error: 'DB not configured' }); return; }

  let jobData: any;
  try {
    jobData = extractPatchFields(req.body);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
    return;
  }

  const validationError = validateJobData(jobData, true);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const slug = generateSlug(jobData.title, jobData.company_name);

  const { data, error } = await supabase.rpc('ops_create_job', {
    p_actor_id: req.user!.id,
    p_slug: slug,
    p_title: jobData.title,
    p_company_name: jobData.company_name,
    p_company_logo_url: jobData.company_logo_url || null,
    p_location_text: jobData.location_text || null,
    p_country: jobData.country || null,
    p_city: jobData.city || null,
    p_workplace_type: jobData.workplace_type || null,
    p_employment_type: jobData.employment_type || null,
    p_experience_level: jobData.experience_level || null,
    p_description: jobData.description,
    p_responsibilities: jobData.responsibilities || null,
    p_requirements: jobData.requirements || null,
    p_preferred_qualifications: jobData.preferred_qualifications || null,
    p_benefits: jobData.benefits || null,
    p_salary_min: jobData.salary_min !== undefined ? Number(jobData.salary_min) : null,
    p_salary_max: jobData.salary_max !== undefined ? Number(jobData.salary_max) : null,
    p_salary_currency: jobData.salary_currency || null,
    p_salary_period: jobData.salary_period || null,
    p_application_url: jobData.application_url || null,
    p_application_email: jobData.application_email || null,
    p_source_name: jobData.source_name || null,
    p_source_url: jobData.source_url || null,
    p_application_deadline: jobData.application_deadline || null
  });

  if (error) {
    console.error("Error creating job via RPC:", error);
    if (error.message.includes('Insufficient permissions')) return res.status(403).json({ error: error.message });
    res.status(400).json({ error: 'Failed to create job' });
    return;
  }

  res.status(201).json(data);
});

// PATCH edit job (Draft only for editors; admins can edit any)
jobsRouter.patch('/:id', requireAuth, requireRole(['editor', 'admin', 'super_admin']), async (req, res) => {
  const supabase = getAdminClient();
  if (!supabase) { res.status(500).json({ error: 'DB not configured' }); return; }

  let updates: any;
  try {
    updates = extractPatchFields(req.body);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
    return;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: 'Empty patch payload' });
    return;
  }

  const validationError = validateJobData(updates, false);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const { data, error } = await supabase.rpc('ops_update_job', {
    p_job_id: req.params.id,
    p_actor_id: req.user!.id,
    p_updates: updates
  });

  if (error) {
    console.error("Error updating job via RPC:", error);
    if (error.message.includes('not found')) return res.status(404).json({ error: 'Job not found' });
    if (error.message.includes('Insufficient permissions') || error.message.includes('Editors can only modify draft jobs')) return res.status(403).json({ error: error.message });
    if (error.message.includes('cannot be edited')) return res.status(409).json({ error: error.message });
    res.status(400).json({ error: error.message || 'Failed to update job' });
    return;
  }

  res.json(data);
});

async function handleTransition(req: any, res: any, transition: string) {
  const supabase = getAdminClient();
  if (!supabase) { res.status(500).json({ error: 'DB not configured' }); return; }

  const { data, error } = await supabase.rpc('ops_transition_job', {
    p_job_id: req.params.id,
    p_actor_id: req.user!.id,
    p_transition: transition
  });

  if (error) {
    console.error(`Error transitioning job (${transition}) via RPC:`, error);
    if (error.message.includes('not found')) return res.status(404).json({ error: 'Job not found' });
    if (error.message.includes('Insufficient permissions')) return res.status(403).json({ error: error.message });
    if (error.message.includes('Only') || error.message.includes('Invalid')) return res.status(409).json({ error: error.message });
    res.status(400).json({ error: `Failed to ${transition} job` });
    return;
  }

  res.json(data);
}

// POST publish
jobsRouter.post('/:id/publish', requireAuth, requireRole(['admin', 'super_admin']), (req, res) => handleTransition(req, res, 'publish'));

// POST unpublish
jobsRouter.post('/:id/unpublish', requireAuth, requireRole(['admin', 'super_admin']), (req, res) => handleTransition(req, res, 'unpublish'));

// POST close
jobsRouter.post('/:id/close', requireAuth, requireRole(['admin', 'super_admin']), (req, res) => handleTransition(req, res, 'close'));

// POST archive
jobsRouter.post('/:id/archive', requireAuth, requireRole(['admin', 'super_admin']), (req, res) => handleTransition(req, res, 'archive'));


// POST feature
jobsRouter.post('/:id/feature', requireAuth, requireRole(['admin', 'super_admin']), async (req, res) => {
  const supabase = getAdminClient();
  if (!supabase) { res.status(500).json({ error: 'DB not configured' }); return; }

  const { data, error } = await supabase.rpc('ops_set_job_featured', {
    p_job_id: req.params.id,
    p_actor_id: req.user!.id,
    p_featured: true
  });

  if (error) {
    console.error("Error featuring job via RPC:", error);
    if (error.message.includes('not found')) return res.status(404).json({ error: 'Job not found' });
    if (error.message.includes('Insufficient permissions')) return res.status(403).json({ error: error.message });
    if (error.message.includes('Only published jobs')) return res.status(409).json({ error: error.message });
    res.status(400).json({ error: 'Failed to feature job' });
    return;
  }

  res.json(data);
});

// POST unfeature
jobsRouter.post('/:id/unfeature', requireAuth, requireRole(['admin', 'super_admin']), async (req, res) => {
  const supabase = getAdminClient();
  if (!supabase) { res.status(500).json({ error: 'DB not configured' }); return; }

  const { data, error } = await supabase.rpc('ops_set_job_featured', {
    p_job_id: req.params.id,
    p_actor_id: req.user!.id,
    p_featured: false
  });

  if (error) {
    console.error("Error unfeaturing job via RPC:", error);
    if (error.message.includes('not found')) return res.status(404).json({ error: 'Job not found' });
    if (error.message.includes('Insufficient permissions')) return res.status(403).json({ error: error.message });
    res.status(400).json({ error: 'Failed to unfeature job' });
    return;
  }

  res.json(data);
});
