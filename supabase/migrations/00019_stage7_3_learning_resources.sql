-- =========================================================================
-- QWERTY Stage 7.3 — Career Learning Resources Migration
-- Migration: 00019_stage7_3_learning_resources.sql
-- Status: PREPARED — DO NOT DEPLOY AUTOMATICALLY
--
-- Governed Curated Educational Resources for Career Role Skill Roadmaps.
-- Zero AI runtime calls. Zero salary speculation. Zero course ranking/affiliates.
-- Server-mediated access model with least-privilege security.
-- =========================================================================

BEGIN;

-- =========================================================================
-- 1. CREATE TABLE
-- =========================================================================

CREATE TABLE public.career_learning_resources (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    roadmap_item_id uuid NOT NULL
        REFERENCES public.career_role_roadmap_items(id)
        ON DELETE RESTRICT,

    title text NOT NULL,
    provider_name text NOT NULL,
    resource_type text NOT NULL,
    url text NOT NULL,
    description text NOT NULL,

    access_type text NOT NULL DEFAULT 'free',
    difficulty text,
    display_order integer NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'draft',

    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_career_learning_resources_title
        CHECK (
            char_length(trim(title)) > 0
            AND char_length(title) <= 255
        ),

    CONSTRAINT chk_career_learning_resources_provider_name
        CHECK (
            char_length(trim(provider_name)) > 0
            AND char_length(provider_name) <= 150
        ),

    CONSTRAINT chk_career_learning_resources_resource_type
        CHECK (
            resource_type IN (
                'documentation',
                'guide',
                'article',
                'video',
                'lab',
                'practice',
                'standard',
                'reference'
            )
        ),

    CONSTRAINT chk_career_learning_resources_url
    CHECK (
        url ~* '^https://[a-zA-Z0-9.-]+(/.*)?$'
        AND url !~* '\s'
    ),

    CONSTRAINT chk_career_learning_resources_description
        CHECK (
            char_length(trim(description)) > 0
            AND char_length(description) <= 2000
        ),

    CONSTRAINT chk_career_learning_resources_access_type
        CHECK (
            access_type IN (
                'free',
                'free_account_required'
            )
        ),

    CONSTRAINT chk_career_learning_resources_difficulty
        CHECK (
            difficulty IS NULL
            OR difficulty IN (
                'foundation',
                'core',
                'advanced'
            )
        ),

    CONSTRAINT chk_career_learning_resources_display_order
        CHECK (display_order >= 0),

    CONSTRAINT chk_career_learning_resources_status
        CHECK (
            status IN (
                'draft',
                'published',
                'archived'
            )
        ),

    CONSTRAINT uq_career_learning_resources_item_order
        UNIQUE (roadmap_item_id, display_order)
);

-- =========================================================================
-- 2. INDEXES
-- =========================================================================

CREATE INDEX idx_career_learning_resources_item_status_order
    ON public.career_learning_resources (
        roadmap_item_id,
        status,
        display_order
    );

CREATE INDEX idx_career_learning_resources_status
    ON public.career_learning_resources (status);

-- =========================================================================
-- 3. UPDATED_AT TRIGGER
-- =========================================================================

CREATE TRIGGER set_career_learning_resources_updated_at
    BEFORE UPDATE ON public.career_learning_resources
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- =========================================================================
-- 4. RLS & LEAST-PRIVILEGE GRANTS
-- =========================================================================

ALTER TABLE public.career_learning_resources
    ENABLE ROW LEVEL SECURITY;

REVOKE ALL
ON TABLE public.career_learning_resources
FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.career_learning_resources
TO service_role;

-- =========================================================================
-- 5. CURATED LAUNCH SEED DATA
-- Exactly 47 resources across 6 launch roadmaps
-- =========================================================================


-- =========================================================================
-- FRONTEND ENGINEER
-- Roadmap: b1000000-0000-0000-0000-000000000001
-- =========================================================================

-- Skill 1: Semantic HTML5 & Accessible Markup
INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000001',
    'MDN Web Docs — HTML: HyperText Markup Language',
    'MDN Web Docs',
    'documentation',
    'https://developer.mozilla.org/en-US/docs/Web/HTML',
    'Comprehensive reference and guides covering semantic elements, document structures, and web standards.',
    'free',
    'foundation',
    1,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000002',
    'c1000000-0000-0000-0000-000000000001',
    'W3C Web Accessibility Initiative (WAI) — Accessibility Fundamentals',
    'W3C WAI',
    'standard',
    'https://www.w3.org/WAI/fundamentals/accessibility-intro/',
    'Official introduction to accessibility standards, WCAG guidelines, and inclusive digital design.',
    'free',
    'foundation',
    2,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000003',
    'c1000000-0000-0000-0000-000000000001',
    'WebAIM — Keyboard Accessibility Techniques',
    'WebAIM',
    'guide',
    'https://webaim.org/techniques/keyboard/',
    'Practical guidance for designing focus indicators, tabindex navigation, and keyboard-operable controls.',
    'free',
    'foundation',
    3,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

