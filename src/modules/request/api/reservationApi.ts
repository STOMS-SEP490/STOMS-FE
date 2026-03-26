import axiosClient from '@/shared/lib/axios';
import type { PaginationResponse } from '@/shared/types/api';
import type {
  CheckAvailabilityParams,
  ReservationFilterParams,
  ReservationListItem,
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

  getFilter: async (
    params: ReservationFilterParams
  ): Promise<PaginationResponse<ReservationListItem>> => {
    const queryParams: Record<string, unknown> = {
      reservationId: params.reservationId,
      isTemporarilyCancelled: params.isTemporarilyCancelled,
      createdByMemberId: params.createdByMemberId,
      startAt: params.startAt,
      endAt: params.endAt,
      pageNumber: params.pageNumber,
      pageSize: params.pageSize,
    };

    // Avoid sending `undefined` query params (can cause BE model binding issues).
    for (const [k, v] of Object.entries(queryParams)) {
      if (v === undefined) delete queryParams[k];
    }

    // axiosClient interceptor returns `data`, but TS still types it as AxiosResponse.
    // Use axios generics to model the transformed return type.
    const raw = (await axiosClient.get<any, any>('/reservations/filter', { params: queryParams })) ?? {};
    const itemsRaw: any[] = raw.items ?? raw.Items ?? [];

    const items: ReservationListItem[] = (itemsRaw ?? []).map((r: any) => {
      const createdByUserRaw =
        r?.createdByUser ?? r?.CreatedByUser ?? r?.createdByuser ?? r?.CreatedByuser ?? null;

      // Backend thường trả EquipmentReservations; một số trường hợp FE có thể nhận dạng khác.
      const equipmentReservationsRaw =
        r?.equipmentReservations ??
        r?.EquipmentReservations ??
        r?.equipmentReservation ??
        r?.EquipmentReservation ??
        [];

      const equipmentCount = Array.isArray(equipmentReservationsRaw) ? equipmentReservationsRaw.length : 0;

      return {
        reservationId: Number(r?.reservationId ?? r?.ReservationId ?? 0),
        startAt:
          (r?.startAt ?? r?.StartAt ?? null) != null ? String(r?.startAt ?? r?.StartAt) : null,
        endAt: (r?.endAt ?? r?.EndAt ?? null) != null ? String(r?.endAt ?? r?.EndAt) : null,
        equipmentCount,
        isTemporarilyCancelled:
          (r?.isTemporarilyCancelled ?? r?.IsTemporarilyCancelled ?? null) != null
            ? Boolean(r?.isTemporarilyCancelled ?? r?.IsTemporarilyCancelled)
            : null,
        createdByUser:
          createdByUserRaw != null
            ? {
                memberId:
                  (createdByUserRaw?.memberId ?? createdByUserRaw?.MemberId) != null
                    ? Number(createdByUserRaw?.memberId ?? createdByUserRaw?.MemberId)
                    : undefined,
                userId:
                  (createdByUserRaw?.userId ?? createdByUserRaw?.UserId) != null
                    ? Number(createdByUserRaw?.userId ?? createdByUserRaw?.UserId)
                    : undefined,
                avatarUrl: createdByUserRaw?.avatarUrl ?? createdByUserRaw?.AvatarUrl ?? undefined,
                fullName: String(
                  createdByUserRaw?.fullName ?? createdByUserRaw?.FullName ?? createdByUserRaw?.name ?? '',
                ),
                phone: createdByUserRaw?.phone ?? createdByUserRaw?.Phone ?? undefined,
              }
            : null,
      };
    });

    return {
      pageNumber: Number(raw.pageNumber ?? raw.PageNumber ?? params.pageNumber ?? 1),
      pageSize: Number(raw.pageSize ?? raw.PageSize ?? params.pageSize ?? 10),
      totalItems: Number(raw.totalItems ?? raw.TotalItems ?? 0),
      totalPages: Number(raw.totalPages ?? raw.TotalPages ?? 1),
      items,
    };
  },

  getById: async (id: number): Promise<ReservationDetail> => {
    // axiosClient response interceptor already returns `response.data`
    const raw = (await axiosClient.get<any, any>(`/reservations/${id}`)) ?? {};
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

    const sessionsRaw: any[] = raw.sessions ?? raw.Sessions ?? [];

    const equipmentReservations = equipRaw.map((er) => {
      const eq = er?.equipment ?? er?.Equipment ?? null;
      const equipmentId =
        eq?.equipmentId ??
        eq?.equipment_id ??
        eq?.EquipmentId ??
        eq?.EquipmentID ??
        er?.equipmentId ??
        er?.EquipmentId ??
        er?.equipment_id ??
        er?.EquipmentID ??
        0;
      return {
        equipmentId: Number(equipmentId),
        isTemporarilyCancelled:
          (er?.isTemporarilyCancelled ?? er?.IsTemporarilyCancelled ?? null) != null
            ? Boolean(er?.isTemporarilyCancelled ?? er?.IsTemporarilyCancelled)
            : null,
        createdAt:
          (er?.createdAt ?? er?.CreatedAt ?? null) != null
            ? String(er?.createdAt ?? er?.CreatedAt)
            : null,
        equipment:
          eq != null
            ? {
                equipmentId: Number(eq?.equipmentId ?? eq?.EquipmentId ?? equipmentId),
                equipmentName: String(eq?.equipmentName ?? eq?.EquipmentName ?? ''),
                equipmentCode: String(eq?.equipmentCode ?? eq?.EquipmentCode ?? ''),
                categoryName: String(eq?.categoryName ?? eq?.CategoryName ?? '---'),
                categoryId:
                  (eq?.categoryId ?? eq?.CategoryId ?? null) != null
                    ? Number(eq?.categoryId ?? eq?.CategoryId)
                    : undefined,
                status: String(eq?.status ?? eq?.Status ?? ''),
                imgLink:
                  (eq?.imgLink ?? eq?.ImgLink ?? null) != null
                    ? String(eq?.imgLink ?? eq?.ImgLink)
                    : null,
              }
            : null,
      };
    });

    const equipmentFlat = equipmentReservations
      .map((er) => er.equipment)
      .filter((x): x is NonNullable<typeof x> => x != null);

    return {
      reservationId: Number(raw.reservationId ?? raw.ReservationId ?? id),
      createdByMemberId:
        (raw.createdByMemberId ?? raw.CreatedByMemberId ?? null) != null
          ? Number(raw.createdByMemberId ?? raw.CreatedByMemberId)
          : null,
      startAt:
        (raw.startAt ?? raw.StartAt ?? null) != null
          ? String(raw.startAt ?? raw.StartAt)
          : null,
      endAt:
        (raw.endAt ?? raw.EndAt ?? null) != null
          ? String(raw.endAt ?? raw.EndAt)
          : null,
      createdAt:
        (raw.createdAt ?? raw.CreatedAt ?? null) != null
          ? String(raw.createdAt ?? raw.CreatedAt)
          : null,
      createdByUser: raw.createdByUser ?? raw.CreatedByUser ?? null,
      isTemporarilyCancelled:
        (raw.isTemporarilyCancelled ?? raw.IsTemporarilyCancelled ?? null) != null
          ? Boolean(raw.isTemporarilyCancelled ?? raw.IsTemporarilyCancelled)
          : null,
      equipment: equipmentFlat,
      equipmentReservations,
      sessions: (sessionsRaw ?? []).map((s) => ({
        sessionId: Number(s?.sessionId ?? s?.SessionId ?? 0),
        sessionNo: Number(s?.sessionNo ?? s?.SessionNo ?? 0),
        startAt: String(s?.startAt ?? s?.StartAt ?? ''),
        endAt: String(s?.endAt ?? s?.EndAt ?? ''),
        notes: String(s?.notes ?? s?.Notes ?? ''),
        status: String(s?.status ?? s?.Status ?? ''),
        location: String(s?.location ?? s?.Location ?? ''),
        isOnline:
          (s?.isOnline ?? s?.IsOnline ?? null) != null
            ? Boolean(s?.isOnline ?? s?.IsOnline)
            : null,
      })),
    };
  },
};

export default reservationApi;
