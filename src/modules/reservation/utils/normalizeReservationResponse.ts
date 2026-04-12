import type {
  CreateByUserReservationResponse,
  EquipmentItemResponse,
  EquipmentReservationItemResponse,
  EquipmentResponse,
  PagedEquipmentResponse,
  PagedReservationResponse,
  ReservationResponse,
  SessionReservationResponse,
} from '../reservation.types';

/** BE có thể trả PascalCase hoặc camelCase (System.Text.Json mặc định). Chuẩn hóa về PascalCase cho UI. */
const pick = <T>(obj: Record<string, unknown>, pascal: string, camel: string): T | undefined =>
  (obj[pascal] as T | undefined) ?? (obj[camel] as T | undefined);

function dateToIsoString(v: unknown): string | null | undefined {
  if (v == null) return null;
  if (typeof v === 'string') return v;
  return String(v);
}

function normalizeCreateByUser(raw: unknown): CreateByUserReservationResponse | null {
  if (raw == null) return null;
  const u = raw as Record<string, unknown>;
  return {
    MemberId: Number(pick(u, 'MemberId', 'memberId') ?? 0),
    UserId: Number(pick(u, 'UserId', 'userId') ?? 0),
    AvatarUrl: (pick(u, 'AvatarUrl', 'avatarUrl') as string | null | undefined) ?? null,
    FullName: (pick(u, 'FullName', 'fullName') as string | null | undefined) ?? null,
    Phone: (pick(u, 'Phone', 'phone') as string | null | undefined) ?? null,
    Email: (pick(u, 'Email', 'email') as string | null | undefined) ?? null,
  };
}

function normalizeEquipmentItem(raw: unknown): EquipmentItemResponse | null {
  if (raw == null) return null;
  const e = raw as Record<string, unknown>;
  return {
    EquipmentId: Number(pick(e, 'EquipmentId', 'equipmentId') ?? 0),
    CategoryId: Number(pick(e, 'CategoryId', 'categoryId') ?? 0),
    CategoryName: (pick(e, 'CategoryName', 'categoryName') as string | null | undefined) ?? null,
    EquipmentName: (pick(e, 'EquipmentName', 'equipmentName') as string | null | undefined) ?? null,
    EquipmentCode: (pick(e, 'EquipmentCode', 'equipmentCode') as string | null | undefined) ?? null,
    Status: (pick(e, 'Status', 'status') as string | null | undefined) ?? null,
    ImgLink: (pick(e, 'ImgLink', 'imgLink') as string | null | undefined) ?? null,
  };
}

function normalizeEquipmentReservationItem(raw: unknown): EquipmentReservationItemResponse {
  const er = raw as Record<string, unknown>;
  return {
    EquipmentId: Number(pick(er, 'EquipmentId', 'equipmentId') ?? 0),
    IsTemporarilyCancelled: pick(er, 'IsTemporarilyCancelled', 'isTemporarilyCancelled') as
      | boolean
      | null
      | undefined,
    CreatedAt: dateToIsoString(pick(er, 'CreatedAt', 'createdAt')),
    Equipment: normalizeEquipmentItem(pick(er, 'Equipment', 'equipment')),
  };
}

function normalizeSessionReservation(raw: unknown): SessionReservationResponse {
  const s = raw as Record<string, unknown>;
  return {
    SessionId: Number(pick(s, 'SessionId', 'sessionId') ?? 0),
    SessionNo: Number(pick(s, 'SessionNo', 'sessionNo') ?? 0),
    StartAt: String(pick(s, 'StartAt', 'startAt') ?? ''),
    EndAt: String(pick(s, 'EndAt', 'endAt') ?? ''),
    Notes: (pick(s, 'Notes', 'notes') as string | null | undefined) ?? null,
    Status: (pick(s, 'Status', 'status') as string | null | undefined) ?? null,
    Location: (pick(s, 'Location', 'location') as string | null | undefined) ?? null,
    IsOnline: pick(s, 'IsOnline', 'isOnline') as boolean | null | undefined,
  };
}

