import axiosClient from '@/shared/lib/axios';
import type { PaginationResponse } from '@/shared/types/api';
import type { Member, MemberDetail } from '@/modules/member/member';

export type MemberFilterParams = {
  pageNumber?: number;
  pageSize?: number;
  MemberId?: number;
  TeamId?: number;
  FullName?: string;
  RoleId?: number;
};

const memberApi = {
  getMembers: async (params: MemberFilterParams): Promise<PaginationResponse<Member>> => {
    return axiosClient.get('/members/filter', { params });
  },

  getMemberById: async (id: number): Promise<MemberDetail> => {
    return axiosClient.get(`/members/${id}`);
  },

  assignMemberRole: async (memberId: number, roleId: number) => {
    return axiosClient.put(`/members/${memberId}/role`, { RoleId: roleId });
  },

  uploadAvatar: async (memberId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosClient.put(`/members/${memberId}/avatar`, formData, {
      // Để axios/browsers tự set boundary của multipart/form-data
    });
  },

  updateMember: async (
    memberId: number,
    data: {
      teamId: number;
      fullName: string;
      phone: string;
      address: string;
      cin: string;
      bankCode: string;
      bankName: string;
      taxNumber: string;
      avatarUrl?: string;
    }
  ) => {
    return axiosClient.put(`/members/${memberId}`, data);
  },

  /**
   * PUT api/members (member update theo token)
   * - Backend: [FromForm] MemberUpdateRequest + IFormFile? avatarFile
   * - FE phải gửi multipart/form-data, gửi đủ các field bắt buộc.
   */
  updateMyMember: async (data: {
    fullName: string;
    phone: string;
    address: string;
    cin: string;
    bankCode: string;
    bankName: string;
    taxNumber?: string | null;
    avatarFile?: File | null;
  }): Promise<MemberDetail> => {
    const formData = new FormData();
    formData.append('FullName', data.fullName);
    formData.append('Phone', data.phone);
    formData.append('Address', data.address);
    formData.append('Cin', data.cin);
    formData.append('BankCode', data.bankCode);
    formData.append('BankName', data.bankName);

    // TaxNumber không required: để null thì không append để model binder set null
    if (data.taxNumber != null) {
      formData.append('TaxNumber', data.taxNumber ?? '');
    }

    // Param tên file phải là "avatarFile" vì controller: Update([FromForm] ..., IFormFile? avatarFile)
    if (data.avatarFile) {
      formData.append('avatarFile', data.avatarFile);
    }

    return axiosClient.put('/members', formData);
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

  createMember: async (payload: {
    userId: number;
    fullName: string;
    teamId: number;
    avatarUrl?: string;
    phone?: string;
    address?: string;
    cin?: string;
    bankCode?: string;
    bankName?: string;
    taxNumber?: string;
  }) => {
    return axiosClient.post('/members', {
      userId: payload.userId,
      fullName: payload.fullName,
      teamId: payload.teamId,
      avatarUrl: payload.avatarUrl ?? undefined,
      phone: payload.phone ?? '',
      address: payload.address ?? '',
      cin: payload.cin ?? '',
      bankCode: payload.bankCode ?? '',
      bankName: payload.bankName ?? '',
      taxNumber: payload.taxNumber ?? '',
    });
  },

  /** POST /members (admin) — tạo member + user từ email */
  createMemberAdmin: async (payload: {
    email: string;
    fullName: string;
    roleId: number;
    phone?: string;
    address?: string;
    cin?: string;
    bankCode?: string;
    bankName?: string;
    taxNumber?: string;
  }) => {
    return axiosClient.post('/members', {
      Email: payload.email,
      FullName: payload.fullName,
      RoleId: payload.roleId,
      Phone: payload.phone ?? null,
      Address: payload.address ?? null,
      Cin: payload.cin ?? null,
      BankCode: payload.bankCode ?? null,
      BankName: payload.bankName ?? null,
      TaxNumber: payload.taxNumber ?? null,
    });
  },
};

export default memberApi;
