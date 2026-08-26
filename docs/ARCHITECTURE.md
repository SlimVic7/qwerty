# QWERTY Application Architecture

**Status:** Stage 0 baseline  
**Version:** 1.0  
**Date:** 17 August 2026

---

## 1. Architecture objective

Build a low-fixed-cost, production-capable platform that can be created and iterated in Google AI Studio without becoming dependent on one giant AI-generated codebase that cannot be reasoned about.

The first architecture is a **modular monolith**: one web application/deployment with strong internal boundaries. Services are split only when real traffic, reliability or ownership needs justify it.

---

## 2. Current platform assumptions

As of 17 August 2026, Google AI Studio Build Mode supports full-stack web applications with a React client and Node.js server runtime, server-side secrets, npm packages, external database connections, GitHub export and Cloud Run deployment paths.

Architecture rule: treat AI Studio as the **build environment/agent**, not as the only copy of the product. GitHub is the independent source of truth.

---

## 3. Recommended stack

| Layer | Initial choice | Rule |
|---|---|---|
| Build environment | Google AI Studio Build Mode | Develop stage-by-stage. |
| Source control | GitHub | Commit every passing stage. |
| Client | React + TypeScript + Tailwind CSS | Mobile-first, reusable components. |
| Server | Node.js + TypeScript | Server-side business logic and secrets. |
| Architecture | Modular monolith | Clear modules; no premature microservices. |
| Database | PostgreSQL | Source of truth for relational business data. |
| Initial DB platform | Supabase recommended | PostgreSQL + production auth/storage conveniences. |
| Authentication | Supabase Auth or equivalent | Do not build custom password auth. |
| File storage | Private object storage | DB stores metadata/references, not CV binaries. |
| AI | Gemini API | Access only through server-side AI Orchestrator. |
| Deploy | Cloud Run / approved managed path | Separate dev and prod. |
| Search | PostgreSQL full-text + filters | Add vector/specialist search only when needed. |
| Queue/workflows | Add when async load requires it | Keep interface abstract from day one. |

### Do not hard-code infrastructure unnecessarily

The application should depend on interfaces for AI, storage, email/notifications and queues. Supabase/Cloud Run may be replaced later without rewriting core business rules.

---

## 4. Logical architecture

```text
                        QWERTY USERS
               Visitor / Candidate / Admin
                            |
                            v
                React + TypeScript Client
        Public Site / Candidate Workspace / Admin
                            |
                            v
                Node.js Application Server
     AuthZ / Validation / Business Rules / REST endpoints
         |               |                |
         v               v                v
   PostgreSQL       Private Storage    AI Orchestrator
      |                                     |
      |                                     v
      |                                Gemini API
      |
      +--> audit_events / ai_runs / application history

Background work (introduced as needed):
job imports / notifications / exports / expiry / long AI tasks
```

---

## 5. Source-of-truth rules

1. **PostgreSQL** is the source of truth for application data.
2. **Private object storage** is the source of truth for retained CV/document binaries.
3. **Canonical Candidate Profile** is the source of truth for candidate facts used by AI.
4. **Canonical Job Record** is the source of truth for a published vacancy.
5. WhatsApp/X text is generated from the canonical job; it is not independently maintained job data.
6. AI outputs are not trusted database facts until validated and, where required, reviewed.
7. GitHub is the source of truth for code and project documentation.

---

## 6. Recommended project structure

AI Studio may generate slightly different root files. Preserve these **boundaries** even if exact directory names vary.

