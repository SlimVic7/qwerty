/**
 * QWERTY Stage 7.4 — Career Course Recommendations Curated Seed Catalog
 * Curated, structured learning course options for tech role roadmap items.
 * Strictly zero AI generation, zero salary speculation, zero course ranking/affiliates.
 * Used exclusively for development and test environments when database table is not present.
 */

import { CareerCourseRecommendation } from './types.js';

export const CURATED_COURSE_RECOMMENDATIONS: CareerCourseRecommendation[] = [
  // =========================================================================
  // FRONTEND ENGINEER (Roadmap b1000000-0000-0000-0000-000000000001)
  // =========================================================================

  // Skill 1: Semantic HTML5 & Accessible Markup (foundation)
  {
    id: 'e1000000-0000-0000-0000-000000000001',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000001',
    title: 'W3C Introduction to Web Accessibility',
    provider_name: 'W3C & edX',
    url: 'https://www.edx.org/learn/web-development/w3c-introduction-to-web-accessibility',
    description: 'Foundational course covering digital accessibility principles, WCAG standards, semantic markup, and inclusive design for diverse user needs.',
    why_this_course: 'Provides authoritative instruction directly from the standards body on creating accessible web experiences that comply with international accessibility guidelines.',
    access_type: 'free',
    difficulty: 'foundation',
    display_order: 0,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },

  // Skill 3: JavaScript Fundamentals & DOM APIs (foundation)
  {
    id: 'e1000000-0000-0000-0000-000000000002',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000003',
    title: 'CS50 Web Programming with Python and JavaScript',
    provider_name: 'Harvard University',
    url: 'https://cs50.harvard.edu/web/',
    description: 'Comprehensive university curriculum covering modern client-side JavaScript, DOM interaction, client-server communication, and application design.',
    why_this_course: 'Delivers rigorous foundational instruction in client-side programming, asynchronous event handling, and software architecture.',
    access_type: 'free',
    difficulty: 'foundation',
    display_order: 0,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },

  // Skill 6: React Component Architecture & Hooks (core)
  {
    id: 'e1000000-0000-0000-0000-000000000003',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000006',
    title: 'Full Stack Open: Part 1 - Introduction to React',
    provider_name: 'University of Helsinki',
    url: 'https://fullstackopen.com/en/part1',
    description: 'In-depth university course on modern React component architecture, component state, event handling, and idiomatic hook patterns.',
    why_this_course: 'Focuses on production patterns, functional component design, and practical component lifecycle management using modern React standards.',
    access_type: 'free',
    difficulty: 'core',
    display_order: 0,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },

  // Skill 10: Web Performance & Core Web Vitals Optimization (advanced)
  {
    id: 'e1000000-0000-0000-0000-000000000004',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000010',
    title: 'Learn Performance',
    provider_name: 'web.dev by Google',
    url: 'https://web.dev/learn/performance/',
    description: 'Structured course on profiling critical rendering paths, optimizing Core Web Vitals (LCP, INP, CLS), and reducing resource bottlenecks.',
    why_this_course: 'Teaches performance analysis and optimization techniques directly aligned with browser rendering engines and modern web vitals benchmarks.',
    access_type: 'free',
    difficulty: 'advanced',
    display_order: 0,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },

  // =========================================================================
  // BACKEND ENGINEER (Roadmap b1000000-0000-0000-0000-000000000002)
  // =========================================================================

  // Skill 14: Relational Database Modeling & SQL (PostgreSQL) (foundation)
  {
    id: 'e1000000-0000-0000-0000-000000000005',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000014',
    title: 'Databases: Relational Databases and SQL',
    provider_name: 'Stanford University',
    url: 'https://online.stanford.edu/courses/soe-ydatabases0001-databases-relational-databases-and-sql',
    description: 'Foundational university course covering relational data modeling, schema normalization, constraints, and SQL relational algebra.',
    why_this_course: 'Provides structured theoretical and practical grounding in entity-relationship design and relational querying essential for backend services.',
    access_type: 'free',
    difficulty: 'foundation',
    display_order: 0,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },

  // Skill 16: Linux Environment, Bash & Networking Basics (foundation)
  {
    id: 'e1000000-0000-0000-0000-000000000006',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000016',
    title: 'Introduction to Linux (LFS101x)',
    provider_name: 'The Linux Foundation',
    url: 'https://training.linuxfoundation.org/training/introduction-to-linux/',
    description: 'Comprehensive training course on Linux system architecture, command-line operations, shell scripting, filesystem navigation, and network utilities.',
    why_this_course: 'Offers authoritative guidance from the governing open-source foundation on the host environment powering server workloads.',
    access_type: 'free',
    difficulty: 'foundation',
    display_order: 0,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },

  // Skill 17: Authentication, Authorization & Role-Based Access Control (RBAC) (core)
  {
    id: 'e1000000-0000-0000-0000-000000000007',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000017',
    title: 'Architecting for Security on AWS',
    provider_name: 'Amazon Web Services',
    url: 'https://explore.skillbuilder.aws/learn/course/external/view/elearning/134/architecting-for-security-on-aws',
    description: 'Training covering identity management, access token flows, least-privilege policies, and authorization architectures.',
    why_this_course: 'Translates abstract access control principles into enterprise identity, token verification, and permission enforcement patterns.',
    access_type: 'free_account_required',
    difficulty: 'core',
    display_order: 0,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },

  // Skill 23: Distributed Systems & Event-Driven Architecture (advanced)
  {
    id: 'e1000000-0000-0000-0000-000000000008',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000023',
    title: 'Distributed Computer Systems Engineering (MIT 6.824)',
    provider_name: 'MIT OpenCourseWare',
    url: 'https://ocw.mit.edu/courses/6-824-distributed-computer-systems-engineering-spring-2006//',
    description: 'Rigorous academic curriculum covering fault tolerance, consensus algorithms, replication, RPC semantics, and eventual consistency.',
    why_this_course: 'Equips engineers with deep theoretical and architectural foundations necessary to design resilient distributed backend topologies.',
    access_type: 'free',
    difficulty: 'advanced',
    display_order: 0,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },

  // =========================================================================
  // DATA ANALYST (Roadmap b1000000-0000-0000-0000-000000000005)
  // =========================================================================

  // Skill 25: SQL Querying & Data Extraction Foundations (foundation)
  {
    id: 'e1000000-0000-0000-0000-000000000009',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000025',
    title: 'SQL for Data Analysis',
    provider_name: 'Mode Analytics',
    url: 'https://mode.com/sql-tutorial/',
    description: 'Structured practical tutorial covering basic through intermediate SQL queries, joins, filtering, aggregations, and subqueries.',
    why_this_course: 'Provides hands-on business scenarios and interactive practice environments for extracting and preparing analytical datasets.',
    access_type: 'free',
    difficulty: 'foundation',
    display_order: 0,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },

  // Skill 28: Advanced SQL, CTEs & Analytical Window Functions (core)
  {
    id: 'e1000000-0000-0000-0000-000000000010',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000028',
    title: 'Intermediate and Advanced SQL Tutorial',
    provider_name: 'Mode Analytics',
    url: 'https://mode.com/sql-tutorial/sql-intermediate/',
    description: 'Comprehensive modules covering Common Table Expressions (CTEs), window functions (ROW_NUMBER, RANK, LEAD/LAG), and complex joins.',
    why_this_course: 'Builds the precise analytical querying competencies required for cumulative aggregations, cohort tracking, and multi-step data pipelines.',
    access_type: 'free',
    difficulty: 'core',
    display_order: 0,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },

  // Skill 30: Python for Data Analysis (Pandas & NumPy) (core)
  {
    id: 'e1000000-0000-0000-0000-000000000011',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000030',
    title: 'Python for Data Science',
    provider_name: 'cognitiveclass.ai (IBM Developer Skills Network)',
    url: 'https://cognitiveclass.ai/courses/python-for-data-science',
    description: 'Guided course covering Python fundamentals, NumPy array manipulations, and Pandas DataFrame transformations for data analytics.',
    why_this_course: 'Teaches practical data exploration, filtering, reshaping, and statistical summarization using core Python scientific libraries.',
    access_type: 'free_account_required',
    difficulty: 'core',
    display_order: 0,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },

  // Skill 33: A/B Testing & Controlled Experimentation (advanced)
  {
    id: 'e1000000-0000-0000-0000-000000000012',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000033',
    title: 'Online Controlled Experiments',
    provider_name: 'Stanford Online',
    url: 'https://online.stanford.edu/courses/xcs240-online-controlled-experiments',
    description: 'University-level course covering hypothesis testing, sample size determination, variance reduction, and interpreting A/B test results.',
    why_this_course: 'Provides rigorous statistical methodology to distinguish genuine user behaviour changes from random variance in product experiments.',
    access_type: 'free',
    difficulty: 'advanced',
    display_order: 0,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },

  // =========================================================================
  // PRODUCT MANAGER (Roadmap b1000000-0000-0000-0000-000000000008)
  // =========================================================================

  // Skill 35: User Research & Problem Discovery (foundation)
  {
    id: 'e1000000-0000-0000-0000-000000000013',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000035',
    title: 'Design Thinking for Innovation',
    provider_name: 'University of Virginia',
    url: 'https://online.darden.virginia.edu/design-thinking-innovation',
    description: 'Course exploring user empathy, qualitative discovery interviews, problem framing, and testing assumptions before committing engineering resources.',
    why_this_course: 'Introduces systematic frameworks to identify genuine customer pain points and prevent feature development based on unvalidated assumptions.',
    access_type: 'free',
    difficulty: 'foundation',
    display_order: 0,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },

  // Skill 36: Agile Delivery, Sprint Planning & User Stories (foundation)
  {
    id: 'e1000000-0000-0000-0000-000000000014',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000036',
    title: 'Agile Meets Design Thinking',
    provider_name: 'University of Virginia',
    url: 'https://online.darden.virginia.edu/agile-meets-design-thinking',
    description: 'Course on structuring sprint cycles, user story definition, acceptance criteria, and managing iterative delivery teams.',
    why_this_course: 'Helps product managers collaborate effectively with agile engineering teams to decompose large features into testable increments.',
    access_type: 'free',
    difficulty: 'foundation',
    display_order: 0,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },

  // Skill 38: Feature Prioritization Frameworks (RICE, Kano, Cost of Delay) (core)
  {
    id: 'e1000000-0000-0000-0000-000000000015',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000038',
    title: 'Product Management Foundations',
    provider_name: 'Mind the Product',
    url: 'https://www.mindtheproduct.com/training/foundations/',
    description: 'Structured training covering decision frameworks, trade-off analysis, prioritization matrices, and stakeholder alignment.',
    why_this_course: 'Teaches objective frameworks to evaluate competing feature requests and balance customer value against delivery effort.',
    access_type: 'free_account_required',
    difficulty: 'core',
    display_order: 0,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },

  // Skill 42: Product Vision, Strategy & Horizon Roadmapping (advanced)
  {
    id: 'e1000000-0000-0000-0000-000000000016',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000042',
    title: 'Strategic Leadership and Strategy Execution',
    provider_name: 'Harvard Division of Continuing Education',
    url: 'https://professional.dce.harvard.edu/programs/strategic-leadership/',
    description: 'Executive curriculum covering long-term horizon planning, competitive strategy, market positioning, and organizational alignment.',
    why_this_course: 'Builds competency in formulating high-level product strategies that connect market opportunity with engineering delivery roadmaps.',
    access_type: 'free',
    difficulty: 'advanced',
    display_order: 0,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },

  // =========================================================================
  // DEVOPS & PLATFORM ENGINEER (Roadmap b1000000-0000-0000-0000-000000000010)
  // =========================================================================

  // Skill 45: Linux Administration, Storage & Shell Automation (foundation)
  {
    id: 'e1000000-0000-0000-0000-000000000017',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000045',
    title: 'Linux System Administration Fundamentals',
    provider_name: 'The Linux Foundation',
    url: 'https://training.linuxfoundation.org/training/linux-system-administration-essentials-lfs207/',
    description: 'Structured coursework on server administration, storage allocation, systemd service management, and shell automation scripts.',
    why_this_course: 'Provides vendor-neutral instruction in configuring, maintaining, and automating Linux infrastructure environments.',
    access_type: 'free_account_required',
    difficulty: 'foundation',
    display_order: 0,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },

  // Skill 49: Infrastructure as Code (Terraform / OpenTofu) (core)
  {
    id: 'e1000000-0000-0000-0000-000000000018',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000049',
    title: 'Terraform Associate Study Course',
    provider_name: 'freeCodeCamp',
    url: 'https://www.freecodecamp.org/news/terraform-associate-study-course/',
    description: 'Comprehensive open curriculum covering declarative infrastructure definition, state file management, modules, and lifecycle rules.',
    why_this_course: 'Delivers structured, practical guidance on writing reproducible, version-controlled infrastructure configurations.',
    access_type: 'free',
    difficulty: 'core',
    display_order: 0,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },

  // Skill 51: Kubernetes & Container Orchestration Basics (core)
  {
    id: 'e1000000-0000-0000-0000-000000000019',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000051',
    title: 'Introduction to Kubernetes (LFS158x)',
    provider_name: 'CNCF & The Linux Foundation',
    url: 'https://training.linuxfoundation.org/training/introduction-to-kubernetes/',
    description: 'Authoritative training on container orchestration, pods, deployments, services, ingress networking, and cluster architecture.',
    why_this_course: 'Developed directly with the Cloud Native Computing Foundation to teach the core primitives of container orchestration.',
    access_type: 'free',
    difficulty: 'core',
    display_order: 0,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },

  // Skill 52: Site Reliability Engineering (SRE), SLIs & Error Budgets (advanced)
  {
    id: 'e1000000-0000-0000-0000-000000000020',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000052',
    title: 'Site Reliability Engineering: Measuring and Managing Reliability',
    provider_name: 'Google Cloud Training',
    url: 'https://www.coursera.org/learn/site-reliability-engineering-slis-slos-error-budgets',
    description: 'Course detailing service level indicators (SLIs), service level objectives (SLOs), error budget policies, and incident management.',
    why_this_course: 'Teaches the operational reliability framework created by Google for balancing release velocity with production stability.',
    access_type: 'free_account_required',
    difficulty: 'advanced',
    display_order: 0,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },

  // =========================================================================
  // CYBERSECURITY ANALYST (Roadmap b1000000-0000-0000-0000-000000000012)
  // =========================================================================

  // Skill 55: Network Protocols & Packet Analysis (Wireshark) (foundation)
  {
    id: 'e1000000-0000-0000-0000-000000000021',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000055',
    title: 'Network Security Fundamentals',
    provider_name: 'Cisco Networking Academy',
    url: 'https://www.netacad.com/courses/cybersecurity/network-security',
    description: 'Foundational training on network protocol interactions, packet sniffing, port behaviors, and firewall security perimeters.',
    why_this_course: 'Provides structured hands-on laboratory experience inspecting real network traffic and detecting malicious communication patterns.',
    access_type: 'free_account_required',
    difficulty: 'foundation',
    display_order: 0,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },

  // Skill 60: Incident Response, Containment & Forensic Triage (core)
  {
    id: 'e1000000-0000-0000-0000-000000000022',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000060',
    title: 'Hacker Techniques, Tools, and Incident Handling',
    provider_name: 'SANS Institute Community Programs',
    url: 'https://www.sans.org/cyber-security-courses/hacker-techniques-tools-incident-handling/',
    description: 'Course covering the preparation, identification, containment, eradication, recovery, and lessons-learned phases of incident triage.',
    why_this_course: 'Teaches the standard six-step incident response methodology used across security operations centers to contain compromises.',
    access_type: 'free',
    difficulty: 'core',
    display_order: 0,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },

  // Skill 61: Web Application Security & OWASP Top 10 (core)
  {
    id: 'e1000000-0000-0000-0000-000000000023',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000061',
    title: 'OWASP Top 10 Security Vulnerabilities Training',
    provider_name: 'freeCodeCamp & OWASP Community',
    url: 'https://www.freecodecamp.org/news/owasp-top-10-vulnerabilities/',
    description: 'Detailed walkthrough of the most critical web application security risks including injection, broken access control, and SSRF.',
    why_this_course: 'Provides practical code demonstrations and defensive remediation strategies mapped directly to OWASP standards.',
    access_type: 'free',
    difficulty: 'core',
    display_order: 0,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },

  // Skill 63: Security Compliance, Governance & Audit Frameworks (advanced)
  {
    id: 'e1000000-0000-0000-0000-000000000024',
    roadmap_item_id: 'c1000000-0000-0000-0000-000000000063',
    title: 'Foundations of Information Security',
    provider_name: 'NIST / Open edX',
    url: 'https://www.edx.org/learn/computer-security/university-of-washington-foundations-of-information-security',
    description: 'Course on cybersecurity risk assessment frameworks (NIST CSF, ISO 27001), regulatory compliance controls, and security auditing.',
    why_this_course: 'Teaches how to translate technical security postures into formal governance documentation and audit evidence.',
    access_type: 'free',
    difficulty: 'advanced',
    display_order: 0,
    status: 'published',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  }
];
