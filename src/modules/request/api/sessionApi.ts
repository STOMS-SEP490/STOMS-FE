import axiosClient from '@/shared/lib/axios';
import type { Team } from '@/modules/team/team';

export type SessionDetail = {
  sessionId: number;
  requestId: number;
  sessionNo: number;
  startAt: string;
  endAt: string;
  notes: string;
  status: string;
  location: string;
  isOnline: boolean | null;
  teachersRequired?: number | null;
  tasRequired?: number | null;
  assignments?: {
    assignmentId: number;
    staffRole: string;
    staffMemberId: number;
    staffMember?: {
      memberId: number;
      fullName: string;
      avatarUrl: string;
      userEmail?: string;
    } | null;
  }[] | null;
};

export const sessionApi = {
  suggestTeams: async (sessionId: number): Promise<Team[]> => {
    const is404 = (err: unknown) => {
      if (!err || typeof err !== 'object') return false;
      const anyErr = err as any;
      return (
        anyErr?.status === 404 ||
        anyErr?.statusCode === 404 ||
        anyErr?.response?.status === 404 ||
        anyErr?.response?.statusCode === 404
      );
    };

    const attempts: Array<() => Promise<Team[]>> = [
      () => axiosClient.get(`/sessions/${sessionId}/team-suggestions`),
      () => axiosClient.get('/sessions/suggest-team', { params: { sessionId } }),
      () => axiosClient.get('/sessions/suggest-teams', { params: { sessionId } }),
      () => axiosClient.get(`/sessions/${sessionId}/suggest-team`),
      () => axiosClient.get(`/sessions/${sessionId}/suggest-teams`),
    ];

    let lastErr: unknown;
    for (const run of attempts) {
      try {
        return await run();
      } catch (err) {
        lastErr = err;
        if (!is404(err)) break;
      }
    }
    throw lastErr;
  },

  getById: async (id: number): Promise<SessionDetail> => {
    const res = await axiosClient.get('/sessions/' + id);
    const raw: any = res ?? {};
    const assignmentsRaw: any[] = raw.assignments ?? raw.Assignments ?? [];
    return {
      sessionId: Number(raw.sessionId ?? raw.SessionId ?? 0),
      requestId: Number(raw.requestId ?? raw.RequestId ?? 0),
      sessionNo: Number(raw.sessionNo ?? raw.SessionNo ?? 0),
      startAt: String(raw.startAt ?? raw.StartAt ?? ''),
      endAt: String(raw.endAt ?? raw.EndAt ?? ''),
      notes: String(raw.notes ?? raw.Notes ?? ''),
      status: String(raw.status ?? raw.Status ?? ''),
      location: String(raw.location ?? raw.Location ?? ''),
      isOnline:
        raw.isOnline !== undefined
          ? Boolean(raw.isOnline)
          : raw.IsOnline !== undefined
            ? Boolean(raw.IsOnline)
            : null,
      teachersRequired:
        raw.teachersRequired != null || raw.TeachersRequired != null
          ? Number(raw.teachersRequired ?? raw.TeachersRequired)
          : null,
      tasRequired:
        raw.tasRequired != null || raw.TasRequired != null
          ? Number(raw.tasRequired ?? raw.TasRequired)
          : null,
      assignments: assignmentsRaw?.length
        ? assignmentsRaw.map((a) => {
            const staff = a.staffMember ?? a.StaffMember ?? null;
            const staffUser = staff?.user ?? staff?.User ?? null;
            return {
              assignmentId: Number(a.assignmentId ?? a.AssignmentId ?? 0),
              staffRole: String(a.staffRole ?? a.StaffRole ?? ''),
              staffMemberId: Number(a.staffMemberId ?? a.StaffMemberId ?? 0),
              staffMember: staff
                ? {
                    memberId: Number(staff.memberId ?? staff.MemberId ?? 0),
                    fullName: String(staff.fullName ?? staff.FullName ?? ''),
                    avatarUrl: String(staff.avatarUrl ?? staff.AvatarUrl ?? ''),
                    userEmail: staffUser?.email ?? staffUser?.Email,
                  }
                : null,
            };
          })
        : null,
    };
  },
};

