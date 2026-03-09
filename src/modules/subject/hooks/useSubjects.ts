import { useEffect, useState } from 'react'
import type { SubjectListItem } from '../subject'
import subjectApi from '../api/subjectApi'

export const useSubjects = () => {
  const [data, setData] = useState<SubjectListItem[]>([])
  const [loading, setLoading] = useState(false)

  const [search, setSearch] = useState('')
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize] = useState(10)
  const [totalItems, setTotalItems] = useState(0)

  const fetchSubjects = async () => {
    try {
      setLoading(true)

      const res = await subjectApi.getSubjects({
        pageNumber,
        pageSize,
        subjectName: search || undefined,
      })

      setData(res.items ?? [])
      setTotalItems(res.totalItems ?? 0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubjects()
  }, [pageNumber, search])

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