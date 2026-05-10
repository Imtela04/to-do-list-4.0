import axios, { type AxiosRequestConfig } from 'axios';

const client = axios.create({
  baseURL:         import.meta.env.VITE_API_URL as string,
  headers:         { 'Content-Type': 'application/json' },
  withCredentials: false,
});

// ── JWT helpers ───────────────────────────────────────────────
const getTokenExpiry = (token: string): number | null => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as { exp: number };
    return payload.exp * 1000;
  } catch {
    return null;
  }
};

const isExpiringSoon = (token: string): boolean => {
  const expiry = getTokenExpiry(token);
  if (!expiry) return true;
  return Date.now() > expiry - 60_000;
};

// ── Refresh queue ─────────────────────────────────────────────
interface QueueEntry {
  resolve: (token: string) => void;
  reject:  (err: unknown)  => void;
}

let isRefreshing = false;
let failedQueue: QueueEntry[] = [];
let globalErrorHandler: ((msg: string) => void) | null = null;
export function registerErrorHandler(fn: (msg: string) => void) {
  globalErrorHandler = fn;
}

const processQueue = (error: unknown, token: string | null = null): void => {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token!));
  failedQueue = [];
};

const doRefresh = async (): Promise<string> => {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) throw new Error('No refresh token');

  const res = await axios.post<{ access: string; refresh: string }>(
    `${import.meta.env.VITE_API_URL as string}/auth/refresh/`,
    { refresh: refreshToken }
  );
  localStorage.setItem('authToken',    res.data.access);
  localStorage.setItem('refreshToken', res.data.refresh);
  return res.data.access;
};

// ── Request interceptor — proactive refresh ───────────────────
client.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('authToken');
  if (!token) return config;

  if (isExpiringSoon(token)) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const newToken = await doRefresh();
        processQueue(null, newToken);
        config.headers.Authorization = `Bearer ${newToken}`;
      } catch (err) {
        processQueue(err, null);
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      } finally {
        isRefreshing = false;
      }
    } else {
      const newToken = await new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      });
      config.headers.Authorization = `Bearer ${newToken}`;
    }
  } else {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// ── Response interceptor — 401 fallback ───────────────────────
client.interceptors.response.use(
  (res) => res,
  async (err: { response?: { status: number; data?: { detail?: string } }; config: AxiosRequestConfig & { _retry?: boolean; _silent?: boolean } }) => {
    if (err.response?.status === 401 && !err.config._retry) {
      err.config._retry = true;
      try {
        const newToken = await doRefresh();
        if (err.config.headers) {
          err.config.headers.Authorization = `Bearer ${newToken}`;
        }
        return client(err.config);
      } catch {
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }
    if (err.response?.status !== 401 && !err.config._silent && globalErrorHandler) {
      const message = err.response?.data?.detail ?? 'Something went wrong.';
      globalErrorHandler(message);
    }

    return Promise.reject(err);
  }
);

export default client;