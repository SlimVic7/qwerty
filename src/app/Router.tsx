import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PublicLayout } from './layouts/PublicLayout.js';
import { CandidateLayout } from './layouts/CandidateLayout.js';
import { CandidateProfilePage } from '../features/candidate/CandidateProfilePage.js';
import { CvTailoringWorkspace } from '../features/tailoring/CvTailoringWorkspace.js';
import { OpsLayout } from './layouts/OpsLayout.js';
import { ProtectedRoute } from '../components/ProtectedRoute.js';
import { RoleRoute } from '../components/RoleRoute.js';
import { AuthPage } from '../features/auth/AuthPage.js';
import { JobsPage } from '../features/jobs/JobsPage.js';
import { JobDetailPage } from '../features/jobs/JobDetailPage.js';
import { JobsOpsList } from '../features/jobs/ops/JobsOpsList.js';
import { JobOpsEditor } from '../features/jobs/ops/JobOpsEditor.js';
import { JobOpsPreview } from '../features/jobs/ops/JobOpsPreview.js';
import { JobBulkImportPage } from '../features/jobs/ops/imports/JobBulkImportPage.js';
import { JobBatchReviewPage } from '../features/jobs/ops/imports/JobBatchReviewPage.js';
import { TalentPoolSearchPage } from '../features/talent/TalentPoolSearchPage.js';
import { TalentCandidateDetailPage } from '../features/talent/TalentCandidateDetailPage.js';
import { AlignmentHistoryWorkspace } from '../features/alignmentHistory/AlignmentHistoryWorkspace.js';
import { SavedJobsPage } from '../features/savedJobs/SavedJobsPage.js';
import { JobAlertsPage } from '../features/jobAlerts/JobAlertsPage.js';
import { CandidateDashboardPage } from '../features/dashboard/CandidateDashboardPage.js';
import { CareerHubPage } from '../features/career/CareerHubPage.js';
import { CareerRoleLibraryPage } from '../features/career/CareerRoleLibraryPage.js';
import { CareerRoleDetailPage } from '../features/career/CareerRoleDetailPage.js';
import { useParams } from 'react-router-dom';

function CareerRoleSlugRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/candidate/career/roles/${slug || ''}`} replace />;
}

function CareerRoleRoadmapRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/candidate/career/roles/${slug || ''}/roadmap`} replace />;
}

function CareerRoleCoursesRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/candidate/career/roles/${slug || ''}/courses`} replace />;
}

function CareerRolePlanRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/candidate/career/roles/${slug || ''}/plan`} replace />;
}

export function Router() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<div className="p-8"><h1>Welcome to QWERTY</h1><p>Find jobs and prepare your applications.</p></div>} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/jobs/:slug" element={<JobDetailPage />} />
          <Route path="/career" element={<Navigate to="/candidate/career" replace />} />
          <Route path="/career/roles" element={<Navigate to="/candidate/career/roles" replace />} />
          <Route path="/career/roles/:slug" element={<CareerRoleSlugRedirect />} />
          <Route path="/career/roles/:slug/roadmap" element={<CareerRoleRoadmapRedirect />} />
          <Route path="/career/roles/:slug/courses" element={<CareerRoleCoursesRedirect />} />
          <Route path="/career/roles/:slug/plan" element={<CareerRolePlanRedirect />} />
          <Route path="/dashboard" element={<Navigate to="/candidate/dashboard" replace />} />
          <Route path="/saved-jobs" element={<Navigate to="/candidate/saved-jobs" replace />} />
          <Route path="/job-alerts" element={<Navigate to="/candidate/job-alerts" replace />} />
          <Route path="/alerts" element={<Navigate to="/candidate/job-alerts" replace />} />
          <Route path="/login" element={<AuthPage defaultMode="signin" />} />
          <Route path="/signin" element={<AuthPage defaultMode="signin" />} />
          <Route path="/register" element={<AuthPage defaultMode="register" />} />
        </Route>

        {/* Candidate Workspace */}
        <Route path="/candidate" element={<ProtectedRoute />}>
          <Route element={<CandidateLayout />}>
            <Route index element={<CandidateDashboardPage />} />
            <Route path="dashboard" element={<CandidateDashboardPage />} />
            <Route path="career" element={<CareerHubPage />} />
            <Route path="career/roles" element={<CareerRoleLibraryPage />} />
            <Route path="career/roles/:slug" element={<CareerRoleDetailPage />} />
            <Route path="career/roles/:slug/roadmap" element={<CareerRoleDetailPage />} />
            <Route path="career/roles/:slug/courses" element={<CareerRoleDetailPage />} />
            <Route path="career/roles/:slug/plan" element={<CareerRoleDetailPage />} />
            <Route path="profile" element={<CandidateProfilePage />} />
            <Route path="saved-jobs" element={<SavedJobsPage />} />
            <Route path="job-alerts" element={<JobAlertsPage />} />
            <Route path="alerts" element={<Navigate to="/candidate/job-alerts" replace />} />
            <Route path="jobs/:jobId/history" element={<AlignmentHistoryWorkspace />} />
            <Route path="tailoring/:sessionId" element={<CvTailoringWorkspace />} />
          </Route>
        </Route>

        {/* Internal Operations Workspace */}
        <Route path="/0ps26" element={<RoleRoute allowedRoles={['recruiter', 'editor', 'admin', 'super_admin']} />}>
          <Route element={<OpsLayout />}>
            <Route index element={<div className="p-8"><h1>Ops Dashboard</h1></div>} />
            <Route path="jobs" element={<JobsOpsList />} />
            <Route path="jobs/new" element={<JobOpsEditor />} />
            <Route path="jobs/imports" element={<JobBulkImportPage />} />
            <Route path="jobs/imports/:batchId" element={<JobBatchReviewPage />} />
            <Route path="jobs/:id/edit" element={<JobOpsEditor />} />
            <Route path="jobs/:id/preview" element={<JobOpsPreview />} />
            
            {/* Recruiter-Only Talent Pool Workspace */}
            <Route element={<RoleRoute allowedRoles={['recruiter']} />}>
              <Route path="talent" element={<TalentPoolSearchPage />} />
              <Route path="talent/:candidateId" element={<TalentCandidateDetailPage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
