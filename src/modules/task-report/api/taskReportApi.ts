import axiosClient from '@/shared/lib/axios';
import type { PaginationResponse } from '@/shared/types/api';

export type TaskReport = {
  taskReportId: number;
  userId: number | null;
  requestId: number;
  sessionId: number | null;
  title: string;
  description: string;
  startAt: string | null;
  endAt: string | null;
  createdAt: string | null;
  memberName?: string | null;
  expenses?: ExpenseItem[] | null;
};

export type ExpenseItem = {
  expenseId: number;
  amount: number | null;
  description: string;
  name: string;
};

function mapExpenseFromApi(raw: Record<string, unknown>): ExpenseItem {
  const expenseDesc = String(raw['description'] ?? raw['Description'] ?? '');
  const tx = (raw['transaction'] ?? raw['Transaction'] ?? null) as Record<
    string,
    unknown
  > | null;
  const txDesc = tx ? String(tx['description'] ?? tx['Description'] ?? '') : '';

  // "Tên khoản chi": ưu tiên Transaction.Description (nếu có), fallback Expense.Description
  const name = txDesc?.trim() ? txDesc : expenseDesc;

  return {
    expenseId: Number(raw['expenseId'] ?? raw['ExpenseId'] ?? 0),
    amount:
      (raw['amount'] ?? raw['Amount'] ?? null) != null
        ? Number(raw['amount'] ?? raw['Amount'])
        : null,
    description: expenseDesc,
    name,
  };
}

function mapTaskReportFromApi(raw: Record<string, unknown>): TaskReport {
  const expensesRaw =
    ((raw['expenses'] ?? raw['Expenses']) as unknown[] | undefined) ?? undefined;
  const memberRaw = (raw['member'] ?? raw['Member'] ?? null) as
    | Record<string, unknown>
    | null;
  const memberFullName = memberRaw
    ? String(memberRaw['fullName'] ?? memberRaw['FullName'] ?? '')
    : '';

  return {
    taskReportId: Number(raw['taskReportId'] ?? raw['TaskReportId'] ?? 0),
    userId:
      (raw['userId'] ?? raw['UserId'] ?? null) !== null
        ? Number(raw['userId'] ?? raw['UserId'])
        : null,
    requestId: Number(raw['requestId'] ?? raw['RequestId'] ?? 0),
    sessionId:
      (raw['sessionId'] ?? raw['SessionId'] ?? null) !== null
        ? Number(raw['sessionId'] ?? raw['SessionId'])
        : null,
    title: String(raw['title'] ?? raw['Title'] ?? ''),
    description: String(raw['description'] ?? raw['Description'] ?? ''),
    startAt:
      (raw['startAt'] ?? raw['StartAt'] ?? null) != null
        ? String(raw['startAt'] ?? raw['StartAt'])
        : null,
    endAt:
      (raw['endAt'] ?? raw['EndAt'] ?? null) != null
        ? String(raw['endAt'] ?? raw['EndAt'])
        : null,
    createdAt:
      (raw['createdAt'] ?? raw['CreatedAt'] ?? null) != null
        ? String(raw['createdAt'] ?? raw['CreatedAt'])
        : null,
    memberName: memberFullName || null,
    expenses: expensesRaw
      ? expensesRaw.map((x) => mapExpenseFromApi((x ?? {}) as Record<string, unknown>))
      : undefined,
  };
}

function mapPagedFromApi<T>(
  raw: Record<string, unknown>,
  mapItem: (x: Record<string, unknown>) => T
): PaginationResponse<T> {
  const items = ((raw['items'] ?? raw['Items']) as unknown[] | undefined) ?? [];
  return {
    pageNumber: Number(raw['pageNumber'] ?? raw['PageNumber'] ?? 1),
    pageSize: Number(raw['pageSize'] ?? raw['PageSize'] ?? 10),
    totalItems: Number(raw['totalItems'] ?? raw['TotalItems'] ?? 0),
    totalPages: Number(raw['totalPages'] ?? raw['TotalPages'] ?? 0),
    items: items.map((x) => mapItem((x ?? {}) as Record<string, unknown>)),
  };
}

export type TaskReportFilterParams = {
  pageNumber?: number;
  pageSize?: number;
  userId?: number;
  requestId?: number;
  sessionId?: number;
};

export type TaskReportCreatePayload = {
  userId?: number | null;
  requestId: number;
  sessionId?: number | null;
  title: string;
  description: string;
  startAt?: string | null;
  endAt?: string | null;
};

export type TaskReportUpdatePayload = {
  requestId?: number;
  sessionId?: number | null;
  title: string;
  description: string;
  startAt?: string | null;
  endAt?: string | null;
};

export const taskReportApi = {
  async getTaskReports(params?: TaskReportFilterParams): Promise<PaginationResponse<TaskReport>> {
    const res = await axiosClient.get<Record<string, unknown>>('/task-reports/filter', {
      params,
    });
    return mapPagedFromApi((res ?? {}) as unknown as Record<string, unknown>, mapTaskReportFromApi);
  },

  async getById(id: number): Promise<TaskReport> {
    const res = await axiosClient.get<Record<string, unknown>>(`/task-reports/${id}`);
    return mapTaskReportFromApi((res ?? {}) as unknown as Record<string, unknown>);
  },

  async create(payload: TaskReportCreatePayload): Promise<TaskReport> {
    const body: Record<string, unknown> = {
      UserId: payload.userId ?? null,
      RequestId: payload.requestId,
      SessionId: payload.sessionId ?? null,
      Title: payload.title,
      Description: payload.description,
      StartAt: payload.startAt ?? null,
      EndAt: payload.endAt ?? null,
    };
    const res = await axiosClient.post<Record<string, unknown>>('/task-reports', body);
    return mapTaskReportFromApi((res ?? {}) as unknown as Record<string, unknown>);
  },

  async update(id: number, payload: TaskReportUpdatePayload): Promise<TaskReport> {
    const body: Record<string, unknown> = {
      RequestId: payload.requestId,
      SessionId: payload.sessionId ?? null,
      Title: payload.title,
      Description: payload.description,
      StartAt: payload.startAt ?? null,
      EndAt: payload.endAt ?? null,
    };
    const res = await axiosClient.put<Record<string, unknown>>(`/task-reports/${id}`, body);
    return mapTaskReportFromApi((res ?? {}) as unknown as Record<string, unknown>);
  },

  async remove(id: number): Promise<void> {
    await axiosClient.delete(`/task-reports/${id}`);
  },
};

