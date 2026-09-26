import fs from 'fs';
let sql = fs.readFileSync('supabase/migrations/00005_stage4_1_candidate_profile_cv_storage.sql', 'utf-8');

sql = sql.replace("pg_catalog.COALESCE(pg_catalog.MAX(version_number), 0)", "COALESCE(MAX(version_number), 0)");
sql = sql.replace("pg_catalog.CURRENT_TIMESTAMP", "CURRENT_TIMESTAMP");

// Add check constraints for blank strings
// Find the CREATE TABLE public.candidate_cv_versions
sql = sql.replace(
  "CONSTRAINT cv_deleted_not_current CHECK (",
  "CONSTRAINT cv_storage_path_not_blank CHECK (trim(storage_path) <> ''),\n    CONSTRAINT cv_original_filename_not_blank CHECK (trim(original_filename) <> ''),\n    CONSTRAINT cv_deleted_not_current CHECK ("
);

fs.writeFileSync('supabase/migrations/00005_stage4_1_candidate_profile_cv_storage.sql', sql);
