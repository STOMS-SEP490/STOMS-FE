import axiosClient from '@/shared/lib/axios';
import type { PaginationResponse } from '@/shared/types/api';

export type WalletListItem = {
  walletId: number;
  memberId: number;
  walletName: string;
  balance: number;
  description: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type WalletFilterParams = {
  pageNumber?: number;
  pageSize?: number;
  walletId?: number;          
  memberId?: number;          
  walletName?: string;
};

function mapWalletFromApi(raw: Record<string, unknown>): WalletListItem {
  return {
    walletId: Number(raw['walletId'] ?? raw['WalletId'] ?? 0),
    memberId: Number(raw['memberId'] ?? raw['MemberId'] ?? 0),
    walletName: String(raw['walletName'] ?? raw['WalletName'] ?? ''),
    balance: Number(raw['balance'] ?? raw['Balance'] ?? 0),
    description:
      (raw['description'] ?? raw['Description']) != null
        ? String(raw['description'] ?? raw['Description'])
        : null,
    createdAt:
      (raw['createdAt'] ?? raw['CreatedAt']) != null
        ? String(raw['createdAt'] ?? raw['CreatedAt'])
        : null,
    updatedAt:
      (raw['updatedAt'] ?? raw['UpdatedAt']) != null
        ? String(raw['updatedAt'] ?? raw['UpdatedAt'])
        : null,
  };
}

function mapPagedFromApi(
  raw: Record<string, unknown>
): PaginationResponse<WalletListItem> {
  const items = ((raw['items'] ?? raw['Items']) as unknown[] | undefined) ?? [];
  return {
    pageNumber: Number(raw['pageNumber'] ?? raw['PageNumber'] ?? 1),
    pageSize: Number(raw['pageSize'] ?? raw['PageSize'] ?? 10),
    totalItems: Number(raw['totalItems'] ?? raw['TotalItems'] ?? 0),
    totalPages: Number(raw['totalPages'] ?? raw['TotalPages'] ?? 0),
    items: items.map((x) =>
      mapWalletFromApi((x ?? {}) as Record<string, unknown>)
    ),
  };
}

export const walletApi = {
  async getWallets(
    params?: WalletFilterParams
  ): Promise<PaginationResponse<WalletListItem>> {
    const res = await axiosClient.get<Record<string, unknown>>(
      '/wallets/filter',
      { params }
    );
    return mapPagedFromApi((res ?? {}) as unknown as Record<string, unknown>);
  },

  async getById(id: number): Promise<WalletListItem> {
    const res = await axiosClient.get<Record<string, unknown>>(`/wallets/${id}`);
    return mapWalletFromApi((res ?? {}) as unknown as Record<string, unknown>);
  },

  async create(payload: { walletName: string; description?: string }): Promise<WalletListItem> {
    const res = await axiosClient.post<Record<string, unknown>>('/wallets', {
      walletName: payload.walletName.trim(),
      description: payload.description?.trim() || null,
    });
    return mapWalletFromApi((res ?? {}) as unknown as Record<string, unknown>);
  },
};
