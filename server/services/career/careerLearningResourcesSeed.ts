/**
 * QWERTY Stage 7.3 — Career Learning Resources Curated Seed Catalog
 * Curated, verified educational learning and practice resources for tech role roadmap items.
 * Strictly zero AI generation, zero salary speculation, zero course ranking/affiliates.
 * Used exclusively for development and test environments when database table is not present.
 */

import { CareerLearningResource } from './types.js';

export const CURATED_LEARNING_RESOURCES: CareerLearningResource[] = [
  // =========================================================================
  // FRONTEND ENGINEER (Roadmap b1000000-0000-0000-0000-000000000001)
  // =========================================================================

  // Skill 1: Semantic HTML5 & Accessible Markup (foundation)
  {
    id: 'd1000000-0000-0000-0000-000000000001',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000001',
    title: 'MDN Web Docs — HTML: HyperText Markup Language',
    provider_name: 'MDN Web Docs',
    resource_type: 'documentation',
    url: 'https://developer.mozilla.org/en-US/docs/Web/HTML',
    description: 'Comprehensive reference and guides covering semantic elements, document structures, and web standards.',
    access_type: 'free',
    difficulty: 'foundation',
    display_order: 1,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },
  {
    id: 'd1000000-0000-0000-0000-000000000002',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000001',
    title: 'W3C Web Accessibility Initiative (WAI) — Accessibility Fundamentals',
    provider_name: 'W3C WAI',
    resource_type: 'standard',
    url: 'https://www.w3.org/WAI/fundamentals/accessibility-intro/',
    description: 'Official introduction to accessibility standards, WCAG guidelines, and inclusive digital design.',
    access_type: 'free',
    difficulty: 'foundation',
    display_order: 2,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },
  {
    id: 'd1000000-0000-0000-0000-000000000003',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000001',
    title: 'WebAIM — Keyboard Accessibility Techniques',
    provider_name: 'WebAIM',
    resource_type: 'guide',
    url: 'https://webaim.org/techniques/keyboard/',
    description: 'Practical guidance for designing focus indicators, tabindex navigation, and keyboard-operable controls.',
    access_type: 'free',
    difficulty: 'foundation',
    display_order: 3,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },

  // Skill 5: TypeScript for Client Applications (core)
  {
    id: 'd1000000-0000-0000-0000-000000000004',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000005',
    title: 'TypeScript Official Handbook',
    provider_name: 'Microsoft',
    resource_type: 'documentation',
    url: 'https://www.typescriptlang.org/docs/handbook/intro.html',
    description: 'Official guide to TypeScript types, interfaces, generics, utility types, and compiler configuration.',
    access_type: 'free',
    difficulty: 'core',
    display_order: 1,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },
  {
    id: 'd1000000-0000-0000-0000-000000000005',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000005',
    title: 'Total TypeScript — Beginners TypeScript Tutorial',
    provider_name: 'Total TypeScript',
    resource_type: 'guide',
    url: 'https://www.totaltypescript.com/tutorials',
    description: 'Interactive exercises covering essential type-system patterns, generic constraints, and component typing.',
    access_type: 'free',
    difficulty: 'core',
    display_order: 2,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },

  // Skill 6: React Component Architecture & Hooks (core)
  {
    id: 'd1000000-0000-0000-0000-000000000006',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000006',
    title: 'React Documentation — Describing the UI & Managing State',
    provider_name: 'React Team',
    resource_type: 'documentation',
    url: 'https://react.dev/learn',
    description: 'Official core guide to component lifecycles, pure rendering, hooks state flow, and effect synchronization.',
    access_type: 'free',
    difficulty: 'core',
    display_order: 1,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },
  {
    id: 'd1000000-0000-0000-0000-000000000007',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000006',
    title: 'React Documentation — Built-in React Hooks Reference',
    provider_name: 'React Team',
    resource_type: 'reference',
    url: 'https://react.dev/reference/react/hooks',
    description: 'Technical API reference for useState, useEffect, useMemo, useCallback, and useRef.',
    access_type: 'free',
    difficulty: 'core',
    display_order: 2,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },

  // Skill 10: Web Performance & Core Web Vitals Optimization (advanced)
  {
    id: 'd1000000-0000-0000-0000-000000000008',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000010',
    title: 'web.dev — Learn Core Web Vitals',
    provider_name: 'Google Chrome',
    resource_type: 'guide',
    url: 'https://web.dev/explore/learn-core-web-vitals',
    description: 'Detailed technical guides to profiling and optimizing LCP, INP, and CLS performance metrics.',
    access_type: 'free',
    difficulty: 'advanced',
    display_order: 1,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },
  {
    id: 'd1000000-0000-0000-0000-000000000009',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000010',
    title: 'Chrome DevTools — Analyze Runtime Performance',
    provider_name: 'Chrome for Developers',
    resource_type: 'documentation',
    url: 'https://developer.chrome.com/docs/devtools/performance',
    description: 'Practical guide to recording CPU profiles, finding long tasks, and diagnosing layout shifts.',
    access_type: 'free',
    difficulty: 'advanced',
    display_order: 2,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },
  {
    id: 'd1000000-0000-0000-0000-000000000010',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000010',
    title: 'MDN Web Docs — Web Performance Overview',
    provider_name: 'MDN Web Docs',
    resource_type: 'reference',
    url: 'https://developer.mozilla.org/en-US/docs/Web/Performance',
    description: 'Reference material covering the Navigation Timing API, Resource Timing API, and browser rendering pipeline.',
    access_type: 'free',
    difficulty: 'advanced',
    display_order: 3,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },

  // =========================================================================
  // BACKEND ENGINEER (Roadmap b1000000-0000-0000-0000-000000000002)
  // =========================================================================

  // Skill 14: Relational Database Modeling & SQL (PostgreSQL) (foundation)
  {
    id: 'd1000000-0000-0000-0000-000000000011',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000014',
    title: 'PostgreSQL Official Documentation — Tutorial & SQL Language',
    provider_name: 'PostgreSQL Global Development Group',
    resource_type: 'documentation',
    url: 'https://www.postgresql.org/docs/current/tutorial-sql.html',
    description: 'Official introduction to relational data concepts, tables, schemas, constraints, and data querying.',
    access_type: 'free',
    difficulty: 'foundation',
    display_order: 1,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },
  {
    id: 'd1000000-0000-0000-0000-000000000012',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000014',
    title: 'PGExercises — Interactive PostgreSQL Practice',
    provider_name: 'PGExercises',
    resource_type: 'practice',
    url: 'https://pgexercises.com/',
    description: 'Hands-on browser-based SQL exercises covering joins, aggregations, subqueries, and table modifications.',
    access_type: 'free',
    difficulty: 'foundation',
    display_order: 2,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },

  // Skill 15: RESTful API Architecture & HTTP Semantics (foundation)
  {
    id: 'd1000000-0000-0000-0000-000000000013',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000015',
    title: 'MDN Web Docs — An Overview of HTTP',
    provider_name: 'MDN Web Docs',
    resource_type: 'documentation',
    url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview',
    description: 'Architectural overview of client-server requests, headers, status codes, and HTTP protocol semantics.',
    access_type: 'free',
    difficulty: 'foundation',
    display_order: 1,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },
  {
    id: 'd1000000-0000-0000-0000-000000000014',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000015',
    title: 'MDN Web Docs — HTTP Request Methods',
    provider_name: 'MDN Web Docs',
    resource_type: 'reference',
    url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods',
    description: 'Detailed reference covering safe, idempotent, and cacheable HTTP verbs (GET, POST, PUT, PATCH, DELETE).',
    access_type: 'free',
    difficulty: 'foundation',
    display_order: 2,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },

  // Skill 17: Authentication, Authorization & Role-Based Access Control (RBAC) (core)
  {
    id: 'd1000000-0000-0000-0000-000000000015',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000017',
    title: 'OWASP — Authentication Cheat Sheet',
    provider_name: 'OWASP',
    resource_type: 'standard',
    url: 'https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html',
    description: 'Standard security guidelines for credential storage, session management, and brute-force mitigation.',
    access_type: 'free',
    difficulty: 'core',
    display_order: 1,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },
  {
    id: 'd1000000-0000-0000-0000-000000000016',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000017',
    title: 'OWASP — Authorization Cheat Sheet',
    provider_name: 'OWASP',
    resource_type: 'standard',
    url: 'https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html',
    description: 'Design guidance on role-based access control, resource-level permissions, and preventing privilege escalation.',
    access_type: 'free',
    difficulty: 'core',
    display_order: 2,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },

  // Skill 23: Distributed Systems & Event-Driven Architecture (advanced)
  {
    id: 'd1000000-0000-0000-0000-000000000017',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000023',
    title: 'Azure Architecture Center — Event-Driven Architecture Style',
    provider_name: 'Microsoft Learn',
    resource_type: 'reference',
    url: 'https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/event-driven',
    description: 'Architectural overview of producer-consumer patterns, brokers, event streams, and eventual consistency.',
    access_type: 'free',
    difficulty: 'advanced',
    display_order: 1,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },
  {
    id: 'd1000000-0000-0000-0000-000000000018',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000023',
    title: 'Martin Fowler — What do you mean by "Event-Driven"?',
    provider_name: 'Martin Fowler',
    resource_type: 'article',
    url: 'https://martinfowler.com/articles/201701-event-driven.html',
    description: 'Conceptual breakdown analyzing event notification, event-carried state transfer, event sourcing, and CQRS.',
    access_type: 'free',
    difficulty: 'advanced',
    display_order: 2,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },

  // =========================================================================
  // DATA ANALYST (Roadmap b1000000-0000-0000-0000-000000000005)
  // =========================================================================

  // Skill 25: SQL Querying & Data Extraction Foundations (foundation)
  {
    id: 'd1000000-0000-0000-0000-000000000019',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000025',
    title: 'Mode Analytics — SQL Tutorial for Data Analysis',
    provider_name: 'Mode Analytics',
    resource_type: 'guide',
    url: 'https://mode.com/sql-tutorial/',
    description: 'Structured course covering relational querying, aggregations, multi-table joins, and data extraction workflows.',
    access_type: 'free',
    difficulty: 'foundation',
    display_order: 1,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },
  {
    id: 'd1000000-0000-0000-0000-000000000020',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000025',
    title: 'SQLBolt — Interactive SQL Lessons',
    provider_name: 'SQLBolt',
    resource_type: 'practice',
    url: 'https://sqlbolt.com/',
    description: 'Interactive in-browser lessons with hands-on exercises for mastering SQL syntax and query formulation.',
    access_type: 'free',
    difficulty: 'foundation',
    display_order: 2,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },

  // Skill 30: Python for Data Analysis (Pandas & NumPy) (core)
  {
    id: 'd1000000-0000-0000-0000-000000000021',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000030',
    title: 'Python Software Foundation — The Python Tutorial',
    provider_name: 'Python Software Foundation',
    resource_type: 'documentation',
    url: 'https://docs.python.org/3/tutorial/',
    description: 'Official introduction to Python data structures, control flow, functions, modules, and error handling.',
    access_type: 'free',
    difficulty: 'core',
    display_order: 1,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },
  {
    id: 'd1000000-0000-0000-0000-000000000022',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000030',
    title: 'pandas Documentation — 10 Minutes to pandas',
    provider_name: 'pandas Development Team',
    resource_type: 'guide',
    url: 'https://pandas.pydata.org/docs/user_guide/10min.html',
    description: 'Short introduction to pandas Series, DataFrames, indexing, grouping, and basic data transformations.',
    access_type: 'free',
    difficulty: 'core',
    display_order: 2,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },
  {
    id: 'd1000000-0000-0000-0000-000000000023',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000030',
    title: 'NumPy Documentation — NumPy Basics for Beginners',
    provider_name: 'NumPy Developers',
    resource_type: 'guide',
    url: 'https://numpy.org/doc/stable/user/absolute_beginners.html',
    description: 'Foundational guide to multidimensional arrays, indexing, slicing, vectorization, and mathematical routines.',
    access_type: 'free',
    difficulty: 'core',
    display_order: 3,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },

  // Skill 33: A/B Testing & Controlled Experimentation (advanced)
  {
    id: 'd1000000-0000-0000-0000-000000000024',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000033',
    title: 'SciPy Documentation — Statistical Functions (scipy.stats)',
    provider_name: 'SciPy Community',
    resource_type: 'documentation',
    url: 'https://docs.scipy.org/doc/scipy/reference/stats.html',
    description: 'Reference guide for continuous/discrete distributions, two-sample hypothesis tests, p-values, and power.',
    access_type: 'free',
    difficulty: 'advanced',
    display_order: 1,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },
  {
    id: 'd1000000-0000-0000-0000-000000000025',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000033',
    title: 'NIST/SEMATECH e-Handbook of Statistical Methods — Hypothesis Testing',
    provider_name: 'National Institute of Standards and Technology',
    resource_type: 'reference',
    url: 'https://www.itl.nist.gov/div898/handbook/prc/section1/prc13.htm',
    description: 'Authoritative government handbook explaining hypothesis formulation, significance levels, and error risks.',
    access_type: 'free',
    difficulty: 'advanced',
    display_order: 2,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },

  // =========================================================================
  // PRODUCT MANAGER (Roadmap b1000000-0000-0000-0000-000000000008)
  // =========================================================================

  // Skill 35: User Research & Problem Discovery (foundation)
  {
    id: 'd1000000-0000-0000-0000-000000000026',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000035',
    title: 'Nielsen Norman Group — User Interviews: How, When, and Why',
    provider_name: 'Nielsen Norman Group',
    resource_type: 'article',
    url: 'https://www.nngroup.com/articles/user-interviews/',
    description: 'Methodology for planning customer discovery sessions, asking open-ended questions, and extracting insights.',
    access_type: 'free',
    difficulty: 'foundation',
    display_order: 1,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },
  {
    id: 'd1000000-0000-0000-0000-000000000027',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000035',
    title: 'Interaction Design Foundation — Conducting User Research',
    provider_name: 'Interaction Design Foundation',
    resource_type: 'guide',
    url: 'https://www.interaction-design.org/literature/article/user-research-what-it-is-and-why-you-should-do-it',
    description: 'Overview of qualitative discovery methods, user empathy mapping, and identifying genuine pain points.',
    access_type: 'free',
    difficulty: 'foundation',
    display_order: 2,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },

  // Skill 38: Feature Prioritization Frameworks (RICE, Kano, Cost of Delay) (core)
  {
    id: 'd1000000-0000-0000-0000-000000000028',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000038',
    title: 'Intercom Product Blog — RICE: Simple Prioritization for Product Managers',
    provider_name: 'Intercom',
    resource_type: 'article',
    url: 'https://www.intercom.com/blog/rice-simple-prioritization-for-product-managers/',
    description: 'Detailed explanation of the Reach, Impact, Confidence, and Effort prioritization scoring model.',
    access_type: 'free',
    difficulty: 'core',
    display_order: 1,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },
  {
    id: 'd1000000-0000-0000-0000-000000000029',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000038',
    title: 'Mind the Product — A Practical Guide to Prioritisation',
    provider_name: 'Mind the Product',
    resource_type: 'guide',
    url: 'https://www.mindtheproduct.com/how-to-prioritise/',
    description: 'Comparative overview of feature prioritization methodologies including Kano, value vs complexity, and Cost of Delay.',
    access_type: 'free',
    difficulty: 'core',
    display_order: 2,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },

  // Skill 42: Product Vision, Strategy & Horizon Roadmapping (advanced)
  {
    id: 'd1000000-0000-0000-0000-000000000030',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000042',
    title: 'Silicon Valley Product Group — Product Strategy Overview',
    provider_name: 'SVPG',
    resource_type: 'article',
    url: 'https://www.svpg.com/product-strategy-overview/',
    description: 'Strategic guidance on focusing team effort, selecting problem spaces, and defining product vision.',
    access_type: 'free',
    difficulty: 'advanced',
    display_order: 1,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },
  {
    id: 'd1000000-0000-0000-0000-000000000031',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000042',
    title: 'Roman Pichler — Outcome-Based Product Roadmapping',
    provider_name: 'Roman Pichler',
    resource_type: 'guide',
    url: 'https://www.romanpichler.com/blog/how-to-choose-the-right-product-roadmap-format/',
    description: 'Techniques for building outcome-focused product roadmaps that align stakeholders on goals rather than feature lists.',
    access_type: 'free',
    difficulty: 'advanced',
    display_order: 2,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },

  // =========================================================================
  // DEVOPS & PLATFORM ENGINEER (Roadmap b1000000-0000-0000-0000-000000000010)
  // =========================================================================

  // Skill 46: Containerization & Docker Operations (foundation)
  {
    id: 'd1000000-0000-0000-0000-000000000032',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000046',
    title: 'Docker Documentation — Getting Started with Docker',
    provider_name: 'Docker',
    resource_type: 'documentation',
    url: 'https://docs.docker.com/get-started/',
    description: 'Official introduction to container concepts, building images, running containers, and port mapping.',
    access_type: 'free',
    difficulty: 'foundation',
    display_order: 1,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },
  {
    id: 'd1000000-0000-0000-0000-000000000033',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000046',
    title: 'Docker Documentation — Multi-Stage Builds',
    provider_name: 'Docker',
    resource_type: 'reference',
    url: 'https://docs.docker.com/build/building/multi-stage/',
    description: 'Best practices for optimizing image size, caching build steps, and separating build and runtime environments.',
    access_type: 'free',
    difficulty: 'foundation',
    display_order: 2,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },

  // Skill 48: CI/CD Pipeline Automation (GitHub Actions / GitLab CI) (core)
  {
    id: 'd1000000-0000-0000-0000-000000000034',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000048',
    title: 'GitHub Docs — Understanding GitHub Actions',
    provider_name: 'GitHub',
    resource_type: 'documentation',
    url: 'https://docs.github.com/en/actions/learn-github-actions/understanding-github-actions',
    description: 'Official reference for workflows, jobs, steps, runners, event triggers, and environment variables.',
    access_type: 'free',
    difficulty: 'core',
    display_order: 1,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },
  {
    id: 'd1000000-0000-0000-0000-000000000035',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000048',
    title: 'GitHub Docs — Security Hardening for GitHub Actions',
    provider_name: 'GitHub',
    resource_type: 'guide',
    url: 'https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions',
    description: 'Security guidance on token permissions, third-party action pinning, and secret masking.',
    access_type: 'free',
    difficulty: 'core',
    display_order: 2,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },

  // Skill 49: Infrastructure as Code (Terraform / OpenTofu) (core)
  {
    id: 'd1000000-0000-0000-0000-000000000036',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000049',
    title: 'HashiCorp Developer — Terraform Documentation & Tutorials',
    provider_name: 'HashiCorp',
    resource_type: 'documentation',
    url: 'https://developer.hashicorp.com/terraform/docs',
    description: 'Official reference for declarative HCL syntax, resource definitions, variables, and state management.',
    access_type: 'free',
    difficulty: 'core',
    display_order: 1,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },
  {
    id: 'd1000000-0000-0000-0000-000000000037',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000049',
    title: 'OpenTofu Official Documentation',
    provider_name: 'OpenTofu',
    resource_type: 'documentation',
    url: 'https://opentofu.org/docs/',
    description: 'Open-source infrastructure-as-code documentation detailing CLI usage, modules, and providers.',
    access_type: 'free',
    difficulty: 'core',
    display_order: 2,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },

  // Skill 52: Site Reliability Engineering (SRE), SLIs & Error Budgets (advanced)
  {
    id: 'd1000000-0000-0000-0000-000000000038',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000052',
    title: 'Google SRE Book — Service Level Objectives',
    provider_name: 'Google SRE',
    resource_type: 'reference',
    url: 'https://sre.google/sre-book/service-level-objectives/',
    description: 'Foundational text on defining SLIs, setting realistic SLO targets, and managing team error budgets.',
    access_type: 'free',
    difficulty: 'advanced',
    display_order: 1,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },
  {
    id: 'd1000000-0000-0000-0000-000000000039',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000052',
    title: 'Google SRE Workbook — Implementing SLOs',
    provider_name: 'Google SRE',
    resource_type: 'guide',
    url: 'https://sre.google/workbook/implementing-slos/',
    description: 'Practical workbook with actionable examples for calculating burn rates and structuring paging rules.',
    access_type: 'free',
    difficulty: 'advanced',
    display_order: 2,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },

  // =========================================================================
  // CYBERSECURITY ANALYST (Roadmap b1000000-0000-0000-0000-000000000012)
  // =========================================================================

  // Skill 55: Network Protocols & Packet Analysis (Wireshark) (foundation)
  {
    id: 'd1000000-0000-0000-0000-000000000040',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000055',
    title: 'Wireshark Foundation — Wireshark User Guide',
    provider_name: 'Wireshark Foundation',
    resource_type: 'documentation',
    url: 'https://www.wireshark.org/docs/wsug_html_chunked/',
    description: 'Complete user guide for capturing network interfaces, filtering packets, and inspecting protocols.',
    access_type: 'free',
    difficulty: 'foundation',
    display_order: 1,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },
  {
    id: 'd1000000-0000-0000-0000-000000000041',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000055',
    title: 'IETF — RFC 9293: Transmission Control Protocol (TCP)',
    provider_name: 'Internet Engineering Task Force',
    resource_type: 'standard',
    url: 'https://datatracker.ietf.org/doc/html/rfc9293',
    description: 'Official internet standard specification of the Transmission Control Protocol architecture and state machine.',
    access_type: 'free',
    difficulty: 'foundation',
    display_order: 2,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },

  // Skill 60: Incident Response, Containment & Forensic Triage (core)
  {
    id: 'd1000000-0000-0000-0000-000000000042',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000060',
    title: 'NIST — SP 800-61 Rev. 2: Computer Security Incident Handling Guide',
    provider_name: 'NIST',
    resource_type: 'standard',
    url: 'https://csrc.nist.gov/publications/detail/sp/800-61/rev-2/final',
    description: 'Authoritative national guidelines on structuring incident response phases, containment, and post-mortems.',
    access_type: 'free',
    difficulty: 'core',
    display_order: 1,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },
  {
    id: 'd1000000-0000-0000-0000-000000000043',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000060',
    title: 'CISA — Federal Incident Response Playbooks',
    provider_name: 'CISA',
    resource_type: 'guide',
    url: 'https://www.cisa.gov/resources-tools/resources/federal-government-cybersecurity-incident-and-vulnerability-response-playbooks',
    description: 'Operational playbooks detailing standardized response procedures for cybersecurity compromises.',
    access_type: 'free',
    difficulty: 'core',
    display_order: 2,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },

  // Skill 61: Web Application Security & OWASP Top 10 (core)
  {
    id: 'd1000000-0000-0000-0000-000000000044',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000061',
    title: 'OWASP Foundation — OWASP Top 10 Security Risks',
    provider_name: 'OWASP',
    resource_type: 'standard',
    url: 'https://owasp.org/www-project-top-ten/',
    description: 'Definitive community consensus on the most critical web application security risks and preventive practices.',
    access_type: 'free',
    difficulty: 'core',
    display_order: 1,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },
  {
    id: 'd1000000-0000-0000-0000-000000000045',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000061',
    title: 'PortSwigger — Web Security Academy',
    provider_name: 'PortSwigger',
    resource_type: 'lab',
    url: 'https://portswigger.net/web-security',
    description: 'Interactive labs for identifying and exploiting SQL injection, XSS, CSRF, and broken access controls.',
    access_type: 'free_account_required',
    difficulty: 'core',
    display_order: 2,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },

  // Skill 62: Proactive Threat Hunting & Threat Intelligence (advanced)
  {
    id: 'd1000000-0000-0000-0000-000000000046',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000062',
    title: 'MITRE ATT&CK — Enterprise Knowledge Base of Adversary Tactics',
    provider_name: 'MITRE',
    resource_type: 'reference',
    url: 'https://attack.mitre.org/',
    description: 'Curated knowledge base of adversary behaviors, techniques, and tactics based on real-world observations.',
    access_type: 'free',
    difficulty: 'advanced',
    display_order: 1,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },
  {
    id: 'd1000000-0000-0000-0000-000000000047',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000062',
    title: 'SANS Reading Room — An Introduction to Cyber Threat Hunting',
    provider_name: 'SANS Institute',
    resource_type: 'article',
    url: 'https://www.sans.org/white-papers/',
    description: 'Technical whitepaper explaining hypothesis-driven hunting methodologies and operational indicators.',
    access_type: 'free',
    difficulty: 'advanced',
    display_order: 2,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  }
];