-- Skill 5: TypeScript for Client Applications
INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000004',
    'c1000000-0000-0000-0000-000000000005',
    'TypeScript Official Handbook',
    'Microsoft',
    'documentation',
    'https://www.typescriptlang.org/docs/handbook/intro.html',
    'Official guide to TypeScript types, interfaces, generics, utility types, and compiler configuration.',
    'free',
    'core',
    1,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000005',
    'c1000000-0000-0000-0000-000000000005',
    'Total TypeScript — Beginners TypeScript Tutorial',
    'Total TypeScript',
    'guide',
    'https://www.totaltypescript.com/tutorials',
    'Interactive exercises covering essential type-system patterns, generic constraints, and component typing.',
    'free',
    'core',
    2,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

-- Skill 6: React Component Architecture & Hooks
INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000006',
    'c1000000-0000-0000-0000-000000000006',
    'React Documentation — Describing the UI & Managing State',
    'React Team',
    'documentation',
    'https://react.dev/learn',
    'Official core guide to component lifecycles, pure rendering, hooks state flow, and effect synchronization.',
    'free',
    'core',
    1,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000007',
    'c1000000-0000-0000-0000-000000000006',
    'React Documentation — Built-in React Hooks Reference',
    'React Team',
    'reference',
    'https://react.dev/reference/react/hooks',
    'Technical API reference for useState, useEffect, useMemo, useCallback, and useRef.',
    'free',
    'core',
    2,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

-- Skill 10: Web Performance & Core Web Vitals Optimization
INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000008',
    'c1000000-0000-0000-0000-000000000010',
    'web.dev — Learn Core Web Vitals',
    'Google Chrome',
    'guide',
    'https://web.dev/explore/learn-core-web-vitals',
    'Detailed technical guides to profiling and optimizing LCP, INP, and CLS performance metrics.',
    'free',
    'advanced',
    1,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000009',
    'c1000000-0000-0000-0000-000000000010',
    'Chrome DevTools — Analyze Runtime Performance',
    'Chrome for Developers',
    'documentation',
    'https://developer.chrome.com/docs/devtools/performance',
    'Practical guide to recording CPU profiles, finding long tasks, and diagnosing layout shifts.',
    'free',
    'advanced',
    2,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000010',
    'c1000000-0000-0000-0000-000000000010',
    'MDN Web Docs — Web Performance Overview',
    'MDN Web Docs',
    'reference',
    'https://developer.mozilla.org/en-US/docs/Web/Performance',
    'Reference material covering the Navigation Timing API, Resource Timing API, and browser rendering pipeline.',
    'free',
    'advanced',
    3,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);


-- =========================================================================
-- BACKEND ENGINEER
-- Roadmap: b1000000-0000-0000-0000-000000000002
-- =========================================================================

-- Skill 14: Relational Database Modeling & SQL
INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000011',
    'c1000000-0000-0000-0000-000000000014',
    'PostgreSQL Official Documentation — Tutorial & SQL Language',
    'PostgreSQL Global Development Group',
    'documentation',
    'https://www.postgresql.org/docs/current/tutorial-sql.html',
    'Official introduction to relational data concepts, tables, schemas, constraints, and data querying.',
    'free',
    'foundation',
    1,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000012',
    'c1000000-0000-0000-0000-000000000014',
    'PGExercises — Interactive PostgreSQL Practice',
    'PGExercises',
    'practice',
    'https://pgexercises.com/',
    'Hands-on browser-based SQL exercises covering joins, aggregations, subqueries, and table modifications.',
    'free',
    'foundation',
    2,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

-- Skill 15: RESTful API Architecture & HTTP Semantics
INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000013',
    'c1000000-0000-0000-0000-000000000015',
    'MDN Web Docs — An Overview of HTTP',
    'MDN Web Docs',
    'documentation',
    'https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview',
    'Architectural overview of client-server requests, headers, status codes, and HTTP protocol semantics.',
    'free',
    'foundation',
    1,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000014',
    'c1000000-0000-0000-0000-000000000015',
    'MDN Web Docs — HTTP Request Methods',
    'MDN Web Docs',
    'reference',
    'https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods',
    'Detailed reference covering safe, idempotent, and cacheable HTTP verbs (GET, POST, PUT, PATCH, DELETE).',
    'free',
    'foundation',
    2,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

