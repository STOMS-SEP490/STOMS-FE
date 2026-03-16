import { useCallback, useEffect, useRef, useState } from 'react';
import type { EventListItem } from '../event';
import eventApi from '../api/eventApi';

const SEARCH_DEBOUNCE_MS = 400;

export type EventStatusFilter = 'all' | 'active' | 'inactive';

export function useEvents() {
  const [data, setData] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EventStatusFilter>('all');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevSearchRef = useRef(search);

  const setSearchAndResetPage = useCallback((value: string) => {
    setSearch(value);
    setPageNumber(1);
  }, []);

  const setStatusAndResetPage = useCallback((value: EventStatusFilter) => {
    setStatusFilter(value);
    setPageNumber(1);
  }, []);

  const resetFilters = useCallback(() => {
    setSearch('');
    setStatusFilter('all');
    setPageNumber(1);
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await eventApi.getEvents({
        pageNumber,
        pageSize,
        keyword: search.trim() || undefined,
        isActive:
          statusFilter === 'all'
            ? undefined
            : statusFilter === 'active'
              ? true
              : false,
      });
      setData(res.items ?? []);
      setTotalItems(res.totalItems ?? 0);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('fetch events error:', err);
    } finally {
      setLoading(false);
    }
  }, [pageNumber, pageSize, search, statusFilter]);

  useEffect(() => {
    const searchChanged = prevSearchRef.current !== search;
    if (searchChanged) prevSearchRef.current = search;

    if (searchChanged) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(fetchEvents, SEARCH_DEBOUNCE_MS);
      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
    }
    fetchEvents();
  }, [pageNumber, search, statusFilter, fetchEvents]);

  return {
    data,
    loading,
    search,
    setSearch: setSearchAndResetPage,
    statusFilter,
    setStatusFilter: setStatusAndResetPage,
    pageNumber,
    pageSize,
    totalItems,
    setPageNumber,
    resetFilters,
    refetch: fetchEvents,
  };
}

