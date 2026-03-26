import axiosClient from '@/shared/lib/axios';
import { serializeParamsRepeatArray } from '@/shared/lib/paramsSerializer';
import type { PaginationResponse } from '@/shared/types/api';
import type {
  CheckAvailabilityParams,
  ReservationFilterParams,
  ReservationListItem,
  ReservationCreatePayload,
  ReservationDetail,
} from '../../request/type';
import type { EquipmentListItem } from '@/modules/equipment/equipment';

function mapCreatedByUserFromApi(raw: any): ReservationListItem['createdByUser'] {
  if (!raw) return null;
  return {
    memberId: Number(raw.MemberId ?? raw.memberId ?? 0),
    userId: Number(raw.UserId ?? raw.userId ?? 0),
    avatarUrl: raw.AvatarUrl ?? raw.avatarUrl ?? null,
    fullName: raw.FullName ?? raw.fullName ?? '',
    phone: raw.Phone ?? raw.phone ?? null,
  };
}

function mapReservationEquipmentItemFromApi(raw: any) {
  const eq = raw?.Equipment ?? raw?.equipment ?? null;
  return {
    equipmentId: Number(raw.EquipmentId ?? raw.equipmentId ?? 0),
    isTemporarilyCancelled: raw.IsTemporarilyCancelled ?? raw.isTemporarilyCancelled ?? null,
    createdAt: raw.CreatedAt ?? raw.createdAt ?? null,
    equipment: eq
      ? {
          equipmentId: Number(eq.EquipmentId ?? eq.equipmentId ?? 0),
          categoryId: Number(eq.CategoryId ?? eq.categoryId ?? 0),
          categoryName: eq.CategoryName ?? eq.categoryName ?? null,
          equipmentName: eq.EquipmentName ?? eq.equipmentName ?? null,
          equipmentCode: eq.EquipmentCode ?? eq.equipmentCode ?? null,
          status: eq.Status ?? eq.status ?? null,
          imgLink: eq.ImgLink ?? eq.imgLink ?? null,
        }
      : ({} as any),
  };
}

function mapSessionReservationItemFromApi(raw: any) {
  return {
    sessionId: Number(raw.SessionId ?? raw.sessionId ?? 0),
    sessionNo: Number(raw.SessionNo ?? raw.sessionNo ?? 0),
    startAt: raw.StartAt ?? raw.startAt ?? '',
    endAt: raw.EndAt ?? raw.endAt ?? '',
    notes: raw.Notes ?? raw.notes ?? '',
    status: raw.Status ?? raw.status ?? '',
    location: raw.Location ?? raw.location ?? '',
    isOnline: raw.IsOnline ?? raw.isOnline ?? null,
  };
}

function mapReservationDetailFromApi(raw: any): ReservationDetail {
  const equipmentReservationsRaw = raw?.EquipmentReservations ?? raw?.equipmentReservations ?? [];
  const sessionsRaw = raw?.Sessions ?? raw?.sessions ?? [];

  return {
    reservationId: Number(raw.ReservationId ?? raw.reservationId ?? 0),
    createdByMemberId: raw.CreatedByMemberId ?? raw.createdByMemberId ?? null,
    isTemporarilyCancelled: raw.IsTemporarilyCancelled ?? raw.isTemporarilyCancelled ?? null,
    startAt: raw.StartAt ?? raw.startAt ?? null,
    endAt: raw.EndAt ?? raw.endAt ?? null,
    createdAt: raw.CreatedAt ?? raw.createdAt ?? null,
    createdByUser: mapCreatedByUserFromApi(raw.CreatedByUser ?? raw.createdByUser),
    equipmentReservations: (equipmentReservationsRaw ?? []).map(mapReservationEquipmentItemFromApi),
    sessions: (sessionsRaw ?? []).map(mapSessionReservationItemFromApi),
  };
}

function mapReservationListItemFromApi(raw: any): ReservationListItem {
  const detail = mapReservationDetailFromApi(raw);
  return {
    reservationId: detail.reservationId,
    createdByUser: detail.createdByUser,
    startAt: detail.startAt,
    endAt: detail.endAt,
    createdAt: detail.createdAt,
    isTemporarilyCancelled: detail.isTemporarilyCancelled,
    equipmentCount: detail.equipmentReservations.length,
  };
}

