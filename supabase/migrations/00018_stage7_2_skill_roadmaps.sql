-- ============================================================
-- Migration: 00018_stage7_2_skill_roadmaps.sql
-- Stage: 7.2 Skill Roadmaps
-- Status: PENDING MANUAL PREFLIGHT REVIEW — DO NOT RUN AUTOMATICALLY
--
-- Description:
-- Provisions curated Career Role Skill Roadmaps tables:
-- - public.career_role_roadmaps: Versioned roadmap metadata referencing career_roles
-- - public.career_role_roadmap_items: Sequential educational skill benchmarks (foundation, core, advanced)
-- - Zero AI claims, zero dynamic salary claims, zero course provider marketplace links
-- - Strict RLS & Grants (Server-Mediated Candidate Access Model):
--     PUBLIC, anon, authenticated: zero direct table access
--     service_role: minimum required CRUD (API-mediated access)
--     Candidate access gated via server API (requireAuth, requireRole(['candidate']))
-- ============================================================

BEGIN;

-- ============================================================
-- 1. CAREER ROLE ROADMAPS TABLE
-- ============================================================

CREATE TABLE public.career_role_roadmaps (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    career_role_id uuid NOT NULL REFERENCES public.career_roles(id) ON DELETE RESTRICT,
    version integer NOT NULL DEFAULT 1,
    version_label text NOT NULL DEFAULT 'v1',
    title text NOT NULL,
    summary text NOT NULL,
    status text NOT NULL DEFAULT 'draft',
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_career_role_roadmaps_version CHECK (version >= 1),
    CONSTRAINT chk_career_role_roadmaps_version_label CHECK (char_length(trim(version_label)) > 0),
    CONSTRAINT chk_career_role_roadmaps_title CHECK (char_length(trim(title)) >= 3 AND char_length(title) <= 200),
    CONSTRAINT chk_career_role_roadmaps_summary CHECK (char_length(trim(summary)) >= 10),
    CONSTRAINT chk_career_role_roadmaps_status CHECK (status IN ('draft', 'published', 'archived')),
    CONSTRAINT uq_career_role_roadmaps_role_version UNIQUE (career_role_id, version)
);

-- ============================================================
-- 2. CAREER ROLE ROADMAP ITEMS TABLE
-- ============================================================

CREATE TABLE public.career_role_roadmap_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    roadmap_id uuid NOT NULL REFERENCES public.career_role_roadmaps(id) ON DELETE CASCADE,
    stage text NOT NULL,
    skill_name text NOT NULL,
    skill_category text NOT NULL,
    description text NOT NULL,
    why_it_matters text NOT NULL,
    competency_outcome text NOT NULL,
    evidence_examples jsonb NOT NULL DEFAULT '[]'::jsonb,
    display_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_career_role_roadmap_items_stage CHECK (stage IN ('foundation', 'core', 'advanced')),
    CONSTRAINT chk_career_role_roadmap_items_skill_name CHECK (char_length(trim(skill_name)) >= 2 AND char_length(skill_name) <= 120),
    CONSTRAINT chk_career_role_roadmap_items_skill_category CHECK (char_length(trim(skill_category)) >= 2 AND char_length(skill_category) <= 100),
    CONSTRAINT chk_career_role_roadmap_items_description CHECK (char_length(trim(description)) >= 10),
    CONSTRAINT chk_career_role_roadmap_items_why_it_matters CHECK (char_length(trim(why_it_matters)) >= 10),
    CONSTRAINT chk_career_role_roadmap_items_competency_outcome CHECK (char_length(trim(competency_outcome)) >= 10),
    CONSTRAINT chk_career_role_roadmap_items_evidence_array CHECK (jsonb_typeof(evidence_examples) = 'array'),
    CONSTRAINT chk_career_role_roadmap_items_display_order CHECK (display_order >= 0),
    CONSTRAINT uq_career_role_roadmap_items_order UNIQUE (roadmap_id, stage, display_order)
);

-- ============================================================
-- 3. INDEXES
-- ============================================================

CREATE INDEX idx_career_role_roadmaps_role_status
    ON public.career_role_roadmaps (career_role_id, status);

CREATE INDEX idx_career_role_roadmap_items_roadmap_stage_order
    ON public.career_role_roadmap_items (roadmap_id, stage, display_order);

-- ============================================================
-- 4. TRIGGERS
-- ============================================================

CREATE TRIGGER set_career_role_roadmaps_updated_at
    BEFORE UPDATE ON public.career_role_roadmaps
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER set_career_role_roadmap_items_updated_at
    BEFORE UPDATE ON public.career_role_roadmap_items
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- ============================================================
-- 5. ROW LEVEL SECURITY & LEAST-PRIVILEGE GRANTS
-- ============================================================

ALTER TABLE public.career_role_roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_role_roadmap_items ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.career_role_roadmaps
FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON TABLE public.career_role_roadmap_items
FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.career_role_roadmaps
TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.career_role_roadmap_items
TO service_role;

-- ============================================================
-- 6. INITIAL SEED: 6 PUBLISHED LAUNCH ROADMAPS
-- ============================================================

