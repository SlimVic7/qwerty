# QWERTY Cumulative Master Register

## Stage 0: Architecture & Project Memory
- [x] Product Specification (`docs/PRODUCT_SPEC.md`)
- [x] Technical Architecture (`docs/ARCHITECTURE.md`)
- [x] Database Schema & Migrations (`docs/DATABASE.md`)
- [x] AI Architecture & Cost Model (`docs/AI_ARCHITECTURE.md`)
- [x] Security & Compliance (`docs/SECURITY.md`)
- [x] Architecture Decision Records (`docs/DECISIONS.md`)
- [x] Roadmap & Build Playbook (`docs/ROADMAP.md`)

## Stage 1: Full-Stack App Shell & Authentication
- [x] Express + Vite composition root (`server.ts`, `server/app.ts`)
- [x] Supabase Authentication integration (Email/Password, JWT)
- [x] Role-based routing and middleware (`candidate`, `recruiter`, `admin`, `super_admin`)
- [x] UI brand foundation (Deep green `#0B3D2E`, white, `#111111`)

## Stage 2: Public Jobs & Operations Job Board
- [x] Public Job Listings & Detail Pages (`/jobs`, `/jobs/:slug`)
- [x] Operations Job Management (`/0ps26/jobs`)
- [x] Structured Job Editor with multi-section drafting
- [x] Role-restricted job lifecycle states (`draft`, `published`, `archived`)

## Stage 3: Bulk Job Importer & Normalization
- [x] Bulk Job Import Engine (`/0ps26/jobs/imports`)
- [x] Multi-source ingestion & batch parsing
- [x] Duplicate detection & review workbench
- [x] Migration to published catalog

## Stage 4: Candidate Profile & Approved CV Intake
- [x] Private Candidate Profile Workspace (`/candidate/profile`)
- [x] Multi-format CV intake (PDF, DOC, DOCX magic bytes validation)
- [x] Structured CV extraction with Gemini & fallback
- [x] Candidate approval loop with immutable `reviewed_data` & `applied_at` snapshots

## Stage 5.1: Deterministic & Semantically Refined Job Alignment Engine
- [x] Authoritative ruleset `job-alignment-v1.3`
- [x] Criterion classification (`TECHNICAL_SKILL`, `DOMAIN_KNOWLEDGE`, `EXPERIENCE_DURATION`, `EDUCATION`, `CERTIFICATION`, `PRACTICAL_EXPERIENCE`, `PROFESSIONAL_ACTION`, `SOFT_SKILL`, `STRUCTURAL`)
- [x] Deterministic scoring with zero LLM per-match overhead
- [x] Immutable alignment storage (`candidate_job_alignments`)

## Stage 5.2: Evidence-Safe CV Tailoring
- [x] Engine version `cv-tailoring-v1.2`
- [x] Truthful, hallucination-safe CV tailoring
- [x] Evidence manifest verification (claims must map to approved CV evidence)
- [x] Controlled public rollout toggle (`CV_TAILORING_PUBLIC_ENABLED` defaulting to `false`)

## Stage 5.3: Deterministic Skills Gap & Development Insights
- [x] Engine version `skills-gap-v1`
- [x] Zero AI runtime execution
- [x] Evidence-safe guidance semantics (never claims candidate "lacks" ability, only that approved profile lacks evidence)
- [x] Strictly separated development guidance categories:
  - `BEHAVIORAL_OR_EVIDENCE_LIMITED` (`STRENGTHEN_EVIDENCE`)
  - `CERTIFICATION_OR_EQUIVALENT` (preserves both pathways)
  - `CERTIFICATION_ONLY` (`CERTIFICATION_PATHWAY`)
  - `EDUCATION` (`ACADEMIC_QUALIFICATION`, courses do not substitute degrees)
  - `EXPERIENCE_DURATION` (`EXPERIENCE_TENURE`, courses do not substitute tenure)
  - `TECHNICAL_SKILL` (`HANDS_ON_TECHNICAL`)
  - `DOMAIN_KNOWLEDGE` (`STRUCTURED_DOMAIN_LEARNING`)
  - `PRACTICAL_EXPERIENCE` (`OPERATIONAL_EXPOSURE`)
  - `PROFESSIONAL_ACTION` (`PROFESSIONAL_EXECUTION`)

