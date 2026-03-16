import { useCallback, useEffect, useRef, useState } from 'react'
import type { EquipmentListItem } from '../equipment'
import equipmentApi from '../api/equipmentApi'

const SEARCH_DEBOUNCE_MS = 400

export function useEquipments() {
  const [data, setData] = useState<EquipmentListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize] = useState(10)
  const [totalItems, setTotalItems] = useState(0)
  const [status, setStatus] = useState<string | undefined>(undefined)
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevSearchRef = useRef(search)

  const setSearchAndResetPage = useCallback((value: string) => {
    setSearch(value)
    setPageNumber(1)
  }, [])

  const setFiltersAndResetPage = useCallback(
    (updates: { status?: string; categoryId?: number | null }) => {
      if ('status' in updates) setStatus(updates.status ?? undefined)
      if ('categoryId' in updates) setCategoryId(updates.categoryId ?? undefined)
      setPageNumber(1)
    },
    []
  )

  const resetFilters = useCallback(() => {
    setSearch('')
    setStatus(undefined)
    setCategoryId(undefined)
    setPageNumber(1)
  }, [])

  const fetchEquipments = useCallback(async () => {
    try {
      setLoading(true)
      const res = await equipmentApi.getEquipments({
        pageNumber,
        pageSize,
        equipmentName: search.trim() || undefined,
        status: status || undefined,
        categoryId: categoryId ?? undefined,
      })
      setData(res.items ?? [])
      setTotalItems(res.totalItems ?? 0)
    } catch (err) {
      console.error('fetch equipments error:', err)
    } finally {
      setLoading(false)
    }
  }, [pageNumber, pageSize, search, status, categoryId])

  useEffect(() => {
    const searchChanged = prevSearchRef.current !== search
    if (searchChanged) prevSearchRef.current = search

    if (searchChanged) {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(fetchEquipments, SEARCH_DEBOUNCE_MS)
      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
      }
    } else {
      fetchEquipments()
    }
  }, [pageNumber, search, status, categoryId, fetchEquipments])

  return {
    data,
    loading,
    search,
    setSearch: setSearchAndResetPage,
    status,
    setStatus,
    categoryId,
    setCategoryId,
    setFiltersAndResetPage,
    resetFilters,
    pageNumber,
    pageSize,
    totalItems,
    setPageNumber,
    refetch: fetchEquipments,
  }
}
