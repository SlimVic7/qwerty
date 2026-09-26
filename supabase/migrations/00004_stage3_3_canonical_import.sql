BEGIN;

-- 1. Add tracking fields to import items
ALTER TABLE public.job_import_items
ADD COLUMN reviewed_by uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
ADD COLUMN reviewed_at timestamptz,
ADD COLUMN imported_by uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
ADD COLUMN imported_at timestamptz;

-- Consistency constraint for imported items
ALTER TABLE public.job_import_items
ADD CONSTRAINT job_import_items_imported_consistency 
CHECK (
    review_status <> 'imported' OR 
    (created_job_id IS NOT NULL AND imported_by IS NOT NULL AND imported_at IS NOT NULL)
);

-- Consistency constraint for approval attribution
ALTER TABLE public.job_import_items
ADD CONSTRAINT job_import_items_approval_consistency
CHECK (
    review_status NOT IN ('approved', 'imported') OR
    (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
);

-- 2. Create Audit Log Table for Import Items
CREATE TABLE public.job_import_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id uuid NOT NULL REFERENCES public.job_import_items(id) ON DELETE RESTRICT,
    batch_id uuid NOT NULL REFERENCES public.job_import_batches(id) ON DELETE RESTRICT,
    actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    action text NOT NULL CHECK (action IN ('edited', 'approved', 'rejected', 'marked_duplicate', 'unmarked_duplicate', 'imported')),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_job_import_audit_log_item ON public.job_import_audit_log(item_id);
CREATE INDEX idx_job_import_audit_log_batch ON public.job_import_audit_log(batch_id);
CREATE INDEX idx_job_import_audit_log_actor ON public.job_import_audit_log(actor_id);
CREATE INDEX idx_job_import_audit_log_created_at ON public.job_import_audit_log(created_at);

ALTER TABLE public.job_import_audit_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.job_import_audit_log FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.job_import_audit_log TO authenticated;
GRANT SELECT, INSERT ON public.job_import_audit_log TO service_role;

CREATE POLICY ops_select_audit_log ON public.job_import_audit_log
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('editor', 'admin', 'super_admin')
    )
);

