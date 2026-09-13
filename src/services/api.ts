/**
 * Central API client for the ArriveAlarm backend.
 * All API calls go through this module to ensure consistent
 * error handling, auth cookies, and base URL configuration.
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
}

class ApiError extends Error {
  code: string;
  statusCode: number;
  details?: unknown;

  constructor(code: string, message: string, statusCode: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE}${endpoint}`;

  const config: RequestInit = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // Remove Content-Type for FormData
  if (options.body instanceof FormData) {
    const headers = config.headers as Record<string, string>;
    delete headers['Content-Type'];
  }

  const response = await fetch(url, config);
  
  let data: any = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch (e) {
      data = null;
    }
  }

  if (!data) {
    const text = await response.text().catch(() => '');
    data = {
      success: false,
      error: {
        code: `HTTP_${response.status}`,
        message: text || `Server error (${response.status})`,
      },
    };
  }

  if (!response.ok || !data.success) {
    throw new ApiError(
      data.error?.code || `HTTP_${response.status}`,
      data.error?.message || `An error occurred (${response.status})`,
      response.status,
      data.error?.details
    );
  }

  return data as ApiResponse<T>;
}

// ─── Auth API ────────────────────────────────────────────────

export const authApi = {
  register: (body: { name: string; email: string; password: string }) =>
    request<{ user: any }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (body: { email: string; password: string }) =>
    request<{ user: any }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  logout: () =>
    request<{ message: string }>('/api/auth/logout', { method: 'POST' }),

  me: () =>
    request<{ user: any }>('/api/auth/me'),

  forgotPassword: (email: string) =>
    request<{ message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, password: string) =>
    request<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),

  googleLoginUrl: () => `${API_BASE}/api/auth/google`,
};

// ─── Alarms API ──────────────────────────────────────────────

export const alarmsApi = {
  list: () =>
    request<{ alarms: any[] }>('/api/alarms'),

  create: (body: any) =>
    request<{ alarm: any }>('/api/alarms', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  get: (id: string) =>
    request<{ alarm: any }>(`/api/alarms/${id}`),

  update: (id: string, body: any) =>
    request<{ alarm: any }>(`/api/alarms/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/api/alarms/${id}`, { method: 'DELETE' }),

  enable: (id: string) =>
    request<{ alarm: any }>(`/api/alarms/${id}/enable`, { method: 'POST' }),

  disable: (id: string) =>
    request<{ alarm: any }>(`/api/alarms/${id}/disable`, { method: 'POST' }),

  snooze: (id: string, minutes: number = 5) =>
    request<{ alarm: any }>(`/api/alarms/${id}/snooze`, {
      method: 'POST',
      body: JSON.stringify({ minutes }),
    }),

  stop: (id: string, latitude?: number, longitude?: number) =>
    request<{ alarm: any }>(`/api/alarms/${id}/stop`, {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude }),
    }),

  trigger: (id: string, latitude?: number, longitude?: number) =>
    request<{ alarm: any }>(`/api/alarms/${id}/trigger`, {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude }),
    }),
};

// ─── Locations API ───────────────────────────────────────────

export const locationsApi = {
  list: () =>
    request<{ locations: any[] }>('/api/locations'),

  create: (body: any) =>
    request<{ location: any }>('/api/locations', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (id: string, body: any) =>
    request<{ location: any }>(`/api/locations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/api/locations/${id}`, { method: 'DELETE' }),
};

// ─── History API ─────────────────────────────────────────────

export const historyApi = {
  list: (page: number = 1, limit: number = 20) =>
    request<any[]>(`/api/history?page=${page}&limit=${limit}`),

  forAlarm: (alarmId: string, page: number = 1, limit: number = 20) =>
    request<any[]>(`/api/history/alarm/${alarmId}?page=${page}&limit=${limit}`),

  clearAll: () =>
    request<{ message: string }>('/api/history', { method: 'DELETE' }),

  deleteEntry: (id: string) =>
    request<{ message: string }>(`/api/history/${id}`, { method: 'DELETE' }),
};

// ─── Notifications API ──────────────────────────────────────

export const notificationsApi = {
  getVapidKey: () =>
    request<{ publicKey: string }>('/api/notifications/vapid-public-key'),

  subscribe: (subscription: PushSubscription) =>
    request<{ message: string }>('/api/notifications/subscribe', {
      method: 'POST',
      body: JSON.stringify(subscription.toJSON()),
    }),

  unsubscribe: (endpoint?: string) =>
    request<{ message: string }>('/api/notifications/unsubscribe', {
      method: 'POST',
      body: JSON.stringify({ endpoint }),
    }),

  test: () =>
    request<{ message: string }>('/api/notifications/test', { method: 'POST' }),
};

// ─── Dashboard API ───────────────────────────────────────────

export const dashboardApi = {
  stats: () =>
    request<{ stats: any }>('/api/dashboard/stats'),
};

// ─── User / Settings API ────────────────────────────────────

export const usersApi = {
  getProfile: () =>
    request<{ user: any }>('/api/users/me'),

  updateProfile: (body: any) =>
    request<{ user: any }>('/api/users/me', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteAccount: () =>
    request<{ message: string }>('/api/users/me', { method: 'DELETE' }),

  getSettings: () =>
    request<{ settings: any }>('/api/users/me/settings'),

  updateSettings: (body: any) =>
    request<{ settings: any }>('/api/users/me/settings', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
};

export { ApiError };
