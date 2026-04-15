import { useEffect, useState } from 'react';
import borrowingApi from '@/modules/equipment/api/borrowingApi';

export type BorrowingsListStats = {
  total: number;
  active: number;
  returned: number;
  overdue: number;
};

export function useBorrowingsListStats() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<BorrowingsListStats>({
    total: 0,
    active: 0,
    returned: 0,
    overdue: 0,
  });

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      try {
        const [totalRaw, borrowedRaw, partialRaw, returnedRaw, overdueRaw] = await Promise.all([
          borrowingApi.getBorrowings({ pageNumber: 1, pageSize: 1 }),
          borrowingApi.getBorrowings({ pageNumber: 1, pageSize: 1, status: 'Borrowed' }),
          borrowingApi.getBorrowings({ pageNumber: 1, pageSize: 1, status: 'PartialReturned' }),
          borrowingApi.getBorrowings({ pageNumber: 1, pageSize: 1, status: 'Returned' }),
          borrowingApi.getBorrowings({ pageNumber: 1, pageSize: 1, status: 'Overdue' }),
        ]);

        if (cancelled) return;
        setStats({
          total: totalRaw.totalItems ?? 0,
          active: (borrowedRaw.totalItems ?? 0) + (partialRaw.totalItems ?? 0),
          returned: returnedRaw.totalItems ?? 0,
          overdue: overdueRaw.totalItems ?? 0,
        });
      } catch {
        // giữ 0
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return { loading, stats };
}
