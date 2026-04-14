/**
 * Low-level fetch wrapper for the watchtower-synthetic REST API.
 *
 * Keeps URL construction + error handling in one place so hooks can stay thin.
 * Throws `ApiError` on non-2xx responses with parsed JSON detail when available.
 */
import { SYNTHETIC_BASE_URL } from '../config/backend';

export class ApiError extends Error {
  readonly status: number;
  readonly detail: unknown;

  constructor(status: number, message: string, detail: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

export function apiUrl(path: string): string {
  if (!path.startsWith('/')) {
    throw new Error(`apiUrl path must start with "/": got ${path}`);
  }
  return `${SYNTHETIC_BASE_URL}${path}`;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal } = opts;
  const headers: Record<string, string> = {};
  let serializedBody: string | undefined;

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    serializedBody = JSON.stringify(body);
  }

  const response = await fetch(apiUrl(path), {
    method,
    headers,
    body: serializedBody,
    signal,
  });

  // DELETE responses sometimes come with empty bodies; guard against that.
  const text = await response.text();
  const parsed: unknown = text ? safeJsonParse(text) : null;

  if (!response.ok) {
    const detail = (parsed as { detail?: unknown } | null)?.detail ?? parsed;
    throw new ApiError(
      response.status,
      `${method} ${path} failed: ${response.status} ${response.statusText}`,
      detail,
    );
  }

  return parsed as T;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
