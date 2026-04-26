import axiosClient from '@/shared/lib/axios'
import type { PaginationResponse } from '@/shared/types/api'
import type {
  TransactionFilterParams,
  TransactionListItem,
  ExpenseInfo,
  TaskReportInfo,
} from '../transaction'

/** BE `TransactionResponse` nests wallet name under `wallet`, not a flat `walletName`. */
function normalizeTransaction(raw: Record<string, unknown>): TransactionListItem {
  const wallet = raw.wallet as { walletName?: string | null } | undefined
  const createdByMember = raw.createdByMember as
    | { fullName?: string | null; email?: string | null; avatarUrl?: string | null }
    | undefined

  // Parse expenses array
  const expensesRaw = (raw.expenses ?? raw.Expenses ?? []) as unknown[];
  const expenses: ExpenseInfo[] = expensesRaw.map((expRaw: unknown) => {
    const exp = expRaw as Record<string, unknown>;
    
    // Parse taskReport
    const taskReportRaw = (exp.taskReport ?? exp.TaskReport ?? null) as Record<string, unknown> | null;
    const taskReport: TaskReportInfo | null = taskReportRaw ? {
      taskReportId: Number(taskReportRaw.taskReportId ?? taskReportRaw.TaskReportId ?? 0),
      title: String(taskReportRaw.title ?? taskReportRaw.Title ?? ''),
      description: String(taskReportRaw.description ?? taskReportRaw.Description ?? ''),
      startAt: (taskReportRaw.startAt ?? taskReportRaw.StartAt ?? null) as string | null,
      endAt: (taskReportRaw.endAt ?? taskReportRaw.EndAt ?? null) as string | null,
      sessionId: taskReportRaw.sessionId != null ? Number(taskReportRaw.sessionId ?? taskReportRaw.SessionId) : null,
      sessionNo: taskReportRaw.sessionNo != null ? Number(taskReportRaw.sessionNo ?? taskReportRaw.SessionNo) : null,
      requestCode: (taskReportRaw.requestCode ?? taskReportRaw.RequestCode ?? null) as string | null,
    } : null;

    return {
      expenseId: Number(exp.expenseId ?? exp.ExpenseId ?? 0),
      taskReportId: exp.taskReportId != null ? Number(exp.taskReportId ?? exp.TaskReportId) : null,
      taskReport,
      paymentImg: String(exp.paymentImg ?? exp.PaymentImg ?? ''),
      approvedByMemberId: exp.approvedByMemberId != null ? Number(exp.approvedByMemberId ?? exp.ApprovedByMemberId) : null,
      approvedByMemberFullName: (exp.approvedByMemberFullName ?? exp.ApprovedByMemberFullName ?? null) as string | null,
      approvedAt: (exp.approvedAt ?? exp.ApprovedAt ?? null) as string | null,
      createdAt: (exp.createdAt ?? exp.CreatedAt ?? null) as string | null,
    };
  });

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
    expenses: expenses.length > 0 ? expenses : undefined,
  }
}

const transactionApi = {
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

  getById: async (id: number): Promise<TransactionListItem> => {
    const raw = (await axiosClient.get(`/transactions/${id}`)) as Record<
      string,
      unknown
    >
    return normalizeTransaction(raw)
  },

  create: (data: Partial<TransactionListItem>): Promise<void> =>
    axiosClient.post('/transactions', data),

  update: (
    id: number,
    data: Partial<TransactionListItem>
  ): Promise<void> =>
    axiosClient.put(`/transactions/${id}`, data),

  remove: (id: number): Promise<void> =>
    axiosClient.delete(`/transactions/${id}`),
}

export default transactionApi

