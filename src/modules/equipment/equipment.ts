export type EquipmentBorrowingItem = {
  equipmentBorrowingId: number
  status: string
  checkoutAt: string | null
  checkinAt: string | null
  receivedByMemberId: number | null
}

export type EquipmentReservationItem = {
  reservationId: number
  startAt: string | null
  endAt: string | null
  createdAt: string | null
  createdByMemberId: number | null
}

export type EquipmentBorrowingHistoryItem = {
  borrowingId?: number
  status?: string
  returnedDueDate?: string | null
  createdAt?: string | null
  description?: string | null
  note?: string | null
  totalEquipments?: number
  borrowedByMemberId?: number
  lentByMemberId?: number
  borrowedByMember?: { fullName?: string | null; avatarUrl?: string | null; phone?: string | null } | null
  lentByMember?: { fullName?: string | null; avatarUrl?: string | null; phone?: string | null } | null
  borrowingEquipmentDetail?: Array<{
    equipmentBorrowingId?: number
    borrowingId?: number
    equipmentId?: number
    status?: string
    checkoutAt?: string | null
    checkinAt?: string | null
    receivedByMemberId?: number | null
    receivedByMember?: { fullName?: string | null } | null
  }> | null
}

export type EquipmentListItem = {
  equipmentId: number
  categoryId: number
  sponsoredBy: string
  equipmentName: string
  equipmentCode: string
  handoverMinute: string
  status: string
  description: string
  imgLink?: string | null
  createdAt: string | null
  currentBorrowings?: EquipmentBorrowingItem[] | null
  upcomingReservations?: EquipmentReservationItem[] | null
  /** BE getById bổ sung lịch sử mượn */
  historyborrowing?: EquipmentBorrowingHistoryItem[] | null
  historyBorrowing?: EquipmentBorrowingHistoryItem[] | null
  historyBorrowings?: EquipmentBorrowingHistoryItem[] | null
}

export type EquipmentFilterParams = {
  pageNumber?: number
  pageSize?: number
  equipmentId?: number
  equipmentCode?: string
  equipmentName?: string
  categoryId?: number
  status?: string
}

export type EquipmentCreatePayload = {
  categoryId: number
  sponsoredBy: string
  equipmentName: string
  equipmentCode: string
  description?: string
  // BE expects multipart/form-data fields named:
  // - Img (optional)
  // - HandoverMinuteImg (required)
  imgFile?: File | null
  handoverMinuteImgFile: File
}

export type EquipmentUpdatePayload = {
  categoryId: number
  sponsoredBy: string
  equipmentName: string
  equipmentCode: string
  description?: string
  imgFile?: File | null
  handoverMinuteImgFile?: File | null
}

