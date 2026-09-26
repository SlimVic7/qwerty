import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import WordExtractor from 'word-extractor';
import crypto from 'crypto';

export type FileExtractionResult = {
  text: string;
  hash: string;
  warnings?: string[];
};

export async function extractTextFromCV(buffer: Buffer, mimeType: string): Promise<FileExtractionResult> {
  let text = '';
  const warnings: string[] = [];

  try {
    if (mimeType === 'application/pdf') {
      const parser = new PDFParse({ data: buffer });
      const data = await parser.getText();
      text = data.text;
      await parser.destroy();
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // mammoth handles docx well
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
      if (result.messages && result.messages.length > 0) {
        warnings.push(...result.messages.map(m => m.message));
      }
    } else if (mimeType === 'application/msword') {
      // Legacy .doc format
      const extractor = new WordExtractor();
      const extracted = await extractor.extract(buffer);
      text = extracted.getBody();
    } else {
      throw new Error('UNSUPPORTED_DOCUMENT');
    }

    // Normalize text
    text = normalizeText(text);

    if (!text || text.trim().length < 50) {
      throw new Error('OCR_REQUIRED');
    }

    const hash = crypto.createHash('sha256').update(text).digest('hex');

    return {
      text,
      hash,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  } catch (error: any) {
    if (error.message === 'OCR_REQUIRED' || error.message === 'UNSUPPORTED_DOCUMENT') {
      throw error;
    }
    const extractError = new Error('TEXT_EXTRACTION_FAILED');
    (extractError as any).cause = error;
    throw extractError;
  }
}

function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n') // Normalize newlines
    .replace(/\n{3,}/g, '\n\n') // Reduce multiple newlines
    .replace(/[ \t]{2,}/g, ' ') // Reduce multiple spaces
    .replace(/\u0000/g, '') // Remove null bytes
    .trim();
}
