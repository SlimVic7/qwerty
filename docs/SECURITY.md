# QWERTY Security, Privacy and Trust Baseline

**Status:** Stage 0 mandatory controls  
**Version:** 1.0  
**Date:** 17 August 2026

---

## 1. Security objective

QWERTY will process personal career history, contact details, private CV files and application records. Security and privacy are product requirements, not post-launch enhancements.

The baseline threat model includes:

- account takeover;
- unauthorized access to another candidate's CV/application data;
- admin privilege abuse;
- exposed API/service keys;
- public or guessable CV links;
- malicious file uploads;
- XSS/injection attacks;
- prompt injection through CVs/job ads;
- AI fabrication that damages candidate trust;
- accidental logging of sensitive CV contents;
- bulk importer poisoning or incorrect publication;
- insecure production changes.

---

## 2. Authentication

Use a mature managed authentication provider such as Supabase Auth or an equivalent supported production service.

Requirements:

- no custom password cryptography;
- secure session management;
- email verification/reset flows where appropriate;
- server-side session/auth validation for protected API actions;
- session expiration/revocation capability;
- optional MFA for super-admin accounts when available;
- account suspension/deletion state.

Client-side hiding of a page is not authorization.

---

## 3. Authorization

Apply defense in depth:

1. server-side permission checks;
2. database Row Level Security where supported;
3. object-storage access policies;
4. minimal privileged secret key usage.

### Candidate boundary

A candidate may access only their own:

- profile facts;
- CV files/versions;
- cover letters;
- applications/events;
- interviews/deadlines/notes;
- private AI results.

### Admin boundary

Admin access should be scoped to operational needs.

Do not grant every admin unrestricted CV browsing simply because they can manage job posts.

Sensitive candidate-document access, if ever required for support, should be purpose-limited and audited.

### Super-admin

Reserve for role/security/system-level actions. Use the smallest possible number of super-admin accounts.

---

## 4. Secrets management

Secrets include:

- `GEMINI_API_KEY`;
- database secret keys;
- OAuth client secrets;
- email/provider keys;
- signing secrets;
- production-only tokens.

Rules:

- secrets only in AI Studio/hosting/secret manager environment;
- never commit secrets to GitHub;
- never include secrets in React/client bundles;
- never paste production secrets into prompts;
- use different development and production credentials;
- rotate compromised/suspected keys;
- scan repository history before public/shared exposure.

Google AI Studio's server runtime supports server-side secrets; use that path for Gemini and other privileged credentials.

---

## 5. File-upload security

Candidate CVs are private assets.

Controls:

- allowlist accepted MIME types/extensions;
- verify MIME/signature where practical, not extension only;
- explicit maximum file size;
- random/non-guessable storage keys;
- private bucket only;
- short-lived signed URLs for authorized download;
- ownership check before signed URL generation;
- sanitize filenames for display;
- virus/malware scanning when production volume/risk warrants it;
- no executable HTML/script upload serving from the application origin;
- metadata record for upload/parse/delete status.

Do not store a permanent public CV URL in the database.

---

## 6. Web/API input validation

All mutations require server validation using shared schemas.

Validate:

- IDs and ownership;
- text lengths;
- emails/URLs;
- enum/status values;
- dates/time zones;
- job salary ranges;
- uploaded file metadata;
- JSON structured AI outputs;
- pagination/filter limits.

Never trust hidden form values or client-generated user IDs/roles.

---

## 7. Output encoding and content safety

- render user/admin-authored content safely;
- sanitize any allowed rich HTML;
- prefer Markdown/structured content rendered through safe libraries;
- do not use unsafe HTML injection for AI or job content;
- set security headers appropriate to the deployed runtime;
- implement a Content Security Policy when feasible;
- keep external links clearly external and use safe link attributes where appropriate.

---

## 8. CSRF, CORS and session controls

The exact controls depend on auth/session architecture.

Requirements:

- strict production CORS allowlist;
- no wildcard credentialed CORS;
- CSRF protection for cookie-authenticated state-changing requests where applicable;
- `Secure`, `HttpOnly` and appropriate `SameSite` cookie settings for server cookies;
- production HTTPS only.

---

## 9. Rate limiting and abuse prevention

Rate-limit at minimum:

- login/reset endpoints;
- registration/verification abuse paths;
- file uploads;
- Gemini operations;
- bulk import endpoints;
- expensive searches/exports where needed;
- admin high-impact actions.

AI quotas are enforced server-side, not only displayed in the UI.

Add bot/abuse controls only where real traffic warrants them; do not make normal candidate use unnecessarily difficult.

---

## 10. AI-specific security

### Prompt injection

CVs and job ads are untrusted documents.

Controls:

- delimit them as data;
- system instruction says document instructions are not executable;
- do not give the model unrestricted database/tool access;
- pass only the current user's minimum required data;
- schema-constrain outputs;
- validate returned IDs/fields server-side;
- never include secrets/system credentials in context.

### Candidate truth

AI fabrication is treated as a trust/security-quality incident.

Controls:

- canonical candidate evidence layer;
- evidence mapping;
- candidate review/diff;
- regression tests for missing requirements;
- incident tracking for confirmed fabrication.

