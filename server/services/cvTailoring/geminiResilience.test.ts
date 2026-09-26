import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isTransientError,
  extractStatusCode,
  parseRetryDelay,
  calculateBackoff,
  GeminiCircuitBreaker,
  GeminiTelemetryCollector,
  TailoringRequestDeduplicator,
  SafeGeminiTelemetryEvent
} from './geminiResilience.js';
import { GeminiCvTailoringProvider } from './GeminiCvTailoringProvider.js';
import { CvTailoringEngine } from './cvTailoringEngine.js';
import { CandidateEvidenceCard, TailoringPlan } from './types.js';

describe('Gemini Resilience & Availability Controls', () => {
  beforeEach(() => {
    GeminiTelemetryCollector.clear();
    TailoringRequestDeduplicator.clear();
  });

  describe('Transient Error Classification', () => {
    it('correctly identifies transient status codes (408, 429, 500, 502, 503, 504)', () => {
      expect(isTransientError({ status: 503, message: 'Service Unavailable' })).toBe(true);
      expect(isTransientError({ status: 429, message: 'Resource Exhausted' })).toBe(true);
      expect(isTransientError({ statusCode: 500, message: 'Internal Server Error' })).toBe(true);
      expect(isTransientError({ status: 502, message: 'Bad Gateway' })).toBe(true);
      expect(isTransientError({ status: 504, message: 'Gateway Timeout' })).toBe(true);
      expect(isTransientError({ status: 408, message: 'Request Timeout' })).toBe(true);
    });

    it('correctly identifies transient network/socket error patterns', () => {
      expect(isTransientError(new Error('fetch failed'))).toBe(true);
      expect(isTransientError(new Error('socket hang up'))).toBe(true);
      expect(isTransientError({ code: 'ECONNRESET', message: 'connection reset' })).toBe(true);
      expect(isTransientError({ code: 'ETIMEDOUT', message: 'connection timed out' })).toBe(true);
      expect(isTransientError(new Error('The model is overloaded. Please try again later.'))).toBe(true);
      expect(isTransientError(new Error('Resource exhausted due to high demand.'))).toBe(true);
    });

    it('STRICTLY rejects non-transient client/auth/schema errors (no retry)', () => {
      expect(isTransientError({ status: 400, message: 'Bad Request' })).toBe(false);
      expect(isTransientError({ status: 401, message: 'Unauthorized API Key' })).toBe(false);
      expect(isTransientError({ status: 403, message: 'Permission Denied' })).toBe(false);
      expect(isTransientError({ status: 404, message: 'Model Not Found' })).toBe(false);
      expect(isTransientError({ isContentError: true, message: 'MODEL_OUTPUT_PARSE_ERROR' })).toBe(false);
      expect(isTransientError({ message: 'INVALID_SCHEMA: Field missing' })).toBe(false);
      expect(isTransientError({ message: 'FACTUAL_MEANING_REVERSAL' })).toBe(false);
    });
  });

  describe('Backoff, Jitter & Delay Parsing', () => {
    it('parses retry delay from error messages', () => {
      expect(parseRetryDelay(new Error('Please retry in 3.5s.'))).toBe(3500);
      expect(parseRetryDelay(new Error('Rate limit exceeded: "retryDelay": "2s"'))).toBe(2000);
      expect(parseRetryDelay({ retryAfter: 4 })).toBe(4000);
      expect(parseRetryDelay(new Error('Generic failure'))).toBeNull();
    });

    it('calculates exponential backoff within bounds with jitter', () => {
      const b1 = calculateBackoff(1, null, 1000, 6000, 200);
      expect(b1).toBeGreaterThanOrEqual(1000);
      expect(b1).toBeLessThanOrEqual(1200);

      const b2 = calculateBackoff(2, null, 1000, 6000, 200);
      expect(b2).toBeGreaterThanOrEqual(2000);
      expect(b2).toBeLessThanOrEqual(2200);

      const b3 = calculateBackoff(3, null, 1000, 6000, 200);
      expect(b3).toBeGreaterThanOrEqual(4000);
      expect(b3).toBeLessThanOrEqual(4200);

      // Capped at maxDelayMs
      const b5 = calculateBackoff(5, null, 1000, 6000, 200);
      expect(b5).toBeGreaterThanOrEqual(6000);
      expect(b5).toBeLessThanOrEqual(6200);
    });
  });

  describe('Circuit Breaker State Machine', () => {
    it('transitions CLOSED -> OPEN -> HALF_OPEN -> CLOSED properly', () => {
      const cb = new GeminiCircuitBreaker({ failureThreshold: 3, cooldownMs: 50 });
      const model = 'gemini-test-cb';

      expect(cb.getState(model)).toBe('CLOSED');
      expect(cb.canExecute(model)).toBe(true);

      // Non-transient errors do not affect breaker
      cb.recordFailure(model, false);
      expect(cb.getState(model)).toBe('CLOSED');
      expect(cb.getStats(model).failureCount).toBe(0);

      // 2 transient failures: still CLOSED
      cb.recordFailure(model, true);
      cb.recordFailure(model, true);
      expect(cb.getState(model)).toBe('CLOSED');
      expect(cb.canExecute(model)).toBe(true);

      // 3rd transient failure trips breaker to OPEN
      cb.recordFailure(model, true);
      expect(cb.getState(model)).toBe('OPEN');
      expect(cb.canExecute(model)).toBe(false);

      // During cooldown, remains OPEN and rejects
      expect(cb.canExecute(model)).toBe(false);

      // Fast-forward past cooldown
      return new Promise<void>(resolve => {
        setTimeout(() => {
          // After cooldown, should become HALF_OPEN
          expect(cb.getState(model)).toBe('HALF_OPEN');
          expect(cb.canExecute(model)).toBe(true); // Allows single probe

          // Successful probe closes circuit
          cb.recordSuccess(model);
          expect(cb.getState(model)).toBe('CLOSED');
          expect(cb.getStats(model).failureCount).toBe(0);
          resolve();
        }, 60);
      });
    });

    it('probe failure in HALF_OPEN immediately re-opens circuit', async () => {
      const cb = new GeminiCircuitBreaker({ failureThreshold: 2, cooldownMs: 30 });
      const model = 'gemini-probe-fail';

      cb.recordFailure(model, true);
      cb.recordFailure(model, true);
      expect(cb.getState(model)).toBe('OPEN');

      await new Promise(r => setTimeout(r, 40));
      expect(cb.getState(model)).toBe('HALF_OPEN');

      // Probe fails with transient error
      cb.recordFailure(model, true);
      expect(cb.getState(model)).toBe('OPEN');
      expect(cb.canExecute(model)).toBe(false);
    });
  });

  describe('Safe Telemetry Logging (Zero CV Privacy Leakage)', () => {
    it('records only operational metrics and strictly omits candidate CV content', () => {
      const event: any = {
        feature: 'cv_tailoring',
        session_id: 'sess-123',
        provider: 'google',
        model: 'gemini-3.6-flash',
        attempt: 1,
        status_code: 503,
        error_class: 'ServiceUnavailable',
        latency_ms: 350,
        retry_count: 0,
        fallback_used: false,
        final_outcome: 'transient_retry',
        timestamp: new Date().toISOString(),
        // Malicious or accidental sensitive properties
        reviewed_data: { personal: { email: 'secret@test.com' } },
        full_cv: 'Senior Network Engineer with 10 years experience...',
        email: 'candidate@test.com',
        phone: '+2348012345678',
        evidence_text: 'Confidential bank infrastructure'
      };

      GeminiTelemetryCollector.record(event);
      const recorded = GeminiTelemetryCollector.getEvents();
      expect(recorded.length).toBe(1);

      const saved = recorded[0] as any;
      expect(saved.feature).toBe('cv_tailoring');
      expect(saved.session_id).toBe('sess-123');
      expect(saved.model).toBe('gemini-3.6-flash');
      expect(saved.latency_ms).toBe(350);

      // Verify privacy sanitization
      expect(saved.reviewed_data).toBeUndefined();
      expect(saved.full_cv).toBeUndefined();
      expect(saved.email).toBeUndefined();
      expect(saved.phone).toBeUndefined();
      expect(saved.evidence_text).toBeUndefined();
    });
  });

  describe('Request Deduplication & Concurrency Lock', () => {
    it('reuses in-flight promise for concurrent requests with identical tuple', async () => {
      const key = TailoringRequestDeduplicator.getKey('u1', 'j1', 'p1', 'a1', 'cv-tailoring-v1.2');
      let executionCount = 0;

      const longRunningTask = async () => {
        executionCount++;
        await new Promise(r => setTimeout(r, 40));
        return { sessionId: 'sess-single', generated: true };
      };

      // Launch 3 simultaneous requests (simulating rapid double/triple clicks)
      const [r1, r2, r3] = await Promise.all([
        TailoringRequestDeduplicator.executeOrJoin(key, longRunningTask),
        TailoringRequestDeduplicator.executeOrJoin(key, longRunningTask),
        TailoringRequestDeduplicator.executeOrJoin(key, longRunningTask)
      ]);

      expect(executionCount).toBe(1); // Only executed ONCE
      expect(r1.result.sessionId).toBe('sess-single');
      expect(r2.result.sessionId).toBe('sess-single');
      expect(r3.result.sessionId).toBe('sess-single');
      expect(r1.wasJoined).toBe(false); // First initiated
      expect(r2.wasJoined).toBe(true);  // Joined existing
      expect(r3.wasJoined).toBe(true);  // Joined existing

      // After completion, inFlight is cleared
      expect(TailoringRequestDeduplicator.isInFlight(key)).toBe(false);
    });
  });

  describe('Provider Resilience & Bounded Retry Execution', () => {
    const mockEvidence: CandidateEvidenceCard[] = [
      {
        evidence_id: 'exp-0-resp-0',
        source_type: 'experience',
        source_path: 'experience[0].responsibilities[0]',
        text: 'Configured enterprise Cisco routers and switches for network uptime.',
        employer: 'Acme Telecom',
        job_title: 'Network Engineer'
      }
    ];

    const mockPlan: TailoringPlan = {
      target_job_title: 'Senior Network Engineer',
      target_company: 'Global Net',
      priority_strengths: ['Cisco routing'],
      reorder_priorities: [],
      concision_targets: [],
      unaddressed_criteria: []
    };

    const mockJob = {
      title: 'Senior Network Engineer',
      company_name: 'Global Net'
    };

    const validJsonResponse = {
      text: JSON.stringify({
        summary_suggestion: {
          original_text: 'Experienced network engineer',
          suggested_text: 'Configured enterprise Cisco routers and switches ensuring high network availability.',
          source_refs: ['exp-0-resp-0'],
          reason: 'Aligns network experience'
        },
        experience_suggestions: [
          {
            original_text: 'Configured enterprise Cisco routers and switches for network uptime.',
            suggested_text: 'Configured enterprise Cisco routers and switches to optimize network uptime.',
            source_refs: ['exp-0-resp-0'],
            reason: 'Strengthens impact'
          }
        ]
      })
    };

    it('retries transient 503/429 errors with backoff and succeeds on subsequent attempt', async () => {
      let callCount = 0;
      const mockGenerate = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          const err: any = new Error('503 Service Unavailable: High demand');
          err.status = 503;
          throw err;
        }
        return validJsonResponse;
      });

      const mockAi: any = {
        models: {
          generateContent: mockGenerate
        }
      };

      const provider = new GeminiCvTailoringProvider(mockAi);
      const suggestions = await provider.generateSuggestions(mockEvidence, mockPlan, mockJob, {
        retryConfig: { maxRetriesPerModel: 2, baseDelayMs: 10, maxDelayMs: 20, maxJitterMs: 5, requestTimeoutMs: 1000 }
      });

      expect(callCount).toBe(2);
      expect(suggestions.length).toBe(2);
      expect(suggestions[0].suggested_text).toContain('Cisco routers');

      const events = GeminiTelemetryCollector.getEvents();
      expect(events.some(e => e.final_outcome === 'transient_retry')).toBe(true);
      expect(events.some(e => e.final_outcome === 'success')).toBe(true);
    });

    it('STRICTLY does NOT retry non-transient 400/401/403 errors on the same model', async () => {
      const callsPerModel: Record<string, number> = {};
      const mockGenerate = vi.fn().mockImplementation(async (params: any) => {
        callsPerModel[params.model] = (callsPerModel[params.model] || 0) + 1;
        const err: any = new Error('400 Bad Request: Invalid argument');
        err.status = 400;
        throw err;
      });

      const mockAi: any = {
        models: {
          generateContent: mockGenerate
        }
      };

      const provider = new GeminiCvTailoringProvider(mockAi);

      await expect(
        provider.generateSuggestions(mockEvidence, mockPlan, mockJob, {
          retryConfig: { maxRetriesPerModel: 3, baseDelayMs: 10, maxDelayMs: 20, maxJitterMs: 5, requestTimeoutMs: 1000 }
        })
      ).rejects.toThrow('GEMINI_UNAVAILABLE');

      // Primary model was attempted exactly ONCE (zero retries on 400)
      const primaryModel = provider.getModelName();
      expect(callsPerModel[primaryModel]).toBe(1);
    });

    it('falls back to secondary model when primary model exhausts retries', async () => {
      const callsPerModel: Record<string, number> = {};
      const mockGenerate = vi.fn().mockImplementation(async (params: any) => {
        callsPerModel[params.model] = (callsPerModel[params.model] || 0) + 1;
        if (params.model === 'gemini-3.6-flash') {
          const err: any = new Error('503 Service Unavailable');
          err.status = 503;
          throw err;
        }
        return validJsonResponse;
      });

      const mockAi: any = {
        models: {
          generateContent: mockGenerate
        }
      };

      const provider = new GeminiCvTailoringProvider(mockAi);
      const suggestions = await provider.generateSuggestions(mockEvidence, mockPlan, mockJob, {
        retryConfig: { maxRetriesPerModel: 1, baseDelayMs: 10, maxDelayMs: 20, maxJitterMs: 5, requestTimeoutMs: 1000 }
      });

      expect(suggestions.length).toBe(2);
      expect(provider.getLastExecutedModel()).toBe('gemini-3.5-flash');

      const events = GeminiTelemetryCollector.getEvents();
      expect(events.some(e => e.fallback_used === true && e.final_outcome === 'success')).toBe(true);
    });

    it('returns controlled GEMINI_UNAVAILABLE on total model exhaustion', async () => {
      const mockGenerate = vi.fn().mockImplementation(async () => {
        const err: any = new Error('503 Overloaded');
        err.status = 503;
        throw err;
      });

      const mockAi: any = {
        models: {
          generateContent: mockGenerate
        }
      };

      const provider = new GeminiCvTailoringProvider(mockAi);

      try {
        await provider.generateSuggestions(mockEvidence, mockPlan, mockJob, {
          retryConfig: { maxRetriesPerModel: 1, baseDelayMs: 5, maxDelayMs: 10, maxJitterMs: 2, requestTimeoutMs: 1000 }
        });
        expect.unreachable('Should have thrown');
      } catch (err: any) {
        expect(err.message).toBe('GEMINI_UNAVAILABLE');
        expect(err.code).toBe('GEMINI_UNAVAILABLE');
        expect(err.status).toBe(503);
      }
    });

    it('maintains deterministic evidence safety post-generation validation on suggestions', async () => {
      // If AI model hallucinates unevidenced technologies, validator flags them
      const hallucinatedResponse = {
        text: JSON.stringify({
          experience_suggestions: [
            {
              original_text: 'Configured enterprise Cisco routers and switches for network uptime.',
              // Injects Kubernetes and Fortinet which are not in candidate evidence
              suggested_text: 'Configured enterprise Cisco routers, Fortinet firewalls, and Kubernetes clusters.',
              source_refs: ['exp-0-resp-0'],
              reason: 'Add technologies'
            }
          ]
        })
      };

      const mockAi: any = {
        models: {
          generateContent: vi.fn().mockResolvedValue(hallucinatedResponse)
        }
      };

      const provider = new GeminiCvTailoringProvider(mockAi);
      const suggestions = await provider.generateSuggestions(mockEvidence, mockPlan, mockJob, {
        retryConfig: { maxRetriesPerModel: 0, requestTimeoutMs: 1000 }
      });

      expect(suggestions.length).toBe(1);

      // Now pass through the deterministic post-generation validation pipeline in CvTailoringEngine
      const reviewedData = {
        experience: [
          {
            employer: 'Acme Telecom',
            job_title: 'Network Engineer',
            responsibilities: ['Configured enterprise Cisco routers and switches for network uptime.']
          }
        ]
      };
      const profile = { full_name: 'John Candidate' };

      // We spy on GeminiCvTailoringProvider prototype to return the hallucinated suggestion
      const spy = vi.spyOn(GeminiCvTailoringProvider.prototype, 'generateSuggestions').mockResolvedValue(suggestions);

      const engineResult = await CvTailoringEngine.executeTailoring(reviewedData, profile, mockJob);
      spy.mockRestore();

      // The hallucination MUST be detected and blocked deterministically
      const expSug = engineResult.suggestions[0];
      expect(expSug.status).toBe('blocked');
      expect(expSug.validation_status).toBe('blocked');
      expect(expSug.validation_issues).toBeDefined();
      expect(expSug.validation_issues!.length).toBeGreaterThan(0);
      expect(expSug.validation_issues!.some(issue => issue.toLowerCase().includes('unsupported technology') || issue.toLowerCase().includes('kubernetes'))).toBe(true);
    });
  });
});
