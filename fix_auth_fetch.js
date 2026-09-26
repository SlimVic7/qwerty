import fs from 'fs';
let content = fs.readFileSync('src/lib/authFetch.ts', 'utf-8');

const replacement = `  const isFormData = options.body instanceof FormData;
  const headers: any = {
    'Authorization': \`Bearer \${session.access_token}\`,
    ...options.headers
  };
  
  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  
  // If headers['Content-Type'] is explicitly set to null/undefined, we could delete it, but the above is safer.
  // Actually, if it's FormData, the browser sets Content-Type automatically with boundary. So we should NOT set it.
`;

content = content.replace(
`  const headers = {
    ...options.headers,
    'Authorization': \`Bearer \${session.access_token}\`,
    'Content-Type': 'application/json'
  };`, replacement);

fs.writeFileSync('src/lib/authFetch.ts', content);
