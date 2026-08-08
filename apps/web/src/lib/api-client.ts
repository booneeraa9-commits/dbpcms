/**
 * A tiny fetch wrapper that:
 *  - sends the access token on every request,
 *  - sends cookies (for the refresh token),
 *  - automatically refreshes an expired access token once and retries,
 *  - unwraps our standard { success, data, error } envelope.
 *
 * All frontend data access goes through this, so auth handling lives in one place.
 */

let accessToken: string | null = null;
let onAuthFailure: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}
export function getAccessToken(): string | null {
  return accessToken;
}
export function setAuthFailureHandler(handler: () => void): void {
  onAuthFailure = handler;
}

export class ApiError extends Error {
  code: string;
  status: number;
  details?: { field: string; message: string }[];
  constructor(
    message: string,
    code: string,
    status: number,
    details?: { field: string; message: string }[],
  ) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Set false to skip the auto-refresh-and-retry (used by the refresh call). */
  retryOnAuthError?: boolean;
}

async function rawRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, retryOnAuthError = true } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const response = await fetch(`/api/v1${path}`, {
    method,
    headers,
    credentials: "include", // send/receive the refresh cookie
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Try to refresh once on a 401, then retry the original request.
  if (response.status === 401 && retryOnAuthError && path !== "/auth/refresh") {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return rawRequest<T>(path, { ...options, retryOnAuthError: false });
    }
    onAuthFailure?.();
  }

  const json = (await response.json().catch(() => null)) as
    | { success: boolean; data?: T; error?: { code: string; message: string; details?: { field: string; message: string }[] } }
    | null;

  if (!response.ok || !json || json.success === false) {
    const err = json?.error;
    throw new ApiError(
      err?.message ?? "Request failed.",
      err?.code ?? "UNKNOWN",
      response.status,
      err?.details,
    );
  }
  return json.data as T;
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch("/api/v1/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return false;
    const json = (await res.json()) as { data?: { accessToken?: string } };
    if (json.data?.accessToken) {
      accessToken = json.data.accessToken;
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export const api = {
  get: <T>(path: string) => rawRequest<T>(path),
  post: <T>(path: string, body?: unknown) =>
    rawRequest<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) =>
    rawRequest<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => rawRequest<T>(path, { method: "DELETE" }),
};
