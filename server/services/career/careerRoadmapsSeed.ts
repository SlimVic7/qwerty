/**
 * QWERTY Stage 7.2 — Skill Roadmaps Curated Seed Catalog
 * Curated, verified tech role skill roadmaps (Foundation -> Core -> Advanced).
 * Zero AI generation at runtime. No speculative salary figures. No external course marketplace links.
 */

import { CareerRoleRoadmap } from './types.js';

export const CURATED_ROADMAPS: CareerRoleRoadmap[] = [
  // =========================================================================
  // 1. FRONTEND ENGINEER ROADMAP
  // =========================================================================
  {
    id: 'b1000000-0000-0000-0000-000000000001',
    career_role_id: 'a1000000-0000-0000-0000-000000000001',
    version: 1,
    version_label: 'v1',
    title: 'Frontend Engineering Skill Roadmap',
    summary: 'Structured progression from core web standards and modern JavaScript frameworks to high-performance rendering, design systems, and robust client architectures.',
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
    items: [
      // --- Foundation ---
      {
        id: 'c1000000-0000-0000-0000-000000000001',
        roadmap_id: 'b1000000-0000-0000-0000-000000000001',
        stage: 'foundation',
        skill_name: 'Semantic HTML5 & Accessible Markup',
        skill_category: 'Web Standards & Accessibility',
        description: 'Structuring web documents with meaningful semantic elements, hierarchical headings, and WAI-ARIA attributes when standard elements are insufficient.',
        why_it_matters: 'Accessible, semantic markup supports assistive technology compatibility (WCAG 2.1 AA) and provides the structural basis for search engine crawlers and browser rendering engines.',
        competency_outcome: 'Can construct valid, accessible multi-page documents with intuitive keyboard navigation, ARIA live regions, and semantic form controls.',
        evidence_examples: [
          'Accessibility audit combining automated checks with keyboard navigation and screen-reader testing',
          'Keyboard-navigable modal dialog and dropdown menu tested with screen readers (NVDA/VoiceOver)',
          'Accessible form implementation featuring real-time inline validation and accessible error announcements'
        ],
        display_order: 1,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000002',
        roadmap_id: 'b1000000-0000-0000-0000-000000000001',
        stage: 'foundation',
        skill_name: 'Modern CSS, Responsive Layouts & Tailwind',
        skill_category: 'Styling & Layout Engines',
        description: 'Mastery of Flexbox, CSS Grid, media queries, container queries, custom properties, and utility-first CSS tooling.',
        why_it_matters: 'Applications must render fluidly across diverse screen form factors without broken layouts, horizontal overflow, or brittle styling overrides.',
        competency_outcome: 'Can translate Figma designs into pixel-accurate responsive layouts across desktop, tablet, and mobile viewports with zero horizontal clipping.',
        evidence_examples: [
          'Responsive multi-breakpoint dashboard layout with collapsible side navigation',
          'Component library stylesheet utilizing CSS custom properties for light/dark theme switching',
          'Production project demonstrating modern Tailwind CSS utility composition with clean semantic markup'
        ],
        display_order: 2,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000003',
        roadmap_id: 'b1000000-0000-0000-0000-000000000001',
        stage: 'foundation',
        skill_name: 'JavaScript Fundamentals & DOM APIs',
        skill_category: 'Core Programming',
        description: 'Deep understanding of modern ES6+ syntax, asynchronous programming (Promises, async/await), event loops, closures, and browser DOM manipulation.',
        why_it_matters: 'Frameworks come and go, but browser execution mechanics, event delegation, and asynchronous runtime behavior remain fundamental across all frontend platforms.',
        competency_outcome: 'Can write idiomatic, reliable asynchronous JavaScript to handle DOM events, manage timers, and coordinate network requests without framework abstractions.',
        evidence_examples: [
          'Vanilla JavaScript interactive data table featuring client-side filtering, sorting, and pagination',
          'Custom event bus or observer implementation handling cross-component events',
          'Asynchronous data loader with debounce, throttle, and retry mechanisms'
        ],
        display_order: 3,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000004',
        roadmap_id: 'b1000000-0000-0000-0000-000000000001',
        stage: 'foundation',
        skill_name: 'Version Control & Git Workflows',
        skill_category: 'Developer Collaboration',
        description: 'Branch management, pull requests, resolving merge conflicts, interactive rebasing, and conventional commit standards.',
        why_it_matters: 'Collaborative software engineering requires clean commit hygiene, atomic revisions, and safe rollback capabilities.',
        competency_outcome: 'Can navigate multi-branch team workflows, write structured pull requests, resolve complex merge conflicts, and review peer contributions constructively.',
        evidence_examples: [
          'Public GitHub repository with meaningful commit messages adhering to Conventional Commits',
          'Documented pull requests containing test evidence, change rationale, and UI screenshots',
          'Demonstrated branching model (GitHub Flow or trunk-based development) across personal projects'
        ],
        display_order: 4,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },

      // --- Core ---
      {
        id: 'c1000000-0000-0000-0000-000000000005',
        roadmap_id: 'b1000000-0000-0000-0000-000000000001',
        stage: 'core',
        skill_name: 'TypeScript for Client Applications',
        skill_category: 'Type Systems & Reliability',
        description: 'Using static typing, generic interfaces, union types, discriminated unions, and utility types to prevent common runtime type errors.',
        why_it_matters: 'Enterprise frontend codebases depend on TypeScript to maintain strict API contracts, enable safe refactoring, and accelerate developer velocity.',
        competency_outcome: 'Can model complex UI states, API request/response shapes, and component props with strict type safety and zero reliance on untyped escape hatches.',
        evidence_examples: [
          'Full-scale TypeScript React application configured with strict compiler options (`noImplicitAny: true`)',
          'Generic data table component typed to infer column definitions from arbitrary dataset records',
          'API integration layer with discriminated unions modeling loading, success, and error states'
        ],
        display_order: 5,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000006',
        roadmap_id: 'b1000000-0000-0000-0000-000000000001',
        stage: 'core',
        skill_name: 'React Component Architecture & Hooks',
        skill_category: 'Modern Web Frameworks',
        description: 'Designing modular component hierarchies, managing state and lifecycle with custom hooks, and controlling re-render cycles.',
        why_it_matters: 'React is a widely used modern library for interactive web applications. Idiomatic hook usage and component decomposition help avoid state synchronization bugs.',
        competency_outcome: 'Can architect modular UI features with decoupled presentation and business logic, leveraging custom hooks for state reuse.',
        evidence_examples: [
          'Reusable custom hooks suite (e.g., `useDebounce`, `useLocalStorage`, `useIntersectionObserver`)',
          'Complex multi-step checkout or intake wizard with unified form state and step validation',
          'Component decomposition showcasing clean separation between container controllers and presentational views'
        ],
        display_order: 6,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000007',
        roadmap_id: 'b1000000-0000-0000-0000-000000000001',
        stage: 'core',
        skill_name: 'Client State Management & Data Fetching',
        skill_category: 'State & Cache Management',
        description: 'Managing global client state (Zustand, Context) and server cache synchronization with optimistic mutations, error rollbacks, and revalidation.',
        why_it_matters: 'Modern SPAs require seamless synchronization between server data and client state, providing snappy responses while gracefully handling connectivity loss.',
        competency_outcome: 'Can design predictable state flow, prevent duplicate network requests, and implement optimistic updates with automatic rollback on server error.',
        evidence_examples: [
          'Zustand-backed shopping cart or workspace state with local storage persistence and undo/redo history',
          'Optimistic update implementation for a task board where cards move instantly and roll back on failure',
          'Centralized API caching layer implementing deduplication and background cache invalidation'
        ],
        display_order: 7,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000008',
        roadmap_id: 'b1000000-0000-0000-0000-000000000001',
        stage: 'core',
        skill_name: 'Automated Frontend Testing (Vitest & Testing Library)',
        skill_category: 'Quality & Test Engineering',
        description: 'Writing unit, integration, and user-centric component tests using Vitest and React Testing Library, avoiding implementation-detail testing.',
        why_it_matters: 'Thorough component test suites reduce the risk of regression bugs during feature expansions and refactoring cycles, helping maintain robust UI behaviors.',
        competency_outcome: 'Can write resilient automated tests verifying critical user journeys, asynchronous loading sequences, and error boundary behaviors.',
        evidence_examples: [
          'Automated test suite achieving >80% branch coverage across critical interactive feature modules',
          'Integration tests asserting user interactions using accessible roles and userEvent APIs',
          'Mocked API responses simulating network failures and verifying fallback UI error states'
        ],
        display_order: 8,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000009',
        roadmap_id: 'b1000000-0000-0000-0000-000000000001',
        stage: 'core',
        skill_name: 'Modern Bundlers, Tooling & Vite',
        skill_category: 'Build Systems & Tooling',
        description: 'Configuring build pipelines, code splitting, asset optimization, environment variables, and module resolution with Vite/Rollup.',
        why_it_matters: 'Efficient build tooling can improve local development feedback and optimize production bundle payloads for fast initial load times.',
        competency_outcome: 'Can configure Vite production builds, analyze bundle visualizers to prune bloated packages, and implement dynamic route-based code splitting.',
        evidence_examples: [
          'Vite configuration with manual chunking strategy reducing initial bundle payload below 200kB',
          'Rollup visualizer report identifying and pruning unused transitive dependencies',
          'Automated CI pipeline compiling production builds and executing lint checks on pull requests'
        ],
        display_order: 9,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },

      // --- Advanced ---
      {
        id: 'c1000000-0000-0000-0000-000000000010',
        roadmap_id: 'b1000000-0000-0000-0000-000000000001',
        stage: 'advanced',
        skill_name: 'Web Performance & Core Web Vitals Optimization',
        skill_category: 'Performance Engineering',
        description: 'Profiling and optimizing Largest Contentful Paint (LCP), Interaction to Next Paint (INP), and Cumulative Layout Shift (CLS).',
        why_it_matters: 'Sub-second rendering and fluid input response directly correlate with user retention, conversion rates, and organic discovery ranking.',
        competency_outcome: 'Can diagnose performance bottlenecks using Chrome DevTools Performance Profiler, reduce main-thread blocking time, and minimize unexpected layout shifts.',
        evidence_examples: [
          'Case study documenting optimization of LCP from 3.8s to <1.5s via font preloading and image responsive sets',
          'Performance audit reducing long tasks (>50ms) through web workers or time-slicing computations',
          'Implementation of virtualized lists rendering 10,000+ items at 60fps with minimal DOM nodes'
        ],
        display_order: 10,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000011',
        roadmap_id: 'b1000000-0000-0000-0000-000000000001',
        stage: 'advanced',
        skill_name: 'Design Systems & Component Governance',
        skill_category: 'Design Systems & Architecture',
        description: 'Architecting enterprise-scale design tokens, headless accessible components, theming engines, and versioned component packages.',
        why_it_matters: 'Scaling frontend engineering across multiple feature squads requires strict visual consistency, standardized token contracts, and shared components.',
        competency_outcome: 'Can build and govern a multi-theme design system with accessible primitive components, comprehensive documentation, and semantic token variables.',
        evidence_examples: [
          'Storybook or interactive documentation workspace showcasing a versioned component design system',
          'Token architecture repository defining typography, spacing, and color variables exported for web and mobile',
          'Compound component pattern implementation with full keyboard navigation and context encapsulation'
        ],
        display_order: 11,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000012',
        roadmap_id: 'b1000000-0000-0000-0000-000000000001',
        stage: 'advanced',
        skill_name: 'Frontend Security & Client Resilience',
        skill_category: 'Application Security & Resilience',
        description: 'Defending against Cross-Site Scripting (XSS), Cross-Site Request Forgery (CSRF), enforcing Content Security Policy (CSP), and building resilient offline fallbacks.',
        why_it_matters: 'Client applications process sensitive user credentials and tokens; misconfigurations can lead to session hijacking, data exfiltration, or total service disruption.',
        competency_outcome: 'Can audit client applications for XSS injection vectors, implement safe sanitization pipelines, enforce strict CSP headers, and configure Service Worker offline caching.',
        evidence_examples: [
          'Security audit writeup reviewing DOM sanitization (DOMPurify) and safe cookie attributes (`HttpOnly`, `SameSite=Lax`)',
          'Service worker implementation caching static assets and gracefully serving offline fallback screens',
          'Comprehensive Error Boundary and telemetry harness catching and reporting unexpected client exceptions'
        ],
        display_order: 12,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      }
    ]
  },

  // =========================================================================
  // 2. BACKEND ENGINEER ROADMAP
  // =========================================================================
  {
    id: 'b1000000-0000-0000-0000-000000000002',
    career_role_id: 'a1000000-0000-0000-0000-000000000002',
    version: 1,
    version_label: 'v1',
    title: 'Backend Engineering Skill Roadmap',
    summary: 'Progression from foundational API protocols and relational data modeling to distributed asynchronous messaging, high-concurrency caching, and resilient system design.',
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
    items: [
      // --- Foundation ---
      {
        id: 'c1000000-0000-0000-0000-000000000013',
        roadmap_id: 'b1000000-0000-0000-0000-000000000002',
        stage: 'foundation',
        skill_name: 'Server Runtime & Asynchronous I/O (Node.js/TypeScript)',
        skill_category: 'Server Runtimes',
        description: 'Event-driven architecture, non-blocking I/O operations, streams, buffers, and process lifecycles in Node.js with strict TypeScript typing.',
        why_it_matters: 'Understanding how the Node.js event loop coordinates thread pools and asynchronous operations is essential to building responsive, non-blocking network services.',
        competency_outcome: 'Can write high-throughput server applications utilizing streams for memory-efficient file transfers and handling concurrent network connections cleanly.',
        evidence_examples: [
          'Stream-based CSV or file processing service processing multi-gigabyte uploads with constant low memory usage',
          'Custom worker thread pool or clustering setup handling CPU-bound cryptographic tasks without blocking HTTP event loop',
          'TypeScript backend service with structured error handling classes and graceful process termination (`SIGTERM`)'
        ],
        display_order: 1,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000014',
        roadmap_id: 'b1000000-0000-0000-0000-000000000002',
        stage: 'foundation',
        skill_name: 'Relational Database Modeling & SQL (PostgreSQL)',
        skill_category: 'Data Persistence & Modeling',
        description: 'Designing normalized 3NF schemas, foreign key relationships, cascading rules, transactions (ACID), and writing pure SQL queries.',
        why_it_matters: 'The relational database is typically the primary source of truth for business data; flawed schema designs cause data corruption, performance bottlenecks, and painful migrations.',
        competency_outcome: 'Can model complex entity-relationship diagrams, write multi-table joins, enforce constraints at the database tier, and manage schema migrations via version-controlled scripts.',
        evidence_examples: [
          'Normalized multi-table schema for an e-commerce or booking platform with strict foreign keys and check constraints',
          'SQL migration scripts with corresponding idempotency checks, up/down steps, and data backfills',
          'Transactional operations wrapping multiple ledger mutations in strict ACID transactions with rollback capabilities'
        ],
        display_order: 2,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000015',
        roadmap_id: 'b1000000-0000-0000-0000-000000000002',
        stage: 'foundation',
        skill_name: 'RESTful API Architecture & HTTP Semantics',
        skill_category: 'API Design & Protocols',
        description: 'Designing clean resource-oriented URLs, accurate HTTP status codes, idempotent methods, request payload validation, and pagination protocols.',
        why_it_matters: 'APIs are the public contract between client applications and server services; consistent semantics reduce client integration friction and reduce ambiguous failure states.',
        competency_outcome: 'Can design, document (OpenAPI/Swagger), and build consistent REST APIs with comprehensive input validation and standardized error response envelopes.',
        evidence_examples: [
          'OpenAPI 3.0 specification accompanying a production-grade REST API service',
          'Zod-based request validation middleware rejecting invalid payloads with descriptive HTTP 400 validation error payloads',
          'Cursor-based and offset-based pagination implementation handling large result sets predictably'
        ],
        display_order: 3,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000016',
        roadmap_id: 'b1000000-0000-0000-0000-000000000002',
        stage: 'foundation',
        skill_name: 'Linux Environment, Bash & Networking Basics',
        skill_category: 'Operating Systems & Networking',
        description: 'Navigating Linux terminal environments, managing process daemons (systemd), reading logs (journalctl), network port binding, and DNS/TLS foundations.',
        why_it_matters: 'Many backend workloads run in Linux environments; diagnosing production issues requires familiarity with terminal utilities, file permissions, and TCP/IP sockets.',
        competency_outcome: 'Can configure local Linux developer environments, write shell automation scripts, inspect network sockets with netstat/curl, and debug process resource utilization.',
        evidence_examples: [
          'Shell automation script deploying applications, performing health checks, and managing log rotations',
          'Configured reverse proxy (Nginx or Caddy) routing SSL traffic to backend application ports',
          'Documented troubleshooting workflow using `top`, `lsof`, `journalctl`, and `curl` to diagnose service failure'
        ],
        display_order: 4,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },

      // --- Core ---
      {
        id: 'c1000000-0000-0000-0000-000000000017',
        roadmap_id: 'b1000000-0000-0000-0000-000000000002',
        stage: 'core',
        skill_name: 'Authentication, Authorization & Role-Based Access Control (RBAC)',
        skill_category: 'Application Security',
        description: 'Implementing JWT verification, OAuth 2.0 flows, session cookies, password hashing (Argon2/bcrypt), and granular role/permission checks.',
        why_it_matters: 'Flawed authorization is a top security risk (OWASP Broken Object Level Authorization); applications must protect endpoints and data records with strict verification.',
        competency_outcome: 'Can build secure authentication workflows with short-lived access tokens, refresh token rotation, and robust role-based authorization middleware.',
        evidence_examples: [
          'Express/Fastify authentication middleware validating JWT signatures and attaching verified tenant/role context to requests',
          'Secure password hashing implementation utilizing Argon2id with work factor calibration',
          'Multi-tenant authorization layer enforcing strict row-level isolation between organizational accounts'
        ],
        display_order: 5,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000018',
        roadmap_id: 'b1000000-0000-0000-0000-000000000002',
        stage: 'core',
        skill_name: 'Database Indexing & Query Performance Optimization',
        skill_category: 'Database Engineering',
        description: 'Analyzing query execution plans (`EXPLAIN ANALYZE`), indexing strategies (B-Tree, GIN, Partial indexes), and avoiding N+1 query antipatterns.',
        why_it_matters: 'As table sizes grow into millions of rows, unindexed queries cause full table scans that exhaust server CPU and lock connection pools.',
        competency_outcome: 'Can inspect query plans, identify sequential scans, create targeted composite and partial indexes, and resolve N+1 queries using dataloaders or batch queries.',
        evidence_examples: [
          '`EXPLAIN ANALYZE` before-and-after comparison showing 100x query time reduction through composite B-tree indexing',
          'Repository implementation using batch fetching to resolve N+1 queries across related entity graphs',
          'Benchmark report illustrating query performance across partitioned or indexed database tables'
        ],
        display_order: 6,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000019',
        roadmap_id: 'b1000000-0000-0000-0000-000000000002',
        stage: 'core',
        skill_name: 'Asynchronous Background Jobs & Message Queues',
        skill_category: 'Asynchronous Architecture',
        description: 'Offloading time-consuming tasks (email sending, image processing, webhook delivery) to background worker queues (Redis BullMQ, RabbitMQ, SQS).',
        why_it_matters: 'HTTP requests should return immediately; blocking API threads during external API calls or PDF generation ruins throughput and causes request timeouts.',
        competency_outcome: 'Can build background job worker architectures with exponential backoff retries, dead-letter queues (DLQ), and idempotent job handlers.',
        evidence_examples: [
          'Redis-backed queue worker processing email notifications and webhook dispatches with automatic retry logic',
          'Dead-letter queue monitoring mechanism alerting on poison pill jobs and allowing safe manual replays',
          'Idempotent job processing pipeline utilizing unique job deduplication keys'
        ],
        display_order: 7,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000020',
        roadmap_id: 'b1000000-0000-0000-0000-000000000002',
        stage: 'core',
        skill_name: 'Automated API Integration & Contract Testing',
        skill_category: 'Testing & Reliability',
        description: 'Writing automated end-to-end API integration tests using Supertest, Vitest, and isolated test database containers.',
        why_it_matters: 'Manual Postman testing can become difficult to scale; continuous integration must verify database constraints, HTTP status codes, and security rules automatically before merging.',
        competency_outcome: 'Can build reproducible test suites spinning up ephemeral databases, executing migrations, asserting HTTP contracts, and verifying clean rollbacks.',
        evidence_examples: [
          'Full-coverage Supertest integration test suite asserting authentication, authorization, validation, and error envelopes',
          'Test fixture generator creating realistic mock relational entities for automated test runs',
          'CI test pipeline executing automated migration tests against isolated test database instances'
        ],
        display_order: 8,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000021',
        roadmap_id: 'b1000000-0000-0000-0000-000000000002',
        stage: 'core',
        skill_name: 'Containerization & Docker Fundamentals',
        skill_category: 'Application Packaging',
        description: 'Writing multi-stage Dockerfiles, managing container image sizes, defining docker-compose environments for local multi-service development.',
        why_it_matters: 'Containerization helps improve consistency of runtime dependencies across development, testing, and production environments.',
        competency_outcome: 'Can package Node.js services into minimal distroless or alpine Docker images and configure multi-container docker-compose environments.',
        evidence_examples: [
          'Multi-stage Dockerfile compiling TypeScript and producing an unprivileged, stripped production container image (<150MB)',
          'Docker Compose setup provisioning application server, PostgreSQL database, and Redis cache with health checks',
          'CI pipeline automatically building, scanning for CVE vulnerabilities (Trivy), and publishing container images'
        ],
        display_order: 9,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },

      // --- Advanced ---
      {
        id: 'c1000000-0000-0000-0000-000000000022',
        roadmap_id: 'b1000000-0000-0000-0000-000000000002',
        stage: 'advanced',
        skill_name: 'Distributed In-Memory Caching & Cache Invalidation',
        skill_category: 'Scalability & Performance',
        description: 'Implementing Cache-Aside, Write-Through, and Read-Through caching patterns using Redis; managing TTL strategies and cache stampede mitigations.',
        why_it_matters: 'High-read applications may place significant load on relational databases when every request requires a database query; efficient caching shields databases from peak traffic spikes.',
        competency_outcome: 'Can design multi-layer caching architectures with probabilistic early expiration, mutex locking against cache stampedes, and deterministic invalidation.',
        evidence_examples: [
          'Cache-aside layer using Redis with probabilistic early expiration algorithm preventing stampedes during high traffic',
          'Distributed rate-limiting middleware using Redis sliding-window algorithms to protect public API endpoints',
          'Benchmark study measuring database load reduction and 99th percentile response time improvements with caching'
        ],
        display_order: 10,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000023',
        roadmap_id: 'b1000000-0000-0000-0000-000000000002',
        stage: 'advanced',
        skill_name: 'Distributed Systems & Event-Driven Architecture',
        skill_category: 'Distributed Systems',
        description: 'Designing transactional outboxes, idempotent consumers, saga orchestration, and event-driven communication (Kafka, RabbitMQ).',
        why_it_matters: 'As systems grow or are divided across service boundaries, event-driven architectures can support decoupled domains and eventual-consistency patterns across services.',
        competency_outcome: 'Can design event schemas, implement transactional outbox patterns to support reliable message publishing, and handle out-of-order events safely.',
        evidence_examples: [
          'Transactional outbox pattern implementation committing business state and outbox events in a single relational transaction',
          'Event-driven consumer with idempotency keys ensuring duplicate delivery causes zero side effects',
          'Architecture diagram and technical design doc outlining eventual consistency across billing and order services'
        ],
        display_order: 11,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000024',
        roadmap_id: 'b1000000-0000-0000-0000-000000000002',
        stage: 'advanced',
        skill_name: 'Observability, Distributed Tracing & SRE Metrics',
        skill_category: 'Site Reliability Engineering',
        description: 'Structured logging (Pino/Winston), OpenTelemetry distributed tracing, Prometheus metrics, and defining Service Level Indicators (SLIs).',
        why_it_matters: 'Structured logs and distributed trace IDs are important tools for diagnosing production failures.',
        competency_outcome: 'Can instrument backend services with structured JSON logging, trace context propagation across HTTP/RPC calls, and Prometheus metrics for latency and error rates.',
        evidence_examples: [
          'OpenTelemetry integration passing traceparent headers across HTTP calls with Jaeger trace visualization',
          'Prometheus exporter collecting HTTP request duration histograms, active connection counts, and error rates',
          'Grafana dashboard template graphing p50, p95, and p99 latency against error budget SLO targets'
        ],
        display_order: 12,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      }
    ]
  },

  // =========================================================================
  // 3. DATA ANALYST ROADMAP
  // =========================================================================
  {
    id: 'b1000000-0000-0000-0000-000000000005',
    career_role_id: 'a1000000-0000-0000-0000-000000000005',
    version: 1,
    version_label: 'v1',
    title: 'Data Analyst Skill Roadmap',
    summary: 'Clear progression from descriptive statistics and SQL querying to business metric modeling, interactive dashboard design, and stakeholder storytelling.',
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
    items: [
      // --- Foundation ---
      {
        id: 'c1000000-0000-0000-0000-000000000025',
        roadmap_id: 'b1000000-0000-0000-0000-000000000005',
        stage: 'foundation',
        skill_name: 'SQL Querying & Data Extraction Foundations',
        skill_category: 'Data Extraction',
        description: 'Writing SQL queries using SELECT, WHERE, GROUP BY, HAVING, basic INNER/LEFT JOINs, and aggregation functions (SUM, AVG, COUNT).',
        why_it_matters: 'SQL is widely used for querying relational databases and analytical warehouses; analysts must reliably query databases and data warehouses to inspect raw business records.',
        competency_outcome: 'Can extract, filter, and aggregate multi-table datasets accurately from production and staging analytical databases.',
        evidence_examples: [
          'SQL query portfolio demonstrating multi-table joins, conditional aggregations, and null value handling',
          'Data validation script reconciling raw transaction logs with daily accounting ledger totals',
          'Documented case study extracting customer activity metrics from relational database tables'
        ],
        display_order: 1,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000026',
        roadmap_id: 'b1000000-0000-0000-0000-000000000005',
        stage: 'foundation',
        skill_name: 'Spreadsheet Modeling & Data Validation',
        skill_category: 'Spreadsheets & Tabular Data',
        description: 'Advanced spreadsheet formulas (XLOOKUP, INDEX/MATCH), pivot tables, data cleaning, sanity checks, and financial modeling.',
        why_it_matters: 'Spreadsheets remain ubiquitous across business teams for ad-hoc financial models, rapid prototyping, and cross-team data validation.',
        competency_outcome: 'Can build audit-ready spreadsheet workbooks with dynamic lookups, automated error checks, and clean formatting for stakeholder review.',
        evidence_examples: [
          'Financial revenue forecast model utilizing dynamic lookups, scenario toggles, and sanity checks',
          'Automated data reconciliation workbook matching inventory lists across disparate retail channels',
          'Spreadsheet dashboard featuring dynamic pivot charts and automated conditional formatting alerts'
        ],
        display_order: 2,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000027',
        roadmap_id: 'b1000000-0000-0000-0000-000000000005',
        stage: 'foundation',
        skill_name: 'Descriptive Statistics & Exploratory Metrics',
        skill_category: 'Quantitative Analysis',
        description: 'Understanding mean, median, standard deviation, interquartile ranges, distributions, percentiles, and identifying outliers.',
        why_it_matters: 'Relying solely on averages hides critical distribution skews and misleading anomalies; analysts must understand statistical distribution shapes.',
        competency_outcome: 'Can calculate distribution metrics, identify outliers, evaluate skewness, and present variance measures accurately to non-technical stakeholders.',
        evidence_examples: [
          'Exploratory data analysis report evaluating user session durations with percentile breakdowns (p50, p90, p99)',
          'Outlier detection audit detailing treatment of skewed transaction outliers in a marketplace dataset',
          'Statistical summary presentation highlighting difference between average customer spend and median spend'
        ],
        display_order: 3,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },

      // --- Core ---
      {
        id: 'c1000000-0000-0000-0000-000000000028',
        roadmap_id: 'b1000000-0000-0000-0000-000000000005',
        stage: 'core',
        skill_name: 'Advanced SQL, CTEs & Analytical Window Functions',
        skill_category: 'Advanced Querying',
        description: 'Complex data manipulation using Common Table Expressions (CTEs), window functions (ROW_NUMBER, RANK, LAG, LEAD), and recursive queries.',
        why_it_matters: 'Calculating cohort retention, cumulative running totals, and period-over-period growth rates requires sophisticated windowing without redundant queries.',
        competency_outcome: 'Can write performant SQL queries computing retention cohorts, rolling averages, month-over-month growth, and ranking metrics across millions of rows.',
        evidence_examples: [
          'Cohort retention analysis query computing 30-day user retention curves using window functions and CTEs',
          'Running total and moving average calculation script tracking customer lifetime value progression',
          'Query optimization writeup refactoring slow nested subqueries into clean indexed CTE pipelines'
        ],
        display_order: 4,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000029',
        roadmap_id: 'b1000000-0000-0000-0000-000000000005',
        stage: 'core',
        skill_name: 'Business Intelligence & Interactive Dashboard Design',
        skill_category: 'BI & Data Visualization',
        description: 'Building self-serve business intelligence dashboards (Tableau, Power BI, Looker) with user filters, calculated fields, and visual hierarchy.',
        why_it_matters: 'Dashboards empower business teams to monitor KPIs independently, freeing analysts from repetitive ad-hoc reporting requests.',
        competency_outcome: 'Can design intuitive, fast-loading executive dashboards that highlight actionable trends, outliers, and KPI performance against targets.',
        evidence_examples: [
          'Published interactive Tableau/PowerBI dashboard tracking marketing funnel conversions with drill-down filters',
          'Executive KPI scorecard dashboard designed for senior leadership with daily automated refresh',
          'Style guide and usability audit documentation establishing consistent charting standards across team reports'
        ],
        display_order: 5,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000030',
        roadmap_id: 'b1000000-0000-0000-0000-000000000005',
        stage: 'core',
        skill_name: 'Python for Data Analysis (Pandas & NumPy)',
        skill_category: 'Programming & Data Wrangling',
        description: 'Data wrangling, transformation, aggregation, and visualization using Python libraries (pandas, numpy, matplotlib, seaborn).',
        why_it_matters: 'When data transformations exceed SQL capabilities or require statistical transformations and automated scripting, Python is widely used for data analysis and automation.',
        competency_outcome: 'Can load messy datasets into Pandas DataFrames, perform complex merges and pivots, impute missing values, and output cleaned analytical tables.',
        evidence_examples: [
          'Jupyter notebook documenting exploratory analysis of an open-source churn dataset with Pandas visualizations',
          'Automated Python script parsing, validating, and normalizing disparate third-party partner data exports',
          'GitHub repository featuring modular Python data-cleaning functions accompanied by unit tests'
        ],
        display_order: 6,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000031',
        roadmap_id: 'b1000000-0000-0000-0000-000000000005',
        stage: 'core',
        skill_name: 'Data Cleaning, Validation & Anomaly Detection',
        skill_category: 'Data Quality & Hygiene',
        description: 'Detecting data drift, schema mismatches, duplicate records, unmapped categories, and establishing data hygiene guardrails.',
        why_it_matters: 'Garbage in, garbage out; flawed data inputs destroy organizational trust in reports and can mislead critical operational decisions.',
        competency_outcome: 'Can implement automated data validation tests, detect pipeline anomalies early, and audit source datasets for completeness and accuracy.',
        evidence_examples: [
          'Automated data audit script asserting primary key uniqueness, null percentages, and expected category ranges',
          'Root cause investigation memo documenting how an upstream logging bug corrupted conversion tracking data',
          'Data dictionary documentation cataloging source table definitions, update cadences, and known caveats'
        ],
        display_order: 7,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },

      // --- Advanced ---
      {
        id: 'c1000000-0000-0000-0000-000000000032',
        roadmap_id: 'b1000000-0000-0000-0000-000000000005',
        stage: 'advanced',
        skill_name: 'Dimensional Modeling & Star Schema Design',
        skill_category: 'Data Warehouse Architecture',
        description: 'Designing facts, dimensions, slowly changing dimensions (SCD Type 1/2), and star schemas for analytical cloud warehouses (Snowflake, BigQuery).',
        why_it_matters: 'Normalized operational schemas may be less convenient for some analytical workloads; dimensional modeling can improve analytical query performance and simplify BI reporting.',
        competency_outcome: 'Can design and document dimensional models (star/snowflake schemas), write transformation dbt models, and manage grain definitions.',
        evidence_examples: [
          'Dimensional model architecture diagram detailing fact sales and customer dimension tables with SCD Type 2 tracking',
          'dbt project repository containing modular transformations, documentation, and schema test assertions',
          'Performance benchmark showing 10x query speedup after refactoring raw tables into curated dimensional datamarts'
        ],
        display_order: 8,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000033',
        roadmap_id: 'b1000000-0000-0000-0000-000000000005',
        stage: 'advanced',
        skill_name: 'A/B Testing & Controlled Experimentation',
        skill_category: 'Experimentation & Hypothesis Testing',
        description: 'Sample size calculation, power analysis, p-values, confidence intervals, two-sample hypothesis tests, and avoiding peeking bias.',
        why_it_matters: 'Product teams test features to determine causal impact; rigorous statistical experimentation helps distinguish observed effects from random variation.',
        competency_outcome: 'Can calculate minimum required sample sizes, design randomized experiments, analyze test results with statistical rigor, and communicate caveats.',
        evidence_examples: [
          'A/B test experimental design document specifying hypothesis, primary metric, guardrail metrics, and power analysis',
          'Post-experiment statistical evaluation deck demonstrating confidence intervals, p-values, and rollout recommendation',
          'Python script computing required sample size based on baseline conversion rate and minimum detectable effect'
        ],
        display_order: 9,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000034',
        roadmap_id: 'b1000000-0000-0000-0000-000000000005',
        stage: 'advanced',
        skill_name: 'Executive Storytelling & Decision Impact Framing',
        skill_category: 'Business Communication',
        description: 'Synthesizing complex technical findings into concise, actionable executive summaries with clear trade-offs, risks, and strategic recommendations.',
        why_it_matters: 'Analytical insights have the greatest impact when decision-makers understand the conclusions and trust the recommended course of action.',
        competency_outcome: 'Can present data findings to executive leadership using the Pyramid Principle, answering "so what?" clearly and facilitating strategic alignment.',
        evidence_examples: [
          'Executive presentation deck synthesizing customer retention drivers with concrete budget allocation proposals',
          'One-page decision memo recommending sunset of an underperforming product feature backed by usage data',
          'Recorded presentation or video walkthrough explaining analytical conclusions to a non-technical leadership panel'
        ],
        display_order: 10,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      }
    ]
  },

  // =========================================================================
  // 4. PRODUCT MANAGER ROADMAP
  // =========================================================================
  {
    id: 'b1000000-0000-0000-0000-000000000008',
    career_role_id: 'a1000000-0000-0000-0000-000000000008',
    version: 1,
    version_label: 'v1',
    title: 'Product Management Skill Roadmap',
    summary: 'Progression from customer problem definition and agile execution to data-informed product discovery, cross-functional prioritization, and strategic market positioning.',
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
    items: [
      // --- Foundation ---
      {
        id: 'c1000000-0000-0000-0000-000000000035',
        roadmap_id: 'b1000000-0000-0000-0000-000000000008',
        stage: 'foundation',
        skill_name: 'User Research & Problem Discovery',
        skill_category: 'Customer Discovery',
        description: 'Conducting user interviews, qualitative discovery, synthesizing customer pain points, and avoiding leading question biases.',
        why_it_matters: 'Building the wrong feature can waste significant engineering effort; PMs must ground development in genuine, verified customer problems.',
        competency_outcome: 'Can plan and conduct unbiased user discovery sessions, distill interview notes into customer journey maps, and articulate problem statements.',
        evidence_examples: [
          'User research synthesis report summarizing findings from 10+ customer interviews with pain point affinity mapping',
          'Customer journey map identifying friction points in a user onboarding flow',
          'Documented problem statement brief differentiating core user problems from prescriptive feature requests'
        ],
        display_order: 1,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000036',
        roadmap_id: 'b1000000-0000-0000-0000-000000000008',
        stage: 'foundation',
        skill_name: 'Agile Delivery, Sprint Planning & User Stories',
        skill_category: 'Agile Execution',
        description: 'Writing clear user stories with unambiguous acceptance criteria (Gherkin/Given-When-Then), backlog grooming, and sprint facilitation.',
        why_it_matters: 'Engineering squads require clear, scoped deliverables to ship software reliably on bi-weekly cadence without continuous scope churn.',
        competency_outcome: 'Can decompose complex initiatives into testable user stories with rigorous acceptance criteria and facilitate efficient agile ceremonies.',
        evidence_examples: [
          'Sprint backlog documentation featuring user stories with explicit Given-When-Then acceptance criteria',
          'Retrospective summary illustrating process improvements adopted by an engineering squad',
          'Sprint breakdown decomposing an epic feature initiative into iterative, shippable increments'
        ],
        display_order: 2,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000037',
        roadmap_id: 'b1000000-0000-0000-0000-000000000008',
        stage: 'foundation',
        skill_name: 'Product Metrics & Funnel Analytics',
        skill_category: 'Product Analytics',
        description: 'Defining North Star metrics, input metrics, conversion funnels, retention cohorts, and using analytics tools (Mixpanel, PostHog, Amplitude).',
        why_it_matters: 'Product decisions must be guided by measurable user behavioral data rather than executive opinions or loudest customer feedback.',
        competency_outcome: 'Can define measurement trees connecting operational feature metrics to top-line company goals and analyze drop-off in user funnels.',
        evidence_examples: [
          'Metrics measurement framework document defining North Star and input metrics for a feature launch',
          'Funnel analysis case study investigating user drop-off in an activation flow with telemetry event plans',
          'Analytics tracking plan specifying event triggers, properties, and naming conventions for frontend events'
        ],
        display_order: 3,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },

      // --- Core ---
      {
        id: 'c1000000-0000-0000-0000-000000000038',
        roadmap_id: 'b1000000-0000-0000-0000-000000000008',
        stage: 'core',
        skill_name: 'Feature Prioritization Frameworks (RICE, Kano, Cost of Delay)',
        skill_category: 'Roadmapping & Prioritization',
        description: 'Applying objective prioritization frameworks (Reach-Impact-Confidence-Effort, Kano model, Opportunity Scoring) to manage competing roadmap demands.',
        why_it_matters: 'Engineering capacity is strictly finite; PMs must defend tough trade-off decisions using transparent, defensible rationales.',
        competency_outcome: 'Can evaluate competing product ideas across effort and impact dimensions, scoring initiatives transparently and managing stakeholder expectations.',
        evidence_examples: [
          'RICE prioritization matrix scoring 15+ candidate product initiatives with justified confidence ratings',
          'Roadmap presentation justifying why certain popular requests were deprioritized in favor of foundational investments',
          'Opportunity solution tree mapping verified user opportunities to candidate solution hypotheses'
        ],
        display_order: 4,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000039',
        roadmap_id: 'b1000000-0000-0000-0000-000000000008',
        stage: 'core',
        skill_name: 'Product Requirements Documentation (PRD) & Scoping',
        skill_category: 'Product Definition',
        description: 'Authoring comprehensive PRDs outlining problem background, target personas, non-goals, user flows, technical constraints, and rollout plans.',
        why_it_matters: 'A thorough PRD aligns designers, engineers, QA, compliance, and marketing teams, serving as the central reference throughout development.',
        competency_outcome: 'Can produce clear, structured PRDs that clarify scope boundaries, anticipate edge cases, and provide engineering teams with actionable clarity.',
        evidence_examples: [
          'Comprehensive PRD document covering a major feature with non-goals, risk mitigations, and phased rollout stages',
          'Feature scoping workshop artifact showing progressive reduction of an MVP scope to meet delivery milestones',
          'Technical alignment doc resolving edge-case behaviors and security requirements with engineering leads'
        ],
        display_order: 5,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000040',
        roadmap_id: 'b1000000-0000-0000-0000-000000000008',
        stage: 'core',
        skill_name: 'Cross-Functional Stakeholder Leadership',
        skill_category: 'Stakeholder Management',
        description: 'Leading without authority across engineering, design, legal, marketing, and sales; facilitating alignment and handling divergent viewpoints.',
        why_it_matters: 'PMs rarely have managerial authority over teammates; effectiveness often depends heavily on persuasion, empathy, transparent communication, and shared context.',
        competency_outcome: 'Can navigate conflicting stakeholder priorities, build consensus around strategic goals, and maintain psychological safety within squads.',
        evidence_examples: [
          'Stakeholder RACI matrix for a major cross-departmental initiative',
          'Meeting facilitation notes resolving a deadlock between sales commitments and engineering technical debt',
          'Project retrospective documenting feedback from engineering, design, and business partners'
        ],
        display_order: 6,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000041',
        roadmap_id: 'b1000000-0000-0000-0000-000000000008',
        stage: 'core',
        skill_name: 'Go-to-Market (GTM) Strategy & Product Launch',
        skill_category: 'Product Launch & Enablement',
        description: 'Coordinating feature launches with marketing, sales enablement, customer support training, release notes, and canary rollouts.',
        why_it_matters: 'Shipping code to production is only half the battle; without customer enablement and internal team readiness, feature adoption may be limited.',
        competency_outcome: 'Can orchestrate cross-functional launch checklists, conduct sales enablement sessions, and manage phased beta rollouts with feedback loops.',
        evidence_examples: [
          'Go-to-Market launch plan detailing pre-launch enablement, beta feedback milestones, and public rollout dates',
          'Customer support training guide and FAQ prepared ahead of a breaking product interface change',
          'Post-launch adoption report evaluating 30-day feature usage against initial business projections'
        ],
        display_order: 7,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },

      // --- Advanced ---
      {
        id: 'c1000000-0000-0000-0000-000000000042',
        roadmap_id: 'b1000000-0000-0000-0000-000000000008',
        stage: 'advanced',
        skill_name: 'Product Vision, Strategy & Horizon Roadmapping',
        skill_category: 'Strategic Leadership',
        description: 'Crafting multi-year product visions, competitive differentiation strategies, and thematic Now/Next/Later roadmaps aligned with business strategy.',
        why_it_matters: 'Tactical execution without strategic vision results in a feature factory; senior PMs guide companies toward durable competitive moats.',
        competency_outcome: 'Can articulate multi-year product horizons, position offerings against competitive threats, and align squad roadmaps to long-term company differentiation.',
        evidence_examples: [
          'Three-year product vision narrative document presenting strategic pillars and market opportunity analysis',
          'Thematic Now/Next/Later roadmap deck presented to executive leadership and board stakeholders',
          'Competitive teardown analyzing competitor strengths, weaknesses, and defensible white-space opportunities'
        ],
        display_order: 8,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000043',
        roadmap_id: 'b1000000-0000-0000-0000-000000000008',
        stage: 'advanced',
        skill_name: 'Unit Economics, Pricing & Business Viability',
        skill_category: 'Business Model Strategy',
        description: 'Modeling customer acquisition cost (CAC), lifetime value (LTV), gross margins, pricing tiers, and assessing regulatory and commercial feasibility.',
        why_it_matters: 'Products must be commercially viable; features that users love but cost more to operate than they generate lead to unsustainable economics.',
        competency_outcome: 'Can evaluate unit economics, model feature margin impacts, run pricing sensitivity assessments, and support compliance with regulatory standards.',
        evidence_examples: [
          'Financial business case modeling LTV:CAC impact and infrastructure cost projections for an enterprise tier',
          'Pricing and packaging proposal evaluating usage-based vs seat-based subscription tiers',
          'Regulatory compliance audit assessing product readiness for enterprise SOC2 and GDPR requirements'
        ],
        display_order: 9,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000044',
        roadmap_id: 'b1000000-0000-0000-0000-000000000008',
        stage: 'advanced',
        skill_name: 'Continuous Discovery & Product Operations Architecture',
        skill_category: 'Product Operations',
        description: 'Instituting continuous customer interviewing rhythms, automated user feedback loops, telemetry governance, and product operations systems.',
        why_it_matters: 'Scaling product organizations from one to many squads requires consistent operational cadences, shared discovery repositories, and automated feedback triage.',
        competency_outcome: 'Can build continuous discovery habits across multiple squads, govern customer feedback repositories, and establish standardized product development lifecycles.',
        evidence_examples: [
          'Product development lifecycle (PDLC) playbook adopted by multi-squad product engineering organizations',
          'Centralized customer feedback repository setup categorizing feature requests and bug reports by customer tier',
          'Continuous discovery cadence schedule proving regular weekly customer touchpoints across all squad engineers and designers'
        ],
        display_order: 10,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      }
    ]
  },

  // =========================================================================
  // 5. DEVOPS & PLATFORM ENGINEER ROADMAP
  // =========================================================================
  {
    id: 'b1000000-0000-0000-0000-000000000010',
    career_role_id: 'a1000000-0000-0000-0000-000000000010',
    version: 1,
    version_label: 'v1',
    title: 'DevOps & Platform Engineering Skill Roadmap',
    summary: 'Structured pathway from Linux systems and container operations to automated CI/CD release pipelines, infrastructure-as-code, and resilient cloud architectures.',
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
    items: [
      // --- Foundation ---
      {
        id: 'c1000000-0000-0000-0000-000000000045',
        roadmap_id: 'b1000000-0000-0000-0000-000000000010',
        stage: 'foundation',
        skill_name: 'Linux Administration, Storage & Shell Automation',
        skill_category: 'Systems Administration',
        description: 'Managing Linux file permissions, systemd units, process signals, cron jobs, disk partitioning, and writing idempotent Bash scripts.',
        why_it_matters: 'Many cloud servers, containers, and orchestration nodes run Linux; platform engineers must be comfortable troubleshooting low-level OS behaviors and automating tasks via shell.',
        competency_outcome: 'Can administer Linux systems, write robust Bash automation scripts with error trapping (`set -euo pipefail`), and configure system services.',
        evidence_examples: [
          'Idempotent Bash provisioning script setting up server hardening baselines with error trapping',
          'Systemd unit file configuration managing a production background service with automated restart policies',
          'Storage maintenance script monitoring disk inode utilization and pruning old log archives automatically'
        ],
        display_order: 1,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000046',
        roadmap_id: 'b1000000-0000-0000-0000-000000000010',
        stage: 'foundation',
        skill_name: 'Containerization & Docker Operations',
        skill_category: 'Containerization',
        description: 'Building multi-stage container images, container networking, volumes, daemon configuration, and container security scanners.',
        why_it_matters: 'Containers are widely used as a packaging and deployment unit in modern cloud environments; inefficient or unhardened container images introduce security and performance liabilities.',
        competency_outcome: 'Can build secure, minimal Docker images using non-root users, optimize build cache layers, and manage multi-container runtimes.',
        evidence_examples: [
          'Multi-stage Dockerfile achieving minimal image footprint with non-root user execution and cached dependencies',
          'Vulnerability scanning report with zero critical/high CVE findings using Trivy or Grype',
          'Docker Compose multi-service local testing environment replicating cloud services'
        ],
        display_order: 2,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000047',
        roadmap_id: 'b1000000-0000-0000-0000-000000000010',
        stage: 'foundation',
        skill_name: 'Networking Protocols, DNS & TLS Fundamentals',
        skill_category: 'Networking & Security',
        description: 'TCP/IP handshake, HTTP/HTTPS headers, TLS certificate lifecycle, DNS record types (A, CNAME, ALIAS, TXT), subnetting, and CIDR blocks.',
        why_it_matters: 'Cloud infrastructure relies on virtual networks; misconfigured DNS records or subnet masks can cause service outages and routing failures.',
        competency_outcome: 'Can configure virtual network subnets, manage automated SSL/TLS certificate renewals (Let\'s Encrypt/Certbot), and debug DNS propagation issues.',
        evidence_examples: [
          'VPC network architecture diagram detailing public/private subnets, NAT gateways, and CIDR allocations',
          'Automated TLS certificate renewal configuration using Certbot and Let\'s Encrypt with DNS challenge verification',
          'Diagnostic log writeup resolving an inter-service communication failure using `tcpdump`, `dig`, and `traceroute`'
        ],
        display_order: 3,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },

      // --- Core ---
      {
        id: 'c1000000-0000-0000-0000-000000000048',
        roadmap_id: 'b1000000-0000-0000-0000-000000000010',
        stage: 'core',
        skill_name: 'CI/CD Pipeline Automation (GitHub Actions / GitLab CI)',
        skill_category: 'Release Engineering',
        description: 'Designing automated pipelines for linting, testing, security scanning, container artifact publishing, and automated canary deployments.',
        why_it_matters: 'Automated CI/CD can reduce manual deployment errors, enforce quality gates on pull requests, and allow squads to deploy safely multiple times per day.',
        competency_outcome: 'Can construct maintainable CI/CD pipelines with caching, matrix testing, secret masking, environment protection rules, and automated rollbacks.',
        evidence_examples: [
          'GitHub Actions workflow pipeline executing tests, linting, Docker build, and deployment to staging environments',
          'Reusable CI workflow module enforcing security scanning and dependency auditing across multiple repositories',
          'Automated release pipeline triggering semantic version tagging and generating automated changelog releases'
        ],
        display_order: 4,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000049',
        roadmap_id: 'b1000000-0000-0000-0000-000000000010',
        stage: 'core',
        skill_name: 'Infrastructure as Code (Terraform / OpenTofu)',
        skill_category: 'Infrastructure Automation',
        description: 'Declarative infrastructure management, state locking, remote backends (S3/GCS), modularization, and drift detection.',
        why_it_matters: 'Manual point-and-click cloud console provisioning creates unrepeatable snowflake environments; IaC supports version-controlled and auditable infrastructure management.',
        competency_outcome: 'Can write reusable Terraform modules, manage remote state with S3/DynamoDB locking, and execute plan/apply cycles safely in automated CI pipelines.',
        evidence_examples: [
          'Terraform module repository provisioning a complete VPC, database cluster, and container service environment',
          'Remote backend configuration with encrypted state storage and state-locking mechanisms',
          'Infrastructure PR showing clean `terraform plan` output with resource tagging standards'
        ],
        display_order: 5,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000050',
        roadmap_id: 'b1000000-0000-0000-0000-000000000010',
        stage: 'core',
        skill_name: 'Cloud Infrastructure & IAM Security (AWS / GCP)',
        skill_category: 'Cloud Architecture & IAM',
        description: 'Managing cloud compute (EC2/Cloud Run), managed databases (RDS/Cloud SQL), object storage (S3/GCS), and least-privilege Identity & Access Management (IAM).',
        why_it_matters: 'Overly permissive IAM roles (e.g., `AdministratorAccess`) are major security liabilities; platform engineers must enforce least-privilege access across all cloud resources.',
        competency_outcome: 'Can design cloud architectures adhering to the Well-Architected Framework, implementing granular IAM policies and encrypted storage buckets.',
        evidence_examples: [
          'IAM policy definitions adhering to least privilege principles for server execution roles',
          'Secure S3 bucket configuration with server-side encryption (KMS), public access block, and lifecycle policies',
          'Cost optimization audit reducing monthly cloud spend through right-sizing instances and deleting orphan resources'
        ],
        display_order: 6,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000051',
        roadmap_id: 'b1000000-0000-0000-0000-000000000010',
        stage: 'core',
        skill_name: 'Kubernetes & Container Orchestration Basics',
        skill_category: 'Container Orchestration',
        description: 'Understanding Pods, Deployments, Services, Ingress, ConfigMaps, Secrets, liveness/readiness probes, and resource requests/limits.',
        why_it_matters: 'Kubernetes is widely used for running containerized microservices at scale, managing automated rescheduling and rolling updates.',
        competency_outcome: 'Can deploy stateless applications to Kubernetes clusters using declarative manifests, configure health probes, and establish zero-downtime rolling updates.',
        evidence_examples: [
          'Kubernetes deployment manifest suite with horizontal pod autoscaling (HPA) and resource limits',
          'Ingress controller setup routing traffic with TLS termination to backend services',
          'Troubleshooting case study diagnosing CrashLoopBackOff and OOMKilled pod failures'
        ],
        display_order: 7,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },

      // --- Advanced ---
      {
        id: 'c1000000-0000-0000-0000-000000000052',
        roadmap_id: 'b1000000-0000-0000-0000-000000000010',
        stage: 'advanced',
        skill_name: 'Site Reliability Engineering (SRE), SLIs & Error Budgets',
        skill_category: 'Site Reliability Engineering',
        description: 'Defining Service Level Objectives (SLOs), Service Level Indicators (SLIs), error budgets, incident post-mortems, and paging on-call rotation frameworks.',
        why_it_matters: 'Alerting on every minor spike can contribute to on-call fatigue; SRE practices align engineering and business teams on acceptable failure thresholds and proactive alerting.',
        competency_outcome: 'Can establish multi-window multi-burn-rate alerting rules, define actionable SLIs for service reliability, and facilitate blameless post-mortem investigations.',
        evidence_examples: [
          'SRE Service Level Objective document defining availability and latency SLIs alongside alerting thresholds',
          'Blameless post-mortem report analyzing a simulated outage with root cause analysis and preventative remediation tickets',
          'Prometheus alerting rule configuration alerting on burn-rate spikes rather than raw threshold breaches'
        ],
        display_order: 8,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000053',
        roadmap_id: 'b1000000-0000-0000-0000-000000000010',
        stage: 'advanced',
        skill_name: 'DevSecOps, Secret Management & Zero-Trust Architecture',
        skill_category: 'Platform Security',
        description: 'HashiCorp Vault secret injection, cloud secret managers, automated SAST/DAST pipeline gates, software bill of materials (SBOM), and container signing.',
        why_it_matters: 'Hardcoded secrets in repositories or uninspected third-party dependencies are prime attack vectors; platform security must be automated at every pipeline phase.',
        competency_outcome: 'Can configure automated secret rotation, inject credentials into containers dynamically without disk writes, and enforce automated supply chain validation.',
        evidence_examples: [
          'HashiCorp Vault or AWS Secrets Manager dynamic credential injection setup for application services',
          'CI pipeline enforcing container image signing (Cosign) and SBOM generation (Syft)',
          'Automated SAST and dependency scanning gate blocking pull requests introducing high-severity CVEs'
        ],
        display_order: 9,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000054',
        roadmap_id: 'b1000000-0000-0000-0000-000000000010',
        stage: 'advanced',
        skill_name: 'Disaster Recovery, Multi-Region Resilience & Chaos Engineering',
        skill_category: 'Resilience Engineering',
        description: 'Recovery Time Objective (RTO), Recovery Point Objective (RPO), cross-region database replication, automated failover, and chaos injection (Chaos Mesh).',
        why_it_matters: 'Cloud providers suffer localized data center outages; critical enterprise applications must demonstrate verified recovery procedures rather than untested hopes.',
        competency_outcome: 'Can architect active-passive or active-active multi-region failover configurations, conduct simulated disaster recovery drills, and verify RTO/RPO limits.',
        evidence_examples: [
          'Disaster Recovery runbook detailing step-by-step failover execution with tested RTO < 15 minutes',
          'Automated backup and restore verification pipeline restoring PostgreSQL snapshots to ephemeral test databases daily',
          'Chaos engineering experiment report verifying system resilience under simulated network latency and node crashes'
        ],
        display_order: 10,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      }
    ]
  },

  // =========================================================================
  // 6. CYBERSECURITY ANALYST ROADMAP
  // =========================================================================
  {
    id: 'b1000000-0000-0000-0000-000000000012',
    career_role_id: 'a1000000-0000-0000-0000-000000000012',
    version: 1,
    version_label: 'v1',
    title: 'Cybersecurity Analyst Skill Roadmap',
    summary: 'Progression from security baseline hygiene and network packet inspection to active threat hunting, incident triage playbooks, and regulatory audit compliance.',
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
    items: [
      // --- Foundation ---
      {
        id: 'c1000000-0000-0000-0000-000000000055',
        roadmap_id: 'b1000000-0000-0000-0000-000000000012',
        stage: 'foundation',
        skill_name: 'Network Protocols & Packet Analysis (Wireshark)',
        skill_category: 'Network Defense',
        description: 'Deep understanding of OSI model layers, TCP/UDP port behaviors, DNS queries, packet capturing, and analyzing network anomalies using Wireshark.',
        why_it_matters: 'Intrusions and data exfiltration transmit across network boundaries; analysts must be capable of inspecting raw packet traces to verify malicious communication.',
        competency_outcome: 'Can capture and dissect network packets, identify suspicious port scans, detect plaintext credential transmissions, and filter protocol anomalies.',
        evidence_examples: [
          'Wireshark packet capture analysis report identifying suspicious DNS tunneling and beaconing patterns',
          'Network diagram documenting perimeter firewall rules, DMZ segmentation, and allowed traffic flows',
          'Lab writeup demonstrating detection of ARP spoofing and MITM attacks in an isolated test environment'
        ],
        display_order: 1,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000056',
        roadmap_id: 'b1000000-0000-0000-0000-000000000012',
        stage: 'foundation',
        skill_name: 'Operating System Hardening & Access Controls',
        skill_category: 'Host Security',
        description: 'Hardening Windows and Linux operating systems according to CIS Benchmarks, configuring local firewall rules, disabling unnecessary daemons, and enforcing PAM.',
        why_it_matters: 'Default operating system installations contain unnecessary open ports and legacy services that provide opportunistic footholds for attackers.',
        competency_outcome: 'Can audit and harden Windows Server and Linux hosts against CIS benchmark baselines and enforce least-privilege administrative access controls.',
        evidence_examples: [
          'Host hardening audit report benchmarked against CIS Level 1 baseline standards',
          'Ansible or Bash hardening playbook automating SSH key-only access and firewall configurations',
          'Windows Group Policy Object (GPO) configuration enforcing account lockout and audit logging'
        ],
        display_order: 2,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000057',
        roadmap_id: 'b1000000-0000-0000-0000-000000000012',
        stage: 'foundation',
        skill_name: 'Threat Landscape & Vulnerability Classes (CVE / CVSS)',
        skill_category: 'Security Fundamentals',
        description: 'Understanding Common Vulnerabilities and Exposures (CVE), Common Vulnerability Scoring System (CVSS v3.1), and MITRE ATT&CK adversary tactics.',
        why_it_matters: 'Analysts must triage vulnerabilities effectively based on exploitability and business impact rather than reacting randomly to every disclosure.',
        competency_outcome: 'Can evaluate CVSS metrics, map adversary techniques to MITRE ATT&CK tactics, and prioritize vulnerability patching based on threat intelligence.',
        evidence_examples: [
          'Vulnerability risk assessment memo analyzing a zero-day disclosure with customized CVSS environmental scoring',
          'Threat analysis report mapping a phishing campaign to specific MITRE ATT&CK adversary techniques',
          'Presentation deck explaining how software supply chain attacks occur and how to inspect dependencies'
        ],
        display_order: 3,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },

      // --- Core ---
      {
        id: 'c1000000-0000-0000-0000-000000000058',
        roadmap_id: 'b1000000-0000-0000-0000-000000000012',
        stage: 'core',
        skill_name: 'SIEM Log Correlation & Detection Engineering (Splunk / Elastic)',
        skill_category: 'Security Monitoring',
        description: 'Ingesting disparate logs (firewalls, endpoints, auth), writing correlation rules (Splunk SPL, Elastic KQL, Sigma rules), and tuning false positives.',
        why_it_matters: 'Modern enterprises generate millions of logs daily; Security Operations Centers (SOC) rely on detection rules to surface genuine threats through the noise.',
        competency_outcome: 'Can write correlation queries that detect suspicious lateral movement, credential dumping, and brute force attempts while maintaining low false-positive rates.',
        evidence_examples: [
          'Custom Sigma detection rule detecting suspicious PowerShell encoded execution across endpoint logs',
          'Splunk or Elastic dashboard tracking failed authentication spikes and privilege escalation attempts',
          'Rule tuning memo demonstrating how alert noise was reduced by 70% without sacrificing detection coverage'
        ],
        display_order: 4,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000059',
        roadmap_id: 'b1000000-0000-0000-0000-000000000012',
        stage: 'core',
        skill_name: 'Vulnerability Management & Remediation Tracking',
        skill_category: 'Vulnerability Management',
        description: 'Operating vulnerability scanners (Nessus, Qualys), interpreting scan reports, coordinating patch cycles with IT squads, and tracking remediation SLAs.',
        why_it_matters: 'Unpatched known vulnerabilities can significantly increase operational risk; rigorous remediation tracking supports timely mitigation.',
        competency_outcome: 'Can execute credentialed vulnerability scans, filter scanner false positives, and coordinate prioritized remediation roadmaps with infrastructure teams.',
        evidence_examples: [
          'Enterprise vulnerability assessment executive report highlighting critical findings and remediation timetables',
          'Vulnerability tracking dashboard monitoring team remediation velocity against organizational 30-day SLAs',
          'Remediation guide detailing verification testing steps for patched Apache/OpenSSL vulnerabilities'
        ],
        display_order: 5,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000060',
        roadmap_id: 'b1000000-0000-0000-0000-000000000012',
        stage: 'core',
        skill_name: 'Incident Response, Containment & Forensic Triage',
        skill_category: 'Incident Handling',
        description: 'Following NIST SP 800-61 / SANS incident response phases: Preparation, Identification, Containment, Eradication, Recovery, and Lessons Learned.',
        why_it_matters: 'When an active compromise occurs, uncoordinated response actions can damage forensic evidence and delay threat containment.',
        competency_outcome: 'Can execute standard incident triage playbooks, isolate compromised hosts, collect volatile memory artifacts, and author post-incident reports.',
        evidence_examples: [
          'Incident Response Playbook detailing isolation procedures for compromised active directory credentials',
          'Post-incident review report documenting timeline, attack path, containment actions, and corrective security tickets',
          'Tabletop exercise scenario document facilitating a ransomware simulation across executive stakeholders'
        ],
        display_order: 6,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000061',
        roadmap_id: 'b1000000-0000-0000-0000-000000000012',
        stage: 'core',
        skill_name: 'Web Application Security & OWASP Top 10',
        skill_category: 'Application Security',
        description: 'Identifying and verifying web security flaws: SQL injection, Cross-Site Scripting (XSS), Server-Side Request Forgery (SSRF), and broken access controls.',
        why_it_matters: 'Public web portals represent primary external entry points into corporate databases and cloud workloads; securing application layers is paramount.',
        competency_outcome: 'Can audit web applications against OWASP Top 10 risks using intercepting proxies (Burp Suite/OWASP ZAP) and verify safe input sanitization and token handling.',
        evidence_examples: [
          'Web application security assessment report identifying and reproducing simulated OWASP Top 10 vulnerabilities',
          'Burp Suite assessment log verifying remediation of an IDOR (Insecure Direct Object Reference) flaw',
          'Secure coding recommendation document provided to frontend and backend engineering squads'
        ],
        display_order: 7,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },

      // --- Advanced ---
      {
        id: 'c1000000-0000-0000-0000-000000000062',
        roadmap_id: 'b1000000-0000-0000-0000-000000000012',
        stage: 'advanced',
        skill_name: 'Proactive Threat Hunting & Threat Intelligence',
        skill_category: 'Threat Intelligence',
        description: 'Formulating threat hypotheses, operationalizing Indicators of Compromise (IOCs) and Tactics, Techniques, and Procedures (TTPs), and hunting anomalous host activity.',
        why_it_matters: 'Advanced threats may bypass preventive controls such as antivirus and perimeter defenses; proactive threat hunting can help identify suspicious activity that automated controls may not surface.',
        competency_outcome: 'Can formulate intelligence-led threat hypotheses, query telemetry endpoints for stealthy persistence mechanisms, and document novel threat detections.',
        evidence_examples: [
          'Threat hunting campaign documentation detailing hypothesis, query logic, data sources, and findings',
          'Threat intelligence brief synthesizing active ransomware actor TTPs targeting sector companies',
          'YARA rule suite detecting proprietary malware staging artifacts on Windows hosts'
        ],
        display_order: 8,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000063',
        roadmap_id: 'b1000000-0000-0000-0000-000000000012',
        stage: 'advanced',
        skill_name: 'Security Compliance, Governance & Audit Frameworks',
        skill_category: 'Governance, Risk & Compliance (GRC)',
        description: 'Mapping controls to regulatory frameworks (ISO 27001, SOC 2 Type II, NIST CSF, GDPR, Cyber Essentials) and preparing audit evidence.',
        why_it_matters: 'Enterprise sales and legal operations require verifiable security credentials; non-compliance carries severe regulatory penalties and business loss.',
        competency_outcome: 'Can map technical controls to ISO 27001 and SOC 2 criteria, prepare audit evidence packages, and draft security governance policies.',
        evidence_examples: [
          'SOC 2 Type II readiness assessment report mapping AWS cloud controls to Trust Services Criteria',
          'Information Security Policy document establishing organization-wide data classification and acceptable use rules',
          'Third-party vendor risk assessment questionnaire evaluating partner supply chain security postures'
        ],
        display_order: 9,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      },
      {
        id: 'c1000000-0000-0000-0000-000000000064',
        roadmap_id: 'b1000000-0000-0000-0000-000000000012',
        stage: 'advanced',
        skill_name: 'Security Orchestration, Automation & Response (SOAR)',
        skill_category: 'Security Automation',
        description: 'Writing automated incident response playbooks (Python, SOAR platforms) to enrich alerts, isolate infected hosts, and revoke compromised tokens automatically.',
        why_it_matters: 'Manual alert triage can become difficult to scale as alert volumes and threat activity increase; automating repetitive triage and selected containment actions can reduce Mean Time to Remediate (MTTR).',
        competency_outcome: 'Can develop Python automation scripts integrating SIEM alerts, virus threat intelligence APIs (VirusTotal/AbuseIPDB), and automated firewall quarantine actions.',
        evidence_examples: [
          'Python SOAR automation script automatically querying IP reputation APIs and adding malicious IPs to firewall blocklists',
          'Automated phishing triage bot extracting URLs from user-reported emails and scanning attachments in sandboxes',
          'Webhook integration triggering automated credential revoking and session invalidation upon high-risk login alerts'
        ],
        display_order: 10,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z'
      }
    ]
  }
];
