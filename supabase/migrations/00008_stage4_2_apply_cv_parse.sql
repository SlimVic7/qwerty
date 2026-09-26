BEGIN;

-- ============================================================
-- RPC: candidate_apply_cv_parse
-- Atomic Application of CV Parse Data to Profile
-- ============================================================

CREATE OR REPLACE FUNCTION public.candidate_apply_cv_parse(
    p_parse_id uuid,
    p_user_id uuid,
    p_reviewed_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_parse_record record;
    v_exp_text text;
    v_exp_num integer;
    v_links jsonb;
    v_link text;
    v_clean_url text;
    v_linkedin text;
    v_github text;
BEGIN
    -- Reject NULL or non-object reviewed_data
    IF p_reviewed_data IS NULL OR jsonb_typeof(p_reviewed_data) <> 'object' THEN
        RAISE EXCEPTION 'INVALID_REVIEWED_DATA';
    END IF;

    -- 1. Lock the exact parse row FOR UPDATE
    SELECT * INTO v_parse_record
    FROM public.candidate_cv_parses
    WHERE id = p_parse_id AND user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Parse not found or does not belong to user';
    END IF;

    -- Handle Idempotency / Double-Apply
    IF v_parse_record.status = 'completed' AND v_parse_record.applied_at IS NOT NULL THEN
        RETURN jsonb_build_object('status', 'ALREADY_APPLIED', 'parse_id', v_parse_record.id);
    END IF;

    -- 2. Validate current state
    IF v_parse_record.status <> 'needs_review' THEN
        RAISE EXCEPTION 'Parse is not in needs_review status (current status: %)', v_parse_record.status;
    END IF;

    IF v_parse_record.extracted_data IS NULL THEN
        RAISE EXCEPTION 'Parse has no extracted_data';
    END IF;

    -- Handle years_experience safely
    v_exp_text := NULLIF(BTRIM(p_reviewed_data->'professional'->>'years_experience'), '');
    IF v_exp_text IS NOT NULL THEN
        IF v_exp_text ~ '^[0-9]+$' THEN
            v_exp_num := v_exp_text::integer;
        ELSE
            RAISE EXCEPTION 'INVALID_YEARS_EXPERIENCE';
        END IF;
    END IF;

    -- Handle links array parsing with Markdown URL extraction
    v_links := p_reviewed_data->'personal'->'links';
    IF jsonb_typeof(v_links) = 'array' THEN
        FOR v_link IN SELECT * FROM jsonb_array_elements_text(v_links)
        LOOP
            v_link := BTRIM(v_link);
            -- Extract valid http/https URL, stripping markdown wrapping if present
            v_clean_url := substring(v_link from 'https?://[^\s)\]"''><]+');
            IF v_clean_url IS NOT NULL THEN
                IF v_clean_url ILIKE '%linkedin.com%' THEN
                    v_linkedin := v_clean_url;
                ELSIF v_clean_url ILIKE '%github.com%' THEN
                    v_github := v_clean_url;
                END IF;
            END IF;
        END LOOP;
    END IF;

    -- 3. Update public.profiles with strictly allowed fields
    UPDATE public.profiles
    SET 
        display_name = COALESCE(NULLIF(BTRIM(p_reviewed_data->'personal'->>'full_name'), ''), display_name),
        phone = COALESCE(NULLIF(BTRIM(p_reviewed_data->'personal'->>'phone'), ''), phone),
        city = COALESCE(NULLIF(BTRIM(split_part(p_reviewed_data->'personal'->>'location', ',', 1)), ''), city),
        country = COALESCE(NULLIF(BTRIM(split_part(p_reviewed_data->'personal'->>'location', ',', 2)), ''), country),
        professional_headline = COALESCE(NULLIF(BTRIM(p_reviewed_data->'professional'->>'headline'), ''), professional_headline),
        professional_summary = COALESCE(NULLIF(BTRIM(p_reviewed_data->'professional'->>'summary'), ''), professional_summary),
        years_experience = COALESCE(v_exp_num, years_experience),
        linkedin_url = COALESCE(NULLIF(v_linkedin, ''), linkedin_url),
        github_url = COALESCE(NULLIF(v_github, ''), github_url)
        -- Explicitly DO NOT map portfolio_url from unknown generic links
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PROFILE_NOT_FOUND';
    END IF;

    -- 4. Update the candidate_cv_parses record
    -- status to 'completed'
    -- populate reviewed_data, reviewed_at, applied_at
    -- retain extracted_data exactly as it was.
    UPDATE public.candidate_cv_parses
    SET
        status = 'completed',
        reviewed_data = p_reviewed_data,
        reviewed_at = CURRENT_TIMESTAMP,
        applied_at = CURRENT_TIMESTAMP
    WHERE id = v_parse_record.id;

    RETURN jsonb_build_object('status', 'APPLIED', 'parse_id', v_parse_record.id);
END;
$$;

-- Secure the RPC: only the service_role backend can execute this atomic apply.
REVOKE ALL ON FUNCTION public.candidate_apply_cv_parse(uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.candidate_apply_cv_parse(uuid, uuid, jsonb) TO service_role;

COMMIT;
