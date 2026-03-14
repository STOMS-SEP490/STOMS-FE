import axiosClient from '@/shared/lib/axios';
import type { PaginationResponse } from '@/shared/types/api';

/** Format datetime cho BE: local, không kèm Z để tránh UTC (theo spec task-report). */
export function formatTaskReportDateTime(isoOrDate: string | null | undefined): string | undefined {
  if (!isoOrDate) return undefined;
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return undefined;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}:${s}`;
}

export type TaskReportExpense = {
  expenseId: number;
  amount?: number | null;
  description?: string | null;
};

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
  expenses?: TaskReportExpense[] | null;
};

function mapExpenseFromApi(raw: Record<string, unknown>): TaskReportExpense {
  return {
    expenseId: Number(raw['expenseId'] ?? raw['ExpenseId'] ?? 0),
    amount: raw['amount'] != null || raw['Amount'] != null ? Number(raw['amount'] ?? raw['Amount']) : null,
    description: raw['description'] != null || raw['Description'] != null ? String(raw['description'] ?? raw['Description']) : null,
  };
}

function mapTaskReportFromApi(raw: Record<string, unknown>): TaskReport {
  const expensesRaw = (raw['expenses'] ?? raw['Expenses']) as unknown[] | undefined;
  const expenses = Array.isArray(expensesRaw)
    ? expensesRaw.map((x) => mapExpenseFromApi((x ?? {}) as Record<string, unknown>))
    : undefined;
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
    expenses: expenses?.length ? expenses : undefined,
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

/**
 * Một khoản chi phí gửi khi tạo báo cáo (ExpensesJson).
 * paymentImgIndex: index 0-based trong mảng PaymentImgs. Bắt buộc nếu có ảnh chứng từ.
 */
export type TaskReportExpenseItem = {
  amount: number;
  /** BE bắt buộc không để trống. */
  description: string;
  /** Index 0-based trỏ vào PaymentImgs. */
  paymentImgIndex?: number;
};

/**
 * Body POST task-reports (multipart/form-data).
 * - RequestId (optional): task chung theo yêu cầu. Nếu có SessionId thì bỏ qua RequestId (BE lấy từ session).
 * - SessionId (optional): task riêng theo phiên. Session phải COMPLETED, member phải có attendance.
 * - Title, Description: bắt buộc, non-empty.
 * - StartAt, EndAt: datetime optional, gửi local không kèm Z (tránh UTC).
 * - ExpensesJson, PaymentImgs: optional (expenses + ảnh chuyển khoản).
 */
export type TaskReportCreatePayload = {
  requestId?: number | null;
  sessionId?: number | null;
  title: string;
  description: string;
  startAt?: string | null;
  endAt?: string | null;
  /** Khoản chi phí phát sinh (gửi dạng ExpensesJson). */
  expenses?: TaskReportExpenseItem[];
  /** Ảnh chứng từ chuyển khoản (gửi dạng PaymentImgs). */
  paymentImages?: File[];
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
    return mapPagedFromApi(res ?? {}, mapTaskReportFromApi);
  },

  async getById(id: number): Promise<TaskReport> {
    const res = await axiosClient.get<Record<string, unknown>>(`/task-reports/${id}`);
    return mapTaskReportFromApi(res ?? {});
  },

  async create(payload: TaskReportCreatePayload): Promise<TaskReport> {
    const form = new FormData();
    if (payload.sessionId != null && payload.sessionId > 0) {
      form.append('SessionId', String(payload.sessionId));
    } else if (payload.requestId != null && payload.requestId > 0) {
      form.append('RequestId', String(payload.requestId));
    }
    form.append('Title', payload.title);
    form.append('Description', payload.description);
    const startAtFormatted = formatTaskReportDateTime(payload.startAt);
    const endAtFormatted = formatTaskReportDateTime(payload.endAt);
    if (startAtFormatted) form.append('StartAt', startAtFormatted);
    if (endAtFormatted) form.append('EndAt', endAtFormatted);
    if (payload.expenses?.length) {
      form.append(
        'ExpensesJson',
        JSON.stringify(
          payload.expenses.map((e) => ({
            amount: e.amount,
            description: (e.description ?? '').trim() || 'Không ghi chú',
            ...(e.paymentImgIndex != null ? { paymentImgIndex: e.paymentImgIndex } : {}),
          }))
        )
      );
    }
    if (payload.paymentImages?.length) {
      payload.paymentImages.forEach((file) => form.append('PaymentImgs', file));
    }
    const res = await axiosClient.post<Record<string, unknown>>('/task-reports', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return mapTaskReportFromApi(res ?? {});
  },

  async update(id: number, payload: TaskReportUpdatePayload): Promise<TaskReport> {
    const body: Record<string, unknown> = {
      Title: payload.title,
      Description: payload.description,
      StartAt: formatTaskReportDateTime(payload.startAt) ?? payload.startAt ?? null,
      EndAt: formatTaskReportDateTime(payload.endAt) ?? payload.endAt ?? null,
    };
    if (payload.sessionId != null && payload.sessionId > 0) {
      body.SessionId = payload.sessionId;
    } else {
      body.RequestId = payload.requestId ?? null;
      body.SessionId = null;
    }
    const res = await axiosClient.put<Record<string, unknown>>(`/task-reports/${id}`, body);
    return mapTaskReportFromApi(res ?? {});
  },

  async remove(id: number): Promise<void> {
    await axiosClient.delete(`/task-reports/${id}`);
  },
};

