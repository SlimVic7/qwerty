-- ============================================================
-- Migration: 00017_stage7_1_career_role_library.sql
-- Stage: 7.1 Career Role Library
-- Status: PENDING MANUAL PREFLIGHT REVIEW — DO NOT RUN AUTOMATICALLY
--
-- Description:
-- Provisions curated Career Role Library table (public.career_roles):
-- - Structured, educational career navigation content for registered candidates
-- - Role attributes: slug, title, short_summary, career_area, overview,
--   responsibilities, core_skills, supporting_skills, typical_background,
--   career_progression, related_roles, status, display_order
-- - Strictly ZERO AI claims, zero dynamic salary claims
-- - Performance indexes for area filtering, search, and ordering
-- - Strict RLS & Grants (Server-Mediated Candidate Access Model):
--     PUBLIC, anon, authenticated: zero direct table access
--     service_role: minimum required CRUD (API-mediated access)
--     Candidate access gated via server API (requireAuth, requireRole(['candidate']))
-- ============================================================

BEGIN;

-- ============================================================
-- 1. CAREER ROLES TABLE
-- ============================================================

CREATE TABLE public.career_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text UNIQUE NOT NULL,
    title text NOT NULL,
    short_summary text NOT NULL,
    career_area text NOT NULL,
    overview text NOT NULL,
    responsibilities jsonb NOT NULL DEFAULT '[]'::jsonb,
    core_skills jsonb NOT NULL DEFAULT '[]'::jsonb,
    supporting_skills jsonb NOT NULL DEFAULT '[]'::jsonb,
    typical_background text NOT NULL,
    career_progression jsonb NOT NULL DEFAULT '[]'::jsonb,
    related_roles jsonb NOT NULL DEFAULT '[]'::jsonb,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    display_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_career_roles_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    CONSTRAINT chk_career_roles_title_length CHECK (char_length(trim(title)) > 0 AND char_length(title) <= 120),
    CONSTRAINT chk_career_roles_short_summary_length CHECK (char_length(trim(short_summary)) > 0 AND char_length(short_summary) <= 500),
    CONSTRAINT chk_career_roles_career_area CHECK (career_area IN (
        'Software Engineering',
        'Data & Analytics',
        'Product & Delivery',
        'Cloud & Infrastructure',
        'Security & Compliance',
        'Quality Engineering'
    )),
    CONSTRAINT chk_career_roles_responsibilities_array CHECK (jsonb_typeof(responsibilities) = 'array'),
    CONSTRAINT chk_career_roles_core_skills_array CHECK (jsonb_typeof(core_skills) = 'array'),
    CONSTRAINT chk_career_roles_supporting_skills_array CHECK (jsonb_typeof(supporting_skills) = 'array'),
    CONSTRAINT chk_career_roles_progression_array CHECK (jsonb_typeof(career_progression) = 'array'),
    CONSTRAINT chk_career_roles_related_roles_array CHECK (jsonb_typeof(related_roles) = 'array'),
    CONSTRAINT chk_career_roles_overview_nonempty CHECK (char_length(trim(overview)) > 0),
    CONSTRAINT chk_career_roles_background_nonempty CHECK (char_length(trim(typical_background)) > 0),
    CONSTRAINT chk_career_roles_display_order CHECK (display_order >= 0)
);

-- ============================================================
-- 2. PERFORMANCE INDEXES
-- ============================================================

CREATE INDEX idx_career_roles_status_order ON public.career_roles (status, display_order ASC, title ASC);
CREATE INDEX idx_career_roles_area ON public.career_roles (career_area, status);

-- ============================================================
-- 3. UPDATED_AT TRIGGER
-- ============================================================

CREATE TRIGGER set_career_roles_updated_at
BEFORE UPDATE ON public.career_roles
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- ============================================================
-- 4. ROW LEVEL SECURITY & LEAST-PRIVILEGE GRANTS
-- ============================================================

ALTER TABLE public.career_roles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.career_roles FROM PUBLIC, anon, authenticated, service_role;

-- Direct client/browser access (PUBLIC, anon, authenticated) is strictly revoked.
-- All candidate Career Role Library access is mediated exclusively via the server API
-- (GET /api/candidate/career/roles, protected by requireAuth and requireRole(['candidate'])).
-- Service role manages reading, insertions, updates, and maintenance via server endpoints.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.career_roles TO service_role;


-- ============================================================
-- 5. INITIAL SEED CONTENT (13 CURATED TECH ROLES)
-- ============================================================

