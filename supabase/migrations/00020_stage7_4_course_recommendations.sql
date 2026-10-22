-- =========================================================================
-- QWERTY Stage 7.4 — Career Course Recommendations Migration
-- Migration: 00020_stage7_4_course_recommendations.sql
-- Status: FINAL CANDIDATE — NOT DEPLOYED — MANUAL PREFLIGHT REQUIRED
--
-- Governed Curated Course Recommendations for Career Role Skill Roadmaps.
-- Zero AI runtime calls.
-- Zero salary speculation.
-- Zero affiliate/referral course links.
-- Launch catalogue restricted to free or free-account-required learning.
-- Server-mediated access model with least-privilege security.
-- =========================================================================

BEGIN;

-- =========================================================================
-- 1. CREATE TABLE
-- =========================================================================

CREATE TABLE public.career_course_recommendations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    roadmap_item_id uuid NOT NULL
        REFERENCES public.career_role_roadmap_items(id)
        ON DELETE RESTRICT,

    title text NOT NULL,
    provider_name text NOT NULL,
    url text NOT NULL,
    description text NOT NULL,
    why_this_course text NOT NULL,

    access_type text NOT NULL DEFAULT 'free',
    difficulty text,
    display_order integer NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'draft',

    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_career_course_recommendations_title
        CHECK (
            char_length(trim(title)) > 0
            AND char_length(title) <= 255
        ),

    CONSTRAINT chk_career_course_recommendations_provider_name
        CHECK (
            char_length(trim(provider_name)) > 0
            AND char_length(provider_name) <= 150
        ),

    CONSTRAINT chk_career_course_recommendations_url
        CHECK (
            url ~* '^https://[a-zA-Z0-9.-]+(/.*)?$'
            AND url !~* '\s'
        ),

    CONSTRAINT chk_career_course_recommendations_description
        CHECK (
            char_length(trim(description)) > 0
            AND char_length(description) <= 2000
        ),

    CONSTRAINT chk_career_course_recommendations_why
        CHECK (
            char_length(trim(why_this_course)) > 0
            AND char_length(why_this_course) <= 2000
        ),

    CONSTRAINT chk_career_course_recommendations_access_type
        CHECK (
            access_type IN (
                'free',
                'free_account_required'
            )
        ),

    CONSTRAINT chk_career_course_recommendations_difficulty
        CHECK (
            difficulty IS NULL
            OR difficulty IN (
                'foundation',
                'core',
                'advanced'
            )
        ),

    CONSTRAINT chk_career_course_recommendations_display_order
        CHECK (display_order >= 0),

    CONSTRAINT chk_career_course_recommendations_status
        CHECK (
            status IN (
                'draft',
                'published',
                'archived'
            )
        ),

    CONSTRAINT uq_career_course_recommendations_item_order
        UNIQUE (roadmap_item_id, display_order),

    CONSTRAINT uq_career_course_recommendations_item_url
        UNIQUE (roadmap_item_id, url)
);

-- =========================================================================
-- 2. INDEXES
-- =========================================================================

CREATE INDEX idx_career_course_recommendations_item_status_order
    ON public.career_course_recommendations (
        roadmap_item_id,
        status,
        display_order
    );

CREATE INDEX idx_career_course_recommendations_status
    ON public.career_course_recommendations (status);

-- =========================================================================
-- 3. UPDATED_AT TRIGGER
-- =========================================================================

CREATE TRIGGER set_career_course_recommendations_updated_at
    BEFORE UPDATE ON public.career_course_recommendations
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- =========================================================================
-- 4. RLS & LEAST-PRIVILEGE GRANTS
-- =========================================================================

ALTER TABLE public.career_course_recommendations
    ENABLE ROW LEVEL SECURITY;

REVOKE ALL
ON TABLE public.career_course_recommendations
FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.career_course_recommendations
TO service_role;

-- =========================================================================
-- 5. CURATED LAUNCH SEED DATA
-- Exactly 24 published courses
-- Exactly 4 courses per launch role
-- =========================================================================


