import { useEffect, useState } from 'react';
import type { TransactionListItem } from '../transaction';
import transactionApi from '../api/transactionApi';

export const useTransactions = () => {
  const [data, setData] = useState<TransactionListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [transactionType, setTransactionType] = useState<number | undefined>(undefined);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await transactionApi.getTransactions({
        pageNumber,
        pageSize,
        transactionType,
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

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNumber, transactionType]);

  return {
    data,
    loading,
    pageNumber,
    pageSize,
    totalItems,
    setPageNumber,
    transactionType,
    setTransactionType,
    refetch: fetchTransactions,
  };
};
