import { JobExtractionProvider } from './types.js';
import { GeminiJobExtractionProvider } from './providers/GeminiExtractionProvider.js';
import { MockExtractionProvider } from './providers/MockExtractionProvider.js';

let provider: JobExtractionProvider | null = null;

export function getExtractionProvider(mode: 'gemini' | 'mock' = 'gemini'): JobExtractionProvider {
  if (mode === 'mock') {
    return new MockExtractionProvider();
  }
  
  if (!provider) {
    provider = new GeminiJobExtractionProvider();
  }
  return provider;
}
