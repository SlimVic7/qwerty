import { describe, it, expect } from 'vitest';
import {
  classifyRoadmapItem,
  generatePersonalizedDevelopmentPlan,
  PERSONALIZED_ROADMAP_RULESET_VERSION,
  CandidateEvidenceSources
} from '../server/services/career/personalizedRoadmapEngine.js';
import { CareerRoleRoadmapItem } from '../server/services/career/types.js';

describe('Stage 7.5 — Deterministic Personalized Roadmap Engine', () => {
  const sampleRoadmapItems: CareerRoleRoadmapItem[] = [
    {
      id: 'item-foundation-1',
      roadmap_id: 'roadmap-fe-1',
      stage: 'foundation',
      skill_name: 'Semantic HTML5 & Accessible Markup',
      skill_category: 'Web Standards',
      description: 'Foundational HTML semantics and WCAG accessibility standards.',
      why_it_matters: 'Forms the baseline of inclusive digital experiences.',
      competency_outcome: 'Build accessible, semantic markup with valid ARIA roles.',
      evidence_examples: ['W3C standards compliance', 'Screen reader testing'],
      display_order: 1,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'item-foundation-2',
      roadmap_id: 'roadmap-fe-1',
      stage: 'foundation',
      skill_name: 'CSS Modern Layouts (Flexbox & Grid)',
      skill_category: 'Styling',
      description: 'Modern CSS layout paradigms including Flexbox, CSS Grid, and responsive queries.',
      why_it_matters: 'Essential for cross-device design fidelity.',
      competency_outcome: 'Build fluid responsive layouts without rigid pixel constraints.',
      evidence_examples: ['Responsive grid systems', 'Complex flex layouts'],
      display_order: 2,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'item-core-1',
      roadmap_id: 'roadmap-fe-1',
      stage: 'core',
      skill_name: 'TypeScript & Type Safety',
      skill_category: 'Programming Languages',
      description: 'Static typing, generics, and strict TypeScript configurations.',
      why_it_matters: 'Eliminates runtime exceptions and scales enterprise codebases.',
      competency_outcome: 'Write strongly typed components and utilities.',
      evidence_examples: ['Generic components', 'Strict tsconfig setup'],
      display_order: 1,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'item-core-2',
      roadmap_id: 'roadmap-fe-1',
      stage: 'core',
      skill_name: 'React Component Architecture & State',
      skill_category: 'Frameworks & Libraries',
      description: 'Deep mastery of React hooks, context, memoization, and component lifecycle.',
      why_it_matters: 'Core building block for modern web interfaces.',
      competency_outcome: 'Structure complex interactive SPAs with performant state propagation.',
      evidence_examples: ['Custom hooks', 'State machines'],
      display_order: 2,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'item-advanced-1',
      roadmap_id: 'roadmap-fe-1',
      stage: 'advanced',
      skill_name: 'Micro-Frontend Architecture',
      skill_category: 'System Design',
      description: 'Decoupled module federation, cross-app routing, and independent deployments.',
      why_it_matters: 'Allows multi-team organizations to scale frontend systems autonomously.',
      competency_outcome: 'Architect federated applications with shared contracts.',
      evidence_examples: ['Webpack module federation', 'Micro-app contracts'],
      display_order: 1,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ];

  it('uses canonical ruleset version personalized-development-roadmap-v1', () => {
    expect(PERSONALIZED_ROADMAP_RULESET_VERSION).toBe('personalized-development-roadmap-v1');
  });

  describe('Classification Semantics', () => {
    it('classifies as evidence_found when candidate CV contains explicit structured skill', () => {
      const evidence: CandidateEvidenceSources = {
        cvParsedData: {
          skills: ['TypeScript', 'React', 'HTML5'],
        },
      };

      const result = classifyRoadmapItem(sampleRoadmapItems[2], evidence); // TypeScript & Type Safety
      expect(result.classification).toBe('evidence_found');
      expect(result.priority).toBe('maintain');
      expect(result.evidence_refs.length).toBeGreaterThan(0);
      expect(result.evidence_refs[0].source).toBe('cv_skills');
      expect(result.evidence_refs[0].confidence).toBe('explicit');
    });

    it('classifies as evidence_found when candidate employment history demonstrates skill', () => {
      const evidence: CandidateEvidenceSources = {
        cvParsedData: {
          skills: [],
          experience: [
            {
              title: 'Frontend Engineer',
              company: 'TechCorp',
              description: 'Designed and deployed accessible web apps using Semantic HTML5 & Accessible Markup.',
              skills: ['Semantic HTML5 & Accessible Markup'],
            },
          ],
        },
      };

      const result = classifyRoadmapItem(sampleRoadmapItems[0], evidence);
      expect(result.classification).toBe('evidence_found');
      expect(result.priority).toBe('maintain');
      expect(result.evidence_refs[0].source).toBe('cv_experience');
    });

    it('classifies as development_focus when no matching evidence is present', () => {
      const evidence: CandidateEvidenceSources = {
        profile: {
          professional_headline: 'Junior Graphic Designer',
          professional_summary: 'Experienced with Photoshop and Illustrator.',
        },
        cvParsedData: {
          skills: ['Photoshop', 'Illustrator'],
        },
      };

      const result = classifyRoadmapItem(sampleRoadmapItems[4], evidence); // Micro-Frontend Architecture
      expect(result.classification).toBe('development_focus');
      expect(result.evidence_refs).toEqual([]);
      expect(result.priority).toBe('later'); // advanced stage -> later
    });

    it('classifies as review_needed when only partial/ambiguous mention exists in profile summary', () => {
      const evidence: CandidateEvidenceSources = {
        profile: {
          professional_summary: 'Interested in exploring micro-frontend architecture in large scale projects.',
        },
        cvParsedData: {
          skills: [],
        },
      };

      const result = classifyRoadmapItem(sampleRoadmapItems[4], evidence);
      expect(result.classification).toBe('review_needed');
      expect(result.priority).toBe('next');
      expect(result.evidence_refs[0].confidence).toBe('partial');
    });
  });

  describe('Priority Logic', () => {
    it('assigns NOW to foundation development_focus skills', () => {
      const evidence: CandidateEvidenceSources = {};
      const result = classifyRoadmapItem(sampleRoadmapItems[0], evidence); // Foundation HTML
      expect(result.classification).toBe('development_focus');
      expect(result.priority).toBe('now');
    });

    it('assigns NOW to early core development_focus skills (display_order <= 2)', () => {
      const evidence: CandidateEvidenceSources = {};
      const result = classifyRoadmapItem(sampleRoadmapItems[2], evidence); // Core TypeScript (display_order: 1)
      expect(result.classification).toBe('development_focus');
      expect(result.priority).toBe('now');
    });

    it('assigns LATER to advanced development_focus skills', () => {
      const evidence: CandidateEvidenceSources = {};
      const result = classifyRoadmapItem(sampleRoadmapItems[4], evidence); // Advanced Micro-Frontend
      expect(result.classification).toBe('development_focus');
      expect(result.priority).toBe('later');
    });

    it('assigns MAINTAIN to evidence_found skills regardless of stage', () => {
      const evidence: CandidateEvidenceSources = {
        cvParsedData: {
          skills: ['Micro-Frontend Architecture'],
        },
      };
      const result = classifyRoadmapItem(sampleRoadmapItems[4], evidence);
      expect(result.classification).toBe('evidence_found');
      expect(result.priority).toBe('maintain');
    });
  });

  describe('Zero-AI & Safe Language Verification', () => {
    it('produces deterministic plan without arbitrary readiness percentages or scores', () => {
      const evidence: CandidateEvidenceSources = {
        cvParsedData: {
          skills: ['TypeScript', 'React'],
        },
      };

      const planItems = generatePersonalizedDevelopmentPlan(sampleRoadmapItems, evidence);

      // Must evaluate all items
      expect(planItems.length).toBe(sampleRoadmapItems.length);

      // Verify no prohibited terms appear in output keys or classifications
      for (const item of planItems) {
        expect(['evidence_found', 'development_focus', 'review_needed']).toContain(item.classification);
        expect(['now', 'next', 'later', 'maintain']).toContain(item.priority);

        const serialized = JSON.stringify(item).toLowerCase();
        expect(serialized).not.toContain('mastered');
        expect(serialized).not.toContain('unqualified');
        expect(serialized).not.toContain('job ready');
        expect(serialized).not.toContain('not competent');
        expect(serialized).not.toContain('guaranteed gap');
        expect(serialized).not.toContain('readiness_score');
        expect(serialized).not.toContain('percentage');
      }
    });

    it('orders items deterministically preserving foundation -> core -> advanced display order', () => {
      const evidence: CandidateEvidenceSources = {};
      const planItems = generatePersonalizedDevelopmentPlan(sampleRoadmapItems, evidence);

      expect(planItems[0].stage).toBe('foundation');
      expect(planItems[1].stage).toBe('foundation');
      expect(planItems[2].stage).toBe('core');
      expect(planItems[3].stage).toBe('core');
      expect(planItems[4].stage).toBe('advanced');
    });
  });
});