```text
/
├── src/                         # React client
│   ├── app/                     # routing/app shell
│   ├── components/              # reusable UI
│   ├── features/
│   │   ├── jobs/
│   │   ├── candidate-profile/
│   │   ├── applications/
│   │   ├── career/
│   │   └── admin/
│   ├── hooks/
│   ├── lib/
│   └── styles/
│
├── server/
│   ├── app.ts
│   ├── config/                  # validated environment configuration
│   ├── middleware/              # auth, authz, errors, rate limits
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── jobs/
│   │   ├── job-imports/
│   │   ├── candidate-profile/
│   │   ├── cv/
│   │   ├── applications/
│   │   ├── career/
│   │   ├── notifications/
│   │   ├── distribution/
│   │   └── admin/
│   ├── services/
│   │   ├── ai/
│   │   ├── storage/
│   │   ├── notifications/
│   │   └── export/
│   └── db/
│
├── shared/
│   ├── schemas/                 # Zod/shared contracts
│   ├── types/
│   └── constants/
│
├── supabase/
│   └── migrations/              # or database/migrations
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
│
├── docs/
│   ├── PRODUCT_SPEC.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── AI_ARCHITECTURE.md
│   ├── SECURITY.md
│   ├── ROADMAP.md
│   └── DECISIONS.md
│
└── scripts/
```

---

## 7. Module boundaries

### Auth / Users

Owns:
- account/session integration;
- profile identity metadata;
- role resolution;
- account status/preferences.

Must not own:
- CV parsing;
- job data;
- application business logic.

### Jobs

Owns:
- canonical job records;
- categories/skills associations;
- public search/read;
- admin CRUD;
- lifecycle: draft/published/closed/expired/archived.

### Job Imports

Owns:
- raw ingestion batches;
- item splitting;
- AI extraction requests;
- validation results;
- duplicate candidates;
- review state;
- promotion into canonical jobs.

Rule: job-import records are staging data, not public jobs.

### Candidate Profile

Owns:
- structured candidate facts;
- candidate confirmation/editing;
- fact/evidence identifiers;
- profile completeness.

Rule: this module is the truth layer for candidate facts.

### CV

Owns:
- file metadata;
- parsing workflow coordination;
- CV versions;
- export metadata.

It reads canonical candidate facts but must not silently mutate them from generated CV text.

### Applications

Owns:
- saved/applied job records;
- status history;
- deadlines;
- interviews;
- notes/goals associated with job search.

### Career

Owns:
- Career Hub articles;
- categories/tags;
- learning resources;
- last-reviewed/last-verified metadata.

### Distribution

Owns:
- channel-ready generated copy;
- canonical job URL association;
- optional scheduling metadata later.

### AI service

Owns:
- Gemini SDK adapter;
- prompts/templates;
- model routing;
- structured output schemas;
- retries/timeouts;
- safety/truth guardrails;
- usage logging.

Business modules request operations. They do not call Gemini directly.

---

## 8. API shape

The precise URL style may follow the generated framework, but logical boundaries should remain.

```text
/api/v1/auth/*
/api/v1/users/*

/api/v1/jobs
/api/v1/jobs/:jobId
/api/v1/jobs/:jobId/save

/api/v1/applications
/api/v1/applications/:applicationId
/api/v1/applications/:applicationId/events

/api/v1/candidate-profile
/api/v1/cv/upload
/api/v1/cv/versions
/api/v1/cv/versions/:versionId/export

/api/v1/ai/jobs/:jobId/fit
/api/v1/ai/jobs/:jobId/tailor-cv
/api/v1/ai/jobs/:jobId/cover-letter
/api/v1/ai/jobs/:jobId/interview-prep

/api/v1/career/articles
/api/v1/career/resources

/api/v1/admin/jobs/*
/api/v1/admin/job-imports/*
/api/v1/admin/career/*
/api/v1/admin/distribution/*
/api/v1/admin/ai-usage/*
/api/v1/admin/audit/*
```

---

## 9. Request lifecycle

For every mutation:

1. authenticate if required;
2. resolve authorization on server;
3. validate request schema;
4. execute business service;
5. use a database transaction when several records must change atomically;
6. write audit event when action is security/operationally important;
7. return a stable error/response shape;
8. never leak stack traces or secrets to the client.

---

## 10. Bulk job ingestion architecture

