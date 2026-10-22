-- ============================================================================
-- QWERTY STAGE 7.6 — AI CAREER COACH & IN-APP NOTIFICATIONS SCHEMA
-- Migration: 00022_stage7_6_ai_career_coach.sql
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. candidate_career_coach_threads
-- Stores conversation threads between a candidate and the AI Career Coach
-- ----------------------------------------------------------------------------
CREATE TABLE public.candidate_career_coach_threads (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    career_role_id uuid NULL,
    title text NOT NULL DEFAULT 'Career Coaching Session',
    status text NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_candidate_career_coach_threads PRIMARY KEY (id),
    CONSTRAINT fk_candidate_career_coach_threads_user FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_candidate_career_coach_threads_role FOREIGN KEY (career_role_id) REFERENCES public.career_roles(id) ON DELETE SET NULL,
    CONSTRAINT chk_candidate_career_coach_threads_status CHECK (status IN ('active', 'archived'))
);

CREATE INDEX idx_candidate_career_coach_threads_user ON public.candidate_career_coach_threads(user_id, updated_at DESC);
CREATE INDEX idx_candidate_career_coach_threads_role ON public.candidate_career_coach_threads(career_role_id);

-- Updated_at trigger
CREATE TRIGGER set_candidate_career_coach_threads_updated_at
    BEFORE UPDATE ON public.candidate_career_coach_threads
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 2. candidate_career_coach_messages
-- Stores individual user and assistant messages in a Career Coach thread
-- ----------------------------------------------------------------------------
CREATE TABLE public.candidate_career_coach_messages (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    thread_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    grounding_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_candidate_career_coach_messages PRIMARY KEY (id),
    CONSTRAINT fk_candidate_career_coach_messages_thread FOREIGN KEY (thread_id) REFERENCES public.candidate_career_coach_threads(id) ON DELETE CASCADE,
    CONSTRAINT fk_candidate_career_coach_messages_user FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT chk_candidate_career_coach_messages_role CHECK (role IN ('user', 'assistant', 'system_event'))
);

CREATE INDEX idx_candidate_career_coach_messages_thread ON public.candidate_career_coach_messages(thread_id, created_at ASC);
CREATE INDEX idx_candidate_career_coach_messages_user ON public.candidate_career_coach_messages(user_id);

-- ----------------------------------------------------------------------------
-- 3. candidate_career_coach_jobs
-- Asynchronous durable queue for processing Gemini Career Coach requests
-- ----------------------------------------------------------------------------
CREATE TABLE public.candidate_career_coach_jobs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    thread_id uuid NOT NULL,
    user_message_id uuid NOT NULL,
    status text NOT NULL DEFAULT 'queued',
    attempt_count integer NOT NULL DEFAULT 0,
    provider text NOT NULL DEFAULT 'gemini',
    model text NOT NULL DEFAULT 'gemini-2.5-flash',
    error_code text NULL,
    available_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at timestamptz NULL,
    completed_at timestamptz NULL,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_candidate_career_coach_jobs PRIMARY KEY (id),
    CONSTRAINT fk_candidate_career_coach_jobs_user FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_candidate_career_coach_jobs_thread FOREIGN KEY (thread_id) REFERENCES public.candidate_career_coach_threads(id) ON DELETE CASCADE,
    CONSTRAINT fk_candidate_career_coach_jobs_msg FOREIGN KEY (user_message_id) REFERENCES public.candidate_career_coach_messages(id) ON DELETE CASCADE,
    CONSTRAINT chk_candidate_career_coach_jobs_status CHECK (status IN ('queued', 'processing', 'completed', 'failed_retryable', 'failed_permanent'))
);

CREATE INDEX idx_candidate_career_coach_jobs_queue ON public.candidate_career_coach_jobs(status, available_at) WHERE status IN ('queued', 'failed_retryable');
CREATE INDEX idx_candidate_career_coach_jobs_user ON public.candidate_career_coach_jobs(user_id, created_at DESC);
CREATE INDEX idx_candidate_career_coach_jobs_thread ON public.candidate_career_coach_jobs(thread_id);

-- Updated_at trigger
CREATE TRIGGER set_candidate_career_coach_jobs_updated_at
    BEFORE UPDATE ON public.candidate_career_coach_jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 4. candidate_notifications
-- Lightweight in-app candidate notifications for job completions
-- ----------------------------------------------------------------------------
CREATE TABLE public.candidate_notifications (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    type text NOT NULL DEFAULT 'career_coach_response',
    title text NOT NULL,
    message text NOT NULL,
    link_url text NULL,
    is_read boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_candidate_notifications PRIMARY KEY (id),
    CONSTRAINT fk_candidate_notifications_user FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT chk_candidate_notifications_type CHECK (type IN ('career_coach_response', 'cv_parse_complete', 'job_alert', 'system'))
);

CREATE INDEX idx_candidate_notifications_user ON public.candidate_notifications(user_id, is_read, created_at DESC);

-- ----------------------------------------------------------------------------
-- 5. RLS & PERMISSIONS
-- Server-mediated access pattern: RLS enabled, zero direct public policies,
-- service_role granted CRUD privileges.
-- ----------------------------------------------------------------------------
ALTER TABLE public.candidate_career_coach_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_career_coach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_career_coach_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_notifications ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.candidate_career_coach_threads FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.candidate_career_coach_messages FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.candidate_career_coach_jobs FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.candidate_notifications FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_career_coach_threads TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_career_coach_messages TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_career_coach_jobs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_notifications TO service_role;

COMMIT;
