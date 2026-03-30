import axiosClient from '@/shared/lib/axios';
import type { PaginationResponse } from '@/shared/types/api';
import type {
  Team,
  TeamDetail,
  TeamFilterParams,
  TeamCreatePayload,
  TeamUpdatePayload,
  TeamMemberItem,
  TeamTopicItem,
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

/**
 * GET /teams/:id trả TeamDetailResponse: topics + members; có thể không có createdAt/updatedAt/teamTopics.
 * Chuẩn hóa về Team (camelCase) và suy ra teamTopics từ topics khi cần.
 */
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
      isActive: true,
      createdAt: '',
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

  getTeamByMember: async (memberId: number): Promise<TeamDetail> => {
    return axiosClient.get(`/teams/member/${memberId}`);
  },
};