```text
Raw paste
   |
   v
job_ingestion_batch (immutable source)
   |
   v
AI split + schema extraction
   |
   v
job_ingestion_items
   |
   +--> validation errors
   +--> duplicate candidates
   +--> confidence/review state
   |
Admin review
   |
   v
Publish transaction
   |
   v
canonical jobs + associations + audit event
   |
   v
distribution copy
```

Rules:

- one bad item must not invalidate the whole batch;
- low-confidence or validation-failed items cannot auto-publish;
- original raw text remains available for review/audit;
- duplicate handling is explicit: update existing / publish new / ignore;
- job publication is an application action, not an AI side effect.

---

## 11. Candidate CV architecture

```text
Private CV file
    |
    v
File metadata + secure processing request
    |
    v
Gemini/document parsing
    |
    v
Structured candidate profile proposal
    |
Candidate edits/confirms
    |
    v
Canonical Candidate Profile
    |
    +--> Fit analysis vs Job
    +--> Job-specific CV version
    +--> Cover letter
    +--> Interview preparation
```

Generated wording is versioned separately from source facts.

---

## 12. Async/background work

Do not create a distributed queue system before it is needed, but design long-running operations behind job/service interfaces.

Likely async candidates:

- large bulk imports;
- CV/document parsing;
- PDF/DOCX generation;
- email/notification delivery;
- scheduled job expiry checks;
- link/resource verification;
- large AI batches.

The first implementation may execute small jobs synchronously if response times remain acceptable, but the business service must be movable to a queue without changing controllers/UI contracts.

---

## 13. Search architecture

MVP:

- PostgreSQL filters;
- indexed status, published date, deadline, location, category and employment type;
- PostgreSQL full-text search for title/employer/body;
- `pg_trgm` where fuzzy title/employer matching is useful.

Later, only if justified:

- `pgvector` for semantic job recommendations;
- dedicated search service for very high data/query volume.

---

## 14. Configuration and environments

Required principle: **configuration is typed, validated and central**.

Illustrative environment groups:

```text
APP_ENV
APP_URL
DATABASE_URL
VITE_SUPABASE_URL              # client
VITE_SUPABASE_PUBLISHABLE_KEY  # client
SUPABASE_URL                   # server
SUPABASE_SECRET_KEY            # server only
STORAGE_BUCKET_CV
GEMINI_API_KEY                 # server only
GEMINI_MODEL_FAST
GEMINI_MODEL_DEFAULT
GEMINI_MODEL_HIGH_QUALITY
AI_MAX_RETRIES
AI_TIMEOUT_MS
LOG_LEVEL
```

Never access unvalidated environment strings throughout random modules. Create one server configuration module.

Environment policy:

- local/dev and production are separate;
- production secret keys and Gemini keys never appear in repository history;
- model names are configuration values, not scattered literals.

---

## 15. Deployment path

### Development

- Google AI Studio Build Mode preview;
- development database/project;
- development Gemini billing/quota controls;
- GitHub commits after passing stage gates.

### Beta/production

- deploy managed full-stack runtime (Cloud Run path is acceptable);
- production database/storage/auth project;
- production environment secrets;
- migration and rollback checklist;
- post-deploy smoke test.

Never point an AI Studio experimental environment at the production database merely for convenience.

---

## 16. Observability

Minimum operational telemetry:

- structured server logs without CV contents/secrets;
- request/error correlation ID;
- `ai_runs` operation/model/status/latency/usage;
- `audit_events` for sensitive/admin actions;
- bulk import success/error counts;
- product analytics events for critical user funnels;
- alerting/log review process for production failures.

---

## 17. Architecture guardrails

Do not allow future prompts to silently violate these rules:

1. no client-side API secrets;
2. no public CV bucket;
3. no AI output persisted as verified candidate fact without the approved workflow;
4. no low-confidence job auto-publication;
5. no authorization based only on hidden UI controls;
6. no direct Gemini calls from random controllers/components;
7. no model IDs scattered through code;
8. no recruiter-side automated ranking/rejection in the initial product;
9. no production schema changes without migrations/rollback thinking;
10. no major architecture changes without an entry in `DECISIONS.md`.
