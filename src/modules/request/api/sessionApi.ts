import axiosClient from '@/shared/lib/axios';
import type { Team } from '@/modules/team/team';
import { serializeParamsRepeatArray } from '@/shared/lib/paramsSerializer';
import type { PagedResponse, SessionFilterRequest, SessionResponse } from '../session.types';
import type { SessionDetail } from '../type';

export type PublishedTeamSession = SessionResponse & {
  sessionId: number;
  requestId: number;
  sessionNo: number;
  startAt: string;
  endAt: string;
  status: string;
  location: string;
  assignments?: Array<{ staffMemberId?: number | null; staffRole?: string | null }>;
  attendances?: Array<{
    attendanceByMemberId?: number | null;
    checkinAt?: string | null;
    checkoutAt?: string | null;
  }>;
};

const toSessionDetail = (raw: SessionResponse): SessionDetail =>
  ({
    ...raw,
    sessionId: Number(raw.sessionId ?? raw.SessionId ?? 0),
    requestId: Number(raw.requestId ?? raw.RequestId ?? 0),
    sessionNo: Number(raw.sessionNo ?? raw.SessionNo ?? 0),
    startAt: String(raw.startAt ?? raw.StartAt ?? ''),
    endAt: String(raw.endAt ?? raw.EndAt ?? ''),
    status: String(raw.status ?? raw.Status ?? ''),
    location: String(raw.location ?? raw.Location ?? ''),
    notes: String(raw.notes ?? raw.Notes ?? ''),
    assignments: (raw.assignments ?? raw.Assignments ?? null) as SessionDetail['assignments'],
    attendances: (raw.attendances ?? raw.Attendances ?? null) as SessionDetail['attendances'],
    Assignments: (raw.Assignments ?? raw.assignments ?? null) as SessionDetail['Assignments'],
    Attendances: (raw.Attendances ?? raw.attendances ?? null) as SessionDetail['Attendances'],
  }) as SessionDetail;

const sessionApi = {
  // SUGGEST TEAMS
  suggestTeams: (sessionId: number): Promise<Team[]> => {
    return axiosClient.get<Team[], Team[]>(`/sessions/${sessionId}/team-suggestions`);
  },

  // GET BY ID
  getById: async (id: number): Promise<SessionDetail> => {
    const raw = await axiosClient.get<SessionResponse, SessionResponse>(`/sessions/${id}`);
    return toSessionDetail(raw);
  },

  /** GET /api/sessions/filter */
  getFilter: (params: SessionFilterRequest = {}): Promise<PagedResponse<SessionResponse>> => {
    return axiosClient.get<PagedResponse<SessionResponse>, PagedResponse<SessionResponse>>('/sessions/filter', {
      params,
      paramsSerializer: serializeParamsRepeatArray,
    });
  },
};

export default sessionApi;

