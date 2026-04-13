import axiosClient from '@/shared/lib/axios';
import { serializeParamsRepeatArray } from '@/shared/lib/paramsSerializer';
import type { PaginationResponse } from '@/shared/types/api';
import type {
  RequestFilterParams,
  RequestListItem,
  CreateRequestPayload,
} from '../request';

const requestApi = {
  getRequests: (
    params?: RequestFilterParams,
  ): Promise<PaginationResponse<RequestListItem>> =>
    axiosClient.get<PaginationResponse<RequestListItem>, PaginationResponse<RequestListItem>>(
      '/requests/filter',
      {
        params: {
          ProgramCoordinatorId: params?.programCoordinatorId,
          RequestId: params?.requestId,
          Statuses: params?.statuses,
          SessionStatuses: params?.sessionStatuses,
          AssignmentStatuses: params?.assignmentStatuses,
          RequireAllAssignmentsHaveStaffMember: params?.requireAllAssignmentsHaveStaffMember,
          TeamId: params?.teamId,
          PageNumber: params?.pageNumber,
          PageSize: params?.pageSize,
        },
        paramsSerializer: serializeParamsRepeatArray,
      },
    ),

  getById: (id: number): Promise<RequestListItem> => {
    return axiosClient.get<RequestListItem, RequestListItem>(`/requests/${id}`);
  },

  create: (data: CreateRequestPayload): Promise<RequestListItem> => {
    return axiosClient.post<RequestListItem, RequestListItem>('/requests', data);
  },

  approve: (
    id: number,
    payload: { approvedByMemberId?: number | null },
  ): Promise<RequestListItem> => {
    return axiosClient.put<RequestListItem, RequestListItem>(
      `/requests/${id}/approve`,
      {
        ApprovedByMemberId: payload.approvedByMemberId ?? null,
      },
    );
  },

  reject: (
    id: number,
    payload: { reason: string; approvedByMemberId?: number | null },
  ): Promise<RequestListItem> => {
    return axiosClient.put<RequestListItem, RequestListItem>(
      `/requests/${id}/reject`,
      {
        Reason: payload.reason,
        ApprovedByMemberId: payload.approvedByMemberId ?? null,
      },
    );
  },

  cancel: (id: number, payload: { reason: string }): Promise<RequestListItem> => {
    return axiosClient.put<RequestListItem, RequestListItem>(`/requests/${id}/cancel`, {
      Reason: payload.reason,
    });
  },

  update: (id: number, data: Partial<CreateRequestPayload>): Promise<void> => {
    return axiosClient.put<void, void>(`/requests/${id}`, data);
  },

  remove: (id: number): Promise<void> => {
    return axiosClient.delete<void, void>(`/requests/${id}`);
  },
};

export default requestApi;