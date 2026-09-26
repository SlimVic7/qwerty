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
