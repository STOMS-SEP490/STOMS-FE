import axiosClient from '@/shared/lib/axios'
import type { PaginationResponse } from '@/shared/types/api'
import type {
  EquipmentCreatePayload,
  EquipmentFilterParams,
  EquipmentListItem,
  EquipmentUpdatePayload,
} from '../equipment'

const equipmentApi = {
  // GET PAGED + FILTER
  getEquipments: async (
    params?: EquipmentFilterParams
  ): Promise<PaginationResponse<EquipmentListItem>> => {
    return (await axiosClient.get('/equipment/filter', { params })) as PaginationResponse<
      EquipmentListItem
    >
  },

  // GET BY ID
  getById: async (id: number): Promise<EquipmentListItem> => {
    return (await axiosClient.get(`/equipment/${id}`)) as EquipmentListItem
  },

  // CREATE
  create: async (
    payload: EquipmentCreatePayload
  ): Promise<EquipmentListItem> => {
    const formData = new FormData()
    formData.append('categoryId', String(payload.categoryId))
    formData.append('sponsoredBy', payload.sponsoredBy ?? '')
    formData.append('equipmentName', payload.equipmentName ?? '')
    formData.append('equipmentCode', payload.equipmentCode ?? '')
    if (payload.description?.trim()) {
      formData.append('description', payload.description.trim())
    }
    if (payload.imgFile) {
      formData.append('Img', payload.imgFile)
    }
    formData.append('HandoverMinuteImg', payload.handoverMinuteImgFile)

    // Axios instance đang set default Content-Type: application/json.
    // Với multipart/form-data, cần để axios/browser tự set Content-Type + boundary.
    return (await axiosClient.post('/equipment', formData, {
      headers: { 'Content-Type': undefined },
    })) as EquipmentListItem
  },

  // UPDATE INFO
  updateInfo: async (
    id: number,
    payload: EquipmentUpdatePayload
  ): Promise<EquipmentListItem> => {
    const formData = new FormData()
    formData.append('categoryId', String(payload.categoryId))
    formData.append('sponsoredBy', payload.sponsoredBy ?? '')
    formData.append('equipmentName', payload.equipmentName ?? '')
    formData.append('equipmentCode', payload.equipmentCode ?? '')
    if (payload.description?.trim()) {
      formData.append('description', payload.description.trim())
    }
    if (payload.imgFile) {
      formData.append('Img', payload.imgFile)
    }
    if (payload.handoverMinuteImgFile) {
      formData.append('HandoverMinuteImg', payload.handoverMinuteImgFile)
    }

    return (await axiosClient.put(`/equipment/${id}/info`, formData, {
      headers: { 'Content-Type': undefined },
    })) as EquipmentListItem
  },

  // UPDATE STATUS
  updateStatus: async (
    id: number,
    data: { status: string }
  ): Promise<EquipmentListItem> => {
    return (await axiosClient.put(`/equipment/${id}/status`, {
      status: data.status,
    })) as EquipmentListItem
  },
}

export default equipmentApi

