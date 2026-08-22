/**
 * Vanguard API Client
 * Centralized HTTP client with automatic JWT token attachment and error handling.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, ...customConfig } = options;

  let url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const token = localStorage.getItem('vanguard_token');

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };

  try {
    const response = await fetch(url, {
      ...customConfig,
      headers: defaultHeaders,
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: response.statusText };
      }
      throw new ApiError(errorData.detail || errorData.message || 'API Request Failed', response.status, errorData);
    }

    // Return empty object for 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError((error as Error).message || 'Network connection failed', 0);
  }
}

export const apiClient = {
  get: <T>(endpoint: string, params?: Record<string, any>, headers?: HeadersInit) =>
    request<T>(endpoint, { method: 'GET', params, headers }),
  post: <T>(endpoint: string, body?: any, headers?: HeadersInit) =>
    request<T>(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined, headers }),
  put: <T>(endpoint: string, body?: any, headers?: HeadersInit) =>
    request<T>(endpoint, { method: 'PUT', body: body ? JSON.stringify(body) : undefined, headers }),
  patch: <T>(endpoint: string, body?: any, headers?: HeadersInit) =>
    request<T>(endpoint, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined, headers }),
  delete: <T>(endpoint: string, headers?: HeadersInit) =>
    request<T>(endpoint, { method: 'DELETE', headers }),
};
