import { useEffect, useState } from 'react'
import type { TransactionListItem } from '../transaction'
import transactionApi from '../api/transactionApi'

export const useTransactions = () => {
  const [data, setData] = useState<TransactionListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize] = useState(10)
  const [totalItems, setTotalItems] = useState(0)
  const [type, setType] = useState<string | undefined>(undefined)
  const [approvalStatus, setApprovalStatus] = useState<string | undefined>(undefined)

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const res = await transactionApi.getTransactions({
        pageNumber,
        pageSize,
        type,
        approvalStatus,
      })
      setData(res.items ?? [])
      setTotalItems(res.totalItems ?? 0)
    } catch (err) {
      console.error('fetch transactions error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [pageNumber, type, approvalStatus])

  return {
    data,
    loading,
    pageNumber,
    pageSize,
    totalItems,
    setPageNumber,
    type,
    setType,
    approvalStatus,
    setApprovalStatus,
    refetch: fetchTransactions,
  }
}
