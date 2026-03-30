import axiosClient from '@/shared/lib/axios';
import type { PaginationResponse } from '@/shared/types/api';
import type {
  TaskReport,
  TaskReportFilterParams,
  TaskReportCreatePayload,
  TaskReportUpdatePayload,
  TaskReportExpense,
  ExpenseCreatePayload,
  ExpenseFilterParams,
} from '../taskReport';

function formatLocalDateTime(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export const taskReportApi = {
  /* ──────────── Task Reports ──────────── */

  /** GET /api/task-reports/filter */
  getAll: (params?: TaskReportFilterParams): Promise<PaginationResponse<TaskReport>> => {
    // Backend dùng query param tên `MemberId`, nhưng FE có thể gọi bằng `userId/memberId`.
    const { MemberId, memberId, userId, ...rest } = params ?? {};
    const memberIdNum = MemberId ?? memberId ?? userId;
    return axiosClient.get('/task-reports/filter', {
      params: {
        ...rest,
        ...(memberIdNum != null ? { MemberId: memberIdNum } : {}),
      },
    });
  },

  /** GET /api/task-reports/{id} */
  getById: (id: number): Promise<TaskReport> =>
    axiosClient.get(`/task-reports/${id}`),

  /** POST /api/task-reports (multipart/form-data) */
  create: async (payload: TaskReportCreatePayload): Promise<TaskReport> => {
    const fd = new FormData();
    if (payload.requestId != null) fd.append('RequestId', String(payload.requestId));
    if (payload.sessionId != null) fd.append('SessionId', String(payload.sessionId));
    fd.append('Title', payload.title);
    fd.append('Description', payload.description);
    const start = formatLocalDateTime(payload.startAt);
    const end = formatLocalDateTime(payload.endAt);
    if (start) fd.append('StartAt', start);
    if (end) fd.append('EndAt', end);
    if (payload.expenses?.length) {
      fd.append('ExpensesJson', JSON.stringify(payload.expenses));
    }
    if (payload.paymentImages?.length) {
      for (const file of payload.paymentImages) fd.append('PaymentImgs', file);
    }
    return axiosClient.post('/task-reports', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /** PUT /api/task-reports/{id} (JSON) */
  update: (id: number, payload: TaskReportUpdatePayload): Promise<TaskReport> =>
    axiosClient.put(`/task-reports/${id}`, {
      RequestId: payload.requestId ?? null,
      SessionId: payload.sessionId ?? null,
      Title: payload.title,
      Description: payload.description,
      StartAt: formatLocalDateTime(payload.startAt) ?? null,
      EndAt: formatLocalDateTime(payload.endAt) ?? null,
    }),

  /** DELETE /api/task-reports/{id} */
  remove: (id: number): Promise<void> =>
    axiosClient.delete(`/task-reports/${id}`),

  /* ──────────── Expenses ──────────── */

  /** GET /api/expenses/filter */
  getExpenses: (params?: ExpenseFilterParams): Promise<PaginationResponse<TaskReportExpense>> =>
    axiosClient.get('/expenses/filter', { params }),

  /** GET /api/expenses/{id} */
  getExpenseById: (id: number): Promise<TaskReportExpense> =>
    axiosClient.get(`/expenses/${id}`),

  /** POST /api/expenses (multipart/form-data) */
  addExpense: async (payload: ExpenseCreatePayload): Promise<TaskReportExpense> => {
    const fd = new FormData();
    fd.append('TaskReportId', String(payload.taskReportId));
    fd.append('Amount', String(payload.amount));
    fd.append('Description', payload.description);
    if (payload.paymentImg) fd.append('PaymentImg', payload.paymentImg);
    return axiosClient.post('/expenses', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /** DELETE /api/expenses/{id} */
  removeExpense: (id: number): Promise<void> =>
    axiosClient.delete(`/expenses/${id}`),
};
