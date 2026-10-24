-- ============================================================================
-- STAGE 7.6 ROLLBACK DRY-RUN ENTRY POINT
-- This file delegates to the shell wrapper because migration 00022 is explicitly
-- transactional (BEGIN/COMMIT). Including it directly with psql \i would let its
-- COMMIT end the outer transaction, defeating the rollback test.
--
-- Preferred invocation from the repository root:
--   DATABASE_URL="$DATABASE_URL" bash supabase/rollback_dry_run_00022.sh
--
-- The shell wrapper makes a temporary copy of the migration with only the
-- standalone BEGIN/COMMIT statements removed, then executes that same DDL inside
-- an outer transaction and issues ROLLBACK. It never edits the migration file.
-- ============================================================================

\echo 'Use: bash supabase/rollback_dry_run_00022.sh (requires DATABASE_URL; disposable/staging database only)'
\! bash supabase/rollback_dry_run_00022.sh
