import { useEffect, useState } from 'react';
import requestService from '../services/requestService';
import type { RequestListItem } from '../request';

export const useRequests = (
  pageNumber: number,
  pageSize: number
) => {
  const [data, setData] = useState<RequestListItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const res = await requestService.getRequests({
          pageNumber,
          pageSize,
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
  }, [pageNumber, pageSize]);

  return { data, totalItems, loading };
};