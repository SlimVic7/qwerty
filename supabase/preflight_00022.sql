-- ============================================================================
-- QWERTY STAGE 7.6 PREFLIGHT — READ ONLY
-- Run before migration 00022. This script performs catalog reads only.
-- It intentionally does not create temporary objects or modify application data.
-- ============================================================================
DO $preflight$
DECLARE
    v_missing text[] := ARRAY[]::text[];
    v_conflicts text[] := ARRAY[]::text[];
    v_failed text[] := ARRAY[]::text[];
    v_required_tables text[] := ARRAY[
      'profiles',
      'career_roles',
      'career_role_roadmaps',
      'career_role_roadmap_items',
      'career_learning_resources',
      'career_course_recommendations',
      'candidate_development_plans',
      'candidate_development_plan_items',
      'candidate_cv_parses',
      'candidate_cv_versions'
    ];
    v_targets text[] := ARRAY[
      'candidate_career_coach_threads',
      'candidate_career_coach_messages',
      'candidate_career_coach_jobs',
      'candidate_notifications'
    ];
    v_constraint_names text[] := ARRAY[
      'pk_candidate_career_coach_threads',
      'fk_candidate_career_coach_threads_user',
      'fk_candidate_career_coach_threads_role',
      'uq_candidate_career_coach_threads_id_user',
      'chk_candidate_career_coach_threads_status',
      'pk_candidate_career_coach_messages',
      'fk_candidate_career_coach_messages_thread_owner',
      'fk_candidate_career_coach_messages_user',
      'uq_candidate_career_coach_messages_id_thread_user',
      'chk_candidate_career_coach_messages_role',
      'chk_candidate_career_coach_messages_grounding_object',
      'pk_candidate_career_coach_jobs',
      'fk_candidate_career_coach_jobs_user',
      'fk_candidate_career_coach_jobs_thread_owner',
      'fk_candidate_career_coach_jobs_msg_owner',
      'chk_candidate_career_coach_jobs_status',
      'chk_candidate_career_coach_jobs_attempt_count',
      'chk_candidate_career_coach_jobs_started_at',
      'chk_candidate_career_coach_jobs_completed_at',
      'pk_candidate_notifications',
      'fk_candidate_notifications_user',
      'chk_candidate_notifications_type'
    ];
    v_index_names text[] := ARRAY[
      'idx_candidate_career_coach_threads_user',
      'idx_candidate_career_coach_threads_role',
      'idx_candidate_career_coach_messages_thread',
      'idx_candidate_career_coach_messages_user',
      'uq_candidate_career_coach_messages_assistant_job',
      'idx_candidate_career_coach_jobs_queue',
      'idx_candidate_career_coach_jobs_user',
      'idx_candidate_career_coach_jobs_thread',
      'idx_candidate_notifications_user',
      'uq_candidate_notifications_career_coach_job_link'
    ];
    v_trigger_names text[] := ARRAY[
      'set_candidate_career_coach_threads_updated_at',
      'set_candidate_career_coach_jobs_updated_at'
    ];
    v_table text;
    v_col text;
    v_type text;
    v_count bigint;
    v_roles bigint := -1;
    v_roadmap_items bigint := -1;
    v_resources bigint := -1;
    v_courses bigint := -1;
    v_pass boolean := true;
