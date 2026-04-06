import { useCallback, useEffect, useState } from 'react';
import type { CourseListItem } from '../courseType';
import courseApi from '../api/courseApi';

export type UseCoursesOptions = {
  pageSize?: number;
  /** Điều khiển từ layout (search cùng hàng tab) — truyền cả `search` và `setSearch` */
  search?: string;
  setSearch?: (v: string) => void;
  /** true: non-manager — gọi filter với IsActive=true */
  activeOnly?: boolean;
};

export function useCourses(options?: UseCoursesOptions) {
  const [data, setData] = useState<CourseListItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [internalSearch, setInternalSearch] = useState('');
  const setSearchParent = options?.setSearch;
  const controlled =
    typeof setSearchParent === 'function' && typeof options?.search === 'string';
  const search = controlled ? options!.search! : internalSearch;

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(options?.pageSize ?? 10);
  const [totalItems, setTotalItems] = useState(0);
  const activeOnly = Boolean(options?.activeOnly);

  const setSearch = useCallback(
    (v: string) => {
      setPageNumber(1);
      if (controlled && setSearchParent) {
        setSearchParent(v);
      } else if (!controlled) {
        setInternalSearch(v);
      }
    },
    [controlled, setSearchParent],
  );

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await courseApi.getCourses({
        pageNumber,
        pageSize,
        CourseName: search.trim() || undefined,
        ...(activeOnly ? { IsActive: true } : {}),
      });
      setData(res.items ?? []);
      setTotalItems(res.totalItems ?? 0);
    } finally {
      setLoading(false);
    }
  }, [pageNumber, pageSize, search, activeOnly]);

  useEffect(() => {
    const t = setTimeout(() => {
      void fetchCourses();
    }, 300);
    return () => clearTimeout(t);
  }, [fetchCourses]);

  return {
    data,
    loading,
    search,
    setSearch,
    pageNumber,
    pageSize,
    totalItems,
    setPageNumber,
    refetch: fetchCourses,
  };
}
