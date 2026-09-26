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

export const FEATURE_FLAGS = {
  CV_TAILORING_PUBLIC_ENABLED: isCvTailoringPublicEnabled,
};
