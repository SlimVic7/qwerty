/**
 * QWERTY Stage 5.2 — AI Availability & Resilience Hardening
 * Centralized resilience, bounded retry with jitter, circuit breaker,
 * telemetry, and request deduplication for Gemini CV Tailoring.
 */

import { CURRENT_TAILORING_ENGINE_VERSION } from './types.js';

export interface RetryConfig {
  maxRetriesPerModel: number; // default: 3
  baseDelayMs: number; // default: 1000
  maxDelayMs: number; // default: 6000
  maxJitterMs: number; // default: 500
  requestTimeoutMs: number; // default: 25000 (25s)
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetriesPerModel: 3,
  baseDelayMs: 1000,
  maxDelayMs: 6000,
  maxJitterMs: 500,
  requestTimeoutMs: 25000
};

/**
 * Extracts numeric HTTP/gRPC status code from arbitrary provider error.
 */
export function extractStatusCode(error: any): number | undefined {
  if (!error) return undefined;
  if (typeof error.status === 'number') return error.status;
  if (typeof error.statusCode === 'number') return error.statusCode;
  if (typeof error.response?.status === 'number') return error.response.status;

  const match = (error.message || '').match(/\b(400|401|403|404|408|429|500|502|503|504)\b/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return undefined;
}

/**
 * Determines whether an error is transient and eligible for retry.
 * 
 * Retryable:
 * - 408 (Request Timeout)
 * - 429 (Too Many Requests / Resource Exhausted)
 * - 500 (Internal Server Error)
 * - 502 (Bad Gateway)
 * - 503 (Service Unavailable / Overloaded)
 * - 504 (Gateway Timeout)
 * - Network errors (ECONNRESET, ETIMEDOUT, socket hang up, fetch failed)
 * 
 * Strictly NOT Retryable:
 * - 400 (Bad Request)
 * - 401 (Unauthorized)
 * - 403 (Forbidden)
 * - 404 (Not Found)
 * - Model output parsing / JSON schema defects
 * - Candidate evidence safety validation errors
 */
export function isTransientError(error: any): boolean {
  if (!error) return false;

  const status = extractStatusCode(error);

  // Non-retryable status codes
  if (status === 400 || status === 401 || status === 403 || status === 404) {
    return false;
  }

  // Explicit retryable status codes
  if (status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504) {
    return true;
  }

  // Explicit non-transient error markers
  if (error.isContentError || error.isValidationError) {
    return false;
  }

  const msg = (error.message || '').toLowerCase();
  const code = (error.code || '').toLowerCase();

  if (
    msg.includes('model_output_parse_error') ||
    msg.includes('invalid_schema') ||
    msg.includes('validation_failed') ||
    msg.includes('syntaxerror: unexpected') ||
    msg.includes('unsupported_addition') ||
    msg.includes('factual_meaning_reversal')
  ) {
    return false;
  }

  // Transient network / capacity keywords
  const transientKeywords = [
    'resource_exhausted',
    'resource exhausted',
    'rate limit',
    'too many requests',
    'overloaded',
    'high demand',
    'service unavailable',
    'unavailable',
    'econnreset',
    'etimedout',
    'econnrefused',
    'esockettimedout',
    'deadline_exceeded',
    'socket hang up',
    'fetch failed',
    'network error',
    'gateway timeout',
    'bad gateway',
    'temporarily unavailable',
    'timed out'
  ];

  return transientKeywords.some(kw => msg.includes(kw) || code.includes(kw));
}

/**
 * Parses optional retry delay from Gemini provider error message or metadata.
 */
export function parseRetryDelay(error: any): number | null {
  if (!error) return null;
  const msg = error.message || '';

  // E.g. "Please retry in 2.5s"
  const secMatch = msg.match(/retry in ([0-9.]+)s/i);
  if (secMatch && secMatch[1]) {
    const sec = parseFloat(secMatch[1]);
    if (!isNaN(sec) && sec > 0) {
      return Math.round(sec * 1000);
    }
  }

  // E.g. "retryDelay": "3s"
  const jsonMatch = msg.match(/"retryDelay":\s*"([0-9.]+)s"/i);
  if (jsonMatch && jsonMatch[1]) {
    const sec = parseFloat(jsonMatch[1]);
    if (!isNaN(sec) && sec > 0) {
      return Math.round(sec * 1000);
    }
  }

  if (typeof error.retryAfter === 'number' && error.retryAfter > 0) {
    return Math.round(error.retryAfter * 1000);
  }

  return null;
}

/**
 * Calculates exponential backoff with random jitter.
 */
export function calculateBackoff(
  attempt: number,
  retryDelayMs?: number | null,
  baseDelayMs: number = DEFAULT_RETRY_CONFIG.baseDelayMs,
  maxDelayMs: number = DEFAULT_RETRY_CONFIG.maxDelayMs,
  maxJitterMs: number = DEFAULT_RETRY_CONFIG.maxJitterMs
): number {
  if (retryDelayMs && retryDelayMs > 0) {
    const clamped = Math.min(retryDelayMs, maxDelayMs);
    const jitter = Math.floor(Math.random() * maxJitterMs);
    return clamped + jitter;
  }

  const exponential = baseDelayMs * Math.pow(2, Math.max(0, attempt - 1));
  const capped = Math.min(exponential, maxDelayMs);
  const jitter = Math.floor(Math.random() * maxJitterMs);
  return capped + jitter;
}

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold?: number; // default: 3 consecutive transient failures
  cooldownMs?: number; // default: 20,000ms (20s)
}

