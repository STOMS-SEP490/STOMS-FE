import { useEffect, useState } from 'react'
import type { SkillListItem } from '../skill'
import skillApi from '../api/skillApi'

export const useSkills = () => {
  const [data, setData] = useState<SkillListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize] = useState(10)
  const [totalItems, setTotalItems] = useState(0)

  const fetchSkills = async () => {
    try {
      setLoading(true)
      const res = await skillApi.getSkills({
        pageNumber,
        pageSize,
        skillName: search || undefined,
      })
      setData(res.items ?? [])
      setTotalItems(res.totalItems ?? 0)
    } catch (err) {
      console.error('fetch skills error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSkills()
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
    refetch: fetchSkills,
  }
}
