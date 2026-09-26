import { createClient } from '@supabase/supabase-js';
import { env } from './server/config/env.ts';

const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY);

async function run() {
  const { data, error } = await admin.rpc('candidate_add_cv_version', {});
  console.log("Error:", error);
}
// We can't easily list RPCs without postgres connection, but we can look at the migration files!
