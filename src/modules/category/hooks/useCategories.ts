import { useCallback, useEffect, useRef, useState } from 'react'
import type { CategoryListItem } from '../category'
import categoryApi from '../api/categoryApi'

const SEARCH_DEBOUNCE_MS = 400

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

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true)
      const res = await categoryApi.getCategories({
        pageNumber,
        pageSize,
        categoryName: search.trim() || undefined,
      })
      setData(res.items ?? [])
      setTotalItems(res.totalItems ?? 0)
    } catch (err) {
      console.error('fetch categories error:', err)
    } finally {
      setLoading(false)
    }
  }, [pageNumber, pageSize, search])

  const prevSearchRef = useRef(search)

  useEffect(() => {
    const searchChanged = prevSearchRef.current !== search
    if (searchChanged) prevSearchRef.current = search

    if (searchChanged) {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(fetchCategories, SEARCH_DEBOUNCE_MS)
      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
      }
    } else {
      fetchCategories()
    }
  }, [pageNumber, search, fetchCategories])

  return {
    data,
    loading,
    search,
    setSearch: setSearchAndResetPage,
    pageNumber,
    pageSize,
    totalItems,
    setPageNumber,
    refetch: fetchCategories,
  }
}
