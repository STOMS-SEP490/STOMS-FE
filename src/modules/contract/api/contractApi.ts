import axiosClient from '@/shared/lib/axios';
import type { PaginationResponse } from '@/shared/types/api';
import type {
  ContractFilterParams,
  ContractListItem,
  ContractRequestItem,
  ContractSessionItem,
  ContractUserItem,
} from '../contract';

function mapUserFromApi(raw: any): ContractUserItem {
  const member = raw.member ?? raw.Member ?? {};
  return {
    email: String(raw.email ?? raw.Email ?? ''),
    roleId: Number(raw.roleId ?? raw.RoleId ?? 0),
    member: {
      memberId: Number(member.memberId ?? member.MemberId ?? 0),
      avatarUrl: String(member.avatarUrl ?? member.AvatarUrl ?? ''),
      fullName: String(member.fullName ?? member.FullName ?? ''),
      phone: String(member.phone ?? member.Phone ?? ''),
      address: String(member.address ?? member.Address ?? ''),
      cin: String(member.cin ?? member.Cin ?? ''),
      bankCode: String(member.bankCode ?? member.BankCode ?? ''),
      bankName: String(member.bankName ?? member.BankName ?? ''),
      taxNumber: String(member.taxNumber ?? member.TaxNumber ?? ''),
    },
  };
}

function mapSessionFromApi(raw: any): ContractSessionItem {
  return {
    sessionNo: Number(raw.sessionNo ?? raw.SessionNo ?? 0),
    startAt: String(raw.startAt ?? raw.StartAt ?? ''),
    endAt: String(raw.endAt ?? raw.EndAt ?? ''),
    status: String(raw.status ?? raw.Status ?? ''),
    location: String(raw.location ?? raw.Location ?? ''),
    isOnline:
      raw.isOnline !== undefined
        ? Boolean(raw.isOnline)
        : raw.IsOnline !== undefined
          ? Boolean(raw.IsOnline)
          : null,
    title: raw.title ?? raw.Title,
  };
}

function mapRequestFromApi(raw: any | null | undefined): ContractRequestItem | null {
  if (!raw) return null;
  return {
    requestId: Number(raw.requestId ?? raw.RequestId ?? 0),
    requestCode: String(raw.requestCode ?? raw.RequestCode ?? ''),
    requestName: String(raw.requestName ?? raw.RequestName ?? ''),
  };
}

function mapContractFromApi(raw: any): ContractListItem {
  const createdByUserRaw = raw.createdByUser ?? raw.CreatedByUser ?? {};
  const sessionRaw = raw.session ?? raw.Session ?? {};
  const requestRaw = raw.request ?? raw.Request ?? null;

  return {
    contractId: Number(raw.contractId ?? raw.ContractId ?? 0),
    createdByMemberId: Number(raw.createdByMemberId ?? raw.CreatedByMemberId ?? 0),
    sessionId: Number(raw.sessionId ?? raw.SessionId ?? 0),
    amount:
      raw.amount != null || raw.Amount != null
        ? Number(raw.amount ?? raw.Amount ?? 0)
        : null,
    contractCode: String(raw.contractCode ?? raw.ContractCode ?? ''),
    isPaid:
      raw.isPaid !== undefined || raw.IsPaid !== undefined
        ? Boolean(raw.isPaid ?? raw.IsPaid)
        : null,
    createdAt: (raw.createdAt ?? raw.CreatedAt ?? null) as string | null,
    updatedAt: (raw.updatedAt ?? raw.UpdatedAt ?? null) as string | null,
    createdByUser: mapUserFromApi(createdByUserRaw),
    session: mapSessionFromApi(sessionRaw),
    request: mapRequestFromApi(requestRaw),
  };
}

function mapPagedFromApi(raw: any): PaginationResponse<ContractListItem> {
  const items = (raw.items ?? raw.Items ?? []) as any[];
  return {
    pageNumber: Number(raw.pageNumber ?? raw.PageNumber ?? 1),
    pageSize: Number(raw.pageSize ?? raw.PageSize ?? 10),
    totalItems: Number(raw.totalItems ?? raw.TotalItems ?? items.length),
    totalPages: Number(raw.totalPages ?? raw.TotalPages ?? 1),
    items: items.map((x) => mapContractFromApi(x)),
  };
}

const contractApi = {
  // GET PAGED + FILTER
  getContracts: async (
    params?: ContractFilterParams
  ): Promise<PaginationResponse<ContractListItem>> => {
    const res = await axiosClient.get('/contracts/filter', { params });
    return mapPagedFromApi(res ?? {});
  },

  // GET BY ID
  getById: async (id: number): Promise<ContractListItem> => {
    const res = await axiosClient.get(`/contracts/${id}`);
    return mapContractFromApi(res ?? {});
  },

  // CREATE
  create: (data: Partial<ContractListItem>): Promise<void> =>
    axiosClient.post('/contracts', data),

  // UPDATE INFO
  update: (
    id: number,
    data: Partial<ContractListItem>
  ): Promise<void> => axiosClient.put(`/contracts/${id}`, data),

  // MARK AS PAID
  markAsPaid: (id: number): Promise<ContractListItem> =>
    axiosClient.put(`/contracts/${id}/contract-status`),
};

export default contractApi;


