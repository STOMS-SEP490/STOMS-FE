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

