# QWERTY Product Specification

**Document status:** Stage 0 source of truth  
**Version:** 1.1  
**Date:** 17 August 2026  
**Owner:** QWERTY  
**Purpose:** Define what QWERTY is, who it serves, what the first product must do, and what is intentionally deferred.

---

## 1. Product vision

QWERTY is an existing job-seeker community being rebuilt as an **AI-powered career platform**. The product should own the journey between seeing a vacancy and being ready to apply, interview and follow up.

QWERTY is **not** a generic job board with AI added as decoration. Its advantage is the combination of:

- an existing WhatsApp community operating since March 2020;
- additional distribution through X since 2021;
- practical knowledge of collecting and publishing vacancies;
- a legacy library of CV, cover-letter, interview and learning content;
- a new structured platform where jobs, candidate profiles and application preparation live together;
- Gemini-powered assistance that improves presentation without inventing candidate facts.

### Positioning statement

> QWERTY is an AI-powered career platform that helps job seekers discover opportunities, tailor truthful and professional applications, prepare for interviews, build relevant skills and manage their job search from one place.

### Core promise

A candidate should be able to:

1. discover a relevant job;
2. understand how their **real** experience aligns with it;
3. present that experience professionally in a job-specific CV;
4. generate a grounded cover letter;
5. prepare for likely interview questions;
6. track the application, deadlines and interviews;
7. identify learning resources for genuine skill gaps.

---

## 2. Revival goals

The first release must prove that:

1. QWERTY can turn bulk, unstructured job advertisements into clean searchable jobs much faster than manual posting.
2. Candidates will create accounts and maintain a structured professional profile instead of repeatedly uploading disconnected CVs.
3. Gemini can improve application materials while remaining traceable to candidate-provided evidence.
4. WhatsApp and X can continue driving traffic while QWERTY becomes the canonical destination.
5. The operation can be maintained by a small team without high fixed infrastructure cost.
6. Existing career content can be revived as a maintained Career Hub rather than a static archive.

---

## 3. Strategic principles

### 3.1 Community first

WhatsApp and X remain acquisition and distribution channels. They are not the master database. Every vacancy should have one canonical QWERTY record and URL.

### 3.2 Truth before optimisation

AI may improve wording, relevance, organisation and clarity. It must never silently create skills, employers, dates, qualifications, certifications, achievements, salaries, responsibilities or results that are not supported by candidate evidence.

### 3.3 Human control

- Candidates review and correct parsed professional-profile facts.
- Candidates accept or reject AI-generated CV changes.
- Admins review uncertain bulk job extraction before publication.
- High-impact administrative actions remain auditable.

### 3.4 Structured data before clever AI

Jobs and candidate facts are validated application data. AI output is a proposal or extraction result until application rules validate it.

### 3.5 Build for a small operating team

The daily product must reduce admin effort. A feature that needs a developer every day is not finished.

### 3.6 Stage-gated delivery

Build one stage, test it, commit it, then continue. Google AI Studio must not be asked to build the entire product in one prompt.

---

## 4. Users and roles

### Visitor

Needs:
- browse and search jobs;
- open a clean job detail page;
- browse Career Hub content;
- understand QWERTY's AI tools;
- register or log in.

Permissions:
- public content only.

### Candidate

Needs:
- private professional profile;
- CV upload and parsing;
- CV library and job-specific versions;
- saved jobs and applications;
- fit/gap analysis;
- cover letters;
- interview preparation;
- notes, deadlines and interview tracking;
- learning recommendations.

Permissions:
- own private data only plus public content.

### Admin / Editor

Needs:
- bulk job ingestion;
- job-review queue;
- job CRUD and publication/expiry controls;
- Career Hub CMS;
- learning-resource management;
- WhatsApp/X copy generation;
- operational dashboards.

### Recruiter / Talent Admin

A restricted internal QWERTY role for legitimate recruitment activity. This role is separate from ordinary content/job-posting administration.

Needs:
- access the QWERTY Talent Pool only for candidates who have explicitly opted in, or whose application to a QWERTY-managed vacancy creates a documented recruitment purpose;
- search/filter structured candidate profiles using job-relevant criteria such as skills, experience, education, certifications, languages, location/work arrangement and availability where provided;
- open the candidate-approved professional profile and authorized CV files;
- download/view CVs through short-lived authorized access rather than public URLs;
- associate candidates with QWERTY-managed vacancies and maintain recruitment notes/statuses;
- record candidate contact/recruitment activity;
- see consent/visibility status before accessing or using a CV;
- have all sensitive candidate-document access logged.

