export type CategoryEquipmentItem = {
  equipmentId: number
  equipmentName: string
  equipmentCode: string
  status: string
}

export type CategoryListItem = {
  categoryId: number
  categoryName: string
  description: string
  createdAt: string | null
  equipment?: CategoryEquipmentItem[] | null
  // Một số API filter có thể trả tổng số thiết bị thay vì danh sách chi tiết
  equipmentCount?: number | null
  totalEquipments?: number | null
}

export type CategoryFilterParams = {
  pageNumber?: number
  pageSize?: number
  categoryId?: number
  categoryName?: string
}

