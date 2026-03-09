import axiosClient from '@/shared/lib/axios';
import type { PaginationResponse } from '@/shared/types/api';
import type { Team, TeamSession, TeamTopic } from '../team';

/** BE trả PascalCase (TeamId, TeamName, ...). Chuẩn hóa sang camelCase cho FE. */
function mapTeamFromApi(raw: Record<string, unknown>): Team {
  const arr = (camel: string, pascal: string) => {
    const a = raw[camel] ?? raw[pascal];
    return Array.isArray(a) ? a : [];
  };
  return {
    teamId: Number(raw['teamId'] ?? raw['TeamId']),
    teamName: String(raw['teamName'] ?? raw['TeamName'] ?? ''),
    createdAt: raw['createdAt'] ?? raw['CreatedAt'] ?? null,
    updatedAt: raw['updatedAt'] ?? raw['UpdatedAt'] ?? null,
    leaderMemberId: raw['leaderMemberId'] ?? raw['LeaderMemberId'] ?? null,
    leaderMemberName: raw['leaderMemberName'] ?? raw['LeaderMemberName'] ?? null,
    teamSessions: arr('teamSessions', 'TeamSessions').map((x) => mapTeamSessionFromApi((x ?? {}) as Record<string, unknown>)),
    teamTopics: arr('teamTopics', 'TeamTopics').map((x) => mapTeamTopicFromApi((x ?? {}) as Record<string, unknown>)),
  };
}

function mapTeamSessionFromApi(raw: Record<string, unknown>): TeamSession {
  return {
    teamSessionId: Number(raw['teamSessionId'] ?? raw['TeamSessionId'] ?? 0),
    teamId: Number(raw['teamId'] ?? raw['TeamId']),
    sessionId: Number(raw['sessionId'] ?? raw['SessionId']),
    teachersRequired: Number(raw['teachersRequired'] ?? raw['TeachersRequired'] ?? 0),
    tasRequired: Number(raw['tasRequired'] ?? raw['TasRequired'] ?? 0),
  };
}

function mapTeamTopicFromApi(raw: Record<string, unknown>): TeamTopic {
  return {
    teamId: Number(raw['teamId'] ?? raw['TeamId']),
    topicId: Number(raw['topicId'] ?? raw['TopicId']),
    createdAt: raw['createdAt'] != null || raw['CreatedAt'] != null
      ? String(raw['createdAt'] ?? raw['CreatedAt'])
      : '',
  };
}

/** BE PagedResponse: PageNumber, PageSize, TotalItems, TotalPages, Items (PascalCase). */
function mapPagedFromApi<T>(raw: Record<string, unknown>, mapItem: (x: Record<string, unknown>) => T): PaginationResponse<T> {
  const items = (raw['items'] ?? raw['Items']) as unknown[] | undefined ?? [];
  return {
    pageNumber: Number(raw['pageNumber'] ?? raw['PageNumber'] ?? 1),
    pageSize: Number(raw['pageSize'] ?? raw['PageSize'] ?? 10),
    totalItems: Number(raw['totalItems'] ?? raw['TotalItems'] ?? 0),
    totalPages: Number(raw['totalPages'] ?? raw['TotalPages'] ?? 0),
    items: items.map((x) => mapItem((x ?? {}) as Record<string, unknown>)),
  };
}

export type TeamFilterParams = {
  pageNumber?: number;
  pageSize?: number;
  teamId?: number;
  teamName?: string;
  leaderMemberId?: number;
};

export type TeamCreatePayload = {
  teamName: string;
  leaderMemberId?: number;
};

export type TeamUpdatePayload = {
  teamName: string;
  leaderMemberId?: number;
};

export const teamApi = {
  /** GET api/teams/filter - BE: TeamFilterRequest (PageNumber, PageSize, TeamName, ...) */
  getTeams: async (params?: TeamFilterParams): Promise<PaginationResponse<Team>> => {
    const res = await axiosClient.get<Record<string, unknown>>('/teams/filter', { params });
    return mapPagedFromApi(res ?? {}, mapTeamFromApi);
  },

  /** GET api/teams/:id */
  getById: async (id: number): Promise<Team> => {
    const res = await axiosClient.get<Record<string, unknown>>(`/teams/${id}`);
    return mapTeamFromApi((res ?? {}) as Record<string, unknown>);
  },

  /** POST api/teams - BE: TeamCreateRequest { TeamName, LeaderMemberId? } */
  create: async (data: TeamCreatePayload): Promise<Team> => {
    const body = { TeamName: data.teamName, LeaderMemberId: data.leaderMemberId };
    const res = await axiosClient.post<Record<string, unknown>>('/teams', body);
    return mapTeamFromApi((res ?? {}) as Record<string, unknown>);
  },

  /** PUT api/teams/:id - BE: TeamUpdateRequest { TeamName, LeaderMemberId? } */
  update: async (id: number, data: TeamUpdatePayload): Promise<Team> => {
    const body = { TeamName: data.teamName, LeaderMemberId: data.leaderMemberId };
    const res = await axiosClient.put<Record<string, unknown>>(`/teams/${id}`, body);
    return mapTeamFromApi((res ?? {}) as Record<string, unknown>);
  },

  /** DELETE api/teams/:id */
  remove: async (id: number): Promise<void> => {
    await axiosClient.delete(`/teams/${id}`);
  },

  /** PUT api/teams/:id/leader - BE: TeamLeaderAssignRequest { LeaderMemberId } */
  assignLeader: async (teamId: number, leaderMemberId: number): Promise<Team> => {
    const res = await axiosClient.put<Record<string, unknown>>(`/teams/${teamId}/leader`, { LeaderMemberId: leaderMemberId });
    return mapTeamFromApi((res ?? {}) as Record<string, unknown>);
  },

  /** POST api/team-members - BE: TeamMemberAddRequest { TeamId, MemberIds } */
  addMembers: async (teamId: number, memberIds: number[]): Promise<void> => {
    await axiosClient.post('/team-members', { TeamId: teamId, MemberIds: memberIds });
  },
};
