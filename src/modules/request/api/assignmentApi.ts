import axiosClient from '@/shared/lib/axios';
import type {
  AssignmentDetail,
  SuggestedStaff,
} from './type';

const assignmentApi = {
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

  approve: async (ids: number[]): Promise<void> => {
    if (!ids.length) return;
    await axiosClient.put('/assignments/approve', {
      assignmentIds: ids,
    });
  },

  assignMembers: async (items: { assignmentId: number; staffMemberId: number }[]): Promise<void> => {
    if (!items.length) return;
    await axiosClient.put('/assignments/assign-members', {
      // BE expects: { Items: [{ AssignmentId, StaffMemberId }] }
      Items: items.map((i) => ({
        AssignmentId: i.assignmentId,
        StaffMemberId: i.staffMemberId,
      })),
    });
  },

  reject: async (assignmentId: number, reason: string): Promise<void> => {
    await axiosClient.put('/assignments/reject', {
      assignmentId,
      reason,
    });
  },

  suggestStaff: async (assignmentId: number): Promise<SuggestedStaff[]> => {
    const res = await axiosClient.get(`/assignments/${assignmentId}/suggest-staff`);
    const items: any[] = ((res as any)?.data ?? res ?? []) as any[];
    return items.map((raw) => {
      const skillsRaw = raw.skills ?? raw.Skills ?? [];
      const skills = Array.isArray(skillsRaw)
        ? skillsRaw.map((s: any) => ({
            skillId: Number(s.skillId ?? s.SkillId ?? 0),
            skillName: String(s.skillName ?? s.SkillName ?? ''),
          }))
        : undefined;
      return {
        memberId: Number(raw.memberId ?? raw.MemberId ?? 0),
        userId: Number(raw.userId ?? raw.UserId ?? 0),
        fullName: String(raw.fullName ?? raw.FullName ?? ''),
        roleName: String(raw.roleName ?? raw.RoleName ?? ''),
        email: raw.email != null ? String(raw.email) : raw.Email != null ? String(raw.Email) : undefined,
        avatarUrl: String(raw.avatarUrl ?? raw.AvatarUrl ?? ''),
        skills,
        skillMatchCount: Number(raw.skillMatchCount ?? raw.SkillMatchCount ?? 0),
        assignmentCountIn30Days: Number(
          raw.assignmentCountIn30Days ?? raw.AssignmentCountIn30Days ?? 0
        ),
      };
    });
  },
};

export default assignmentApi;

