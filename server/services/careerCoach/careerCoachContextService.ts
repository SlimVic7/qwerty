import { getAdminClient } from '../../db/supabase.js';
import { CareerRolesStore } from '../career/careerRolesStore.js';
import { CareerRoadmapsStore } from '../career/careerRoadmapsStore.js';
import { CareerLearningResourcesStore } from '../career/careerLearningResourcesStore.js';
import { CareerCourseRecommendationsStore } from '../career/careerCourseRecommendationsStore.js';
import { CandidateDevelopmentPlanStore } from '../career/candidateDevelopmentPlanStore.js';

export interface GroundedContext {
  candidate: {
    fullName?: string;
    currentTitle?: string;
    skills?: string[];
    hasCvEvidence: boolean;
    cvSummary?: string;
  };
  careerRole?: {
    title: string;
    slug: string;
    summary: string;
  } | null;
  developmentPlan?: {
    roleTitle?: string;
    focusSkillsCount: number;
    focusSkillTitles: string[];
  } | null;
  roadmapSkills?: Array<{ title: string; category: string; targetLevel: string }>;
  learningResources?: Array<{ title: string; type: string; url: string }>;
  courseRecommendations?: Array<{ courseName: string; platform: string; url: string }>;
  groundingSources: string[];
}

export class CareerCoachContextService {
  /**
   * Builds minimal, grounded context strictly for the authenticated candidate.
   * Excludes unneeded PII and enforces evidence boundaries.
   */
  static async buildGroundedContext(userId: string, careerRoleId?: string | null): Promise<GroundedContext> {
    const supabase = getAdminClient();
    const groundingSources: string[] = [];

    // 1. Fetch Candidate Profile & Approved CV
    let fullName = 'Candidate';
    let currentTitle = 'Professional';
    let skills: string[] = [];
    let hasCvEvidence = false;
    let cvSummary = '';

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, headline, skills')
        .eq('id', userId)
        .single();

      if (profile) {
        if (profile.full_name) fullName = profile.full_name;
        if (profile.headline) currentTitle = profile.headline;
        if (Array.isArray(profile.skills)) skills = profile.skills;
        groundingSources.push('Your QWERTY Profile');
      }

      // Fetch latest approved CV parse
      const { data: cvParse } = await supabase
        .from('candidate_cv_parses')
        .select('extracted_data')
        .eq('user_id', userId)
        .in('status', ['completed', 'needs_review'])
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      if (cvParse && cvParse.extracted_data) {
        hasCvEvidence = true;
        const data = cvParse.extracted_data;
        cvSummary = `Work History: ${data.workHistory?.length || 0} roles. Extracted Skills: ${(data.skills || []).slice(0, 10).join(', ')}.`;
        groundingSources.push('Your Approved CV Evidence');
      }
    } catch (e) {
      // Ignore
    }

    // 2. Fetch Candidate Development Plan
    let developmentPlan: GroundedContext['developmentPlan'] = null;
    try {
      const plan = await CandidateDevelopmentPlanStore.getPlanByUserId(userId);
      if (plan && plan.items) {
        developmentPlan = {
          roleTitle: plan.role_title,
          focusSkillsCount: plan.items.length,
          focusSkillTitles: plan.items.map((item: any) => item.skill_title)
        };
        groundingSources.push('Personalized Development Roadmap');
      }
    } catch (e) {
      // Ignore
    }

    // 3. Fetch Career Role & Skill Roadmap if specified or linked to dev plan
    let careerRoleData: GroundedContext['careerRole'] = null;
    let roadmapSkills: GroundedContext['roadmapSkills'] = [];
    let learningResources: GroundedContext['learningResources'] = [];
    let courseRecommendations: GroundedContext['courseRecommendations'] = [];

    const targetRoleId = careerRoleId || (developmentPlan ? developmentPlan.roleTitle : null);

    if (targetRoleId) {
      try {
        let role = await CareerRolesStore.getRoleById(targetRoleId);
        if (!role) {
          role = await CareerRolesStore.getRoleBySlug(targetRoleId);
        }

        if (role) {
          careerRoleData = {
            title: role.title,
            slug: role.slug,
            summary: role.summary || ''
          };
          groundingSources.push(`Career Role: ${role.title}`);

          const roadmap = await CareerRoadmapsStore.getRoadmapByRoleId(role.id);
          if (roadmap && roadmap.items) {
            roadmapSkills = roadmap.items.slice(0, 15).map((item: any) => ({
              title: item.title || item.skill_title,
              category: item.category || 'Core Skill',
              targetLevel: item.target_level || 'Intermediate'
            }));
            groundingSources.push(`${role.title} Skill Roadmap`);
          }

          // Fetch top learning resources & courses
          const resources = await CareerLearningResourcesStore.getResourcesByRoleSlug(role.slug, 5);
          if (resources.length > 0) {
            learningResources = resources.map((r) => ({
              title: r.title,
              type: r.resource_type,
              url: r.url
            }));
            groundingSources.push('Selected Learning Resources');
          }

          const courses = await CareerCourseRecommendationsStore.getCoursesByRoleSlug(role.slug, 5);
          if (courses.length > 0) {
            courseRecommendations = courses.map((c) => ({
              courseName: c.course_name,
              platform: c.platform,
              url: c.url
            }));
            groundingSources.push('Selected Course Recommendations');
          }
        }
      } catch (e) {
        // Ignore
      }
    }

    return {
      candidate: {
        fullName,
        currentTitle,
        skills,
        hasCvEvidence,
        cvSummary
      },
      careerRole: careerRoleData,
      developmentPlan,
      roadmapSkills,
      learningResources,
      courseRecommendations,
      groundingSources: Array.from(new Set(groundingSources))
    };
  }
}