BEGIN
    RAISE NOTICE 'Starting read-only Stage 7.6 preflight';

    -- 1. Check prerequisites first. No dependent table is queried until its
    -- existence has been established.
    FOREACH v_table IN ARRAY v_required_tables LOOP
      IF to_regclass(format('%I.%I', 'public', v_table)) IS NULL THEN
        v_missing := array_append(v_missing, 'public.' || v_table);
      END IF;
    END LOOP;
    IF cardinality(v_missing) > 0 THEN
      v_failed := array_append(v_failed, 'missing prerequisite tables: ' || array_to_string(v_missing, ', '));
    END IF;

    -- 2. Reject target relations in ANY schema, not just public.
    IF EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = ANY(v_targets)
        AND c.relkind IN ('r','p','v','m','f')
    ) THEN
      SELECT array_agg(format('%I.%I', n.nspname, c.relname) ORDER BY n.nspname, c.relname)
        INTO v_conflicts
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = ANY(v_targets) AND c.relkind IN ('r','p','v','m','f');
      v_failed := array_append(v_failed, 'target relation already exists: ' || array_to_string(v_conflicts, ', '));
    END IF;

    -- 3. Ensure all governed prerequisite ID columns have UUID type.
    -- These are the identifiers referenced by Stage 7.6 or used as parent IDs.
    FOREACH v_table IN ARRAY ARRAY[
      'profiles','career_roles','career_role_roadmaps','career_role_roadmap_items',
      'career_learning_resources','career_course_recommendations',
      'candidate_development_plans','candidate_development_plan_items','candidate_cv_parses','candidate_cv_versions'
    ] LOOP
      IF to_regclass(format('%I.%I', 'public', v_table)) IS NOT NULL THEN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name=v_table AND column_name='id' AND data_type='uuid'
        ) THEN
          v_failed := array_append(v_failed, 'expected UUID id column: public.' || v_table);
        END IF;
      END IF;
    END LOOP;
    IF to_regclass('public.candidate_cv_versions') IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='candidate_cv_versions'
        AND column_name='user_id' AND data_type='uuid'
    ) THEN
      v_failed := array_append(v_failed, 'expected UUID candidate_cv_versions.user_id');
    END IF;
    IF to_regclass('public.candidate_cv_parses') IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='candidate_cv_parses'
        AND column_name='user_id' AND data_type='uuid'
    ) THEN
      v_failed := array_append(v_failed, 'expected UUID candidate_cv_parses.user_id');
    END IF;

    -- Columns queried directly by the context-generation code.
    IF to_regclass('public.profiles') IS NOT NULL THEN
      FOREACH v_col IN ARRAY ARRAY['full_name','headline','skills'] LOOP
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name='profiles' AND column_name=v_col) THEN
          v_failed := array_append(v_failed, 'missing context column: public.profiles.' || v_col);
        END IF;
      END LOOP;
    END IF;
    IF to_regclass('public.candidate_cv_parses') IS NOT NULL THEN
      FOREACH v_col IN ARRAY ARRAY['user_id','status','completed_at','extracted_data'] LOOP
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name='candidate_cv_parses' AND column_name=v_col) THEN
          v_failed := array_append(v_failed, 'missing context column: public.candidate_cv_parses.' || v_col);
        END IF;
      END LOOP;
    END IF;

    -- 4. Require the canonical timestamp helper and database roles.
    IF to_regprocedure('public.set_current_timestamp_updated_at()') IS NULL THEN
      v_failed := array_append(v_failed, 'missing public.set_current_timestamp_updated_at()');
    END IF;
    FOREACH v_table IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname=v_table) THEN
        v_failed := array_append(v_failed, 'missing database role: ' || v_table);
      END IF;
    END LOOP;

    -- 5. Constraint/index/trigger names must be free across the database.
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = ANY(v_constraint_names)) THEN
      SELECT array_agg(DISTINCT conname ORDER BY conname) INTO v_conflicts
      FROM pg_constraint WHERE conname = ANY(v_constraint_names);
      v_failed := array_append(v_failed, 'constraint names already exist: ' || array_to_string(v_conflicts, ', '));
    END IF;
    IF EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE c.relkind IN ('i','I') AND c.relname = ANY(v_index_names)
    ) THEN
      SELECT array_agg(DISTINCT format('%I.%I',n.nspname,c.relname) ORDER BY format('%I.%I',n.nspname,c.relname))
        INTO v_conflicts
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE c.relkind IN ('i','I') AND c.relname = ANY(v_index_names);
      v_failed := array_append(v_failed, 'index names already exist: ' || array_to_string(v_conflicts, ', '));
    END IF;
    IF EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE NOT tgisinternal AND tgname = ANY(v_trigger_names)
    ) THEN
      SELECT array_agg(DISTINCT tgname ORDER BY tgname) INTO v_conflicts
      FROM pg_trigger WHERE NOT tgisinternal AND tgname = ANY(v_trigger_names);
      v_failed := array_append(v_failed, 'trigger names already exist: ' || array_to_string(v_conflicts, ', '));
    END IF;

    -- 6. No target policies should pre-exist in any schema.
    IF EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = ANY(v_targets)
    ) THEN
      SELECT array_agg(format('%I.%I:%I', schemaname, tablename, policyname) ORDER BY schemaname, tablename, policyname)
        INTO v_conflicts
      FROM pg_policies WHERE tablename = ANY(v_targets);
      v_failed := array_append(v_failed, 'target policies already exist: ' || array_to_string(v_conflicts, ', '));
    END IF;

    -- 7. Governed baseline counts. Run each count only when its table exists.
    IF to_regclass('public.career_roles') IS NOT NULL THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='career_roles' AND column_name='status') THEN
        EXECUTE 'SELECT count(*) FROM public.career_roles WHERE status = ''published''' INTO v_roles;
      ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='career_roles' AND column_name='is_published') THEN
        EXECUTE 'SELECT count(*) FROM public.career_roles WHERE is_published IS TRUE' INTO v_roles;
      ELSE
        v_failed := array_append(v_failed, 'career_roles has no recognized published-state column');
      END IF;
      IF v_roles <> 13 THEN v_failed := array_append(v_failed, format('Stage 7.1 published roles expected 13, got %s', v_roles)); END IF;
    END IF;

    IF to_regclass('public.career_role_roadmap_items') IS NOT NULL THEN
      EXECUTE 'SELECT count(*) FROM public.career_role_roadmap_items' INTO v_roadmap_items;
      IF v_roadmap_items <> 64 THEN v_failed := array_append(v_failed, format('Stage 7.2 roadmap items expected 64, got %s', v_roadmap_items)); END IF;
    END IF;

    IF to_regclass('public.career_learning_resources') IS NOT NULL THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='career_learning_resources' AND column_name='status') THEN
        EXECUTE 'SELECT count(*) FROM public.career_learning_resources WHERE status = ''published''' INTO v_resources;
      ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='career_learning_resources' AND column_name='is_published') THEN
        EXECUTE 'SELECT count(*) FROM public.career_learning_resources WHERE is_published IS TRUE' INTO v_resources;
      ELSE
        v_failed := array_append(v_failed, 'career_learning_resources has no recognized published-state column');
      END IF;
      IF v_resources <> 47 THEN v_failed := array_append(v_failed, format('Stage 7.3 published learning resources expected 47, got %s', v_resources)); END IF;
    END IF;

    IF to_regclass('public.career_course_recommendations') IS NOT NULL THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='career_course_recommendations' AND column_name='status') THEN
        EXECUTE 'SELECT count(*) FROM public.career_course_recommendations WHERE status = ''published''' INTO v_courses;
      ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='career_course_recommendations' AND column_name='is_published') THEN
        EXECUTE 'SELECT count(*) FROM public.career_course_recommendations WHERE is_published IS TRUE' INTO v_courses;
      ELSE
        v_failed := array_append(v_failed, 'career_course_recommendations has no recognized published-state column');
      END IF;
      IF v_courses <> 24 THEN v_failed := array_append(v_failed, format('Stage 7.4 published course recommendations expected 24, got %s', v_courses)); END IF;
    END IF;

    -- 8. Fail closed: all prerequisite tables are checked before baseline queries,
    -- and any failed condition makes the single final gate false.
    v_pass := cardinality(v_failed) = 0;
    RAISE NOTICE 'Stage 7.1 published roles: % (expected 13)', v_roles;
    RAISE NOTICE 'Stage 7.2 roadmap items: % (expected 64)', v_roadmap_items;
    RAISE NOTICE 'Stage 7.3 published learning resources: % (expected 47)', v_resources;
    RAISE NOTICE 'Stage 7.4 published course recommendations: % (expected 24)', v_courses;
    RAISE NOTICE 'Preflight findings: %', CASE WHEN cardinality(v_failed)=0 THEN 'none' ELSE array_to_string(v_failed, ' | ') END;
    RAISE NOTICE 'STAGE 7.6 PREFLIGHT FINAL | %', v_pass;
END
$preflight$;
