import { JobExtractionItem } from './types.js';

export function validateExtraction(item: JobExtractionItem): { issues: string[], isReady: boolean } {
  const issues: string[] = [];
  const f = item.fields;

  if (!f.title) issues.push("Missing title");
  if (!f.company_name) issues.push("Company name not specified");
  if (!f.description) issues.push("Missing description");

  if (f.salary_min !== null && f.salary_max !== null) {
    if (f.salary_min > f.salary_max) {
      issues.push("Salary min is greater than max");
    }
  }
  
  if ((f.salary_min !== null || f.salary_max !== null) && !f.salary_currency) {
    issues.push("Salary provided without currency");
  }

  if (f.application_email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(f.application_email)) {
      issues.push("Invalid application email format");
    }
  }

  if (f.application_url) {
    if (!f.application_url.startsWith('http://') && !f.application_url.startsWith('https://')) {
      issues.push("Application URL must start with http:// or https://");
    }
  }
  
  if (f.application_deadline) {
    if (isNaN(Date.parse(f.application_deadline))) {
      issues.push("Application deadline is not a valid ISO date");
    }
  }

  // Combine with warnings from model
  if (item.warnings && item.warnings.length > 0) {
    issues.push(...item.warnings);
  }

  // To be 'ready', it needs title, company, description, and high confidence, and no critical issues
  const hasCritical = issues.length > 0;
  const isReady = !hasCritical && item.confidence >= 0.8;

  return { issues, isReady };
}
