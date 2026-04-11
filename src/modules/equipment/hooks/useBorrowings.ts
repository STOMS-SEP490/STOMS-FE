import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { BorrowingListItem } from '../borrowing'
import borrowingApi from '../api/borrowingApi'

const SEARCH_DEBOUNCE_MS = 400

type UseBorrowingsOptions = {
  borrowedByMemberId?: number
  /**
   * Controlled params (optional). If provided, hook will use them instead of internal state.
   * Useful when filters are stored in URL query params.
   */
  search?: string
  status?: string
  pageNumber?: number
  pageSize?: number
  enabled?: boolean
}

export function useBorrowings(options?: UseBorrowingsOptions) {
  const [data, setData] = useState<BorrowingListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize] = useState(10)
  const [totalItems, setTotalItems] = useState(0)
  const [status, setStatus] = useState<string | undefined>(undefined)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevSearchRef = useRef('')

  const effective = useMemo(() => {
    const effectiveSearch = options?.search ?? search
    const effectiveStatus = options?.status ?? status
    const effectivePageNumber = options?.pageNumber ?? pageNumber
    const effectivePageSize = options?.pageSize ?? pageSize
    const enabled = options?.enabled ?? true
    return {
      search: effectiveSearch,
      status: effectiveStatus,
      pageNumber: effectivePageNumber,
      pageSize: effectivePageSize,
      enabled,
    }
  }, [options?.enabled, options?.pageNumber, options?.pageSize, options?.search, options?.status, pageNumber, pageSize, search, status])

  const setSearchAndResetPage = useCallback((value: string) => {
    setSearch(value)
    setPageNumber(1)
  }, [])

  const setStatusAndResetPage = useCallback((value: string | undefined) => {
    setStatus(value)
    setPageNumber(1)
  }, [])

  const resetFilters = useCallback(() => {
    setSearch('')
    setStatus(undefined)
    setPageNumber(1)
  }, [])

  const fetchBorrowings = useCallback(async () => {
    try {
      if (!effective.enabled) return
      setLoading(true)
      const res = await borrowingApi.getBorrowings({
        pageNumber: effective.pageNumber,
        pageSize: effective.pageSize,
        status: effective.status || undefined,
        description: effective.search.trim() || undefined,
        note: effective.search.trim() || undefined,
        borrowedByMemberId: options?.borrowedByMemberId,
      })
      setData(res.items ?? [])
      setTotalItems(res.totalItems ?? 0)
    } catch (err) {
      console.error('fetch borrowings error:', err)
    } finally {
      setLoading(false)
    }
  }, [
    effective.enabled,
    effective.pageNumber,
    effective.pageSize,
    effective.search,
    effective.status,
    options?.borrowedByMemberId,
  ])

  useEffect(() => {
    if (!effective.enabled) return
    const searchChanged = prevSearchRef.current !== effective.search
    if (searchChanged) prevSearchRef.current = effective.search

    if (searchChanged) {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(fetchBorrowings, SEARCH_DEBOUNCE_MS)
      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
      }
    } else {
      fetchBorrowings()
    }
  }, [effective.enabled, effective.pageNumber, effective.search, effective.status, fetchBorrowings])

  return {
    data,
    loading,
    search: effective.search,
    setSearch: setSearchAndResetPage,
    status: effective.status,
    setStatus: setStatusAndResetPage,
    resetFilters,
    pageNumber: effective.pageNumber,
    pageSize: effective.pageSize,
    totalItems,
    setPageNumber,
    refetch: fetchBorrowings,
  }
}
