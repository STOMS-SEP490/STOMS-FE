import axiosClient from '@/shared/lib/axios';
import type {
  AuthTokensResponse,
  LoginApiResponse,
  LoginRequest,
  LoginResponse,
  SelectRoleRequest,
  SwitchRoleRequest,
  SwitchRoleResponse,
} from '@/modules/auth/authStorage';

const authService = {
  login: (data: LoginRequest): Promise<LoginApiResponse> => {
    return axiosClient.post('/auth/login', data);
  },

  selectRole: (data: SelectRoleRequest): Promise<LoginResponse> => {
    return axiosClient.post('/auth/select-role', data);
  },

  switchRole: (data: SwitchRoleRequest): Promise<SwitchRoleResponse> => {
    return axiosClient.post('/auth/switch-role', data);
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

  resetPassword: (data: { email: string; newPassword: string }) => {
    return axiosClient.put('/auth/reset-password', data);
  },

  requestForgotPasswordOtp: (email: string) => {
    return axiosClient.post('/auth/forgot-password/request-otp', { email });
  },

  verifyForgotPasswordOtp: (data: { email: string; otp: string }) => {
    return axiosClient.post<
      | { resetToken?: string; ResetToken?: string }
      | Record<string, unknown>
    >('/auth/forgot-password/otp-verifications', data);
  },

  completeForgotPassword: (data: {
    resetToken: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    return axiosClient.post('/auth/forgot-password/completions', data);
  },
};

export default authService;
