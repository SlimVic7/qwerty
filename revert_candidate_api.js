import fs from 'fs';
let ts = fs.readFileSync('server/routes/candidate.ts', 'utf-8');

// 1. GET /profile
ts = ts.replace(
  "const supabase = getAuthClient(req.headers.authorization!);",
  "const supabase = getAdminClient();"
);
// wait, there are multiple getAuthClient calls. Let's do it cleanly.
