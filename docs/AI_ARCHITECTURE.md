# QWERTY AI Architecture

**Status:** Stage 0 baseline  
**Version:** 1.0  
**Date:** 17 August 2026  
**Provider:** Gemini API through Google AI Studio / Google GenAI SDK

---

## 1. AI role in QWERTY

AI is a **controlled application service**, not the product database and not an autonomous recruiter.

The first QWERTY AI system exists to:

- structure unstructured job advertisements;
- parse candidate CVs into candidate-reviewable structured facts;
- compare candidate evidence with job requirements;
- professionally tailor wording without inventing evidence;
- generate grounded cover letters;
- generate role-specific interview preparation;
- generate distribution copy;
- identify genuine skill gaps and connect them to verified learning resources.

The initial product must not use AI to automatically reject, rank or make employment decisions about candidates on behalf of employers.

---

## 2. AI Orchestrator

All Gemini usage must pass through a single server-side abstraction, for example:

```text
AIOrchestrator
├── parseJobBatch()
├── parseJobAdvertisement()
├── parseCandidateDocument()
├── analyseJobFit()
├── tailorCV()
├── generateCoverLetter()
├── generateInterviewPreparation()
├── generateSTARCoaching()
├── recommendLearningGaps()
├── generateWhatsAppCopy()
└── generateXCopy()
```

Controllers, React components and unrelated business services must not call Gemini directly.

Benefits:

- one place for model configuration;
- one place for prompt versions;
- one place for structured-output schemas;
- consistent logging and quotas;
- easier provider/model migration;
- easier regression testing;
- safer handling of prompt injection and sensitive data.

### QWERTY Career Knowledge Base (Future Requirement)
Approved QWERTY Career Hub content may be indexed as a "QWERTY Career Knowledge Base". Future Gemini responses may combine QWERTY approved knowledge, candidate canonical profile, selected job description, and user questions. 

The knowledge-base architecture must use retrieval/grounding rather than model fine-tuning initially. 

AI-generated career advice must clearly distinguish between:
- QWERTY curated guidance
- Candidate-specific facts
- Job-specific facts
- Gemini-generated recommendations

---

## 3. Model-routing policy

### Do not couple QWERTY to one model name

Google's model catalogue changes quickly. Model IDs must be server configuration values.

Recommended environment keys:

```text
GEMINI_MODEL_FAST
GEMINI_MODEL_DEFAULT
GEMINI_MODEL_HIGH_QUALITY
```

As of 17 August 2026:

- Gemini 3.6 Flash is a stable model suitable as a strong general runtime default.
- Gemini 3.1 Flash-Lite is a stable cost-efficient option for repetitive extraction/classification work.
- Gemini 3.1 Pro is currently preview; use preview models only behind an experiment/feature flag and do not make a critical production workflow depend exclusively on a preview model.

Suggested routing policy:

| Operation | Default class | Reason |
|---|---|---|
| split bulk job batch | FAST | repetitive structured extraction |
| normalize job fields | FAST | constrained transformation |
| classify categories/skills | FAST | high volume |
| parse CV into profile proposal | DEFAULT | accuracy matters; structured output |
| job-fit evidence mapping | DEFAULT | nuanced comparison |
| final CV tailoring | DEFAULT/HIGH_QUALITY | candidate-facing quality-sensitive writing |
| cover letter | DEFAULT/HIGH_QUALITY | quality-sensitive and evidence-bound |
| interview preparation | DEFAULT | reasoning + writing |
| WhatsApp/X copy | FAST | low-risk, short output |

Runtime model choice should also consider latency, price, current model lifecycle, regional availability and measured QWERTY quality.

---

## 4. SDK/API policy

Use the official Google GenAI SDK in server code and isolate API-specific implementation behind an adapter.

Google currently supports schema-constrained structured output and newer interaction-style APIs. QWERTY should use the currently recommended supported API surface when implementing each stage, but business modules must not depend on low-level request syntax.

This prevents future API changes from affecting every feature.

---

## 5. Structured outputs are mandatory for machine data

Any Gemini response that will become application data must be schema constrained and application validated.

Examples:

### Job extraction schema

