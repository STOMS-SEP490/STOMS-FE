import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { ContractListItem } from '../contract'
import contractApi from '../api/contractApi'

export const useContracts = () => {
  const [data, setData] = useState<ContractListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize] = useState(10)
  const [totalItems, setTotalItems] = useState(0)
  const [isPaid, setIsPaid] = useState<boolean | undefined>(undefined)
  const [search, setSearch] = useState('')

  const location = useLocation()
  const isTeacherPage = location.pathname.startsWith('/teacher')
  const memberId =
    Number(JSON.parse(localStorage.getItem('user') || '{}')?.memberId || 0) || undefined

  const fetchContracts = async () => {
    try {
      setLoading(true)
      const params: any = {
        pageNumber,
        pageSize,
        isPaid,
      }
      if (isTeacherPage && memberId) {
        params.createdByMemberId = memberId
      }

      const res = await contractApi.getContracts(params)
      let items = res.items ?? []

      const keyword = search.trim().toLowerCase()
      if (keyword) {
        items = items.filter((c) => {
          const contractCode = c.contractCode?.toLowerCase() ?? ''
          const requestCode = c.request?.requestCode?.toLowerCase() ?? ''
          return contractCode.includes(keyword) || requestCode.includes(keyword)
        })
      }

      setData(items)
      setTotalItems(items.length)
    } catch (err) {
      console.error('fetch contracts error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContracts()
  }, [pageNumber, isPaid, search])

  return {
    data,
    loading,
    pageNumber,
    pageSize,
    totalItems,
    setPageNumber,
    isPaid,
    setIsPaid,
    search,
    setSearch,
    refetch: fetchContracts,
  }
}
