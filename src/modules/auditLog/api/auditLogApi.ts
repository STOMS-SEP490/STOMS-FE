import axiosClient from '@/shared/lib/axios';
import type { PaginationResponse } from '@/shared/types/api';

export type AuditLogItem = {
  logId: number;
  userId: number;
  action: string;
  entityType: string;
  entityId: number | null;
  description: string;
  createdAt: string | null;
  user?: {
    userId: number;
    email: string;
    member?: {
      fullName?: string;
    } | null;
  } | null;
};

export type AuditLogFilterParams = {
  pageNumber?: number;
  pageSize?: number;
  action?: string;
  entityType?: string;
};

export const auditLogApi = {
  getAuditLogs: (
    params?: AuditLogFilterParams
  ): Promise<PaginationResponse<AuditLogItem>> =>
    axiosClient.get('/audit-logs/filter', { params }),
};

