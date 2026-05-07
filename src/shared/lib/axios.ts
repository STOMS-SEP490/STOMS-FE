import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';
import { handleAuthFailure } from '@/modules/auth/utils/handleAuthFailure';
import { refreshAccessToken } from './refreshTokenManager';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

async function getValidAccessToken(): Promise<string | null> {
  const token = localStorage.getItem('accessToken');
  const expiresAt = localStorage.getItem('accessTokenExpiresAt');

  if (!token) return null;

  if (expiresAt) {
    const expiresMs = new Date(expiresAt).getTime();
    const nowMs = Date.now();
    const remainingMs = expiresMs - nowMs;
    if (remainingMs > 2 * 60 * 1000) return token;
  }

  try {
    console.log('[getValidAccessToken] Token expiring soon, refreshing...');
    return await refreshAccessToken();
  } catch (err) {
    console.error('[getValidAccessToken] Refresh failed, logging out...', err);
    // Refresh fail -> logout ngay, KHÔNG trả về token cũ
    void handleAuthFailure();
    return null;
  }
}

axiosClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const isAuthEndpoint =
      config.url?.includes('/auth/login') ||
      config.url?.includes('/auth/refresh') ||
      config.url?.includes('/auth/logout');

    if (isAuthEndpoint) {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    } else {
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
        console.log('[401 Retry] Attempting refresh for URL:', originalRequest?.url);
        const nextAccessToken = await refreshAccessToken();

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
        }

        console.log('[401 Retry] Retrying original request with new token');
        return axiosClient(originalRequest);
      } catch (refreshError) {
        console.error('[401 Retry] Refresh failed, logging out...', refreshError);
        // Refresh token thất bại -> logout đúng cách
        await handleAuthFailure();
        return Promise.reject(error);
      }
    }

    if (status === 401) {
      if (isAuthEndpoint) {
        return Promise.reject(error);
      }
      // 401 không thể retry -> logout đúng cách
      await handleAuthFailure();
      return Promise.reject(error.response?.data || error);
    }

    return Promise.reject(error.response?.data || error);
  }
);

export default axiosClient;