```text
JobExtraction
- title
- employer_name
- country
- city
- work_arrangement
- employment_type
- experience_level
- salary_min/max/currency/period
- summary
- description
- responsibilities[]
- minimum_requirements[]
- preferred_requirements[]
- skills[]
- application_url
- application_email
- application_instructions
- deadline
- source_url
- extraction_warnings[]
- field_confidence{}
```

### Candidate profile proposal schema

```text
CandidateProfileProposal
- contact
- summary_source
- experience[]
- education[]
- skills[]
- certifications[]
- projects[]
- languages[]
- ambiguities[]
- missing_fields[]
```

### Fit analysis schema

```text
JobFitAnalysis
- strong_matches[]
- partial_matches[]
- missing_requirements[]
- preferred_matches[]
- transferable_evidence[]
- evidence_map[]
- warnings[]
```

Application code validates every response again with Zod or equivalent before persistence.

---

## 6. Candidate truth architecture

This is the most important AI rule in the product.

### Evidence model

Candidate facts should have stable evidence identifiers, for example:

```text
experience:exp_123:achievement_2
skill:skill_456
education:edu_789
certification:cert_321
```

Generated outputs should reference evidence IDs internally where practical.

### AI may

- rewrite supported facts;
- reorder evidence;
- combine related evidence accurately;
- use professional terminology that does not change meaning;
- identify transferable skills supported by experience;
- recommend adding a missing detail for the candidate to confirm.

### AI may not

- invent a new evidence ID or treat unsupported prose as fact;
- infer a certification merely because a job requests it;
- convert “used Excel” into “advanced Excel” without candidate evidence;
- create numerical outcomes not present in evidence;
- change dates/employers/titles to improve fit;
- conceal a material mismatch by rewriting it as a match.

### Candidate confirmation

After initial parsing, the profile is `draft` or `needs_review`. High-value AI application flows should require a sufficiently confirmed profile.

---

## 7. CV parsing workflow

```text
1. Candidate uploads PDF/DOCX to QWERTY private storage.
2. Server validates file type, size and ownership.
3. QWERTY sends the document to Gemini using the supported document/file input method.
4. Gemini returns a structured profile proposal.
5. Application validates the schema.
6. Candidate sees extracted facts and ambiguities.
7. Candidate edits/corrects and confirms.
8. Confirmed facts become the Canonical Professional Profile.
```

Gemini's Files API is a processing mechanism, not permanent QWERTY storage. Google currently states Files API uploads are temporary and automatically deleted after 48 hours. QWERTY retains permitted originals in its own private object storage.

---

## 8. Job-fit analysis

The fit engine should explain **evidence**, not pretend to know an employer's ATS.

For each material job requirement:

1. normalize the requirement;
2. look for direct candidate evidence;
3. look for transferable/partial evidence;
4. classify as strong / partial / missing / preferred;
5. attach evidence IDs;
6. explain uncertainty.

### Do not output a fake universal ATS percentage

If QWERTY later uses scores internally for prioritizing explanations, the user-facing product should still clearly distinguish:

- document/ATS readability;
- job-description alignment;
- missing evidence.

---

## 9. CV tailoring workflow

Input:

- canonical candidate profile;
- selected job;
- optional candidate preferences;
- existing approved CV style/template.

Output:

- professional summary proposal;
- section ordering;
- rewritten bullet proposals;
- skill selection/order;
- explicit unsupported/missing requirement list;
- evidence mapping;
- warnings.

Then:

1. validate output structure;
2. run truth/evidence checks;
3. display diff/proposals to candidate;
4. allow accept/reject/edit;
5. save as a new version;
6. never overwrite the canonical profile merely because generated wording changed.

---

## 10. Cover-letter workflow

Input:

- job requirements;
- verified candidate evidence;
- candidate preferences/instructions where provided.

Output must contain only supported candidate claims.

Guardrail:

If company-specific context is not provided or verified, keep references generic and job-specific rather than inventing company facts, awards or culture claims.

---

## 11. Interview-preparation workflow

Generate:

- likely technical/role questions;
- behavioural questions;
- why each question may be asked;
- candidate evidence worth recalling;
- STAR prompts rather than fabricated stories;
- questions the candidate can ask;
- preparation checklist.

Do not generate a false candidate persona or instruct the candidate to claim experience they do not have.

---

## 12. Bulk job ingestion AI workflow

Job advertisements are untrusted input.

