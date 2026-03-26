import { useEffect, useState } from 'react';
import type { RequestListItem } from '../request';
import requestApi from '../api/requestApi';

export const useRequests = (
  pageNumber: number,
  pageSize: number,
  refreshKey: number = 0,
  options?: {
    statuses?: string[];
  }
) => {
  const [data, setData] = useState<RequestListItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const statusesKey = options?.statuses?.join('|') ?? '';

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const res = await requestApi.getRequests({
          pageNumber,
          pageSize,
          statuses: options?.statuses,
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
  }, [statusesKey, pageNumber, pageSize, refreshKey]);

  return { data, totalItems, loading };
};