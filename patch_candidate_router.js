import fs from 'fs';
let ts = fs.readFileSync('server/routes/candidate.ts', 'utf-8');

ts = ts.replace(
  "import { getAdminClient } from '../db/supabase.js';", 
  "import { getAdminClient, getAuthClient } from '../db/supabase.js';"
);

// GET /profile
ts = ts.replace(
  "const supabase = getAdminClient();\n    const userId = req.user!.id;",
  "const supabase = getAuthClient(req.headers.authorization!);\n    const userId = req.user!.id;"
);

// PATCH /profile
ts = ts.replace(
  "const supabase = getAdminClient();\n    const userId = req.user!.id;\n    const allowedFields",
  "const supabase = getAuthClient(req.headers.authorization!);\n    const userId = req.user!.id;\n    const allowedFields"
);

fs.writeFileSync('server/routes/candidate.ts', ts);
