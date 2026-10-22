/**
 * QWERTY Stage 6.4 — Candidate Home Dashboard Store
 * Aggregates candidate-private activity, readiness, and deterministic next actions.
 * Zero AI runtime execution.
 */

import { getAdminClient } from '../../db/supabase.js';
import { SavedJobsStore } from '../savedJobs/savedJobsStore.js';
import { JobAlertsStore } from '../jobAlerts/jobAlertsStore.js';
import { JobAlignmentStore } from '../matching/jobAlignmentStore.js';
import {
  CURRENT_DASHBOARD_VERSION,
  CandidateDashboardResponse,
  DashboardCandidateInfo,
  DashboardProfileReadiness,
  DashboardSavedJobsSummary,
  DashboardJobAlertsSummary,
  DashboardAlignmentsSummary,
  DashboardRecentAlignmentItem,
  DashboardNextAction
} from './types.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// In-memory mocks for unit test environments
interface FallbackProfileState {
  profile?: any;
  currentCv?: any;
  latestParse?: any;
  latestAssessment?: any;
}
const fallbackProfileStore: Map<string, FallbackProfileState> = new Map();
const fallbackAlignmentsStore: Map<string, any[]> = new Map();
let fallbackPublishedJobs: any[] = [];

export class CandidateDashboardStore {
  public static isValidUuid(id: string): boolean {
    return Boolean(id && typeof id === 'string' && UUID_REGEX.test(id));
  }

  public static clearFallbackStore(): void {
    fallbackProfileStore.clear();
    fallbackAlignmentsStore.clear();
    fallbackPublishedJobs = [];
  }

  public static setFallbackProfile(
    userId: string,
    state: FallbackProfileState
  ): void {
    fallbackProfileStore.set(userId, state);
  }

  public static setFallbackAlignments(
    userId: string,
    alignments: any[]
  ): void {
    fallbackAlignmentsStore.set(userId, alignments);
  }

  public static setFallbackPublishedJobs(jobs: any[]): void {
    fallbackPublishedJobs = jobs;
  }

  /**
   * Authoritative deterministic Stage 6.3 criteria matcher.
   * Excludes non-published jobs (draft, closed, archived).
   * Evaluates keywords, location_query, workplace_type, and employment_type (Boolean AND).
   */
  public static isJobMatchingAlert(job: any, alert: any): boolean {
    if (!job || job.status !== 'published') {
      return false;
    }

    // 1. Keywords (case-insensitive substring match against title, description, company_name)
    if (alert.keywords && alert.keywords.trim()) {
      const textTarget = `${job.title || ''} ${job.description || ''} ${job.company_name || ''}`.toLowerCase();
      const words = alert.keywords.toLowerCase().split(/\s+/).filter(Boolean);
      if (!words.some((w: string) => textTarget.includes(w))) {
        return false;
      }
    }

    // 2. Location (case-insensitive substring match against location_text, city, country)
    if (alert.location_query && alert.location_query.trim()) {
      const locTarget = `${job.location_text || ''} ${job.city || ''} ${job.country || ''}`.toLowerCase();
      if (!locTarget.includes(alert.location_query.toLowerCase().trim())) {
        return false;
      }
    }

    // 3. Workplace Type (exact normalized match, skip if 'unspecified' or null)
    if (alert.workplace_type && alert.workplace_type !== 'unspecified') {
      if (job.workplace_type !== alert.workplace_type) {
        return false;
      }
    }

    // 4. Employment Type (exact normalized match, skip if 'unspecified' or null)
    if (alert.employment_type && alert.employment_type !== 'unspecified') {
      if (job.employment_type !== alert.employment_type) {
        return false;
      }
    }

    return true;
  }

