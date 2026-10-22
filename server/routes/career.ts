/**
 * QWERTY Stage 7.1 — Career Role Library Router
 * Candidate-private API endpoints for Career Hub & Role Library
 * Enforces requireAuth and requireRole(['candidate'])
 */

import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { CareerRolesStore } from '../services/career/careerRolesStore.js';
import { CareerRoadmapsStore } from '../services/career/careerRoadmapsStore.js';
import { CareerLearningResourcesStore } from '../services/career/careerLearningResourcesStore.js';
import { CareerCourseRecommendationsStore } from '../services/career/careerCourseRecommendationsStore.js';
import { CandidateDevelopmentPlanStore } from '../services/career/candidateDevelopmentPlanStore.js';
import { isPersonalizedDevelopmentRoadmapPublicEnabled } from '../config/featureFlags.js';

export const careerRouter = Router();

// Candidate private access guard for all Career Hub endpoints
careerRouter.use(requireAuth, requireRole(['candidate']));

/**
 * GET /api/candidate/career/roles
 * Lists curated career roles with optional area filter and text search.
 */
careerRouter.get('/roles', async (req, res) => {
  try {
    const area = typeof req.query.area === 'string' ? req.query.area : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    const result = await CareerRolesStore.listRoles({ area, search });
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('[CAREER_ROLES] List error:', error);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve career roles.'
    });
  }
});

/**
 * GET /api/candidate/career/areas
 * Returns all distinct career areas with role counts.
 */
careerRouter.get('/areas', async (req, res) => {
  try {
    const areas = await CareerRolesStore.getCareerAreas();
    return res.status(200).json({ areas });
  } catch (error: any) {
    console.error('[CAREER_ROLES] Areas error:', error);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve career areas.'
    });
  }
});

/**
 * GET /api/candidate/career/roles/:slug
 * Retrieves a single career role profile by canonical slug.
 */
careerRouter.get('/roles/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({
        error: 'INVALID_SLUG',
        message: 'A valid role slug is required.'
      });
    }

    const role = await CareerRolesStore.getRoleBySlug(slug);
    if (!role) {
      return res.status(404).json({
        error: 'ROLE_NOT_FOUND',
        message: `Career role '${slug}' was not found.`
      });
    }

    return res.status(200).json({ role });
  } catch (error: any) {
    console.error('[CAREER_ROLES] Detail error:', error);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve career role profile.'
    });
  }
});

/**
 * GET /api/candidate/career/roles/:slug/roadmap
 * Retrieves the published skill roadmap for a canonical career role slug.
 */
careerRouter.get('/roles/:slug/roadmap', async (req, res) => {
  try {
    const { slug } = req.params;
    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({
        error: 'INVALID_SLUG',
        message: 'A valid role slug is required.'
      });
    }

    const result = await CareerRoadmapsStore.getRoadmapByRoleSlug(slug);
    if (!result) {
      return res.status(404).json({
        error: 'ROLE_NOT_FOUND',
        message: `Career role '${slug}' was not found.`
      });
    }

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('[CAREER_ROLES] Roadmap error:', error);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve career role skill roadmap.'
    });
  }
});

/**
 * GET /api/candidate/career/roles/:slug/roadmap/resources
 * Retrieves the published skill roadmap and grouped learning resources for a career role slug.
 */
careerRouter.get('/roles/:slug/roadmap/resources', async (req, res) => {
  try {
    const { slug } = req.params;
    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({
        error: 'INVALID_SLUG',
        message: 'A valid role slug is required.'
      });
    }

    const result = await CareerLearningResourcesStore.getResourcesByRoleSlug(slug);
    if (!result) {
      return res.status(404).json({
        error: 'ROLE_NOT_FOUND',
        message: `Career role '${slug}' was not found.`
      });
    }

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('[CAREER_ROLES] Learning resources error:', error);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve career role learning resources.'
    });
  }
});

/**
 * GET /api/candidate/career/roles/:slug/roadmap/items/:itemId/resources
 * Retrieves published learning resources attached to a specific roadmap item ID.
 */
careerRouter.get('/roles/:slug/roadmap/items/:itemId/resources', async (req, res) => {
  try {
    const { slug, itemId } = req.params;
    if (!slug || typeof slug !== 'string' || !itemId || typeof itemId !== 'string') {
      return res.status(400).json({
        error: 'INVALID_PARAMS',
        message: 'A valid role slug and item ID are required.'
      });
    }

    const role = await CareerRolesStore.getRoleBySlug(slug);
    if (!role || role.status !== 'published') {
      return res.status(404).json({
        error: 'ROLE_NOT_FOUND',
        message: `Career role '${slug}' was not found.`
      });
    }

    const resources = await CareerLearningResourcesStore.getResourcesByItemId(itemId);
    return res.status(200).json({ resources, total: resources.length });
  } catch (error: any) {
    console.error('[CAREER_ROLES] Item learning resources error:', error);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve roadmap item learning resources.'
    });
  }
});

