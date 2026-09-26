import { GoogleGenAI, Type, Schema } from '@google/genai';
import { JobExtractionProvider, JobExtractionResult, JobExtractionItem, ExtractionContext } from '../types.js';
import { chunkText } from '../chunking.js';
import { getPrimaryGeminiModel, getGeminiModelCandidates } from '../../../config/gemini.js';

const jobSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    source_segment: {
      type: Type.STRING,
      description: "The exact raw text segment from the input that corresponds to this single job advert. Do not alter it."
    },
    fields: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, nullable: true },
        company_name: { type: Type.STRING, nullable: true },
        company_logo_url: { type: Type.STRING, nullable: true },
        location_text: { type: Type.STRING, nullable: true },
        country: { type: Type.STRING, nullable: true },
        city: { type: Type.STRING, nullable: true },
        workplace_type: { type: Type.STRING, enum: ['onsite', 'hybrid', 'remote', 'unspecified'], nullable: true },
        employment_type: { type: Type.STRING, enum: ['full_time', 'part_time', 'contract', 'internship', 'temporary', 'volunteer', 'unspecified'], nullable: true },
        experience_level: { type: Type.STRING, nullable: true },
        description: { type: Type.STRING, nullable: true },
        responsibilities: { type: Type.STRING, nullable: true },
        requirements: { type: Type.STRING, nullable: true },
        preferred_qualifications: { type: Type.STRING, nullable: true },
        benefits: { type: Type.STRING, nullable: true },
        salary_min: { type: Type.NUMBER, nullable: true },
        salary_max: { type: Type.NUMBER, nullable: true },
        salary_currency: { type: Type.STRING, nullable: true },
        salary_period: { type: Type.STRING, nullable: true },
        application_url: { type: Type.STRING, nullable: true },
        application_email: { type: Type.STRING, nullable: true },
        source_name: { type: Type.STRING, nullable: true },
        source_url: { type: Type.STRING, nullable: true },
        application_deadline: { type: Type.STRING, description: "ISO date if explicitly stated, otherwise null.", nullable: true }
      }
    },
    field_evidence: {
      type: Type.OBJECT,
      description: "Map each extracted field name to the exact short quote from the source_segment that proves it."
    },
    confidence: { type: Type.NUMBER, description: "0.0 to 1.0 confidence score for the extraction." },
    warnings: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of warnings, e.g., missing crucial info like company name, inferred ambiguity, etc."
    }
  },
  required: ["source_segment", "fields", "field_evidence", "confidence", "warnings"]
};

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    jobs: {
      type: Type.ARRAY,
      items: jobSchema
    }
  },
  required: ["jobs"]
};

const SYSTEM_INSTRUCTION = `You are an expert job advertisement extractor. 
Your task is to take a block of messy, unformatted text containing ONE OR MORE job advertisements and accurately separate them and extract structured data.
STRICT ANTI-HALLUCINATION RULES:
1. DO NOT invent or guess company names, salary, currency, location, deadline, or requirements. 
2. If information is not in the source, leave it null.
3. Only normalize currencies if unambiguous (₦/N/NGN -> NGN, £ -> GBP, € -> EUR). Do not assume USD without context.
4. Normalize workplace_type and employment_type based on explicit text. 
5. Do NOT create fictional descriptions or duties. Keep strictly to what is provided.
6. Extract multiple distinct jobs if present, don't combine them. Conversely, don't split a single job just because it has sections like "Requirements".`;

export class GeminiJobExtractionProvider implements JobExtractionProvider {
  private ai: GoogleGenAI;
  private maxRetries = 3;
  private lastExecutedModel: string = getPrimaryGeminiModel();

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  public getModelName(): string {
    return getPrimaryGeminiModel();
  }

  public getLastExecutedModel(): string {
    return this.lastExecutedModel;
  }

  async extractJobs(rawText: string, context?: ExtractionContext): Promise<JobExtractionResult> {
    const chunks = chunkText(rawText, 15000);
    const allJobs: JobExtractionItem[] = [];
    const candidateModels = getGeminiModelCandidates();
    
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let requestCount = 0;
    const startTime = Date.now();

    for (const chunk of chunks) {
      if (!chunk.trim()) continue;

      let success = false;
      let lastError = null;

      for (const model of candidateModels) {
        let attempt = 0;
        while (!success && attempt < this.maxRetries) {
          attempt++;
          requestCount++;
          try {
            const response = await this.ai.models.generateContent({
              model: model,
              contents: chunk,
              config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: "application/json",
                responseSchema: responseSchema,
              }
            });

            const usage = response.usageMetadata;
            if (usage) {
              totalInputTokens += usage.promptTokenCount || 0;
              totalOutputTokens += usage.candidatesTokenCount || 0;
            }

            const text = response.text;
            if (text) {
              const data = JSON.parse(text);
              if (data && Array.isArray(data.jobs)) {
                allJobs.push(...data.jobs);
                this.lastExecutedModel = model;
                success = true;
                break;
              } else {
                throw new Error("Invalid schema: 'jobs' array missing.");
              }
            } else {
              throw new Error("Empty response from Gemini.");
            }
          } catch (error: any) {
            lastError = error;
            
            if (error.status === 404 || error.status === 401 || error.status === 403 || error.status === 400) {
              break;
            }
            
            // Only retry on 429, 5xx, or network issues, or transient schema parsing errors
            const isTransient = error.status === 429 || error.status >= 500 || error.message?.includes('JSON');
            if (!isTransient) {
              break;
            }
            // Exponential backoff
            if (attempt < this.maxRetries) {
              await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
            }
          }
        }
        if (success) break;
      }

      if (!success) {
        console.error(`Gemini extraction failed for a chunk after trying candidate models [${candidateModels.join(', ')}]. Status: ${lastError?.status || 'unknown'}. Error: ${lastError?.message || 'Unknown error'}`);
        
        const err = new Error('AI_EXTRACTION_FAILED');
        (err as any).code = 'AI_EXTRACTION_FAILED';
        if (lastError?.status === 429) {
          (err as any).code = 'AI_RATE_LIMITED';
        } else if (lastError?.status === 404) {
          (err as any).code = 'AI_MODEL_UNAVAILABLE';
        }
        throw err;
      }
    }

    return {
      jobs: allJobs,
      metadata: {
        model: this.lastExecutedModel,
        requestCount,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        durationMs: Date.now() - startTime
      }
    };
  }
}
