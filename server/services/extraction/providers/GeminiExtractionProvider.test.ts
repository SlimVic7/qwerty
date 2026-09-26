import { describe, it, expect, vi } from 'vitest';
import { GeminiJobExtractionProvider } from './GeminiExtractionProvider.js';
import { GoogleGenAI } from '@google/genai';

vi.mock('@google/genai');

describe('GeminiJobExtractionProvider', () => {
  it('chunks and extracts properly', async () => {
    // Setup mock
    const mockGenerateContent = vi.fn().mockResolvedValue({
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 50 },
      text: JSON.stringify({
        jobs: [
          {
            source_segment: 'Test',
            fields: { title: 'Engineer', company_name: 'Tech Inc' },
            field_evidence: { title: 'Test' },
            confidence: 0.9,
            warnings: []
          }
        ]
      })
    });

    vi.mocked(GoogleGenAI).mockImplementation(function() {
      return {
        models: {
          generateContent: mockGenerateContent
        }
      } as any;
    });

    process.env.GEMINI_API_KEY = 'mock';
    const provider = new GeminiJobExtractionProvider();
    
    const res = await provider.extractJobs('Test', {});
    expect(res.jobs.length).toBe(1);
    expect(res.jobs[0].fields.title).toBe('Engineer');
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });
});