## Stage 5.4: Job Alignment History & Comparison (Current)
- [x] Engine version `alignment-history-v1`
- [x] Read-only candidate-private history (`GET /api/candidate/jobs/:jobId/alignment-history`)
- [x] Deterministic snapshot comparison (`GET /api/candidate/jobs/:jobId/alignment-history/compare`)
- [x] Strict classification taxonomy:
  - `DIRECTLY_COMPARABLE` / `CANDIDATE_EVIDENCE_CHANGED`
  - `JOB_CHANGED`
  - `RULESET_CHANGED`
  - `MIXED_SOURCE_CHANGES`
  - `SAME_SNAPSHOT`
  - `INCOMPATIBLE`
- [x] Side-by-side vs progress delta score rules
- [x] Criterion transition mapping (`NEWLY_SUPPORTED`, `STRENGTHENED`, `WEAKENED`, `NO_LONGER_EVIDENCED`, `ADDED_REQUIREMENT`, `REMOVED_REQUIREMENT`, `METHODOLOGY_CHANGED`, `UNCHANGED_*`)
- [x] Historical format resilience (defensive normalizer for older v1–v1.3 records)
- [x] Job Detail card entry & candidate Match History workspace

### Stage 5.4 Pre-Production Items
- Alignment-history benchmark corpus
- Historical ruleset compatibility tests
- Historical JSON-shape regression corpus
- Comparison accuracy monitoring
- Candidate interpretation/usability review
- Accessibility review
- History endpoint load testing
- Pagination/load validation
- Privacy review for historical evidence summaries

### Future Enhancements
- Visual alignment trend charts
- Long-term career progression timeline
- Saved comparison snapshots
- Profile-change annotations
- Candidate notes on why profile changed
- Job-version diff visualization
- Ruleset release notes
- Cross-job alignment history
- Career progression analytics
- Premium longitudinal career insights
- Immediate / instant job alerts (frequency taxonomy deferred from Stage 6.3)
- Salary filtering for job alerts (salary criteria deferred from Stage 6.3)
- Candidate-wide job search preferences table (`candidate_job_preferences` deferred unless explicitly justified by future dashboard requirements)
- Candidate application tracking deferred (no native application tracking; outbound apply semantics preserved)
- Normalize public.jobs.experience_level into a governed canonical taxonomy before enabling experience-level Job Alert filtering. (Observed legacy values: NULL, blank, '1-3 years', '3-5 years', 'Mid level'; deferred from Stage 6.3 to avoid silent mapping)

## Stage 6.3: Candidate Job Alerts
- [x] Candidate-private job alerts table (`public.candidate_job_alerts`, migration `00016_stage6_3_job_alerts.sql` prepared, not deployed)
- [x] Name length constraint enforced at <= 80 characters
- [x] Frequency taxonomy restricted to `daily`, `weekly` (default: `daily`)
- [x] Multi-criteria deterministic AND matching (keywords, location_query, workplace_type, employment_type)
- [x] Zero AI runtime execution / no percentage match scoring / no ranking claims
- [x] Least-privilege RLS: authenticated SELECT own rows; server API mediated mutations; direct INSERT/UPDATE/DELETE denied
- [x] Redundant user_id-only index removed (leveraging user_active and created_at composite indexes)
- [x] Server store (`JobAlertsStore`) & candidate API (`/api/candidate/job-alerts`)
- [x] Candidate UI workspace (`/candidate/job-alerts`) with live match discovery & Coming Soon email notice

## Stage 6.4: Candidate Home Dashboard
- [x] Canonical route `/candidate/dashboard` & navigation entry points
- [x] Unified server aggregation service (`CandidateDashboardStore`) & endpoint (`GET /api/candidate/dashboard`)
- [x] Aggregated candidate activity: profile readiness, saved jobs (Stage 6.1), job alerts (Stage 6.3), recent alignments (Stage 5)
- [x] Unique matching jobs calculation across active alerts without duplicate inflation
- [x] Authoritative published-job retrieval: bounded server-side paging chunks (`CHUNK_SIZE = 100`) evaluating ALL `status = 'published'` jobs (eliminating 200-job ceiling)
- [x] Deterministic priority Next Actions engine (rule-based, top 3 actions, zero AI)
- [x] Dedicated new candidate empty state & experienced candidate summary views
- [x] Zero database migration requirement (all data sourced from existing tables)
- [x] Resilient failure isolation across sections
- [x] Strict candidate data ownership & auth enforcement (`requireAuth`, `requireRole(['candidate'])`)

