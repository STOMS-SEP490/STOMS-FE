import type { AttendanceFilterResponse, AttendanceItem } from '@/modules/request/attendance';

function normalizeAttendanceItem(raw: Record<string, unknown>): AttendanceItem {
  return {
    AttendanceId: Number(raw['AttendanceId'] ?? raw['attendanceId'] ?? 0),
    MemberId: Number(raw['MemberId'] ?? raw['memberId'] ?? 0),
    SessionId: Number(raw['SessionId'] ?? raw['sessionId'] ?? 0),
    CheckinAt: (raw['CheckinAt'] ?? raw['checkinAt'] ?? null) as string | null,
    CheckoutAt: (raw['CheckoutAt'] ?? raw['checkoutAt'] ?? null) as string | null,
    AttendanceByMemberId:
      (raw['AttendanceByMemberId'] ?? raw['attendanceByMemberId'] ?? null) as number | null,
    Note: (raw['Note'] ?? raw['note'] ?? null) as string | null,
    imgcheckin:
      (raw['imgcheckin'] ??
        raw['imgCheckin'] ??
        raw['imgCheckIn'] ??
        raw['ImgCheckin'] ??
        raw['ImgCheckIn'] ??
        raw['ImgUrl'] ??
        null) as string | null,
    imgcheckout:
      (raw['imgcheckout'] ??
        raw['imgCheckout'] ??
        raw['imgCheckOut'] ??
        raw['ImgCheckout'] ??
        raw['ImgCheckOut'] ??
        null) as string | null,
  };
}

export function normalizeAttendanceFilterResponse(
  raw: AttendanceFilterResponse | Record<string, unknown>,
): AttendanceFilterResponse {
  const r = (raw ?? {}) as Record<string, unknown>;
  const itemsRaw = ((r['Items'] ?? r['items']) as unknown[] | undefined) ?? [];
  return {
    PageNumber: Number(r['PageNumber'] ?? r['pageNumber'] ?? 1),
    PageSize: Number(r['PageSize'] ?? r['pageSize'] ?? 10),
    TotalItems: Number(r['TotalItems'] ?? r['totalItems'] ?? 0),
    TotalPages: Number(r['TotalPages'] ?? r['totalPages'] ?? 0),
    Items: itemsRaw.map((x) => normalizeAttendanceItem((x ?? {}) as Record<string, unknown>)),
  };
}

