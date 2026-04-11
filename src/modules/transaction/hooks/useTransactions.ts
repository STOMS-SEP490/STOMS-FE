import { useEffect, useState } from 'react';
import type { TransactionListItem } from '../transaction';
import transactionApi from '../api/transactionApi';

export type UseTransactionsParams = {
  pageNumber: number;
  pageSize: number;
  transactionType?: number;
  walletId?: number;
  /** false: không gọi API (dùng cho instance toolbar khi layout có 2 Outlet) */
  enabled?: boolean;
};

/**
 * Fetch theo tham số truyền vào. Filter/pagination nên lấy từ URL để đồng bộ khi cùng route
 * mount 2 lần (toolbar + content).
 */
export const useTransactions = ({
  pageNumber,
  pageSize,
  transactionType,
  walletId,
  enabled = true,
}: UseTransactionsParams) => {
  const [data, setData] = useState<TransactionListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const res = await transactionApi.getTransactions({
          pageNumber,
          pageSize,
          transactionType,
          walletId,
        });
        setData(res.items ?? []);
        setTotalItems(res.totalItems ?? 0);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('fetch transactions error:', err);
      } finally {
        setLoading(false);
      }
    };

    void fetchTransactions();
  }, [enabled, pageNumber, pageSize, transactionType, walletId]);

  const refetch = async () => {
    if (!enabled) return;
    try {
      setLoading(true);
      const res = await transactionApi.getTransactions({
        pageNumber,
        pageSize,
        transactionType,
        walletId,
      });
      setData(res.items ?? []);
      setTotalItems(res.totalItems ?? 0);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('fetch transactions error:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    data,
    loading,
    totalItems,
    refetch,
  };
};
