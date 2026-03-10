import axiosClient from '@/shared/lib/axios';
import type { PaginationResponse } from '@/shared/types/api';

export type TeachingHistoryFilterParams = {
  pageNumber?: number;
  pageSize?: number;
  keyword?: string;
  from?: string;
  toExclusive?: string;
  sessionStatus?: string;
  staffRole?: string;
  isOnline?: boolean;
};

export type TeachingHistoryItem = {
  sessionId: number;
  sessionName: string;
  startAt: string;
  endAt: string;
  location: string;
  isOnline: boolean | null;
  role: string;
  status: string;
};

function mapItemFromApi(raw: any): TeachingHistoryItem {
  return {
    sessionId: Number(raw.sessionId ?? raw.SessionId),
    sessionName: String(raw.sessionName ?? raw.SessionName ?? ''),
    startAt: String(raw.startAt ?? raw.StartAt ?? ''),
    endAt: String(raw.endAt ?? raw.EndAt ?? ''),
    location: String(raw.location ?? raw.Location ?? ''),
    isOnline:
      raw.isOnline !== undefined
        ? Boolean(raw.isOnline)
        : raw.IsOnline !== undefined
          ? Boolean(raw.IsOnline)
          : null,
    role: String(raw.role ?? raw.Role ?? ''),
    status: String(raw.status ?? raw.Status ?? ''),
  };
}

const teachingHistoryApi = {
  getTeachingHistory: async (
    memberId: number,
    params: TeachingHistoryFilterParams
  ): Promise<PaginationResponse<TeachingHistoryItem>> => {
    const res = await axiosClient.get(`/dashboard/users/${memberId}/teaching-history`, {
      params,
    });
    const items = (res.items ?? res.Items ?? []) as any[];
    return {
      pageNumber: Number(res.pageNumber ?? res.PageNumber ?? 1),
      pageSize: Number(res.pageSize ?? res.PageSize ?? params.pageSize ?? 10),
      totalItems: Number(res.totalItems ?? res.TotalItems ?? items.length),
      totalPages: Number(res.totalPages ?? res.TotalPages ?? 1),
      items: items.map((x) => mapItemFromApi(x)),
    };
  },
};

export default teachingHistoryApi;

