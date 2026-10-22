/**
 * Authoritative runtime environment configuration for QWERTY.
 * Centralizes the DISABLE_HMR policy across server startup, Vite config, and tests.
 */

export function isHmrDisabled(val?: string): boolean {
  const envVal = val !== undefined ? val : process.env.DISABLE_HMR;
  return envVal?.trim().toLowerCase() === 'true';
}

export interface EffectiveViteConfigOptions {
  root?: string;
  disableHmr?: boolean;
}

export function getEffectiveViteServerConfig(options?: EffectiveViteConfigOptions) {
  const disableHmr = options?.disableHmr !== undefined ? options.disableHmr : isHmrDisabled();
  return {
    root: options?.root ?? process.cwd(),
    server: {
      middlewareMode: true,
      hmr: disableHmr ? false : true,
      watch: disableHmr ? null : {},
    },
    appType: 'spa' as const,
  };
}
