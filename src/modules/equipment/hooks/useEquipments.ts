import { useCallback, useEffect, useState } from 'react'
import type { EquipmentListItem } from '../equipment'
import equipmentApi from '../api/equipmentApi'

export function useEquipments() {
  const [data, setData] = useState<EquipmentListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize] = useState(10)
  const [totalItems, setTotalItems] = useState(0)
  const [status, setStatus] = useState<number | undefined>(undefined)
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined)

  const setSearchAndResetPage = useCallback((value: string) => {
    setSearch(value)
    setPageNumber(1)
  }, [])

  const setFiltersAndResetPage = useCallback(
    (updates: { status?: number; categoryId?: number | null }) => {
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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await equipmentApi.getEquipments({
          pageNumber,
          pageSize,
          EquipmentName: search.trim() || undefined,
          Status: status != null ? String(status) : undefined,
          CategoryId: categoryId,
        })
        setData(res.items ?? [])
        setTotalItems(res.totalItems ?? 0)
      } catch (err) {
        console.error('fetch equipments error:', err)
        setData([])
        setTotalItems(0)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [pageNumber, pageSize, search, status, categoryId])

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await equipmentApi.getEquipments({
        pageNumber,
        pageSize,
        EquipmentName: search.trim() || undefined,
        Status: status != null ? String(status) : undefined,
        CategoryId: categoryId,
      })
      setData(res.items ?? [])
      setTotalItems(res.totalItems ?? 0)
    } catch (err) {
      console.error('fetch equipments error:', err)
      setData([])
      setTotalItems(0)
    } finally {
      setLoading(false)
    }
  }, [pageNumber, pageSize, search, status, categoryId])

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
    refetch,
  }
}
