const fs = require('fs');
let code = fs.readFileSync('src/features/jobs/ops/jobsOps.service.ts', 'utf8');

const guards = `
const guardId = (id: string) => {
  if (!id || id === 'undefined') throw new Error('Missing job ID');
  return id;
};
`;

if (!code.includes('guardId')) {
  code = code.replace(
    "export const jobsOpsService = {",
    guards + "\nexport const jobsOpsService = {"
  );
}

code = code.replace(/getJob: \(id: string\) => authFetch\(\`\/api\/ops\/jobs\/\$\{id\}\`\)/g, "getJob: (id: string) => authFetch(`/api/ops/jobs/${guardId(id)}`)");
code = code.replace(/updateDraft: \(id: string, updates: any\) => \n    authFetch\(\`\/api\/ops\/jobs\/\$\{id\}\`/g, "updateDraft: (id: string, updates: any) => \n    authFetch(`/api/ops/jobs/${guardId(id)}`");
code = code.replace(/publishJob: \(id: string\) => authFetch\(\`\/api\/ops\/jobs\/\$\{id\}\/publish\`/g, "publishJob: (id: string) => authFetch(`/api/ops/jobs/${guardId(id)}/publish`");
code = code.replace(/unpublishJob: \(id: string\) => authFetch\(\`\/api\/ops\/jobs\/\$\{id\}\/unpublish\`/g, "unpublishJob: (id: string) => authFetch(`/api/ops/jobs/${guardId(id)}/unpublish`");
code = code.replace(/closeJob: \(id: string\) => authFetch\(\`\/api\/ops\/jobs\/\$\{id\}\/close\`/g, "closeJob: (id: string) => authFetch(`/api/ops/jobs/${guardId(id)}/close`");
code = code.replace(/archiveJob: \(id: string\) => authFetch\(\`\/api\/ops\/jobs\/\$\{id\}\/archive\`/g, "archiveJob: (id: string) => authFetch(`/api/ops/jobs/${guardId(id)}/archive`");
code = code.replace(/featureJob: \(id: string\) => authFetch\(\`\/api\/ops\/jobs\/\$\{id\}\/feature\`/g, "featureJob: (id: string) => authFetch(`/api/ops/jobs/${guardId(id)}/feature`");
code = code.replace(/unfeatureJob: \(id: string\) => authFetch\(\`\/api\/ops\/jobs\/\$\{id\}\/unfeature\`/g, "unfeatureJob: (id: string) => authFetch(`/api/ops/jobs/${guardId(id)}/unfeature`");

fs.writeFileSync('src/features/jobs/ops/jobsOps.service.ts', code);
