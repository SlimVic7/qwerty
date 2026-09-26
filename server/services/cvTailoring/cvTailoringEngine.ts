/**
 * QWERTY Stage 5.2 — CV Tailoring Engine
 * Coordinates evidence extraction, plan formation, AI generation, deterministic claim validation, and draft compilation.
 */

import { 
  CandidateEvidenceCard, 
  TailoringPlan, 
  TailoringSuggestion, 
  TailoredCvDraft 
} from './types.js';
import { buildEvidenceCards } from './evidenceExtractor.js';
import { createTailoringPlan } from './tailoringPlanner.js';
import { validateSuggestion } from './claimValidator.js';
import { GeminiCvTailoringProvider } from './GeminiCvTailoringProvider.js';
import { JobAlignmentResult } from '../matching/jobAlignment.js';

export interface GenerationEngineResult {
  evidence_manifest: CandidateEvidenceCard[];
  tailoring_plan: TailoringPlan;
  suggestions: TailoringSuggestion[];
  draft_data: TailoredCvDraft;
  generation_provider?: string;
  generation_model?: string;
}

export class CvTailoringEngine {
  /**
   * Compiles a tailored CV draft from reviewed_data and accepted suggestions.
   */
  public static compileTailoredDraft(
    reviewedData: any,
    suggestions: TailoringSuggestion[]
  ): TailoredCvDraft {
    const acceptedSummary = suggestions.find(s => s.section === 'summary' && s.status === 'accepted' && s.validation_status === 'valid');
    
    // Skills reordering / filtering
    const originalSkills = Array.isArray(reviewedData?.skills) ? reviewedData.skills : [];
    const skillsList = originalSkills.map((sk: any, idx: number) => {
      const name = typeof sk === 'string' ? sk : (sk?.name || '');
      return {
        name,
        category: typeof sk === 'object' ? sk?.category : undefined,
        relevance_order: idx,
        is_supported: true
      };
    });

    // Experience entries with accepted bullet replacements
    const originalExp = Array.isArray(reviewedData?.experience) ? reviewedData.experience : [];
    const experienceList = originalExp.map((exp: any, expIdx: number) => {
      const employer = exp.employer || exp.company || '';
      const jobTitle = exp.job_title || exp.title || '';
      
      let originalResps: any[] = Array.isArray(exp.responsibilities) 
        ? exp.responsibilities 
        : (typeof exp.responsibilities === 'string' && exp.responsibilities.trim().length > 0 ? exp.responsibilities.split('\n') : []);

      if (originalResps.length === 0 && exp.description && typeof exp.description === 'string') {
        originalResps = exp.description
          .split(/(?<=[.!?])\s+|\n+/)
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0);
      }

      const responsibilities = originalResps.map((resp, respIdx) => {
        const text = typeof resp === 'string' ? resp : (resp?.text || '');
        // Check if an accepted suggestion targets this bullet
        const acceptedMatch = suggestions.find(
          s => s.section === 'experience' && 
               s.status === 'accepted' && 
               s.validation_status === 'valid' && 
               (s.original_text.trim() === text.trim() || 
                s.source_refs.includes(`exp-${expIdx}-resp-${respIdx}`) ||
                s.source_refs.includes(`exp-${expIdx}-desc-${respIdx}`))
        );
        return acceptedMatch ? acceptedMatch.suggested_text : text;
      });

      return {
        id: `exp-${expIdx}`,
        job_title: jobTitle,
        employer,
        start_date: exp.start_date || null,
        end_date: exp.end_date || null,
        is_current: exp.is_current || false,
        responsibilities,
        achievements: Array.isArray(exp.achievements) ? exp.achievements : undefined
      };
    });

    const originalEdu = Array.isArray(reviewedData?.education) ? reviewedData.education : [];
    const educationList = originalEdu.map((edu: any) => ({
      degree: edu?.degree || '',
      institution: edu?.institution || '',
      graduation_year: edu?.graduation_year || null
    }));

    const originalCerts = Array.isArray(reviewedData?.certifications) ? reviewedData.certifications : [];
    const certList = originalCerts.map((c: any) => ({
      name: typeof c === 'string' ? c : (c?.name || ''),
      issuer: c?.issuer || undefined,
      issue_date: c?.issue_date || null
    }));

    return {
      personal: {
        full_name: reviewedData?.personal?.full_name || null,
        email: reviewedData?.personal?.email || null,
        phone: reviewedData?.personal?.phone || null,
        location: reviewedData?.personal?.location || null,
        links: reviewedData?.personal?.links || null
      },
      professional: {
        headline: reviewedData?.professional?.headline || null,
        summary: acceptedSummary ? acceptedSummary.suggested_text : (reviewedData?.professional?.summary || null),
        years_experience: reviewedData?.professional?.years_experience || null
      },
      skills: skillsList,
      experience: experienceList,
      education: educationList,
      certifications: certList
    };
  }

  /**
   * Executes the full tailoring pipeline.
   */
  public static async executeTailoring(
    reviewedData: any,
    profile: any,
    job: {
      title: string;
      company_name: string;
      description?: string | null;
      requirements?: string | null;
      preferred_qualifications?: string | null;
      responsibilities?: string | null;
    },
    alignmentResult?: JobAlignmentResult | any,
    options?: { sessionId?: string }
  ): Promise<GenerationEngineResult> {
    // 1. Build evidence manifest
    const evidenceCards = buildEvidenceCards(reviewedData, profile);

    // 2. Build tailoring plan
    const tailoringPlan = createTailoringPlan(job, evidenceCards, alignmentResult);

    // 3. Generate suggestions via Gemini
    const provider = new GeminiCvTailoringProvider();
    const rawSuggestions = await provider.generateSuggestions(evidenceCards, tailoringPlan, job, options);
    const executedModel = provider.getLastExecutedModel();

    // 4. Deterministic post-generation validation on every suggestion
    const validatedSuggestions: TailoringSuggestion[] = rawSuggestions.map(sug => {
      const validation = validateSuggestion(sug, evidenceCards);
      return {
        ...sug,
        original_suggested_text: sug.suggested_text,
        generated_suggested_text: sug.suggested_text,
        candidate_edited: false,
        status: validation.isValid ? ('pending' as const) : ('blocked' as const),
        validation_status: validation.isValid ? ('valid' as const) : ('blocked' as const),
        validation_issues: validation.isValid ? [] : validation.issues,
        reason: validation.isValid ? sug.reason : (validation.reason || sug.reason)
      };
    });

    // 5. Compile initial draft
    const initialDraft = this.compileTailoredDraft(reviewedData, validatedSuggestions);

    return {
      evidence_manifest: evidenceCards,
      tailoring_plan: tailoringPlan,
      suggestions: validatedSuggestions,
      draft_data: initialDraft,
      generation_provider: 'google',
      generation_model: executedModel
    };
  }
}