/**
 * In-process model-health circuit breaker.
 * Protects against hammering congested/failing Gemini models.
 * 
 * Scoped by model name.
 * Development & early production in-process protection.
 * (Note: Distributed state via Redis/Cloud Memorystore recommended for horizontal multi-instance scaling).
 */
export class GeminiCircuitBreaker {
  private states: Map<string, CircuitBreakerState> = new Map();
  private failureCounts: Map<string, number> = new Map();
  private lastFailureTimes: Map<string, number> = new Map();
  private failureThreshold: number;
  private cooldownMs: number;

  constructor(config?: CircuitBreakerConfig) {
    this.failureThreshold = config?.failureThreshold ?? 3;
    this.cooldownMs = config?.cooldownMs ?? 20000;
  }

  public getState(model: string): CircuitBreakerState {
    const current = this.states.get(model) || 'CLOSED';
    if (current === 'OPEN') {
      const lastFailure = this.lastFailureTimes.get(model) || 0;
      if (Date.now() - lastFailure >= this.cooldownMs) {
        this.states.set(model, 'HALF_OPEN');
        return 'HALF_OPEN';
      }
    }
    return current;
  }

  public canExecute(model: string): boolean {
    const state = this.getState(model);
    if (state === 'CLOSED') return true;
    if (state === 'HALF_OPEN') return true; // Allows single probe request
    return false; // OPEN -> fast fail
  }

  public recordSuccess(model: string): void {
    this.states.set(model, 'CLOSED');
    this.failureCounts.set(model, 0);
  }

  public recordFailure(model: string, isTransient: boolean): void {
    if (!isTransient) {
      // Only transient capacity/provider errors affect the breaker
      return;
    }

    const currentState = this.getState(model);
    if (currentState === 'HALF_OPEN') {
      // Probe failed -> re-open circuit
      this.states.set(model, 'OPEN');
      this.lastFailureTimes.set(model, Date.now());
      return;
    }

    const count = (this.failureCounts.get(model) || 0) + 1;
    this.failureCounts.set(model, count);
    this.lastFailureTimes.set(model, Date.now());

    if (count >= this.failureThreshold) {
      this.states.set(model, 'OPEN');
    }
  }

