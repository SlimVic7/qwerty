# QWERTY Architecture Decision Log

**Purpose:** Record important product/technical decisions so Google AI Studio or future developers do not silently reverse them while implementing features.

**Rule:** A material change requires a new ADR. Do not rewrite previous ADR history to make a new decision look like the original one.

Statuses:

- **Accepted** — current project rule.
- **Proposed** — under consideration.
- **Superseded** — replaced by a later ADR.
- **Deferred** — intentionally postponed.

---

## ADR-001 — Build a modular monolith first

**Status:** Accepted  
**Date:** 2026-08-17

### Decision

QWERTY begins as one full-stack deployable application with strong internal modules rather than separate microservices.

### Why

- small operating/development team;
- cheaper deployment/observability;
- easier AI Studio iteration;
- simpler transactions across jobs/applications/users;
- scale does not currently justify distributed complexity.

### Revisit when

A specific module has materially different scaling, reliability or deployment needs that cannot be handled cleanly inside the monolith.

---

## ADR-002 — PostgreSQL is the primary business database

**Status:** Accepted

### Decision

Use PostgreSQL for jobs, profiles, applications, versions, CMS content, AI usage and audit data.

### Why

The product is highly relational and benefits from constraints, transactions, mature indexing and row-level controls.

### Consequence

Do not replace the core application with Firestore simply because AI Studio can provision it automatically.

---

## ADR-003 — Supabase is the preferred initial PostgreSQL/Auth/Storage platform

**Status:** Accepted, replaceable

### Decision

Use Supabase initially where it reduces setup cost/complexity, while keeping application business logic portable.

### Why

- PostgreSQL;
- managed authentication;
- private object storage;
- RLS support;
- low initial operational burden.

### Guardrail

Do not scatter Supabase-specific business logic through the UI. Use server/data/service boundaries.

---

## ADR-004 — Google AI Studio builds; GitHub remembers

**Status:** Accepted

### Decision

Use Google AI Studio Build Mode as the primary AI-assisted build environment, but GitHub is the code and documentation source of truth.

### Why

AI-generated changes can be broad. Git history provides independent rollback, review and future developer handoff.

### Rule

Commit after each passing build stage.

---

## ADR-005 — React + TypeScript + Tailwind for the client

**Status:** Accepted

### Decision

Use the React/TypeScript web stack generated/supported by AI Studio and Tailwind CSS for the QWERTY design system.

### Why

Strong ecosystem, component reuse, AI Studio compatibility and responsive UI productivity.

---

## ADR-006 — Server-side Node.js owns business logic and privileged integrations

**Status:** Accepted

### Decision

Gemini, database secret key operations and other privileged integrations run in server-side Node.js/TypeScript.

### Consequence

No Gemini API key or secret key in browser code.

---

## ADR-007 — Central AI Orchestrator

**Status:** Accepted

### Decision

All Gemini calls go through one server-side AI service/orchestrator with operation-specific prompts, schemas, model routing, logging and quotas.

### Consequence

No direct Gemini calls from React components or random controllers.

---

## ADR-008 — Canonical Candidate Profile is the AI truth layer

**Status:** Accepted — critical

### Decision

Candidate-provided/confirmed facts are stored separately from AI-generated wording. The canonical structured profile is the evidence source for CV tailoring, cover letters and interview preparation.

### Why

Trust is a core product differentiator and AI must not rewrite a candidate into a job they do not qualify for.

### Consequence

Generated CV prose never silently backfills new skills, employers, dates, certifications or achievements into the canonical profile.

---

## ADR-009 — Use structured AI output plus application validation

**Status:** Accepted

### Decision

Machine-consumed AI results use schema-constrained structured output and are validated again in application code before persistence.

### Applies to

- job extraction;
- CV parsing;
- fit analysis;
- structured interview preparation;
- other AI-to-database workflows.

---

## ADR-010 — Job imports are staging records; jobs are canonical records

**Status:** Accepted

### Decision

Bulk-pasted jobs first live as ingestion batches/items. Publication is a separate controlled action that creates/updates canonical `jobs` records.

### Why

Allows validation, duplicate handling, error recovery and auditability.

---

## ADR-011 — Human review before uncertain job publication

**Status:** Accepted

### Decision

No blind AI auto-publishing of low-confidence, invalid or possible-duplicate job records.

### Later option

High-confidence auto-publication may only be considered after QWERTY has measured error rates and has safe rollback/moderation, and would require a new ADR.

---

## ADR-012 — Private object storage for CVs

**Status:** Accepted — critical

### Decision

CV files and generated private documents live in private object storage. The database stores metadata/storage keys.

### Consequence

No guessable public CV URLs. Authorized downloads use short-lived signed access.

---

## ADR-013 — Gemini Files API is processing, not permanent storage

**Status:** Accepted

### Decision

QWERTY-owned private storage retains files according to QWERTY policy. Temporary Gemini file uploads are only part of AI processing.

### Why

Provider file lifecycle is temporary and external to QWERTY's retention controls.

---

## ADR-014 — Runtime Gemini model names are configuration

**Status:** Accepted

### Decision

Use `GEMINI_MODEL_FAST`, `GEMINI_MODEL_DEFAULT` and `GEMINI_MODEL_HIGH_QUALITY` or equivalent central configuration rather than hard-coding model IDs throughout features.

### Why

Google model availability, lifecycle and price/performance change frequently.

### Production rule

Do not make a critical production workflow depend exclusively on a preview model without an explicit ADR/risk acceptance.

---

## ADR-015 — Candidate assistance first; recruiter decision AI deferred

**Status:** Accepted

### Decision

The initial product helps candidates understand and prepare applications. It does not automatically reject, rank or select candidates for employers.