-- Skill 17: Authentication, Authorization & RBAC
INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000015',
    'c1000000-0000-0000-0000-000000000017',
    'OWASP — Authentication Cheat Sheet',
    'OWASP',
    'standard',
    'https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html',
    'Standard security guidelines for credential storage, session management, and brute-force mitigation.',
    'free',
    'core',
    1,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000016',
    'c1000000-0000-0000-0000-000000000017',
    'OWASP — Authorization Cheat Sheet',
    'OWASP',
    'standard',
    'https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html',
    'Design guidance on role-based access control, resource-level permissions, and preventing privilege escalation.',
    'free',
    'core',
    2,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

-- Skill 23: Distributed Systems & Event-Driven Architecture
INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000017',
    'c1000000-0000-0000-0000-000000000023',
    'Azure Architecture Center — Event-Driven Architecture Style',
    'Microsoft Learn',
    'reference',
    'https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/event-driven',
    'Architectural overview of producer-consumer patterns, brokers, event streams, and eventual consistency.',
    'free',
    'advanced',
    1,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000018',
    'c1000000-0000-0000-0000-000000000023',
    'Martin Fowler — What do you mean by "Event-Driven"?',
    'Martin Fowler',
    'article',
    'https://martinfowler.com/articles/201701-event-driven.html',
    'Conceptual breakdown analyzing event notification, event-carried state transfer, event sourcing, and CQRS.',
    'free',
    'advanced',
    2,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);


-- =========================================================================
-- DATA ANALYST
-- Roadmap: b1000000-0000-0000-0000-000000000005
-- =========================================================================

-- Skill 25: SQL Querying & Data Extraction Foundations
INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000019',
    'c1000000-0000-0000-0000-000000000025',
    'Mode Analytics — SQL Tutorial for Data Analysis',
    'Mode Analytics',
    'guide',
    'https://mode.com/sql-tutorial/',
    'Structured course covering relational querying, aggregations, multi-table joins, and data extraction workflows.',
    'free',
    'foundation',
    1,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000020',
    'c1000000-0000-0000-0000-000000000025',
    'SQLBolt — Interactive SQL Lessons',
    'SQLBolt',
    'practice',
    'https://sqlbolt.com/',
    'Interactive in-browser lessons with hands-on exercises for mastering SQL syntax and query formulation.',
    'free',
    'foundation',
    2,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

-- Skill 30: Python for Data Analysis
INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000021',
    'c1000000-0000-0000-0000-000000000030',
    'Python Software Foundation — The Python Tutorial',
    'Python Software Foundation',
    'documentation',
    'https://docs.python.org/3/tutorial/',
    'Official introduction to Python data structures, control flow, functions, modules, and error handling.',
    'free',
    'core',
    1,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000022',
    'c1000000-0000-0000-0000-000000000030',
    'pandas Documentation — 10 Minutes to pandas',
    'pandas Development Team',
    'guide',
    'https://pandas.pydata.org/docs/user_guide/10min.html',
    'Short introduction to pandas Series, DataFrames, indexing, grouping, and basic data transformations.',
    'free',
    'core',
    2,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000023',
    'c1000000-0000-0000-0000-000000000030',
    'NumPy Documentation — NumPy Basics for Beginners',
    'NumPy Developers',
    'guide',
    'https://numpy.org/doc/stable/user/absolute_beginners.html',
    'Foundational guide to multidimensional arrays, indexing, slicing, vectorization, and mathematical routines.',
    'free',
    'core',
    3,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

-- Skill 33: A/B Testing & Controlled Experimentation
INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000024',
    'c1000000-0000-0000-0000-000000000033',
    'SciPy Documentation — Statistical Functions (scipy.stats)',
    'SciPy Community',
    'documentation',
    'https://docs.scipy.org/doc/scipy/reference/stats.html',
    'Reference guide for continuous/discrete distributions, two-sample hypothesis tests, p-values, and power.',
    'free',
    'advanced',
    1,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000025',
    'c1000000-0000-0000-0000-000000000033',
    'NIST/SEMATECH e-Handbook of Statistical Methods — Hypothesis Testing',
    'National Institute of Standards and Technology',
    'reference',
    'https://www.itl.nist.gov/div898/handbook/prc/section1/prc13.htm',
    'Authoritative government handbook explaining hypothesis formulation, significance levels, and error risks.',
    'free',
    'advanced',
    2,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);


-- =========================================================================
-- PRODUCT MANAGER
-- Roadmap: b1000000-0000-0000-0000-000000000008
-- =========================================================================

