import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import { env } from './server/config/env.ts';

const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY);

async function run() {
  const email = 'testuser' + Date.now() + '@example.com';
  await admin.auth.admin.createUser({ email, password: 'password123', email_confirm: true });
  const pubClient = createClient(env.SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '');
  const { data: sessionData } = await pubClient.auth.signInWithPassword({ email, password: 'password123' });
  const token = sessionData.session.access_token;
  
  let res = await fetch('http://localhost:3000/api/candidate/profile', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  console.log("GET profile:", res.status, await res.text());
}
run();