### Why

- aligns with QWERTY's current community;
- lower product/compliance risk;
- avoids confusing candidate assistance with employer decisioning;
- keeps human employment decisions outside the MVP.

---

## ADR-016 — No universal ATS score

**Status:** Accepted

### Decision

Do not market a single percentage as “the ATS score.”

### Instead

Separate:

- ATS/document readability checks;
- job-description alignment;
- evidence gaps.

---

## ADR-017 — Career Hub content belongs in a CMS/database

**Status:** Accepted

### Decision

Legacy interview, CV, cover-letter and learning content is audited and migrated into structured editable content, not hard-coded into pages.

### Why

It must stay alive, reviewable and maintainable without a developer.

---

## ADR-018 — Old websites are content sources, not UI templates

**Status:** Accepted

### Decision

Retain useful knowledge and brand continuity, but do not copy old layouts/navigation.

### Brand continuity

Dark green + white + black remain the primary identity.

---

## ADR-019 — WhatsApp/X are distribution channels, not the system of record

**Status:** Accepted

### Decision

Full job information is maintained once in QWERTY. Social/community posts link back to the canonical job page.

### Launch rule

Manual/admin-approved posting is acceptable; automated WhatsApp group posting is not a launch dependency.

---

## ADR-020 — PostgreSQL search before specialist search infrastructure

**Status:** Accepted

### Decision

Use PostgreSQL full-text search, filters and optional trigram indexing for MVP.

### Revisit when

Measured data/query volume or recommendation requirements show a real limitation.

---

## ADR-021 — Stage-gated AI Studio development

**Status:** Accepted — process critical

### Decision

Stages 0–9 are built sequentially. Each stage requires tests/manual gate and a Git commit before later-stage functionality.

### Consequence

Prompts must explicitly say “implement Stage N only.”

---

## ADR-022 — Development and production are separate environments

**Status:** Accepted

### Decision

Use separate database/storage/secrets/configuration for development and production.

### Consequence

Do not test experimental AI Studio code against the production database.

---

## ADR-023 — AI usage and important admin actions are auditable

**Status:** Accepted

### Decision

Maintain `ai_runs` and `audit_events` data to understand cost, failures, model/prompt behavior and operational actions.

### Privacy guardrail

Normal AI logs contain metrics/IDs and redacted errors, not full CV text.

---

## ADR-024 — Cloud Run is an acceptable initial production deployment path

**Status:** Accepted, not exclusive

### Decision

QWERTY may use the managed Cloud Run path from Google AI Studio for beta/production if it satisfies database connectivity, secrets, observability and cost needs.

### Why

It provides a direct supported path from AI Studio's full-stack runtime.

### Revisit when

Operational requirements or cost justify another hosting platform.

---

## ADR-025 — Monetisation follows demonstrated usefulness

**Status:** Accepted

### Decision

Do not block the revival by aggressively paywalling the first useful interaction.

### Sequence

1. restore job supply;
2. restore audience;
3. prove AI/application value;
4. prove repeat usage;
5. test paid quotas, employer posts/promotions or partnerships carefully.

---

# Pending decisions for implementation

The following should be resolved during Stage 0/1 and recorded as new ADRs if material:

1. exact Supabase project/region and backup tier for beta/production;
2. exact authentication providers enabled at launch (email/password, Google sign-in, etc.);
3. exact CV file type/size limits;
4. exact notification provider and whether email launches in MVP or after beta;
5. PDF/DOCX export library/service;
6. initial user AI quotas;
7. production retention periods for original CVs, AI run metadata and deleted accounts;
8. analytics provider/event implementation;
9. final production Gemini model routing after QWERTY regression testing.

---

## ADR-026 — Public Naming
**Status:** Accepted  
**Date:** 2026-08-17

### Decision
The public product name is "QWERTY". "Revival" is internal strategy terminology only and should not be used in user-facing UI.

---

## ADR-027 — Internal Operations Route
**Status:** Accepted  
**Date:** 2026-08-17

### Decision
The internal administrator/recruitment workspace route prefix is `/0ps26` (not `/admin` or `/ops`). This route prefix is an additional obscurity measure and must *never* be treated as an authorization control. 

Future operations access must require an authenticated account, authorized role, server-side authorization, database RLS, sensitive-action audit logging, and MFA for privileged accounts.

---

## ADR-028 — Public Navigation and Roles
**Status:** Accepted  
**Date:** 2026-08-17

### Decision
The public navigation bar will not expose internal roles (like "Admin") or generic authenticated states (like "Candidate"). Distinct roles include candidate, admin, recruiter, and super_admin.

---

## ADR-029 — Visual Brand Foundation
**Status:** Accepted  
**Date:** 2026-08-17

### Decision
Core branding uses deep green (`#0B3D2E`), white, and near-black (`#111111`). The UI is clean, professional, and accessible. The Stage 1 interface is an application shell, not the approved final design.

---

## ADR-030 — Supabase Key Modernization
**Status:** Accepted  
**Date:** 2026-08-17

### Decision
Migrated from legacy Supabase keys (`anon` / `service_role`) to modern naming conventions (`publishable` / `secret`). 
- `publishable` keys are client-safe.
- `secret` keys run in trusted server environments only and bypass RLS.
- Normal user requests must still be validated and resolved through RLS where practical.

---

# ADR template

Copy this section for future decisions:

```text
## ADR-XXX — Decision title

Status: Proposed / Accepted / Superseded / Deferred
Date: YYYY-MM-DD

### Context
What problem or trade-off requires a decision?

### Decision
What are we doing?

### Why
Why is this the best current choice?

### Consequences
What becomes easier/harder?

### Revisit when
What evidence or condition should trigger reconsideration?
```
