import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';
import authService from '@/modules/auth/api/authApi';
import { updateTokensInStorage } from '@/modules/auth/authStorage';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

let refreshPromise: Promise<string> | null = null;

// Proactive refresh: nếu token còn < 2 phút thì refresh trước khi gửi request
async function getValidAccessToken(): Promise<string | null> {
  const token = localStorage.getItem('accessToken');
  const expiresAt = localStorage.getItem('accessTokenExpiresAt');

  if (!token) return null;

  // Nếu còn hơn 2 phút thì dùng luôn
  if (expiresAt) {
    const expiresMs = new Date(expiresAt).getTime();
    const nowMs = Date.now();
    const remainingMs = expiresMs - nowMs;
    if (remainingMs > 2 * 60 * 1000) return token;
  }

  // Token sắp hết hạn → refresh trước
  try {
    if (!refreshPromise) {
      refreshPromise = (async () => {
        const refreshToken = localStorage.getItem('refreshToken');
        const rawUser = localStorage.getItem('user');
        const deviceUid = rawUser ? JSON.parse(rawUser).deviceUid : null;
        if (!refreshToken || !deviceUid) throw new Error('Missing refresh token or deviceUid');
        const tokens = await authService.refresh({ refreshToken, deviceUid });
        updateTokensInStorage(tokens);
        return tokens.accessToken;
      })().finally(() => { refreshPromise = null; });
    }
    return await refreshPromise;
  } catch {
    return token; // fallback dùng token cũ, để response interceptor xử lý 401
  }
}

axiosClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const isAuthEndpoint =
      config.url?.includes('/auth/login') ||
      config.url?.includes('/auth/refresh') ||
      config.url?.includes('/auth/logout');

    if (isAuthEndpoint) {
      // Auth endpoints: attach token hiện tại, không proactive refresh
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    } else {
      // Các endpoint khác: proactive refresh nếu token sắp hết hạn
      const token = await getValidAccessToken();
      if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
  (response) => response.data,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & {
      _retry?: boolean;
    }) | undefined;

    const status = error.response?.status;
    const isAuthEndpoint =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/refresh') ||
      originalRequest?.url?.includes('/auth/logout');

    if (status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = (async () => {
            const refreshToken = localStorage.getItem('refreshToken');
            const rawUser = localStorage.getItem('user');
            const deviceUid = rawUser ? JSON.parse(rawUser).deviceUid : null;

            if (!refreshToken || !deviceUid) {
              throw new Error('Missing refresh token or deviceUid');
            }

            const tokens = await authService.refresh({
              refreshToken,
              deviceUid,
            });
            updateTokensInStorage(tokens);
            return tokens.accessToken;
          })().finally(() => {
            refreshPromise = null;
          });
        }

        const nextAccessToken = await refreshPromise;

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
        }

        return axiosClient(originalRequest);
      } catch {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    if (status === 401) {
      if (isAuthEndpoint) {
        return Promise.reject(error);
      }
      localStorage.clear();
      window.location.href = '/login';
      return Promise.reject(error.response?.data || error);
    }

    return Promise.reject(error.response?.data || error);
  }
);

export default axiosClient;