import { useEffect, useState } from 'react';
import type { RoleListItem } from '../role';
import roleApi from '../api/roleApi';

export const useRoles = () => {
  const [data, setData] = useState<RoleListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const res = await roleApi.getRoles({
        pageNumber,
        pageSize,
        roleName: search || undefined,
      });
      setData(res.items ?? []);
      setTotalItems(res.totalItems ?? 0);
    } catch (err) {
      console.error('fetch roles error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, [pageNumber, search]);

  return {
    data,
    loading,
    search,
    setSearch,
    pageNumber,
    pageSize,
    totalItems,
    setPageNumber,
    refetch: fetchRoles,
  };
};