  public reset(model?: string): void {
    if (model) {
      this.states.set(model, 'CLOSED');
      this.failureCounts.set(model, 0);
      this.lastFailureTimes.delete(model);
    } else {
      this.states.clear();
      this.failureCounts.clear();
      this.lastFailureTimes.clear();
    }
  }

  public getStats(model: string): { state: CircuitBreakerState; failureCount: number; lastFailureTime?: number } {
    return {
      state: this.getState(model),
      failureCount: this.failureCounts.get(model) || 0,
      lastFailureTime: this.lastFailureTimes.get(model)
    };
  }

  public configure(config: CircuitBreakerConfig): void {
    if (config.failureThreshold !== undefined) this.failureThreshold = config.failureThreshold;
    if (config.cooldownMs !== undefined) this.cooldownMs = config.cooldownMs;
  }
}

export const defaultCircuitBreaker = new GeminiCircuitBreaker();

/**
 * Safe Operational Telemetry for Gemini AI CV Tailoring.
 * STRICT PRIVACY REQUIREMENT: Absolutely NO candidate CV text, reviewed_data,
 * emails, phone numbers, or signed URLs are recorded.
 */
export interface SafeGeminiTelemetryEvent {
  feature: 'cv_tailoring';
  session_id?: string;
  provider: 'google';
  model: string;
  attempt: number;
  status_code?: number;
  error_class?: string;
  latency_ms: number;
  retry_count: number;
  fallback_used: boolean;
  final_outcome: 'success' | 'transient_retry' | 'fallback_switch' | 'circuit_open' | 'exhausted_failure';
  timestamp: string;
}

export class GeminiTelemetryCollector {
  private static events: SafeGeminiTelemetryEvent[] = [];
  private static maxStoredEvents = 300;

  public static record(event: SafeGeminiTelemetryEvent): void {
    // Defense-in-depth sanitization: purge any prohibited fields if inadvertently passed
    const safeEvent: SafeGeminiTelemetryEvent = {
      feature: 'cv_tailoring',
      session_id: event.session_id,
      provider: 'google',
      model: event.model,
      attempt: event.attempt,
      status_code: event.status_code,
      error_class: event.error_class,
      latency_ms: event.latency_ms,
      retry_count: event.retry_count,
      fallback_used: event.fallback_used,
      final_outcome: event.final_outcome,
      timestamp: event.timestamp || new Date().toISOString()
    };

    this.events.push(safeEvent);
    if (this.events.length > this.maxStoredEvents) {
      this.events.shift();
    }

    // Structured logging without sensitive CV data
    console.info(`[GEMINI_TELEMETRY] ${JSON.stringify(safeEvent)}`);
  }

  public static getEvents(): SafeGeminiTelemetryEvent[] {
    return [...this.events];
  }

  public static clear(): void {
    this.events = [];
  }
}

/**
 * Tailoring Request Deduplicator & Idempotency Lock.
 * Prevents rapid double-clicks from launching parallel Gemini calls
 * for the same candidate, job, parse, alignment, and engine version.
 */
export class TailoringRequestDeduplicator {
  private static inFlight = new Map<string, Promise<any>>();

  public static getKey(
    userId: string,
    jobId: string,
    parseId: string,
    alignmentId: string,
    engineVersion: string = CURRENT_TAILORING_ENGINE_VERSION
  ): string {
    return `${userId}:${jobId}:${parseId}:${alignmentId}:${engineVersion}`;
  }

  public static isInFlight(key: string): boolean {
    return this.inFlight.has(key);
  }

  public static async executeOrJoin<T>(
    key: string,
    action: () => Promise<T>
  ): Promise<{ result: T; wasJoined: boolean }> {
    const existing = this.inFlight.get(key);
    if (existing) {
      const result = await existing;
      return { result, wasJoined: true };
    }

    const promise = (async () => {
      try {
        return await action();
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    const result = await promise;
    return { result, wasJoined: false };
  }

  public static clear(): void {
    this.inFlight.clear();
  }
}
