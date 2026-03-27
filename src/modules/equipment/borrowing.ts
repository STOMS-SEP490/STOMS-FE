/**
 * Borrowing (phiếu mượn) - lịch sử mượn thiết bị
 * Backend: BorrowingStatus 1=Borrowed, 2=PartialReturned, 3=Returned, 4=Overdue
 */
export type BorrowingFilterParams = {
  pageNumber?: number
  pageSize?: number
  status?: string
  description?: string
  note?: string
  borrowedByMemberId?: number
  lentByMemberId?: number
}

export type MemberBorrowing = {
  memberId: number
  userId: number
  avatarUrl?: string | null
  fullName?: string | null
  email?: string | null
  phone?: string | null
  team?: { teamId: number; teamName: string } | null
}

export type BorrowingEquipmentDetail = {
  equipmentBorrowingId: number
  borrowingId: number
  equipmentId: number
  status: string
  checkoutAt: string | null
  checkinAt: string | null
  receivedByMemberId: number | null
  equipment?: {
    equipmentId: number
    equipmentName: string
    equipmentCode: string
    categoryId: number
    categoryName?: string
    status: string
    imgLink?: string | null
  } | null
}

export type BorrowingListItem = {
  borrowingId: number
  status: string
  description?: string | null
  note?: string | null
  borrowedByMemberId: number
  lentByMemberId: number
  returnedDueDate: string | null
  createdAt: string | null
  borrowedByMember?: MemberBorrowing | null
  lentByMember?: MemberBorrowing | null
  borrowingEquipmentDetail?: BorrowingEquipmentDetail[] | null
}

export type BorrowingCreatePayload = {
  description?: string
  note?: string
  borrowedByMemberId: number
  lentByMemberId: number
  returnedDueDate: string // ISO string
  equipmentIds: number[]
  sessionIds?: number[]
}
