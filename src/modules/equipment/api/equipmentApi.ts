import axiosClient from '@/shared/lib/axios'
import type { PaginationResponse } from '@/shared/types/api'
import type { EquipmentFilterParams, EquipmentListItem } from '../equipment'

const equipmentApi = {
  // GET PAGED + FILTER
  getEquipments: async (
    params?: EquipmentFilterParams
  ): Promise<PaginationResponse<EquipmentListItem>> => {
    const res = await axiosClient.get<
      PaginationResponse<EquipmentListItem>,
      PaginationResponse<EquipmentListItem>
    >(
      '/equipment/filter',
      { params }
    )
    return res
  },

  // GET BY ID
  getById: async (id: number): Promise<EquipmentListItem> => {
    const res = await axiosClient.get<EquipmentListItem, EquipmentListItem>(
      `/equipment/${id}`
    )
    return res
  },

  // CREATE
  create: async (
    data: Partial<EquipmentListItem>
  ): Promise<EquipmentListItem> => {
    const res = await axiosClient.post<EquipmentListItem, EquipmentListItem>(
      '/equipment',
      {
        categoryId: data.categoryId,
        sponsoredBy: data.sponsoredBy ?? '',
        equipmentName: data.equipmentName ?? '',
        equipmentCode: data.equipmentCode ?? '',
        handoverMinute: data.handoverMinute ?? '',
        description: data.description ?? '',
        imgLink: data.imgLink ?? null,
      }
    )
    return res
  },

  // UPDATE INFO
  updateInfo: (
    id: number,
    data: Partial<EquipmentListItem>
  ): Promise<EquipmentListItem> =>
    axiosClient
      .put<EquipmentListItem, EquipmentListItem>(`/equipment/${id}/info`, {
        categoryId: data.categoryId,
        sponsoredBy: data.sponsoredBy ?? '',
        equipmentName: data.equipmentName ?? '',
        equipmentCode: data.equipmentCode ?? '',
        handoverMinute: data.handoverMinute ?? '',
        description: data.description ?? '',
        imgLink: data.imgLink ?? null,
      })
      .then((res) => res),

  // UPDATE STATUS
  updateStatus: (
    id: number,
    data: { status: string }
  ): Promise<EquipmentListItem> =>
    axiosClient
      .put<EquipmentListItem, EquipmentListItem>(`/equipment/${id}/status`, {
        status: data.status,
      })
      .then((res) => res),
}

export default equipmentApi

