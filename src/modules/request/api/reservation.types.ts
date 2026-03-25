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
  isTemporarilyCancelled?: boolean;
  createdAt?: string | null;
  equipment: ReservationEquipmentItem;
};

export type ReservationResponse = {
  reservationId: number;
  createdByMemberId?: number | null;
  isTemporarilyCancelled?: boolean | null;
  startAt?: string | null;
  endAt?: string | null;
  createdAt?: string | null;
  equipmentReservations: EquipmentReservationItem[];
};

// UI-friendly flattened equipment item for "Danh sách thiết bị mượn trước".
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

