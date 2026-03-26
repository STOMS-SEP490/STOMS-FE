import axiosClient from '@/shared/lib/axios';
import type { Team } from '@/modules/team/team';
import { serializeParamsRepeatArray } from '@/shared/lib/paramsSerializer';
import type { PagedResponse, SessionFilterRequest, SessionResponse } from '../session.types';

const sessionApi = {
  // SUGGEST TEAMS
  suggestTeams: (sessionId: number): Promise<Team[]> => {
    return axiosClient.get<Team[], Team[]>(`/sessions/${sessionId}/team-suggestions`);
  },

  // GET BY ID
  getById: (id: number): Promise<SessionResponse> => {
    return axiosClient.get<SessionResponse, SessionResponse>(`/sessions/${id}`);
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

