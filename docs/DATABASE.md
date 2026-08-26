# QWERTY Database Design

**Status:** Stage 0 logical schema  
**Version:** 1.0  
**Database:** PostgreSQL  
**Initial platform:** Supabase recommended

---

## 1. Database principles

1. PostgreSQL is the business-data source of truth.
2. CV/document binaries live in private object storage; PostgreSQL stores metadata and object references.
3. Authentication-provider user IDs are referenced rather than duplicating password/auth secrets.
4. Candidate facts are separate from AI-generated CV/cover-letter wording.
5. Staged job-import records are separate from published canonical jobs.
6. Important status transitions are historical/auditable.
7. Every private user-owned table has server authorization and, where supported, Row Level Security.
8. Migrations are version-controlled; production changes are never made only through an ad-hoc UI.

---

## 2. Naming and data conventions

Recommended conventions:

- IDs: UUID.
- Timestamps: `timestamptz`, stored in UTC.
- Money: integer minor units or `numeric`, with explicit currency.
- Enums: PostgreSQL enums only when change frequency is low; otherwise validated text/check constraints.
- Soft lifecycle states preferred to destructive deletion for operational records that need audit history.
- User-generated free text: length-limited and sanitised on render.
- JSONB: use for snapshots/raw AI payload metadata, not as a substitute for relational columns.

Useful PostgreSQL extensions to consider:

- `pgcrypto`/UUID support as required by platform;
- `citext` for case-insensitive fields where useful;
- `pg_trgm` for fuzzy job/employer search;
- `pgvector` later only if semantic recommendations justify it.

---

## 3. Identity and authorization

If Supabase Auth is used, authentication identities live in its auth schema.

### `profiles`

One row per authenticated user.

Key columns:

- `id uuid PK` — same ID as auth user where practical;
- `display_name text`;
- `email_display text` optional cached display value;
- `account_status text` — active/suspended/deleted_pending;
- `created_at timestamptz`;
- `updated_at timestamptz`.

### `user_roles`

- `user_id uuid FK -> profiles.id`;
- `role text` — candidate/admin/editor/super_admin;
- `granted_by uuid nullable`;
- `granted_at timestamptz`;
- composite PK `(user_id, role)`.

Rule: do not rely on a client-supplied role claim alone for sensitive authorization.

---

## 4. Jobs domain

### `jobs`

Canonical public vacancy.

Recommended columns:

- `id uuid PK`;
- `slug text unique`;
- `title text not null`;
- `employer_name text`;
- `employer_id uuid nullable` — reserved for future employer entity;
- `category_id uuid nullable`;
- `country_code text`;
- `city text`;
- `location_text text`;
- `work_arrangement text` — onsite/hybrid/remote/unspecified;
- `employment_type text`;
- `experience_level text`;
- `salary_min numeric nullable`;
- `salary_max numeric nullable`;
- `salary_currency text nullable`;
- `salary_period text nullable`;
- `summary text nullable`;
- `description text not null`;
- `responsibilities text nullable`;
- `minimum_requirements text nullable`;
- `preferred_requirements text nullable`;
- `education_requirements text nullable`;
- `application_url text nullable`;
- `application_email citext nullable`;
- `application_instructions text nullable`;
- `deadline_at timestamptz nullable`;
- `source_name text nullable`;
- `source_url text nullable`;
- `source_fingerprint text nullable`;
- `status text not null` — draft/published/closed/expired/archived;
- `published_at timestamptz nullable`;
- `closed_at timestamptz nullable`;
- `created_by uuid nullable`;
- `updated_by uuid nullable`;
- `created_at timestamptz`;
- `updated_at timestamptz`.

Important constraints:

- at least one usable application method/instruction when published;
- salary min <= max when both exist;
- published jobs require title + body + viable application method;
- deadline validation must account for imported dates and time zones.

### `job_categories`

- `id uuid PK`;
- `name text unique`;
- `slug text unique`;
- `active boolean`.

### `skills`

Shared skill vocabulary.

- `id uuid PK`;
- `name text unique`;
- `normalized_name text unique`;
- `active boolean`.

### `job_skills`

- `job_id uuid FK`;
- `skill_id uuid FK`;
- `requirement_level text` — required/preferred/mentioned;
- composite key.

### `job_sources`

Optional normalized source registry.

- `id uuid PK`;
- `name text`;
- `base_url text nullable`;
- `source_type text`;
- `active boolean`.

