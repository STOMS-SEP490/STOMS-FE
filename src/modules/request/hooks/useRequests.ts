import { useEffect, useState } from 'react';
import type { RequestListItem } from '../request';
import requestApi from '../api/requestApi';

export const useRequests = (
  pageNumber: number,
  pageSize: number,
  refreshKey: number = 0,
  options?: {
    statuses?: string[];
    assignmentStatuses?: string[];
    programCoordinatorId?: number;
    isAssignmentApprovalNeeded?: boolean;
  }
) => {
  const [data, setData] = useState<RequestListItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const statusesKey = options?.statuses?.join('|') ?? '';
  const assignmentStatusesKey = options?.assignmentStatuses?.join('|') ?? '';
  const programCoordinatorIdKey = String(options?.programCoordinatorId ?? '');
  const isAssignmentApprovalNeededKey = String(options?.isAssignmentApprovalNeeded ?? '');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const res = await requestApi.getRequests({
          pageNumber,
          pageSize,
          programCoordinatorId: options?.programCoordinatorId,
          statuses: options?.statuses,
          assignmentStatuses: options?.assignmentStatuses,
          isAssignmentApprovalNeeded: options?.isAssignmentApprovalNeeded,
        });

        setData(res.items ?? []);
        setTotalItems(res.totalItems ?? 0);
      } catch (err) {
        console.error('fetch requests error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [
    statusesKey,
    assignmentStatusesKey,
    programCoordinatorIdKey,
    isAssignmentApprovalNeededKey,
    pageNumber,
    pageSize,
    refreshKey,
  ]);

  return { data, totalItems, loading };
};