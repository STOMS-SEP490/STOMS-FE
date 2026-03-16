import axiosClient from '@/shared/lib/axios'
import type { PaginationResponse } from '@/shared/types/api'
import type { EquipmentFilterParams, EquipmentListItem } from '../equipment'

const equipmentApi = {
  // GET PAGED + FILTER
  getEquipments: async (
    params?: EquipmentFilterParams
  ): Promise<PaginationResponse<EquipmentListItem>> => {
    const res = await axiosClient.get<Record<string, unknown>>(
      '/equipment/filter',
      { params }
    )
    return mapPagedFromApi(res ?? {}, mapEquipmentFromApi)
  },

  // GET BY ID
  getById: async (id: number): Promise<EquipmentListItem> => {
    const res = await axiosClient.get<Record<string, unknown>>(
      `/equipment/${id}`
    )
    return mapEquipmentFromApi((res ?? {}) as Record<string, unknown>)
  },

  // CREATE
  create: async (
    data: Partial<EquipmentListItem>
  ): Promise<EquipmentListItem> => {
    const body = mapEquipmentToCreateBody(data)
    const res = await axiosClient.post<Record<string, unknown>>(
      '/equipment',
      body
    )
    return mapEquipmentFromApi((res ?? {}) as Record<string, unknown>)
  },

  // UPDATE INFO
  updateInfo: (
    id: number,
    data: Partial<EquipmentListItem>
  ): Promise<EquipmentListItem> =>
    axiosClient
      .put<Record<string, unknown>>(`/equipment/${id}/info`, mapEquipmentToInfoUpdateBody(data))
      .then((res) => mapEquipmentFromApi((res ?? {}) as Record<string, unknown>)),

  // UPDATE STATUS
  updateStatus: (
    id: number,
    data: { status: string }
  ): Promise<EquipmentListItem> =>
    axiosClient
      .put<Record<string, unknown>>(`/equipment/${id}/status`, { Status: data.status })
      .then((res) => mapEquipmentFromApi((res ?? {}) as Record<string, unknown>)),
}

export default equipmentApi

/** ===== Helpers: BE PascalCase ↔ FE camelCase ===== */

function mapPagedFromApi<T>(
  raw: Record<string, unknown>,
  mapItem: (x: Record<string, unknown>) => T
): PaginationResponse<T> {
  const items = ((raw['items'] ?? raw['Items']) as unknown[]) ?? []
  return {
    pageNumber: Number(raw['pageNumber'] ?? raw['PageNumber'] ?? 1),
    pageSize: Number(raw['pageSize'] ?? raw['PageSize'] ?? 10),
    totalItems: Number(raw['totalItems'] ?? raw['TotalItems'] ?? 0),
    totalPages: Number(raw['totalPages'] ?? raw['TotalPages'] ?? 0),
    items: items.map((x) =>
      mapItem((x ?? {}) as Record<string, unknown>)
    ),
  }
}

function mapEquipmentFromApi(raw: Record<string, unknown>): EquipmentListItem {
  const borrowings = ((raw['currentBorrowings'] ??
    raw['CurrentBorrowings']) as unknown[]) ?? null
  const reservations = ((raw['upcomingReservations'] ??
    raw['UpcomingReservations']) as unknown[]) ?? null

  return {
    equipmentId: Number(raw['equipmentId'] ?? raw['EquipmentId']),
    categoryId: Number(raw['categoryId'] ?? raw['CategoryId']),
    sponsoredBy: String(raw['sponsoredBy'] ?? raw['SponsoredBy'] ?? ''),
    equipmentName: String(raw['equipmentName'] ?? raw['EquipmentName'] ?? ''),
    equipmentCode: String(raw['equipmentCode'] ?? raw['EquipmentCode'] ?? ''),
    handoverMinute: String(raw['handoverMinute'] ?? raw['HandoverMinute'] ?? ''),
    status: String(raw['status'] ?? raw['Status'] ?? ''),
    description: String(raw['description'] ?? raw['Description'] ?? ''),
    imgLink: (raw['imgLink'] ?? raw['ImgLink'] ?? null) as string | null,
    createdAt: (raw['createdAt'] ?? raw['CreatedAt'] ?? null) as string | null,
    currentBorrowings: borrowings
      ? borrowings.map((x) => mapBorrowingItemFromApi((x ?? {}) as Record<string, unknown>))
      : null,
    upcomingReservations: reservations
      ? reservations.map((x) => mapReservationItemFromApi((x ?? {}) as Record<string, unknown>))
      : null,
  }
}

function mapBorrowingItemFromApi(raw: Record<string, unknown>) {
  return {
    equipmentBorrowingId: Number(
      raw['equipmentBorrowingId'] ?? raw['EquipmentBorrowingId']
    ),
    status: String(raw['status'] ?? raw['Status'] ?? ''),
    checkoutAt: (raw['checkoutAt'] ?? raw['CheckoutAt'] ?? null) as string | null,
    checkinAt: (raw['checkinAt'] ?? raw['CheckinAt'] ?? null) as string | null,
    receivedByMemberId: (raw['receivedByMemberId'] ??
      raw['ReceivedByMemberId'] ??
      null) as number | null,
  }
}

function mapReservationItemFromApi(raw: Record<string, unknown>) {
  return {
    reservationId: Number(raw['reservationId'] ?? raw['ReservationId']),
    startAt: (raw['startAt'] ?? raw['StartAt'] ?? null) as string | null,
    endAt: (raw['endAt'] ?? raw['EndAt'] ?? null) as string | null,
    createdAt: (raw['createdAt'] ?? raw['CreatedAt'] ?? null) as string | null,
    createdByMemberId: (raw['createdByMemberId'] ??
      raw['CreatedByMemberId'] ??
      null) as number | null,
  }
}

function mapEquipmentToCreateBody(data: Partial<EquipmentListItem>) {
  return {
    CategoryId: data.categoryId,
    SponsoredBy: data.sponsoredBy ?? '',
    EquipmentName: data.equipmentName ?? '',
    EquipmentCode: data.equipmentCode ?? '',
    HandoverMinute: data.handoverMinute ?? '',
    Description: data.description ?? '',
    ImgLink: data.imgLink ?? null,
  }
}

function mapEquipmentToInfoUpdateBody(data: Partial<EquipmentListItem>) {
  return {
    CategoryId: data.categoryId,
    SponsoredBy: data.sponsoredBy ?? '',
    EquipmentName: data.equipmentName ?? '',
    EquipmentCode: data.equipmentCode ?? '',
    HandoverMinute: data.handoverMinute ?? '',
    Description: data.description ?? '',
    ImgLink: data.imgLink ?? null,
  }
}