/**
 * GET /api/candidate/career/roles/:slug/courses
 * Retrieves curated course recommendations for the current published roadmap of a role.
 */
careerRouter.get('/roles/:slug/courses', async (req, res) => {
  try {
    const { slug } = req.params;
    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({
        error: 'INVALID_SLUG',
        message: 'A valid career role slug is required.'
      });
    }

    const result = await CareerCourseRecommendationsStore.getCoursesByRoleSlug(slug);
    if (!result) {
      return res.status(404).json({
        error: 'ROLE_NOT_FOUND',
        message: `Career role '${slug}' was not found.`
      });
    }

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('[CAREER_ROLES] Course recommendations error:', error);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve career role course recommendations.'
    });
  }
});

/**
 * GET /api/candidate/career/roles/:slug/roadmap/items/:itemId/courses
 * Retrieves published course recommendations for a specific roadmap item.
 */
careerRouter.get('/roles/:slug/roadmap/items/:itemId/courses', async (req, res) => {
  try {
    const { slug, itemId } = req.params;
    if (!slug || typeof slug !== 'string' || !itemId || typeof itemId !== 'string') {
      return res.status(400).json({
        error: 'INVALID_PARAMS',
        message: 'A valid role slug and item ID are required.'
      });
    }

    const role = await CareerRolesStore.getRoleBySlug(slug);
    if (!role || role.status !== 'published') {
      return res.status(404).json({
        error: 'ROLE_NOT_FOUND',
        message: `Career role '${slug}' was not found.`
      });
    }

    const courses = await CareerCourseRecommendationsStore.getCoursesByItemId(itemId);
    return res.status(200).json({ courses, total: courses.length });
  } catch (error: any) {
    console.error('[CAREER_ROLES] Item course recommendations error:', error);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve roadmap item course recommendations.'
    });
  }
});

/**
 * Helper to check if Personalized Development Roadmap is allowed for this request
 */
function isPlanFeatureAllowed(req: any): boolean {
  if (isPersonalizedDevelopmentRoadmapPublicEnabled()) return true;
  // Security guardrail: A browser header must NEVER unlock Stage 7.5 in production
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  if (req.headers['x-dev-preview'] === 'true' || req.headers['x-feature-override'] === 'true') {
    return true;
  }
  return false;
}

/**
 * GET /api/candidate/career/roles/:slug/development-plan
 * Retrieves the candidate-private personalized development plan for a career role.
 */
careerRouter.get('/roles/:slug/development-plan', async (req, res) => {
  try {
    const { slug } = req.params;
    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({
        error: 'INVALID_SLUG',
        message: 'A valid career role slug is required.'
      });
    }

    const candidateId = (req as any).user?.id;
    if (!candidateId) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Candidate authentication required.'
      });
    }

    const featureEnabled = isPlanFeatureAllowed(req);

    const result = await CandidateDevelopmentPlanStore.getPlanByRoleSlug(candidateId, slug);
    if (!result) {
      return res.status(404).json({
        error: 'ROLE_NOT_FOUND',
        message: `Career role '${slug}' was not found.`
      });
    }

    result.feature_enabled = featureEnabled;

    if (!featureEnabled && !result.plan) {
      return res.status(200).json({
        ...result,
        plan: null,
        message: 'Personalized Development Roadmap — Coming Soon'
      });
    }

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('[CAREER_ROLES] Development plan error:', error);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve personalized development roadmap.'
    });
  }
});

/**
 * POST /api/candidate/career/roles/:slug/development-plan/generate
 * Generates or regenerates candidate development plan comparing published roadmap against candidate evidence.
 */
const handleGeneratePlan = async (req: any, res: any) => {
  try {
    const { slug } = req.params;
    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({
        error: 'INVALID_SLUG',
        message: 'A valid career role slug is required.'
      });
    }

    const candidateId = (req as any).user?.id;
    if (!candidateId) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Candidate authentication required.'
      });
    }

    if (!isPlanFeatureAllowed(req)) {
      return res.status(403).json({
        error: 'FEATURE_DISABLED',
        message: 'Personalized Development Roadmap is currently disabled in this environment.'
      });
    }

    const mockEvidence = req.body?.mockEvidence;
    const result = await CandidateDevelopmentPlanStore.generatePlanForRole(candidateId, slug, mockEvidence);

    if (!result) {
      return res.status(404).json({
        error: 'ROLE_NOT_FOUND',
        message: `Career role '${slug}' was not found.`
      });
    }

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('[CAREER_ROLES] Generate development plan error:', error);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to generate personalized development roadmap.'
    });
  }
};

careerRouter.post('/roles/:slug/development-plan/generate', handleGeneratePlan);
careerRouter.post('/roles/:slug/development-plan', handleGeneratePlan);


