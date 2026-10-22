import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CandidateDashboardStore } from '../server/services/dashboard/candidateDashboardStore.js';
import { SavedJobsStore } from '../server/services/savedJobs/savedJobsStore.js';
import { JobAlertsStore } from '../server/services/jobAlerts/jobAlertsStore.js';
import { JobAlignmentStore } from '../server/services/matching/jobAlignmentStore.js';
import { CURRENT_DASHBOARD_VERSION } from '../server/services/dashboard/types.js';

const userA = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const userB = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const sampleJobId1 = '11111111-1111-4111-a111-111111111111';
const sampleJobId2 = '22222222-2222-4222-a222-222222222222';
const sampleJobId3 = '33333333-3333-4333-a333-333333333333';
const sampleJobId4 = '44444444-4444-4444-a444-444444444444';

vi.mock('../server/db/supabase.js', () => ({
  getAdminClient: () => null,
  getAuthClient: () => null
}));

describe('Candidate Dashboard Store & Next Actions Engine (Stage 6.4)', () => {
  beforeEach(() => {
    CandidateDashboardStore.clearFallbackStore();
    SavedJobsStore.clearFallbackStore();
    JobAlertsStore.clearFallbackStore();
  });

  describe('UUID & Input Validation', () => {
    it('validates standard UUIDs and rejects invalid formats', async () => {
      expect(CandidateDashboardStore.isValidUuid(userA)).toBe(true);
      expect(CandidateDashboardStore.isValidUuid('not-a-uuid')).toBe(false);
      expect(CandidateDashboardStore.isValidUuid('')).toBe(false);

      await expect(CandidateDashboardStore.getDashboardData('not-a-uuid'))
        .rejects.toThrow('INVALID_USER_ID');
    });
  });

  describe('Aggregation & States', () => {
    it('A. New candidate empty state returns clean initial structure', async () => {
      const data = await CandidateDashboardStore.getDashboardData(userA);

      expect(data.version).toBe(CURRENT_DASHBOARD_VERSION);
      expect(data.candidate.id).toBe(userA);
      expect(data.profile_readiness.cv_uploaded).toBe(false);
      expect(data.profile_readiness.profile_completed).toBe(false);
      expect(data.saved_jobs.total).toBe(0);
      expect(data.saved_jobs.recent.length).toBe(0);
      expect(data.job_alerts.total).toBe(0);
      expect(data.job_alerts.active).toBe(0);
      expect(data.job_alerts.unique_matching_jobs_count).toBe(0);
      expect(data.recent_alignments.total).toBe(0);
      expect(data.recent_alignments.recent.length).toBe(0);

      // Next actions should guide new candidate with top 3 priorities
      expect(data.next_actions.length).toBe(3);
      expect(data.next_actions[0].id).toBe('upload_cv');
      expect(data.next_actions[1].id).toBe('browse_jobs');
      expect(data.next_actions[2].id).toBe('create_alert');
    });

    it('B. Candidate with saved jobs reflects accurate count and recent items', async () => {
      await SavedJobsStore.saveJob(userA, sampleJobId1);
      await SavedJobsStore.saveJob(userA, sampleJobId2);

      const data = await CandidateDashboardStore.getDashboardData(userA);
      expect(data.saved_jobs.total).toBe(2);
      expect(data.saved_jobs.recent.length).toBe(2);
    });

    it('C. Candidate with configured job alerts reflects total and active counts', async () => {
      await JobAlertsStore.createAlert(userA, { name: 'Active Alert 1', is_active: true });
      await JobAlertsStore.createAlert(userA, { name: 'Active Alert 2', is_active: true });
      await JobAlertsStore.createAlert(userA, { name: 'Paused Alert', is_active: false });

      const data = await CandidateDashboardStore.getDashboardData(userA);
      expect(data.job_alerts.total).toBe(3);
      expect(data.job_alerts.active).toBe(2);
    });

    it('D. Candidate with alert matches calculates unique matching jobs without duplicate inflation', async () => {
      // 2 active alerts targeting React and London
      await JobAlertsStore.createAlert(userA, { name: 'Frontend React', keywords: 'React', is_active: true });
      await JobAlertsStore.createAlert(userA, { name: 'London Roles', location_query: 'London', is_active: true });

      // 3 published jobs: Job 1 matches both alerts; Job 2 matches React; Job 3 matches neither
      CandidateDashboardStore.setFallbackPublishedJobs([
        {
          id: sampleJobId1,
          title: 'Senior React Developer',
          company_name: 'Acme',
          location_text: 'London, UK',
          status: 'published'
        },
        {
          id: sampleJobId2,
          title: 'React Native Engineer',
          company_name: 'Beta',
          location_text: 'Manchester',
          status: 'published'
        },
        {
          id: sampleJobId3,
          title: 'Java Backend Architect',
          company_name: 'Gamma',
          location_text: 'Edinburgh',
          status: 'published'
        }
      ]);

      const data = await CandidateDashboardStore.getDashboardData(userA);
      // Job 1 and Job 2 match active alerts -> exactly 2 unique jobs
      expect(data.job_alerts.unique_matching_jobs_count).toBe(2);
    });

    it('E. Candidate with alignment history returns completed alignments', async () => {
      CandidateDashboardStore.setFallbackAlignments(userA, [
        {
          id: 'align-1',
          user_id: userA,
          job_id: sampleJobId1,
          cv_version_id: 'cv-1',
          parse_id: 'parse-1',
          job_title: 'Full Stack Engineer',
          company_name: 'Fintech Ltd',
          status: 'completed',
          ruleset_version: 'job-alignment-v1.3',
          score: 88,
          max_score: 100,
          created_at: new Date().toISOString()
        }
      ]);

      const data = await CandidateDashboardStore.getDashboardData(userA);
      expect(data.recent_alignments.total).toBe(1);
      expect(data.recent_alignments.recent[0].score).toBe(88);
      expect(data.recent_alignments.recent[0].job_title).toBe('Full Stack Engineer');
    });

    it('F. Profile and CV readiness metadata are populated', async () => {
      CandidateDashboardStore.setFallbackProfile(userA, {
        profile: {
          display_name: 'Alice Candidate',
          first_name: 'Alice',
          last_name: 'Candidate'
        },
        currentCv: {
          original_filename: 'Alice_Resume_2026.pdf',
          uploaded_at: '2026-10-01T12:00:00Z'
        },
        latestParse: {
          status: 'completed',
          applied_at: '2026-10-02T10:00:00Z'
        },
        latestAssessment: {
          status: 'completed',
          score: 92,
          max_score: 100
        }
      });

      const data = await CandidateDashboardStore.getDashboardData(userA);
      expect(data.candidate.display_name).toBe('Alice Candidate');
      expect(data.profile_readiness.cv_uploaded).toBe(true);
      expect(data.profile_readiness.cv_filename).toBe('Alice_Resume_2026.pdf');
      expect(data.profile_readiness.profile_applied).toBe(true);
      expect(data.profile_readiness.ats_readiness.available).toBe(true);
      expect(data.profile_readiness.ats_readiness.score).toBe(92);
    });

    it('G. Correct bounded recent-item limits (max 3 for saved, alerts, alignments)', async () => {
      // Create 5 saved jobs
      await SavedJobsStore.saveJob(userA, sampleJobId1);
      await SavedJobsStore.saveJob(userA, sampleJobId2);
      await SavedJobsStore.saveJob(userA, sampleJobId3);
      await SavedJobsStore.saveJob(userA, sampleJobId4);

      // Create 4 alerts
      for (let i = 1; i <= 4; i++) {
        await JobAlertsStore.createAlert(userA, { name: `Alert ${i}` });
      }

      const data = await CandidateDashboardStore.getDashboardData(userA);
      expect(data.saved_jobs.recent.length).toBeLessThanOrEqual(3);
      expect(data.job_alerts.recent.length).toBeLessThanOrEqual(3);
      expect(data.recent_alignments.recent.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Data Ownership Isolation', () => {
    it('Candidate A never sees Candidate B activity, counts, or profile data', async () => {
      // User B has 2 saved jobs, 1 alert, and profile
      await SavedJobsStore.saveJob(userB, sampleJobId1);
      await SavedJobsStore.saveJob(userB, sampleJobId2);
      await JobAlertsStore.createAlert(userB, { name: 'User B Alert' });
      CandidateDashboardStore.setFallbackProfile(userB, {
        profile: { display_name: 'Bob Secret' },
        currentCv: { original_filename: 'Bob_Secret.pdf' }
      });

      // User A loads dashboard
      const dataA = await CandidateDashboardStore.getDashboardData(userA);
      expect(dataA.candidate.id).toBe(userA);
      expect(dataA.candidate.display_name).toBeNull();
      expect(dataA.saved_jobs.total).toBe(0);
      expect(dataA.saved_jobs.recent.length).toBe(0);
      expect(dataA.job_alerts.total).toBe(0);
      expect(dataA.job_alerts.recent.length).toBe(0);
      expect(dataA.profile_readiness.cv_uploaded).toBe(false);
    });
  });

  describe('Deterministic Next Actions Precedence', () => {
    it('evaluates rules in strict priority and returns at most 3 actions', () => {
      // State 1: No CV -> Upload CV (priority 1), Browse Jobs (priority 2), Create Alert (priority 3)
      const actions1 = CandidateDashboardStore.computeNextActions({
        profileReadiness: {
          profile_completed: false,
          cv_uploaded: false,
          profile_applied: false,
          ats_readiness: { available: false }
        },
        savedJobsCount: 0,
        alertsCount: 0,
        uniqueMatchesCount: 0,
        alignmentsCount: 0,
        recentAlignment: null
      });

      expect(actions1.length).toBe(3);
      expect(actions1[0].id).toBe('upload_cv');
      expect(actions1[1].id).toBe('browse_jobs');
      expect(actions1[2].id).toBe('create_alert');

      // State 2: CV uploaded, has saved jobs & alerts with matches -> Review Matches (priority 4), Explore Career Hub (priority 7)
      const actions2 = CandidateDashboardStore.computeNextActions({
        profileReadiness: {
          profile_completed: true,
          cv_uploaded: true,
          profile_applied: true,
          ats_readiness: { available: true }
        },
        savedJobsCount: 2,
        alertsCount: 2,
        uniqueMatchesCount: 5,
        alignmentsCount: 0,
        recentAlignment: null
      });

      expect(actions2.length).toBeLessThanOrEqual(3);
      expect(actions2.some(a => a.id === 'review_matches')).toBe(true);
      expect(actions2.some(a => a.id === 'analyse_saved_job')).toBe(true);
    });
  });

  describe('Zero Side-Effect & Zero AI', () => {
    it('loading dashboard performs zero mutations or state creation', async () => {
      const initialAlerts = await JobAlertsStore.listAlerts(userA);
      const initialSaved = await SavedJobsStore.listSavedJobs(userA);

      await CandidateDashboardStore.getDashboardData(userA);

      const afterAlerts = await JobAlertsStore.listAlerts(userA);
      const afterSaved = await SavedJobsStore.listSavedJobs(userA);

      expect(afterAlerts.length).toBe(initialAlerts.length);
      expect(afterSaved.total).toBe(initialSaved.total);
    });

    it('never exposes match scoring, percentages, or AI ranking for alert matches', async () => {
      await JobAlertsStore.createAlert(userA, { name: 'Full Stack Engineer', keywords: 'Full Stack', is_active: true });
      CandidateDashboardStore.setFallbackPublishedJobs([
        {
          id: sampleJobId1,
          title: 'Full Stack Engineer',
          company_name: 'Tech Corp',
          status: 'published'
        }
      ]);

      const data = await CandidateDashboardStore.getDashboardData(userA);
      expect(data.job_alerts.unique_matching_jobs_count).toBe(1);

      // Verify no scoring or ranking fields exist on job_alerts summary
      expect((data.job_alerts as any).match_percentage).toBeUndefined();
      expect((data.job_alerts as any).ai_rank).toBeUndefined();
      expect((data.job_alerts as any).score).toBeUndefined();

      for (const alert of data.job_alerts.recent) {
        expect((alert as any).match_percentage).toBeUndefined();
        expect((alert as any).ai_score).toBeUndefined();
      }
    });
  });

  describe('Authoritative Alert Match Calculation & Scale Correctness (Stage 6.4 Regression)', () => {
    it('proves correctness beyond the 200-job boundary (260 published jobs with matches exclusively after position 200)', async () => {
      // Candidate has active alert targeting 'TypeScript'
      await JobAlertsStore.createAlert(userA, {
        name: 'TypeScript Roles',
        keywords: 'TypeScript',
        is_active: true
      });

      // Generate 260 published jobs:
      // - First 200 jobs (0-199): Python/Java roles (do NOT match)
      // - Next 60 jobs (200-259): TypeScript roles (DO match)
      const testJobs: any[] = [];
      for (let i = 0; i < 200; i++) {
        testJobs.push({
          id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
          title: `Python Backend Engineer ${i}`,
          company_name: `Company ${i}`,
          location_text: 'Berlin, Germany',
          workplace_type: 'remote',
          employment_type: 'full_time',
          status: 'published',
          published_at: new Date(Date.now() - i * 1000).toISOString()
        });
      }

      for (let i = 200; i < 260; i++) {
        testJobs.push({
          id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
          title: `Senior TypeScript Architect ${i}`,
          company_name: `Company ${i}`,
          location_text: 'London, UK',
          workplace_type: 'remote',
          employment_type: 'full_time',
          status: 'published',
          published_at: new Date(Date.now() - i * 1000).toISOString()
        });
      }

      CandidateDashboardStore.setFallbackPublishedJobs(testJobs);

      const data = await CandidateDashboardStore.getDashboardData(userA);

      // Under the old 200-job limit, this would evaluate only jobs 0-199 and return 0 matches.
      // With authoritative bounded-chunk evaluation across all published jobs, exactly 60 matches are found.
      expect(data.job_alerts.unique_matching_jobs_count).toBe(60);
    });

    it('strictly excludes non-published jobs (draft, closed, archived) even when criteria match', async () => {
      await JobAlertsStore.createAlert(userA, {
        name: 'Cloud Engineer',
        keywords: 'Cloud',
        is_active: true
      });

      // 4 jobs with identical matching criteria but different statuses
      CandidateDashboardStore.setFallbackPublishedJobs([
        {
          id: sampleJobId1,
          title: 'Senior Cloud Engineer',
          company_name: 'Alpha Ltd',
          status: 'published' // Should match
        },
        {
          id: sampleJobId2,
          title: 'Senior Cloud Engineer',
          company_name: 'Beta Ltd',
          status: 'draft' // Must be excluded
        },
        {
          id: sampleJobId3,
          title: 'Senior Cloud Engineer',
          company_name: 'Gamma Ltd',
          status: 'closed' // Must be excluded
        },
        {
          id: sampleJobId4,
          title: 'Senior Cloud Engineer',
          company_name: 'Delta Ltd',
          status: 'archived' // Must be excluded
        }
      ]);

      const data = await CandidateDashboardStore.getDashboardData(userA);
      expect(data.job_alerts.unique_matching_jobs_count).toBe(1);
    });

    it('deduplicates matches across multiple active alerts so a job matching multiple alerts counts once', async () => {
      // 3 active alerts targeting different criteria
      await JobAlertsStore.createAlert(userA, { name: 'React Alert', keywords: 'React', is_active: true });
      await JobAlertsStore.createAlert(userA, { name: 'London Alert', location_query: 'London', is_active: true });
      await JobAlertsStore.createAlert(userA, { name: 'Remote Alert', workplace_type: 'remote', is_active: true });

      CandidateDashboardStore.setFallbackPublishedJobs([
        {
          id: sampleJobId1,
          title: 'Senior React Developer',
          location_text: 'London, UK',
          workplace_type: 'remote',
          status: 'published'
          // Matches Alert 1, Alert 2, and Alert 3 -> counts ONCE
        },
        {
          id: sampleJobId2,
          title: 'React Specialist',
          location_text: 'Manchester, UK',
          workplace_type: 'onsite',
          status: 'published'
          // Matches Alert 1 only -> counts ONCE
        },
        {
          id: sampleJobId3,
          title: 'Node Backend Lead',
          location_text: 'London, UK',
          workplace_type: 'hybrid',
          status: 'published'
          // Matches Alert 2 only -> counts ONCE
        },
        {
          id: sampleJobId4,
          title: 'Go Systems Engineer',
          location_text: 'Leeds, UK',
          workplace_type: 'remote',
          status: 'published'
          // Matches Alert 3 only -> counts ONCE
        },
        {
          id: '55555555-5555-4555-a555-555555555555',
          title: 'Database Admin',
          location_text: 'Birmingham, UK',
          workplace_type: 'onsite',
          status: 'published'
          // Matches none -> does NOT count
        }
      ]);

      const data = await CandidateDashboardStore.getDashboardData(userA);
      // Exactly 4 unique published jobs match
      expect(data.job_alerts.unique_matching_jobs_count).toBe(4);
    });

    it('returns 0 unique matches if candidate has no active alerts even if published jobs exist', async () => {
      await JobAlertsStore.createAlert(userA, { name: 'Paused Alert', keywords: 'React', is_active: false });

      CandidateDashboardStore.setFallbackPublishedJobs([
        {
          id: sampleJobId1,
          title: 'Senior React Developer',
          status: 'published'
        }
      ]);

      const data = await CandidateDashboardStore.getDashboardData(userA);
      expect(data.job_alerts.unique_matching_jobs_count).toBe(0);
    });
  });
});