-- Skill 35: User Research & Problem Discovery
INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000026',
    'c1000000-0000-0000-0000-000000000035',
    'Nielsen Norman Group — User Interviews: How, When, and Why',
    'Nielsen Norman Group',
    'article',
    'https://www.nngroup.com/articles/user-interviews/',
    'Methodology for planning customer discovery sessions, asking open-ended questions, and extracting insights.',
    'free',
    'foundation',
    1,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000027',
    'c1000000-0000-0000-0000-000000000035',
    'Interaction Design Foundation — Conducting User Research',
    'Interaction Design Foundation',
    'guide',
    'https://www.interaction-design.org/literature/article/user-research-what-it-is-and-why-you-should-do-it',
    'Overview of qualitative discovery methods, user empathy mapping, and identifying genuine pain points.',
    'free',
    'foundation',
    2,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

-- Skill 38: Feature Prioritization Frameworks
INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000028',
    'c1000000-0000-0000-0000-000000000038',
    'Intercom Product Blog — RICE: Simple Prioritization for Product Managers',
    'Intercom',
    'article',
    'https://www.intercom.com/blog/rice-simple-prioritization-for-product-managers/',
    'Detailed explanation of the Reach, Impact, Confidence, and Effort prioritization scoring model.',
    'free',
    'core',
    1,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000029',
    'c1000000-0000-0000-0000-000000000038',
    'Mind the Product — A Practical Guide to Prioritisation',
    'Mind the Product',
    'guide',
    'https://www.mindtheproduct.com/how-to-prioritise/',
    'Comparative overview of feature prioritization methodologies including Kano, value vs complexity, and Cost of Delay.',
    'free',
    'core',
    2,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

-- Skill 42: Product Vision, Strategy & Horizon Roadmapping
INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000030',
    'c1000000-0000-0000-0000-000000000042',
    'Silicon Valley Product Group — Product Strategy Overview',
    'SVPG',
    'article',
    'https://www.svpg.com/product-strategy-overview/',
    'Strategic guidance on focusing team effort, selecting problem spaces, and defining product vision.',
    'free',
    'advanced',
    1,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000031',
    'c1000000-0000-0000-0000-000000000042',
    'Roman Pichler — Outcome-Based Product Roadmapping',
    'Roman Pichler',
    'guide',
    'https://www.romanpichler.com/blog/how-to-choose-the-right-product-roadmap-format/',
    'Techniques for building outcome-focused product roadmaps that align stakeholders on goals rather than feature lists.',
    'free',
    'advanced',
    2,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);


-- =========================================================================
-- DEVOPS & PLATFORM ENGINEER
-- Roadmap: b1000000-0000-0000-0000-000000000010
-- =========================================================================

-- Skill 46: Containerization & Docker Operations
INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000032',
    'c1000000-0000-0000-0000-000000000046',
    'Docker Documentation — Getting Started with Docker',
    'Docker',
    'documentation',
    'https://docs.docker.com/get-started/',
    'Official introduction to container concepts, building images, running containers, and port mapping.',
    'free',
    'foundation',
    1,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000033',
    'c1000000-0000-0000-0000-000000000046',
    'Docker Documentation — Multi-Stage Builds',
    'Docker',
    'reference',
    'https://docs.docker.com/build/building/multi-stage/',
    'Best practices for optimizing image size, caching build steps, and separating build and runtime environments.',
    'free',
    'foundation',
    2,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

-- Skill 48: CI/CD Pipeline Automation
INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000034',
    'c1000000-0000-0000-0000-000000000048',
    'GitHub Docs — Understanding GitHub Actions',
    'GitHub',
    'documentation',
    'https://docs.github.com/en/actions/learn-github-actions/understanding-github-actions',
    'Official reference for workflows, jobs, steps, runners, event triggers, and environment variables.',
    'free',
    'core',
    1,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000035',
    'c1000000-0000-0000-0000-000000000048',
    'GitHub Docs — Security Hardening for GitHub Actions',
    'GitHub',
    'guide',
    'https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions',
    'Security guidance on token permissions, third-party action pinning, and secret masking.',
    'free',
    'core',
    2,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

-- Skill 49: Infrastructure as Code
INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000036',
    'c1000000-0000-0000-0000-000000000049',
    'HashiCorp Developer — Terraform Documentation & Tutorials',
    'HashiCorp',
    'documentation',
    'https://developer.hashicorp.com/terraform/docs',
    'Official reference for declarative HCL syntax, resource definitions, variables, and state management.',
    'free',
    'core',
    1,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000037',
    'c1000000-0000-0000-0000-000000000049',
    'OpenTofu Official Documentation',
    'OpenTofu',
    'documentation',
    'https://opentofu.org/docs/',
    'Open-source infrastructure-as-code documentation detailing CLI usage, modules, and providers.',
    'free',
    'core',
    2,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

