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

/** BE `ContributionResponse` trả tên thành viên trong `member.fullName`, không có `memberName` phẳng. */
function normalizeContribution(raw: Record<string, unknown>): ContributionListItem {
  const member = raw.member as { fullName?: string | null } | undefined;
  return {
    contributionId: Number(raw.contributionId),
    memberId: Number(raw.memberId),
    memberName:
      (raw.memberName as string | null | undefined) ?? member?.fullName ?? null,
    transactionId: Number(raw.transactionId),
    amount:
      raw.amount === null || raw.amount === undefined
        ? null
        : Number(raw.amount),
    description: String(raw.description ?? ''),
    paymentImg: String(raw.paymentImg ?? ''),
    createdAt: (raw.createdAt as string | null) ?? null,
  };
}

export type ContributionFilterParams = {
  pageNumber?: number;
  pageSize?: number;
  contributionId?: number;
  memberId?: number;
  transactionId?: number;
  amount?: number;
  description?: string;
};

export const contributionApi = {
  getContributions: async (
    params?: ContributionFilterParams,
  ): Promise<PaginationResponse<ContributionListItem>> => {
    const res = (await axiosClient.get('/contributions/filter', {
      params,
    })) as PaginationResponse<Record<string, unknown>>;
    return {
      ...res,
      items: (res.items ?? []).map((item) => normalizeContribution(item)),
    };
  },

  getById: async (id: number): Promise<ContributionListItem> => {
    const raw = (await axiosClient.get(`/contributions/${id}`)) as Record<
      string,
      unknown
    >;
    return normalizeContribution(raw);
  },

  /**
   * POST /api/wallets/{walletId}/contributions
   * BE dùng [FromForm] ContributionSubmitRequest → multipart/form-data.
   * Tạo Transaction + Contribution atomically.
   */
  submit: async (payload: {
    walletId: number;
    amount: number;
    description?: string;
    paymentImg: File;
  }): Promise<ContributionListItem> => {
    const fd = new FormData();
    fd.append('Amount', String(payload.amount));
    if (payload.description?.trim()) {
      fd.append('Description', payload.description.trim());
    }
    fd.append('PaymentImg', payload.paymentImg);
    const raw = (await axiosClient.post(
      `/wallets/${payload.walletId}/contributions`,
      fd,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    )) as Record<string, unknown>;
    return normalizeContribution(raw);
  },
};
