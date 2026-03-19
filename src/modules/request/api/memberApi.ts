import axiosClient from '@/shared/lib/axios';
import type { MemberDetail } from './type';

const mapMemberDetail = (raw: Record<string, unknown>): MemberDetail => {
  const userRaw = (raw['user'] ?? raw['User']) as Record<string, unknown> | undefined;
  return {
    memberId: Number(raw['memberId'] ?? raw['MemberId'] ?? 0),
    teamId:
      (raw['teamId'] ?? raw['TeamId']) != null ? Number(raw['teamId'] ?? raw['TeamId']) : null,
    fullName: String(raw['fullName'] ?? raw['FullName'] ?? ''),
    avatarUrl: raw['avatarUrl'] != null ? String(raw['avatarUrl']) : raw['AvatarUrl'] != null ? String(raw['AvatarUrl']) : '',
    phone: raw['phone'] != null ? String(raw['phone']) : raw['Phone'] != null ? String(raw['Phone']) : undefined,
    userEmail: userRaw?.email != null ? String(userRaw.email) : userRaw?.Email != null ? String(userRaw.Email) : undefined,
  };
};

const memberApi = {
  getById: async (id: number): Promise<MemberDetail> => {
    const res = await axiosClient.get(`/members/${id}`);
    const raw = (res as unknown as Record<string, unknown>) ?? {};
    return mapMemberDetail(raw);
  },
};

export default memberApi;
