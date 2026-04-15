import { useCallback, useEffect, useState } from 'react';
import type { SubjectListItem } from '../subject';
import subjectApi from '../api/subjectApi';

export type UseSubjectsOptions = {
  pageSize?: number;
  search?: string;
  setSearch?: (v: string) => void;
  /** Filter theo chủ đề */
  topicId?: number | null;
  setTopicId?: (id: number | null) => void;
  /** Filter theo trạng thái */
  statusFilter?: 'all' | 'active' | 'inactive';
  setStatusFilter?: (v: 'all' | 'active' | 'inactive') => void;
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

  const [internalTopicId, setInternalTopicId] = useState<number | null>(null);
  const setTopicIdParent = options?.setTopicId;
  const topicControlled =
    typeof setTopicIdParent === 'function' && 'topicId' in (options ?? {});
  const topicId = topicControlled ? (options?.topicId ?? null) : internalTopicId;

  const [internalStatusFilter, setInternalStatusFilter] =
    useState<'all' | 'active' | 'inactive'>('all');
  const setStatusFilterParent = options?.setStatusFilter;
  const statusControlled =
    typeof setStatusFilterParent === 'function' && 'statusFilter' in (options ?? {});
  const statusFilter = statusControlled
    ? (options?.statusFilter ?? 'all')
    : internalStatusFilter;

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

  const setTopicId = useCallback(
    (id: number | null) => {
      if (topicControlled && setTopicIdParent) {
        setTopicIdParent(id);
      } else {
        setInternalTopicId(id);
        setInternalPage(1);
      }
    },
    [topicControlled, setTopicIdParent],
  );

  const setStatusFilter = useCallback(
    (v: 'all' | 'active' | 'inactive') => {
      if (statusControlled && setStatusFilterParent) {
        setStatusFilterParent(v);
      } else {
        setInternalStatusFilter(v);
        setInternalPage(1);
      }
    },
    [statusControlled, setStatusFilterParent],
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

      const isActiveParam =
        activeOnly ? true : statusFilter === 'all' ? undefined : statusFilter === 'active';

      const res = await subjectApi.getSubjects({
        pageNumber,
        pageSize,
        subjectName: search.trim() || undefined,
        topicId: topicId ?? undefined,
        ...(typeof isActiveParam === 'boolean' ? { IsActive: isActiveParam } : {}),
      });

      setData(res.items ?? []);
      setTotalItems(res.totalItems ?? 0);
    } finally {
      setLoading(false);
      setHasFetchedOnce(true);
    }
  }, [pageNumber, pageSize, search, topicId, activeOnly, statusFilter]);

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
    topicId,
    setTopicId,
    statusFilter,
    setStatusFilter,
    pageNumber,
    pageSize,
    totalItems,
    setPageNumber,
    refetch: fetchSubjects,
  };
};
