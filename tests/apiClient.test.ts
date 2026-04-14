import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiRequest, apiUrl } from '../src/hooks/apiClient';

describe('apiUrl', () => {
  it('prepends the configured backend base URL', () => {
    expect(apiUrl('/scenarios')).toMatch(/\/scenarios$/);
    expect(apiUrl('/api/scenarios/env_1')).toContain('/api/scenarios/env_1');
  });

  it('rejects paths that do not start with a slash', () => {
    expect(() => apiUrl('scenarios')).toThrow();
  });
});

describe('apiRequest', () => {
  const originalFetch = globalThis.fetch;
  beforeEach(() => {
    globalThis.fetch = vi.fn() as unknown as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const fetchMock = () => globalThis.fetch as unknown as ReturnType<typeof vi.fn>;

  it('serializes JSON body and parses response', async () => {
    fetchMock().mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => '{"id":"env_1","status":"created"}',
    });
    const res = await apiRequest<{ id: string; status: string }>('/api/scenarios', {
      method: 'POST',
      body: { id: 'env_1' },
    });
    expect(res).toEqual({ id: 'env_1', status: 'created' });
    const call = fetchMock().mock.calls[0];
    expect(call[1].method).toBe('POST');
    expect(call[1].headers['Content-Type']).toBe('application/json');
    expect(call[1].body).toBe('{"id":"env_1"}');
  });

  it('throws ApiError with parsed detail on non-2xx', async () => {
    fetchMock().mockResolvedValueOnce({
      ok: false,
      status: 409,
      statusText: 'Conflict',
      text: async () => '{"detail":"already exists"}',
    });
    await expect(apiRequest('/api/scenarios', { method: 'POST', body: {} })).rejects.toMatchObject({
      name: 'ApiError',
      status: 409,
      detail: 'already exists',
    });
  });

  it('handles empty response bodies gracefully (e.g. DELETE 204)', async () => {
    fetchMock().mockResolvedValueOnce({
      ok: true,
      status: 204,
      statusText: 'No Content',
      text: async () => '',
    });
    const res = await apiRequest('/api/scenarios/env_1', { method: 'DELETE' });
    expect(res).toBeNull();
  });

  it('surfaces network failure as an error (not ApiError)', async () => {
    fetchMock().mockRejectedValueOnce(new TypeError('net down'));
    await expect(apiRequest('/health')).rejects.toThrow('net down');
    await expect(apiRequest('/health')).rejects.not.toBeInstanceOf(ApiError);
  });
});
