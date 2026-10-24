# QWERTY Master Architecture Register

## Deferrals & Future Enhancements Register

### Stage 7.6 — AI Career Coach & Platform Governance Deferrals

1. **Global Distributed Gemini Rate Limiter**:
   - *Status*: Deferred to post-MVP scale phase.
   - *Current Implementation*: Per-instance worker concurrency bounds (`MAX_CONCURRENT_COACH_WORKERS = 3`, `MAX_CONCURRENT_PARSE_WORKERS = 5`) combined with atomic PostgreSQL job claims.
   - *Future Plan*: Deploy Redis Token Bucket / Redlock for global multi-region provider rate-limiting.

2. **Provider Quota & Token Analytics Dashboard**:
   - *Status*: Deferred.
   - *Future Plan*: Recruiter/Admin operational dashboard tracking daily Gemini token consumption and API cost breakdown.

3. **External Notifications (Email, Push, SMS, WhatsApp)**:
   - *Status*: Deferred.
   - *Current Implementation*: Private, candidate-scoped in-app notification system (`candidate_notifications` table with unread count and link navigation).
   - *Future Plan*: Web Push Service Workers and Twilio/SendGrid email integration.

4. **Conversation Export & Retention Controls**:
   - *Status*: Deferred.
   - *Current Implementation*: Candidate data cascade deletion on `profiles` removal.
   - *Future Plan*: Configurable 30-day auto-archive policy and JSON/PDF conversation export.

5. **Hallucination & Grounding Benchmark Suite**:
   - *Status*: Deferred.
   - *Current Implementation*: Strict evidence-safe system prompt instructions, clear source attribution, and ground context verification.


### Stage 7.6 — Queue Operations & Scale Controls

6. **Distributed/Global Gemini Concurrency Control**:
   - *Status*: Deferred; current queue concurrency is strictly per Node.js process only.
   - *Current Safety*: PostgreSQL conditional claims prevent two instances from successfully claiming the same queued job; this is not a global provider concurrency/quota limit.
   - *Future Plan*: Add a shared distributed limiter before horizontal scale-out.

7. **Provider Quota Dashboard**:
   - *Status*: Deferred.
   - *Future Plan*: Dashboard for provider quota, 429s, token consumption, latency and cost.

8. **Queue Depth Monitoring**:
   - *Status*: Deferred.
   - *Future Plan*: Alert on queued/due retryable counts and oldest eligible-job age.

9. **Processing Latency Metrics**:
   - *Status*: Deferred.
   - *Future Plan*: Record queue wait time, provider duration, end-to-end duration and timeout rates.

10. **Retry Metrics**:
    - *Status*: Deferred.
    - *Future Plan*: Track retry attempts, backoff, 429/5xx/network errors and exhausted attempts.

11. **Dead-Letter / Terminal Failure Operations**:
    - *Status*: Deferred.
    - *Future Plan*: Admin-only inspection, safe redrive, and documented terminal-failure resolution.

12. **Multi-Instance Load / Soak Testing**:
    - *Status*: Required before horizontal scale-out.
    - *Future Plan*: Exercise competing database claims, stale recovery boundaries, provider throttling, and sustained queue drainage across multiple Node processes.
