import { isAxiosError } from 'axios';
import axiosClient from '@/shared/lib/axios';
import type { PaginationResponse } from '@/shared/types/api';
import memberApi from '@/modules/member/api/memberApi';
import type { Member } from '@/modules/member/member';
import type {
  Team,
  TeamDetail,
  TeamFilterParams,
  TeamCreatePayload,
  TeamUpdatePayload,
  TeamMemberItem,
  TeamTopicItem,
  MemberSkillItem,
} from '../team';

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function str(v: unknown): string {
  if (v == null || v === '') return '';
  return String(v);
}

function optStr(v: unknown): string | null | undefined {
  if (v == null || v === '') return undefined;
  return String(v);
}

function normalizeSkills(raw: unknown): MemberSkillItem[] | undefined {
  const arr = Array.isArray(raw) ? raw : [];
  if (!arr.length) return undefined;
  return arr.map((s) => {
    const x = (s ?? {}) as Record<string, unknown>;
    return {
      skillId: num(x.skillId ?? x.SkillId),
      skillName: str(x.skillName ?? x.SkillName),
      isActive: Boolean(x.isActive ?? x.IsActive ?? true),
    };
  });
}

function mapMemberToTeamItem(m: Member): TeamMemberItem {
  return {
    memberId: m.memberId,
    userId: m.userId,
    roleId: m.roleId,
    teamId: m.teamId ?? null,
    avatarUrl: m.avatarUrl,
    fullName: m.fullName,
    phone: m.phone || null,
    address: m.address || null,
    cin: m.cin || null,
    bankCode: m.bankCode || null,
    bankName: m.bankName || null,
    taxNumber: m.taxNumber ?? null,
    email: m.email || '',
    skills: normalizeSkills(m.skills),
  };
}

function teamRecordToDetail(t: Team): TeamDetail {
  return {
    teamId: t.teamId,
    teamName: t.teamName,
    members: t.members ?? [],
    topics: t.topics ?? [],
    leaderMemberId: t.leaderMemberId,
    leaderMemberName: t.leaderMemberName,
    createdAt: t.createdAt ?? null,
    updatedAt: t.updatedAt ?? null,
  };
}

function normalizeTeamDetail(raw: Record<string, unknown>): Team {
  const teamId = num(raw.teamId ?? raw.TeamId);
  const topicsRaw = (raw.topics ?? raw.Topics) as unknown[] | undefined;
  const membersRaw = (raw.members ?? raw.Members) as unknown[] | undefined;
  const teamTopicsRaw = (raw.teamTopics ?? raw.TeamTopics) as unknown[] | undefined;

  const topics: TeamTopicItem[] | undefined = topicsRaw?.length
    ? topicsRaw.map((t) => {
        const tr = (t ?? {}) as Record<string, unknown>;
        return {
          topicId: num(tr.topicId ?? tr.TopicId),
          topicName: str(tr.topicName ?? tr.TopicName),
          isActive: tr.isActive != null ? Boolean(tr.isActive ?? tr.IsActive) : undefined,
          createdAt: optStr(tr.createdAt ?? tr.CreatedAt) ?? null,
        };
      })
    : undefined;

  const members: TeamMemberItem[] | undefined = membersRaw?.length
    ? membersRaw.map((m) => {
        const mr = (m ?? {}) as Record<string, unknown>;
        return {
          memberId: num(mr.memberId ?? mr.MemberId),
          userId: num(mr.userId ?? mr.UserId),
          roleId: num(mr.roleId ?? mr.RoleId),
          teamId:
            mr.teamId != null
              ? num(mr.teamId)
              : mr.TeamId != null
                ? num(mr.TeamId)
                : null,
          avatarUrl: (mr.avatarUrl ?? mr.AvatarUrl) as string | null,
          fullName: str(mr.fullName ?? mr.FullName),
          phone: optStr(mr.phone ?? mr.Phone) ?? null,
          address: optStr(mr.address ?? mr.Address) ?? null,
          cin: optStr(mr.cin ?? mr.Cin) ?? null,
          bankCode: optStr(mr.bankCode ?? mr.BankCode) ?? null,
          bankName: optStr(mr.bankName ?? mr.BankName) ?? null,
          taxNumber: optStr(mr.taxNumber ?? mr.TaxNumber) ?? null,
          email: str(mr.email ?? mr.Email),
          skills: normalizeSkills(mr.skills ?? mr.Skills),
        };
      })
    : undefined;

  let teamTopics = teamTopicsRaw?.length
    ? teamTopicsRaw.map((tt) => {
        const x = (tt ?? {}) as Record<string, unknown>;
        return {
          teamId: num(x.teamId ?? x.TeamId ?? teamId),
          topicId: num(x.topicId ?? x.TopicId),
          topicName: optStr(x.topicName ?? x.TopicName),
          isActive: (x.isActive ?? x.IsActive) as boolean | undefined,
          createdAt: str(x.createdAt ?? x.CreatedAt ?? ''),
        };
      })
    : undefined;

  if (!teamTopics?.length && topics?.length) {
    teamTopics = topics.map((t) => ({
      teamId,
      topicId: t.topicId,
      topicName: t.topicName,
      // Giữ đúng trạng thái từ BE (trước đây luôn true → Switch trong EditTeamModal sai)
      isActive: t.isActive !== false,
      createdAt: t.createdAt ?? '',
    }));
  }

  return {
    teamId,
    teamName: str(raw.teamName ?? raw.TeamName),
    createdAt: optStr(raw.createdAt ?? raw.CreatedAt),
    updatedAt: optStr(raw.updatedAt ?? raw.UpdatedAt),
    leaderMemberId:
      raw.leaderMemberId != null
        ? num(raw.leaderMemberId)
        : raw.LeaderMemberId != null
          ? num(raw.LeaderMemberId)
          : null,
    leaderMemberName: optStr(raw.leaderMemberName ?? raw.LeaderMemberName) ?? null,
    teamSessions: raw.teamSessions as Team['teamSessions'],
    teamTopics,
    topics,
    members,
  };
}

