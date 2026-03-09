import axiosClient from '@/shared/lib/axios'
import type { PaginationResponse } from '@/shared/types/api'
import type {
  EquipmentFilterParams,
  EquipmentListItem,
} from '../equipment'

const equipmentApi = {
  // GET PAGED + FILTER
  getEquipments: (
    params?: EquipmentFilterParams
  ): Promise<PaginationResponse<EquipmentListItem>> =>
    axiosClient.get('/equipment/filter', { params }),

  // GET BY ID
  getById: (id: number): Promise<EquipmentListItem> =>
    axiosClient.get(`/equipment/${id}`),

  // CREATE
  create: (data: Partial<EquipmentListItem>): Promise<void> =>
    axiosClient.post('/equipment', data),

  // UPDATE INFO
  updateInfo: (
    id: number,
    data: Partial<EquipmentListItem>
  ): Promise<EquipmentListItem> =>
    axiosClient.put(`/equipment/${id}/info`, data),

  // UPDATE STATUS
  updateStatus: (
    id: number,
    data: { status: string }
  ): Promise<EquipmentListItem> =>
    axiosClient.put(`/equipment/${id}/status`, data),
}

export default equipmentApi

