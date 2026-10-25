-- ============================================================================
-- QWERTY STAGE 7.6 POST-VERIFY — READ ONLY
-- Run only after a future deployment of migration 00022.
-- Repository immutability (migrations 00000–00021) must be checked separately
-- with Git; SQL cannot prove that repository files were not edited.
-- ============================================================================
DO $postverify$
DECLARE
    v_targets text[] := ARRAY[
      'candidate_career_coach_threads',
      'candidate_career_coach_messages',
      'candidate_career_coach_jobs',
      'candidate_notifications'
    ];
    v_failed text[] := ARRAY[]::text[];
    v_table text;
    v_col record;
    v_fk record;
    v_expected record;
    v_count bigint;
    v_roles bigint := -1;
    v_roadmap_items bigint := -1;
    v_resources bigint := -1;
    v_courses bigint := -1;
    v_pass boolean := true;
    v_privs text[];
BEGIN
    RAISE NOTICE 'Starting read-only Stage 7.6 post-verification';

    -- A. Target tables must exist in public, and must not be ambiguous in another schema.
    FOREACH v_table IN ARRAY v_targets LOOP
      IF to_regclass(format('%I.%I','public',v_table)) IS NULL THEN
        v_failed := array_append(v_failed, 'missing target table public.' || v_table);
      END IF;
      IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
          WHERE c.relname=v_table AND c.relkind IN ('r','p','v','m','f')) <> 1 THEN
        v_failed := array_append(v_failed, 'target table name is missing or ambiguous across schemas: ' || v_table);
      END IF;
    END LOOP;

    -- B. Column contract: table.column, PostgreSQL data_type, nullability.
    FOR v_col IN
      SELECT * FROM (VALUES
        ('candidate_career_coach_threads','id','uuid','NO'),
        ('candidate_career_coach_threads','user_id','uuid','NO'),
        ('candidate_career_coach_threads','career_role_id','uuid','YES'),
        ('candidate_career_coach_threads','title','text','NO'),
        ('candidate_career_coach_threads','status','text','NO'),
        ('candidate_career_coach_threads','created_at','timestamp with time zone','NO'),
        ('candidate_career_coach_threads','updated_at','timestamp with time zone','NO'),
        ('candidate_career_coach_messages','id','uuid','NO'),
        ('candidate_career_coach_messages','thread_id','uuid','NO'),
        ('candidate_career_coach_messages','user_id','uuid','NO'),
        ('candidate_career_coach_messages','role','text','NO'),
        ('candidate_career_coach_messages','content','text','NO'),
        ('candidate_career_coach_messages','grounding_metadata','jsonb','NO'),
        ('candidate_career_coach_messages','created_at','timestamp with time zone','NO'),
        ('candidate_career_coach_jobs','id','uuid','NO'),
        ('candidate_career_coach_jobs','user_id','uuid','NO'),
        ('candidate_career_coach_jobs','thread_id','uuid','NO'),
        ('candidate_career_coach_jobs','user_message_id','uuid','NO'),
        ('candidate_career_coach_jobs','status','text','NO'),
        ('candidate_career_coach_jobs','attempt_count','integer','NO'),
        ('candidate_career_coach_jobs','provider','text','NO'),
        ('candidate_career_coach_jobs','model','text','NO'),
        ('candidate_career_coach_jobs','error_code','text','YES'),
        ('candidate_career_coach_jobs','available_at','timestamp with time zone','NO'),
        ('candidate_career_coach_jobs','started_at','timestamp with time zone','YES'),
        ('candidate_career_coach_jobs','completed_at','timestamp with time zone','YES'),
        ('candidate_career_coach_jobs','created_at','timestamp with time zone','NO'),
        ('candidate_career_coach_jobs','updated_at','timestamp with time zone','NO'),
        ('candidate_notifications','id','uuid','NO'),
        ('candidate_notifications','user_id','uuid','NO'),
        ('candidate_notifications','type','text','NO'),
        ('candidate_notifications','title','text','NO'),
        ('candidate_notifications','message','text','NO'),
        ('candidate_notifications','link_url','text','YES'),
        ('candidate_notifications','is_read','boolean','NO'),
        ('candidate_notifications','created_at','timestamp with time zone','NO')
      ) AS expected(table_name,column_name,data_type,is_nullable)
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns c
        WHERE c.table_schema='public' AND c.table_name=v_col.table_name
          AND c.column_name=v_col.column_name AND c.data_type=v_col.data_type
          AND c.is_nullable=v_col.is_nullable
      ) THEN
        v_failed := array_append(v_failed, format('column contract mismatch: public.%s.%s expected %s nullable=%s',
          v_col.table_name,v_col.column_name,v_col.data_type,v_col.is_nullable));
      END IF;
    END LOOP;

    -- C. Important defaults. Defaults are checked semantically, not by whitespace formatting.
    FOR v_expected IN
      SELECT * FROM (VALUES
        ('candidate_career_coach_threads','id','gen_random_uuid'),
        ('candidate_career_coach_threads','status','active'),
        ('candidate_career_coach_threads','title','Career Coaching Session'),
        ('candidate_career_coach_threads','created_at','CURRENT_TIMESTAMP'),
        ('candidate_career_coach_threads','updated_at','CURRENT_TIMESTAMP'),
        ('candidate_career_coach_messages','id','gen_random_uuid'),
        ('candidate_career_coach_messages','grounding_metadata','{}'),
        ('candidate_career_coach_messages','created_at','CURRENT_TIMESTAMP'),
        ('candidate_career_coach_jobs','id','gen_random_uuid'),
        ('candidate_career_coach_jobs','status','queued'),
        ('candidate_career_coach_jobs','attempt_count','0'),
        ('candidate_career_coach_jobs','provider','gemini'),
        ('candidate_career_coach_jobs','available_at','CURRENT_TIMESTAMP'),
        ('candidate_career_coach_jobs','created_at','CURRENT_TIMESTAMP'),
        ('candidate_career_coach_jobs','updated_at','CURRENT_TIMESTAMP'),
        ('candidate_notifications','id','gen_random_uuid'),
        ('candidate_notifications','type','career_coach_response'),
        ('candidate_notifications','is_read','false'),
        ('candidate_notifications','created_at','CURRENT_TIMESTAMP')
      ) AS defaults(table_name,column_name,expected_default)
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns c
        WHERE c.table_schema='public' AND c.table_name=v_expected.table_name
          AND c.column_name=v_expected.column_name
          AND lower(coalesce(c.column_default,'')) LIKE '%' || lower(v_expected.expected_default) || '%'
      ) THEN
        v_failed := array_append(v_failed, format('default mismatch: public.%s.%s expected expression containing %s',
          v_expected.table_name,v_expected.column_name,v_expected.expected_default));
      END IF;
    END LOOP;

    -- The application persists CAREER_COACH_MODEL; model must have no database default.
    IF EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema='public'
        AND c.table_name='candidate_career_coach_jobs'
        AND c.column_name='model'
        AND c.column_default IS NOT NULL
    ) THEN
      v_failed := array_append(v_failed, 'default mismatch: public.candidate_career_coach_jobs.model must have no database default');
    END IF;

    -- D. Primary keys and unique ownership keys.
    FOR v_expected IN
      SELECT * FROM (VALUES
        ('candidate_career_coach_threads','pk_candidate_career_coach_threads','p','PRIMARY KEY (id)'),
        ('candidate_career_coach_threads','uq_candidate_career_coach_threads_id_user','u','UNIQUE (id, user_id)'),
        ('candidate_career_coach_messages','pk_candidate_career_coach_messages','p','PRIMARY KEY (id)'),
        ('candidate_career_coach_messages','uq_candidate_career_coach_messages_id_thread_user','u','UNIQUE (id, thread_id, user_id)'),
        ('candidate_career_coach_jobs','pk_candidate_career_coach_jobs','p','PRIMARY KEY (id)'),
        ('candidate_career_coach_jobs','uq_candidate_career_coach_jobs_user_message','u','UNIQUE (user_message_id)'),
        ('candidate_notifications','pk_candidate_notifications','p','PRIMARY KEY (id)')
      ) AS constraints_expected(table_name,constraint_name,constraint_type,definition_fragment)
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
        JOIN pg_namespace n ON n.oid=t.relnamespace
        WHERE n.nspname='public' AND t.relname=v_expected.table_name
          AND c.conname=v_expected.constraint_name AND c.contype=v_expected.constraint_type
          AND lower(pg_get_constraintdef(c.oid)) LIKE '%' || lower(v_expected.definition_fragment) || '%'
      ) THEN
        v_failed := array_append(v_failed, 'missing/wrong key columns: ' || v_expected.constraint_name);
      END IF;
    END LOOP;

    -- E. Foreign key targets and ON DELETE behavior.
    FOR v_fk IN
      SELECT * FROM (VALUES
        ('candidate_career_coach_threads','fk_candidate_career_coach_threads_user','profiles','c','FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE'),
        ('candidate_career_coach_threads','fk_candidate_career_coach_threads_role','career_roles','n','FOREIGN KEY (career_role_id) REFERENCES career_roles(id) ON DELETE SET NULL'),
        ('candidate_career_coach_messages','fk_candidate_career_coach_messages_thread_owner','candidate_career_coach_threads','c','FOREIGN KEY (thread_id, user_id) REFERENCES candidate_career_coach_threads(id, user_id) ON DELETE CASCADE'),
        ('candidate_career_coach_messages','fk_candidate_career_coach_messages_user','profiles','c','FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE'),
        ('candidate_career_coach_jobs','fk_candidate_career_coach_jobs_user','profiles','c','FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE'),
        ('candidate_career_coach_jobs','fk_candidate_career_coach_jobs_thread_owner','candidate_career_coach_threads','c','FOREIGN KEY (thread_id, user_id) REFERENCES candidate_career_coach_threads(id, user_id) ON DELETE CASCADE'),
        ('candidate_career_coach_jobs','fk_candidate_career_coach_jobs_msg_owner','candidate_career_coach_messages','c','FOREIGN KEY (user_message_id, thread_id, user_id) REFERENCES candidate_career_coach_messages(id, thread_id, user_id) ON DELETE CASCADE'),
        ('candidate_notifications','fk_candidate_notifications_user','profiles','c','FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE')
      ) AS fks(table_name,constraint_name,referenced_table,delete_code,definition_fragment)
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON t.oid=c.conrelid
        JOIN pg_namespace n ON n.oid=t.relnamespace
        JOIN pg_class rt ON rt.oid=c.confrelid
        JOIN pg_namespace rn ON rn.oid=rt.relnamespace
        WHERE n.nspname='public' AND t.relname=v_fk.table_name
          AND c.conname=v_fk.constraint_name AND c.contype='f'
          AND rn.nspname='public' AND rt.relname=v_fk.referenced_table
          AND c.confdeltype=v_fk.delete_code
          AND lower(pg_get_constraintdef(c.oid)) LIKE '%' || lower(v_fk.definition_fragment) || '%'
      ) THEN
        v_failed := array_append(v_failed, format('FK columns/target/delete rule mismatch: %s -> %s (delete code %s)',
          v_fk.constraint_name,v_fk.referenced_table,v_fk.delete_code));
      END IF;
    END LOOP;

    -- F. Exact CHECK constraints for status/role/type, attempts, and JSON object metadata.
    FOR v_expected IN
      SELECT * FROM (VALUES
        ('candidate_career_coach_threads','chk_candidate_career_coach_threads_status',ARRAY['active','archived']::text[],2),
        ('candidate_career_coach_messages','chk_candidate_career_coach_messages_role',ARRAY['user','assistant','system_event']::text[],3),
        ('candidate_career_coach_messages','chk_candidate_career_coach_messages_grounding_object',ARRAY['jsonb_typeof','object']::text[],1),
        ('candidate_career_coach_jobs','chk_candidate_career_coach_jobs_status',ARRAY['queued','processing','completed','failed_retryable','failed_permanent']::text[],5),
        ('candidate_career_coach_jobs','chk_candidate_career_coach_jobs_attempt_count',ARRAY['attempt_count >= 0']::text[],0),
        ('candidate_career_coach_jobs','chk_candidate_career_coach_jobs_started_at',ARRAY['processing','started_at is not null']::text[],1),
        ('candidate_career_coach_jobs','chk_candidate_career_coach_jobs_completed_at',ARRAY['completed','completed_at is not null']::text[],1),
        ('candidate_notifications','chk_candidate_notifications_type',ARRAY['career_coach_response','cv_parse_complete','job_alert','system']::text[],4)
      ) AS checks_expected(table_name,constraint_name,required_tokens,expected_literal_count)
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
        JOIN pg_namespace n ON n.oid=t.relnamespace
        WHERE n.nspname='public' AND t.relname=v_expected.table_name
          AND c.conname=v_expected.constraint_name AND c.contype='c'
          AND lower(pg_get_constraintdef(c.oid)) LIKE ALL (
            SELECT '%' || lower(token) || '%' FROM unnest(v_expected.required_tokens) AS token
          )
          AND ((length(pg_get_constraintdef(c.oid)) - length(replace(pg_get_constraintdef(c.oid), '''', ''))) / 2) = v_expected.expected_literal_count
      ) THEN
        v_failed := array_append(v_failed, 'missing/mismatched CHECK constraint or allowed values: ' || v_expected.constraint_name);
      END IF;
    END LOOP;

    -- G. Performance indexes and the database-enforced notification idempotency index.
    FOR v_expected IN
      SELECT * FROM (VALUES
        ('idx_candidate_career_coach_threads_user','candidate_career_coach_threads'),
        ('idx_candidate_career_coach_threads_role','candidate_career_coach_threads'),
        ('idx_candidate_career_coach_messages_thread','candidate_career_coach_messages'),
        ('idx_candidate_career_coach_messages_user','candidate_career_coach_messages'),
        ('uq_candidate_career_coach_messages_assistant_job','candidate_career_coach_messages'),
        ('uq_candidate_career_coach_jobs_user_message','candidate_career_coach_jobs'),
        ('idx_candidate_career_coach_jobs_queue','candidate_career_coach_jobs'),
        ('idx_candidate_career_coach_jobs_user','candidate_career_coach_jobs'),
        ('idx_candidate_career_coach_jobs_thread','candidate_career_coach_jobs'),
        ('idx_candidate_notifications_user','candidate_notifications'),
        ('uq_candidate_notifications_career_coach_job_link','candidate_notifications')
      ) AS indexes_expected(index_name,table_name)
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_class i JOIN pg_namespace ns ON ns.oid=i.relnamespace
        JOIN pg_index ix ON ix.indexrelid=i.oid JOIN pg_class t ON t.oid=ix.indrelid
        JOIN pg_namespace tn ON tn.oid=t.relnamespace
        WHERE ns.nspname='public' AND i.relname=v_expected.index_name
          AND tn.nspname='public' AND t.relname=v_expected.table_name
          AND ix.indisvalid AND ix.indisready
          AND CASE
            WHEN v_expected.index_name='uq_candidate_notifications_career_coach_job_link' THEN
              ix.indisunique
              AND pg_get_expr(ix.indpred,ix.indrelid) LIKE '%career_coach_response%'
              AND pg_get_expr(ix.indpred,ix.indrelid) LIKE '%jobId%'
              AND pg_get_indexdef(i.oid) LIKE '%(link_url)%'
            WHEN v_expected.index_name='uq_candidate_career_coach_messages_assistant_job' THEN
              ix.indisunique
              AND pg_get_expr(ix.indexprs,ix.indrelid) LIKE '%grounding_metadata%'
              AND pg_get_expr(ix.indpred,ix.indrelid) LIKE '%assistant%'
              AND pg_get_expr(ix.indpred,ix.indrelid) LIKE '%job_id%'
            ELSE true
          END
      ) THEN
        v_failed := array_append(v_failed, 'missing/invalid index or notification unique predicate: ' || v_expected.index_name);
      END IF;
    END LOOP;

    -- H. updated_at triggers must call the canonical helper.
    FOR v_expected IN
      SELECT * FROM (VALUES
        ('candidate_career_coach_threads','set_candidate_career_coach_threads_updated_at'),
        ('candidate_career_coach_jobs','set_candidate_career_coach_jobs_updated_at')
      ) AS triggers_expected(table_name,trigger_name)
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger tg JOIN pg_class t ON t.oid=tg.tgrelid
        JOIN pg_namespace n ON n.oid=t.relnamespace
        JOIN pg_proc p ON p.oid=tg.tgfoid JOIN pg_namespace pn ON pn.oid=p.pronamespace
        WHERE n.nspname='public' AND t.relname=v_expected.table_name
          AND tg.tgname=v_expected.trigger_name AND NOT tg.tgisinternal
          AND pn.nspname='public' AND p.proname='set_current_timestamp_updated_at'
      ) THEN
        v_failed := array_append(v_failed, 'missing/wrong canonical updated_at trigger: ' || v_expected.trigger_name);
      END IF;
    END LOOP;

    -- I/J. RLS enabled; server-mediated design has zero direct policies.
    IF EXISTS (
      SELECT 1 FROM pg_class t JOIN pg_namespace n ON n.oid=t.relnamespace
      WHERE n.nspname='public' AND t.relname=ANY(v_targets)
        AND t.relkind IN ('r','p') AND NOT t.relrowsecurity
    ) THEN
      v_failed := array_append(v_failed, 'RLS is disabled on one or more target tables');
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=ANY(v_targets)) THEN
      v_failed := array_append(v_failed, 'direct RLS policies exist; expected policy count is zero');
    END IF;

    -- Required database roles must still exist after deployment.
    FOREACH v_table IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname=v_table) THEN
        v_failed := array_append(v_failed, 'missing required database role: ' || v_table);
      END IF;
    END LOOP;

    -- K/L. Direct table privileges: PUBLIC, anon, authenticated = zero;
    -- service_role = exactly SELECT/INSERT/UPDATE/DELETE on each target.
    IF EXISTS (
      SELECT 1 FROM information_schema.table_privileges
      WHERE table_schema='public' AND table_name=ANY(v_targets)
        AND grantee IN ('PUBLIC','anon','authenticated')
    ) THEN
      v_failed := array_append(v_failed, 'PUBLIC/anon/authenticated have direct target-table privileges');
    END IF;
    FOR v_table IN SELECT unnest(v_targets) LOOP
      SELECT array_agg(privilege_type ORDER BY privilege_type) INTO v_privs
      FROM information_schema.table_privileges
      WHERE table_schema='public' AND table_name=v_table AND grantee='service_role';
      IF coalesce(v_privs,ARRAY[]::text[]) <> ARRAY['DELETE','INSERT','SELECT','UPDATE']::text[] THEN
        v_failed := array_append(v_failed, 'service_role privilege matrix mismatch on ' || v_table);
      END IF;
    END LOOP;

    -- M. No sequences are expected (all IDs are UUIDs). If one is attached to a
    -- target table, or has direct grants to non-service roles, fail closed.
    IF EXISTS (
      SELECT 1 FROM pg_class s JOIN pg_namespace n ON n.oid=s.relnamespace
      WHERE s.relkind='S' AND n.nspname='public'
        AND (s.relname LIKE 'candidate_career_coach_%' OR s.relname LIKE 'candidate_notifications%')
    ) THEN
      v_failed := array_append(v_failed, 'unexpected target-associated sequence exists; review sequence privileges');
    END IF;

    -- N. Preserve exact Stage 7.1–7.4 baselines and required Stage 7.5 tables.
    IF to_regclass('public.career_roles') IS NOT NULL THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='career_roles' AND column_name='status') THEN
        EXECUTE 'SELECT count(*) FROM public.career_roles WHERE status = ''published''' INTO v_roles;
      ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='career_roles' AND column_name='is_published') THEN
        EXECUTE 'SELECT count(*) FROM public.career_roles WHERE is_published IS TRUE' INTO v_roles;
      END IF;
    END IF;
    IF to_regclass('public.career_role_roadmap_items') IS NOT NULL THEN
      EXECUTE 'SELECT count(*) FROM public.career_role_roadmap_items' INTO v_roadmap_items;
    END IF;
    IF to_regclass('public.career_learning_resources') IS NOT NULL THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='career_learning_resources' AND column_name='status') THEN
        EXECUTE 'SELECT count(*) FROM public.career_learning_resources WHERE status = ''published''' INTO v_resources;
      ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='career_learning_resources' AND column_name='is_published') THEN
        EXECUTE 'SELECT count(*) FROM public.career_learning_resources WHERE is_published IS TRUE' INTO v_resources;
      END IF;
    END IF;
    IF to_regclass('public.career_course_recommendations') IS NOT NULL THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='career_course_recommendations' AND column_name='status') THEN
        EXECUTE 'SELECT count(*) FROM public.career_course_recommendations WHERE status = ''published''' INTO v_courses;
      ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='career_course_recommendations' AND column_name='is_published') THEN
        EXECUTE 'SELECT count(*) FROM public.career_course_recommendations WHERE is_published IS TRUE' INTO v_courses;
      END IF;
    END IF;
    IF v_roles <> 13 THEN v_failed := array_append(v_failed, format('Stage 7.1 published roles expected 13, got %s',v_roles)); END IF;
    IF v_roadmap_items <> 64 THEN v_failed := array_append(v_failed, format('Stage 7.2 roadmap items expected 64, got %s',v_roadmap_items)); END IF;
    IF v_resources <> 47 THEN v_failed := array_append(v_failed, format('Stage 7.3 published resources expected 47, got %s',v_resources)); END IF;
    IF v_courses <> 24 THEN v_failed := array_append(v_failed, format('Stage 7.4 published courses expected 24, got %s',v_courses)); END IF;
    FOREACH v_table IN ARRAY ARRAY['candidate_development_plans','candidate_development_plan_items'] LOOP
      IF to_regclass(format('%I.%I','public',v_table)) IS NULL THEN
        v_failed := array_append(v_failed, 'missing Stage 7.5 table public.' || v_table);
      END IF;
    END LOOP;

    -- Repository history checks cannot be proved by SQL; verify with Git separately.
    RAISE NOTICE 'Repository check required separately: migrations 00000–00021 must remain unchanged.';
    RAISE NOTICE 'Stage 7.1 published roles: % (expected 13)', v_roles;
    RAISE NOTICE 'Stage 7.2 roadmap items: % (expected 64)', v_roadmap_items;
    RAISE NOTICE 'Stage 7.3 published resources: % (expected 47)', v_resources;
    RAISE NOTICE 'Stage 7.4 published courses: % (expected 24)', v_courses;
    RAISE NOTICE 'Post-verify findings: %', CASE WHEN cardinality(v_failed)=0 THEN 'none' ELSE array_to_string(v_failed,' | ') END;
    v_pass := cardinality(v_failed)=0;
    RAISE NOTICE 'STAGE 7.6 POST-VERIFY FINAL | %', v_pass;
END
$postverify$;
