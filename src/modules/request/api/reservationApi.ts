import axiosClient from '@/shared/lib/axios';
import type { PaginationResponse } from '@/shared/types/api';
import type {
  CheckAvailabilityParams,
  ReservationCreatePayload,
  ReservationDetail,
} from './type';
import type { EquipmentListItem } from '@/modules/equipment/equipment';

const reservationApi = {
  getAvailability: (
    params: CheckAvailabilityParams
  ): Promise<PaginationResponse<EquipmentListItem>> => {
    return axiosClient.get('/reservations/availability', { params });
  },

  create: (data: ReservationCreatePayload): Promise<{ reservationId: number }> => {
    return axiosClient.post('/reservations', data);
  },

  getById: async (id: number): Promise<ReservationDetail> => {
    const raw = (await axiosClient.get<any>(`/reservations/${id}`))?.data ?? {};
    // Support multiple BE field names / nesting styles.
    // Some BEs return { equipmentReservations: [{ equipment: {...} }] }
    // Others return { equipment: [{...}] } or similar.
    const equipRaw: any[] =
      raw.equipmentReservations ??
      raw.EquipmentReservations ??
      raw.equipmentReservation ??
      raw.EquipmentReservation ??
      raw.equipment ??
      raw.Equipment ??
      [];
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
        const eq = er?.equipment ?? er?.Equipment ?? er ?? {};
        const equipmentId =
          eq.equipmentId ??
          eq.equipment_id ??
          eq.EquipmentId ??
          eq.EquipmentID ??
          er.equipmentId ??
          er.EquipmentId ??
          er.equipment_id ??
          er.EquipmentID ??
          0;
        return {
          equipmentId: Number(equipmentId),
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

export default reservationApi;
