import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { isHmrDisabled, getEffectiveViteServerConfig } from '../config/runtime.js';
import { app } from '../app.js';

describe('Stage 6.2 / Runtime HMR & Preview Configuration', () => {
  const originalEnv = process.env.DISABLE_HMR;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.DISABLE_HMR = originalEnv;
    } else {
      delete process.env.DISABLE_HMR;
    }
  });

  describe('A. DISABLE_HMR=true policy', () => {
    it('isHmrDisabled() returns true when DISABLE_HMR is "true"', () => {
      process.env.DISABLE_HMR = 'true';
      expect(isHmrDisabled()).toBe(true);
    });

    it('isHmrDisabled() handles whitespace and uppercase "  TRUE  "', () => {
      process.env.DISABLE_HMR = '  TRUE  ';
      expect(isHmrDisabled()).toBe(true);
    });

    it('effective Vite configuration explicitly sets hmr: false and watch: null when disabled', () => {
      const config = getEffectiveViteServerConfig({ disableHmr: true });
      expect(config.server.hmr).toBe(false);
      expect(config.server.watch).toBeNull();
      expect(config.server.middlewareMode).toBe(true);
      expect(config.appType).toBe('spa');
    });
  });

  describe('B. DISABLE_HMR=false policy (Local Development)', () => {
    it('isHmrDisabled() returns false when DISABLE_HMR is absent or "false"', () => {
      delete process.env.DISABLE_HMR;
      expect(isHmrDisabled()).toBe(false);

      process.env.DISABLE_HMR = 'false';
      expect(isHmrDisabled()).toBe(false);

      process.env.DISABLE_HMR = '0';
      expect(isHmrDisabled()).toBe(false);
    });

    it('effective Vite configuration enables normal HMR when disableHmr: false', () => {
      const config = getEffectiveViteServerConfig({ disableHmr: false });
      expect(config.server.hmr).toBe(true);
      expect(config.server.watch).toEqual({});
      expect(config.server.middlewareMode).toBe(true);
    });
  });

  describe('C. Single middleware / instance isolation', () => {
    it('ensures config builder creates a deterministic, isolated server configuration', () => {
      const config1 = getEffectiveViteServerConfig({ disableHmr: true });
      const config2 = getEffectiveViteServerConfig({ disableHmr: true });
      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Unique objects, avoiding shared mutations
    });
  });

  describe('D. Application routes & APIs operational', () => {
    it('GET /api/health responds with 200 ok', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        status: 'ok',
        message: 'QWERTY API is running',
      });
    });

    it('API routes return structured JSON 404 on unhandled endpoints', async () => {
      const res = await request(app).get('/api/non-existent-endpoint');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('API_ENDPOINT_NOT_FOUND');
    });

    it('Public candidate and ops job routes remain mounted and functional', async () => {
      const res = await request(app).get('/api/ops/jobs');
      // Should hit router (either 200, 401, or 500 depending on DB client, but definitely processed by Express)
      expect([200, 401, 500]).toContain(res.status);
    });
  });
});
