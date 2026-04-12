import { useCallback, useEffect, useState } from 'react';
import type { SubjectListItem } from '../subject';
import subjectApi from '../api/subjectApi';

export type UseSubjectsOptions = {
  pageSize?: number;
  search?: string;
  setSearch?: (v: string) => void;
  /** true: non-manager — gọi filter với IsActive=true */
  activeOnly?: boolean;
  /** Layout 2 Outlet — đồng bộ phân trang */
  pageNumber?: number;
  setPageNumber?: (n: number) => void;
};

export const useSubjects = (options?: UseSubjectsOptions) => {
  const [data, setData] = useState<SubjectListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);

  const [internalSearch, setInternalSearch] = useState('');
  const setSearchParent = options?.setSearch;
  const searchControlled =
    typeof setSearchParent === 'function' && typeof options?.search === 'string';
  const search = searchControlled ? options!.search! : internalSearch;

  const [internalPage, setInternalPage] = useState(1);
  const setPageParent = options?.setPageNumber;
  const pageControlled =
    typeof setPageParent === 'function' && typeof options?.pageNumber === 'number';
  const pageNumber = pageControlled ? options!.pageNumber! : internalPage;

  const [pageSize] = useState(options?.pageSize ?? 10);
  const [totalItems, setTotalItems] = useState(0);
  const activeOnly = Boolean(options?.activeOnly);

  const setSearch = useCallback(
    (v: string) => {
      if (searchControlled && setSearchParent) {
        setSearchParent(v);
      } else {
        setInternalSearch(v);
        setInternalPage(1);
      }
    },
    [searchControlled, setSearchParent],
  );

  const setPageNumber = useCallback(
    (n: number) => {
      if (pageControlled && setPageParent) {
        setPageParent(n);
      } else {
        setInternalPage(n);
      }
    },
    [pageControlled, setPageParent],
  );

  const fetchSubjects = useCallback(async () => {
    try {
      setLoading(true);

      const res = await subjectApi.getSubjects({
        pageNumber,
        pageSize,
        subjectName: search.trim() || undefined,
        ...(activeOnly ? { IsActive: true } : {}),
      });

      setData(res.items ?? []);
      setTotalItems(res.totalItems ?? 0);
    } finally {
      setLoading(false);
      setHasFetchedOnce(true);
    }
  }, [pageNumber, pageSize, search, activeOnly]);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      void fetchSubjects();
    }, 300);
    return () => clearTimeout(t);
  }, [fetchSubjects]);

  const isListBlocking = loading || !hasFetchedOnce;

  return {
    data,
    loading,
    isListBlocking,
    search,
    setSearch,
    pageNumber,
    pageSize,
    totalItems,
    setPageNumber,
    refetch: fetchSubjects,
  };
};