export function normalizeEquipmentResponse(raw: unknown): EquipmentResponse {
  const e = raw as Record<string, unknown>;
  return {
    EquipmentId: Number(pick(e, 'EquipmentId', 'equipmentId') ?? 0),
    CategoryId: Number(pick(e, 'CategoryId', 'categoryId') ?? 0),
    CategoryName: (pick(e, 'CategoryName', 'categoryName') as string | null | undefined) ?? null,
    SponsoredBy: (pick(e, 'SponsoredBy', 'sponsoredBy') as string | null | undefined) ?? null,
    EquipmentName: (pick(e, 'EquipmentName', 'equipmentName') as string | null | undefined) ?? null,
    EquipmentCode: (pick(e, 'EquipmentCode', 'equipmentCode') as string | null | undefined) ?? null,
    HandoverMinute: (pick(e, 'HandoverMinute', 'handoverMinute') as string | null | undefined) ?? null,
    Status: (pick(e, 'Status', 'status') as string | null | undefined) ?? null,
    Description: (pick(e, 'Description', 'description') as string | null | undefined) ?? null,
    ImgLink: (pick(e, 'ImgLink', 'imgLink') as string | null | undefined) ?? null,
    CreatedAt: dateToIsoString(pick(e, 'CreatedAt', 'createdAt')),
  };
}

export function normalizeEquipmentPagedResponse(
  raw: PagedEquipmentResponse | Record<string, unknown>,
): PagedEquipmentResponse {
  const r = raw as Record<string, unknown>;
  const itemsRaw =
    (pick(r, 'Items', 'items') as unknown[] | null | undefined) ??
    (r.Items as unknown[]) ??
    (r.items as unknown[]) ??
    [];
  return {
    PageNumber: Number(pick(r, 'PageNumber', 'pageNumber') ?? 0),
    PageSize: Number(pick(r, 'PageSize', 'pageSize') ?? 0),
    TotalItems: Number(pick(r, 'TotalItems', 'totalItems') ?? 0),
    TotalPages: Number(pick(r, 'TotalPages', 'totalPages') ?? 0),
    Items: itemsRaw.map((item) => normalizeEquipmentResponse(item)),
  };
}

export function normalizeReservationResponse(raw: ReservationResponse | Record<string, unknown>): ReservationResponse {
  const r = raw as Record<string, unknown>;
  const erRaw = pick(r, 'EquipmentReservations', 'equipmentReservations');
  const sessionsRaw = pick(r, 'Sessions', 'sessions');

  let equipmentReservations: EquipmentReservationItemResponse[] | null;
  if (erRaw == null) {
    equipmentReservations = null;
  } else if (Array.isArray(erRaw)) {
    equipmentReservations = erRaw.map(normalizeEquipmentReservationItem);
  } else {
    equipmentReservations = null;
  }

  const totalEqRaw = pick(r, 'TotalEquipments', 'totalEquipments');
  const totalEquipments =
    totalEqRaw == null || totalEqRaw === ''
      ? null
      : Number(totalEqRaw);

  return {
    ReservationId: Number(pick(r, 'ReservationId', 'reservationId') ?? 0),
    CreatedByMemberId: (pick(r, 'CreatedByMemberId', 'createdByMemberId') as number | null | undefined) ?? null,
    IsTemporarilyCancelled: pick(r, 'IsTemporarilyCancelled', 'isTemporarilyCancelled') as boolean | null | undefined,
    StartAt: dateToIsoString(pick(r, 'StartAt', 'startAt')),
    EndAt: dateToIsoString(pick(r, 'EndAt', 'endAt')),
    CreatedAt: dateToIsoString(pick(r, 'CreatedAt', 'createdAt')),
    TotalEquipments: Number.isFinite(totalEquipments) ? totalEquipments : null,
    CreatedByUser: normalizeCreateByUser(pick(r, 'CreatedByUser', 'createdByUser')),
    EquipmentReservations: equipmentReservations,
    Sessions:
      sessionsRaw == null
        ? null
        : Array.isArray(sessionsRaw)
          ? sessionsRaw.map(normalizeSessionReservation)
          : null,
  };
}

export function normalizeReservationPagedResponse(
  raw: PagedReservationResponse | Record<string, unknown>,
): PagedReservationResponse {
  const r = raw as Record<string, unknown>;
  const itemsRaw =
    (pick(r, 'Items', 'items') as unknown[] | null | undefined) ??
    (r.Items as unknown[]) ??
    (r.items as unknown[]) ??
    [];
  return {
    PageNumber: Number(pick(r, 'PageNumber', 'pageNumber') ?? 0),
    PageSize: Number(pick(r, 'PageSize', 'pageSize') ?? 0),
    TotalItems: Number(pick(r, 'TotalItems', 'totalItems') ?? 0),
    TotalPages: Number(pick(r, 'TotalPages', 'totalPages') ?? 0),
    Items: itemsRaw.map((item) => normalizeReservationResponse(item as ReservationResponse)),
  };
}
