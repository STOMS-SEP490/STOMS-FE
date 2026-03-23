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
    | { fullName?: string | null }
    | undefined

  return {
    transactionId: Number(raw.transactionId),
    walletId: Number(raw.walletId),
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
    createdAt: (raw.createdAt as string | null) ?? null,
  }
}

const transactionApi = {
  // GET PAGED + FILTER
  getTransactions: async (
    params?: TransactionFilterParams
  ): Promise<PaginationResponse<TransactionListItem>> => {
    const res = (await axiosClient.get('/transactions/filter', {
      params,
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