-- 3. Atomic RPC for updating an item and its audit log
CREATE OR REPLACE FUNCTION public.ops_update_job_import_item(
    p_item_id uuid,
    p_actor_id uuid,
    p_updates jsonb,
    p_audit_action text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_item public.job_import_items%ROWTYPE;
    v_has_role boolean;
    v_new_normalized_data jsonb;
    v_new_validation_issues jsonb;
    v_new_review_status text;
    v_new_duplicate_of_job_id uuid;
    v_reviewed_by uuid;
    v_reviewed_at timestamptz;
    v_metadata jsonb;
    v_changed_keys jsonb;
    v_unsupported_keys jsonb;
    v_previous_status text;
    v_previous_normalized_data jsonb;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = p_actor_id 
        AND role IN ('editor', 'admin', 'super_admin')
    ) INTO v_has_role;
    
    IF NOT v_has_role THEN
        RAISE EXCEPTION 'INSUFFICIENT_PERMISSIONS';
    END IF;

    IF p_audit_action IS NULL OR trim(p_audit_action) = '' THEN
        RAISE EXCEPTION 'INVALID_ACTION';
    END IF;

    IF p_updates IS NULL OR jsonb_typeof(p_updates) <> 'object' THEN
        RAISE EXCEPTION 'INVALID_UPDATES_FORMAT';
    END IF;

    -- Validate json shapes
    IF p_updates ? 'normalized_data' AND jsonb_typeof(p_updates->'normalized_data') <> 'object' THEN
        RAISE EXCEPTION 'INVALID_UPDATES_FORMAT';
    END IF;
    IF p_updates ? 'validation_issues' AND jsonb_typeof(p_updates->'validation_issues') <> 'array' THEN
        RAISE EXCEPTION 'INVALID_UPDATES_FORMAT';
    END IF;

    SELECT jsonb_agg(key) INTO v_unsupported_keys
    FROM jsonb_object_keys(p_updates) AS key
    WHERE key NOT IN ('normalized_data', 'validation_issues', 'review_status', 'duplicate_of_job_id');
    
    IF v_unsupported_keys IS NOT NULL THEN
        RAISE EXCEPTION 'UNSUPPORTED_UPDATE_FIELD';
    END IF;

    SELECT * INTO v_item FROM public.job_import_items WHERE id = p_item_id FOR UPDATE;
    IF v_item.id IS NULL THEN
        RAISE EXCEPTION 'ITEM_NOT_FOUND';
    END IF;

    IF v_item.review_status = 'imported' THEN
        RAISE EXCEPTION 'ITEM_ALREADY_IMPORTED';
    END IF;

    v_previous_status := v_item.review_status;
    v_previous_normalized_data := COALESCE(v_item.normalized_data, '{}'::jsonb);

    v_new_normalized_data := COALESCE(p_updates->'normalized_data', v_item.normalized_data, '{}'::jsonb);
    v_new_validation_issues := COALESCE(p_updates->'validation_issues', v_item.validation_issues, '[]'::jsonb);
    v_new_review_status := COALESCE(p_updates->>'review_status', v_item.review_status);
    
    IF p_updates ? 'duplicate_of_job_id' THEN
        v_new_duplicate_of_job_id := NULLIF(p_updates->>'duplicate_of_job_id', '')::uuid;
    ELSE
        v_new_duplicate_of_job_id := v_item.duplicate_of_job_id;
    END IF;

    v_reviewed_by := v_item.reviewed_by;
    v_reviewed_at := v_item.reviewed_at;

    IF p_audit_action = 'approved' THEN
        IF v_new_review_status <> 'approved' THEN RAISE EXCEPTION 'INCONSISTENT_STATUS'; END IF;
        IF v_new_duplicate_of_job_id IS NOT NULL THEN RAISE EXCEPTION 'DUPLICATE_BLOCKED'; END IF;
        IF jsonb_array_length(v_new_validation_issues) > 0 THEN RAISE EXCEPTION 'VALIDATION_FAILED'; END IF;
        
        IF COALESCE(trim(v_new_normalized_data->>'title'), '') = '' OR 
           COALESCE(trim(v_new_normalized_data->>'company_name'), '') = '' OR 
           COALESCE(trim(v_new_normalized_data->>'description'), '') = '' THEN
            RAISE EXCEPTION 'VALIDATION_FAILED';
        END IF;

        v_reviewed_by := p_actor_id;
        v_reviewed_at := CURRENT_TIMESTAMP;
    ELSIF p_audit_action = 'rejected' THEN
        IF v_new_review_status <> 'rejected' THEN RAISE EXCEPTION 'INCONSISTENT_STATUS'; END IF;
        v_reviewed_by := p_actor_id;
        v_reviewed_at := CURRENT_TIMESTAMP;
    ELSIF p_audit_action = 'marked_duplicate' THEN
        IF v_new_review_status <> 'duplicate' THEN RAISE EXCEPTION 'INCONSISTENT_STATUS'; END IF;
        v_reviewed_by := p_actor_id;
        v_reviewed_at := CURRENT_TIMESTAMP;
    ELSIF p_audit_action = 'unmarked_duplicate' THEN
        IF v_new_review_status = 'duplicate' THEN RAISE EXCEPTION 'INCONSISTENT_STATUS'; END IF;
        IF v_new_duplicate_of_job_id IS NOT NULL THEN RAISE EXCEPTION 'INCONSISTENT_STATUS'; END IF;
        v_reviewed_by := p_actor_id;
        v_reviewed_at := CURRENT_TIMESTAMP;
    ELSIF p_audit_action = 'edited' THEN
        IF v_new_review_status IN ('imported', 'rejected', 'duplicate', 'approved') THEN 
            RAISE EXCEPTION 'INCONSISTENT_STATUS'; 
        END IF;
        v_reviewed_by := p_actor_id;
        v_reviewed_at := CURRENT_TIMESTAMP;
    ELSE
        RAISE EXCEPTION 'INVALID_ACTION';
    END IF;

    UPDATE public.job_import_items
    SET
        normalized_data = v_new_normalized_data,
        validation_issues = v_new_validation_issues,
        review_status = v_new_review_status,
        duplicate_of_job_id = v_new_duplicate_of_job_id,
        reviewed_by = v_reviewed_by,
        reviewed_at = v_reviewed_at,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_item_id
    RETURNING * INTO v_item;

    v_metadata := jsonb_build_object(
        'previous_status', v_previous_status,
        'new_status', v_new_review_status
    );
    
    IF p_audit_action = 'edited' THEN
        SELECT jsonb_agg(k) INTO v_changed_keys FROM (
            SELECT k FROM (
                SELECT jsonb_object_keys(v_new_normalized_data) AS k
                UNION
                SELECT jsonb_object_keys(v_previous_normalized_data) AS k
            ) all_keys
            WHERE v_new_normalized_data->k IS DISTINCT FROM v_previous_normalized_data->k
        ) sub;
        IF v_changed_keys IS NOT NULL THEN
            v_metadata := jsonb_set(v_metadata, '{changed_fields}', v_changed_keys);
        END IF;
    END IF;
    
    INSERT INTO public.job_import_audit_log (item_id, batch_id, actor_id, action, metadata)
    VALUES (p_item_id, v_item.batch_id, p_actor_id, p_audit_action, v_metadata);

    RETURN to_jsonb(v_item);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ops_update_job_import_item FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ops_update_job_import_item TO service_role;

