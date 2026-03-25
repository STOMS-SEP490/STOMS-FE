import axiosClient from '@/shared/lib/axios';
import { serializeParamsRepeatArray } from '@/shared/lib/paramsSerializer';
import type { PaginationResponse } from '@/shared/types/api';
import type {
  CheckAvailabilityParams,
  ReservationCreatePayload,
  ReservationResponse,
} from './type';
import type { EquipmentListItem } from '@/modules/equipment/equipment';

const reservationApi = {
  getAvailability: (
    params: CheckAvailabilityParams
  ): Promise<PaginationResponse<EquipmentListItem>> => {
    return axiosClient.get('/reservations/availability', {
      params: {
        StartAt: params.startAt,
        EndAt: params.endAt,
        CategoryIds: params.categoryIds,
        EquipmentName: params.equipmentName,
        EquipmentCode: params.equipmentCode,
        PageNumber: params.pageNumber,
        PageSize: params.pageSize,
      },
      paramsSerializer: serializeParamsRepeatArray,
    });
  },

  create: (data: ReservationCreatePayload): Promise<{ reservationId: number }> => {
    return axiosClient.post('/reservations', data);
  },

  getById: (id: number): Promise<ReservationResponse> => {
    return axiosClient.get<ReservationResponse, ReservationResponse>(`/reservations/${id}`);
  },
};

export default reservationApi;
