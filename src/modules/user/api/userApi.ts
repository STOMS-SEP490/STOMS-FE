import axiosClient from '@/shared/lib/axios';
import type { PaginationResponse } from '@/shared/types/api';
import type { User } from '@/modules/user/user';

export type UserFilterParams = {
  pageNumber?: number;
  pageSize?: number;
  UserId?: number;
  Email?: string;
  IsActive?: boolean;
  RoleId?: number;
};

const userService = {
  getUsers: async (params: UserFilterParams): Promise<PaginationResponse<User>> => {
    return axiosClient.get('/users/filter', { params });
  },

  getUserById: async (id: number): Promise<User> => {
    return axiosClient.get(`/users/${id}`);
  },

  activateUser: async (userId: number) => {
    return axiosClient.put(`/users/${userId}/activate`);
  },

  deactivateUser: async (userId: number) => {
    return axiosClient.put(`/users/${userId}/deactivate`);
  },

  /**
   * PUT api/users/assign-role
   * Gán 1 role cho nhiều user (admin).
   */
  assignRole: async (payload: { roleId: number; userIds: number[] }) => {
    return axiosClient.put(`/users/assign-role`, {
      RoleId: payload.roleId,
      UserIds: payload.userIds,
    });
  },

  /** Đặt lại mật khẩu user (admin). PUT api/users/{id}/change-password */
  changePassword: async (userId: number, newPassword: string) => {
    return axiosClient.put(`/users/${userId}/change-password`, { newPassword });
  },

  /** User đổi mật khẩu (trang hồ sơ). PUT api/users/change-password */
  changeOwnPassword: async (payload: {
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    return axiosClient.put('/users/change-password', payload);
  },

  createUser: async (payload: {
    email: string;
    passwordHash: string;
    isActive: boolean;
    roleId: number;
  }): Promise<{ userId: number }> => {
    return axiosClient.post('/users', payload);
  },

  createUsersBulk: async (payload: { quantity: number; roleId: number; emails: string[] }) => {
    const { roleId, emails } = payload;
    return axiosClient.post('/users/bulk', {
      roleId,
      users: emails.map((email) => ({ email })),
    });
  },
};

export default userService;
