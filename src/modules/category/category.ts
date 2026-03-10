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
  totalEquipment?: number | null
}

export type CategoryFilterParams = {
  pageNumber?: number
  pageSize?: number
  categoryId?: number
  categoryName?: string
}

