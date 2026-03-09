// src/services/authService.ts
import axiosClient from '@/shared/lib/axios';
import type { LoginRequest, LoginResponse } from '@/modules/auth/authStorage';



const authService = {
  login: (data: LoginRequest): Promise<LoginResponse> => {
    return axiosClient.post('/auth/login', data);
  },
  logout: (data: { refreshToken: string; deviceUid: string }) => {
    return axiosClient.post('/auth/logout', data);
  },
  changePassword: (data: { currentPassword: string; newPassword: string }) => {
    return axiosClient.put('/auth/change-password', data);
  },
  requestForgotPasswordOtp: async (email: string) => {
    return axiosClient.post('/auth/forgot-password/request-otp', {
      email,
    });
  },

  confirmForgotPassword: async (data: {
    email: string;
    otp: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    return axiosClient.post('/auth/forgot-password/confirm', data);
  },
};

export default authService;