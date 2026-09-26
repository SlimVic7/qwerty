const fs = require('fs');
let code = fs.readFileSync('src/features/jobs/ops/JobOpsEditor.tsx', 'utf8');

code = code.replace(
  "{isAdmin && (",
  "{isAdmin && job.id && ("
);

code = code.replace(
  "<div className=\"bg-white p-6 rounded-lg shadow-sm border border-slate-200\">\n            <h2 className=\"text-lg font-bold mb-4\">Preview</h2>",
  "{job.id && (\n          <div className=\"bg-white p-6 rounded-lg shadow-sm border border-slate-200\">\n            <h2 className=\"text-lg font-bold mb-4\">Preview</h2>"
);

code = code.replace(
  "View Private Preview\n            </a>\n          </div>",
  "View Private Preview\n            </a>\n          </div>\n          )}"
);

fs.writeFileSync('src/features/jobs/ops/JobOpsEditor.tsx', code);
