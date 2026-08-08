/**
 * We avoid reading package.json at runtime in dev (tsx is finicky with the
 * relative require). For now we hardcode the version; this is a Phase 1
 * value. We'll switch to reading the file at build time in production.
 */

export const packageJson = {
  name: '@dbpcms/api',
  version: '0.1.0',
} as const;
