import axiosClient from '@/shared/lib/axios';
import type { PaginationResponse } from '@/shared/types/api';
import type {
  TaskReport,
  TaskReportFilterParams,
  TaskReportCreatePayload,
  TaskReportUpdatePayload,
} from '../taskReport';

/** Format datetime cho BE: local, không kèm Z (tránh UTC). */
export function formatTaskReportDateTime(
  isoOrDate: string | null | undefined
): string | undefined {
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

export const taskReportApi = {
  getTaskReports: (
    params?: TaskReportFilterParams
  ): Promise<PaginationResponse<TaskReport>> =>
    axiosClient.get('/task-reports/filter', { params }),

  getById: (id: number): Promise<TaskReport> =>
    axiosClient.get(`/task-reports/${id}`),

  create: (payload: TaskReportCreatePayload): Promise<TaskReport> =>
    axiosClient.post('/task-reports', {
      RequestId: payload.requestId ?? null,
      SessionId: payload.sessionId ?? null,
      Title: payload.title,
      Description: payload.description,
      StartAt: payload.startAt ?? null,
      EndAt: payload.endAt ?? null,
    }),

  update: (id: number, payload: TaskReportUpdatePayload): Promise<TaskReport> => {
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
    return axiosClient.put(`/task-reports/${id}`, body);
  },

  remove: (id: number): Promise<void> =>
    axiosClient.delete(`/task-reports/${id}`),
};
