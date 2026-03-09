export type ContractUserItem = {
  email: string
  roleId: number
  member: {
    memberId: number
    avatarUrl: string
    fullName: string
    phone: string
    address: string
    cin: string
    bankCode: string
    bankName: string
    taxNumber: string
  }
}

export type ContractSessionItem = {
  sessionNo: number
  startAt: string
  endAt: string
  status: string
  location: string
  isOnline: boolean | null
}

export type ContractListItem = {
  contractId: number
  createdByMemberId: number
  sessionId: number
  amount: number | null
  contractCode: string
  isPaid: boolean | null
  createdAt: string | null
  updatedAt: string | null
  createdByUser: ContractUserItem
  session: ContractSessionItem
}

export type ContractFilterParams = {
  pageNumber?: number
  pageSize?: number
  contractId?: number
  isPaid?: boolean
}