### Stage 6.4 Pre-Production Items
- Dashboard aggregation performance/load testing
- Caching strategy for published job evaluation if vacancy catalog or candidate concurrency expands (e.g. short TTL redis/memory cache of published jobs or materialized matches)
- Dashboard observability
- Partial-section failure monitoring
- Mobile UX QA
- Dashboard conversion analytics
- Saved-job-to-alignment funnel analytics
- Alert-match-to-job-view funnel analytics
- Dashboard privacy review
- Retention/account-deletion validation
- Accessibility audit

## Stage 7.1: Career Role Library
- [x] Curated Career Role Library schema (`public.career_roles`, migration `00017_stage7_1_career_role_library.sql` prepared, not deployed)
- [x] Hardened schema constraints: safe `draft` status default, governed 6-area taxonomy check (`chk_career_roles_career_area`), 5 JSONB array typing checks (`jsonb_typeof = 'array'`), non-empty text checks on `overview` and `typical_background`, and non-negative `display_order` check
- [x] Redundant `idx_career_roles_slug` removed (leveraging primary UNIQUE index); retained explicit performance indexes (`idx_career_roles_status_order`, `idx_career_roles_area`)
- [x] Structured role content model: `id`, `slug`, `title`, `short_summary`, `career_area`, `overview`, `responsibilities`, `core_skills`, `supporting_skills`, `typical_background`, `career_progression`, `related_roles`, `status`, `display_order`
- [x] Strictly ZERO AI runtime calls, zero dynamic salary claims, zero hallucinations
- [x] Authoritative database source of truth in production (fails closed with `DATABASE_ERROR` on failure); development/test fallback strictly environment-gated
- [x] Candidate-private API endpoints under `/api/candidate/career`:
  - `GET /api/candidate/career/roles` (area filtering and multi-attribute search)
  - `GET /api/candidate/career/roles/:slug` (full role profile with hydrated related roles)
  - `GET /api/candidate/career/areas` (disciplines with role count distribution)
- [x] Locked Candidate Access Model:
  - Career Hub & Role Library are private candidate features
  - Anonymous visitors redirected to `/login?returnTo=...` preserving return target
  - Strict auth enforcement via `requireAuth` and `requireRole(['candidate'])`
- [x] Responsive frontend workspace:
  - `/candidate/career` (Career Hub overview and 4 roadmap pillars)
  - `/candidate/career/roles` (Interactive Role Library with search and area filters)
  - `/candidate/career/roles/:slug` (Comprehensive Role Profile with timeline progression and related roles)
  - Navigation integrated into Candidate Layout sidebar and Public Layout

### Stage 7.1 Content Inventory & Future Taxonomy Expansion
- Launch catalog contains exactly 13 curated starter roles across 6 technical disciplines (`Software Engineering`, `Data & Analytics`, `Product & Delivery`, `Cloud & Infrastructure`, `Security & Compliance`, `Quality Engineering`).
- The initial launch library is deliberately technology-heavy to align with active vacancy data.
- Subsequent stages will expand the governed career area taxonomy and role library into broader business and governance disciplines:
  - Audit & Risk
  - Finance
  - Business Analysis
  - Compliance
  - Operations
  - Customer Experience

