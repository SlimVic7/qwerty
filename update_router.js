import fs from 'fs';
let content = fs.readFileSync('src/app/Router.tsx', 'utf-8');

if (!content.includes('import { CandidateProfilePage }')) {
  content = content.replace(
    "import { CandidateLayout } from './layouts/CandidateLayout.js';",
    "import { CandidateLayout } from './layouts/CandidateLayout.js';\nimport { CandidateProfilePage } from '../features/candidate/CandidateProfilePage.js';"
  );
}

content = content.replace(
  `<Route path="profile" element={<div className="p-8"><h1>Professional Profile</h1></div>} />`,
  `<Route path="profile" element={<CandidateProfilePage />} />`
);

fs.writeFileSync('src/app/Router.tsx', content);
