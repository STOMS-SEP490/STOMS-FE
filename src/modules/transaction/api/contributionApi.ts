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

export const contributionApi = {
  getContributions: (
    params?: ContributionFilterParams,
  ): Promise<PaginationResponse<ContributionListItem>> =>
    axiosClient.get('/contributions/filter', { params }),

  getById: (id: number): Promise<ContributionListItem> =>
    axiosClient.get(`/contributions/${id}`),

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
    return axiosClient.post(`/wallets/${payload.walletId}/contributions`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