## Stage 7.2: Skill Roadmaps
- [x] Curated Skill Roadmaps data model (`public.career_role_roadmaps` and `public.career_role_roadmap_items`, migration `00018_stage7_2_skill_roadmaps.sql` prepared, not deployed)
- [x] Focused relational design referencing `public.career_roles(id)` via `ON DELETE RESTRICT` (preventing accidental role deletion while roadmaps depend on it); roadmap items cascade on roadmap deletion (`ON DELETE CASCADE`)
- [x] Governed roadmap versioning (`version integer NOT NULL DEFAULT 1`, `version_label text NOT NULL DEFAULT 'v1'`, unique constraint on `(career_role_id, version)`)
- [x] Roadmap status lifecycle: `draft`, `published`, `archived` with safe `draft` default; server-enforced publication filter (`status = 'published'`)
- [x] Structured 3-stage progression taxonomy: `foundation`, `core`, `advanced` with non-negative deterministic display ordering (`uq_career_role_roadmap_items_order`)
- [x] Evidence-first skill benchmarking: each item details skill name, category, description ("what it means"), why it matters, competency target outcome, and concrete observable evidence examples (portfolio projects, GitHub repositories, case studies, runbooks, architecture diagrams)
- [x] Content governance: restrained, objective educational tone ("commonly useful", "evidence may include"); zero AI runtime calls, zero speculative salary claims, zero course marketplace links
- [x] Launch coverage: 6 curated high-depth roadmaps across primary tech disciplines:
  - Frontend Engineer (12 skills across Foundation, Core, Advanced)
  - Backend Engineer (12 skills across Foundation, Core, Advanced)
  - Data Analyst (10 skills across Foundation, Core, Advanced)
  - Product Manager (10 skills across Foundation, Core, Advanced)
  - DevOps & Platform Engineer (10 skills across Foundation, Core, Advanced)
  - Cybersecurity Analyst (10 skills across Foundation, Core, Advanced)
- [x] Server-mediated Candidate API:
  - `GET /api/candidate/career/roles/:slug/roadmap` protected by `requireAuth` and `requireRole(['candidate'])`
  - Returns published role summary and published roadmap; returns controlled 200 with `roadmap: null` for roles without published roadmaps; returns controlled 404 `ROLE_NOT_FOUND` for invalid slugs
- [x] Least-privilege database security:
  - Direct table privileges revoked for `PUBLIC`, `anon`, and `authenticated`
  - RLS enabled on both roadmap tables; `service_role` retains minimum required CRUD
- [x] Responsive frontend workspace:
  - `SkillRoadmapView` component with stage-based segmented filtering, expandable detail panels, and zero-pill typographic discipline
  - Deep integration into `CareerRoleDetailPage` with tabbed navigation ("Role Benchmark" and "Skill Roadmap")
  - Dedicated direct route `/candidate/career/roles/:slug/roadmap` and public redirect `/career/roles/:slug/roadmap`
  - Restrained fallback ("Roadmap coming soon.") when role has no published roadmap yet
- [x] Zero side effects: browsing roadmaps produces zero CV mutations, zero saved jobs, zero alerts, zero skills gap, and zero application records

### Stage 7.2 Pre-Production Items
- Roadmap editorial ownership
- Roadmap review cadence
- Skill taxonomy governance
- Roadmap versioning governance
- Roadmap deprecation/archival
- Content accuracy QA
- Role-roadmap consistency reviews
- Mobile UX QA
- Accessibility audit
- Roadmap analytics
- Candidate engagement analytics

### Stage 7.2 Future Items
- Roadmap progress tracking
- Personalized roadmaps
- Profile-to-roadmap evidence mapping
- Skills-gap-to-roadmap mapping
- Roadmap comparison
- Role transition roadmaps
- AI Career Coach

## Stage 7.3: Learning Resources
- [x] Curated Learning Resources data model (`public.career_learning_resources`, migration `00019_stage7_3_learning_resources.sql` prepared, not deployed)
- [x] Relational schema referencing `public.career_role_roadmap_items(id)` via `ON DELETE RESTRICT` (preventing accidental deletion of roadmap items while learning resources depend on them)
- [x] Governed resource taxonomy (`documentation`, `guide`, `article`, `video`, `lab`, `practice`, `standard`, `reference`)
- [x] Governed access model (`free`, `free_account_required`) with zero paid-course marketplace semantics
- [x] Governed status lifecycle (`draft`, `published`, `archived`) with safe `draft` default and server-enforced publication filter
- [x] Deterministic ordering per roadmap item (`UNIQUE (roadmap_item_id, display_order)`)
- [x] URL safety constraint: HTTPS required, strict scheme verification, zero internal or whitespace URLs
- [x] Content governance: strictly ZERO AI runtime calls, zero dynamic salary claims, zero provider rankings ("#1", "best", "top choice"), zero affiliate tracking or tracking parameters
- [x] Provider neutrality: objective educational material from official documentation, standards bodies, open-source projects, and established references
- [x] Launch catalog: 47 curated high-quality learning resources covering representative Foundation, Core, and Advanced skills across all 6 launch roadmaps (Frontend Engineer, Backend Engineer, Data Analyst, Product Manager, DevOps & Platform Engineer, Cybersecurity Analyst)
- [x] Server-mediated Candidate API:
  - `GET /api/candidate/career/roles/:slug/roadmap/resources` protected by `requireAuth` and `requireRole(['candidate'])`
  - Returns roadmap hierarchy with published learning resources grouped under relevant roadmap items
  - `GET /api/candidate/career/roles/:slug/roadmap/items/:itemId/resources` for item-level resource retrieval
  - Unknown role returns controlled 404 `ROLE_NOT_FOUND`; role without roadmap returns controlled 200 with `roadmap: null`; anonymous returns 401; non-candidate returns 403; database errors fail closed with 500
