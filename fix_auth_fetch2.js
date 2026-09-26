import fs from 'fs';
let content = fs.readFileSync('src/lib/authFetch.ts', 'utf-8');

const replacement = `  const isFormData = options.body instanceof FormData;
  const headers: any = {
    'Authorization': \`Bearer \${session.access_token}\`,
    ...(options.headers || {})
  };
  
  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }`;

content = content.replace(/const isFormData[\s\S]*?headers\['Content-Type'\] = 'application\/json';\n  \}/, replacement);
fs.writeFileSync('src/lib/authFetch.ts', content);
