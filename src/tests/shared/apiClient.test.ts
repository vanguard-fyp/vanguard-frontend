import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let values: Map<string, string>;
beforeEach(() => {
  vi.resetModules();
  values = new Map([['vanguard_token', 'expired'], ['vanguard_refresh_token', 'refresh']]);
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
  vi.stubGlobal('window', new EventTarget());
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('session and unavailable-service recovery', () => {
  it('settles all concurrent reads when refresh is rejected', async () => {
    const fetcher = vi.fn(async (_url: string, _options?: RequestInit) => new Response('{}', { status: 401 }));
    vi.stubGlobal('fetch', fetcher);
    const { request } = await import('../../services/apiClient');
    const results = await Promise.allSettled([request('/incidents'), request('/missions')]);
    expect(results.map((result) => result.status)).toEqual(['rejected', 'rejected']);
    expect(fetcher.mock.calls.filter((args) => String(args[0]).endsWith('/auth/refresh'))).toHaveLength(1);
    expect(values.has('vanguard_token')).toBe(false);
  });

  it('retries reads with the new token after one successful refresh', async () => {
    const fetcher = vi.fn(async (url: string, options: RequestInit) => {
      if (url.endsWith('/auth/refresh')) return Response.json({ access_token: 'fresh' });
      return (options.headers as Record<string, string>).Authorization === 'Bearer fresh'
        ? Response.json([{ id: 'saved-record' }]) : new Response('{}', { status: 401 });
    });
    vi.stubGlobal('fetch', fetcher);
    const { request } = await import('../../services/apiClient');
    await expect(request('/incidents')).resolves.toEqual([{ id: 'saved-record' }]);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('does not automatically repeat a mutation after refreshing', async () => {
    const fetcher = vi.fn(async (url: string) => url.endsWith('/auth/refresh')
      ? Response.json({ access_token: 'fresh' }) : new Response('{}', { status: 401 }));
    vi.stubGlobal('fetch', fetcher);
    const { apiClient } = await import('../../services/apiClient');
    await expect(apiClient.post('/missions', { title: 'Rescue' })).rejects.toThrow('not repeated automatically');
    expect(fetcher.mock.calls.filter((args) => String(args[0]).endsWith('/missions'))).toHaveLength(1);
    expect(values.get('vanguard_token')).toBe('fresh');
  });

  it('returns an unavailable error when the request times out', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new DOMException('Timed out', 'TimeoutError'); }));
    const { request } = await import('../../services/apiClient');
    await expect(request('/incidents')).rejects.toMatchObject({ status: 0, message: expect.stringContaining('too long') });
  });

  it('downloads exports with authentication and a bounded long timeout', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    const fetcher = vi.fn(async (_url: string, _options?: RequestInit) => new Response('report', { headers: { 'Content-Type': 'text/csv' } }));
    vi.stubGlobal('fetch', fetcher);
    const { downloadBlob } = await import('../../services/apiClient');
    expect(await (await downloadBlob('/analytics/export/csv')).text()).toBe('report');
    expect(timeout).toHaveBeenCalledWith(120_000);
    expect((fetcher.mock.calls[0][1] as RequestInit).headers).toMatchObject({ Authorization: 'Bearer expired' });
  });
});
