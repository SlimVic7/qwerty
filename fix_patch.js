import fs from 'fs';
let ts = fs.readFileSync('server/routes/candidate.ts', 'utf-8');

ts = ts.replace(
  "candidateRouter.patch('/profile', async (req, res) => {\n  try {\n    const supabase = getAdminClient();",
  "candidateRouter.patch('/profile', async (req, res) => {\n  try {\n    const supabase = getAuthClient(req.headers.authorization!);"
);

fs.writeFileSync('server/routes/candidate.ts', ts);
