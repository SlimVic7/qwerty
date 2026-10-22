/**
 * QWERTY Stage 7.3 — Career Learning Resources UI Component Tests
 * Tests SkillRoadmapView integration, safe link attributes, provider neutrality, and empty states.
 */

import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SkillRoadmapView } from '../src/features/career/SkillRoadmapView.js';
import { CareerRoleRoadmap } from '../src/features/career/career.service.js';

const mockRoadmapWithResources: CareerRoleRoadmap = {
  id: 'b1000000-0000-0000-0000-000000000001',
  career_role_id: 'a1000000-0000-0000-0000-000000000001',
  version: 1,
  version_label: 'v1',
  title: 'Frontend Engineering Skill Roadmap',
  summary: 'Structured progression from web standards to client architecture.',
  status: 'published',
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-01T00:00:00Z',
  items: [
    {
      id: 'item-1',
      roadmap_id: 'b1000000-0000-0000-0000-000000000001',
      stage: 'foundation',
      skill_name: 'Semantic HTML5 & Accessible Markup',
      skill_category: 'Web Standards',
      description: 'Document structure and accessible markup practices.',
      why_it_matters: 'Essential for screen reader accessibility.',
      competency_outcome: 'Can construct valid accessible documents.',
      evidence_examples: ['Accessibility audit report'],
      display_order: 1,
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
      resources: [
        {
          id: 'res-1',
          roadmap_item_id: 'item-1',
          title: 'MDN Web Docs — HTML: HyperText Markup Language',
          provider_name: 'MDN Web Docs',
          resource_type: 'documentation',
          url: 'https://developer.mozilla.org/en-US/docs/Web/HTML',
          description: 'Comprehensive reference covering semantic elements and web standards.',
          access_type: 'free',
          difficulty: 'foundation',
          display_order: 1,
          status: 'published',
          created_at: '2026-08-01T00:00:00Z',
          updated_at: '2026-08-01T00:00:00Z'
        },
        {
          id: 'res-2',
          roadmap_item_id: 'item-1',
          title: 'W3C WAI — Accessibility Fundamentals',
          provider_name: 'W3C WAI',
          resource_type: 'standard',
          url: 'https://www.w3.org/WAI/fundamentals/accessibility-intro/',
          description: 'Official introduction to accessibility standards and WCAG guidelines.',
          access_type: 'free',
          difficulty: 'foundation',
          display_order: 2,
          status: 'published',
          created_at: '2026-08-01T00:00:00Z',
          updated_at: '2026-08-01T00:00:00Z'
        }
      ]
    },
    {
      id: 'item-2',
      roadmap_id: 'b1000000-0000-0000-0000-000000000001',
      stage: 'core',
      skill_name: 'Modern CSS & Layout Engines',
      skill_category: 'Styling',
      description: 'Flexbox, Grid, and responsive layout techniques.',
      why_it_matters: 'Essential for responsive layouts.',
      competency_outcome: 'Can build responsive layouts across screen sizes.',
      evidence_examples: ['Responsive dashboard stylesheet'],
      display_order: 2,
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
      resources: [] // empty resources
    }
  ]
};

describe('Stage 7.3 — SkillRoadmapView Learning Resources Integration', () => {
  it('renders learning resources inside expanded roadmap item', () => {
    render(<SkillRoadmapView roleTitle="Frontend Engineer" roadmap={mockRoadmapWithResources} />);

    // Item 1 is foundation stage and expanded by default
    const headings = screen.getAllByText('Where to Learn & Practise');
    expect(headings.length).toBeGreaterThan(0);
    expect(screen.getByText('MDN Web Docs — HTML: HyperText Markup Language')).toBeDefined();
    expect(screen.getByText('Source: MDN Web Docs')).toBeDefined();
    expect(screen.getByText('W3C WAI — Accessibility Fundamentals')).toBeDefined();
  });

  it('renders safe external link with target="_blank" and rel="noopener noreferrer"', () => {
    render(<SkillRoadmapView roleTitle="Frontend Engineer" roadmap={mockRoadmapWithResources} />);

    const openLinks = screen.getAllByRole('link', { name: /Open Resource/i });
    expect(openLinks.length).toBe(2);
    expect(openLinks[0].getAttribute('href')).toBe('https://developer.mozilla.org/en-US/docs/Web/HTML');
    expect(openLinks[0].getAttribute('target')).toBe('_blank');
    expect(openLinks[0].getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('enforces provider neutrality with zero ranking or commercial endorsement phrases', () => {
    const { container } = render(<SkillRoadmapView roleTitle="Frontend Engineer" roadmap={mockRoadmapWithResources} />);
    const textContent = container.textContent || '';

    // Must not contain rankings or recommendation bias
    expect(textContent).not.toMatch(/#1\b/i);
    expect(textContent).not.toMatch(/\bBest\b/);
    expect(textContent).not.toMatch(/\bTop choice\b/i);
    expect(textContent).not.toMatch(/\bRecommended for you\b/i);
    expect(textContent).not.toMatch(/\bAI recommended\b/i);
  });

  it('renders appropriate editorial notice when item has no learning resources attached', () => {
    render(<SkillRoadmapView roleTitle="Frontend Engineer" roadmap={mockRoadmapWithResources} />);

    // Item 2 is Core stage and expanded by default with empty resources
    expect(screen.getByText('Curated learning and practice resources for this skill are in editorial review.')).toBeDefined();
  });
});