The Recruiter / Talent Admin role must not have automatic access to every user account merely because the user uploaded a CV.

### Super Admin

Additional needs:
- user/role management;
- system settings;
- AI quotas/model settings;
- audit review;
- high-risk actions.

### Employer

Deferred. External employer self-service and employer-controlled applicant management are not part of the first candidate-focused release. QWERTY may operate its own restricted internal recruitment/talent-pool workspace before exposing ATS functionality to third-party employers.

---

## 5. Information architecture

### Public

- Home
- Jobs
- Job Detail
- Career Hub
- About QWERTY
- Register
- Login
- Privacy
- Terms

### Candidate workspace

- Dashboard
- Professional Profile
- CV Library
- Tailor CV
- Cover Letters
- Saved Jobs
- Applications
- Interviews
- Deadlines
- Notes / Goals
- Learning / Skills Gaps
- Account / Privacy

### Admin workspace

- Overview
- Job Importer
- Job Review Queue
- Jobs
- Talent Pool / Recruitment (restricted role)
- Career Content
- Learning Resources
- Distribution
- Users / Roles
- AI Usage
- Audit Log
- Settings

### Career Hub

1. CV & Applications
2. Interview Preparation
3. Skills & Learning
4. Career Development

---

## 6. Core product requirements

## 6.1 Public jobs

A visitor must be able to:

- list active jobs;
- search by text;
- filter by location, category, employment type, experience level and status as available;
- sort by newest and deadline where useful;
- open a dedicated job detail page;
- see employer, location, work arrangement, employment type, deadline, description, requirements and application method;
- clearly see Closed/Expired status;
- copy/share the canonical URL;
- register/login to save a job or use AI application tools.

Job detail pages must be mobile-first, readable and suitable for search-engine indexing.

## 6.2 Admin job management

Admins must be able to:

- create, edit, publish, unpublish, close and expire jobs;
- preview before publishing;
- preserve original source information;
- see publication and update timestamps;
- see audit history for important changes;
- avoid publishing obvious duplicates.

## 6.3 Bulk job importer

Admins must be able to paste a mixed batch of multiple advertisements into one intake action.

The system must:

1. store the original batch;
2. detect individual job boundaries;
3. extract each job into the approved job schema;
4. normalise controlled values;
5. validate required fields, dates, links/emails and enum values;
6. compare possible duplicates;
7. assign a review status;
8. show Ready / Needs Review / Possible Duplicate / Invalid queues;
9. allow batch approval of clean records;
10. require human attention for uncertain records;
11. create canonical job records only after publication rules pass;
12. generate channel-ready distribution copy from the canonical record.

AI extraction must never bypass application validation.

## 6.4 Candidate professional profile

The original CV file is not the permanent truth layer.

QWERTY must parse candidate documents into a structured **Canonical Professional Profile** containing, where available:

- contact and professional links;
- professional summary input;
- experience;
- responsibilities and achievements;
- education;
- skills;
- certifications;
- projects;
- languages.

Candidate-provided facts and AI-generated wording must remain distinguishable.

The candidate must be able to correct parsed information before confirming the profile for use by AI tools.

## 6.5 CV fit analysis

For a selected job, QWERTY must compare job requirements to candidate evidence and return explainable categories such as:

- strong evidence;
- partial evidence;
- missing/not evidenced;
- optional/preferred evidence.

The product must not present a fictional universal ATS score. It may provide separate **ATS-readiness checks** and **job-description alignment** indicators.

## 6.6 CV professionalisation and tailoring

The AI may:

- improve grammar and professional tone;
- reorder sections or bullet points for relevance;
- rewrite supported responsibilities/achievements;
- surface transferable skills supported by evidence;
- align terminology with the job where truthful;
- propose stronger summaries.

The AI must not:

- invent experience;
- invent skills or software knowledge;
- invent employers, titles or dates;
- invent qualifications/certifications;
- fabricate quantified achievements;
- remove material truth in a misleading way.

The candidate should be able to review suggested changes and save job-specific CV versions linked to the source profile and job.

## 6.7 Cover letters

Cover letters must be generated from:

- job requirements;
- verified candidate evidence;
- candidate preferences/instructions where provided.

No unsupported achievements or employer/company claims may be inserted.

