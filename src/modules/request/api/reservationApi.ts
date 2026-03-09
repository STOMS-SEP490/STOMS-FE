import axiosClient from '@/shared/lib/axios';
import type { PaginationResponse } from '@/shared/types/api';
import type { EquipmentListItem } from '@/modules/equipment/equipment';

export type CheckAvailabilityParams = {
  startAt: string; // ISO datetime
  endAt: string;   // ISO datetime
  search?: string; // tìm theo EquipmentName hoặc EquipmentCode (OR)
  pageNumber?: number;
  pageSize?: number;
};

export type ReservationCreatePayload = {
  createdByMemberId: number;
  sessionId?: number | null;
  startAt: string; // ISO datetime
  endAt: string;   // ISO datetime
  equipment: { equipmentId: number }[];
};

export const reservationApi = {
  getAvailability: (
    params: CheckAvailabilityParams
  ): Promise<PaginationResponse<EquipmentListItem>> =>
    axiosClient.get('/reservations/availability', { params }),

  create: (data: ReservationCreatePayload): Promise<{ reservationId: number }> =>
    axiosClient.post('/reservations', data),
};
