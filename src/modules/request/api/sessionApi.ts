import axiosClient from '@/shared/lib/axios';
import type { Team } from '@/modules/team/team';
import { serializeParamsRepeatArray } from '@/shared/lib/paramsSerializer';
import type { PagedResponse, SessionFilterRequest, SessionResponse } from '../session.types';
import {
  normalizeSessionPagedResponse,
  normalizeSessionResponse,
} from '../utils/normalizeSessionResponse';

// Short-lived in-memory cache (5 giây) để tránh fetch lại khi nhiều component cùng request
const _sessionCache = new Map<number, { data: SessionResponse; ts: number }>();
const _teamsCache = new Map<number, { data: Team[]; ts: number }>();
const CACHE_TTL = 5000; // 5 seconds

const sessionApi = {
  suggestTeams: (sessionId: number): Promise<Team[]> => {
    const cached = _teamsCache.get(sessionId);
    if (cached && Date.now() - cached.ts < CACHE_TTL) return Promise.resolve(cached.data);
    return axiosClient.get<Team[], Team[]>(`/sessions/${sessionId}/team-suggestions`).then((data) => {
      _teamsCache.set(sessionId, { data, ts: Date.now() });
      return data;
    });
  },

  getById: (id: number): Promise<SessionResponse> => {
    const cached = _sessionCache.get(id);
    if (cached && Date.now() - cached.ts < CACHE_TTL) return Promise.resolve(cached.data);
    return axiosClient
      .get<SessionResponse, SessionResponse>(`/sessions/${id}`)
      .then((raw) => {
        const normalized = normalizeSessionResponse(raw as SessionResponse);
        _sessionCache.set(id, { data: normalized, ts: Date.now() });
        return normalized;
      });
  },

  getFilter: (params: SessionFilterRequest = {}): Promise<PagedResponse<SessionResponse>> =>
    axiosClient
      .get<PagedResponse<SessionResponse>, PagedResponse<SessionResponse>>('/sessions/filter', {
        params,
        paramsSerializer: serializeParamsRepeatArray,
      })
      .then((raw) => normalizeSessionPagedResponse(raw as PagedResponse<SessionResponse>)),

  cancel: (payload: { sessionId: number; reason: string }): Promise<void> =>
    axiosClient.put<void, void>('/sessions/cancel', {
      SessionIds: [payload.sessionId],
      Reason: payload.reason,
    }),
};

export default sessionApi;
