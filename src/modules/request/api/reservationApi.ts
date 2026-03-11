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
  /** BE: SessionIds (list). Gửi [sessionId] cho mỗi reservation. */
  sessionIds?: number[];
  sessionId?: number | null;
  startAt: string; // ISO datetime
  endAt: string;   // ISO datetime
  equipment: { equipmentId: number }[];
};

export type ReservedEquipmentItem = {
  equipmentId: number;
  equipmentName: string;
  equipmentCode: string;
  categoryName: string;
  status: string;
  imgLink: string | null;
};

export type ReservationDetail = {
  reservationId: number;
  startAt: string | null;
  endAt: string | null;
  equipment: ReservedEquipmentItem[];
};

export const reservationApi = {
  getAvailability: (
    params: CheckAvailabilityParams
  ): Promise<PaginationResponse<EquipmentListItem>> =>
    axiosClient.get('/reservations/availability', { params }),

  create: (data: ReservationCreatePayload): Promise<{ reservationId: number }> =>
    axiosClient.post('/reservations', data),

  getById: async (id: number): Promise<ReservationDetail> => {
    const raw = (await axiosClient.get<any>(`/reservations/${id}`)) ?? {};
    const equipRaw: any[] =
      raw.equipmentReservations ?? raw.EquipmentReservations ?? [];
    return {
      reservationId: Number(raw.reservationId ?? raw.ReservationId ?? id),
      startAt:
        (raw.startAt ?? raw.StartAt ?? null) != null
          ? String(raw.startAt ?? raw.StartAt)
          : null,
      endAt:
        (raw.endAt ?? raw.EndAt ?? null) != null
          ? String(raw.endAt ?? raw.EndAt)
          : null,
      equipment: equipRaw.map((er) => {
        const eq = er.equipment ?? er.Equipment ?? {};
        return {
          equipmentId: Number(eq.equipmentId ?? eq.EquipmentId ?? 0),
          equipmentName: String(eq.equipmentName ?? eq.EquipmentName ?? ''),
          equipmentCode: String(eq.equipmentCode ?? eq.EquipmentCode ?? ''),
          categoryName: String(eq.categoryName ?? eq.CategoryName ?? '---'),
          status: String(eq.status ?? eq.Status ?? ''),
          imgLink:
            (eq.imgLink ?? eq.ImgLink ?? null) != null
              ? String(eq.imgLink ?? eq.ImgLink)
              : null,
        };
      }),
    };
  },
};
