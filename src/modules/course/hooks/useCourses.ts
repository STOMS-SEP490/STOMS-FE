import { useCallback, useEffect, useState } from 'react';
import type { CourseListItem } from '../courseType';
import courseApi from '../api/courseApi';

export type CourseListStatusFilter = 'all' | 'active' | 'inactive';

export type UseCoursesOptions = {
  pageSize?: number;
  /** Điều khiển từ layout (search cùng hàng tab) — truyền cả `search` và `setSearch` */
  search?: string;
  setSearch?: (v: string) => void;
  /** true: non-manager — gọi filter với IsActive=true (bỏ qua statusFilter) */
  activeOnly?: boolean;
  /** Cùng layout 2 Outlet — đồng bộ filter trạng thái với layout */
  statusFilter?: CourseListStatusFilter;
  setStatusFilter?: (v: CourseListStatusFilter) => void;
  /** Cùng layout 2 Outlet — đồng bộ phân trang */
  pageNumber?: number;
  setPageNumber?: (n: number) => void;
};

export function useCourses(options?: UseCoursesOptions) {
  const [data, setData] = useState<CourseListItem[]>([]);
  const [loading, setLoading] = useState(false);
  /** Tránh flash "Không có dữ liệu" trước lần fetch đầu tiên. */
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

  const setStatusFilterParent = options?.setStatusFilter;
  const statusControlled =
    typeof setStatusFilterParent === 'function' && typeof options?.statusFilter !== 'undefined';
  const [internalStatusFilter, setInternalStatusFilter] = useState<CourseListStatusFilter>('all');
  const statusFilter = statusControlled ? options!.statusFilter! : internalStatusFilter;

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

  const setFiltersAndResetPage = useCallback(
    (updates: { statusFilter?: CourseListStatusFilter }) => {
      if ('statusFilter' in updates && updates.statusFilter !== undefined) {
        if (statusControlled && setStatusFilterParent) {
          setStatusFilterParent(updates.statusFilter);
        } else {
          setInternalStatusFilter(updates.statusFilter);
        }
      }
      if (pageControlled && setPageParent) {
        setPageParent(1);
      } else {
        setInternalPage(1);
      }
    },
    [statusControlled, setStatusFilterParent, pageControlled, setPageParent],
  );

  const resetFilters = useCallback(() => {
    setSearch('');
    if (statusControlled && setStatusFilterParent) {
      setStatusFilterParent('all');
    } else {
      setInternalStatusFilter('all');
    }
    if (pageControlled && setPageParent) {
      setPageParent(1);
    } else {
      setInternalPage(1);
    }
  }, [setSearch, statusControlled, setStatusFilterParent, pageControlled, setPageParent]);

  const isActiveForApi: boolean | undefined = activeOnly
    ? true
    : statusFilter === 'all'
      ? undefined
      : statusFilter === 'active';

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await courseApi.getCourses({
        pageNumber,
        pageSize,
        CourseName: search.trim() || undefined,
        ...(isActiveForApi !== undefined ? { IsActive: isActiveForApi } : {}),
      });
      setData(res.items ?? []);
      setTotalItems(res.totalItems ?? 0);
    } finally {
      setLoading(false);
      setHasFetchedOnce(true);
    }
  }, [pageNumber, pageSize, search, isActiveForApi]);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      void fetchCourses();
    }, 300);
    return () => clearTimeout(t);
  }, [fetchCourses]);

  const isListBlocking = loading || !hasFetchedOnce;

  return {
    data,
    loading,
    isListBlocking,
    search,
    setSearch,
    statusFilter,
    setFiltersAndResetPage,
    resetFilters,
    pageNumber,
    pageSize,
    totalItems,
    setPageNumber,
    refetch: fetchCourses,
  };
}
