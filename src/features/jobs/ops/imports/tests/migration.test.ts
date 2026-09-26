import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('00004 Migration Static Verification', () => {
  const sqlPath = path.resolve(process.cwd(), 'supabase/migrations/00004_stage3_3_canonical_import.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

  it('removes date-based approval bypass', () => {
    expect(sqlContent).not.toContain("created_at <");
    expect(sqlContent).toContain("CHECK (\n    review_status NOT IN ('approved', 'imported') OR\n    (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)\n)");
  });

  it('preserves old values before update', () => {
    // Check that we save the previous values
    expect(sqlContent).toContain("v_previous_status := v_item.review_status;");
    expect(sqlContent).toContain("v_previous_normalized_data :=");
    
    // Check they are used in the metadata
    expect(sqlContent).toContain("'previous_status', v_previous_status");
    expect(sqlContent).toContain("'new_status', v_new_review_status");
  });

  it('edited changed_fields are detected correctly against previous data using UNION and IS DISTINCT FROM', () => {
    expect(sqlContent).toContain("UNION");
    expect(sqlContent).toContain("IS DISTINCT FROM");
    expect(sqlContent).toContain("v_new_normalized_data->k IS DISTINCT FROM v_previous_normalized_data->k");
  });

  it('null or blank audit action is rejected', () => {
    expect(sqlContent).toContain("IF p_audit_action IS NULL OR trim(p_audit_action) = '' THEN");
    expect(sqlContent).toContain("RAISE EXCEPTION 'INVALID_ACTION';");
  });

  it('validates json shapes of p_updates fields', () => {
    expect(sqlContent).toContain("jsonb_typeof(p_updates->'normalized_data') <> 'object'");
    expect(sqlContent).toContain("jsonb_typeof(p_updates->'validation_issues') <> 'array'");
    expect(sqlContent).toContain("RAISE EXCEPTION 'INVALID_UPDATES_FORMAT';");
  });

  it('enforces rigorous checks on approval', () => {
    expect(sqlContent).toContain("v_new_duplicate_of_job_id IS NOT NULL THEN RAISE EXCEPTION 'DUPLICATE_BLOCKED';");
    expect(sqlContent).toContain("jsonb_array_length(v_new_validation_issues) > 0 THEN RAISE EXCEPTION 'VALIDATION_FAILED';");
    expect(sqlContent).toContain("COALESCE(trim(v_new_normalized_data->>'title'), '') = ''");
  });

  it('uses ON DELETE RESTRICT for new tracking fields but leaves actor_id', () => {
    expect(sqlContent).toContain("ADD COLUMN reviewed_by uuid REFERENCES public.profiles(id) ON DELETE RESTRICT");
    expect(sqlContent).toContain("ADD COLUMN imported_by uuid REFERENCES public.profiles(id) ON DELETE RESTRICT");
    // Ensure we didn't blindly replace all ON DELETE SET NULLs
    expect(sqlContent).toContain("actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL");
  });

  it('every successful review mutation creates an audit record', () => {
    expect(sqlContent).toContain("INSERT INTO public.job_import_audit_log (item_id, batch_id, actor_id, action, metadata)");
  });

  it('migration contains no corrupted double-escaped key literals', () => {
    // There shouldn't be things like ->>'' or ->'' or ''{
    expect(sqlContent).not.toMatch(/->>''/);
    expect(sqlContent).not.toMatch(/->''/);
    expect(sqlContent).not.toMatch(/''\{/);
    expect(sqlContent).not.toMatch(/\}''/);
    // Specifically looking for the corrupted JSON paths like: p_updates->''normalized_data''
    expect(sqlContent).not.toMatch(/p_updates->''/);
    expect(sqlContent).not.toMatch(/v_item\.normalized_data->>''/);
  });
});
