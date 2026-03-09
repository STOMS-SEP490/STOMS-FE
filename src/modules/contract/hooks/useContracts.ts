import { useEffect, useState } from 'react'
import type { ContractListItem } from '../contract'
import contractApi from '../api/contractApi'

export const useContracts = () => {
  const [data, setData] = useState<ContractListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize] = useState(10)
  const [totalItems, setTotalItems] = useState(0)
  const [isPaid, setIsPaid] = useState<boolean | undefined>(undefined)

  const fetchContracts = async () => {
    try {
      setLoading(true)
      const res = await contractApi.getContracts({
        pageNumber,
        pageSize,
        isPaid,
      })
      setData(res.items ?? [])
      setTotalItems(res.totalItems ?? 0)
    } catch (err) {
      console.error('fetch contracts error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContracts()
  }, [pageNumber, isPaid])

  return {
    data,
    loading,
    pageNumber,
    pageSize,
    totalItems,
    setPageNumber,
    isPaid,
    setIsPaid,
    refetch: fetchContracts,
  }
}
