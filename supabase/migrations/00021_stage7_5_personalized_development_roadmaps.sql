-- =========================================================================
-- QWERTY Stage 7.5 — Personalized Development Roadmap Migration
-- Migration: 00021_stage7_5_personalized_development_roadmaps.sql
-- Status: PREPARED — NOT DEPLOYED — READY FOR MANUAL REVIEW
-- =========================================================================

BEGIN;

-- =========================================================================
-- 1. CANDIDATE DEVELOPMENT PLANS TABLE
-- =========================================================================

CREATE TABLE public.candidate_development_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id uuid NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    career_role_id uuid NOT NULL
        REFERENCES public.career_roles(id)
        ON DELETE RESTRICT,

    roadmap_id uuid NOT NULL
        REFERENCES public.career_role_roadmaps(id)
        ON DELETE RESTRICT,

    status text NOT NULL DEFAULT 'active',
    ruleset_version text NOT NULL DEFAULT 'personalized-development-roadmap-v1',
    summary text,

    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    archived_at timestamptz,

    CONSTRAINT chk_candidate_development_plans_status
        CHECK (status IN ('active', 'archived')),

    CONSTRAINT chk_candidate_development_plans_ruleset
        CHECK (
            char_length(trim(ruleset_version)) > 0
            AND char_length(ruleset_version) <= 100
        ),

    CONSTRAINT chk_candidate_development_plans_archived_consistency
        CHECK (
            (status = 'active' AND archived_at IS NULL)
            OR
            (status = 'archived' AND archived_at IS NOT NULL)
        )
);

CREATE UNIQUE INDEX uq_candidate_development_plans_active
    ON public.candidate_development_plans (user_id, career_role_id)
    WHERE status = 'active';

CREATE INDEX idx_candidate_development_plans_user_status
    ON public.candidate_development_plans (user_id, status);

CREATE INDEX idx_candidate_development_plans_role
    ON public.candidate_development_plans (career_role_id);

CREATE INDEX idx_candidate_development_plans_roadmap
    ON public.candidate_development_plans (roadmap_id);

-- =========================================================================
-- 2. CANDIDATE DEVELOPMENT PLAN ITEMS TABLE
-- =========================================================================

CREATE TABLE public.candidate_development_plan_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    plan_id uuid NOT NULL
        REFERENCES public.candidate_development_plans(id)
        ON DELETE CASCADE,

    roadmap_item_id uuid NOT NULL
        REFERENCES public.career_role_roadmap_items(id)
        ON DELETE RESTRICT,

    classification text NOT NULL,
    priority text NOT NULL,
    evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
    candidate_notes text,
    display_order integer NOT NULL DEFAULT 0,

    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_candidate_development_plan_items_plan_item
        UNIQUE (plan_id, roadmap_item_id),

    CONSTRAINT chk_candidate_development_plan_items_classification
        CHECK (
            classification IN (
                'evidence_found',
                'development_focus',
                'review_needed'
            )
        ),

    CONSTRAINT chk_candidate_development_plan_items_priority
        CHECK (
            priority IN (
                'now',
                'next',
                'later',
                'maintain'
            )
        ),

    CONSTRAINT chk_candidate_development_plan_items_evidence_refs_array
        CHECK (
            jsonb_typeof(evidence_refs) = 'array'
        ),

    CONSTRAINT chk_candidate_development_plan_items_display_order
        CHECK (
            display_order >= 0
        )
);

CREATE INDEX idx_candidate_development_plan_items_plan_priority_order
    ON public.candidate_development_plan_items (
        plan_id,
        priority,
        display_order
    );

CREATE INDEX idx_candidate_development_plan_items_roadmap_item
    ON public.candidate_development_plan_items (roadmap_item_id);

-- =========================================================================
-- 3. UPDATED_AT TRIGGERS
-- =========================================================================

CREATE TRIGGER set_candidate_development_plans_updated_at
    BEFORE UPDATE ON public.candidate_development_plans
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER set_candidate_development_plan_items_updated_at
    BEFORE UPDATE ON public.candidate_development_plan_items
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- =========================================================================
-- 4. ROW LEVEL SECURITY & LEAST-PRIVILEGE GRANTS
-- =========================================================================

ALTER TABLE public.candidate_development_plans
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.candidate_development_plan_items
    ENABLE ROW LEVEL SECURITY;

REVOKE ALL
ON TABLE public.candidate_development_plans
FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL
ON TABLE public.candidate_development_plan_items
FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.candidate_development_plans
TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.candidate_development_plan_items
TO service_role;

COMMIT;