  /**
   * Aggregates all dashboard data for the authenticated candidate.
   */
  public static async getDashboardData(userId: string): Promise<CandidateDashboardResponse> {
    if (!this.isValidUuid(userId)) {
      throw new Error('INVALID_USER_ID');
    }

    const supabase = getAdminClient();

    // ---------------------------------------------------------
    // 1. Profile & CV Readiness
    // ---------------------------------------------------------
    let candidateInfo: DashboardCandidateInfo = {
      id: userId,
      display_name: null,
      first_name: null,
      last_name: null,
      professional_headline: null
    };

    let profileReadiness: DashboardProfileReadiness = {
      profile_completed: false,
      cv_uploaded: false,
      cv_filename: null,
      cv_uploaded_at: null,
      cv_parse_status: null,
      profile_applied: false,
      ats_readiness: {
        available: false,
        score: null,
        max_score: null,
        status: null
      }
    };

    try {
      if (supabase) {
        // Query Profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, display_name, professional_headline, professional_summary, years_experience, city, country')
          .eq('id', userId)
          .maybeSingle();

        if (profile) {
          candidateInfo = {
            id: profile.id,
            display_name: profile.display_name || null,
            first_name: profile.first_name || null,
            last_name: profile.last_name || null,
            professional_headline: profile.professional_headline || null
          };
          profileReadiness.profile_completed = Boolean(
            profile.display_name || (profile.first_name && profile.last_name)
          );
        }

        // Query Current CV
        const { data: currentCv } = await supabase
          .from('candidate_cv_versions')
          .select('id, original_filename, uploaded_at, is_current')
          .eq('user_id', userId)
          .eq('is_current', true)
          .is('deleted_at', null)
          .limit(1)
          .maybeSingle();

        if (currentCv) {
          profileReadiness.cv_uploaded = true;
          profileReadiness.cv_filename = currentCv.original_filename;
          profileReadiness.cv_uploaded_at = currentCv.uploaded_at;

          // Query Latest Parse for this CV or user
          const { data: parseRecord } = await supabase
            .from('candidate_cv_parses')
            .select('id, status, applied_at, reviewed_at')
            .eq('user_id', userId)
            .eq('cv_version_id', currentCv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (parseRecord) {
            profileReadiness.cv_parse_status = parseRecord.status;
            profileReadiness.profile_applied = Boolean(parseRecord.applied_at);
          }

          // Query Latest ATS Assessment
          const { data: assessment } = await supabase
            .from('candidate_cv_assessments')
            .select('score, max_score, status')
            .eq('user_id', userId)
            .eq('cv_version_id', currentCv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (assessment) {
            profileReadiness.ats_readiness = {
              available: assessment.status === 'completed',
              score: assessment.score ?? null,
              max_score: assessment.max_score ?? null,
              status: assessment.status
            };
          }
        }
      } else {
        // Fallback for test / dev environment
        const fallback = fallbackProfileStore.get(userId);
        if (fallback) {
          if (fallback.profile) {
            candidateInfo = {
              id: userId,
              display_name: fallback.profile.display_name || null,
              first_name: fallback.profile.first_name || null,
              last_name: fallback.profile.last_name || null,
              professional_headline: fallback.profile.professional_headline || null
            };
            profileReadiness.profile_completed = Boolean(
              fallback.profile.display_name || (fallback.profile.first_name && fallback.profile.last_name)
            );
          }
          if (fallback.currentCv) {
            profileReadiness.cv_uploaded = true;
            profileReadiness.cv_filename = fallback.currentCv.original_filename;
            profileReadiness.cv_uploaded_at = fallback.currentCv.uploaded_at;
          }
          if (fallback.latestParse) {
            profileReadiness.cv_parse_status = fallback.latestParse.status;
            profileReadiness.profile_applied = Boolean(fallback.latestParse.applied_at);
          }
          if (fallback.latestAssessment) {
            profileReadiness.ats_readiness = {
              available: fallback.latestAssessment.status === 'completed',
              score: fallback.latestAssessment.score ?? null,
              max_score: fallback.latestAssessment.max_score ?? null,
              status: fallback.latestAssessment.status
            };
          }
        }
      }
    } catch (err) {
      console.error('[CANDIDATE_DASHBOARD] Profile readiness fetch error:', err);
    }

    // ---------------------------------------------------------
    // 2. Saved Jobs (bounded to 3 recent items)
    // ---------------------------------------------------------
    let savedJobsSummary: DashboardSavedJobsSummary = {
      total: 0,
      recent: []
    };

    try {
      const savedRes = await SavedJobsStore.listSavedJobs(userId, { limit: 3 });
      savedJobsSummary = {
        total: savedRes.total,
        recent: savedRes.saved_jobs
      };
    } catch (err) {
      console.error('[CANDIDATE_DASHBOARD] Saved jobs fetch error:', err);
    }

    // ---------------------------------------------------------
    // 3. Job Alerts & Authoritative Unique Match Calculation
    // ---------------------------------------------------------
    let jobAlertsSummary: DashboardJobAlertsSummary = {
      total: 0,
      active: 0,
      unique_matching_jobs_count: 0,
      recent: []
    };

    try {
      const alerts = await JobAlertsStore.listAlerts(userId);
      const activeAlerts = alerts.filter(a => a.is_active);

      let uniqueMatchCount = 0;

      if (activeAlerts.length > 0) {
        // Authoritative match calculation against ALL published jobs via bounded paging chunks.
        // Prevents N+1 queries: active alerts (<= 10) are evaluated against each published job.
        // Deduplicates job IDs using Set<string> so roles matching multiple alerts count once.
        const matchedJobIds = new Set<string>();
        const CHUNK_SIZE = 100;

        if (supabase) {
          let offset = 0;
          let hasMore = true;

          while (hasMore) {
            const { data: pageJobs, error } = await supabase
              .from('jobs')
              .select('id, title, company_name, location_text, country, city, workplace_type, employment_type, status, published_at, created_at, description')
              .eq('status', 'published')
              .order('published_at', { ascending: false })
              .range(offset, offset + CHUNK_SIZE - 1);

            if (error) {
              console.error('[CANDIDATE_DASHBOARD] Error paging published jobs for alert matching:', error);
              break;
            }

            if (!pageJobs || pageJobs.length === 0) {
              hasMore = false;
              break;
            }

            for (const job of pageJobs) {
              if (job.status !== 'published') continue;
              for (const alert of activeAlerts) {
                if (CandidateDashboardStore.isJobMatchingAlert(job, alert)) {
                  matchedJobIds.add(job.id);
                  break; // Job is matched, no need to test further alerts for this job
                }
              }
            }

            if (pageJobs.length < CHUNK_SIZE) {
              hasMore = false;
            } else {
              offset += CHUNK_SIZE;
            }
          }
        } else {
          // Fallback in-memory store for unit test & local environments
          // Evaluate in bounded chunks across ALL published jobs without arbitrary ceiling
          const publishedFallback = fallbackPublishedJobs.filter(j => j && j.status === 'published');
          for (let i = 0; i < publishedFallback.length; i += CHUNK_SIZE) {
            const chunk = publishedFallback.slice(i, i + CHUNK_SIZE);
            for (const job of chunk) {
              if (job.status !== 'published') continue;
              for (const alert of activeAlerts) {
                if (CandidateDashboardStore.isJobMatchingAlert(job, alert)) {
                  matchedJobIds.add(job.id);
                  break; // Job is matched, no need to test further alerts for this job
                }
              }
            }
          }
        }

        uniqueMatchCount = matchedJobIds.size;
      }

      jobAlertsSummary = {
        total: alerts.length,
        active: activeAlerts.length,
        unique_matching_jobs_count: uniqueMatchCount,
        recent: alerts.slice(0, 3)
      };
    } catch (err) {
      console.error('[CANDIDATE_DASHBOARD] Job alerts fetch error:', err);
    }

    // ---------------------------------------------------------
    // 4. Recent Alignment Analyses (stored results only, zero AI)
    // ---------------------------------------------------------
    let alignmentsSummary: DashboardAlignmentsSummary = {
      total: 0,
      recent: []
    };

    try {
      let allAlignments: any[] = [];
      const fallbackAlignments = fallbackAlignmentsStore.get(userId);
      if (fallbackAlignments) {
        allAlignments = fallbackAlignments;
      } else {
        allAlignments = await JobAlignmentStore.listForCandidate(userId);
      }
      const completedAlignments = allAlignments.filter(a => a.status === 'completed');

      const recentItems: DashboardRecentAlignmentItem[] = completedAlignments
        .slice(0, 3)
        .map(a => ({
          id: a.id,
          job_id: a.job_id,
          job_title: a.job_title || 'Untitled Role',
          company_name: a.company_name || 'Organization',
          score: a.score,
          max_score: a.max_score,
          ruleset_version: a.ruleset_version,
          status: a.status,
          created_at: a.created_at
        }));

      alignmentsSummary = {
        total: completedAlignments.length,
        recent: recentItems
      };
    } catch (err) {
      console.error('[CANDIDATE_DASHBOARD] Alignment fetch error:', err);
    }

    // ---------------------------------------------------------
    // 5. Deterministic Next Actions Engine (zero AI, priority ordered)
    // ---------------------------------------------------------
    const nextActions = this.computeNextActions({
      profileReadiness,
      savedJobsCount: savedJobsSummary.total,
      alertsCount: jobAlertsSummary.total,
      uniqueMatchesCount: jobAlertsSummary.unique_matching_jobs_count,
      alignmentsCount: alignmentsSummary.total,
      recentAlignment: alignmentsSummary.recent[0] || null
    });

    return {
      version: CURRENT_DASHBOARD_VERSION,
      candidate: candidateInfo,
      profile_readiness: profileReadiness,
      saved_jobs: savedJobsSummary,
      job_alerts: jobAlertsSummary,
      recent_alignments: alignmentsSummary,
      next_actions: nextActions
    };
  }

  /**
   * Deterministic next-action selection logic.
   * Priority:
   * 1. Profile / CV blockers
   * 2. Discover/save jobs
   * 3. Configure alerts
   * 4. Review alert matches
   * 5. Analyse a job
   * 6. Review skills gap
   * 7. Explore Career Hub
   * Returns up to 3 highest-priority actions.
   */
  public static computeNextActions(ctx: {
    profileReadiness: DashboardProfileReadiness;
    savedJobsCount: number;
    alertsCount: number;
    uniqueMatchesCount: number;
    alignmentsCount: number;
    recentAlignment: DashboardRecentAlignmentItem | null;
  }): DashboardNextAction[] {
    const candidates: DashboardNextAction[] = [];

    // Priority 1: Profile / CV Blockers
    if (!ctx.profileReadiness.cv_uploaded) {
      candidates.push({
        id: 'upload_cv',
        title: 'Upload your CV',
        description: 'Add your CV to enable job alignment analysis and tailored insights.',
        href: '/candidate/profile',
        cta: 'Upload CV',
        priority: 1
      });
    } else if (!ctx.profileReadiness.profile_applied) {
      candidates.push({
        id: 'review_profile',
        title: 'Review your CV profile',
        description: 'Confirm your extracted skills and experience to unlock job alignment.',
        href: '/candidate/profile',
        cta: 'Review Profile',
        priority: 1
      });
    }

    // Priority 2: Discover / Save Jobs
    if (ctx.savedJobsCount === 0) {
      candidates.push({
        id: 'browse_jobs',
        title: 'Browse open roles',
        description: 'Explore published vacancies and save roles that match your career goals.',
        href: '/jobs',
        cta: 'Browse Jobs',
        priority: 2
      });
    }

    // Priority 3: Configure Alerts
    if (ctx.alertsCount === 0) {
      candidates.push({
        id: 'create_alert',
        title: 'Create your first Job Alert',
        description: 'Set up search alerts for your target roles, locations, and working models.',
        href: '/candidate/job-alerts',
        cta: 'Create Alert',
        priority: 3
      });
    }

    // Priority 4: Review Alert Matches
    if (ctx.uniqueMatchesCount > 0) {
      const roleText = ctx.uniqueMatchesCount === 1 ? 'role matches' : 'roles match';
      candidates.push({
        id: 'review_matches',
        title: 'Review matching jobs',
        description: `${ctx.uniqueMatchesCount} published ${roleText} your active job alerts.`,
        href: '/candidate/job-alerts',
        cta: 'View Matches',
        priority: 4
      });
    }

    // Priority 5: Analyse a Job
    if (ctx.savedJobsCount > 0 && ctx.alignmentsCount === 0) {
      candidates.push({
        id: 'analyse_saved_job',
        title: 'Analyse a saved job',
        description: 'Check how well your evidence matches your saved opportunities.',
        href: '/candidate/saved-jobs',
        cta: 'View Saved Jobs',
        priority: 5
      });
    }

    // Priority 6: Review Skills Gap
    if (ctx.recentAlignment) {
      candidates.push({
        id: 'review_skills_gap',
        title: 'Review your skills gaps',
        description: `See evidence-safe development guidance for ${ctx.recentAlignment.job_title}.`,
        href: `/jobs/${ctx.recentAlignment.job_id}`,
        cta: 'View Analysis',
        priority: 6
      });
    }

    // Priority 7: Explore Career Hub
    if (candidates.length < 3) {
      candidates.push({
        id: 'explore_career_hub',
        title: 'Explore Career Hub',
        description: 'Discover career role benchmarks and skill roadmaps across QWERTY.',
        href: '/career',
        cta: 'Visit Career Hub',
        priority: 7
      });
    }

    // Sort by priority ascending and take up to 3
    return candidates
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 3);
  }
}
