import { useEffect, useState } from 'react'
import type { TopicListItem } from '../topic'
import topicApi from '../api/topicApi'

export type TopicStatusFilter = 'all' | 'active' | 'inactive'

export const useTopics = () => {
  const [data, setData] = useState<TopicListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TopicStatusFilter>('all')
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize] = useState(10)
  const [totalItems, setTotalItems] = useState(0)

  const fetchTopics = async () => {
    try {
      setLoading(true)
      const res = await topicApi.getTopics({
        pageNumber,
        pageSize,
        TopicName: search.trim() || undefined,
        IsActive:
          statusFilter === 'all'
            ? undefined
            : statusFilter === 'active',
      })
      setData(res.items ?? [])
      setTotalItems(res.totalItems ?? 0)
    } catch (err) {
      console.error('fetch topics error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTopics()
  }, [pageNumber, search, statusFilter])

  return {
    data,
    loading,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    pageNumber,
    pageSize,
    totalItems,
    setPageNumber,
    refetch: fetchTopics,
  }
}
