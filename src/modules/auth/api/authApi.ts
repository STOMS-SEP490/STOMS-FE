// src/services/authService.ts
import axiosClient from '@/shared/lib/axios';
import type {
  AuthTokensResponse,
  LoginRequest,
  LoginResponse,
} from '@/modules/auth/authStorage';

const authService = {
  login: (data: LoginRequest): Promise<LoginResponse> => {
    return axiosClient.post('/auth/login', data);
  },
  refresh: (data: {
    refreshToken: string;
    deviceUid: string;
  }): Promise<AuthTokensResponse> => {
    return axiosClient.post('/auth/refresh', data);
  },
  logout: (data: { refreshToken: string; deviceUid: string }) => {
    return axiosClient.post('/auth/logout', data);
  },
  /** Admin reset mật khẩu user (Role 1). PUT api/auth/reset-password */
  resetPassword: (data: { email: string; newPassword: string }) => {
    return axiosClient.put('/auth/reset-password', data);
  },
  requestForgotPasswordOtp: async (email: string) => {
    return axiosClient.post('/auth/forgot-password/request-otp', {
      email,
    });
  },

  /** Bước 2: xác thực OTP (chỉ verify, chưa đổi mật khẩu). */
  verifyForgotPasswordOtp: async (data: { email: string; otp: string }) => {
    return axiosClient.post('/auth/forgot-password/otp-verifications', data);
  },

  /** Bước 3: hoàn tất đặt lại mật khẩu sau khi OTP đã được verify. */
  completeForgotPassword: async (data: {
    email: string;
    otp: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    return axiosClient.post('/auth/forgot-password/completions', data);
  },
};

export default authService;