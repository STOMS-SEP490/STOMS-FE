import axiosClient from '@/shared/lib/axios';
import type { Team } from '@/modules/team/team';
import type { PaginationResponse } from '@/shared/types/api';
import type { SessionDetail } from './type';

export type PublishedTeamSession = {
  sessionId: number;
  requestId?: number;
  sessionNo?: number;
  startAt?: string;
  endAt?: string;
  location?: string;
  status?: string;
  isOnline?: boolean | null;
};

function mapPublishedTeamSessionFromApi(raw: Record<string, unknown>): PublishedTeamSession {
  const isOnlineRaw = raw['isOnline'] ?? raw['IsOnline'] ?? null;
  return {
    sessionId: Number(raw['sessionId'] ?? raw['SessionId'] ?? 0),
    requestId: Number(raw['requestId'] ?? raw['RequestId'] ?? 0) || undefined,
    sessionNo: Number(raw['sessionNo'] ?? raw['SessionNo'] ?? 0) || undefined,
    startAt:
      (raw['startAt'] ?? raw['StartAt']) != null
        ? String(raw['startAt'] ?? raw['StartAt'])
        : undefined,
    endAt:
      (raw['endAt'] ?? raw['EndAt']) != null
        ? String(raw['endAt'] ?? raw['EndAt'])
        : undefined,
    location:
      (raw['location'] ?? raw['Location']) != null
        ? String(raw['location'] ?? raw['Location'])
        : undefined,
    status:
      (raw['status'] ?? raw['Status']) != null
        ? String(raw['status'] ?? raw['Status'])
        : undefined,
    isOnline: isOnlineRaw == null ? null : Boolean(isOnlineRaw),
  };
}

export type SessionFilterParams = {
  sessionId?: number;
  requestId?: number;
  sessionNo?: number;
  statuses?: (string | number)[];
  subjectSessionId?: number;
  eventSessionId?: number;
  location?: string;
  isOnline?: boolean;
  borrowingId?: number;
  reservationId?: number;
  teamId?: number;
  memberId?: number;
  pageNumber?: number;
  pageSize?: number;
};

function toSessionFilterQuery(params: SessionFilterParams): Record<string, unknown> {
  return {
    SessionId: params.sessionId,
    RequestId: params.requestId,
    SessionNo: params.sessionNo,
    Statuses: params.statuses?.map((x) => String(x)),
    SubjectSessionId: params.subjectSessionId,
    EventSessionId: params.eventSessionId,
    Location: params.location,
    IsOnline: params.isOnline,
    BorrowingId: params.borrowingId,
    ReservationId: params.reservationId,
    TeamId: params.teamId,
    MemberId: params.memberId,
    PageNumber: params.pageNumber,
    PageSize: params.pageSize,
  };
}

const sessionApi = {
  // SUGGEST TEAMS
  suggestTeams: (sessionId: number): Promise<Team[]> => {
    return axiosClient.get(`/sessions/${sessionId}/team-suggestions`);
  },

  // GET BY ID
  getById: (id: number): Promise<SessionDetail> => {
    return axiosClient.get(`/sessions/${id}`);
  },

  /** GET /api/sessions/filter */
  async getFilter(
    params: SessionFilterParams = {},
  ): Promise<PaginationResponse<PublishedTeamSession>> {
    const res = await axiosClient.get('/sessions/filter', {
      params: toSessionFilterQuery(params),
    });
    const raw = (res as unknown as Record<string, unknown>) ?? {};
    const itemsRaw = (raw['items'] ?? raw['Items'] ?? []) as Record<string, unknown>[];
    return {
      pageNumber: Number(raw['pageNumber'] ?? raw['PageNumber'] ?? 1),
      pageSize: Number(raw['pageSize'] ?? raw['PageSize'] ?? itemsRaw.length),
      totalItems: Number(raw['totalItems'] ?? raw['TotalItems'] ?? itemsRaw.length),
      totalPages: Number(raw['totalPages'] ?? raw['TotalPages'] ?? 1),
      items: itemsRaw.map(mapPublishedTeamSessionFromApi),
    };
  },
};

export default sessionApi;

