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
  member?: {
    memberId: number;
    fullName: string;
    email: string;
    phone: string;
    avatarUrl: string;
  } | null;
  transactions?: Array<{
    transactionId: number;
    amount: number;
    transactionType: number;
    description: string;
    transactionDate: string;
    createdByMember?: {
      fullName: string;
    } | null;
  }> | null;
};

export type WalletFilterParams = {
  pageNumber?: number;
  pageSize?: number;
  walletId?: number;          
  memberId?: number;          
  walletName?: string;
};

function mapWalletFromApi(raw: Record<string, unknown>): WalletListItem {
  const memberRaw = (raw['member'] ?? raw['Member']) as Record<string, unknown> | null | undefined;
  const transactionsRaw = (raw['transactions'] ?? raw['Transactions']) as unknown[] | null | undefined;

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
    member: memberRaw
      ? {
          memberId: Number(memberRaw['memberId'] ?? memberRaw['MemberId'] ?? 0),
          fullName: String(memberRaw['fullName'] ?? memberRaw['FullName'] ?? ''),
          email: String(memberRaw['email'] ?? memberRaw['Email'] ?? ''),
          phone: String(memberRaw['phone'] ?? memberRaw['Phone'] ?? ''),
          avatarUrl: String(memberRaw['avatarUrl'] ?? memberRaw['AvatarUrl'] ?? ''),
        }
      : null,
    transactions: transactionsRaw
      ? transactionsRaw.map((tx) => {
          const txObj = (tx ?? {}) as Record<string, unknown>;
          const createdByRaw = (txObj['createdByMember'] ?? txObj['CreatedByMember']) as Record<string, unknown> | null | undefined;
          return {
            transactionId: Number(txObj['transactionId'] ?? txObj['TransactionId'] ?? 0),
            amount: Number(txObj['amount'] ?? txObj['Amount'] ?? 0),
            transactionType: Number(txObj['transactionType'] ?? txObj['TransactionType'] ?? 0),
            description: String(txObj['description'] ?? txObj['Description'] ?? ''),
            transactionDate: String(txObj['transactionDate'] ?? txObj['TransactionDate'] ?? ''),
            createdByMember: createdByRaw
              ? {
                  fullName: String(createdByRaw['fullName'] ?? createdByRaw['FullName'] ?? ''),
                }
              : null,
          };
        })
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

  async update(id: number, payload: { walletName: string; description?: string }): Promise<WalletListItem> {
    const res = await axiosClient.put<Record<string, unknown>>(`/wallets/${id}`, {
      walletName: payload.walletName.trim(),
      description: payload.description?.trim() || null,
    });
    return mapWalletFromApi((res ?? {}) as unknown as Record<string, unknown>);
  },

  async delete(id: number): Promise<void> {
    await axiosClient.delete(`/wallets/${id}`);
  },
};
