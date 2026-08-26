import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

// The secret key client should ONLY be used in server-side administrative contexts
// Never expose this client or the key to the frontend.
export const getAdminClient = () => {
  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
    console.warn("Supabase credentials missing. Secret Key Client not initialized.");
    return null;
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};
