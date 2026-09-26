import fs from 'fs';

let ts = fs.readFileSync('src/lib/authFetch.ts', 'utf-8');
ts = ts.replace(
  "throw new Error(errorData.error || errorData.message || `Request failed with status ${response.status}`);",
  "throw new Error(`[authFetch ${endpoint}] ${response.status} - ${errorData.error || errorData.message}`);"
);
fs.writeFileSync('src/lib/authFetch.ts', ts);