INSERT INTO public.career_role_roadmaps (
    id,
    career_role_id,
    version,
    version_label,
    title,
    summary,
    status,
    created_at,
    updated_at
) VALUES (
    'b1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    1,
    'v1',
    'Frontend Engineering Skill Roadmap',
    'Structured progression from core web standards and modern JavaScript frameworks to high-performance rendering, design systems, and robust client architectures.',
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000001',
    'foundation',
    'Semantic HTML5 & Accessible Markup',
    'Web Standards & Accessibility',
    'Structuring web documents with meaningful semantic elements, hierarchical headings, and WAI-ARIA attributes when standard elements are insufficient.',
    'Accessible, semantic markup supports assistive technology compatibility (WCAG 2.1 AA) and provides the structural basis for search engine crawlers and browser rendering engines.',
    'Can construct valid, accessible multi-page documents with intuitive keyboard navigation, ARIA live regions, and semantic form controls.',
    '["Accessibility audit combining automated checks with keyboard navigation and screen-reader testing","Keyboard-navigable modal dialog and dropdown menu tested with screen readers (NVDA/VoiceOver)","Accessible form implementation featuring real-time inline validation and accessible error announcements"]'::jsonb,
    1,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000002',
    'b1000000-0000-0000-0000-000000000001',
    'foundation',
    'Modern CSS, Responsive Layouts & Tailwind',
    'Styling & Layout Engines',
    'Mastery of Flexbox, CSS Grid, media queries, container queries, custom properties, and utility-first CSS tooling.',
    'Applications must render fluidly across diverse screen form factors without broken layouts, horizontal overflow, or brittle styling overrides.',
    'Can translate Figma designs into pixel-accurate responsive layouts across desktop, tablet, and mobile viewports with zero horizontal clipping.',
    '["Responsive multi-breakpoint dashboard layout with collapsible side navigation","Component library stylesheet utilizing CSS custom properties for light/dark theme switching","Production project demonstrating modern Tailwind CSS utility composition with clean semantic markup"]'::jsonb,
    2,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000003',
    'b1000000-0000-0000-0000-000000000001',
    'foundation',
    'JavaScript Fundamentals & DOM APIs',
    'Core Programming',
    'Deep understanding of modern ES6+ syntax, asynchronous programming (Promises, async/await), event loops, closures, and browser DOM manipulation.',
    'Frameworks come and go, but browser execution mechanics, event delegation, and asynchronous runtime behavior remain fundamental across all frontend platforms.',
    'Can write idiomatic, reliable asynchronous JavaScript to handle DOM events, manage timers, and coordinate network requests without framework abstractions.',
    '["Vanilla JavaScript interactive data table featuring client-side filtering, sorting, and pagination","Custom event bus or observer implementation handling cross-component events","Asynchronous data loader with debounce, throttle, and retry mechanisms"]'::jsonb,
    3,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000004',
    'b1000000-0000-0000-0000-000000000001',
    'foundation',
    'Version Control & Git Workflows',
    'Developer Collaboration',
    'Branch management, pull requests, resolving merge conflicts, interactive rebasing, and conventional commit standards.',
    'Collaborative software engineering requires clean commit hygiene, atomic revisions, and safe rollback capabilities.',
    'Can navigate multi-branch team workflows, write structured pull requests, resolve complex merge conflicts, and review peer contributions constructively.',
    '["Public GitHub repository with meaningful commit messages adhering to Conventional Commits","Documented pull requests containing test evidence, change rationale, and UI screenshots","Demonstrated branching model (GitHub Flow or trunk-based development) across personal projects"]'::jsonb,
    4,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000005',
    'b1000000-0000-0000-0000-000000000001',
    'core',
    'TypeScript for Client Applications',
    'Type Systems & Reliability',
    'Using static typing, generic interfaces, union types, discriminated unions, and utility types to prevent common runtime type errors.',
    'Enterprise frontend codebases depend on TypeScript to maintain strict API contracts, enable safe refactoring, and accelerate developer velocity.',
    'Can model complex UI states, API request/response shapes, and component props with strict type safety and zero reliance on untyped escape hatches.',
    '["Full-scale TypeScript React application configured with strict compiler options (`noImplicitAny: true`)","Generic data table component typed to infer column definitions from arbitrary dataset records","API integration layer with discriminated unions modeling loading, success, and error states"]'::jsonb,
    5,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000006',
    'b1000000-0000-0000-0000-000000000001',
    'core',
    'React Component Architecture & Hooks',
    'Modern Web Frameworks',
    'Designing modular component hierarchies, managing state and lifecycle with custom hooks, and controlling re-render cycles.',
    'React is a widely used modern library for interactive web applications. Idiomatic hook usage and component decomposition help avoid state synchronization bugs.',
    'Can architect modular UI features with decoupled presentation and business logic, leveraging custom hooks for state reuse.',
    '["Reusable custom hooks suite (e.g., `useDebounce`, `useLocalStorage`, `useIntersectionObserver`)","Complex multi-step checkout or intake wizard with unified form state and step validation","Component decomposition showcasing clean separation between container controllers and presentational views"]'::jsonb,
    6,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000007',
    'b1000000-0000-0000-0000-000000000001',
    'core',
    'Client State Management & Data Fetching',
    'State & Cache Management',
    'Managing global client state (Zustand, Context) and server cache synchronization with optimistic mutations, error rollbacks, and revalidation.',
    'Modern SPAs require seamless synchronization between server data and client state, providing snappy responses while gracefully handling connectivity loss.',
    'Can design predictable state flow, prevent duplicate network requests, and implement optimistic updates with automatic rollback on server error.',
    '["Zustand-backed shopping cart or workspace state with local storage persistence and undo/redo history","Optimistic update implementation for a task board where cards move instantly and roll back on failure","Centralized API caching layer implementing deduplication and background cache invalidation"]'::jsonb,
    7,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000008',
    'b1000000-0000-0000-0000-000000000001',
    'core',
    'Automated Frontend Testing (Vitest & Testing Library)',
    'Quality & Test Engineering',
    'Writing unit, integration, and user-centric component tests using Vitest and React Testing Library, avoiding implementation-detail testing.',
    'Thorough component test suites reduce the risk of regression bugs during feature expansions and refactoring cycles, helping maintain robust UI behaviors.',
    'Can write resilient automated tests verifying critical user journeys, asynchronous loading sequences, and error boundary behaviors.',
    '["Automated test suite achieving >80% branch coverage across critical interactive feature modules","Integration tests asserting user interactions using accessible roles and userEvent APIs","Mocked API responses simulating network failures and verifying fallback UI error states"]'::jsonb,
    8,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000009',
    'b1000000-0000-0000-0000-000000000001',
    'core',
    'Modern Bundlers, Tooling & Vite',
    'Build Systems & Tooling',
    'Configuring build pipelines, code splitting, asset optimization, environment variables, and module resolution with Vite/Rollup.',
    'Efficient build tooling can improve local development feedback and optimize production bundle payloads for fast initial load times.',
    'Can configure Vite production builds, analyze bundle visualizers to prune bloated packages, and implement dynamic route-based code splitting.',
    '["Vite configuration with manual chunking strategy reducing initial bundle payload below 200kB","Rollup visualizer report identifying and pruning unused transitive dependencies","Automated CI pipeline compiling production builds and executing lint checks on pull requests"]'::jsonb,
    9,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000010',
    'b1000000-0000-0000-0000-000000000001',
    'advanced',
    'Web Performance & Core Web Vitals Optimization',
    'Performance Engineering',
    'Profiling and optimizing Largest Contentful Paint (LCP), Interaction to Next Paint (INP), and Cumulative Layout Shift (CLS).',
    'Rendering speed and responsive interactions can influence user experience and may affect engagement, conversion, and search-performance outcomes.',
    'Can diagnose performance bottlenecks using Chrome DevTools Performance Profiler, reduce main-thread blocking time, and minimize unexpected layout shifts.',
    '["Case study documenting optimization of LCP from 3.8s to <1.5s via font preloading and image responsive sets","Performance audit reducing long tasks (>50ms) through web workers or time-slicing computations","Implementation of virtualized lists rendering 10,000+ items at 60fps with minimal DOM nodes"]'::jsonb,
    10,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000011',
    'b1000000-0000-0000-0000-000000000001',
    'advanced',
    'Design Systems & Component Governance',
    'Design Systems & Architecture',
    'Architecting enterprise-scale design tokens, headless accessible components, theming engines, and versioned component packages.',
    'Scaling frontend engineering across multiple feature squads requires strict visual consistency, standardized token contracts, and shared components.',
    'Can build and govern a multi-theme design system with accessible primitive components, comprehensive documentation, and semantic token variables.',
    '["Storybook or interactive documentation workspace showcasing a versioned component design system","Token architecture repository defining typography, spacing, and color variables exported for web and mobile","Compound component pattern implementation with full keyboard navigation and context encapsulation"]'::jsonb,
    11,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000012',
    'b1000000-0000-0000-0000-000000000001',
    'advanced',
    'Frontend Security & Client Resilience',
    'Application Security & Resilience',
    'Defending against Cross-Site Scripting (XSS), Cross-Site Request Forgery (CSRF), enforcing Content Security Policy (CSP), and building resilient offline fallbacks.',
    'Client applications process sensitive user credentials and tokens; misconfigurations can lead to session hijacking, data exfiltration, or total service disruption.',
    'Can audit client applications for XSS injection vectors, implement safe sanitization pipelines, enforce strict CSP headers, and configure Service Worker offline caching.',
    '["Security audit writeup reviewing DOM sanitization (DOMPurify) and safe cookie attributes (`HttpOnly`, `SameSite=Lax`)","Service worker implementation caching static assets and gracefully serving offline fallback screens","Comprehensive Error Boundary and telemetry harness catching and reporting unexpected client exceptions"]'::jsonb,
    12,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmaps (
    id,
    career_role_id,
    version,
    version_label,
    title,
    summary,
    status,
    created_at,
    updated_at
) VALUES (
    'b1000000-0000-0000-0000-000000000002',
    'a1000000-0000-0000-0000-000000000002',
    1,
    'v1',
    'Backend Engineering Skill Roadmap',
    'Progression from foundational API protocols and relational data modeling to distributed asynchronous messaging, high-concurrency caching, and resilient system design.',
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000013',
    'b1000000-0000-0000-0000-000000000002',
    'foundation',
    'Server Runtime & Asynchronous I/O (Node.js/TypeScript)',
    'Server Runtimes',
    'Event-driven architecture, non-blocking I/O operations, streams, buffers, and process lifecycles in Node.js with strict TypeScript typing.',
    'Understanding how the Node.js event loop coordinates thread pools and asynchronous operations is essential to building responsive, non-blocking network services.',
    'Can write high-throughput server applications utilizing streams for memory-efficient file transfers and handling concurrent network connections cleanly.',
    '["Stream-based CSV or file processing service processing multi-gigabyte uploads with constant low memory usage","Custom worker thread pool or clustering setup handling CPU-bound cryptographic tasks without blocking HTTP event loop","TypeScript backend service with structured error handling classes and graceful process termination (`SIGTERM`)"]'::jsonb,
    1,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000014',
    'b1000000-0000-0000-0000-000000000002',
    'foundation',
    'Relational Database Modeling & SQL (PostgreSQL)',
    'Data Persistence & Modeling',
    'Designing normalized 3NF schemas, foreign key relationships, cascading rules, transactions (ACID), and writing pure SQL queries.',
    'The relational database is typically the primary source of truth for business data; flawed schema designs cause data corruption, performance bottlenecks, and painful migrations.',
    'Can model complex entity-relationship diagrams, write multi-table joins, enforce constraints at the database tier, and manage schema migrations via version-controlled scripts.',
    '["Normalized multi-table schema for an e-commerce or booking platform with strict foreign keys and check constraints","SQL migration scripts with corresponding idempotency checks, up/down steps, and data backfills","Transactional operations wrapping multiple ledger mutations in strict ACID transactions with rollback capabilities"]'::jsonb,
    2,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000015',
    'b1000000-0000-0000-0000-000000000002',
    'foundation',
    'RESTful API Architecture & HTTP Semantics',
    'API Design & Protocols',
    'Designing clean resource-oriented URLs, accurate HTTP status codes, idempotent methods, request payload validation, and pagination protocols.',
    'APIs are the public contract between client applications and server services; consistent semantics reduce client integration friction and reduce ambiguous failure states.',
    'Can design, document (OpenAPI/Swagger), and build consistent REST APIs with comprehensive input validation and standardized error response envelopes.',
    '["OpenAPI 3.0 specification accompanying a production-grade REST API service","Zod-based request validation middleware rejecting invalid payloads with descriptive HTTP 400 validation error payloads","Cursor-based and offset-based pagination implementation handling large result sets predictably"]'::jsonb,
    3,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000016',
    'b1000000-0000-0000-0000-000000000002',
    'foundation',
    'Linux Environment, Bash & Networking Basics',
    'Operating Systems & Networking',
    'Navigating Linux terminal environments, managing process daemons (systemd), reading logs (journalctl), network port binding, and DNS/TLS foundations.',
    'Many backend workloads run in Linux environments; diagnosing production issues requires familiarity with terminal utilities, file permissions, and TCP/IP sockets.',
    'Can configure local Linux developer environments, write shell automation scripts, inspect network sockets with netstat/curl, and debug process resource utilization.',
    '["Shell automation script deploying applications, performing health checks, and managing log rotations","Configured reverse proxy (Nginx or Caddy) routing SSL traffic to backend application ports","Documented troubleshooting workflow using `top`, `lsof`, `journalctl`, and `curl` to diagnose service failure"]'::jsonb,
    4,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000017',
    'b1000000-0000-0000-0000-000000000002',
    'core',
    'Authentication, Authorization & Role-Based Access Control (RBAC)',
    'Application Security',
    'Implementing JWT verification, OAuth 2.0 flows, session cookies, password hashing (Argon2/bcrypt), and granular role/permission checks.',
    'Flawed authorization is a top security risk (OWASP Broken Object Level Authorization); applications must protect endpoints and data records with strict verification.',
    'Can build secure authentication workflows with short-lived access tokens, refresh token rotation, and robust role-based authorization middleware.',
    '["Express/Fastify authentication middleware validating JWT signatures and attaching verified tenant/role context to requests","Secure password hashing implementation utilizing Argon2id with work factor calibration","Multi-tenant authorization layer enforcing strict row-level isolation between organizational accounts"]'::jsonb,
    5,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000018',
    'b1000000-0000-0000-0000-000000000002',
    'core',
    'Database Indexing & Query Performance Optimization',
    'Database Engineering',
    'Analyzing query execution plans (`EXPLAIN ANALYZE`), indexing strategies (B-Tree, GIN, Partial indexes), and avoiding N+1 query antipatterns.',
    'As datasets grow, poorly indexed queries can trigger expensive scans, increase database load, and contribute to connection-pool pressure.',
',
    'Can inspect query plans, identify sequential scans, create targeted composite and partial indexes, and resolve N+1 queries using dataloaders or batch queries.',
    '["`EXPLAIN ANALYZE` before-and-after comparison showing 100x query time reduction through composite B-tree indexing","Repository implementation using batch fetching to resolve N+1 queries across related entity graphs","Benchmark report illustrating query performance across partitioned or indexed database tables"]'::jsonb,
    6,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000019',
    'b1000000-0000-0000-0000-000000000002',
    'core',
    'Asynchronous Background Jobs & Message Queues',
    'Asynchronous Architecture',
    'Offloading time-consuming tasks (email sending, image processing, webhook delivery) to background worker queues (Redis BullMQ, RabbitMQ, SQS).',
    'HTTP requests should return immediately; blocking API threads during external API calls or PDF generation ruins throughput and causes request timeouts.',
    'Can build background job worker architectures with exponential backoff retries, dead-letter queues (DLQ), and idempotent job handlers.',
    '["Redis-backed queue worker processing email notifications and webhook dispatches with automatic retry logic","Dead-letter queue monitoring mechanism alerting on poison pill jobs and allowing safe manual replays","Idempotent job processing pipeline utilizing unique job deduplication keys"]'::jsonb,
    7,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000020',
    'b1000000-0000-0000-0000-000000000002',
    'core',
    'Automated API Integration & Contract Testing',
    'Testing & Reliability',
    'Writing automated end-to-end API integration tests using Supertest, Vitest, and isolated test database containers.',
    'Manual Postman testing can become difficult to scale; continuous integration must verify database constraints, HTTP status codes, and security rules automatically before merging.',
    'Can build reproducible test suites spinning up ephemeral databases, executing migrations, asserting HTTP contracts, and verifying clean rollbacks.',
    '["Full-coverage Supertest integration test suite asserting authentication, authorization, validation, and error envelopes","Test fixture generator creating realistic mock relational entities for automated test runs","CI test pipeline executing automated migration tests against isolated test database instances"]'::jsonb,
    8,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000021',
    'b1000000-0000-0000-0000-000000000002',
    'core',
    'Containerization & Docker Fundamentals',
    'Application Packaging',
    'Writing multi-stage Dockerfiles, managing container image sizes, defining docker-compose environments for local multi-service development.',
    'Containerization helps improve consistency of runtime dependencies across development, testing, and production environments.',
    'Can package Node.js services into minimal distroless or alpine Docker images and configure multi-container docker-compose environments.',
    '["Multi-stage Dockerfile compiling TypeScript and producing an unprivileged, stripped production container image (<150MB)","Docker Compose setup provisioning application server, PostgreSQL database, and Redis cache with health checks","CI pipeline automatically building, scanning for CVE vulnerabilities (Trivy), and publishing container images"]'::jsonb,
    9,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000022',
    'b1000000-0000-0000-0000-000000000002',
    'advanced',
    'Distributed In-Memory Caching & Cache Invalidation',
    'Scalability & Performance',
    'Implementing Cache-Aside, Write-Through, and Read-Through caching patterns using Redis; managing TTL strategies and cache stampede mitigations.',
    'High-read applications may place significant load on relational databases when every request requires a database query; efficient caching shields databases from peak traffic spikes.',
    'Can design multi-layer caching architectures with probabilistic early expiration, mutex locking against cache stampedes, and deterministic invalidation.',
    '["Cache-aside layer using Redis with probabilistic early expiration algorithm preventing stampedes during high traffic","Distributed rate-limiting middleware using Redis sliding-window algorithms to protect public API endpoints","Benchmark study measuring database load reduction and 99th percentile response time improvements with caching"]'::jsonb,
    10,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000023',
    'b1000000-0000-0000-0000-000000000002',
    'advanced',
    'Distributed Systems & Event-Driven Architecture',
    'Distributed Systems',
    'Designing transactional outboxes, idempotent consumers, saga orchestration, and event-driven communication (Kafka, RabbitMQ).',
    'As systems grow or are divided across service boundaries, event-driven architectures can support decoupled domains and eventual-consistency patterns across services.',
    'Can design event schemas, implement transactional outbox patterns to support reliable message publishing, and handle out-of-order events safely.',
    '["Transactional outbox pattern implementation committing business state and outbox events in a single relational transaction","Event-driven consumer with idempotency keys ensuring duplicate delivery causes zero side effects","Architecture diagram and technical design doc outlining eventual consistency across billing and order services"]'::jsonb,
    11,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000024',
    'b1000000-0000-0000-0000-000000000002',
    'advanced',
    'Observability, Distributed Tracing & SRE Metrics',
    'Site Reliability Engineering',
    'Structured logging (Pino/Winston), OpenTelemetry distributed tracing, Prometheus metrics, and defining Service Level Indicators (SLIs).',
    'Structured logs and distributed trace IDs are important tools for diagnosing production failures.',
    'Can instrument backend services with structured JSON logging, trace context propagation across HTTP/RPC calls, and Prometheus metrics for latency and error rates.',
    '["OpenTelemetry integration passing traceparent headers across HTTP calls with Jaeger trace visualization","Prometheus exporter collecting HTTP request duration histograms, active connection counts, and error rates","Grafana dashboard template graphing p50, p95, and p99 latency against error budget SLO targets"]'::jsonb,
    12,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmaps (
    id,
    career_role_id,
    version,
    version_label,
    title,
    summary,
    status,
    created_at,
    updated_at
) VALUES (
    'b1000000-0000-0000-0000-000000000005',
    'a1000000-0000-0000-0000-000000000005',
    1,
    'v1',
    'Data Analyst Skill Roadmap',
    'Clear progression from descriptive statistics and SQL querying to business metric modeling, interactive dashboard design, and stakeholder storytelling.',
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000025',
    'b1000000-0000-0000-0000-000000000005',
    'foundation',
    'SQL Querying & Data Extraction Foundations',
    'Data Extraction',
    'Writing SQL queries using SELECT, WHERE, GROUP BY, HAVING, basic INNER/LEFT JOINs, and aggregation functions (SUM, AVG, COUNT).',
    'SQL is widely used for querying relational databases and analytical warehouses; analysts must reliably query databases and data warehouses to inspect raw business records.',
    'Can extract, filter, and aggregate multi-table datasets accurately from production and staging analytical databases.',
    '["SQL query portfolio demonstrating multi-table joins, conditional aggregations, and null value handling","Data validation script reconciling raw transaction logs with daily accounting ledger totals","Documented case study extracting customer activity metrics from relational database tables"]'::jsonb,
    1,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000026',
    'b1000000-0000-0000-0000-000000000005',
    'foundation',
    'Spreadsheet Modeling & Data Validation',
    'Spreadsheets & Tabular Data',
    'Advanced spreadsheet formulas (XLOOKUP, INDEX/MATCH), pivot tables, data cleaning, sanity checks, and financial modeling.',
    'Spreadsheets remain ubiquitous across business teams for ad-hoc financial models, rapid prototyping, and cross-team data validation.',
    'Can build audit-ready spreadsheet workbooks with dynamic lookups, automated error checks, and clean formatting for stakeholder review.',
    '["Financial revenue forecast model utilizing dynamic lookups, scenario toggles, and sanity checks","Automated data reconciliation workbook matching inventory lists across disparate retail channels","Spreadsheet dashboard featuring dynamic pivot charts and automated conditional formatting alerts"]'::jsonb,
    2,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000027',
    'b1000000-0000-0000-0000-000000000005',
    'foundation',
    'Descriptive Statistics & Exploratory Metrics',
    'Quantitative Analysis',
    'Understanding mean, median, standard deviation, interquartile ranges, distributions, percentiles, and identifying outliers.',
    'Relying solely on averages hides critical distribution skews and misleading anomalies; analysts must understand statistical distribution shapes.',
    'Can calculate distribution metrics, identify outliers, evaluate skewness, and present variance measures accurately to non-technical stakeholders.',
    '["Exploratory data analysis report evaluating user session durations with percentile breakdowns (p50, p90, p99)","Outlier detection audit detailing treatment of skewed transaction outliers in a marketplace dataset","Statistical summary presentation highlighting difference between average customer spend and median spend"]'::jsonb,
    3,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000028',
    'b1000000-0000-0000-0000-000000000005',
    'core',
    'Advanced SQL, CTEs & Analytical Window Functions',
    'Advanced Querying',
    'Complex data manipulation using Common Table Expressions (CTEs), window functions (ROW_NUMBER, RANK, LAG, LEAD), and recursive queries.',
    'Calculating cohort retention, cumulative running totals, and period-over-period growth rates requires sophisticated windowing without redundant queries.',
    'Can write performant SQL queries computing retention cohorts, rolling averages, month-over-month growth, and ranking metrics across millions of rows.',
    '["Cohort retention analysis query computing 30-day user retention curves using window functions and CTEs","Running total and moving average calculation script tracking customer lifetime value progression","Query optimization writeup refactoring slow nested subqueries into clean indexed CTE pipelines"]'::jsonb,
    4,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000029',
    'b1000000-0000-0000-0000-000000000005',
    'core',
    'Business Intelligence & Interactive Dashboard Design',
    'BI & Data Visualization',
    'Building self-serve business intelligence dashboards (Tableau, Power BI, Looker) with user filters, calculated fields, and visual hierarchy.',
    'Dashboards empower business teams to monitor KPIs independently, freeing analysts from repetitive ad-hoc reporting requests.',
    'Can design intuitive, fast-loading executive dashboards that highlight actionable trends, outliers, and KPI performance against targets.',
    '["Published interactive Tableau/PowerBI dashboard tracking marketing funnel conversions with drill-down filters","Executive KPI scorecard dashboard designed for senior leadership with daily automated refresh","Style guide and usability audit documentation establishing consistent charting standards across team reports"]'::jsonb,
    5,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000030',
    'b1000000-0000-0000-0000-000000000005',
    'core',
    'Python for Data Analysis (Pandas & NumPy)',
    'Programming & Data Wrangling',
    'Data wrangling, transformation, aggregation, and visualization using Python libraries (pandas, numpy, matplotlib, seaborn).',
    'When data transformations exceed SQL capabilities or require statistical transformations and automated scripting, Python is widely used for data analysis and automation.',
    'Can load messy datasets into Pandas DataFrames, perform complex merges and pivots, impute missing values, and output cleaned analytical tables.',
    '["Jupyter notebook documenting exploratory analysis of an open-source churn dataset with Pandas visualizations","Automated Python script parsing, validating, and normalizing disparate third-party partner data exports","GitHub repository featuring modular Python data-cleaning functions accompanied by unit tests"]'::jsonb,
    6,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000031',
    'b1000000-0000-0000-0000-000000000005',
    'core',
    'Data Cleaning, Validation & Anomaly Detection',
    'Data Quality & Hygiene',
    'Detecting data drift, schema mismatches, duplicate records, unmapped categories, and establishing data hygiene guardrails.',
    'Garbage in, garbage out; flawed data inputs destroy organizational trust in reports and can mislead critical operational decisions.',
    'Can implement automated data validation tests, detect pipeline anomalies early, and audit source datasets for completeness and accuracy.',
    '["Automated data audit script asserting primary key uniqueness, null percentages, and expected category ranges","Root cause investigation memo documenting how an upstream logging bug corrupted conversion tracking data","Data dictionary documentation cataloging source table definitions, update cadences, and known caveats"]'::jsonb,
    7,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000032',
    'b1000000-0000-0000-0000-000000000005',
    'advanced',
    'Dimensional Modeling & Star Schema Design',
    'Data Warehouse Architecture',
    'Designing facts, dimensions, slowly changing dimensions (SCD Type 1/2), and star schemas for analytical cloud warehouses (Snowflake, BigQuery).',
    'Normalized operational schemas may be less convenient for some analytical workloads; dimensional modeling can improve analytical query performance and simplify BI reporting.',
    'Can design and document dimensional models (star/snowflake schemas), write transformation dbt models, and manage grain definitions.',
    '["Dimensional model architecture diagram detailing fact sales and customer dimension tables with SCD Type 2 tracking","dbt project repository containing modular transformations, documentation, and schema test assertions","Performance benchmark showing 10x query speedup after refactoring raw tables into curated dimensional datamarts"]'::jsonb,
    8,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000033',
    'b1000000-0000-0000-0000-000000000005',
    'advanced',
    'A/B Testing & Controlled Experimentation',
    'Experimentation & Hypothesis Testing',
    'Sample size calculation, power analysis, p-values, confidence intervals, two-sample hypothesis tests, and avoiding peeking bias.',
    'Product teams test features to determine causal impact; rigorous statistical experimentation helps distinguish observed effects from random variation.',
    'Can calculate minimum required sample sizes, design randomized experiments, analyze test results with statistical rigor, and communicate caveats.',
    '["A/B test experimental design document specifying hypothesis, primary metric, guardrail metrics, and power analysis","Post-experiment statistical evaluation deck demonstrating confidence intervals, p-values, and rollout recommendation","Python script computing required sample size based on baseline conversion rate and minimum detectable effect"]'::jsonb,
    9,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000034',
    'b1000000-0000-0000-0000-000000000005',
    'advanced',
    'Executive Storytelling & Decision Impact Framing',
    'Business Communication',
    'Synthesizing complex technical findings into concise, actionable executive summaries with clear trade-offs, risks, and strategic recommendations.',
    'Analytical insights have the greatest impact when decision-makers understand the conclusions and trust the recommended course of action.',
    'Can present data findings to executive leadership using the Pyramid Principle, answering "so what?" clearly and facilitating strategic alignment.',
    '["Executive presentation deck synthesizing customer retention drivers with concrete budget allocation proposals","One-page decision memo recommending sunset of an underperforming product feature backed by usage data","Recorded presentation or video walkthrough explaining analytical conclusions to a non-technical leadership panel"]'::jsonb,
    10,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmaps (
    id,
    career_role_id,
    version,
    version_label,
    title,
    summary,
    status,
    created_at,
    updated_at
) VALUES (
    'b1000000-0000-0000-0000-000000000008',
    'a1000000-0000-0000-0000-000000000008',
    1,
    'v1',
    'Product Management Skill Roadmap',
    'Progression from customer problem definition and agile execution to data-informed product discovery, cross-functional prioritization, and strategic market positioning.',
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000035',
    'b1000000-0000-0000-0000-000000000008',
    'foundation',
    'User Research & Problem Discovery',
    'Customer Discovery',
    'Conducting user interviews, qualitative discovery, synthesizing customer pain points, and avoiding leading question biases.',
    'Building the wrong feature can waste significant engineering effort; PMs must ground development in genuine, verified customer problems.',
    'Can plan and conduct unbiased user discovery sessions, distill interview notes into customer journey maps, and articulate problem statements.',
    '["User research synthesis report summarizing findings from 10+ customer interviews with pain point affinity mapping","Customer journey map identifying friction points in a user onboarding flow","Documented problem statement brief differentiating core user problems from prescriptive feature requests"]'::jsonb,
    1,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000036',
    'b1000000-0000-0000-0000-000000000008',
    'foundation',
    'Agile Delivery, Sprint Planning & User Stories',
    'Agile Execution',
    'Writing clear user stories with unambiguous acceptance criteria (Gherkin/Given-When-Then), backlog grooming, and sprint facilitation.',
    'Engineering squads require clear, scoped deliverables to ship software reliably on bi-weekly cadence without continuous scope churn.',
    'Can decompose complex initiatives into testable user stories with rigorous acceptance criteria and facilitate efficient agile ceremonies.',
    '["Sprint backlog documentation featuring user stories with explicit Given-When-Then acceptance criteria","Retrospective summary illustrating process improvements adopted by an engineering squad","Sprint breakdown decomposing an epic feature initiative into iterative, shippable increments"]'::jsonb,
    2,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000037',
    'b1000000-0000-0000-0000-000000000008',
    'foundation',
    'Product Metrics & Funnel Analytics',
    'Product Analytics',
    'Defining North Star metrics, input metrics, conversion funnels, retention cohorts, and using analytics tools (Mixpanel, PostHog, Amplitude).',
    'Product decisions must be guided by measurable user behavioral data rather than executive opinions or loudest customer feedback.',
    'Can define measurement trees connecting operational feature metrics to top-line company goals and analyze drop-off in user funnels.',
    '["Metrics measurement framework document defining North Star and input metrics for a feature launch","Funnel analysis case study investigating user drop-off in an activation flow with telemetry event plans","Analytics tracking plan specifying event triggers, properties, and naming conventions for frontend events"]'::jsonb,
    3,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000038',
    'b1000000-0000-0000-0000-000000000008',
    'core',
    'Feature Prioritization Frameworks (RICE, Kano, Cost of Delay)',
    'Roadmapping & Prioritization',
    'Applying objective prioritization frameworks (Reach-Impact-Confidence-Effort, Kano model, Opportunity Scoring) to manage competing roadmap demands.',
    'Engineering capacity is strictly finite; PMs must defend tough trade-off decisions using transparent, defensible rationales.',
    'Can evaluate competing product ideas across effort and impact dimensions, scoring initiatives transparently and managing stakeholder expectations.',
    '["RICE prioritization matrix scoring 15+ candidate product initiatives with justified confidence ratings","Roadmap presentation justifying why certain popular requests were deprioritized in favor of foundational investments","Opportunity solution tree mapping verified user opportunities to candidate solution hypotheses"]'::jsonb,
    4,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000039',
    'b1000000-0000-0000-0000-000000000008',
    'core',
    'Product Requirements Documentation (PRD) & Scoping',
    'Product Definition',
    'Authoring comprehensive PRDs outlining problem background, target personas, non-goals, user flows, technical constraints, and rollout plans.',
    'A thorough PRD aligns designers, engineers, QA, compliance, and marketing teams, serving as the central reference throughout development.',
    'Can produce clear, structured PRDs that clarify scope boundaries, anticipate edge cases, and provide engineering teams with actionable clarity.',
    '["Comprehensive PRD document covering a major feature with non-goals, risk mitigations, and phased rollout stages","Feature scoping workshop artifact showing progressive reduction of an MVP scope to meet delivery milestones","Technical alignment doc resolving edge-case behaviors and security requirements with engineering leads"]'::jsonb,
    5,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000040',
    'b1000000-0000-0000-0000-000000000008',
    'core',
    'Cross-Functional Stakeholder Leadership',
    'Stakeholder Management',
    'Leading without authority across engineering, design, legal, marketing, and sales; facilitating alignment and handling divergent viewpoints.',
    'PMs rarely have managerial authority over teammates; effectiveness often depends heavily on persuasion, empathy, transparent communication, and shared context.',
    'Can navigate conflicting stakeholder priorities, build consensus around strategic goals, and maintain psychological safety within squads.',
    '["Stakeholder RACI matrix for a major cross-departmental initiative","Meeting facilitation notes resolving a deadlock between sales commitments and engineering technical debt","Project retrospective documenting feedback from engineering, design, and business partners"]'::jsonb,
    6,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000041',
    'b1000000-0000-0000-0000-000000000008',
    'core',
    'Go-to-Market (GTM) Strategy & Product Launch',
    'Product Launch & Enablement',
    'Coordinating feature launches with marketing, sales enablement, customer support training, release notes, and canary rollouts.',
    'Shipping code to production is only half the battle; without customer enablement and internal team readiness, feature adoption may be limited.',
    'Can orchestrate cross-functional launch checklists, conduct sales enablement sessions, and manage phased beta rollouts with feedback loops.',
    '["Go-to-Market launch plan detailing pre-launch enablement, beta feedback milestones, and public rollout dates","Customer support training guide and FAQ prepared ahead of a breaking product interface change","Post-launch adoption report evaluating 30-day feature usage against initial business projections"]'::jsonb,
    7,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000042',
    'b1000000-0000-0000-0000-000000000008',
    'advanced',
    'Product Vision, Strategy & Horizon Roadmapping',
    'Strategic Leadership',
    'Crafting multi-year product visions, competitive differentiation strategies, and thematic Now/Next/Later roadmaps aligned with business strategy.',
    'Tactical execution without strategic vision results in a feature factory; senior PMs guide companies toward durable competitive moats.',
    'Can articulate multi-year product horizons, position offerings against competitive threats, and align squad roadmaps to long-term company differentiation.',
    '["Three-year product vision narrative document presenting strategic pillars and market opportunity analysis","Thematic Now/Next/Later roadmap deck presented to executive leadership and board stakeholders","Competitive teardown analyzing competitor strengths, weaknesses, and defensible white-space opportunities"]'::jsonb,
    8,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000043',
    'b1000000-0000-0000-0000-000000000008',
    'advanced',
    'Unit Economics, Pricing & Business Viability',
    'Business Model Strategy',
    'Modeling customer acquisition cost (CAC), lifetime value (LTV), gross margins, pricing tiers, and assessing regulatory and commercial feasibility.',
    'Products must be commercially viable; features that users love but cost more to operate than they generate lead to unsustainable economics.',
    'Can evaluate unit economics, model feature margin impacts, run pricing sensitivity assessments, and support compliance with regulatory standards.',
    '["Financial business case modeling LTV:CAC impact and infrastructure cost projections for an enterprise tier","Pricing and packaging proposal evaluating usage-based vs seat-based subscription tiers","Regulatory compliance audit assessing product readiness for enterprise SOC2 and GDPR requirements"]'::jsonb,
    9,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000044',
    'b1000000-0000-0000-0000-000000000008',
    'advanced',
    'Continuous Discovery & Product Operations Architecture',
    'Product Operations',
    'Instituting continuous customer interviewing rhythms, automated user feedback loops, telemetry governance, and product operations systems.',
    'Scaling product organizations from one to many squads requires consistent operational cadences, shared discovery repositories, and automated feedback triage.',
    'Can build continuous discovery habits across multiple squads, govern customer feedback repositories, and establish standardized product development lifecycles.',
    '["Product development lifecycle (PDLC) playbook adopted by multi-squad product engineering organizations","Centralized customer feedback repository setup categorizing feature requests and bug reports by customer tier","Continuous discovery cadence schedule proving regular weekly customer touchpoints across all squad engineers and designers"]'::jsonb,
    10,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmaps (
    id,
    career_role_id,
    version,
    version_label,
    title,
    summary,
    status,
    created_at,
    updated_at
) VALUES (
    'b1000000-0000-0000-0000-000000000010',
    'a1000000-0000-0000-0000-000000000010',
    1,
    'v1',
    'DevOps & Platform Engineering Skill Roadmap',
    'Structured pathway from Linux systems and container operations to automated CI/CD release pipelines, infrastructure-as-code, and resilient cloud architectures.',
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000045',
    'b1000000-0000-0000-0000-000000000010',
    'foundation',
    'Linux Administration, Storage & Shell Automation',
    'Systems Administration',
    'Managing Linux file permissions, systemd units, process signals, cron jobs, disk partitioning, and writing idempotent Bash scripts.',
    'Many cloud servers, containers, and orchestration nodes run Linux; platform engineers must be comfortable troubleshooting low-level OS behaviors and automating tasks via shell.',
    'Can administer Linux systems, write robust Bash automation scripts with error trapping (`set -euo pipefail`), and configure system services.',
    '["Idempotent Bash provisioning script setting up server hardening baselines with error trapping","Systemd unit file configuration managing a production background service with automated restart policies","Storage maintenance script monitoring disk inode utilization and pruning old log archives automatically"]'::jsonb,
    1,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000046',
    'b1000000-0000-0000-0000-000000000010',
    'foundation',
    'Containerization & Docker Operations',
    'Containerization',
    'Building multi-stage container images, container networking, volumes, daemon configuration, and container security scanners.',
    'Containers are widely used as a packaging and deployment unit in modern cloud environments; inefficient or unhardened container images introduce security and performance liabilities.',
    'Can build secure, minimal Docker images using non-root users, optimize build cache layers, and manage multi-container runtimes.',
    '["Multi-stage Dockerfile achieving minimal image footprint with non-root user execution and cached dependencies","Vulnerability scanning report with zero critical/high CVE findings using Trivy or Grype","Docker Compose multi-service local testing environment replicating cloud services"]'::jsonb,
    2,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000047',
    'b1000000-0000-0000-0000-000000000010',
    'foundation',
    'Networking Protocols, DNS & TLS Fundamentals',
    'Networking & Security',
    'TCP/IP handshake, HTTP/HTTPS headers, TLS certificate lifecycle, DNS record types (A, CNAME, ALIAS, TXT), subnetting, and CIDR blocks.',
    'Cloud infrastructure relies on virtual networks; misconfigured DNS records or subnet masks can cause service outages and routing failures.',
    'Can configure virtual network subnets, manage automated SSL/TLS certificate renewals (Let''s Encrypt/Certbot), and debug DNS propagation issues.',
    '["VPC network architecture diagram detailing public/private subnets, NAT gateways, and CIDR allocations","Automated TLS certificate renewal configuration using Certbot and Let''s Encrypt with DNS challenge verification","Diagnostic log writeup resolving an inter-service communication failure using `tcpdump`, `dig`, and `traceroute`"]'::jsonb,
    3,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000048',
    'b1000000-0000-0000-0000-000000000010',
    'core',
    'CI/CD Pipeline Automation (GitHub Actions / GitLab CI)',
    'Release Engineering',
    'Designing automated pipelines for linting, testing, security scanning, container artifact publishing, and automated canary deployments.',
    'Automated CI/CD can reduce manual deployment errors, enforce quality gates on pull requests, and allow squads to deploy safely multiple times per day.',
    'Can construct maintainable CI/CD pipelines with caching, matrix testing, secret masking, environment protection rules, and automated rollbacks.',
    '["GitHub Actions workflow pipeline executing tests, linting, Docker build, and deployment to staging environments","Reusable CI workflow module enforcing security scanning and dependency auditing across multiple repositories","Automated release pipeline triggering semantic version tagging and generating automated changelog releases"]'::jsonb,
    4,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000049',
    'b1000000-0000-0000-0000-000000000010',
    'core',
    'Infrastructure as Code (Terraform / OpenTofu)',
    'Infrastructure Automation',
    'Declarative infrastructure management, state locking, remote backends (S3/GCS), modularization, and drift detection.',
    'Manual point-and-click cloud console provisioning creates unrepeatable snowflake environments; IaC supports version-controlled and auditable infrastructure management.',
    'Can write reusable Terraform modules, manage remote state with S3/DynamoDB locking, and execute plan/apply cycles safely in automated CI pipelines.',
    '["Terraform module repository provisioning a complete VPC, database cluster, and container service environment","Remote backend configuration with encrypted state storage and state-locking mechanisms","Infrastructure PR showing clean `terraform plan` output with resource tagging standards"]'::jsonb,
    5,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000050',
    'b1000000-0000-0000-0000-000000000010',
    'core',
    'Cloud Infrastructure & IAM Security (AWS / GCP)',
    'Cloud Architecture & IAM',
    'Managing cloud compute (EC2/Cloud Run), managed databases (RDS/Cloud SQL), object storage (S3/GCS), and least-privilege Identity & Access Management (IAM).',
    'Overly permissive IAM roles (e.g., `AdministratorAccess`) are major security liabilities; platform engineers must enforce least-privilege access across all cloud resources.',
    'Can design cloud architectures adhering to the Well-Architected Framework, implementing granular IAM policies and encrypted storage buckets.',
    '["IAM policy definitions adhering to least privilege principles for server execution roles","Secure S3 bucket configuration with server-side encryption (KMS), public access block, and lifecycle policies","Cost optimization audit reducing monthly cloud spend through right-sizing instances and deleting orphan resources"]'::jsonb,
    6,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000051',
    'b1000000-0000-0000-0000-000000000010',
    'core',
    'Kubernetes & Container Orchestration Basics',
    'Container Orchestration',
    'Understanding Pods, Deployments, Services, Ingress, ConfigMaps, Secrets, liveness/readiness probes, and resource requests/limits.',
    'Kubernetes is widely used for running containerized microservices at scale, managing automated rescheduling and rolling updates.',
    'Can deploy stateless applications to Kubernetes clusters using declarative manifests, configure health probes, and establish zero-downtime rolling updates.',
    '["Kubernetes deployment manifest suite with horizontal pod autoscaling (HPA) and resource limits","Ingress controller setup routing traffic with TLS termination to backend services","Troubleshooting case study diagnosing CrashLoopBackOff and OOMKilled pod failures"]'::jsonb,
    7,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000052',
    'b1000000-0000-0000-0000-000000000010',
    'advanced',
    'Site Reliability Engineering (SRE), SLIs & Error Budgets',
    'Site Reliability Engineering',
    'Defining Service Level Objectives (SLOs), Service Level Indicators (SLIs), error budgets, incident post-mortems, and paging on-call rotation frameworks.',
    'Alerting on every minor spike can contribute to on-call fatigue; SRE practices align engineering and business teams on acceptable failure thresholds and proactive alerting.',
    'Can establish multi-window multi-burn-rate alerting rules, define actionable SLIs for service reliability, and facilitate blameless post-mortem investigations.',
    '["SRE Service Level Objective document defining availability and latency SLIs alongside alerting thresholds","Blameless post-mortem report analyzing a simulated outage with root cause analysis and preventative remediation tickets","Prometheus alerting rule configuration alerting on burn-rate spikes rather than raw threshold breaches"]'::jsonb,
    8,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000053',
    'b1000000-0000-0000-0000-000000000010',
    'advanced',
    'DevSecOps, Secret Management & Zero-Trust Architecture',
    'Platform Security',
    'HashiCorp Vault secret injection, cloud secret managers, automated SAST/DAST pipeline gates, software bill of materials (SBOM), and container signing.',
    ''Hardcoded secrets and unreviewed third-party dependencies can create significant security risk; security controls can be integrated across delivery pipeline stages to reduce exposure.'',
    'Can configure automated secret rotation, inject credentials into containers dynamically without disk writes, and enforce automated supply chain validation.',
    '["HashiCorp Vault or AWS Secrets Manager dynamic credential injection setup for application services","CI pipeline enforcing container image signing (Cosign) and SBOM generation (Syft)","Automated SAST and dependency scanning gate blocking pull requests introducing high-severity CVEs"]'::jsonb,
    9,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000054',
    'b1000000-0000-0000-0000-000000000010',
    'advanced',
    'Disaster Recovery, Multi-Region Resilience & Chaos Engineering',
    'Resilience Engineering',
    'Recovery Time Objective (RTO), Recovery Point Objective (RPO), cross-region database replication, automated failover, and chaos injection (Chaos Mesh).',
    'Cloud environments can experience regional or availability-zone disruptions; critical applications benefit from tested recovery procedures and clearly defined recovery objectives.',
    'Can architect active-passive or active-active multi-region failover configurations, conduct simulated disaster recovery drills, and verify RTO/RPO limits.',
    '["Disaster Recovery runbook detailing step-by-step failover execution with tested RTO < 15 minutes","Automated backup and restore verification pipeline restoring PostgreSQL snapshots to ephemeral test databases daily","Chaos engineering experiment report verifying system resilience under simulated network latency and node crashes"]'::jsonb,
    10,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmaps (
    id,
    career_role_id,
    version,
    version_label,
    title,
    summary,
    status,
    created_at,
    updated_at
) VALUES (
    'b1000000-0000-0000-0000-000000000012',
    'a1000000-0000-0000-0000-000000000012',
    1,
    'v1',
    'Cybersecurity Analyst Skill Roadmap',
    'Progression from security baseline hygiene and network packet inspection to active threat hunting, incident triage playbooks, and regulatory audit compliance.',
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000055',
    'b1000000-0000-0000-0000-000000000012',
    'foundation',
    'Network Protocols & Packet Analysis (Wireshark)',
    'Network Defense',
    'Deep understanding of OSI model layers, TCP/UDP port behaviors, DNS queries, packet capturing, and analyzing network anomalies using Wireshark.',
    'Some attacks and data-exfiltration activity can produce observable network traffic; packet analysis can help analysts investigate suspicious communications and network anomalies.',
    'Can capture and dissect network packets, identify suspicious port scans, detect plaintext credential transmissions, and filter protocol anomalies.',
    '["Wireshark packet capture analysis report identifying suspicious DNS tunneling and beaconing patterns","Network diagram documenting perimeter firewall rules, DMZ segmentation, and allowed traffic flows","Lab writeup demonstrating detection of ARP spoofing and MITM attacks in an isolated test environment"]'::jsonb,
    1,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000056',
    'b1000000-0000-0000-0000-000000000012',
    'foundation',
    'Operating System Hardening & Access Controls',
    'Host Security',
    'Hardening Windows and Linux operating systems according to CIS Benchmarks, configuring local firewall rules, disabling unnecessary daemons, and enforcing PAM.',
    'Default operating system installations may expose services or settings that are not required for a particular workload, increasing attack surface if they are not reviewed and hardened.',
    'Can audit and harden Windows Server and Linux hosts against CIS benchmark baselines and enforce least-privilege administrative access controls.',
    '["Host hardening audit report benchmarked against CIS Level 1 baseline standards","Ansible or Bash hardening playbook automating SSH key-only access and firewall configurations","Windows Group Policy Object (GPO) configuration enforcing account lockout and audit logging"]'::jsonb,
    2,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000057',
    'b1000000-0000-0000-0000-000000000012',
    'foundation',
    'Threat Landscape & Vulnerability Classes (CVE / CVSS)',
    'Security Fundamentals',
    'Understanding Common Vulnerabilities and Exposures (CVE), Common Vulnerability Scoring System (CVSS v3.1), and MITRE ATT&CK adversary tactics.',
    'Analysts must triage vulnerabilities effectively based on exploitability and business impact rather than reacting randomly to every disclosure.',
    'Can evaluate CVSS metrics, map adversary techniques to MITRE ATT&CK tactics, and prioritize vulnerability patching based on threat intelligence.',
    '["Vulnerability risk assessment memo analyzing a zero-day disclosure with customized CVSS environmental scoring","Threat analysis report mapping a phishing campaign to specific MITRE ATT&CK adversary techniques","Presentation deck explaining how software supply chain attacks occur and how to inspect dependencies"]'::jsonb,
    3,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000058',
    'b1000000-0000-0000-0000-000000000012',
    'core',
    'SIEM Log Correlation & Detection Engineering (Splunk / Elastic)',
    'Security Monitoring',
    'Ingesting disparate logs (firewalls, endpoints, auth), writing correlation rules (Splunk SPL, Elastic KQL, Sigma rules), and tuning false positives.',
    'Modern enterprise environments can generate large volumes of logs; Security Operations Centers commonly use correlation and detection rules to help surface suspicious activity from operational noise.',
    'Can write correlation queries that detect suspicious lateral movement, credential dumping, and brute force attempts while maintaining low false-positive rates.',
    '["Custom Sigma detection rule detecting suspicious PowerShell encoded execution across endpoint logs","Splunk or Elastic dashboard tracking failed authentication spikes and privilege escalation attempts","Rule tuning memo demonstrating how alert noise was reduced by 70% without sacrificing detection coverage"]'::jsonb,
    4,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000059',
    'b1000000-0000-0000-0000-000000000012',
    'core',
    'Vulnerability Management & Remediation Tracking',
    'Vulnerability Management',
    'Operating vulnerability scanners (Nessus, Qualys), interpreting scan reports, coordinating patch cycles with IT squads, and tracking remediation SLAs.',
    'Unpatched known vulnerabilities can significantly increase operational risk; rigorous remediation tracking supports timely mitigation.',
    'Can execute credentialed vulnerability scans, filter scanner false positives, and coordinate prioritized remediation roadmaps with infrastructure teams.',
    '["Enterprise vulnerability assessment executive report highlighting critical findings and remediation timetables","Vulnerability tracking dashboard monitoring team remediation velocity against organizational 30-day SLAs","Remediation guide detailing verification testing steps for patched Apache/OpenSSL vulnerabilities"]'::jsonb,
    5,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000060',
    'b1000000-0000-0000-0000-000000000012',
    'core',
    'Incident Response, Containment & Forensic Triage',
    'Incident Handling',
    'Following NIST SP 800-61 / SANS incident response phases: Preparation, Identification, Containment, Eradication, Recovery, and Lessons Learned.',
    'When an active compromise occurs, uncoordinated response actions can damage forensic evidence and delay threat containment.',
    'Can execute standard incident triage playbooks, isolate compromised hosts, collect volatile memory artifacts, and author post-incident reports.',
    '["Incident Response Playbook detailing isolation procedures for compromised active directory credentials","Post-incident review report documenting timeline, attack path, containment actions, and corrective security tickets","Tabletop exercise scenario document facilitating a ransomware simulation across executive stakeholders"]'::jsonb,
    6,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000061',
    'b1000000-0000-0000-0000-000000000012',
    'core',
    'Web Application Security & OWASP Top 10',
    'Application Security',
    'Identifying and verifying web security flaws: SQL injection, Cross-Site Scripting (XSS), Server-Side Request Forgery (SSRF), and broken access controls.',
    'Public web portals represent primary external entry points into corporate databases and cloud workloads; securing application layers is paramount.',
    'Can audit web applications against OWASP Top 10 risks using intercepting proxies (Burp Suite/OWASP ZAP) and verify safe input sanitization and token handling.',
    '["Web application security assessment report identifying and reproducing simulated OWASP Top 10 vulnerabilities","Burp Suite assessment log verifying remediation of an IDOR (Insecure Direct Object Reference) flaw","Secure coding recommendation document provided to frontend and backend engineering squads"]'::jsonb,
    7,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000062',
    'b1000000-0000-0000-0000-000000000012',
    'advanced',
    'Proactive Threat Hunting & Threat Intelligence',
    'Threat Intelligence',
    'Formulating threat hypotheses, operationalizing Indicators of Compromise (IOCs) and Tactics, Techniques, and Procedures (TTPs), and hunting anomalous host activity.',
    'Advanced threats may bypass preventive controls such as antivirus and perimeter defenses; proactive threat hunting can help identify suspicious activity that automated controls may not surface.',
    'Can formulate intelligence-led threat hypotheses, query telemetry endpoints for stealthy persistence mechanisms, and document novel threat detections.',
    '["Threat hunting campaign documentation detailing hypothesis, query logic, data sources, and findings","Threat intelligence brief synthesizing active ransomware actor TTPs targeting sector companies","YARA rule suite detecting proprietary malware staging artifacts on Windows hosts"]'::jsonb,
    8,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000063',
    'b1000000-0000-0000-0000-000000000012',
    'advanced',
    'Security Compliance, Governance & Audit Frameworks',
    'Governance, Risk & Compliance (GRC)',
    'Mapping controls to regulatory frameworks (ISO 27001, SOC 2 Type II, NIST CSF, GDPR, Cyber Essentials) and preparing audit evidence.',
    'Customers, auditors, regulators, and business partners may require evidence of security and privacy controls; failure to meet applicable obligations can create regulatory, contractual, or commercial risk.',
    'Can map technical controls to ISO 27001 and SOC 2 criteria, prepare audit evidence packages, and draft security governance policies.',
    '["SOC 2 Type II readiness assessment report mapping AWS cloud controls to Trust Services Criteria","Information Security Policy document establishing organization-wide data classification and acceptable use rules","Third-party vendor risk assessment questionnaire evaluating partner supply chain security postures"]'::jsonb,
    9,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_role_roadmap_items (
    id,
    roadmap_id,
    stage,
    skill_name,
    skill_category,
    description,
    why_it_matters,
    competency_outcome,
    evidence_examples,
    display_order,
    created_at,
    updated_at
) VALUES (
    'c1000000-0000-0000-0000-000000000064',
    'b1000000-0000-0000-0000-000000000012',
    'advanced',
    'Security Orchestration, Automation & Response (SOAR)',
    'Security Automation',
    'Writing automated incident response playbooks (Python, SOAR platforms) to enrich alerts, isolate infected hosts, and revoke compromised tokens automatically.',
    'Manual alert triage can become difficult to scale as alert volumes and threat activity increase; automating repetitive triage and selected containment actions can reduce Mean Time to Remediate (MTTR).',
    'Can develop Python automation scripts integrating SIEM alerts, virus threat intelligence APIs (VirusTotal/AbuseIPDB), and automated firewall quarantine actions.',
    '["Python SOAR automation script automatically querying IP reputation APIs and adding malicious IPs to firewall blocklists","Automated phishing triage bot extracting URLs from user-reported emails and scanning attachments in sandboxes","Webhook integration triggering automated credential revoking and session invalidation upon high-risk login alerts"]'::jsonb,
    10,
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

COMMIT;
