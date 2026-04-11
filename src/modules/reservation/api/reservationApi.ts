import axiosClient from '@/shared/lib/axios';
import { serializeParamsRepeatArray } from '@/shared/lib/paramsSerializer';
import type {
  CheckAvailabilityRequest,
  PagedEquipmentResponse,
  PagedReservationResponse,
  ReservationBulkCreateRequest,
  ReservationCreateRequest,
  ReservationDetail,
  ReservationFilterRequest,
  ReservationUpdateRequest,
} from '../reservation.types';

const reservationApi = {
  getAvailability: (
    params: CheckAvailabilityRequest,
  ): Promise<PagedEquipmentResponse> =>
    axiosClient.get<PagedEquipmentResponse, PagedEquipmentResponse>('/reservations/availability', {
      params,
      paramsSerializer: serializeParamsRepeatArray,
    }),

  getFilter: (params?: ReservationFilterRequest): Promise<PagedReservationResponse> =>
    axiosClient.get<PagedReservationResponse, PagedReservationResponse>('/reservations/filter', {
      params,
    }),

  create: (body: ReservationCreateRequest): Promise<ReservationDetail[]> => {
    const payload: ReservationBulkCreateRequest = {
      Reservations: [body],
    };
    return axiosClient.post<ReservationDetail[], ReservationDetail[]>('/reservations', payload);
  },

  getById: (id: number): Promise<ReservationDetail> =>
    axiosClient.get<ReservationDetail, ReservationDetail>(`/reservations/${id}`),

  update: (id: number, body: ReservationUpdateRequest): Promise<ReservationDetail> =>
    axiosClient.put<ReservationDetail, ReservationDetail>(`/reservations/${id}`, body),

  remove: (id: number): Promise<void> =>
    axiosClient.delete<void, void>(`/reservations/${id}`),
};

export default reservationApi;
