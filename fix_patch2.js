import fs from 'fs';
let ts = fs.readFileSync('server/routes/candidate.ts', 'utf-8');

ts = ts.replace("updates.updated_at = new Date().toISOString();", "// updates.updated_at = new Date().toISOString();");

fs.writeFileSync('server/routes/candidate.ts', ts);
