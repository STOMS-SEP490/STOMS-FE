import axiosClient from '@/shared/lib/axios';
import type { PaginationResponse } from '@/shared/types/api';

export type ExpenseListItem = {
  expenseId: number;
  taskReportId: number | null;
  transactionId: number | null;
  amount: number | null;
  description: string;
  paymentImg: string;
  status: number;
  approvedByMemberId: number | null;
  approvedByName: string | null;
  createdAt: string | null;
  approvedAt: string | null;
  rejectReason: string | null;
};

export type ExpenseFilterParams = {
  pageNumber?: number;
  pageSize?: number;
  expenseId?: number;
  taskReportId?: number;
  transactionId?: number;
  amount?: number;
  description?: string;
  approvedByMemberId?: number;
  status?: number;
};

function mapExpenseFromApi(raw: Record<string, unknown>): ExpenseListItem {
  const approvedByRaw = (raw['approvedByMember'] ?? raw['ApprovedByMember'] ?? null) as
    | Record<string, unknown>
    | null;
  const approvedByName = approvedByRaw
    ? String(approvedByRaw['fullName'] ?? approvedByRaw['FullName'] ?? '')
    : '';

  return {
    expenseId: Number(raw['expenseId'] ?? raw['ExpenseId'] ?? 0),
    taskReportId:
      (raw['taskReportId'] ?? raw['TaskReportId'] ?? null) != null
        ? Number(raw['taskReportId'] ?? raw['TaskReportId'])
        : null,
    transactionId:
      (raw['transactionId'] ?? raw['TransactionId'] ?? null) != null
        ? Number(raw['transactionId'] ?? raw['TransactionId'])
        : null,
    amount:
      (raw['amount'] ?? raw['Amount'] ?? null) != null
        ? Number(raw['amount'] ?? raw['Amount'])
        : null,
    description: String(raw['description'] ?? raw['Description'] ?? ''),
    paymentImg: String(raw['paymentImg'] ?? raw['PaymentImg'] ?? ''),
    status: Number(raw['status'] ?? raw['Status'] ?? 0),
    approvedByMemberId:
      (raw['approvedByMemberId'] ?? raw['ApprovedByMemberId'] ?? null) != null
        ? Number(raw['approvedByMemberId'] ?? raw['ApprovedByMemberId'])
        : null,
    approvedByName: approvedByName || null,
    createdAt:
      (raw['createdAt'] ?? raw['CreatedAt'] ?? null) != null
        ? String(raw['createdAt'] ?? raw['CreatedAt'])
        : null,
    approvedAt:
      (raw['approvedAt'] ?? raw['ApprovedAt'] ?? null) != null
        ? String(raw['approvedAt'] ?? raw['ApprovedAt'])
        : null,
    rejectReason:
      (raw['rejectReason'] ?? raw['RejectReason'] ?? null) != null
        ? String(raw['rejectReason'] ?? raw['RejectReason'])
        : null,
  };
}

function mapPagedFromApi(
  raw: Record<string, unknown>
): PaginationResponse<ExpenseListItem> {
  const items = ((raw['items'] ?? raw['Items']) as unknown[] | undefined) ?? [];
  return {
    pageNumber: Number(raw['pageNumber'] ?? raw['PageNumber'] ?? 1),
    pageSize: Number(raw['pageSize'] ?? raw['PageSize'] ?? 10),
    totalItems: Number(raw['totalItems'] ?? raw['TotalItems'] ?? 0),
    totalPages: Number(raw['totalPages'] ?? raw['TotalPages'] ?? 0),
    items: items.map((x) => mapExpenseFromApi((x ?? {}) as Record<string, unknown>)),
  };
}

export const expenseApi = {
  async getExpenses(
    params?: ExpenseFilterParams
  ): Promise<PaginationResponse<ExpenseListItem>> {
    const res = await axiosClient.get<Record<string, unknown>>('/expenses/filter', {
      params,
    });
    return mapPagedFromApi((res?.data ?? {}) as Record<string, unknown>);
  },

  async getById(id: number): Promise<ExpenseListItem> {
    const res = await axiosClient.get<Record<string, unknown>>(`/expenses/${id}`);
    return mapExpenseFromApi((res?.data ?? {}) as Record<string, unknown>);
  },

  async approve(payload: { walletId: number; expenseIds: number[] }): Promise<ExpenseListItem[]> {
    const res = await axiosClient.put<unknown>('/expenses/approve', {
      walletId: payload.walletId,
      expenseIds: payload.expenseIds,
    });
    const arr = Array.isArray(res) ? res : (res as { items?: unknown[] })?.items ?? [];
    return arr.map((x) => mapExpenseFromApi((x ?? {}) as Record<string, unknown>));
  },

  async reject(payload: { expenseId: number; reason: string }): Promise<ExpenseListItem> {
    const res = await axiosClient.put<Record<string, unknown>>('/expenses/reject', {
      expenseId: payload.expenseId,
      reason: payload.reason.trim(),
    });
    return mapExpenseFromApi((res ?? {}) as Record<string, unknown>);
  },
};

