import { supabase } from '../../lib/supabase.js';

export interface Job {
  id: string;
  title: string;
  slug: string;
  company_name: string;
  company_logo_url: string | null;
  location_text: string | null;
  country: string | null;
  city: string | null;
  workplace_type: 'onsite' | 'hybrid' | 'remote' | 'unspecified';
  employment_type: 'full_time' | 'part_time' | 'contract' | 'internship' | 'temporary' | 'volunteer' | 'unspecified';
  experience_level: string | null;
  description: string;
  responsibilities: string | null;
  requirements: string | null;
  preferred_qualifications: string | null;
  benefits: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  salary_period: string | null;
  application_url: string | null;
  application_email: string | null;
  source_name: string | null;
  source_url: string | null;
  application_deadline: string | null;
  status: 'draft' | 'published' | 'closed' | 'archived';
  featured: boolean;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobFilters {
  keyword?: string;
  location?: string;
  workplace_type?: string;
  employment_type?: string;
}

export async function getPublishedJobs(filters?: JobFilters): Promise<Job[]> {
  // We explicitly query only published jobs (though RLS also protects this)
  let query = supabase
    .from('jobs')
    .select('*')
    .eq('status', 'published')
    .order('featured', { ascending: false })
    .order('published_at', { ascending: false });

  if (filters?.keyword) {
    query = query.or(`title.ilike.%${filters.keyword}%,company_name.ilike.%${filters.keyword}%`);
  }
  
  if (filters?.location) {
    query = query.ilike('location_text', `%${filters.location}%`);
  }
  
  if (filters?.workplace_type && filters.workplace_type !== 'all') {
    query = query.eq('workplace_type', filters.workplace_type);
  }
  
  if (filters?.employment_type && filters.employment_type !== 'all') {
    query = query.eq('employment_type', filters.employment_type);
  }

  const { data, error } = await query;
  
  if (error) {
    if (error.code === 'PGRST205') {
      console.warn("[Development Diagnostic]: 'public.jobs' table not found. Ensure 00001_stage2_1_jobs.sql has been migrated.");
      throw new Error("Jobs are temporarily unavailable. Please try again later.");
    }
    console.error("Error fetching jobs:", error);
    throw new Error("Could not load jobs from the database.");
  }
  
  return data as Job[] || [];
}

export async function getPublishedJobBySlug(slug: string): Promise<Job | null> {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('status', 'published')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST205') {
      console.warn("[Development Diagnostic]: 'public.jobs' table not found. Ensure 00001_stage2_1_jobs.sql has been migrated.");
      throw new Error("Jobs are temporarily unavailable. Please try again later.");
    }
    console.error("Error fetching job by slug:", error);
    throw new Error("Could not load job details.");
  }

  return data as Job | null;
}
