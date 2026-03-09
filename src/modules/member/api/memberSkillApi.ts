import axiosClient from '@/shared/lib/axios';
import type { PaginationResponse } from '@/shared/types/api';

export type MemberSkillItem = {
  memberId: number;
  skillId: number;
  isActive: boolean;
  createdAt?: string | null;
};

const memberSkillApi = {
  /** Lấy danh sách skill của member (GET api/member-skills/filter?memberId=...) */
  getByMember: async (memberId: number): Promise<MemberSkillItem[]> => {
    const res = await axiosClient.get<PaginationResponse<MemberSkillItem>>('/member-skills/filter', {
      params: { memberId, pageNumber: 1, pageSize: 500 },
    });
    const data = res as unknown as PaginationResponse<MemberSkillItem>;
    return data?.items ?? [];
  },

  /** Gán nhiều skill cho member (POST api/member-skills/bulk). Chỉ thêm skill chưa có. */
  assignBulk: async (memberId: number, skillIds: number[]) => {
    return axiosClient.post<MemberSkillItem[]>('/member-skills/bulk', { memberId, skillIds });
  },

  /** Gỡ một skill khỏi member (DELETE api/member-skills/{memberId}/{skillId}) */
  remove: async (memberId: number, skillId: number) => {
    return axiosClient.delete(`/member-skills/${memberId}/${skillId}`);
  },
};

export default memberSkillApi;
