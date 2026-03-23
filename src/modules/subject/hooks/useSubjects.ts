import { useCallback, useEffect, useState } from 'react'
import type { SubjectListItem } from '../subject'
import subjectApi from '../api/subjectApi'

export type UseSubjectsOptions = {
  /** Mặc định 10; trang chỉ đọc TL/Teacher truyền 6 vì hàng có 2 dòng (tên + mô tả) */
  pageSize?: number
  /** Điều khiển từ layout (search cùng hàng tab) — phải truyền cả hai */
  search?: string
  setSearch?: (v: string) => void
}

export const useSubjects = (options?: UseSubjectsOptions) => {
  const [data, setData] = useState<SubjectListItem[]>([])
  const [loading, setLoading] = useState(false)

  const [internalSearch, setInternalSearch] = useState('')
  const setSearchParent = options?.setSearch
  const controlled =
    typeof setSearchParent === 'function' && typeof options?.search === 'string'
  const search = controlled ? options!.search! : internalSearch

  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize] = useState(options?.pageSize ?? 10)
  const [totalItems, setTotalItems] = useState(0)

  const setSearch = useCallback(
    (v: string) => {
      setPageNumber(1)
      if (controlled && setSearchParent) {
        setSearchParent(v)
      } else if (!controlled) {
        setInternalSearch(v)
      }
    },
    [controlled, setSearchParent],
  )

  const fetchSubjects = async () => {
    try {
      setLoading(true)

      const res = await subjectApi.getSubjects({
        pageNumber,
        pageSize,
        subjectName: search.trim() || undefined,
      })

      setData(res.items ?? [])
      setTotalItems(res.totalItems ?? 0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(() => {
      void fetchSubjects()
    }, 300)
    return () => clearTimeout(t)
  }, [pageNumber, pageSize, search])

  return {
    data,
    loading,
    search,
    setSearch,
    pageNumber,
    pageSize,
    totalItems,
    setPageNumber,
    refetch: fetchSubjects,
  }
}