- [x] Least-privilege database security:
  - Direct table privileges revoked for `PUBLIC`, `anon`, and `authenticated`
  - RLS enabled; `service_role` retains only SELECT, INSERT, UPDATE, DELETE (no TRUNCATE, REFERENCES, TRIGGER)
  - Automatic `updated_at` trigger attached to `public.set_current_timestamp_updated_at()`
- [x] Responsive frontend workspace:
  - `SkillRoadmapView` component displays curated learning resources inside expanded skill items with neutral badges, descriptions, and safe external links (`target="_blank" rel="noopener noreferrer"`)
  - Integration with `CareerRoleDetailPage` tabbed roadmap navigation
  - Zero side effects: browsing learning resources causes zero state mutations, zero candidate scoring, zero tracking

### Stage 7.3 Deferred & Operational Governance Backlog Items
- Resource editorial ownership
- Resource review cadence
- Broken-link monitoring
- Resource freshness monitoring
- Provider/source governance
- Content licensing review
- Localization
- Resource analytics
- Outbound click analytics/privacy review
- Accessibility review
- Mobile UX QA
- Resource archival/deprecation workflow

## Stage 7.4: Course Recommendations
- [x] Curated Course Recommendations data model (`public.career_course_recommendations`, migration `00020_stage7_4_course_recommendations.sql` prepared, not deployed)
- [x] Relational schema referencing `public.career_role_roadmap_items(id)` via `ON DELETE RESTRICT`
- [x] Governed access model (`free`, `free_account_required`) with zero paid-course marketplace semantics
- [x] Launch catalog: 24 curated courses (4 courses across foundation, core, and advanced skills for each of the 6 launch career roles)
- [x] Content governance: strictly ZERO AI runtime calls, zero dynamic salary claims, zero provider rankings, zero affiliate tracking or marketing query parameters
- [x] Server-mediated Candidate API:
  - `GET /api/candidate/career/roles/:slug/courses` protected by `requireAuth` and `requireRole(['candidate'])`
  - `GET /api/candidate/career/roles/:slug/roadmap/items/:itemId/courses` for item-level course retrieval
  - Unknown role returns controlled 404 `ROLE_NOT_FOUND`; role without roadmap returns controlled 200 with `roadmap: null`; anonymous returns 401; non-candidate returns 403; database errors fail closed with 500
- [x] Least-privilege database security:
  - Direct table privileges revoked for `PUBLIC`, `anon`, and `authenticated`
  - RLS enabled; `service_role` retains only SELECT, INSERT, UPDATE, DELETE (no TRUNCATE, REFERENCES, TRIGGER)
  - Automatic `updated_at` trigger attached to `public.set_current_timestamp_updated_at()`
- [x] Responsive frontend workspace:
  - `CareerRoleCoursesView` component displays curated courses with provider name, description, why this course, access type, difficulty badge, and safe external links (`target="_blank" rel="noopener noreferrer"`)
  - Integration with `CareerRoleDetailPage` tabbed navigation

## Stage 7.5: Personalized Development Roadmap
- [x] Candidate Development Plans data model (`public.candidate_development_plans` and `public.candidate_development_plan_items`, migration `00021_stage7_5_personalized_development_roadmaps.sql` prepared, not deployed)
- [x] Preflight and post-verification SQL scripts prepared: `supabase/preflight_00021.sql` and `supabase/post_verify_00021.sql`
- [x] Relational schema integrity:
  - `candidate_development_plans` references `public.profiles(id)` via `ON DELETE RESTRICT`
  - `candidate_development_plans` references `public.career_roles(id)` via `ON DELETE RESTRICT`
  - `candidate_development_plans` references `public.career_role_roadmaps(id)` via `ON DELETE RESTRICT` (version immutable at plan generation time)
  - `candidate_development_plan_items` references `public.candidate_development_plans(id)` via `ON DELETE CASCADE`
  - `candidate_development_plan_items` references `public.career_role_roadmap_items(id)` via `ON DELETE RESTRICT`