-- =========================================================================
-- FRONTEND ENGINEER
-- Roadmap: b1000000-0000-0000-0000-000000000001
-- =========================================================================

-- Skill 1: Semantic HTML5 & Accessible Markup
-- Foundation

INSERT INTO public.career_course_recommendations (
    id,
    roadmap_item_id,
    title,
    provider_name,
    url,
    description,
    why_this_course,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'e1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000001',
    'Digital Accessibility Foundations',
    'W3C Web Accessibility Initiative (WAI)',
    'https://www.w3.org/WAI/courses/foundations-course/',
    'Structured accessibility course covering digital accessibility, international accessibility standards, inclusive design principles, and practical approaches for creating and evaluating accessible digital content.',
    'Provides standards-aligned accessibility education directly from W3C WAI and establishes a strong foundation for building semantic and accessible web interfaces.',
    'free_account_required',
    'foundation',
    0,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

-- Skill 3: JavaScript Fundamentals & DOM APIs
-- Foundation

INSERT INTO public.career_course_recommendations (
    id,
    roadmap_item_id,
    title,
    provider_name,
    url,
    description,
    why_this_course,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'e1000000-0000-0000-0000-000000000002',
    'c1000000-0000-0000-0000-000000000003',
    'CS50 Web Programming with Python and JavaScript',
    'Harvard University',
    'https://cs50.harvard.edu/web/',
    'Open university curriculum covering JavaScript, browser-side programming, client-server interaction, APIs, application architecture, testing, and modern web application development.',
    'Provides rigorous programming practice and reinforces JavaScript, asynchronous interaction, application architecture, and client-server communication.',
    'free',
    'foundation',
    0,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

-- Skill 6: React Component Architecture & Hooks
-- Core

INSERT INTO public.career_course_recommendations (
    id,
    roadmap_item_id,
    title,
    provider_name,
    url,
    description,
    why_this_course,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'e1000000-0000-0000-0000-000000000003',
    'c1000000-0000-0000-0000-000000000006',
    'Full Stack Open: Part 1 - Introduction to React',
    'University of Helsinki',
    'https://fullstackopen.com/en/part1',
    'University learning material covering React components, props, state, event handling, component decomposition, debugging, and modern functional React development.',
    'Develops practical React component design skills and provides hands-on exercises that reinforce state management, component composition, and maintainable frontend architecture.',
    'free',
    'core',
    0,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

-- Skill 10: Web Performance & Core Web Vitals Optimization
-- Advanced

INSERT INTO public.career_course_recommendations (
    id,
    roadmap_item_id,
    title,
    provider_name,
    url,
    description,
    why_this_course,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'e1000000-0000-0000-0000-000000000004',
    'c1000000-0000-0000-0000-000000000010',
    'Learn Performance',
    'web.dev by Google',
    'https://web.dev/learn/performance/',
    'Structured learning series covering browser performance, loading optimization, rendering behavior, Core Web Vitals, resource delivery, images, fonts, JavaScript, and responsiveness.',
    'Provides practical browser-performance techniques that directly support measurement and improvement of LCP, INP, CLS, loading performance, and responsive interactions.',
    'free',
    'advanced',
    0,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);


-- =========================================================================
-- BACKEND ENGINEER
-- Roadmap: b1000000-0000-0000-0000-000000000002
-- =========================================================================

-- Skill 14: Relational Database Modeling & SQL
-- Foundation

INSERT INTO public.career_course_recommendations (
    id,
    roadmap_item_id,
    title,
    provider_name,
    url,
    description,
    why_this_course,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'e1000000-0000-0000-0000-000000000005',
    'c1000000-0000-0000-0000-000000000014',
    'Database Systems',
    'MIT OpenCourseWare',
    'https://ocw.mit.edu/courses/6-830-database-systems-fall-2010/',
    'Open university course covering relational algebra, relational data models, schema normalization, query processing, transactions, storage systems, and database architecture.',
    'Provides rigorous academic grounding in the concepts that underpin relational databases and helps backend engineers understand how schema design and queries behave inside database systems.',
    'free',
    'foundation',
    0,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

-- Skill 16: Linux Environment, Bash & Networking Basics
-- Foundation

INSERT INTO public.career_course_recommendations (
    id,
    roadmap_item_id,
    title,
    provider_name,
    url,
    description,
    why_this_course,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'e1000000-0000-0000-0000-000000000006',
    'c1000000-0000-0000-0000-000000000016',
    'Introduction to Linux (LFS101)',
    'The Linux Foundation',
    'https://training.linuxfoundation.org/training/introduction-to-linux/',
    'Linux Foundation course covering Linux concepts, system configuration, command-line operations, processes, file operations, networking, Bash, scripting, and local security principles.',
    'Builds the operating-system and command-line foundation required to develop, deploy, troubleshoot, and operate backend workloads in Linux environments.',
    'free_account_required',
    'foundation',
    0,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

-- Skill 17: Authentication, Authorization & RBAC
-- Core

INSERT INTO public.career_course_recommendations (
    id,
    roadmap_item_id,
    title,
    provider_name,
    url,
    description,
    why_this_course,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'e1000000-0000-0000-0000-000000000007',
    'c1000000-0000-0000-0000-000000000017',
    'AWS Identity and Access Management - Architecture and Terminology',
    'AWS Skill Builder',
    'https://skillbuilder.aws/learn/JUU8UTHZAC/aws-identity-and-access-management--architecture-and-terminology/GZNZAF17KZ',
    'AWS training covering IAM architecture, users, groups, roles, policy structures, trust relationships, permissions, resource identifiers, and access-control terminology.',
    'Provides practical identity and access management concepts that reinforce least privilege, roles, permissions, trust relationships, and authorization design.',
    'free_account_required',
    'core',
    0,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

-- Skill 23: Distributed Systems & Event-Driven Architecture
-- Advanced

INSERT INTO public.career_course_recommendations (
    id,
    roadmap_item_id,
    title,
    provider_name,
    url,
    description,
    why_this_course,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'e1000000-0000-0000-0000-000000000008',
    'c1000000-0000-0000-0000-000000000023',
    'Distributed Computer Systems Engineering (MIT 6.824)',
    'MIT OpenCourseWare',
    'https://ocw.mit.edu/courses/6-824-distributed-computer-systems-engineering-spring-2006/',
    'Open university course covering distributed system architecture, remote communication, replication, fault tolerance, distributed storage, and consistency.',
    'Provides strong theoretical foundations for reasoning about resilient distributed systems, service coordination, failure behavior, replication, and distributed backend architecture.',
    'free',
    'advanced',
    0,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);


-- =========================================================================
-- DATA ANALYST
-- Roadmap: b1000000-0000-0000-0000-000000000005
-- =========================================================================

-- Skill 25: SQL Querying & Data Extraction Foundations
-- Foundation

INSERT INTO public.career_course_recommendations (
    id,
    roadmap_item_id,
    title,
    provider_name,
    url,
    description,
    why_this_course,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'e1000000-0000-0000-0000-000000000009',
    'c1000000-0000-0000-0000-000000000025',
    'SQL for Data Analysis',
    'Mode Analytics',
    'https://mode.com/sql-tutorial/',
    'Structured SQL tutorial covering relational querying, filtering, aggregations, grouping, joins, subqueries, and common analytical data-extraction workflows.',
    'Provides hands-on analytical examples that help learners build reliable SQL querying skills for extracting, combining, and summarizing business data.',
    'free',
    'foundation',
    0,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

-- Skill 28: Advanced SQL, CTEs & Analytical Window Functions
-- Core

INSERT INTO public.career_course_recommendations (
    id,
    roadmap_item_id,
    title,
    provider_name,
    url,
    description,
    why_this_course,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'e1000000-0000-0000-0000-000000000010',
    'c1000000-0000-0000-0000-000000000028',
    'Intermediate SQL Tutorial',
    'Mode Analytics',
    'https://mode.com/sql-tutorial/sql-intermediate/',
    'Intermediate SQL learning material covering complex joins, subqueries, date manipulation, conditional logic, data cleaning, and increasingly sophisticated analytical queries.',
    'Extends foundational SQL into the multi-step analytical querying techniques needed for advanced reporting, cohort analysis, transformations, and reusable analytical workflows.',
    'free',
    'core',
    0,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

-- Skill 30: Python for Data Analysis
-- Core

INSERT INTO public.career_course_recommendations (
    id,
    roadmap_item_id,
    title,
    provider_name,
    url,
    description,
    why_this_course,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'e1000000-0000-0000-0000-000000000011',
    'c1000000-0000-0000-0000-000000000030',
    'Python for Data Science',
    'IBM Developer Skills Network',
    'https://cognitiveclass.ai/courses/python-for-data-science',
    'Guided learning covering Python fundamentals together with NumPy and Pandas concepts used for data manipulation, transformation, analysis, and exploration.',
    'Provides practical exposure to the Python data-analysis ecosystem and reinforces the core programming and tabular-data skills required by data analysts.',
    'free_account_required',
    'core',
    0,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

-- Skill 33: A/B Testing & Controlled Experimentation
-- Advanced

INSERT INTO public.career_course_recommendations (
    id,
    roadmap_item_id,
    title,
    provider_name,
    url,
    description,
    why_this_course,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'e1000000-0000-0000-0000-000000000012',
    'c1000000-0000-0000-0000-000000000033',
    'Data analysis: hypothesis testing',
    'The Open University - OpenLearn',
    'https://www.open.edu/openlearn/science-maths-technology/data-analysis-hypothesis-testing/content-section-0',
    'Free course covering hypothesis formulation, significance levels, one-sided and two-sided testing, p-values, z-tests, t-tests, and hypothesis testing for means and proportions.',
    'Builds the statistical reasoning needed to interpret controlled experiments and determine whether observed differences are supported by evidence rather than random variation.',
    'free',
    'advanced',
    0,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);


-- =========================================================================
-- PRODUCT MANAGER
-- Roadmap: b1000000-0000-0000-0000-000000000008
-- =========================================================================

-- Skill 35: User Research & Problem Discovery
-- Foundation

INSERT INTO public.career_course_recommendations (
    id,
    roadmap_item_id,
    title,
    provider_name,
    url,
    description,
    why_this_course,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'e1000000-0000-0000-0000-000000000013',
    'c1000000-0000-0000-0000-000000000035',
    'People-centred designing',
    'The Open University - OpenLearn',
    'https://www.open.edu/openlearn/course/view.php?id=612',
    'Free course focused on usability, user-centred design, understanding how people interact with products, and methods for researching user needs and behaviour.',
    'Supports product discovery by helping learners investigate user interaction, examine products from the user perspective, and apply people-centred research methods before defining solutions.',
    'free',
    'foundation',
    0,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

-- Skill 36: Agile Delivery, Sprint Planning & User Stories
-- Foundation

INSERT INTO public.career_course_recommendations (
    id,
    roadmap_item_id,
    title,
    provider_name,
    url,
    description,
    why_this_course,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'e1000000-0000-0000-0000-000000000014',
    'c1000000-0000-0000-0000-000000000036',
    'Project management: the start of the project journey',
    'The Open University - OpenLearn',
    'https://www.open.edu/openlearn/money-business/leadership-management/project-management-the-start-the-project-journey/content-section-0',
    'Free course examining project conception, feasibility, risk, decision making, project lifecycles, phased development, prototyping, software development processes, and agile approaches.',
    'Provides delivery foundations for decomposing work, understanding project lifecycles, managing uncertainty, and applying iterative and agile approaches to product delivery.',
    'free',
    'foundation',
    0,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

-- Skill 38: Feature Prioritization Frameworks
-- Core

INSERT INTO public.career_course_recommendations (
    id,
    roadmap_item_id,
    title,
    provider_name,
    url,
    description,
    why_this_course,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'e1000000-0000-0000-0000-000000000015',
    'c1000000-0000-0000-0000-000000000038',
    'Making decisions',
    'The Open University - OpenLearn',
    'https://www.open.edu/openlearn/money-business/leadership-management/making-decisions/content-section-0',
    'Free course examining managerial decision-making processes, alternative decision perspectives, social influences, judgement, and frameworks for understanding structured choices.',
    'Strengthens the decision discipline behind prioritisation by helping learners evaluate alternatives, understand trade-offs, and make more structured and defensible choices.',
    'free',
    'core',
    0,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

-- Skill 42: Product Vision, Strategy & Horizon Roadmapping
-- Advanced

INSERT INTO public.career_course_recommendations (
    id,
    roadmap_item_id,
    title,
    provider_name,
    url,
    description,
    why_this_course,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'e1000000-0000-0000-0000-000000000016',
    'c1000000-0000-0000-0000-000000000042',
    'Business models in strategic management',
    'The Open University - OpenLearn',
    'https://www.open.edu/openlearn/money-business/business-models-strategic-management/',
    'Free course introducing business-model theory, strategic management, business-model structures, digital business models, value creation, and business-model design.',
    'Supports product strategy by helping learners connect product direction with value creation, organisational strategy, market structure, and sustainable business-model choices.',
    'free',
    'advanced',
    0,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);


-- =========================================================================
-- DEVOPS & PLATFORM ENGINEER
-- Roadmap: b1000000-0000-0000-0000-000000000010
-- =========================================================================

-- Skill 45: Linux Administration, Storage & Shell Automation
-- Foundation

INSERT INTO public.career_course_recommendations (
    id,
    roadmap_item_id,
    title,
    provider_name,
    url,
    description,
    why_this_course,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'e1000000-0000-0000-0000-000000000017',
    'c1000000-0000-0000-0000-000000000045',
    'Introduction to Linux (LFS101)',
    'The Linux Foundation',
    'https://training.linuxfoundation.org/training/introduction-to-linux/',
    'Linux Foundation course covering Linux system concepts, command-line operations, processes, file management, system configuration, networking, Bash, scripting, and local security.',
    'Provides a vendor-neutral Linux foundation for platform engineering and develops practical command-line and systems knowledge before learners progress to deeper administration topics.',
    'free_account_required',
    'foundation',
    0,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

-- Skill 49: Infrastructure as Code
-- Core

INSERT INTO public.career_course_recommendations (
    id,
    roadmap_item_id,
    title,
    provider_name,
    url,
    description,
    why_this_course,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'e1000000-0000-0000-0000-000000000018',
    'c1000000-0000-0000-0000-000000000049',
    'Terraform Tutorials',
    'HashiCorp Developer',
    'https://developer.hashicorp.com/terraform/tutorials',
    'Official step-by-step Terraform learning paths covering infrastructure-as-code concepts, configuration, providers, initialization, planning, application, state, variables, modules, and infrastructure lifecycle management.',
    'Uses the official Terraform learning environment to build practical infrastructure-as-code skills around the workflows platform engineers use to define and manage repeatable infrastructure.',
    'free',
    'core',
    0,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

-- Skill 51: Kubernetes & Container Orchestration Basics
-- Core

INSERT INTO public.career_course_recommendations (
    id,
    roadmap_item_id,
    title,
    provider_name,
    url,
    description,
    why_this_course,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'e1000000-0000-0000-0000-000000000019',
    'c1000000-0000-0000-0000-000000000051',
    'Introduction to Kubernetes (LFS158)',
    'The Linux Foundation',
    'https://training.linuxfoundation.org/training/introduction-to-kubernetes/',
    'Linux Foundation course introducing Kubernetes origins, architecture, components, cluster concepts, container orchestration, application deployment, and principal Kubernetes building blocks.',
    'Provides a structured introduction to Kubernetes and establishes the orchestration knowledge required before progressing to production cluster administration.',
    'free_account_required',
    'core',
    0,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

-- Skill 52: Site Reliability Engineering, SLIs & Error Budgets
-- Advanced

INSERT INTO public.career_course_recommendations (
    id,
    roadmap_item_id,
    title,
    provider_name,
    url,
    description,
    why_this_course,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'e1000000-0000-0000-0000-000000000020',
    'c1000000-0000-0000-0000-000000000052',
    'The Art of SLOs',
    'Google SRE',
    'https://sre.google/resources/practices-and-processes/art-of-slos/',
    'Google SRE workshop covering Service Level Indicators, Service Level Objectives, reliability targets, user-focused measurements, and the relationship between SLOs and error budgets.',
    'Provides practical guidance from Google SRE on defining and applying SLIs, SLOs, and error budgets to make reliability measurable and operationally useful.',
    'free',
    'advanced',
    0,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);


-- =========================================================================
-- CYBERSECURITY ANALYST
-- Roadmap: b1000000-0000-0000-0000-000000000012
-- =========================================================================

-- Skill 55: Network Protocols & Packet Analysis
-- Foundation

INSERT INTO public.career_course_recommendations (
    id,
    roadmap_item_id,
    title,
    provider_name,
    url,
    description,
    why_this_course,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'e1000000-0000-0000-0000-000000000021',
    'c1000000-0000-0000-0000-000000000055',
    'Networking Basics',
    'Cisco Networking Academy',
    'https://www.netacad.com/courses/networking-basics',
    'Cisco course covering network communication, network components, protocols, IP addressing, TCP and UDP, DNS, application services, data transmission, and network troubleshooting utilities.',
    'Builds the protocol and network-communication foundation required before analysts progress to packet capture, traffic inspection, anomaly investigation, and network-defense workflows.',
    'free_account_required',
    'foundation',
    0,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

-- Skill 60: Incident Response, Containment & Forensic Triage
-- Core

INSERT INTO public.career_course_recommendations (
    id,
    roadmap_item_id,
    title,
    provider_name,
    url,
    description,
    why_this_course,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'e1000000-0000-0000-0000-000000000022',
    'c1000000-0000-0000-0000-000000000060',
    'Security incident management in Microsoft Sentinel',
    'Microsoft Learn',
    'https://learn.microsoft.com/en-us/training/modules/incident-management-sentinel/',
    'Structured security-operations training covering security incidents, incident evidence and entities, investigation workflows, incident management, and incident resolution using Microsoft Sentinel.',
    'Provides a practical incident-management workflow that helps analysts understand investigation, evidence review, triage, incident handling, and structured resolution activities.',
    'free',
    'core',
    0,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

-- Skill 61: Web Application Security & OWASP Top 10
-- Core

INSERT INTO public.career_course_recommendations (
    id,
    roadmap_item_id,
    title,
    provider_name,
    url,
    description,
    why_this_course,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'e1000000-0000-0000-0000-000000000023',
    'c1000000-0000-0000-0000-000000000061',
    'Web Security Academy',
    'PortSwigger',
    'https://portswigger.net/web-security',
    'Interactive web-security learning platform covering SQL injection, cross-site scripting, authentication, access control, server-side request forgery, request smuggling, API testing, and other web-security topics through guided material and labs.',
    'Provides practical hands-on security exercises that allow learners to study common web vulnerabilities, reproduce them safely in labs, and understand corresponding defensive concepts.',
    'free_account_required',
    'core',
    0,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

-- Skill 63: Security Compliance, Governance & Audit Frameworks
-- Advanced

INSERT INTO public.career_course_recommendations (
    id,
    roadmap_item_id,
    title,
    provider_name,
    url,
    description,
    why_this_course,
    access_type,
    difficulty,
    display_order,
    status,
    created_at,
    updated_at
) VALUES (
    'e1000000-0000-0000-0000-000000000024',
    'c1000000-0000-0000-0000-000000000063',
    'Assessing Security and Privacy Controls Introductory Course',
    'National Institute of Standards and Technology (NIST)',
    'https://csrc.nist.gov/projects/risk-management/rmf-courses',
    'NIST self-guided training based on SP 800-53A covering security and privacy control assessment methodology, assessment procedures, assessment objectives, and the wider Risk Management Framework context.',
    'Directly supports governance and audit skills by introducing authoritative NIST approaches for assessing security and privacy controls and documenting evidence against defined assessment objectives.',
    'free',
    'advanced',
    0,
    'published',
    '2026-08-01T00:00:00Z',
    '2026-08-01T00:00:00Z'
);

COMMIT;