function mapEquipmentListItemFromApi(raw: any): EquipmentListItem {
  const currentBorrowingsRaw = raw?.CurrentBorrowings ?? raw?.currentBorrowings ?? null;
  const upcomingReservationsRaw = raw?.UpcomingReservations ?? raw?.upcomingReservations ?? null;

  return {
    equipmentId: Number(raw.EquipmentId ?? raw.equipmentId ?? 0),
    categoryId: Number(raw.CategoryId ?? raw.categoryId ?? 0),
    sponsoredBy: raw.SponsoredBy ?? raw.sponsoredBy ?? '',
    equipmentName: raw.EquipmentName ?? raw.equipmentName ?? '',
    equipmentCode: raw.EquipmentCode ?? raw.equipmentCode ?? '',
    handoverMinute: raw.HandoverMinute ?? raw.handoverMinute ?? '',
    status: raw.Status ?? raw.status ?? '',
    description: raw.Description ?? raw.description ?? '',
    imgLink: raw.ImgLink ?? raw.imgLink ?? null,
    createdAt: raw.CreatedAt ?? raw.createdAt ?? null,
    currentBorrowings: (currentBorrowingsRaw ?? []).map((x: any) => ({
      equipmentBorrowingId: Number(x.EquipmentBorrowingId ?? x.equipmentBorrowingId ?? 0),
      status: x.Status ?? x.status ?? '',
      checkoutAt: x.CheckoutAt ?? x.checkoutAt ?? null,
      checkinAt: x.CheckinAt ?? x.checkinAt ?? null,
      receivedByMemberId: x.ReceivedByMemberId ?? x.receivedByMemberId ?? null,
    })),
    upcomingReservations: (upcomingReservationsRaw ?? []).map((x: any) => ({
      reservationId: Number(x.ReservationId ?? x.reservationId ?? 0),
      startAt: x.StartAt ?? x.startAt ?? null,
      endAt: x.EndAt ?? x.endAt ?? null,
      createdAt: x.CreatedAt ?? x.createdAt ?? null,
    })),
  };
}

function toReservationFilterQuery(params: ReservationFilterParams): Record<string, unknown> {
  return {
    ReservationId: params.reservationId,
    IsTemporarilyCancelled: params.isTemporarilyCancelled,
    CreatedByMemberId: params.createdByMemberId,
    StartAt: params.startAt,
    EndAt: params.endAt,
    CreatedAt: params.createdAt,
    PageNumber: params.pageNumber,
    PageSize: params.pageSize,
  };
}

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
    }).then((raw) => {
      const rawObj = raw as unknown as Record<string, unknown>;
      const itemsRaw = (rawObj['items'] ?? rawObj['Items'] ?? []) as Record<string, unknown>[];
      return {
        pageNumber: Number(rawObj['pageNumber'] ?? rawObj['PageNumber'] ?? 1),
        pageSize: Number(rawObj['pageSize'] ?? rawObj['PageSize'] ?? itemsRaw.length),
        totalItems: Number(rawObj['totalItems'] ?? rawObj['TotalItems'] ?? itemsRaw.length),
        totalPages: Number(rawObj['totalPages'] ?? rawObj['TotalPages'] ?? 1),
        items: itemsRaw.map(mapEquipmentListItemFromApi),
      };
    });
  },

  getFilter: async (params: ReservationFilterParams = {}): Promise<PaginationResponse<ReservationListItem>> => {
    const raw = await axiosClient.get('/reservations/filter', {
      params: toReservationFilterQuery(params),
    });
    const rawObj = raw as unknown as Record<string, unknown>;
    const itemsRaw = (rawObj['items'] ?? rawObj['Items'] ?? []) as any[];
    return {
      pageNumber: Number(rawObj['pageNumber'] ?? rawObj['PageNumber'] ?? 1),
      pageSize: Number(rawObj['pageSize'] ?? rawObj['PageSize'] ?? itemsRaw.length),
      totalItems: Number(rawObj['totalItems'] ?? rawObj['TotalItems'] ?? itemsRaw.length),
      totalPages: Number(rawObj['totalPages'] ?? rawObj['TotalPages'] ?? 1),
      items: itemsRaw.map(mapReservationListItemFromApi),
    };
  },

  create: async (data: ReservationCreatePayload): Promise<ReservationDetail> => {
    const body = {
      SessionIds: data.sessionIds,
      StartAt: data.startAt,
      EndAt: data.endAt,
      Equipment: data.equipment.map((e) => ({ EquipmentId: e.equipmentId })),
    };
    const raw = await axiosClient.post('/reservations', body);
    return mapReservationDetailFromApi(raw);
  },

  getById: async (id: number): Promise<ReservationDetail> => {
    const raw = await axiosClient.get(`/reservations/${id}`);
    return mapReservationDetailFromApi(raw);
  },
};

export default reservationApi;
