import { describe, it, expect, vi } from 'vitest';
import { extractTextFromCV } from '../../../../server/services/cv/textExtractor.js';
import fs from 'fs';
import path from 'path';

vi.mock('pdf-parse', () => {
  return {
    PDFParse: class MockPDFParse {
      async getText() {
        return { text: '   ' };
      }
      async destroy() {}
    }
  };
});

vi.mock('mammoth', () => ({
  default: {
    extractRawText: vi.fn().mockResolvedValue({ value: 'docx mock text that is definitely long enough to pass the fifty character length check for OCR validation.', messages: [] })
  }
}));

vi.mock('word-extractor', () => {
  return {
    default: class MockWordExtractor {
      async extract() {
        return {
          getBody: () => 'legacy doc mock text that is definitely long enough to pass the fifty character length check for OCR validation.'
        };
      }
    }
  };
});

describe('textExtractor', () => {
  it('throws OCR_REQUIRED for empty or minimal text', async () => {
    // This is a minimal buffer pretending to be a PDF that doesn't yield text
    const minimalBuffer = Buffer.from('255044462D312E340A25E2E3CFD30A', 'hex');
    try {
      await extractTextFromCV(minimalBuffer, 'application/pdf');
      expect.fail('Should have thrown OCR_REQUIRED');
    } catch (error: any) {
      expect(error.message).toBe('OCR_REQUIRED');
    }
  });

  it('throws UNSUPPORTED_DOCUMENT for unknown mime types', async () => {
    try {
      await extractTextFromCV(Buffer.from('hello'), 'image/png');
      expect.fail('Should have thrown UNSUPPORTED_DOCUMENT');
    } catch (error: any) {
      expect(error.message).toBe('UNSUPPORTED_DOCUMENT');
    }
  });

  it('extracts DOCX via mammoth', async () => {
    const result = await extractTextFromCV(Buffer.from('fake'), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(result.text).toBe('docx mock text that is definitely long enough to pass the fifty character length check for OCR validation.');
  });

  it('extracts DOC via word-extractor', async () => {
    const result = await extractTextFromCV(Buffer.from('fake'), 'application/msword');
    expect(result.text).toBe('legacy doc mock text that is definitely long enough to pass the fifty character length check for OCR validation.');
  });
});
