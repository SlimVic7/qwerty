import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GEMINI_FALLBACK_MODELS,
  getGeminiModelConfig,
  getPrimaryGeminiModel,
  getGeminiModelCandidates
} from './gemini.js';
import { GeminiJobExtractionProvider } from '../services/extraction/providers/GeminiExtractionProvider.js';
import { GeminiCVExtractionProvider } from '../services/extraction/providers/GeminiCVExtractionProvider.js';
import { GeminiAtsRecommendationProvider } from '../services/extraction/providers/GeminiAtsRecommendationProvider.js';

describe('Centralized Gemini Model Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('uses DEFAULT_GEMINI_MODEL when GEMINI_MODEL is not set', () => {
    delete process.env.GEMINI_MODEL;
    expect(getPrimaryGeminiModel()).toBe(DEFAULT_GEMINI_MODEL);
    const candidates = getGeminiModelCandidates();
    expect(candidates[0]).toBe(DEFAULT_GEMINI_MODEL);
    expect(candidates).toContain(DEFAULT_GEMINI_FALLBACK_MODELS[0]);
  });

  it('respects GEMINI_MODEL when configured', () => {
    process.env.GEMINI_MODEL = 'gemini-custom-model';
    expect(getPrimaryGeminiModel()).toBe('gemini-custom-model');
    const candidates = getGeminiModelCandidates();
    expect(candidates[0]).toBe('gemini-custom-model');
    expect(candidates).toContain('gemini-3.5-flash');
  });

  it('deduplicates candidate models if GEMINI_MODEL matches a fallback', () => {
    process.env.GEMINI_MODEL = 'gemini-3.5-flash';
    const candidates = getGeminiModelCandidates();
    expect(candidates[0]).toBe('gemini-3.5-flash');
    const count = candidates.filter(m => m === 'gemini-3.5-flash').length;
    expect(count).toBe(1);
  });

  it('respects GEMINI_FALLBACK_MODELS when configured', () => {
    process.env.GEMINI_MODEL = 'gemini-3.6-flash';
    process.env.GEMINI_FALLBACK_MODELS = 'gemini-backup-1, gemini-backup-2';
    const config = getGeminiModelConfig();
    expect(config.primaryModel).toBe('gemini-3.6-flash');
    expect(config.candidateModels).toEqual([
      'gemini-3.6-flash',
      'gemini-backup-1',
      'gemini-backup-2'
    ]);
  });

  it('ensures all three providers resolve their model name from central config', () => {
    process.env.GEMINI_API_KEY = 'mock-key';
    process.env.GEMINI_MODEL = 'gemini-test-central';

    const jobProvider = new GeminiJobExtractionProvider();
    const cvProvider = new GeminiCVExtractionProvider();
    const atsProvider = new GeminiAtsRecommendationProvider();

    expect(jobProvider.getModelName()).toBe('gemini-test-central');
    expect(cvProvider.getModelName()).toBe('gemini-test-central');
    expect(atsProvider.getModelName()).toBe('gemini-test-central');

    expect(jobProvider.getLastExecutedModel()).toBe('gemini-test-central');
    expect(cvProvider.getLastExecutedModel()).toBe('gemini-test-central');
    expect(atsProvider.getLastExecutedModel()).toBe('gemini-test-central');
  });
});
