import axios from 'axios';
import { resetRefreshPromise } from '@/shared/lib/refreshTokenManager';

/**
 * Xử lý khi refresh token thất bại hoặc auth không hợp lệ.
 * Gọi API logout (nếu có thể) để cleanup session trên server,
 * sau đó clear localStorage và redirect về login.
 */
export async function handleAuthFailure(): Promise<void> {
  try {
    // Reset shared refresh promise trước khi logout
    resetRefreshPromise();

    const refreshToken = localStorage.getItem('refreshToken');
    const accessToken = localStorage.getItem('accessToken');
    const user = localStorage.getItem('user');
    const deviceUid = user ? JSON.parse(user).deviceUid : null;

    // Nếu có refreshToken và deviceUid, thử gọi logout API
    if (refreshToken && deviceUid) {
      // Dùng axios trực tiếp, bypass interceptor để tránh vòng lặp refresh
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/auth/logout`,
        { refreshToken, deviceUid },
        { 
          headers: { Authorization: `Bearer ${accessToken ?? ''}` },
          timeout: 3000, // Timeout nhanh để không block UX
        }
      );
    }
  } catch (error) {
    // Bỏ qua lỗi logout API (có thể 401, network error, etc.)
    // Vì mục đích chính là clear local storage
    console.warn('Logout API failed during auth failure cleanup:', error);
  } finally {
    // Luôn clear localStorage và redirect
    localStorage.clear();
    window.location.href = '/login';
  }
}