-- Skill 52: Site Reliability Engineering
INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000038',
    'c1000000-0000-0000-0000-000000000052',
    'Google SRE Book — Service Level Objectives',
    'Google SRE',
    'reference',
    'https://sre.google/sre-book/service-level-objectives/',
    'Foundational text on defining SLIs, setting realistic SLO targets, and managing team error budgets.',
    'free',
    'advanced',
    1,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000039',
    'c1000000-0000-0000-0000-000000000052',
    'Google SRE Workbook — Implementing SLOs',
    'Google SRE',
    'guide',
    'https://sre.google/workbook/implementing-slos/',
    'Practical workbook with actionable examples for calculating burn rates and structuring paging rules.',
    'free',
    'advanced',
    2,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);


-- =========================================================================
-- CYBERSECURITY ANALYST
-- Roadmap: b1000000-0000-0000-0000-000000000012
-- =========================================================================

-- Skill 55: Network Protocols & Packet Analysis
INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000040',
    'c1000000-0000-0000-0000-000000000055',
    'Wireshark Foundation — Wireshark User Guide',
    'Wireshark Foundation',
    'documentation',
    'https://www.wireshark.org/docs/wsug_html_chunked/',
    'Complete user guide for capturing network interfaces, filtering packets, and inspecting protocols.',
    'free',
    'foundation',
    1,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000041',
    'c1000000-0000-0000-0000-000000000055',
    'IETF — RFC 9293: Transmission Control Protocol (TCP)',
    'Internet Engineering Task Force',
    'standard',
    'https://datatracker.ietf.org/doc/html/rfc9293',
    'Official internet standard specification of the Transmission Control Protocol architecture and state machine.',
    'free',
    'foundation',
    2,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

-- Skill 60: Incident Response
INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000042',
    'c1000000-0000-0000-0000-000000000060',
    'NIST — SP 800-61 Rev. 2: Computer Security Incident Handling Guide',
    'NIST',
    'standard',
    'https://csrc.nist.gov/publications/detail/sp/800-61/rev-2/final',
    'Authoritative national guidelines on structuring incident response phases, containment, and post-mortems.',
    'free',
    'core',
    1,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000043',
    'c1000000-0000-0000-0000-000000000060',
    'CISA — Federal Incident Response Playbooks',
    'CISA',
    'guide',
    'https://www.cisa.gov/resources-tools/resources/federal-government-cybersecurity-incident-and-vulnerability-response-playbooks',
    'Operational playbooks detailing standardized response procedures for cybersecurity compromises.',
    'free',
    'core',
    2,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

-- Skill 61: Web Application Security
INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000044',
    'c1000000-0000-0000-0000-000000000061',
    'OWASP Foundation — OWASP Top 10 Security Risks',
    'OWASP',
    'standard',
    'https://owasp.org/www-project-top-ten/',
    'Definitive community consensus on the most critical web application security risks and preventive practices.',
    'free',
    'core',
    1,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000045',
    'c1000000-0000-0000-0000-000000000061',
    'PortSwigger — Web Security Academy',
    'PortSwigger',
    'lab',
    'https://portswigger.net/web-security',
    'Interactive labs for identifying and exploiting SQL injection, XSS, CSRF, and broken access controls.',
    'free_account_required',
    'core',
    2,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

-- Skill 62: Proactive Threat Hunting & Threat Intelligence
INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000046',
    'c1000000-0000-0000-0000-000000000062',
    'MITRE ATT&CK — Enterprise Knowledge Base of Adversary Tactics',
    'MITRE',
    'reference',
    'https://attack.mitre.org/',
    'Curated knowledge base of adversary behaviors, techniques, and tactics based on real-world observations.',
    'free',
    'advanced',
    1,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

INSERT INTO public.career_learning_resources (
    id,
    roadmap_item_id,
    title,
    provider_name,
    resource_type,
    url,
    description,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'd1000000-0000-0000-0000-000000000047',
    'c1000000-0000-0000-0000-000000000062',
    'SANS Reading Room — An Introduction to Cyber Threat Hunting',
    'SANS Institute',
    'article',
    'https://www.sans.org/white-papers/',
    'Technical whitepaper explaining hypothesis-driven hunting methodologies and operational indicators.',
    'free',
    'advanced',
    2,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

COMMIT;