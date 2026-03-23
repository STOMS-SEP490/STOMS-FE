import { useCallback, useEffect, useRef, useState } from 'react'
import type { BorrowingListItem } from '../borrowing'
import borrowingApi from '../api/borrowingApi'

const SEARCH_DEBOUNCE_MS = 400

export function useBorrowings(options?: { borrowedByMemberId?: number }) {
  const [data, setData] = useState<BorrowingListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize] = useState(10)
  const [totalItems, setTotalItems] = useState(0)
  const [status, setStatus] = useState<string | undefined>(undefined)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevSearchRef = useRef(search)

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
      setLoading(true)
      const res = await borrowingApi.getBorrowings({
        pageNumber,
        pageSize,
        status: status || undefined,
        description: search.trim() || undefined,
        note: search.trim() || undefined,
        borrowedByMemberId: options?.borrowedByMemberId,
      })
      setData(res.items ?? [])
      setTotalItems(res.totalItems ?? 0)
    } catch (err) {
      console.error('fetch borrowings error:', err)
    } finally {
      setLoading(false)
    }
  }, [pageNumber, pageSize, search, status, options?.borrowedByMemberId])

  useEffect(() => {
    const searchChanged = prevSearchRef.current !== search
    if (searchChanged) prevSearchRef.current = search

    if (searchChanged) {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(fetchBorrowings, SEARCH_DEBOUNCE_MS)
      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
      }
    } else {
      fetchBorrowings()
    }
  }, [pageNumber, search, status, fetchBorrowings])

  return {
    data,
    loading,
    search,
    setSearch: setSearchAndResetPage,
    status,
    setStatus: setStatusAndResetPage,
    resetFilters,
    pageNumber,
    pageSize,
    totalItems,
    setPageNumber,
    refetch: fetchBorrowings,
  }
}
