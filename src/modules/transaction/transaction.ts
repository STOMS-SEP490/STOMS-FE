export type TransactionListItem = {
  transactionId: number
  amount: number | null
  paymentImg: string
  memberId: number | null
  fundTotal: number | null
  type: string
  taskReportId: number | null
  description: string
  approvalStatus: string
  approvedByMemberId: number | null
  approvedAt: string | null
  rejectedReason: string
}

export type TransactionFilterParams = {
  pageNumber?: number
  pageSize?: number
  transactionId?: number
  type?: string
  approvalStatus?: string
}