---

## 5. Bulk ingestion domain

### `job_ingestion_batches`

Immutable intake envelope.

- `id uuid PK`;
- `created_by uuid FK`;
- `source_type text` — paste/file/manual-import;
- `raw_input text`;
- `raw_file_id uuid nullable`;
- `status text` — received/processing/review/complete/failed;
- `items_detected int default 0`;
- `items_published int default 0`;
- `items_failed int default 0`;
- `created_at timestamptz`;
- `completed_at timestamptz nullable`.

### `job_ingestion_items`

One possible job extracted from a batch.

- `id uuid PK`;
- `batch_id uuid FK`;
- `sequence_no int`;
- `raw_text text`;
- `parsed_json jsonb`;
- `normalized_json jsonb`;
- `confidence numeric nullable`;
- `validation_errors jsonb`;
- `duplicate_job_id uuid nullable FK -> jobs.id`;
- `review_status text` — ready/needs_review/possible_duplicate/invalid/published/ignored;
- `reviewed_by uuid nullable`;
- `reviewed_at timestamptz nullable`;
- `published_job_id uuid nullable FK -> jobs.id`;
- `created_at timestamptz`.

Indexes:

- `(batch_id, sequence_no)`;
- `review_status`;
- `duplicate_job_id`.

Rule: publishing an item creates/updates canonical job data inside a controlled transaction and records an audit event.

---

## 6. Candidate truth domain

### `candidate_profiles`

One current canonical profile per candidate.

- `user_id uuid PK FK -> profiles.id`;
- `headline text nullable`;
- `professional_summary_source text nullable` — candidate-confirmed source wording/facts;
- `city text nullable`;
- `country_code text nullable`;
- `phone text nullable`;
- `linkedin_url text nullable`;
- `portfolio_url text nullable`;
- `verification_status text` — draft/needs_review/confirmed;
- `confirmed_at timestamptz nullable`;
- `created_at timestamptz`;
- `updated_at timestamptz`.

### `candidate_experience`

- `id uuid PK`;
- `user_id uuid FK`;
- `employer text not null`;
- `title text not null`;
- `location_text text nullable`;
- `start_date date nullable`;
- `end_date date nullable`;
- `is_current boolean`;
- `responsibilities jsonb` — candidate-confirmed evidence statements;
- `achievements jsonb` — candidate-confirmed evidence statements;
- `tools_technologies jsonb`;
- `source_file_id uuid nullable`;
- `sort_order int`;
- `created_at/updated_at timestamptz`.

### `candidate_education`

- `id uuid PK`;
- `user_id uuid FK`;
- `institution text`;
- `qualification text`;
- `field_of_study text nullable`;
- `start_date date nullable`;
- `end_date date nullable`;
- `result_text text nullable`;
- `created_at/updated_at`.

### `candidate_skills`

- `user_id uuid FK`;
- `skill_id uuid FK`;
- `proficiency text nullable`;
- `evidence_text text nullable`;
- `confirmed_by_candidate boolean default false`;
- composite key.

### `candidate_certifications`

- `id uuid PK`;
- `user_id uuid FK`;
- `name text`;
- `issuer text nullable`;
- `issued_date date nullable`;
- `expires_date date nullable`;
- `credential_id text nullable`;
- `credential_url text nullable`.

### `candidate_projects`

- `id uuid PK`;
- `user_id uuid FK`;
- `name text`;
- `description text`;
- `url text nullable`;
- `start_date/end_date nullable`.

### `candidate_languages`

- `id uuid PK`;
- `user_id uuid FK`;
- `language text`;
- `proficiency text nullable`.

Truth rule:

> These records contain candidate-provided or candidate-confirmed facts. Generated CV prose must not be used to silently backfill new facts into these tables.

---

## 7. CV/document domain

### `cv_files`

- `id uuid PK`;
- `user_id uuid FK`;
- `storage_bucket text`;
- `storage_key text`;
- `original_filename text`;
- `mime_type text`;
- `size_bytes bigint`;
- `sha256 text nullable`;
- `upload_status text`;
- `parse_status text`;
- `created_at timestamptz`;
- `deleted_at timestamptz nullable`.

Never store a permanent public URL.

### `cv_parse_runs`

