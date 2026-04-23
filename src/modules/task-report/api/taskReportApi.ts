import axiosClient from '@/shared/lib/axios';
import type { PaginationResponse } from '@/shared/types/api';
import type {
  TaskReport,
  TaskReportFilterParams,
  TaskReportCreatePayload,
  TaskReportUpdatePayload,
  TaskReportExpense,
  ExpenseCreatePayload,
  ExpenseUpdatePayload,
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
  getAll: (params?: TaskReportFilterParams): Promise<PaginationResponse<TaskReport>> => {
    const requestIdNormalized =
      (params as unknown as { RequestId?: number | undefined })?.RequestId ?? params?.requestId;
    const sessionIdNormalized =
      (params as unknown as { SessionId?: number | undefined })?.SessionId ?? params?.sessionId;

    const queryParams = {
      ...params,
      RequestId: requestIdNormalized,
      SessionId: sessionIdNormalized,
      start: params?.start ?? params?.startAt,
      end: params?.end ?? params?.endAt,
    };
    delete (queryParams as { requestId?: number }).requestId;
    delete (queryParams as { sessionId?: number }).sessionId;
    return axiosClient.get('/task-reports/filter', { params: queryParams });
  },

  getById: (id: number): Promise<TaskReport> =>
    axiosClient.get(`/task-reports/${id}`),

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

  update: (id: number, payload: TaskReportUpdatePayload): Promise<TaskReport> =>
    axiosClient.put(`/task-reports/${id}`, {
      RequestId: payload.requestId ?? null,
      SessionId: payload.sessionId ?? null,
      Title: payload.title,
      Description: payload.description,
      StartAt: formatLocalDateTime(payload.startAt) ?? null,
      EndAt: formatLocalDateTime(payload.endAt) ?? null,
    }),

  remove: (id: number): Promise<void> =>
    axiosClient.delete(`/task-reports/${id}`),

  getExpenses: (params?: ExpenseFilterParams): Promise<PaginationResponse<TaskReportExpense>> =>
    axiosClient.get('/expenses/filter', { params }),

  getExpenseById: (id: number): Promise<TaskReportExpense> =>
    axiosClient.get(`/expenses/${id}`),

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

  removeExpense: (id: number): Promise<void> =>
    axiosClient.delete(`/expenses/${id}`),

  updateExpense: async (id: number, payload: ExpenseUpdatePayload): Promise<TaskReportExpense> => {
    const fd = new FormData();
    fd.append('Amount', String(payload.amount));
    fd.append('Description', payload.description);
    if (payload.paymentImg) fd.append('PaymentImg', payload.paymentImg);
    return axiosClient.put(`/expenses/${id}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
