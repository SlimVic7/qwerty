import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PublicLayout } from './layouts/PublicLayout.js';
import { CandidateLayout } from './layouts/CandidateLayout.js';
import { OpsLayout } from './layouts/OpsLayout.js';
import { ProtectedRoute } from '../components/ProtectedRoute.js';
import { RoleRoute } from '../components/RoleRoute.js';
import { AuthPage } from '../features/auth/AuthPage.js';
import { JobsPage } from '../features/jobs/JobsPage.js';
import { JobDetailPage } from '../features/jobs/JobDetailPage.js';
import { JobsOpsList } from '../features/jobs/ops/JobsOpsList.js';
import { JobOpsEditor } from '../features/jobs/ops/JobOpsEditor.js';
import { JobOpsPreview } from '../features/jobs/ops/JobOpsPreview.js';

export function Router() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<div className="p-8"><h1>Welcome to QWERTY</h1><p>Find jobs and prepare your applications.</p></div>} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/jobs/:slug" element={<JobDetailPage />} />
          <Route path="/career" element={<div className="p-8"><h1>Career Hub</h1><p>Career content coming soon.</p></div>} />
          <Route path="/login" element={<AuthPage defaultMode="signin" />} />
          <Route path="/signin" element={<AuthPage defaultMode="signin" />} />
          <Route path="/register" element={<AuthPage defaultMode="register" />} />
        </Route>

        {/* Candidate Workspace */}
        <Route path="/candidate" element={<ProtectedRoute />}>
          <Route element={<CandidateLayout />}>
            <Route index element={<div className="p-8"><h1>My QWERTY</h1></div>} />
            <Route path="profile" element={<div className="p-8"><h1>Professional Profile</h1></div>} />
          </Route>
        </Route>

        {/* Internal Operations Workspace */}
        <Route path="/0ps26" element={<RoleRoute allowedRoles={['recruiter', 'editor', 'admin', 'super_admin']} />}>
          <Route element={<OpsLayout />}>
            <Route index element={<div className="p-8"><h1>Ops Dashboard</h1></div>} />
            <Route path="jobs" element={<JobsOpsList />} />
            <Route path="jobs/new" element={<JobOpsEditor />} />
            <Route path="jobs/:id/edit" element={<JobOpsEditor />} />
            <Route path="jobs/:id/preview" element={<JobOpsPreview />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