- `id uuid PK`;
- `cv_file_id uuid FK`;
- `ai_run_id uuid nullable FK -> ai_runs.id`;
- `parsed_profile_json jsonb`;
- `status text`;
- `error_code text nullable`;
- `created_at timestamptz`.

### `cv_versions`

A candidate-approved/generated application document version.

- `id uuid PK`;
- `user_id uuid FK`;
- `job_id uuid nullable FK`;
- `application_id uuid nullable FK`;
- `title text`;
- `content_json jsonb` — generated document structure;
- `candidate_profile_snapshot jsonb` — supporting truth snapshot/reference map;
- `generation_metadata jsonb`;
- `status text` — draft/approved/archived;
- `created_at/updated_at`.

Optional export files may be stored as private generated artifacts with their own file metadata table or fields.

---

## 8. Applications domain

### `saved_jobs`

- `user_id uuid FK`;
- `job_id uuid FK`;
- `created_at timestamptz`;
- composite key.

### `applications`

- `id uuid PK`;
- `user_id uuid FK`;
- `job_id uuid nullable FK`;
- `external_job_title text nullable` — only if tracking a job not hosted by QWERTY later;
- `status text`;
- `applied_at timestamptz nullable`;
- `follow_up_at timestamptz nullable`;
- `deadline_at timestamptz nullable`;
- `selected_cv_version_id uuid nullable`;
- `selected_cover_letter_id uuid nullable`;
- `created_at/updated_at`.

### `application_events`

- `id uuid PK`;
- `application_id uuid FK`;
- `event_type text`;
- `from_status text nullable`;
- `to_status text nullable`;
- `notes text nullable`;
- `event_at timestamptz`;
- `created_at timestamptz`.

### `cover_letters`

- `id uuid PK`;
- `user_id uuid FK`;
- `job_id uuid nullable FK`;
- `application_id uuid nullable FK`;
- `content text`;
- `evidence_map jsonb`;
- `generation_metadata jsonb`;
- `status text`;
- `created_at/updated_at`.

### `interviews`

- `id uuid PK`;
- `user_id uuid FK`;
- `application_id uuid FK`;
- `scheduled_at timestamptz`;
- `timezone text nullable`;
- `format text nullable`;
- `location_or_link text nullable`;
- `notes text nullable`;
- `created_at/updated_at`.

### `interview_preparations`

- `id uuid PK`;
- `user_id uuid FK`;
- `job_id uuid nullable FK`;
- `application_id uuid nullable FK`;
- `content_json jsonb`;
- `evidence_map jsonb`;
- `generation_metadata jsonb`;
- `created_at`.

### `notes`

- `id uuid PK`;
- `user_id uuid FK`;
- `application_id uuid nullable`;
- `title text nullable`;
- `body text`;
- `created_at/updated_at`.

### `goals`

- `id uuid PK`;
- `user_id uuid FK`;
- `title text`;
- `target_at timestamptz nullable`;
- `status text`;
- `created_at/updated_at`.

---

## 9. Career Hub domain

### `career_categories`

- `id uuid PK`;
- `name text`;
- `slug text unique`;
- `description text nullable`;
- `sort_order int`;
- `active boolean`.

Seed categories:

- CV & Applications
- Interview Preparation
- Skills & Learning
- Career Development

### `career_articles`

- `id uuid PK`;
- `category_id uuid FK`;
- `title text`;
- `slug text unique`;
- `summary text nullable`;
- `body_markdown text`;
- `status text` — draft/published/archived;
- `published_at timestamptz nullable`;
- `last_reviewed_at timestamptz nullable`;
- `author_id uuid nullable`;
- `updated_by uuid nullable`;
- `created_at/updated_at`.

### `learning_resources`

- `id uuid PK`;
- `title text`;
- `provider text`;
- `url text`;
- `level text nullable`;
- `cost_type text`;
- `certificate_type text nullable`;
- `duration_text text nullable`;
- `description text nullable`;
- `last_verified_at timestamptz nullable`;
- `status text`;
- `created_by/updated_by uuid nullable`;
- `created_at/updated_at`.

### `learning_resource_skills`

- `resource_id uuid FK`;
- `skill_id uuid FK`;
- composite key.

---

## 10. Distribution and notification domain

### `distribution_posts`

- `id uuid PK`;
- `job_id uuid nullable FK`;
- `channel text` — whatsapp/x/other;
- `content text`;
- `status text` — generated/approved/posted/archived;
- `generated_by_ai_run_id uuid nullable`;
- `created_by uuid`;
- `posted_at timestamptz nullable`;
- `created_at`.

