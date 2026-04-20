import { useCallback, useEffect, useRef, useState } from 'react'
import type { EquipmentListItem } from '../equipment'
import type { PaginationResponse } from '@/shared/types/api'
import { getEquipmentsListCached } from '@/modules/equipment/utils/equipmentListCache'

const SEARCH_DEBOUNCE_MS = 400

/** BE applies EquipmentName and EquipmentCode as AND; send only one per request. */
function searchLooksLikeEquipmentCode(q: string): boolean {
  const t = q.trim()
  if (!t) return false
  if (/^EQ/i.test(t)) return true
  // Mã kiểu TB-01, AB_CD, ...
  if (/^[A-Za-z]{2,4}[-_]/.test(t)) return true
  return false
}

function getEquipmentsListDeduped(
  pageNumber: number,
  pageSize: number,
  equipmentName?: string,
  equipmentCode?: string,
  status?: string,
  categoryId?: number,
  force?: boolean
): Promise<PaginationResponse<EquipmentListItem>> {
  return getEquipmentsListCached({
    pageNumber,
    pageSize,
    equipmentName,
    equipmentCode,
    status,
    categoryId,
    force,
  })
}

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
  /** 'name' | 'code': kênh tìm đang dùng (sau fallback trang 1), để phân trang đúng. */
  const searchModeRef = useRef<'name' | 'code' | null>(null)

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

  useEffect(() => {
    searchModeRef.current = null
  }, [search, categoryId, status])

  const fetchWithMode = useCallback(
    (
      mode: 'name' | 'code',
      q: string,
      page: number,
      force?: boolean
    ): Promise<PaginationResponse<EquipmentListItem>> => {
      if (mode === 'code') {
        return getEquipmentsListDeduped(page, pageSize, undefined, q, status, categoryId, force)
      }
      return getEquipmentsListDeduped(page, pageSize, q, undefined, status, categoryId, force)
    },
    [pageSize, status, categoryId]
  )

  useEffect(() => {
    let cancelled = false

    const runFetch = async () => {
      const qRaw = search.trim()
      const q = qRaw

      try {
        setLoading(true)

        if (!q) {
          searchModeRef.current = null
          const res = await getEquipmentsListDeduped(
            pageNumber,
            pageSize,
            undefined,
            undefined,
            status,
            categoryId
          )
          if (!cancelled) {
            setData(res.items ?? [])
            setTotalItems(res.totalItems ?? 0)
          }
          return
        }

        if (pageNumber === 1) {
          if (searchLooksLikeEquipmentCode(qRaw)) {
            let res = await fetchWithMode('code', q, 1)
            if (res.totalItems === 0 && (res.items?.length ?? 0) === 0) {
              res = await fetchWithMode('name', q, 1)
              if (!cancelled) searchModeRef.current = 'name'
            } else if (!cancelled) {
              searchModeRef.current = 'code'
            }
            if (!cancelled) {
              setData(res.items ?? [])
              setTotalItems(res.totalItems ?? 0)
            }
            return
          }

          let res = await fetchWithMode('name', q, 1)
          if (res.totalItems === 0 && (res.items?.length ?? 0) === 0) {
            res = await fetchWithMode('code', q, 1)
            if (!cancelled) searchModeRef.current = 'code'
          } else if (!cancelled) {
            searchModeRef.current = 'name'
          }
          if (!cancelled) {
            setData(res.items ?? [])
            setTotalItems(res.totalItems ?? 0)
          }
          return
        }

        const mode = searchModeRef.current ?? 'name'
        const res = await fetchWithMode(mode, q, pageNumber)
        if (!cancelled) {
          setData(res.items ?? [])
          setTotalItems(res.totalItems ?? 0)
        }
      } catch (err) {
        if (!cancelled) console.error('fetch equipments error:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    const searchChanged = prevSearchRef.current !== search
    if (searchChanged) prevSearchRef.current = search

    if (searchChanged) {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null
        void runFetch()
      }, SEARCH_DEBOUNCE_MS)
      return () => {
        cancelled = true
        if (debounceRef.current) clearTimeout(debounceRef.current)
      }
    }

    void runFetch()
    return () => {
      cancelled = true
    }
  }, [pageNumber, pageSize, search, status, categoryId, fetchWithMode])

  const refetch = useCallback(async (force?: boolean) => {
    const qRaw = search.trim()
    const q = qRaw

    try {
      setLoading(true)
      if (!q) {
        searchModeRef.current = null
        const res = await getEquipmentsListDeduped(
          pageNumber,
          pageSize,
          undefined,
          undefined,
          status,
          categoryId,
          force
        )
        setData(res.items ?? [])
        setTotalItems(res.totalItems ?? 0)
        return
      }

      if (pageNumber === 1) {
        if (searchLooksLikeEquipmentCode(qRaw)) {
          let res = await fetchWithMode('code', q, 1, force)
          if (res.totalItems === 0 && (res.items?.length ?? 0) === 0) {
            res = await fetchWithMode('name', q, 1, force)
            searchModeRef.current = 'name'
          } else {
            searchModeRef.current = 'code'
          }
          setData(res.items ?? [])
          setTotalItems(res.totalItems ?? 0)
          return
        }

        let res = await fetchWithMode('name', q, 1, force)
        if (res.totalItems === 0 && (res.items?.length ?? 0) === 0) {
          res = await fetchWithMode('code', q, 1, force)
          searchModeRef.current = 'code'
        } else {
          searchModeRef.current = 'name'
        }
        setData(res.items ?? [])
        setTotalItems(res.totalItems ?? 0)
        return
      }

      const mode = searchModeRef.current ?? 'name'
      const res = await fetchWithMode(mode, q, pageNumber, force)
      setData(res.items ?? [])
      setTotalItems(res.totalItems ?? 0)
    } catch (err) {
      console.error('fetch equipments error:', err)
    } finally {
      setLoading(false)
    }
  }, [pageNumber, pageSize, search, status, categoryId, fetchWithMode])

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
