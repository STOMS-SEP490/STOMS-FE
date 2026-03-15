import axiosClient from '@/shared/lib/axios';
import type { PaginationResponse } from '@/shared/types/api';

export type ContributionListItem = {
  contributionId: number;
  memberId: number;
  memberName: string | null;
  transactionId: number;
  amount: number | null;
  description: string;
  paymentImg: string;
  createdAt: string | null;
};

export type ContributionFilterParams = {
  pageNumber?: number;
  pageSize?: number;
  contributionId?: number;
  memberId?: number;
  transactionId?: number;
  amount?: number;
  description?: string;
};

function mapContributionFromApi(raw: Record<string, unknown>): ContributionListItem {
  const memberRaw = (raw['member'] ?? raw['Member'] ?? null) as
    | Record<string, unknown>
    | null;
  const memberName = memberRaw
    ? String(memberRaw['fullName'] ?? memberRaw['FullName'] ?? '')
    : '';

  return {
    contributionId: Number(raw['contributionId'] ?? raw['ContributionId'] ?? 0),
    memberId: Number(raw['memberId'] ?? raw['MemberId'] ?? 0),
    memberName: memberName || null,
    transactionId: Number(raw['transactionId'] ?? raw['TransactionId'] ?? 0),
    amount:
      (raw['amount'] ?? raw['Amount'] ?? null) != null
        ? Number(raw['amount'] ?? raw['Amount'])
        : null,
    description: String(raw['description'] ?? raw['Description'] ?? ''),
    paymentImg: String(raw['paymentImg'] ?? raw['PaymentImg'] ?? ''),
    createdAt:
      (raw['createdAt'] ?? raw['CreatedAt'] ?? null) != null
        ? String(raw['createdAt'] ?? raw['CreatedAt'])
        : null,
  };
}

function mapPagedFromApi(
  raw: Record<string, unknown>
): PaginationResponse<ContributionListItem> {
  const items = ((raw['items'] ?? raw['Items']) as unknown[] | undefined) ?? [];
  return {
    pageNumber: Number(raw['pageNumber'] ?? raw['PageNumber'] ?? 1),
    pageSize: Number(raw['pageSize'] ?? raw['PageSize'] ?? 10),
    totalItems: Number(raw['totalItems'] ?? raw['TotalItems'] ?? 0),
    totalPages: Number(raw['totalPages'] ?? raw['TotalPages'] ?? 0),
    items: items.map((x) =>
      mapContributionFromApi((x ?? {}) as Record<string, unknown>)
    ),
  };
}

export const contributionApi = {
  async getContributions(
    params?: ContributionFilterParams
  ): Promise<PaginationResponse<ContributionListItem>> {
    const res = await axiosClient.get<Record<string, unknown>>(
      '/contributions/filter',
      { params }
    );
    return mapPagedFromApi((res ?? {}) as unknown as Record<string, unknown>);
  },

  async getById(id: number): Promise<ContributionListItem> {
    const res = await axiosClient.get<Record<string, unknown>>(
      `/contributions/${id}`
    );
    return mapContributionFromApi(
      (res ?? {}) as unknown as Record<string, unknown>
    );
  },
};