- [x] History preservation and single active plan guarantee:
  - Partial unique index `uq_candidate_development_plans_active` on `(user_id, career_role_id) WHERE status = 'active'`
  - On regeneration, existing active plan is archived (`status = 'archived'`, `archived_at = CURRENT_TIMESTAMP`) and new active plan created
  - Historical plans preserved indefinitely
- [x] Classification taxonomy (deterministic, inspectable, evidence-safe):
  - `evidence_found`: Explicit candidate evidence found in candidate profile, CV, or parsed CV data
  - `development_focus`: Sufficient explicit evidence not found in available candidate data
  - `review_needed`: Evidence is ambiguous or insufficient for deterministic classification
- [x] Priority band taxonomy:
  - `now`: Foundational development focus skills & early core development focus
  - `next`: Later core development focus & review needed skills
  - `later`: Advanced development focus skills
  - `maintain`: Evidence found skills across all stages
  - Items sorted within bands preserving: foundation -> core -> advanced -> Stage 7.2 display_order
- [x] Strict evidence-safe language:
  - Prohibited terms banned across engine and UI: "Mastered", "Expert", "Qualified", "Unqualified", "Failed", "Not competent", "Job ready", "Guaranteed gap", "Deficient", "Weak candidate"
  - Absence of evidence is explicitly NOT presented as evidence of absence: "We did not find sufficient evidence for this skill in the information currently available to QWERTY."
  - Explicit educational disclaimer: development guide only; not a hiring assessment, competency certification, or hiring guarantee
- [x] Strict Zero-AI requirement:
  - 0 Gemini runtime calls, 0 LLM calls, 0 embeddings, 0 semantic vector search, 0 prompts, 0 generated narrative advice, 0 AI candidate ranking
  - 0 arbitrary 0-100 readiness scores, 0 hiring probability percentages
  - Ruleset identifier: `personalized-development-roadmap-v1`
- [x] Feature Flag control:
  - `PERSONALIZED_DEVELOPMENT_ROADMAP_PUBLIC_ENABLED` declared in `server/config/featureFlags.ts` (default: `false`)
  - Production UI displays "Personalized Development Roadmap — Coming Soon" when disabled
  - Controlled override supported via `x-dev-preview: true` or environment variable for engineering/test environments
  - Zero billing or Stripe dependencies
- [x] Server-mediated Candidate API:
  - `GET /api/candidate/career/roles/:slug/development-plan` protected by `requireAuth` and `requireRole(['candidate'])`
  - `POST /api/candidate/career/roles/:slug/development-plan/generate` (and alias `POST /api/candidate/career/roles/:slug/development-plan`)
  - Transaction-safe regeneration pipeline
- [x] Least-privilege database security:
  - RLS enabled on both tables
  - Zero direct client access policies; `PUBLIC`, `anon`, and `authenticated` privileges revoked
  - `service_role` granted exactly SELECT, INSERT, UPDATE, DELETE (TRUNCATE, REFERENCES, TRIGGER omitted)
  - Automatic `updated_at` triggers attached to `public.set_current_timestamp_updated_at()`
- [x] Frontend workspace integration:
  - `PersonalizedDevelopmentPlanView.tsx` component with summary metrics, priority band filter tabs (All, NOW, NEXT, LATER, MAINTAIN), evidence analysis, Stage 7.3 learning resources, Stage 7.4 course recommendations, and educational disclaimers
  - Integrated as tab in `CareerRoleDetailPage.tsx` and routed in `Router.tsx` (`/candidate/career/roles/:slug/plan` and redirect `/career/roles/:slug/plan`)

### Future Roadmap (NOT Stage 7.5)
- Stage 7.6: AI Career Coach (DO NOT BEGIN)
- Cross-role roadmap comparison
- Target role transition gap modeling

