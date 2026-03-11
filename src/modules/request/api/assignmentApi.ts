import axiosClient from '@/shared/lib/axios';

export type AssignmentDetail = {
  assignmentId: number;
  sessionId: number;
  staffMemberId: number;
  staffRole: string;
  status: string;
  staffMember?: {
    memberId: number;
    fullName: string;
    avatarUrl: string;
    userEmail?: string;
  } | null;
};

export const assignmentApi = {
  getById: async (id: number): Promise<AssignmentDetail> => {
    const res = await axiosClient.get(`/assignments/${id}`);
    const raw: any = res ?? {};
    const staff = raw.staffMember ?? raw.StaffMember ?? null;
    const staffUser = staff?.user ?? staff?.User ?? null;
    return {
      assignmentId: Number(raw.assignmentId ?? raw.AssignmentId ?? 0),
      sessionId: Number(raw.sessionId ?? raw.SessionId ?? 0),
      staffMemberId: Number(raw.staffMemberId ?? raw.StaffMemberId ?? 0),
      staffRole: String(raw.staffRole ?? raw.StaffRole ?? ''),
      status: String(raw.status ?? raw.Status ?? ''),
      staffMember: staff
        ? {
            memberId: Number(staff.memberId ?? staff.MemberId ?? 0),
            fullName: String(staff.fullName ?? staff.FullName ?? ''),
            avatarUrl: String(staff.avatarUrl ?? staff.AvatarUrl ?? ''),
            userEmail: staffUser?.email ?? staffUser?.Email,
          }
        : null,
    };
  },
};

export default assignmentApi;