export const teamApi = {
  getTeams: async (params?: TeamFilterParams): Promise<PaginationResponse<Team>> => {
    return axiosClient.get('/teams/filter', { params });
  },

  getById: async (id: number): Promise<Team> => {
    const raw = (await axiosClient.get(`/teams/${id}`)) as Record<string, unknown>;
    return normalizeTeamDetail(raw);
  },

  create: async (data: TeamCreatePayload): Promise<Team> => {
    return axiosClient.post('/teams', data);
  },

  update: async (id: number, data: TeamUpdatePayload): Promise<Team> => {
    return axiosClient.put(`/teams/${id}`, data);
  },

  remove: async (id: number): Promise<void> => {
    await axiosClient.delete(`/teams/${id}`);
  },

  assignLeader: async (teamId: number, leaderMemberId: number): Promise<Team> => {
    return axiosClient.put(`/teams/${teamId}/leader`, { leaderMemberId });
  },

  addMembers: async (teamId: number, memberIds: number[]): Promise<void> => {
    await axiosClient.post('/team-members', { teamId, memberIds });
  },

  removeMembers: async (memberIds: number[]): Promise<void> => {
    await axiosClient.delete('/team-members', { data: { memberIds } });
  },

  addTopicsBulk: async (teamId: number, topicIds: number[]): Promise<void> => {
    await axiosClient.post('/team-topics/bulk', { teamId, topicIds });
  },

  removeTopicsBulk: async (teamId: number, topicIds: number[]): Promise<void> => {
    await axiosClient.delete(`/team-topics/team/${teamId}/topics`, { data: { topicIds } });
  },

  activateTopicsMany: async (teamId: number, topicIds: number[]): Promise<void> => {
    await axiosClient.put(`/team-topics/team/${teamId}/topics/activate`, { topicIds });
  },

  deactivateTopicsMany: async (teamId: number, topicIds: number[]): Promise<void> => {
    await axiosClient.put(`/team-topics/team/${teamId}/topics/deactivate`, { topicIds });
  },

  /** @deprecated BE không còn route này — dùng loadMyTeamDetail */
  getTeamByMember: async (memberId: number): Promise<TeamDetail> => {
    return axiosClient.get(`/teams/member/${memberId}`);
  },

  /** GET /teams/my-team → TeamDetailResponse (đã chuẩn hóa skills/topics). */
  getMyTeam: async (): Promise<TeamDetail> => {
    const raw = (await axiosClient.get('/teams/my-team')) as Record<string, unknown>;
    return teamRecordToDetail(normalizeTeamDetail(raw));
  },

  /**
   * Ưu tiên GET /teams/my-team; nếu 403 (vd: Trưởng nhóm) hoặc 404 thì gom nhóm qua members/filter + teams/filter.
   */
  loadMyTeamDetail: async (memberId: number): Promise<TeamDetail | null> => {
    if (!memberId) return null;

    try {
      const raw = (await axiosClient.get('/teams/my-team')) as Record<string, unknown>;
      return teamRecordToDetail(normalizeTeamDetail(raw));
    } catch (e) {
      if (!isAxiosError(e)) throw e;
      const st = e.response?.status;
      if (st === 401) throw e;
      if (st != null && st >= 500) throw e;
    }

    const me = await memberApi.getMemberById(memberId);
    const tid = me.teamId;
    if (tid == null || !Number.isFinite(Number(tid))) return null;

    const [membersPage, teamPageRes] = await Promise.all([
      memberApi.getMembers({ TeamId: tid, pageNumber: 1, pageSize: 500 }),
      axiosClient.get('/teams/filter', {
        params: { teamId: tid, pageNumber: 1, pageSize: 1 },
      }) as Promise<PaginationResponse<Team>>,
    ]);

    const teamRow = teamPageRes.items?.[0];
    const teamName =
      (teamRow?.teamName && String(teamRow.teamName).trim()) ||
      (me.team?.teamName && String(me.team.teamName).trim()) ||
      `Nhóm #${tid}`;

    const ttRaw = teamRow?.teamTopics as unknown[] | undefined;
    const topics: TeamTopicItem[] = Array.isArray(ttRaw)
      ? ttRaw.map((item) => {
          const tt = (item ?? {}) as Record<string, unknown>;
          return {
            topicId: num(tt.topicId ?? tt.TopicId),
            topicName: str(tt.topicName ?? tt.TopicName),
            isActive: tt.isActive != null ? Boolean(tt.isActive ?? tt.IsActive) : true,
            createdAt: optStr(tt.createdAt ?? tt.CreatedAt) ?? null,
          };
        })
      : [];

    const members: TeamMemberItem[] = (membersPage.items ?? []).map((m) => mapMemberToTeamItem(m));

    return {
      teamId: Number(tid),
      teamName,
      members,
      topics,
      leaderMemberId: teamRow?.leaderMemberId ?? me.team?.leaderMemberId ?? null,
      leaderMemberName: teamRow?.leaderMemberName ?? me.team?.leaderMemberName ?? null,
      createdAt: teamRow?.createdAt ?? me.team?.createdAt ?? null,
      updatedAt: teamRow?.updatedAt ?? me.team?.updatedAt ?? null,
    };
  },
};
