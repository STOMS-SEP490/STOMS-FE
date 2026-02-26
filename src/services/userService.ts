import axiosClient from '@/lib/axios';
import type { PaginationResponse } from '@/types/api';
import type { Member, MemberDetail, UpdateUserPayload, User } from '@/types/user';

export type MemberFilterParams = {
  pageNumber?: number;
  pageSize?: number;
  MemberId?: number;
  TeamId?: number;
  FullName?: string;
};

const userService = {
  getUsers: async (params: MemberFilterParams): Promise<PaginationResponse<User>> => {
    return axiosClient.get('/users/filter', { params });
  },

  getMembers: async (params: MemberFilterParams): Promise<PaginationResponse<Member>> => {
    return axiosClient.get('/members/filter', { params });
  },

  getMemberById: async (id: number): Promise<MemberDetail> => {
    return await axiosClient.get(`/members/${id}`);
  },

  updateUser: async (userId: number, payload: UpdateUserPayload) => {
    return axiosClient.put(`/users/${userId}`, payload);
  },

  updateMemberExtra: async (
    memberId: number,
    data: {
      teamId?: number;
      skills?: string[];
    }
  ) => {
    return axiosClient.put(`/members/${memberId}`, data);
  },

  createUser: async (payload: {
    email: string;
    passwordHash: string;
    isActive: boolean;
    roleId: number;
  }) => {
    return axiosClient.post('/users', payload);
  },

  createUsersBulk: async (payload: { quantity: number; roleId: number; emails: string[] }) => {
    return axiosClient.post('/users/bulk', payload);
  },

  createMember: async (payload: {
    userId: number;
    fullName: string;
    teamId?: number;
    avatarUrl?: string;
  }) => {
    return axiosClient.post('/members', payload);
  },
};

export default userService;
