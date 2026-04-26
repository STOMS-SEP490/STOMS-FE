// src/utils/logout.ts

import axios from 'axios';

export const logout = async () => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    const accessToken = localStorage.getItem('accessToken');
    const user = localStorage.getItem('user');
    const deviceUid = user ? JSON.parse(user).deviceUid : null;

    if (refreshToken && deviceUid) {
      // Dùng axios trực tiếp, bypass interceptor để tránh vòng lặp refresh
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/auth/logout`,
        { refreshToken, deviceUid },
        { headers: { Authorization: `Bearer ${accessToken ?? ''}` } }
      );
    }
  } catch (error) {
    // 401 hoặc lỗi khác đều bỏ qua — clear local là đủ
    console.error('Logout API error:', error);
  } finally {
    localStorage.clear();
  }
};