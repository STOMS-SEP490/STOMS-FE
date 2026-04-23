import axiosClient from '@/shared/lib/axios'
import type { PaginationResponse } from '@/shared/types/api'
import type {
  TransactionFilterParams,
  TransactionListItem,
} from '../transaction'

/** BE `TransactionResponse` nests wallet name under `wallet`, not a flat `walletName`. */
function normalizeTransaction(raw: Record<string, unknown>): TransactionListItem {
  const wallet = raw.wallet as { walletName?: string | null } | undefined
  const createdByMember = raw.createdByMember as
    | { fullName?: string | null; email?: string | null; avatarUrl?: string | null }
    | undefined

  return {
    transactionId: Number(raw.transactionId ?? raw.TransactionId),
    walletId: Number(raw.walletId ?? raw.WalletId ?? 0),
    walletName:
      (raw.walletName as string | undefined) ?? wallet?.walletName ?? '',
    amount: Number(raw.amount),
    transactionType: Number(raw.transactionType),
    description: String(raw.description ?? ''),
    transactionDate: (raw.transactionDate as string | null) ?? null,
    createdBy:
      raw.createdBy === null || raw.createdBy === undefined
        ? null
        : Number(raw.createdBy),
    createdByName:
      (raw.createdByName as string | null | undefined) ??
      createdByMember?.fullName ??
      null,
    createdByEmail: createdByMember?.email ?? null,
    createdByAvatar: createdByMember?.avatarUrl ?? null,
    createdAt: (raw.createdAt as string | null) ?? null,
  }
}

const transactionApi = {
  // GET PAGED + FILTER
  getTransactions: async (
    params?: TransactionFilterParams
  ): Promise<PaginationResponse<TransactionListItem>> => {
    const query: Record<string, number> = {
      pageNumber: params?.pageNumber ?? 1,
      pageSize: params?.pageSize ?? 10,
    }
    if (
      params?.walletId != null &&
      Number.isFinite(params.walletId) &&
      params.walletId > 0
    ) {
      query.walletId = params.walletId
    }
    if (
      params?.transactionType != null &&
      Number.isFinite(params.transactionType)
    ) {
      query.transactionType = params.transactionType
    }
    if (
      params?.transactionId != null &&
      Number.isFinite(params.transactionId) &&
      params.transactionId > 0
    ) {
      query.transactionId = params.transactionId
    }
    if (
      params?.createdBy != null &&
      Number.isFinite(params.createdBy) &&
      params.createdBy > 0
    ) {
      query.createdBy = params.createdBy
    }
    const res = (await axiosClient.get('/transactions/filter', {
      params: query,
    })) as PaginationResponse<Record<string, unknown>>
    return {
      ...res,
      items: (res.items ?? []).map((item) => normalizeTransaction(item)),
    }
  },

  // GET BY ID
  getById: async (id: number): Promise<TransactionListItem> => {
    const raw = (await axiosClient.get(`/transactions/${id}`)) as Record<
      string,
      unknown
    >
    return normalizeTransaction(raw)
  },

  // CREATE
  create: (data: Partial<TransactionListItem>): Promise<void> =>
    axiosClient.post('/transactions', data),

  // UPDATE
  update: (
    id: number,
    data: Partial<TransactionListItem>
  ): Promise<void> =>
    axiosClient.put(`/transactions/${id}`, data),

  // DELETE
  remove: (id: number): Promise<void> =>
    axiosClient.delete(`/transactions/${id}`),
}

export default transactionApi

