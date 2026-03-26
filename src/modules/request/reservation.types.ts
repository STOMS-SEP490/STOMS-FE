export type CreatedByUserReservationResponse = {
  memberId?: number | null;
  userId?: number | null;
  avatarUrl?: string | null;
  fullName?: string | null;
  phone?: string | null;
};

export type ReservationEquipmentItem = {
  equipmentId: number;
  categoryId: number;
  categoryName: string;
  equipmentName: string;
  equipmentCode: string;
  status: string;
  imgLink?: string | null;
};

export type EquipmentReservationItem = {
  equipmentId: number;
  isTemporarilyCancelled?: boolean | null;
  createdAt?: string | null;
  equipment?: ReservationEquipmentItem;
};

export type SessionReservationItem = {
  sessionId: number;
  sessionNo: number;
  startAt: string;
  endAt: string;
  notes: string;
  status: string;
  location: string;
  isOnline?: boolean | null;
};

export type ReservationFilterParams = {
  reservationId?: number | null;
  isTemporarilyCancelled?: boolean | null;
  createdByMemberId?: number | null;
  startAt?: string | null;
  endAt?: string | null;
  createdAt?: string | null;
  pageNumber?: number;
  pageSize?: number;
};

export type ReservationListItem = {
  reservationId: number;
  createdByUser: CreatedByUserReservationResponse | null;
  startAt: string | null;
  endAt: string | null;
  createdAt: string | null;
  isTemporarilyCancelled: boolean | null;
  equipmentCount: number;
};

export type ReservationResponse = {
  reservationId: number;
  createdByMemberId: number | null;
  isTemporarilyCancelled: boolean | null;
  startAt: string | null;
  endAt: string | null;
  createdAt: string | null;
  createdByUser: CreatedByUserReservationResponse | null;
  equipmentReservations: EquipmentReservationItem[];
  sessions: SessionReservationItem[];
};

export type ReservationDetail = ReservationResponse;

export type ReservedEquipmentItem = {
  equipmentId: number;
  equipmentName?: string;
  equipmentCode?: string;
  categoryId?: number;
  categoryName?: string;
  status?: string;
  imgLink?: string | null;
  isTemporarilyCancelled?: boolean;
};

