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

export type MemberSessionsFilterParams = {
  hasContract?: boolean;
  pageNumber?: number;
  pageSize?: number;
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
  requestCode?: string;
  requestName?: string;
  contractId?: number | null;
  contractCode?: string;
  contractIsPaid?: boolean | null;
};

function mapItemFromApi(raw: any): TeachingHistoryItem {
  // Shape dựa theo DashboardTeachingHistoryItemResponse; JSON dùng camelCase.
  const request = raw.request ?? raw.Request ?? null;
  const contract = raw.contract ?? raw.Contract ?? null;

  return {
    sessionId: Number(raw.sessionId ?? raw.SessionId ?? 0),
    sessionName: String(raw.sessionTitle ?? raw.SessionTitle ?? ''),
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
    requestCode: request ? String(request.requestCode ?? request.RequestCode ?? '') : undefined,
    requestName: request ? String(request.requestName ?? request.RequestName ?? '') : undefined,
    contractId: contract ? Number(contract.contractId ?? contract.ContractId ?? 0) : null,
    contractCode: contract ? String(contract.contractCode ?? contract.ContractCode ?? '') : undefined,
    contractIsPaid:
      contract && (contract.isPaid !== undefined || contract.IsPaid !== undefined)
        ? Boolean(contract.isPaid ?? contract.IsPaid)
        : null,
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
    const raw: any = res ?? {};
    const items = (raw.items ?? raw.Items ?? []) as any[];
    return {
      pageNumber: Number(raw.pageNumber ?? raw.PageNumber ?? 1),
      pageSize: Number(raw.pageSize ?? raw.PageSize ?? params.pageSize ?? 10),
      totalItems: Number(raw.totalItems ?? raw.TotalItems ?? items.length),
      totalPages: Number(raw.totalPages ?? raw.TotalPages ?? 1),
      items: items.map((x) => mapItemFromApi(x)),
    };
  },

  getSessionsByMember: async (
    memberId: number,
    params: MemberSessionsFilterParams
  ): Promise<PaginationResponse<TeachingHistoryItem>> => {
    const res = await axiosClient.get(`/assignments/members/${memberId}/sessions`, {
      params,
    });
    const raw: any = res ?? {};
    const items = (raw.items ?? raw.Items ?? []) as any[];
    return {
      pageNumber: Number(raw.pageNumber ?? raw.PageNumber ?? 1),
      pageSize: Number(raw.pageSize ?? raw.PageSize ?? params.pageSize ?? 10),
      totalItems: Number(raw.totalItems ?? raw.TotalItems ?? items.length),
      totalPages: Number(raw.totalPages ?? raw.TotalPages ?? 1),
      items: items.map((x) => mapItemFromApi(x)),
    };
  },
};

export default teachingHistoryApi;

