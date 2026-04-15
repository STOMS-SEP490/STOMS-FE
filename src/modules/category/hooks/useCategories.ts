import { useCallback, useEffect, useRef, useState } from 'react'
import type { CategoryListItem } from '../category'
import categoryApi from '../api/categoryApi'
import type { PaginationResponse } from '@/shared/types/api'

const SEARCH_DEBOUNCE_MS = 400

type CategoriesListKey = string

function categoriesListKey(
  pageNumber: number,
  pageSize: number,
  categoryName?: string
): CategoriesListKey {
  const name = (categoryName ?? '').trim().toLowerCase()
  return `${pageNumber}|${pageSize}|${name}`
}

/** Deduplicate concurrent list requests with the same params (e.g. React StrictMode). */
const categoriesListInflight = new Map<
  CategoriesListKey,
  Promise<PaginationResponse<CategoryListItem>>
>()

function getCategoriesListDeduped(
  pageNumber: number,
  pageSize: number,
  categoryName?: string
): Promise<PaginationResponse<CategoryListItem>> {
  const trimmed = categoryName?.trim()
  const key = categoriesListKey(pageNumber, pageSize, trimmed)
  const existing = categoriesListInflight.get(key)
  if (existing) return existing
  const p = categoryApi
    .getCategories({
      pageNumber,
      pageSize,
      categoryName: trimmed || undefined,
    })
    .finally(() => {
      categoriesListInflight.delete(key)
    })
  categoriesListInflight.set(key, p)
  return p
}

export function useCategories() {
  const [data, setData] = useState<CategoryListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [pageNumber, setPageNumber] = useState(1)

  const setSearchAndResetPage = useCallback((value: string) => {
    setSearch(value)
    setPageNumber(1)
  }, [])
  const [pageSize] = useState(10)
  const [totalItems, setTotalItems] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevSearchRef = useRef(search)

  useEffect(() => {
    let cancelled = false

    const runFetch = async () => {
      try {
        setLoading(true)
        const res = await getCategoriesListDeduped(
          pageNumber,
          pageSize,
          search.trim() || undefined
        )
        if (!cancelled) {
          setData(res.items ?? [])
          setTotalItems(res.totalItems ?? 0)
        }
      } catch (err) {
        if (!cancelled) console.error('fetch categories error:', err)
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
  }, [pageNumber, pageSize, search])

  const refetch = useCallback(async () => {
    try {
      setLoading(true)
      const res = await getCategoriesListDeduped(
        pageNumber,
        pageSize,
        search.trim() || undefined
      )
      setData(res.items ?? [])
      setTotalItems(res.totalItems ?? 0)
    } catch (err) {
      console.error('fetch categories error:', err)
    } finally {
      setLoading(false)
    }
  }, [pageNumber, pageSize, search])

  return {
    data,
    loading,
    search,
    setSearch: setSearchAndResetPage,
    pageNumber,
    pageSize,
    totalItems,
    setPageNumber,
    refetch,
  }
}
