// src/utils/logout.ts

import authService from '@/modules/auth/api/authApi';

export const logout = async () => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    const user = localStorage.getItem('user');

    const deviceUid = user ? JSON.parse(user).deviceUid : null;

    if (refreshToken && deviceUid) {
      await authService.logout({
        refreshToken,
        deviceUid,
      });
    }
  } catch (error) {
    console.error('Logout API error:', error);
  } finally {
    // luôn clear local
    localStorage.clear();
    window.location.href = '/login';
  }
};