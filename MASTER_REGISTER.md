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