-- 4. Atomic RPC for importing an approved item to canonical draft
CREATE OR REPLACE FUNCTION public.ops_import_job_item(
    p_item_id uuid,
    p_actor_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_item public.job_import_items%ROWTYPE;
    v_job public.jobs%ROWTYPE;
    v_has_role boolean;
    v_slug text;
    v_base_slug text;
    v_title text;
    v_company text;
    v_desc text;
BEGIN
    -- Check roles (editor, admin, super_admin)
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = p_actor_id 
        AND role IN ('editor', 'admin', 'super_admin')
    ) INTO v_has_role;
    
    IF NOT v_has_role THEN
        RAISE EXCEPTION 'INSUFFICIENT_PERMISSIONS';
    END IF;

    -- Lock item for update to ensure concurrency protection
    SELECT * INTO v_item FROM public.job_import_items WHERE id = p_item_id FOR UPDATE;
    
    IF v_item.id IS NULL THEN
        RAISE EXCEPTION 'ITEM_NOT_FOUND';
    END IF;

    -- Idempotency check: if already imported, return gracefully
    IF v_item.created_job_id IS NOT NULL OR v_item.review_status = 'imported' THEN
        RETURN jsonb_build_object(
            'status', 'ALREADY_IMPORTED',
            'job_id', v_item.created_job_id
        );
    END IF;

    IF v_item.duplicate_of_job_id IS NOT NULL THEN
        RAISE EXCEPTION 'DUPLICATE_BLOCKED';
    END IF;

    IF v_item.review_status <> 'approved' THEN
        RAISE EXCEPTION 'ITEM_NOT_APPROVED';
    END IF;
    
    IF COALESCE(jsonb_array_length(v_item.validation_issues), 0) > 0 THEN
        RAISE EXCEPTION 'VALIDATION_FAILED';
    END IF;

    -- Validate canonical minimum requirements
    v_title := v_item.normalized_data->>'title';
    v_company := v_item.normalized_data->>'company_name';
    v_desc := v_item.normalized_data->>'description';

    IF v_title IS NULL OR v_company IS NULL OR v_desc IS NULL OR trim(v_title) = '' OR trim(v_company) = '' OR trim(v_desc) = '' THEN
        RAISE EXCEPTION 'VALIDATION_FAILED';
    END IF;

    -- Generate secure unique deterministic slug using the item ID
    v_base_slug := lower(regexp_replace(v_title || '-' || v_company, '[^a-zA-Z0-9]+', '-', 'g'));
    v_base_slug := trim(both '-' from v_base_slug);
    v_slug := v_base_slug || '-' || replace(p_item_id::text, '-', '');

    -- Call ops_create_job synchronously to enforce Stage 2.2 rules and job_audit_log creation
    v_job := public.ops_create_job(
        p_actor_id,
        v_slug,
        v_title,
        v_company,
        v_item.normalized_data->>'company_logo_url',
        v_item.normalized_data->>'location_text',
        v_item.normalized_data->>'country',
        v_item.normalized_data->>'city',
        v_item.normalized_data->>'workplace_type',
        v_item.normalized_data->>'employment_type',
        v_item.normalized_data->>'experience_level',
        v_desc,
        v_item.normalized_data->>'responsibilities',
        v_item.normalized_data->>'requirements',
        v_item.normalized_data->>'preferred_qualifications',
        v_item.normalized_data->>'benefits',
        NULLIF(btrim(v_item.normalized_data->>'salary_min'), '')::numeric,
        NULLIF(btrim(v_item.normalized_data->>'salary_max'), '')::numeric,
        v_item.normalized_data->>'salary_currency',
        v_item.normalized_data->>'salary_period',
        v_item.normalized_data->>'application_url',
        v_item.normalized_data->>'application_email',
        v_item.normalized_data->>'source_name',
        v_item.normalized_data->>'source_url',
        NULLIF(btrim(v_item.normalized_data->>'application_deadline'), '')::timestamptz
    );

    -- Update staging record atomic linkage
    UPDATE public.job_import_items
    SET review_status = 'imported',
        created_job_id = v_job.id,
        imported_by = p_actor_id,
        imported_at = CURRENT_TIMESTAMP
    WHERE id = p_item_id;

    -- Record import event
    INSERT INTO public.job_import_audit_log (item_id, batch_id, actor_id, action, metadata)
    VALUES (p_item_id, v_item.batch_id, p_actor_id, 'imported', jsonb_build_object(
        'previous_status', 'approved',
        'new_status', 'imported',
        'job_id', v_job.id
    ));

    RETURN jsonb_build_object(
        'status', 'IMPORTED',
        'job_id', v_job.id
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ops_import_job_item FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ops_import_job_item TO service_role;

COMMIT;