INSERT INTO public.career_roles (
    id, slug, title, short_summary, career_area, overview,
    responsibilities, core_skills, supporting_skills,
    typical_background, career_progression, related_roles,
    status, display_order, created_at, updated_at
) VALUES
(
    'a1000000-0000-0000-0000-000000000001',
    'frontend-engineer',
    'Frontend Engineer',
    'Builds responsive, performant, and accessible user interfaces for web applications using modern JavaScript frameworks and browser technologies.',
    'Software Engineering',
    'Frontend Engineers specialize in everything the user interacts with in a browser or web view. They translate product requirements, user experience designs, and design systems into clean, maintainable, and high-performance client-side code. The role demands deep familiarity with web standards, browser rendering lifecycles, state management, and accessibility (a11y) standards.',
    '["Implement reusable component libraries and user interface flows based on UX wireframes and visual specs.","Optimize client-side performance, core web vitals, bundle sizes, and rendering speed across browsers and devices.","Ensure web accessibility compliance (WCAG 2.1 AA) and responsive layouts for mobile and desktop screens.","Integrate REST and GraphQL APIs with robust error handling, caching, and optimistic UI updates.","Write comprehensive unit, integration, and end-to-end tests for critical user journeys."]'::jsonb,
    '["TypeScript","React / Next.js","HTML5 & Semantic Markup","CSS3 & Modern Layouts (Tailwind, Flexbox, Grid)","Client State Management (Zustand, Redux, Context API)","Web Performance & Core Web Vitals","Git Version Control"]'::jsonb,
    '["Accessibility (WCAG 2.1 AA / ARIA)","REST & GraphQL API Integration","Browser DevTools & Network Profiling","Testing (Vitest, Jest, Playwright, Cypress)","Build Tooling (Vite, Rollup, Webpack)"]'::jsonb,
    'Candidates typically enter frontend engineering through computer science degrees, intensive web development bootcamps, or self-directed web development portfolios. Experience building public web projects, contributing to open-source UI libraries, or transitioning from digital design or web agency roles is common.',
    '[{"stage":"Entry / Junior","title":"Junior Frontend Developer","description":"Focuses on implementing individual UI components, fixing styling issues, and writing unit tests with guidance from senior engineers."},{"stage":"Mid-Level","title":"Frontend Engineer","description":"Owns full feature flows, client state architectures, API integrations, and code reviews across multiple application domains."},{"stage":"Senior","title":"Senior Frontend Engineer","description":"Architects frontend infrastructure, establishes design systems, mentors teammates, and guides web performance and security standards."},{"stage":"Lead / Staff","title":"Staff Frontend Engineer / Tech Lead","description":"Drives organization-wide frontend strategy, cross-team microfrontend or modular architectures, and long-term tech stack evolution."}]'::jsonb,
    '[{"slug":"full-stack-engineer","title":"Full-Stack Engineer","career_area":"Software Engineering"},{"slug":"mobile-developer","title":"Mobile App Developer","career_area":"Software Engineering"},{"slug":"qa-automation-engineer","title":"QA Automation Engineer","career_area":"Quality Engineering"}]'::jsonb,
    'published',
    1,
    '2026-08-01T00:00:00Z'::timestamptz,
    '2026-08-01T00:00:00Z'::timestamptz
),
(
    'a1000000-0000-0000-0000-000000000002',
    'backend-engineer',
    'Backend Engineer',
    'Architects and maintains server-side services, relational databases, business logic APIs, and asynchronous message pipelines.',
    'Software Engineering',
    'Backend Engineers build the foundational engine of applications. They design scalable application programming interfaces (APIs), model relational and non-relational data schemas, enforce authentication and authorization rules, and implement resilient background processing. They ensure system security, data consistency, and low-latency throughput.',
    '["Design and document robust RESTful and RPC APIs for consumption by web and mobile clients.","Develop normalized relational database schemas, write efficient SQL queries, and manage database migrations.","Implement authentication, role-based access control (RBAC), data sanitization, and security guardrails.","Design message queues and asynchronous background workers for computationally intensive or batch workloads.","Instrument applications with structured logging, distributed tracing, and health monitoring."]'::jsonb,
    '["Node.js / TypeScript","Relational Databases (PostgreSQL, MySQL)","SQL Query Optimization & Data Modeling","API Design (REST, OpenAPI / Swagger)","Authentication & Authorization (JWT, OAuth 2.0, RBAC)","Asynchronous Event Processing & Queues","Unit & Integration Testing (Supertest, Vitest)"]'::jsonb,
    '["Containerization (Docker)","Redis & In-Memory Caching","Cloud Services (AWS, GCP, Supabase)","Microservices & Distributed Systems","CI/CD Pipelines"]'::jsonb,
    'Backend engineers often have backgrounds in Computer Science, Software Engineering, or related technical disciplines. Many transition from general programming, system administration, or frontend development after gaining strong database modeling and systems design skills.',
    '[{"stage":"Entry / Junior","title":"Junior Backend Developer","description":"Implements CRUD endpoints, writes basic database queries and migrations, and writes unit tests under code review."},{"stage":"Mid-Level","title":"Backend Engineer","description":"Designs end-to-end service domains, optimizes complex SQL queries, enforces security rules, and handles third-party API integrations."},{"stage":"Senior","title":"Senior Backend Engineer","description":"Architects scalable distributed systems, defines database caching patterns, leads system reliability and disaster recovery planning."},{"stage":"Lead / Staff","title":"Principal Backend Architect","description":"Sets technological standards for backend services across teams, oversees high-throughput data pipelines, and ensures platform scalability."}]'::jsonb,
    '[{"slug":"full-stack-engineer","title":"Full-Stack Engineer","career_area":"Software Engineering"},{"slug":"devops-engineer","title":"DevOps & Platform Engineer","career_area":"Cloud & Infrastructure"},{"slug":"data-engineer","title":"Data Engineer","career_area":"Data & Analytics"}]'::jsonb,
    'published',
    2,
    '2026-08-01T00:00:00Z'::timestamptz,
    '2026-08-01T00:00:00Z'::timestamptz
),
(
    'a1000000-0000-0000-0000-000000000003',
    'full-stack-engineer',
    'Full-Stack Engineer',
    'Delivers complete features from browser UI and state management down to server logic, database migrations, and cloud hosting.',
    'Software Engineering',
    'Full-Stack Engineers bridge the user-facing interface and the underlying server architecture. They possess the breadth to develop end-to-end features independently, from database modeling and API creation to React components and responsive styling. They are particularly valuable in product-focused teams that ship rapid iterations.',
    '["Deliver complete vertical feature slices spanning UI components, API endpoints, and database tables.","Maintain cohesion between frontend client models and backend API contracts.","Ensure high standards of security, user privacy, and error handling across both client and server tiers.","Collaborate directly with product managers and designers to scope and ship practical solutions.","Maintain continuous integration workflows and automated test coverage across full application stacks."]'::jsonb,
    '["TypeScript (Client & Server)","React / Modern Web Frameworks","Node.js & Express / Fastify","SQL & PostgreSQL Relational Modeling","RESTful API Design & Validation","Tailwind CSS & Responsive Layouts","Git & GitHub Workflows"]'::jsonb,
    '["Docker & Containerization","Cloud Deployment (Vercel, Render, AWS, GCP)","State Management & Data Fetching","Automated Testing (Vitest, Playwright)","Security Best Practices (OWASP Top 10)"]'::jsonb,
    'Full-stack engineers come from versatile technical backgrounds, including software engineering degrees, accelerated full-stack bootcamps, or progressive experience growing from frontend into backend systems (or vice versa).',
    '[{"stage":"Entry / Junior","title":"Junior Full-Stack Developer","description":"Implements smaller full-stack tasks such as adding form fields, wiring database columns, and writing unit tests."},{"stage":"Mid-Level","title":"Full-Stack Engineer","description":"Owns end-to-end product features from conception to deployment, balancing UI ergonomics with efficient database queries."},{"stage":"Senior","title":"Senior Full-Stack Engineer","description":"Guides full application architecture, establishes shared conventions, balances tech debt against product delivery velocity."},{"stage":"Lead / Staff","title":"Lead Full-Stack Architect","description":"Oversees multiple product repositories, aligns engineering strategy with business priorities, and mentors full-stack squads."}]'::jsonb,
    '[{"slug":"frontend-engineer","title":"Frontend Engineer","career_area":"Software Engineering"},{"slug":"backend-engineer","title":"Backend Engineer","career_area":"Software Engineering"},{"slug":"product-manager","title":"Product Manager","career_area":"Product & Delivery"}]'::jsonb,
    'published',
    3,
    '2026-08-01T00:00:00Z'::timestamptz,
    '2026-08-01T00:00:00Z'::timestamptz
),
(
    'a1000000-0000-0000-0000-000000000004',
    'mobile-developer',
    'Mobile App Developer',
    'Builds native or cross-platform mobile applications for iOS and Android devices, optimizing for tactile responsiveness and offline resilience.',
    'Software Engineering',
    'Mobile Developers create native or hybrid mobile client applications. They handle device-specific constraints such as intermittent network connectivity, battery consumption, biometric authentication, and push notifications. They guide app release cycles through Google Play Store and Apple App Store review pipelines.',
    '["Build performant, native-feeling mobile interfaces using React Native, Flutter, Swift, or Kotlin.","Integrate device hardware capabilities including biometric login, push notifications, and camera APIs.","Implement offline storage and synchronization mechanisms using SQLite or WatermelonDB.","Manage app store submission guidelines, test flight deployments, and mobile build signing pipelines.","Monitor real-world crash analytics and memory leaks using automated logging tools."]'::jsonb,
    '["React Native / Flutter / Swift / Kotlin","Mobile UI Guidelines (Material Design & Apple HIG)","Local Storage & Offline Sync (SQLite, MMKV)","REST & WebSocket API Integration","Mobile App Lifecycle & Memory Management","App Store & Play Store Release Pipelines"]'::jsonb,
    '["TypeScript","Push Notification Services (APNs, FCM)","Mobile Automated Testing (Maestro, Detox)","CI/CD for Mobile (Fastlane, GitHub Actions)","Deep Linking & Universal Links"]'::jsonb,
    'Developers often transition into mobile engineering from frontend web development (via React Native), or enter through native iOS/Android development courses and Computer Science degree pathways.',
    '[{"stage":"Entry / Junior","title":"Junior Mobile Developer","description":"Builds individual app screens, fixes styling bugs, and assists with app store test builds."},{"stage":"Mid-Level","title":"Mobile Engineer","description":"Implements complete mobile features, handles complex navigation patterns, offline caching, and third-party SDKs."},{"stage":"Senior","title":"Senior Mobile Engineer","description":"Architects mobile codebase modularity, improves build pipelines, optimizes runtime battery and memory performance."},{"stage":"Lead / Staff","title":"Lead Mobile Architect","description":"Sets mobile engineering standards across iOS and Android initiatives, mentors mobile squads, and guides multiplatform strategy."}]'::jsonb,
    '[{"slug":"frontend-engineer","title":"Frontend Engineer","career_area":"Software Engineering"},{"slug":"full-stack-engineer","title":"Full-Stack Engineer","career_area":"Software Engineering"},{"slug":"qa-automation-engineer","title":"QA Automation Engineer","career_area":"Quality Engineering"}]'::jsonb,
    'published',
    4,
    '2026-08-01T00:00:00Z'::timestamptz,
    '2026-08-01T00:00:00Z'::timestamptz
),
(
    'a1000000-0000-0000-0000-000000000005',
    'data-analyst',
    'Data Analyst',
    'Transforms raw operational data into actionable business intelligence, dashboards, and analytical reports to guide organizational decisions.',
    'Data & Analytics',
    'Data Analysts bridge raw data stores and business decision makers. They write analytical SQL queries, clean messy operational datasets, build intuitive visual dashboards, and conduct cohort and trend analyses. They ensure stakeholders understand key operational metrics and performance indicators.',
    '["Write complex SQL queries to extract, clean, and aggregate data from operational databases and data warehouses.","Design interactive executive and operational dashboards using BI tools (Power BI, Tableau, Metabase).","Conduct exploratory data analysis to uncover underlying trends, customer retention patterns, and operational bottlenecks.","Formulate hypotheses and calculate statistical significance for A/B product experiments.","Communicate data findings clearly to non-technical stakeholders through structured presentations."]'::jsonb,
    '["Advanced SQL (Aggregations, Window Functions, CTEs)","Data Visualization (Power BI, Tableau, Metabase)","Spreadsheets & Financial Modeling (Excel, Google Sheets)","Exploratory Data Analysis (Python / Pandas or R)","Basic Statistics & Hypothesis Testing","Data Cleaning & Quality Validation"]'::jsonb,
    '["Data Warehousing Concepts (BigQuery, Snowflake)","Git Version Control","Stakeholder Communication & Storytelling","Product Analytics Tools (PostHog, Mixpanel, GA4)","Metric Governance & Data Dictionaries"]'::jsonb,
    'Data Analysts frequently come from backgrounds in Mathematics, Economics, Business Information Systems, or STEM fields. Many also transition from operations, marketing, or finance roles by mastering SQL and business intelligence tools.',
    '[{"stage":"Entry / Junior","title":"Junior Data Analyst","description":"Extracts data using basic SQL, maintains standard report spreadsheets, and verifies data entry cleanliness."},{"stage":"Mid-Level","title":"Data Analyst","description":"Owns end-to-end dashboard suites, conducts ad-hoc analytical deep dives, and partners with business units to define KPIs."},{"stage":"Senior","title":"Senior Data Analyst","description":"Designs enterprise metric frameworks, drives experimentation methodologies, and acts as trusted advisor to leadership."},{"stage":"Lead / Staff","title":"Lead Analytics Partner / Analytics Manager","description":"Shapes enterprise data governance, mentors analysts across business lines, and guides analytics tooling investments."}]'::jsonb,
    '[{"slug":"data-engineer","title":"Data Engineer","career_area":"Data & Analytics"},{"slug":"product-manager","title":"Product Manager","career_area":"Product & Delivery"},{"slug":"machine-learning-engineer","title":"Machine Learning Engineer","career_area":"Data & Analytics"}]'::jsonb,
    'published',
    5,
    '2026-08-01T00:00:00Z'::timestamptz,
    '2026-08-01T00:00:00Z'::timestamptz
),
(
    'a1000000-0000-0000-0000-000000000006',
    'data-engineer',
    'Data Engineer',
    'Constructs automated data pipelines, warehouses, and storage architectures that feed analytics and production data consumers.',
    'Data & Analytics',
    'Data Engineers build the pipelines and infrastructure that move, clean, and store data at scale. They transform messy event streams and transaction logs into clean, structured tables in data warehouses. They ensure data freshness, reliability, schema validation, and pipeline uptime.',
    '["Design, build, and maintain automated ETL / ELT data ingestion pipelines using orchestration tools (Airflow, Dagster, dbt).","Architect dimensional models and schemas in cloud data warehouses (Snowflake, BigQuery, Redshift).","Ensure data reliability, schema contracts, automated testing, and alerting across pipeline failures.","Optimize pipeline performance, data compression, partitioning, and cloud warehouse computing costs.","Implement data governance, column-level security, and privacy compliance (GDPR data scrubbing)."]'::jsonb,
    '["Python & SQL Mastery","Data Modeling (Kimball, Star Schema, Data Vault)","Data Transformation Tooling (dbt)","Cloud Data Warehouses (Snowflake, BigQuery, Redshift)","Pipeline Orchestration (Apache Airflow, Dagster, Prefect)","Batch & Streaming Concepts (Kafka, Spark)"]'::jsonb,
    '["Docker & Containerized Workflows","Cloud Infrastructure (AWS / GCP / Azure)","Data Quality Frameworks (Great Expectations, Soda)","Git & CI/CD for Data","Linux Shell Scripting"]'::jsonb,
    'Data Engineers usually emerge from Computer Science or Software Engineering backgrounds, or progress from senior Data Analyst roles after acquiring software engineering, distributed systems, and pipeline orchestration skills.',
    '[{"stage":"Entry / Junior","title":"Junior Data Engineer","description":"Builds simple ingestion scripts, writes SQL transformations in dbt, and fixes scheduled job failures."},{"stage":"Mid-Level","title":"Data Engineer","description":"Designs reliable ETL/ELT pipelines, models warehouse data marts, and enforces data testing standards."},{"stage":"Senior","title":"Senior Data Engineer","description":"Architects enterprise data platforms, optimizes storage costs, introduces streaming pipelines, and mentors junior engineers."},{"stage":"Lead / Staff","title":"Principal Data Architect","description":"Defines overall organizational data strategy, metadata management, cross-department data meshes, and storage topology."}]'::jsonb,
    '[{"slug":"data-analyst","title":"Data Analyst","career_area":"Data & Analytics"},{"slug":"backend-engineer","title":"Backend Engineer","career_area":"Software Engineering"},{"slug":"machine-learning-engineer","title":"Machine Learning Engineer","career_area":"Data & Analytics"}]'::jsonb,
    'published',
    6,
    '2026-08-01T00:00:00Z'::timestamptz,
    '2026-08-01T00:00:00Z'::timestamptz
),
(
    'a1000000-0000-0000-0000-000000000007',
    'machine-learning-engineer',
    'Machine Learning Engineer',
    'Deploys, monitors, and optimizes predictive models and machine learning pipelines in production software environments.',
    'Data & Analytics',
    'Machine Learning Engineers productionize statistical algorithms, neural networks, and NLP systems. They take experimental prototypes created by data scientists and turn them into scalable, robust, low-latency microservices with automated model retraining, versioning, and drift monitoring.',
    '["Productionize ML and NLP models with high-throughput, low-latency API serving infrastructure.","Build feature engineering pipelines and model training workflows using tools like MLflow and Kubeflow.","Monitor models for concept drift, data corruption, latency degradation, and hallucination / error rates.","Optimize model inference speed using quantization, hardware acceleration (GPU/TPU), and batching.","Collaborate with software engineers to integrate model outputs seamlessly into customer-facing applications."]'::jsonb,
    '["Python & Scientific Libraries (NumPy, SciPy, Scikit-learn)","Deep Learning Frameworks (PyTorch, TensorFlow)","MLOps & Model Lifecycle (MLflow, Weights & Biases)","Containerization & Model Serving (Docker, FastAPI, Triton)","SQL & Feature Engineering","Mathematical Foundations (Linear Algebra, Calculus, Probability)"]'::jsonb,
    '["Cloud AI Platforms (AWS SageMaker, GCP Vertex AI)","Vector Databases & Retrieval Systems","Distributed Systems & GPU Profiling","Data Privacy & Model Fairness Auditing","Software Engineering Best Practices (CI/CD, Testing)"]'::jsonb,
    'Candidates typically hold advanced degrees (Master’s or PhD) in Computer Science, Data Science, Mathematics, or Physics, or advance from Software Engineering with specialized self-directed study and practical Kaggle / open-source contributions.',
    '[{"stage":"Entry / Junior","title":"Junior ML Engineer","description":"Prepares datasets, runs model training scripts, tracks metrics in MLflow, and writes unit tests for feature pipelines."},{"stage":"Mid-Level","title":"Machine Learning Engineer","description":"Builds end-to-end model serving endpoints, designs feature stores, and implements automated retraining pipelines."},{"stage":"Senior","title":"Senior ML Engineer","description":"Architects scalable distributed training infrastructure, optimizes inference latencies, and leads MLOps governance."},{"stage":"Lead / Staff","title":"Principal AI / ML Systems Architect","description":"Directs organization-wide ML engineering strategy, establishes AI safety and compliance standards, and drives platform choices."}]'::jsonb,
    '[{"slug":"data-engineer","title":"Data Engineer","career_area":"Data & Analytics"},{"slug":"data-analyst","title":"Data Analyst","career_area":"Data & Analytics"},{"slug":"backend-engineer","title":"Backend Engineer","career_area":"Software Engineering"}]'::jsonb,
    'published',
    7,
    '2026-08-01T00:00:00Z'::timestamptz,
    '2026-08-01T00:00:00Z'::timestamptz
),
(
    'a1000000-0000-0000-0000-000000000008',
    'product-manager',
    'Product Manager',
    'Defines product vision, prioritizes roadmap backlogs, and collaborates across engineering and design to solve customer problems.',
    'Product & Delivery',
    'Product Managers guide the strategy, roadmap, and feature execution of digital products. They sit at the intersection of business, design, and technology. They gather user feedback, analyze product analytics, validate hypotheses, and write clear specifications so engineering squads can build high-impact software.',
    '["Define product roadmaps, release goals, and success metrics (KPIs / OKRs) aligned with company strategy.","Conduct customer interviews and usability sessions to identify unmet user needs and friction points.","Write clear, unambiguous user stories, acceptance criteria, and technical problem statements.","Prioritize product backlogs using structured frameworks (RICE, MoSCoW, Opportunity Solution Trees).","Facilitate cross-functional sprint planning, release coordination, and go-to-market communication."]'::jsonb,
    '["Product Strategy & Roadmap Formulation","User Research & Customer Interviewing","Product Analytics & Metric Tracking (Funnel Analysis, Retention)","Agile / Scrum Backlog Management (Jira, Linear)","Stakeholder Management & Cross-Functional Alignment","Requirements Definition (PRDs, User Stories, Acceptance Criteria)"]'::jsonb,
    '["Basic Technical Literacy (APIs, Database Schema Concepts)","UX Wireframing (Figma, Miro)","A/B Testing & Experimentation Design","Competitive Market Analysis","Business Modeling & Unit Economics"]'::jsonb,
    'Product managers come from diverse backgrounds: former software engineers, UX designers, data analysts, management consultants, or business analysts who demonstrated product intuition and stakeholder communication skills.',
    '[{"stage":"Entry / Junior","title":"Associate Product Manager","description":"Assists with backlog grooming, drafts user stories, tracks sprint execution, and conducts competitive research."},{"stage":"Mid-Level","title":"Product Manager","description":"Owns a specific product area or squad, defines quarterly roadmaps, analyzes metrics, and drives feature launches."},{"stage":"Senior","title":"Senior Product Manager","description":"Leads complex cross-squad product bets, mentors junior PMs, and influences company-wide product strategy."},{"stage":"Lead / Director","title":"Director of Product / Head of Product","description":"Shapes organizational product portfolio, recruits and leads product management teams, and aligns executive vision."}]'::jsonb,
    '[{"slug":"technical-project-manager","title":"Technical Project Manager","career_area":"Product & Delivery"},{"slug":"full-stack-engineer","title":"Full-Stack Engineer","career_area":"Software Engineering"},{"slug":"data-analyst","title":"Data Analyst","career_area":"Data & Analytics"}]'::jsonb,
    'published',
    8,
    '2026-08-01T00:00:00Z'::timestamptz,
    '2026-08-01T00:00:00Z'::timestamptz
),
(
    'a1000000-0000-0000-0000-000000000009',
    'technical-project-manager',
    'Technical Project Manager',
    'Coordinates engineering deliverables, removes execution blockers, and ensures complex software initiatives ship on schedule.',
    'Product & Delivery',
    'Technical Project Managers (TPMs) orchestrate complex technical programs across multiple squads, external vendors, and infrastructure teams. They identify dependency risks, establish delivery timelines, track technical milestones, and ensure project scope is managed transparently without burning out engineering teams.',
    '["Map dependencies, critical paths, and project risk registers across complex technical initiatives.","Facilitate agile ceremonies, sprint planning, retrospective sessions, and milestone check-ins.","Track cross-team milestones and provide clear status reporting to executive stakeholders.","Identify bottlenecks, scope creep, and resource constraints early to implement mitigation plans.","Coordinate third-party vendor integrations, compliance deliverables, and security sign-offs."]'::jsonb,
    '["Agile Methodologies (Scrum, Kanban, SAFe)","Technical Scope & Dependency Mapping","Risk Management & Mitigation Planning","Timeline Estimation & Critical Path Analysis","Project Management Software (Jira, Confluence, Asana)","Clear Written & Verbal Communication"]'::jsonb,
    '["Technical Architecture Literacy (APIs, Cloud Infrastructure)","Resource Planning & Budget Tracking","Vendor & Contract Coordination","Change Management Procedures","Post-Mortem & Retrospective Facilitation"]'::jsonb,
    'TPMs frequently have backgrounds in Software Engineering, Systems Administration, Quality Assurance, or General Project Management, having acquired formal certifications (PMP, CSM, PRINCE2) combined with real technical delivery experience.',
    '[{"stage":"Entry / Junior","title":"Project Coordinator / Scrum Master","description":"Organizes daily standups, tracks sprint boards, updates project documentation, and coordinates meeting schedules."},{"stage":"Mid-Level","title":"Technical Project Manager","description":"Manages multi-team software releases, resolves cross-functional dependencies, and maintains risk registers."},{"stage":"Senior","title":"Senior Technical Program Manager","description":"Leads strategic organization-wide initiatives (e.g. cloud migrations, compliance rollouts) across dozens of engineers."},{"stage":"Lead / Director","title":"Head of Program Management","description":"Establishes enterprise project delivery standards, governance frameworks, and program management office (PMO) operations."}]'::jsonb,
    '[{"slug":"product-manager","title":"Product Manager","career_area":"Product & Delivery"},{"slug":"devops-engineer","title":"DevOps & Platform Engineer","career_area":"Cloud & Infrastructure"},{"slug":"qa-automation-engineer","title":"QA Automation Engineer","career_area":"Quality Engineering"}]'::jsonb,
    'published',
    9,
    '2026-08-01T00:00:00Z'::timestamptz,
    '2026-08-01T00:00:00Z'::timestamptz
),
(
    'a1000000-0000-0000-0000-000000000010',
    'devops-engineer',
    'DevOps & Platform Engineer',
    'Automates cloud infrastructure provisioning, CI/CD deployment pipelines, and system monitoring for reliable continuous delivery.',
    'Cloud & Infrastructure',
    'DevOps and Platform Engineers build the internal developer platforms, automated build pipelines, and infrastructure as code that software engineers rely upon. They champion reliability engineering, zero-downtime deployments, secret management, container orchestration, and real-time observability.',
    '["Write Infrastructure as Code (Terraform, CloudFormation, Pulumi) for multi-environment cloud setups.","Build automated CI/CD pipelines (GitHub Actions, GitLab CI, ArgoCD) for testing and containerized deployments.","Manage container orchestration clusters (Kubernetes, Docker Swarm, ECS) ensuring high availability.","Instrument distributed logging, metric collection, and alerting stacks (Prometheus, Grafana, Datadog).","Enforce cloud security baselines, IAM least-privilege policies, and automated secret rotation."]'::jsonb,
    '["Infrastructure as Code (Terraform, OpenTofu)","CI/CD Pipelines (GitHub Actions, GitLab CI)","Containerization & Orchestration (Docker, Kubernetes)","Cloud Providers (AWS, Google Cloud, Azure)","Linux Administration & Bash Scripting","Observability & Metrics (Prometheus, Grafana, OpenTelemetry)"]'::jsonb,
    '["Programming / Scripting (Python, Go, TypeScript)","Networking Concepts (DNS, VPCs, TLS/SSL, Load Balancing)","Cloud Security & IAM Hardening","Database Backup & Disaster Recovery Automation","Cost Optimization (FinOps)"]'::jsonb,
    'DevOps Engineers frequently transition from System Administration, Backend Engineering, or Network Engineering after acquiring cloud certification and modern infrastructure automation expertise.',
    '[{"stage":"Entry / Junior","title":"Junior Cloud / DevOps Engineer","description":"Maintains CI/CD scripts, reviews pull requests for build stability, and monitors cloud alerts under supervision."},{"stage":"Mid-Level","title":"DevOps & Platform Engineer","description":"Provisions new infrastructure modules in Terraform, configures Kubernetes workloads, and optimizes pipeline build times."},{"stage":"Senior","title":"Senior Platform Engineer / SRE","description":"Architects fault-tolerant multi-region clusters, leads incident response post-mortems, and builds internal developer platforms."},{"stage":"Lead / Staff","title":"Principal Infrastructure Architect","description":"Defines organizational cloud strategy, long-term disaster recovery protocols, and enterprise infrastructure governance."}]'::jsonb,
    '[{"slug":"cloud-architect","title":"Cloud Solutions Architect","career_area":"Cloud & Infrastructure"},{"slug":"backend-engineer","title":"Backend Engineer","career_area":"Software Engineering"},{"slug":"cybersecurity-analyst","title":"Cybersecurity Analyst","career_area":"Security & Compliance"}]'::jsonb,
    'published',
    10,
    '2026-08-01T00:00:00Z'::timestamptz,
    '2026-08-01T00:00:00Z'::timestamptz
),
(
    'a1000000-0000-0000-0000-000000000011',
    'cloud-architect',
    'Cloud Solutions Architect',
    'Designs secure, scalable, and cost-effective enterprise cloud architectures across public and hybrid cloud environments.',
    'Cloud & Infrastructure',
    'Cloud Solutions Architects design comprehensive enterprise infrastructure patterns. They balance reliability, scalability, security compliance, and financial cost. They guide technical teams on cloud adoption, migration patterns, serverless vs container paradigms, and vendor ecosystem decisions.',
    '["Design high-level cloud architecture blueprints balancing availability, compliance, and budget.","Lead legacy on-premises to cloud migration strategies (lift-and-shift, re-platforming, re-architecting).","Establish governance frameworks for multi-account cloud landing zones, networking, and VPC peering.","Conduct Architecture Reviews (AWS Well-Architected Framework, Azure Well-Architected).","Advise leadership on vendor lock-in mitigation, SLA commitments, and technology investments."]'::jsonb,
    '["Enterprise Cloud Architecture (AWS, Azure, GCP)","Cloud Networking (Transit Gateways, VPNs, ExpressRoute, Direct Connect)","Security Architecture & Compliance (SOC2, ISO 27001, HIPAA)","High Availability & Disaster Recovery Architecture (RTO/RPO)","Cost Governance & Cloud Economics (FinOps)","Technical Blueprinting & Executive Advisory"]'::jsonb,
    '["Infrastructure as Code (Terraform, Bicep)","Container & Serverless Paradigms","Identity Federation (SAML 2.0, OIDC, Active Directory)","Data Storage & Tiering Strategies","Vendor Assessment & Negotiation"]'::jsonb,
    'Architects typically possess over 8 years of technical experience, progressing from Systems Administration, Network Engineering, DevOps, or Senior Software Engineering with professional cloud certifications (AWS Solutions Architect Professional, etc.).',
    '[{"stage":"Senior Specialist","title":"Senior Cloud Engineer / Tech Lead","description":"Implements complex cloud solutions and reviews individual service architecture proposals."},{"stage":"Principal Architect","title":"Cloud Solutions Architect","description":"Owns end-to-end cloud designs for major enterprise programs, ensuring compliance and scalability."},{"stage":"Enterprise Architect","title":"Enterprise Cloud Architect","description":"Governs corporate-wide cloud topology, standardizes technology vendors, and reports directly to CTO / CIO."}]'::jsonb,
    '[{"slug":"devops-engineer","title":"DevOps & Platform Engineer","career_area":"Cloud & Infrastructure"},{"slug":"backend-engineer","title":"Backend Engineer","career_area":"Software Engineering"},{"slug":"cybersecurity-analyst","title":"Cybersecurity Analyst","career_area":"Security & Compliance"}]'::jsonb,
    'published',
    11,
    '2026-08-01T00:00:00Z'::timestamptz,
    '2026-08-01T00:00:00Z'::timestamptz
),
(
    'a1000000-0000-0000-0000-000000000012',
    'cybersecurity-analyst',
    'Cybersecurity Analyst',
    'Protects systems and digital assets by detecting vulnerabilities, monitoring security incidents, and enforcing security policies.',
    'Security & Compliance',
    'Cybersecurity Analysts defend organizations against digital threats, malware, data breaches, and insider risks. They monitor intrusion detection systems, perform vulnerability assessments, investigate security alerts, and ensure organizational adherence to data protection standards.',
    '["Monitor Security Information and Event Management (SIEM) consoles for anomalous activity and intrusion indicators.","Conduct regular vulnerability scanning, penetration testing coordination, and patch validation.","Triage and investigate suspected phishing attacks, credential compromise, and malware incidents.","Develop incident response playbooks and participate in red/blue team security drills.","Assist with regulatory compliance audits (GDPR, Cyber Essentials, ISO 27001, SOC2)."]'::jsonb,
    '["Security Monitoring & SIEM (Splunk, Microsoft Sentinel, Elastic Security)","Vulnerability Management & Scanning (Nessus, Qualys, OpenVAS)","Network Security (Firewalls, IDS/IPS, Packet Analysis with Wireshark)","Incident Response & Forensic Fundamentals","Threat Intelligence & MITRE ATT&CK Framework","Identity & Access Security (MFA, Privileged Access Management)"]'::jsonb,
    '["Python / Bash Scripting for Security Automation","Cloud Security Baselines (AWS GuardDuty, CloudTrail)","Application Security Fundamentals (OWASP Top 10)","Security Compliance Frameworks (Cyber Essentials, ISO 27001)","Technical Documentation & Post-Incident Reporting"]'::jsonb,
    'Cybersecurity Analysts often enter through degrees in Cybersecurity or Computer Science, transitions from IT Support / Network Administration, or specialized cybersecurity certifications (CompTIA Security+, CySA+, CEH, CISSP).',
    '[{"stage":"Entry / Junior","title":"SOC Analyst Tier 1","description":"Monitors incoming security alerts, filters false positives, and escalates potential threats to Tier 2."},{"stage":"Mid-Level","title":"Cybersecurity Analyst / SOC Tier 2","description":"Conducts deep forensic investigations, tunes SIEM detection rules, and remediates confirmed vulnerabilities."},{"stage":"Senior","title":"Senior Security Analyst / Incident Responder","description":"Leads crisis incident response, architects threat hunting operations, and audits application security postures."},{"stage":"Lead / Staff","title":"Security Operations Lead / CISO Advisor","description":"Oversees security team operations, defines enterprise risk appetite, and manages executive incident disclosures."}]'::jsonb,
    '[{"slug":"devops-engineer","title":"DevOps & Platform Engineer","career_area":"Cloud & Infrastructure"},{"slug":"backend-engineer","title":"Backend Engineer","career_area":"Software Engineering"},{"slug":"cloud-architect","title":"Cloud Solutions Architect","career_area":"Cloud & Infrastructure"}]'::jsonb,
    'published',
    12,
    '2026-08-01T00:00:00Z'::timestamptz,
    '2026-08-01T00:00:00Z'::timestamptz
),
(
    'a1000000-0000-0000-0000-000000000013',
    'qa-automation-engineer',
    'QA Automation Engineer',
    'Designs automated testing frameworks and regression suites to ensure software reliability, functional accuracy, and quality.',
    'Quality Engineering',
    'QA Automation Engineers build the automated test harnesses that ensure applications work accurately under all conditions. They write test scripts for browser UIs, REST APIs, and background processes, preventing software regressions and ensuring high product quality prior to customer releases.',
    '["Design, build, and maintain automated test frameworks for end-to-end and API testing (Playwright, Cypress, Postman).","Create detailed test plans, edge-case test matrices, and regression suites based on feature requirements.","Integrate automated test runs into CI/CD pipelines to block failing builds prior to staging or production deployments.","Investigate bug reports, isolate root causes, and provide reproducible test cases for development teams.","Execute performance, load, and accessibility (a11y) audits across core user journeys."]'::jsonb,
    '["Test Automation Frameworks (Playwright, Cypress, Selenium)","TypeScript / JavaScript or Python for Testing","API Testing (Postman, REST Assured, Supertest)","CI/CD Pipeline Integration for Automated Tests","Test Case Design & Boundary Value Analysis","Bug Tracking & Root Cause Reporting"]'::jsonb,
    '["Performance & Load Testing (k6, JMeter)","Accessibility Testing (Axe, Lighthouse)","SQL for Test Data Seeding and Verification","Git & Version Control Workflows","Cross-Browser & Device Matrix Testing"]'::jsonb,
    'QA Automation Engineers often enter through manual QA / software testing roles after mastering programming languages and automation frameworks, or graduate from Computer Science programs with an affinity for software quality.',
    '[{"stage":"Entry / Junior","title":"Junior QA Tester / Automation Associate","description":"Executes manual test cases, writes automated tests for existing features under senior guidance, and files bug tickets."},{"stage":"Mid-Level","title":"QA Automation Engineer","description":"Maintains automated regression suites, builds test fixtures, and automates API testing in CI/CD pipelines."},{"stage":"Senior","title":"Senior Quality Engineer","description":"Architects organization-wide testing frameworks, defines quality metrics, and introduces load/security testing."},{"stage":"Lead / Staff","title":"Head of Quality Assurance / Lead Test Architect","description":"Shapes enterprise release quality gates, mentors test engineering teams, and aligns test strategies across squads."}]'::jsonb,
    '[{"slug":"frontend-engineer","title":"Frontend Engineer","career_area":"Software Engineering"},{"slug":"backend-engineer","title":"Backend Engineer","career_area":"Software Engineering"},{"slug":"technical-project-manager","title":"Technical Project Manager","career_area":"Product & Delivery"}]'::jsonb,
    'published',
    13,
    '2026-08-01T00:00:00Z'::timestamptz,
    '2026-08-01T00:00:00Z'::timestamptz
);

COMMIT;
