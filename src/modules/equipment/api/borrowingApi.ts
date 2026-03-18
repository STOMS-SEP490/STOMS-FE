import axiosClient from '@/shared/lib/axios'
import type { PaginationResponse } from '@/shared/types/api'
import type {
  BorrowingFilterParams,
  BorrowingListItem,
  BorrowingCreatePayload,
  BorrowingEquipmentDetail,
  MemberBorrowing,
} from '../borrowing'

function mapMemberFromApi(raw: Record<string, unknown>): MemberBorrowing {
  return {
    memberId: Number(raw['memberId'] ?? raw['MemberId'] ?? 0),
    userId: Number(raw['userId'] ?? raw['UserId'] ?? 0),
    avatarUrl: (raw['avatarUrl'] ?? raw['AvatarUrl'] ?? null) as string | null,
    fullName: (raw['fullName'] ?? raw['FullName'] ?? null) as string | null,
    phone: (raw['phone'] ?? raw['Phone'] ?? null) as string | null,
    team: raw['team'] || raw['Team']
      ? {
          teamId: Number(
            (raw['team'] as any)?.teamId ?? (raw['Team'] as any)?.TeamId ?? 0
          ),
          teamName:
            (raw['team'] as any)?.teamName ?? (raw['Team'] as any)?.TeamName ?? '',
        }
      : null,
  }
}

function mapEquipmentDetailFromApi(
  raw: Record<string, unknown>
): BorrowingEquipmentDetail {
  const equipment = raw['equipment'] ?? raw['Equipment']
  return {
    equipmentBorrowingId: Number(
      raw['equipmentBorrowingId'] ?? raw['EquipmentBorrowingId'] ?? 0
    ),
    borrowingId: Number(raw['borrowingId'] ?? raw['BorrowingId'] ?? 0),
    equipmentId: Number(raw['equipmentId'] ?? raw['EquipmentId'] ?? 0),
    status: String(raw['status'] ?? raw['Status'] ?? ''),
    checkoutAt: (raw['checkoutAt'] ?? raw['CheckoutAt'] ?? null) as string | null,
    checkinAt: (raw['checkinAt'] ?? raw['CheckinAt'] ?? null) as string | null,
    receivedByMemberId: (raw['receivedByMemberId'] ??
      raw['ReceivedByMemberId'] ??
      null) as number | null,
    equipment: equipment
      ? {
          equipmentId: Number(
            (equipment as any)?.equipmentId ?? (equipment as any)?.EquipmentId ?? 0
          ),
          equipmentName:
            (equipment as any)?.equipmentName ?? (equipment as any)?.EquipmentName ??
            '',
          equipmentCode:
            (equipment as any)?.equipmentCode ?? (equipment as any)?.EquipmentCode ??
            '',
          categoryId: Number(
            (equipment as any)?.categoryId ?? (equipment as any)?.CategoryId ?? 0
          ),
          categoryName:
            (equipment as any)?.categoryName ?? (equipment as any)?.CategoryName ??
            undefined,
          status:
            (equipment as any)?.status ?? (equipment as any)?.Status ?? '',
          imgLink:
            ((equipment as any)?.imgLink ?? (equipment as any)?.ImgLink) ?? null,
        }
      : null,
  }
}

function mapBorrowingFromApi(
  raw: Record<string, unknown>
): BorrowingListItem {
  const details =
    ((raw['borrowingEquipmentDetail'] ??
      raw['BorrowingEquipmentDetail']) as unknown[]) ?? []

  return {
    borrowingId: Number(raw['borrowingId'] ?? raw['BorrowingId'] ?? 0),
    status: String(raw['status'] ?? raw['Status'] ?? ''),
    description: (raw['description'] ?? raw['Description'] ?? null) as string | null,
    note: (raw['note'] ?? raw['Note'] ?? null) as string | null,
    borrowedByMemberId: Number(
      raw['borrowedByMemberId'] ?? raw['BorrowedByMemberId'] ?? 0
    ),
    lentByMemberId: Number(raw['lentByMemberId'] ?? raw['LentByMemberId'] ?? 0),
    returnedDueDate: (raw['returnedDueDate'] ??
      raw['ReturnedDueDate'] ??
      null) as string | null,
    createdAt: (raw['createdAt'] ?? raw['CreatedAt'] ?? null) as string | null,
    borrowedByMember: raw['borrowedByMember'] || raw['BorrowedByMember']
      ? mapMemberFromApi(
          (raw['borrowedByMember'] ?? raw['BorrowedByMember']) as Record<
            string,
            unknown
          >
        )
      : null,
    lentByMember: raw['lentByMember'] || raw['LentByMember']
      ? mapMemberFromApi(
          (raw['lentByMember'] ?? raw['LentByMember']) as Record<string, unknown>
        )
      : null,
    borrowingEquipmentDetail: details.map((d) =>
      mapEquipmentDetailFromApi((d ?? {}) as Record<string, unknown>)
    ),
  }
}

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
    items: items.map((x) => mapItem((x ?? {}) as Record<string, unknown>)),
  }
}

const borrowingApi = {
  async getBorrowings(
    params?: BorrowingFilterParams
  ): Promise<PaginationResponse<BorrowingListItem>> {
    const res = await axiosClient.get<Record<string, unknown>>(
      '/borrowings/filter',
      { params }
    )
    return mapPagedFromApi(res?.data ?? {}, mapBorrowingFromApi)
  },

  async getById(id: number): Promise<BorrowingListItem> {
    const res = await axiosClient.get<Record<string, unknown>>(
      `/borrowings/${id}`
    )
    return mapBorrowingFromApi((res?.data ?? {}) as Record<string, unknown>)
  },

  async create(data: BorrowingCreatePayload): Promise<BorrowingListItem> {
    const body = {
      Description: data.description ?? '',
      Note: data.note ?? '',
      SessionIds: data.sessionIds ?? [],
      BorrowedByMemberId: data.borrowedByMemberId,
      LentByMemberId: data.lentByMemberId,
      ReturnedDueDate: data.returnedDueDate,
      EquipmentItems: data.equipmentIds.map((id) => ({
        EquipmentId: id,
      })),
    }

    const res = await axiosClient.post<Record<string, unknown>>(
      '/borrowings',
      body
    )
    return mapBorrowingFromApi((res?.data ?? {}) as Record<string, unknown>)
  },
}

export default borrowingApi