## 6.8 Interview preparation

For a selected application/job, QWERTY should provide:

- likely role-specific questions;
- behavioural questions;
- STAR prompts;
- reminders of relevant candidate evidence;
- questions the candidate can ask the employer;
- common mistakes and preparation notes.

Future interactive practice may be added after the core text workflow is reliable.

## 6.9 Applications workspace

Candidates must be able to track:

**Interested → Preparing → Applied → Interview → Offer → Rejected/Closed**

An application can contain:

- selected job;
- status and status history;
- job-specific CV version;
- cover letter;
- application date;
- deadline/follow-up date;
- interview date(s);
- notes;
- interview-preparation records.

## 6.10 Career Hub CMS

Admins/editors must be able to create, edit, publish, archive and review career content without changing source code.

Content must support:

- category;
- title/slug;
- summary/body;
- publication status;
- published date;
- last-reviewed date;
- tags;
- source/reference notes where useful.

## 6.11 Learning resources

Learning resources should be structured, not a static link dump.

Recommended fields:

- provider;
- course/resource title;
- skills/topics;
- level;
- cost type: free / freemium / paid;
- certificate availability/cost notes;
- duration where known;
- URL;
- last verified date;
- active/inactive status;
- editorial notes.

Outdated coupons and temporary promotions are not evergreen content.

## 6.12 Distribution

From a canonical job record, admins should be able to generate concise platform-specific text for WhatsApp and X.

Initial launch rule:

- generated copy may be copied/posted manually;
- QWERTY must not depend on automated WhatsApp group posting;
- every distribution item points to the canonical QWERTY job URL.

## 6.13 QWERTY Talent Pool and internal recruitment workspace

QWERTY must support a secure, consent-based CV/talent repository so authorized QWERTY recruitment personnel can use candidate profiles and CVs for legitimate recruitment activity. This is an **internal QWERTY recruitment capability**, not unrestricted admin browsing and not yet a self-service employer ATS.

### Candidate visibility and consent

Uploading a CV for AI assistance must **not automatically make that CV recruitable or visible to recruiters**. Candidates must be given a clear separate choice such as **“Make my profile available to QWERTY Recruitment”**.

The product must record:

- recruitment visibility/opt-in status;
- date/time and version of consent;
- allowed recruitment purpose/scope where applicable;
- withdrawal/revocation date where applicable;
- source of access when a candidate applied directly to a QWERTY-managed vacancy.

Candidates must be able to withdraw talent-pool visibility from account/privacy settings. Withdrawal stops future discovery/use except where limited retention is required for an existing application, legal obligation, security/audit record or other documented lawful purpose.

### Recruiter access

Only users with the dedicated Recruiter / Talent Admin permission may access the recruitment workspace. Authorized recruiters should be able to:

- search opted-in candidates by job-relevant structured fields;
- view the candidate-approved canonical professional profile;
- view/download authorized original or candidate-approved CV versions through short-lived signed access;
- link a candidate to a QWERTY-managed vacancy;
- maintain recruitment stages such as Sourced, Contacted, Interested, Applied, Interview, Offer and Closed;
- record recruiter notes and contact history;
- mark candidate interest/availability where the candidate has provided it;
- see when the CV/profile was last updated;
- respect candidate deletion, visibility and contact preferences.

The Talent Pool must not expose permanent public CV links. Every CV/profile view or download by recruitment personnel must be purpose-limited and auditable.

### ATS boundary

The first QWERTY ATS capability should be **ATS-lite/internal applicant tracking**, focused on storage, search, vacancy association, workflow/status management, notes and human review.

The system may provide factual summaries and evidence views, but the initial product must not automatically reject candidates, make employment decisions, or present opaque AI suitability rankings as hiring decisions. Sensitive/protected personal attributes must not be used as recruitment filters or decision criteria.

A later employer-facing ATS can reuse this foundation only after separate permissions, privacy, compliance, billing and employer-isolation requirements are designed.

---

## 7. Legacy content migration

The old websites are **content archives, not design templates**.

### Keep and modernise

- CV structure and application guidance;
- cover-letter guidance;
- interview fundamentals;
- STAR method;
- selected common interview questions;
- job-search/career resources;
- learning and skills resources.

### Rewrite/remove

- advice that encourages misrepresentation;
- overly absolute rules where practices vary by country/industry;
- dated “top skills in 2020/2021” claims presented as current;
- expired coupons or temporary promotions;
- inappropriate interview-question coaching;
- dead or misleading external links.