### Job publication

AI never directly publishes a low-confidence extraction. Application validation and admin workflow control publication.

---

## 11. Data minimisation and privacy

Collect only information needed for QWERTY functions.

Examples:

- do not require unnecessary demographic data for CV tools;
- do not send unrelated candidate records to Gemini;
- do not retain raw AI payloads containing full CVs in ordinary logs;
- do not expose other users' content to admin dashboards unless operationally necessary.

Before public beta, publish clear privacy information covering:

- what candidate data is stored;
- why it is processed;
- AI processing/provider use;
- file retention;
- account deletion/export;
- cookies/analytics;
- contact process for privacy requests.

Legal/privacy language should receive jurisdiction-appropriate review before production reliance.

---

## 12. Retention and deletion

Define retention periods before production.

System capabilities must support:

- user-initiated account deletion request;
- deletion/anonymisation of private profile/application content as policy requires;
- deletion of CV objects from storage, not only DB references;
- generated file deletion;
- justified retention of security/audit records where applicable;
- cleanup of orphaned files;
- clear distinction between soft-deleted operational status and completed data erasure.

Do not treat Gemini Files API as a retention solution; temporary provider files are separate from QWERTY-controlled storage.

---

## 13. Logging

### Allowed in normal logs

- request ID;
- endpoint/action;
- user ID or pseudonymous identifier where needed;
- status/error code;
- timing;
- entity IDs;
- AI operation/model/usage metrics.

### Do not log by default

- full CV text;
- cover-letter contents;
- passwords/tokens;
- API keys;
- full session cookies;
- raw authorization headers;
- excessive contact data;
- unnecessary job-application notes.

Error messages stored in `ai_runs` should be redacted and operationally useful.

---

## 14. Audit events

Audit at minimum:

- role grant/revoke;
- account suspension/reactivation;
- job publication/unpublication/deletion/close;
- bulk-import publication decisions;
- content publication/archive;
- sensitive settings changes;
- privileged support access to private candidate data if that feature ever exists.

Audit logs should not be editable by ordinary admins.

---

## 15. Database security

- production database not publicly writable;
- RLS/authorization policies for private tables;
- secret key server-only;
- least privilege for database users/services;
- parameterized queries/ORM safe bindings;
- constraints for critical invariants;
- backups appropriate to production tier;
- restoration process tested before reliance;
- migrations version-controlled.

---

## 16. Development and deployment security

### Development

- use non-production data or sanitized fixtures;
- do not upload real community CVs simply to test AI;
- keep development secrets separate;
- review AI-generated dependencies and code;
- run type checks/tests before commits.

### Deployment

Before production deploy:

1. review migration plan;
2. confirm rollback path;
3. confirm environment is production;
4. confirm secrets are production values and not visible client-side;
5. run authorization tests;
6. run critical smoke test;
7. verify monitoring/logging;
8. verify backup/recovery posture.

---

## 17. Dependency/supply-chain controls

- minimize unnecessary npm dependencies;
- prefer maintained, reputable packages;
- lock dependency versions using the package manager lockfile;
- review new dependencies proposed by AI Studio;
- run dependency/security scanning through GitHub or equivalent;
- remove abandoned packages when practical.

---

## 18. Security regression tests

Required tests include:

- candidate A cannot read candidate B profile;
- candidate A cannot download candidate B CV by changing an ID;
- candidate cannot call admin job endpoints;
- editor cannot grant self super-admin;
- unpublished jobs not publicly exposed;
- secret/Gemini keys absent from client bundle;
- expired signed URL fails;
- oversized/unsupported file rejected;
- malformed job import does not publish;
- malicious CV/job prompt injection cannot retrieve secrets;
- AI result referencing another user's entity ID is rejected;
- deleted/suspended account behavior follows policy.

---

## 19. Incident response baseline

For a suspected privacy/security incident:

1. contain — revoke keys/sessions or disable affected feature;
2. preserve relevant audit/security evidence;
3. determine data/users affected;
4. fix vulnerability and add regression test;
5. assess notification/legal obligations with appropriate advice;
6. document incident and preventive action;
7. rotate affected credentials before restoration.

For confirmed AI fact fabrication:

1. preserve the failing input/output privately;
2. block or discard the affected generated version;
3. identify prompt/model/schema failure;
4. add the case to regression fixtures;
5. update prompt/validation/model routing;
6. verify no canonical facts were mutated.

---

## 20. Recruitment-AI boundary

Initial QWERTY is candidate-assistance software.

Do not add, without separate product/legal/security review:

- automatic candidate rejection;
- employer-side candidate ranking;
- AI decisions that materially determine employment opportunities;
- opaque suitability decisions presented to employers.

If recruiter-side AI is introduced later, create a separate architecture/compliance decision covering human oversight, transparency, bias/risk management, data governance and applicable employment/AI law.

---

## 21. Security release gate

A stage cannot be called complete if:

- auth is mocked in a production path;
- any privileged secret is exposed client-side;
- another-user authorization tests fail;
- private CVs use public storage;
- important mutations lack validation;
- AI output can write verified facts/public jobs without required validation/review;
- the database migration/rollback path is unknown.
