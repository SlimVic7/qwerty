/**
 * Centralized server-side Gemini model configuration and resolution mechanism.
 * 
 * Ensures consistent model selection, fallback candidates, and configurable overrides
 * across all AI providers (Job Extraction, CV Extraction, and ATS Recommendations).
 * Prevents client-side exposure of API keys and model configurations.
 */

export const DEFAULT_GEMINI_MODEL = 'gemini-3.6-flash';
export const DEFAULT_GEMINI_FALLBACK_MODELS = ['gemini-3.5-flash'];

export interface GeminiModelResolution {
  primaryModel: string;
  candidateModels: string[];
}

/**
 * Resolves the primary Gemini model and fallback candidate sequence.
 * 
 * Precedence:
 * 1. process.env.GEMINI_MODEL (if configured in server environment)
 * 2. DEFAULT_GEMINI_MODEL ('gemini-3.6-flash')
 * 
 * Candidates:
 * [primaryModel, ...fallbacks (deduplicated)]
 */
export function getGeminiModelConfig(): GeminiModelResolution {
  const primaryModel = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  
  let fallbackModels = DEFAULT_GEMINI_FALLBACK_MODELS;
  if (process.env.GEMINI_FALLBACK_MODELS) {
    fallbackModels = process.env.GEMINI_FALLBACK_MODELS.split(',')
      .map(m => m.trim())
      .filter(Boolean);
  }

  const candidateModels = [primaryModel];
  for (const model of fallbackModels) {
    if (!candidateModels.includes(model)) {
      candidateModels.push(model);
    }
  }

  return {
    primaryModel,
    candidateModels,
  };
}

export function getPrimaryGeminiModel(): string {
  return getGeminiModelConfig().primaryModel;
}

export function getGeminiModelCandidates(): string[] {
  return getGeminiModelConfig().candidateModels;
}