### Editorial standard

Every migrated article should have:

- owner/editor;
- status;
- publication date;
- last-reviewed date;
- modernised language;
- no deceptive guidance;
- a logical connection to a QWERTY feature only where genuinely useful.

---

## 8. Brand direction

QWERTY should retain continuity through **dark green, white and black**, without copying the old layouts.

Initial tokens:

- Primary: `#0B3D2E` deep forest green
- Secondary: `#1E6B50`
- Background: white / near-white
- Text: `#111111` / charcoal
- Success: green
- Warning: amber
- Error: red

Design principles:

- light, spacious interface;
- strong typography;
- dark-green navigation/primary actions;
- white reading/form surfaces;
- excellent mobile behaviour;
- accessible contrast;
- clear status states;
- restrained visual effects.

---

## 9. Non-functional requirements

### Security

- all secrets server-side;
- private CV storage;
- server/database authorization, not client checks alone;
- validation on all mutations;
- rate limits on sensitive and expensive operations;
- audit logs for important admin/security actions;
- no raw CV data in normal logs.

### Privacy

- candidates can access their own private records; authorized Recruiter / Talent Admin access is allowed only under documented recruitment consent/purpose and must be logged;
- clear privacy/AI processing disclosures;
- documented retention and deletion rules;
- export/delete account workflows;
- third-party processors reviewed before production use.

### Reliability

- production and development separated;
- database migrations versioned;
- backups/rollback considered before release;
- job publication failures do not corrupt a batch;
- AI failures degrade gracefully.

### Performance

- public job pages responsive on mobile connections;
- pagination for large job lists;
- background/queued handling for operations that become too long for request/response;
- cache reusable public data where appropriate.

### Accessibility

- keyboard-usable core flows;
- semantic labels and headings;
- accessible forms/errors;
- sufficient colour contrast;
- responsive layout.

---

## 10. MVP boundary

### Must be in first controlled beta

- public jobs and job detail pages;
- admin job CRUD;
- bulk job importer + review queue;
- authentication and candidate/admin roles;
- candidate profile/CV intake;
- consent-based QWERTY Talent Pool and restricted internal recruiter CV access;
- ATS-lite vacancy/candidate tracking for QWERTY recruitment;
- CV fit analysis and truthful tailoring;
- saved jobs/application tracker;
- basic cover letter and interview-prep flow;
- initial Career Hub CMS and migrated seed content;
- distribution copy generator;
- AI/audit usage logging;
- privacy/security baseline.

### Explicitly deferred

- external employer self-service ATS / employer portal (internal QWERTY ATS-lite is included);
- automatic candidate rejection/ranking;
- complex recruiter analytics;
- paid job promotions before organic traffic exists;
- microservices/Kubernetes;
- Elasticsearch/OpenSearch before PostgreSQL search is insufficient;
- native mobile apps;
- fully automated WhatsApp group publishing;
- universal ATS score;
- advanced voice interview simulation before text prep is proven.

---

## 11. Success metrics

### Supply

- active jobs;
- new jobs/week;
- median admin time from intake to publish;
- duplicate rate;
- expired-job rate.

### Audience

- unique visitors;
- WhatsApp/X click-through;
- registrations;
- returning users.

### Product value

- profile completion rate;
- fit analyses completed;
- tailored CVs saved/exported;
- cover letters created;
- interview-prep sessions;
- applications tracked.

### Recruitment / Talent Pool

- candidates opted in to recruitment visibility;
- recruiter searches/views with valid purpose;
- talent-pool candidates contacted;
- candidates linked to vacancies;
- interviews/offers sourced through QWERTY;
- consent withdrawals correctly enforced.

### Trust

- AI fabrication incidents;
- CV parse correction rate;
- suspicious-job reports;
- privacy/security incidents;
- support issues per active user.

### Economics

- AI usage/cost by feature;
- AI cost per completed useful workflow;
- admin minutes per 100 jobs;
- infrastructure cost per active user.

---

## 12. Definition of “QWERTY is back to life”

QWERTY is revived when it no longer depends on one person manually formatting everything: jobs flow into a structured platform, the community reliably reaches canonical job pages, candidates repeatedly use QWERTY to prepare and track applications, old career knowledge is maintained rather than abandoned, and the key workflows can be measured and improved.
