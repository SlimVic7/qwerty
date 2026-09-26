import { JobExtractionProvider, JobExtractionResult, JobExtractionItem, ExtractionContext } from '../types.js';
import { chunkText } from '../chunking.js';

export class MockExtractionProvider implements JobExtractionProvider {
  async extractJobs(rawText: string, context?: ExtractionContext): Promise<JobExtractionResult> {
    if (!rawText.trim()) {
      return { jobs: [], metadata: { model: 'mock', requestCount: 1, durationMs: 10 } };
    }

    const chunks = rawText.split(/\n\s*\n/).filter(c => c.trim().length > 20);
    const jobs: JobExtractionItem[] = chunks.map((chunk, index) => {
      const lines = chunk.split('\n').map(l => l.trim()).filter(Boolean);
      const title = lines[0] || 'Unknown Title';
      let company_name = null;
      let description = chunk;

      if (lines.length > 1) {
        if (lines[1].toLowerCase().includes('inc') || lines[1].toLowerCase().includes('ltd') || lines[1].toLowerCase().includes('corp')) {
          company_name = lines[1];
          description = lines.slice(2).join('\n');
        }
      }

      const warnings = [];
      if (!company_name) warnings.push("Company name not specified");

      return {
        source_segment: chunk,
        fields: {
          title,
          company_name,
          company_logo_url: null,
          location_text: null,
          country: null,
          city: null,
          workplace_type: null,
          employment_type: null,
          experience_level: null,
          description,
          responsibilities: null,
          requirements: null,
          preferred_qualifications: null,
          benefits: null,
          salary_min: null,
          salary_max: null,
          salary_currency: null,
          salary_period: null,
          application_url: null,
          application_email: null,
          source_name: null,
          source_url: null,
          application_deadline: null
        },
        field_evidence: {
          title: lines[0],
          company_name: company_name || undefined
        },
        confidence: company_name ? 0.9 : 0.4,
        warnings
      };
    });

    return {
      jobs,
      metadata: {
        model: 'mock',
        requestCount: 1,
        durationMs: 50
      }
    };
  }
}
