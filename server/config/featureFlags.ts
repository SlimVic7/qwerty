/**
 * Centralized Feature Flags Configuration for QWERTY.
 *
 * All feature toggles MUST be declared and evaluated here.
 * Do not scatter direct process.env checks across business logic.
 */

/**
 * Returns whether AI CV Tailoring is publicly enabled for candidate mutation.
 *
 * Rules:
 * - Default behavior when environment variable is absent: false
 * - Development/staging/internal controlled environments may set CV_TAILORING_PUBLIC_ENABLED=true
 * - Production/public environment remains false until deliberately activated.
 */
export function isCvTailoringPublicEnabled(): boolean {
  const val = process.env.CV_TAILORING_PUBLIC_ENABLED;
  if (!val) {
    return false;
  }
  return val.trim().toLowerCase() === 'true';
}

/**
 * Returns whether Personalized Development Roadmap is publicly enabled.
 *
 * Rules:
 * - Default behavior when environment variable is absent: false
 * - Controlled test/engineering environments may enable it via PERSONALIZED_DEVELOPMENT_ROADMAP_PUBLIC_ENABLED=true
 * - Production/public environment remains false until deliberately activated.
 * - NODE_ENV alone is NOT the entitlement mechanism.
 */
export function isPersonalizedDevelopmentRoadmapPublicEnabled(): boolean {
  const val = process.env.PERSONALIZED_DEVELOPMENT_ROADMAP_PUBLIC_ENABLED;
  if (!val) {
    return false;
  }
  return val.trim().toLowerCase() === 'true';
}

export const FEATURE_FLAGS = {
  CV_TAILORING_PUBLIC_ENABLED: isCvTailoringPublicEnabled,
  PERSONALIZED_DEVELOPMENT_ROADMAP_PUBLIC_ENABLED: isPersonalizedDevelopmentRoadmapPublicEnabled,
};

