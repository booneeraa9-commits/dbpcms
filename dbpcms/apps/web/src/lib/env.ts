/**
 * Centralized environment access.
 * Validate env vars at startup so we fail fast.
 */

const requiredEnv = {
  apiUrl: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  appName: import.meta.env.VITE_APP_NAME || 'DBPCMS',
};

if (!requiredEnv.apiUrl.startsWith('/') && !requiredEnv.apiUrl.startsWith('http')) {
  throw new Error('VITE_API_BASE_URL must start with / or http');
}

export const env = {
  apiUrl: requiredEnv.apiUrl,
  appName: requiredEnv.appName,
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const;