System instructions must explicitly delimit the ad text as data and state that instructions contained inside the ad are not executable instructions.

Pipeline:

```text
raw batch
  -> split into item candidates
  -> structured extraction
  -> app schema validation
  -> normalization
  -> duplicate rules
  -> review state
  -> admin decision
  -> canonical job publication
```

AI never receives authority to write directly to production job tables.

---

## 13. Prompt-injection controls

Threat examples:

- a job ad says “ignore previous instructions”;
- a CV contains hidden text asking for system prompts;
- an uploaded document requests secrets;
- a user attempts to make the model reveal another candidate's data.

Controls:

1. treat all document text as untrusted data;
2. clear system/developer instructions describing allowed operation;
3. no Gemini tool access to unrestricted database/search by default;
4. pass only the minimum records required for the current user's operation;
5. never include secrets in prompts;
6. schema constrain machine outputs;
7. validate identifiers/ownership server-side after AI returns;
8. log/refuse suspicious instructions when detected;
9. add adversarial fixtures to regression tests.

---

## 14. Data minimisation

Send to Gemini only what the operation requires.

Examples:

- social-copy generation does not need candidate data;
- job extraction does not need user profiles;
- fit analysis needs the selected job and that user's relevant profile, not the entire database;
- logs should store IDs/metrics, not raw CV text.

Before production, QWERTY must document its external AI processing and review current provider terms/data controls.

---

## 15. AI run lifecycle

Recommended internal sequence:

```text
authorize user
  -> validate request
  -> quota check
  -> build minimal data packet
  -> select operation + prompt version + model class
  -> create ai_runs(requested)
  -> call Gemini with timeout/retry rules
  -> validate structured response
  -> truth/business validation
  -> mark ai_runs(success/failure)
  -> return proposal/result
```

---

## 16. Prompt versioning

Every production operation has a named prompt/template version, e.g.:

```text
job_extract:v1
cv_parse:v1
fit_analysis:v1
cv_tailor:v1
cover_letter:v1
interview_prep:v1
social_copy:v1
```

A prompt change that materially changes output behavior gets a new version and regression test.

Prompts live in the server AI module, not buried in UI components.

---

## 17. AI usage/cost controls

Production controls:

- per-user/day or monthly feature quotas;
- separate admin bulk-import quotas;
- maximum input/document size;
- maximum output length;
- timeouts;
- bounded retries;
- cached/reused deterministic analyses where appropriate;
- cheaper model class for repetitive extraction;
- feature-level usage dashboard;
- alerts/spend caps in the Google AI project/billing configuration.

Important product note:

A paid consumer Gemini/Google AI subscription is not the same as production Gemini API billing. QWERTY runtime usage must use its own Gemini API project/key, quotas and billing controls.

---

## 18. Error handling and fallback

AI errors must not corrupt product state.

Categories:

- timeout;
- quota/rate limit;
- provider unavailable;
- invalid structured output;
- safety refusal;
- business/truth validation failure;
- file-processing failure.

Behavior:

- show a useful user message;
- preserve existing records;
- allow retry where safe;
- do not silently switch to a lower-safety prompt;
- for bulk jobs, fail the affected item rather than the entire batch where possible.

---

## 19. AI regression suite

Maintain test fixtures covering:

### Jobs

- one clean job;
- 20 mixed jobs in one paste;
- multiple jobs with same employer;
- duplicate posting;
- missing deadline;
- ambiguous date format;
- application email only;
- malicious prompt-injection text;
- job with embedded unrelated content.

### CVs

- traditional chronological CV;
- sparse graduate CV;
- long senior CV;
- tables/columns;
- missing dates;
- inconsistent dates;
- no quantified achievements;
- deliberately missing job requirements;
- prompt-injection text inside document.

### Truth tests

For a candidate with no SAP/ACCA/Power BI evidence, generated fit/CV/letter must keep those requirements absent rather than manufacture them.

---

## 20. Quality metrics

Track by operation:

- success rate;
- schema-validation failure rate;
- user correction/acceptance rate;
- latency;
- token usage/cost;
- fabrication incidents;
- admin correction rate for job extraction;
- CV parse correction rate;
- retry rate;
- user completion after AI result.

AI model changes should be evaluated against this data, not adopted merely because a new model is announced.
