const BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export class ApiError extends Error {
  status: number;
  data?: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  timeoutMs?: number;
  _retry?: boolean;
  responseType?: 'json' | 'blob';
}

export function clearSession() {
  for (const key of ['vanguard_token', 'vanguard_refresh_token', 'vanguard_user']) localStorage.removeItem(key);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('vanguard:session-change'));
}

function timeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal.timeout === 'function') return AbortSignal.timeout(ms);
  const controller = new AbortController();
  setTimeout(() => controller.abort(new DOMException('Timed out', 'TimeoutError')), ms);
  return controller.signal;
}

function anySignal(signals: AbortSignal[]): AbortSignal {
  if (typeof AbortSignal.any === 'function') return AbortSignal.any(signals);
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) { controller.abort(signal.reason); break; }
    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
  }
  return controller.signal;
}

async function boundedFetch(url: string, options: RequestInit, timeoutMs: number) {
  const signals = [timeoutSignal(timeoutMs)];
  if (options.signal) signals.push(options.signal);
  try {
    return await fetch(url, { ...options, signal: anySignal(signals) });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiError((error as Error).name === 'TimeoutError'
      ? 'The server took too long to respond. Please try again.'
      : 'The server is unavailable. Check your connection and try again.', 0);
  }
}

let refreshFlight: Promise<string> | null = null;
async function refreshedToken(): Promise<string> {
  if (!refreshFlight) {
    refreshFlight = (async () => {
      const refreshToken = localStorage.getItem('vanguard_refresh_token');
      if (!refreshToken) {
        clearSession();
        throw new ApiError('Please sign in again.', 401);
      }
      const response = await boundedFetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      }, 30_000);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) clearSession();
        throw new ApiError('Your session could not be refreshed. Please sign in again.', response.status);
      }
      const data = await response.json();
      if (!data.access_token) {
        clearSession();
        throw new ApiError('Invalid session response. Please sign in again.', 401);
      }
      localStorage.setItem('vanguard_token', data.access_token);
      if (data.refresh_token) localStorage.setItem('vanguard_refresh_token', data.refresh_token);
      if (data.user) localStorage.setItem('vanguard_user', JSON.stringify(data.user));
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('vanguard:session-change'));
      return data.access_token as string;
    })().finally(() => { refreshFlight = null; });
  }
  return refreshFlight;
}

export async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, _retry, timeoutMs, responseType, ...config } = options;
  let url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) if (value != null) search.append(key, String(value));
  const query = search.toString();
  if (query) url += `${url.includes('?') ? '&' : '?'}${query}`;
  const token = localStorage.getItem('vanguard_token');
  const multipart = typeof FormData !== 'undefined' && config.body instanceof FormData;
  const longRunning = /(?:export|sitrep|assessment|copilot|agents|explain|draft)/.test(endpoint);
  const response = await boundedFetch(url, {
    ...config,
    headers: { ...(!multipart ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
  }, timeoutMs ?? (longRunning ? 120_000 : 30_000));
  if (response.status === 401 && !_retry && !endpoint.startsWith('/auth/')) {
    if (token === localStorage.getItem('vanguard_token')) await refreshedToken();
    // A mutation may already have reached the server; let its caller decide whether to repeat it.
    if (!config.method || config.method === 'GET') return request<T>(endpoint, { ...options, _retry: true });
    throw new ApiError('Your session was refreshed. Please retry this action; it was not repeated automatically.', 401);
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const detail = data.detail;
    const message = typeof detail === 'string' ? detail
      : Array.isArray(detail) ? detail.map((item: { msg?: string }) => item.msg).filter(Boolean).join('; ')
      : detail?.message || data.message || `Request failed (${response.status}).`;
    if (response.status === 401 && !endpoint.startsWith('/auth/')) clearSession();
    throw new ApiError(message, response.status, data);
  }
  if (response.status === 204) return {} as T;
  return (responseType === 'blob' ? response.blob() : response.json()) as Promise<T>;
}

export const apiClient = {
  get: <T>(endpoint: string, params?: Record<string, any>, headers?: HeadersInit, signal?: AbortSignal) =>
    request<T>(endpoint, { method: 'GET', params, headers, signal }),
  post: <T>(endpoint: string, body?: any, headers?: HeadersInit) =>
    request<T>(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined, headers }),
  put: <T>(endpoint: string, body?: any, headers?: HeadersInit) =>
    request<T>(endpoint, { method: 'PUT', body: body ? JSON.stringify(body) : undefined, headers }),
  patch: <T>(endpoint: string, body?: any, headers?: HeadersInit) =>
    request<T>(endpoint, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined, headers }),
  delete: <T>(endpoint: string, headers?: HeadersInit) => request<T>(endpoint, { method: 'DELETE', headers }),
};

export const postForm = <T>(endpoint: string, form: FormData) =>
  request<T>(endpoint, { method: 'POST', body: form });

export const downloadBlob = (endpoint: string) => request<Blob>(endpoint, { method: 'GET', responseType: 'blob', timeoutMs: 120_000 });
