import { useEffect, useState } from 'react';
import type { RequestListItem } from '../request';
import requestApi from '../api/requestApi';

export const useTeamLeaderRequests = (
  pageNumber: number,
  pageSize: number,
  refreshKey: number = 0,
  options?: {
    teamId?: number;
    statuses?: string[];
    sessionStatuses?: string[];
    requestTypes?: number[];
    requestCode?: string;
    isNeedingStaffAssignment?: boolean;
  }
) => {
  const [data, setData] = useState<RequestListItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  const teamIdKey = String(options?.teamId ?? '');
  const statusesKey = options?.statuses?.join('|') ?? '';
  const sessionStatusesKey = options?.sessionStatuses?.join('|') ?? '';
  const requestTypesKey = options?.requestTypes?.join('|') ?? '';
  const requestCodeKey = options?.requestCode ?? '';
  const isNeedingStaffAssignmentKey = String(options?.isNeedingStaffAssignment ?? '');

  useEffect(() => {
    // Don't fetch if teamId is not set
    if (!options?.teamId) {
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);

        const res = await requestApi.getRequests({
          pageNumber,
          pageSize,
          teamId: options.teamId,
          statuses: options.statuses,
          sessionStatuses: options.sessionStatuses,
          requestTypes: options.requestTypes,
          requestCode: options.requestCode,
          isNeedingStaffAssignment: options.isNeedingStaffAssignment,
        });

        setData(res.items ?? []);
        setTotalItems(res.totalItems ?? 0);
      } catch (err) {
        console.error('fetch team leader requests error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [
    teamIdKey,
    statusesKey,
    sessionStatusesKey,
    requestTypesKey,
    requestCodeKey,
    isNeedingStaffAssignmentKey,
    pageNumber,
    pageSize,
    refreshKey,
  ]);

  return { data, totalItems, loading };
};
