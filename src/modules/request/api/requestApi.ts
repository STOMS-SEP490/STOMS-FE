import axiosClient from '@/shared/lib/axios';
import type { PaginationResponse } from '@/shared/types/api';
import type {
  RequestFilterParams,
  RequestListItem,
  CreateRequestPayload,
} from '../request';

function toRequestFilterQuery(params: RequestFilterParams = {}): Record<string, unknown> {
  return {
    RequestId: params.requestId,
    Statuses: params.statuses,
    TeamId: params.teamId,
    PageNumber: params.pageNumber,
    PageSize: params.pageSize,
  };
}

const requestApi = {
  async getRequests(
    params?: RequestFilterParams,
  ): Promise<PaginationResponse<RequestListItem>> {
    const res = await axiosClient.get<
      PaginationResponse<RequestListItem>,
      PaginationResponse<RequestListItem>
    >('/requests/filter', {
      params: toRequestFilterQuery(params ?? {}),
      // Tuỳ biến serialize để BE nhận dạng List<string> đúng dạng
      paramsSerializer: (rawParams) => {
        const usp = new URLSearchParams();
        Object.entries(rawParams).forEach(([key, value]) => {
          if (value == null) return;
          if (Array.isArray(value)) {
            value.forEach((v) => usp.append(key, String(v)));
          } else {
            usp.append(key, String(value));
          }
        });
        return usp.toString();
      },
    });
    return res;
  },

  getById: (id: number): Promise<RequestListItem> => {
    return axiosClient.get<RequestListItem, RequestListItem>(`/requests/${id}`);
  },

  create: (data: CreateRequestPayload): Promise<RequestListItem> => {
    return axiosClient.post<RequestListItem, RequestListItem>('/requests', data);
  },

  approve: (
    id: number,
    payload: { approvedByMemberId?: number | null },
  ): Promise<RequestListItem> => {
    return axiosClient.put<RequestListItem, RequestListItem>(
      `/requests/${id}/approve`,
      {
        ApprovedByMemberId: payload.approvedByMemberId ?? null,
      },
    );
  },

  reject: (
    id: number,
    payload: { reason: string; approvedByMemberId?: number | null },
  ): Promise<RequestListItem> => {
    return axiosClient.put<RequestListItem, RequestListItem>(
      `/requests/${id}/reject`,
      {
        Reason: payload.reason,
        ApprovedByMemberId: payload.approvedByMemberId ?? null,
      },
    );
  },

  update: (id: number, data: Partial<CreateRequestPayload>): Promise<void> => {
    return axiosClient.put<void, void>(`/requests/${id}`, data);
  },

  remove: (id: number): Promise<void> => {
    return axiosClient.delete<void, void>(`/requests/${id}`);
  },
};

export default requestApi;