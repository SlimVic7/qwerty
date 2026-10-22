import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CandidateDevelopmentPlanStore } from '../server/services/career/candidateDevelopmentPlanStore.js';
import { CandidateEvidenceSources } from '../server/services/career/personalizedRoadmapEngine.js';

vi.mock('../server/db/supabase.js', () => ({
  getAdminClient: () => null,
  getAuthClient: () => null,
}));

describe('Stage 7.5 — CandidateDevelopmentPlanStore', () => {
  const candidateId = 'user-candidate-test-1';
  const roleSlug = 'frontend-engineer';

  beforeEach(() => {
    CandidateDevelopmentPlanStore.resetFallbackPlans();
  });

  describe('Plan Generation & Regeneration', () => {
    it('generates a personalized development plan comparing published roadmap against candidate evidence', async () => {
      const evidence: CandidateEvidenceSources = {
        cvParsedData: {
          skills: ['Semantic HTML5 & Accessible Markup', 'CSS Modern Layouts (Flexbox & Grid)', 'TypeScript & Type Safety'],
        },
      };

      const res = await CandidateDevelopmentPlanStore.generatePlanForRole(candidateId, roleSlug, evidence);
      expect(res).not.toBeNull();
      expect(res!.role.slug).toBe(roleSlug);
      expect(res!.roadmap).not.toBeNull();
      expect(res!.plan).not.toBeNull();
      expect(res!.plan!.status).toBe('active');
      expect(res!.plan!.ruleset_version).toBe('personalized-development-roadmap-v1');

      // Verify item classifications
      const items = res!.plan!.items || [];
      expect(items.length).toBeGreaterThan(0);

      const htmlSkill = items.find(i => i.skill_name?.includes('Semantic HTML5'));
      expect(htmlSkill).toBeDefined();
      expect(htmlSkill!.classification).toBe('evidence_found');
      expect(htmlSkill!.priority).toBe('maintain');

      // Verify summary counts
      expect(res!.summary_counts).toBeDefined();
      expect(res!.summary_counts!.evidence_found).toBeGreaterThanOrEqual(2);
      expect(res!.summary_counts!.total_skills).toBe(items.length);
    });

    it('enforces at most one active plan per candidate and career role while preserving history on regeneration', async () => {
      // First generation
      const initialEvidence: CandidateEvidenceSources = {
        cvParsedData: {
          skills: ['TypeScript'],
        },
      };
      const firstRes = await CandidateDevelopmentPlanStore.generatePlanForRole(candidateId, roleSlug, initialEvidence);
      const firstPlanId = firstRes!.plan!.id;

      // Second generation (candidate uploads new CV or updates skills)
      const updatedEvidence: CandidateEvidenceSources = {
        cvParsedData: {
          skills: ['TypeScript', 'React Component Architecture & State', 'Next.js & Server Components'],
        },
      };
      const secondRes = await CandidateDevelopmentPlanStore.generatePlanForRole(candidateId, roleSlug, updatedEvidence);
      const secondPlanId = secondRes!.plan!.id;

      expect(secondPlanId).not.toBe(firstPlanId);

      // Verify current active plan is second plan
      const currentRes = await CandidateDevelopmentPlanStore.getPlanByRoleSlug(candidateId, roleSlug);
      expect(currentRes).not.toBeNull();
      expect(currentRes!.plan).not.toBeNull();
      expect(currentRes!.plan!.id).toBe(secondPlanId);
      expect(currentRes!.plan!.status).toBe('active');

      // Verify historical plans preserved in history
      const history = CandidateDevelopmentPlanStore.getHistoricalPlans();
      expect(history.length).toBe(1);
      expect(history[0].id).toBe(firstPlanId);
      expect(history[0].status).toBe('archived');
      expect(history[0].archived_at).not.toBeNull();
    });

    it('returns null when role slug does not exist', async () => {
      const res = await CandidateDevelopmentPlanStore.generatePlanForRole(candidateId, 'non-existent-role');
      expect(res).toBeNull();
    });
  });

  describe('Retrieval', () => {
    it('returns plan: null when candidate has not yet generated a plan for the role', async () => {
      const res = await CandidateDevelopmentPlanStore.getPlanByRoleSlug(candidateId, roleSlug);
      expect(res).not.toBeNull();
      expect(res!.role.slug).toBe(roleSlug);
      expect(res!.roadmap).not.toBeNull();
      expect(res!.plan).toBeNull();
    });

    it('returns role with roadmap: null for role without published roadmap', async () => {
      const res = await CandidateDevelopmentPlanStore.getPlanByRoleSlug(candidateId, 'mobile-developer');
      expect(res).not.toBeNull();
      expect(res!.roadmap).toBeNull();
      expect(res!.plan).toBeNull();
    });
  });

  describe('Summary Counts Computation', () => {
    it('computes accurate breakdown across classifications and priorities', () => {
      const items: any[] = [
        { classification: 'evidence_found', priority: 'maintain' },
        { classification: 'evidence_found', priority: 'maintain' },
        { classification: 'development_focus', priority: 'now' },
        { classification: 'development_focus', priority: 'next' },
        { classification: 'development_focus', priority: 'later' },
        { classification: 'review_needed', priority: 'next' },
      ];

      const counts = CandidateDevelopmentPlanStore.computeSummaryCounts(items);
      expect(counts.total_skills).toBe(6);
      expect(counts.evidence_found).toBe(2);
      expect(counts.development_focus).toBe(3);
      expect(counts.review_needed).toBe(1);
      expect(counts.priority_maintain).toBe(2);
      expect(counts.priority_now).toBe(1);
      expect(counts.priority_next).toBe(2);
      expect(counts.priority_later).toBe(1);
    });
  });
});
