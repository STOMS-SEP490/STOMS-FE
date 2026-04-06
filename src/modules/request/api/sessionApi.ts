import axiosClient from '@/shared/lib/axios';
import type { Team } from '@/modules/team/team';
import { serializeParamsRepeatArray } from '@/shared/lib/paramsSerializer';
import type { PagedResponse, SessionFilterRequest, SessionResponse } from '../session.types';
import {
  normalizeSessionPagedResponse,
  normalizeSessionResponse,
} from '../utils/normalizeSessionResponse';

const sessionApi = {
  suggestTeams: (sessionId: number): Promise<Team[]> =>
    axiosClient.get<Team[], Team[]>(`/sessions/${sessionId}/team-suggestions`),

  getById: (id: number): Promise<SessionResponse> =>
    axiosClient
      .get<SessionResponse, SessionResponse>(`/sessions/${id}`)
      .then((raw) => normalizeSessionResponse(raw as SessionResponse)),

  getFilter: (params: SessionFilterRequest = {}): Promise<PagedResponse<SessionResponse>> =>
    axiosClient
      .get<PagedResponse<SessionResponse>, PagedResponse<SessionResponse>>('/sessions/filter', {
        params,
        paramsSerializer: serializeParamsRepeatArray,
      })
      .then((raw) => normalizeSessionPagedResponse(raw as PagedResponse<SessionResponse>)),

  cancel: (payload: { sessionId: number; reason: string }): Promise<void> =>
    axiosClient.put<void, void>('/sessions/cancel', {
      SessionId: payload.sessionId,
      Reason: payload.reason,
    }),
};

export default sessionApi;