### `notifications`

- `id uuid PK`;
- `user_id uuid FK`;
- `type text`;
- `channel text` — in_app/email/push-later;
- `title text`;
- `body text`;
- `scheduled_at timestamptz nullable`;
- `sent_at timestamptz nullable`;
- `status text`;
- `related_entity_type text nullable`;
- `related_entity_id uuid nullable`;
- `created_at`.

---

## 11. AI and audit domain

### `ai_runs`

Every production AI operation should create a record.

- `id uuid PK`;
- `user_id uuid nullable`;
- `operation text`;
- `model text`;
- `prompt_version text`;
- `request_entity_type text nullable`;
- `request_entity_id uuid nullable`;
- `status text` — requested/succeeded/failed/refused;
- `latency_ms int nullable`;
- `input_tokens bigint nullable`;
- `output_tokens bigint nullable`;
- `cached_tokens bigint nullable`;
- `estimated_cost numeric nullable`;
- `error_code text nullable`;
- `error_message_redacted text nullable`;
- `metadata jsonb`;
- `created_at timestamptz`.

Do not store raw CV contents in `ai_runs` normal metadata/log fields.

### `audit_events`

- `id uuid PK`;
- `actor_user_id uuid nullable`;
- `action text`;
- `entity_type text`;
- `entity_id uuid nullable`;
- `before_json jsonb nullable`;
- `after_json jsonb nullable`;
- `ip_hash text nullable`;
- `user_agent_summary text nullable`;
- `created_at timestamptz`.

Audit high-value events such as:

- role changes;
- job publish/unpublish/delete/close;
- bulk import publication;
- content publication;
- account suspension;
- security-sensitive settings changes.

### `system_settings`

Only for controlled application settings that genuinely belong in DB.

Examples:

- default job expiry policy;
- feature flags;
- AI user quotas;
- content-review intervals.

Secrets do **not** belong here.

---

## 12. Row Level Security / authorization matrix

When Supabase RLS is used, apply defense in depth: RLS plus server-side business authorization.

| Data | Candidate | Admin | Public |
|---|---|---|---|
| `profiles` | own row | controlled support/admin access | no |
| candidate truth tables | own rows | normally no broad browse; explicit support path only | no |
| `cv_files` / versions | own rows | no default unrestricted access | no |
| `applications` etc. | own rows | no default unrestricted access | no |
| published `jobs` | read | manage | read |
| draft jobs | no | manage | no |
| ingestion batches/items | no | manage | no |
| published career content | read | manage | read |
| draft career content | no | manage | no |
| `ai_runs` | optional own usage summary only | operational aggregate / restricted detail | no |
| `audit_events` | no | super-admin restricted | no |

Do not make admin access to CVs the default just because a role is “admin.” Candidate document access should be purpose-limited and logged.

---

## 13. Indexing recommendations

Jobs:

- `(status, published_at desc)`;
- `deadline_at`;
- `category_id`;
- country/city;
- employment/work arrangement;
- trigram indexes for title/employer if needed;
- full-text generated/search vector as implemented.

Private user data:

- every user-owned table indexed on `user_id`;
- applications `(user_id, status)`;
- application events `(application_id, event_at desc)`;
- CV versions `(user_id, created_at desc)`.

Operations:

- ingestion items `(review_status, created_at)`;
- AI runs `(operation, created_at)` and `(user_id, created_at)`;
- audit events `(entity_type, entity_id, created_at)`.

---

## 14. Data retention principles

Exact legal retention periods must be finalized before public production.

Baseline product rules:

- original CVs: retain only while user account/use case requires and policy permits;
- generated CV/letters: user-controlled deletion/retention;
- temporary Gemini file uploads are not QWERTY storage;
- raw job ingestion batches may be retained for operational audit with a documented limit;
- audit/security records may have a longer justified retention than normal content;
- deleted accounts trigger a controlled deletion/anonymisation workflow, not only a UI flag.

---

## 15. Migration rules

1. Every schema change has a migration file.
2. Migrations are reviewed before production.
3. Destructive migrations require backup/rollback planning.
4. Seed data is separated from production migrations.
5. Do not use AI-generated direct SQL against production without review.
6. Add constraints at the database level for critical invariants, not only frontend validation.
