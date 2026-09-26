export interface JobExtractionFields {
  title: string | null;
  company_name: string | null;
  company_logo_url: string | null;
  location_text: string | null;
  country: string | null;
  city: string | null;
  workplace_type: 'onsite' | 'hybrid' | 'remote' | 'unspecified' | null;
  employment_type: 'full_time' | 'part_time' | 'contract' | 'internship' | 'temporary' | 'volunteer' | 'unspecified' | null;
  experience_level: string | null;
  description: string | null;
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
}

export interface JobExtractionItem {
  source_segment: string;
  fields: JobExtractionFields;
  field_evidence: Partial<Record<keyof JobExtractionFields, string>>;
  confidence: number;
  warnings: string[];
}

export interface JobExtractionResult {
  jobs: JobExtractionItem[];
  metadata?: {
    model: string;
    requestCount: number;
    inputTokens?: number;
    outputTokens?: number;
    durationMs: number;
  };
}

export interface ExtractionContext {
  batchId?: string;
}

export interface JobExtractionProvider {
  extractJobs(rawText: string, context?: ExtractionContext): Promise<JobExtractionResult>;
}
