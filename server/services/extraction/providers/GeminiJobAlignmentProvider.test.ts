import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeminiJobAlignmentProvider } from './GeminiJobAlignmentProvider.js';
import { GoogleGenAI } from '@google/genai';
import { getPrimaryGeminiModel, getGeminiModelCandidates } from '../../../config/gemini.js';

vi.mock('@google/genai');

describe('GeminiJobAlignmentProvider & Central Gemini Configuration', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('uses central config without hardcoding models and resolves primary and fallback models', () => {
    delete process.env.GEMINI_MODEL;
    delete process.env.GEMINI_FALLBACK_MODELS;

    const primary = getPrimaryGeminiModel();
    const candidates = getGeminiModelCandidates();

    expect(primary).toBe('gemini-3.6-flash');
    expect(candidates).toContain('gemini-3.6-flash');
    expect(candidates).toContain('gemini-3.5-flash');

    const provider = new GeminiJobAlignmentProvider();
    expect(provider.getModelName()).toBe(primary);
  });

  it('respects GEMINI_MODEL and GEMINI_FALLBACK_MODELS environment overrides centrally', () => {
    process.env.GEMINI_MODEL = 'gemini-custom-primary';
    process.env.GEMINI_FALLBACK_MODELS = 'gemini-custom-fallback-1, gemini-custom-fallback-2';

    const primary = getPrimaryGeminiModel();
    const candidates = getGeminiModelCandidates();

    expect(primary).toBe('gemini-custom-primary');
    expect(candidates).toEqual([
      'gemini-custom-primary',
      'gemini-custom-fallback-1',
      'gemini-custom-fallback-2'
    ]);

    const provider = new GeminiJobAlignmentProvider();
    expect(provider.getModelName()).toBe('gemini-custom-primary');
  });

  it('persists and tracks the exact successful runtime model', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.GEMINI_MODEL = 'gemini-test-model';

    const mockExplanation = {
      summary: 'Strong candidate profile alignment.',
      strengths: ['Verified CISA certification.'],
      gaps: ['Not found in your approved profile: AWS Cloud.'],
      recommendations: ['Highlight relevant IT audit experience.'],
      suggested_interview_prep: ['Prepare to discuss ISO 27001 lead audits.']
    };

    const mockGenerateContent = vi.fn().mockResolvedValue({
      text: JSON.stringify(mockExplanation)
    });

    vi.mocked(GoogleGenAI).mockImplementation(function() {
      return {
        models: {
          generateContent: mockGenerateContent
        }
      } as any;
    });

    const provider = new GeminiJobAlignmentProvider();
    const mockAlignment: any = {
      score: 85,
      alignment_band: 'strong',
      components: [],
      criteria: [
        { criterion: 'CISA', status: 'matched', candidate_evidence: 'CISA cert' },
        { criterion: 'AWS Cloud', status: 'not_found' }
      ]
    };

    const explanation = await provider.generateExplanation(
      mockAlignment,
      {},
      { title: 'Auditor', company_name: 'Corp', description: 'Auditing' }
    );

    expect(explanation.summary).toBe(mockExplanation.summary);
    expect(provider.getLastExecutedModel()).toBe('gemini-test-model');
  });

  it('throws GEMINI_API_KEY_NOT_CONFIGURED when API key is missing', async () => {
    delete process.env.GEMINI_API_KEY;
    const provider = new GeminiJobAlignmentProvider();

    await expect(
      provider.generateExplanation({} as any, {}, { title: 'X', company_name: 'Y', description: 'Z' })
    ).rejects.toThrow('GEMINI_API_KEY_NOT_CONFIGURED');
  });
});
