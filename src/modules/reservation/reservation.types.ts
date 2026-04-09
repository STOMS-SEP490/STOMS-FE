/**
 * Reservation API — types khớp BE (PascalCase).
 * @see STOMS.API Models ResponseModel ReservationResponse, EquipmentResponse, RequestModel ReservationRequest
 */

import type { PagedResponse } from '@/modules/request/session.types';

/** BE: CreateByUserReservationResponse */
export type CreateByUserReservationResponse = {
  MemberId?: number;
  UserId?: number;
  AvatarUrl?: string | null;
  FullName?: string | null;
  Phone?: string | null;
  Email?: string | null;
};

/** BE: EquipmentItemResponse (nested trong reservation) */
export type EquipmentItemResponse = {
  EquipmentId: number;
  CategoryId: number;
  CategoryName?: string | null;
  EquipmentName?: string | null;
  EquipmentCode?: string | null;
  Status?: string | null;
  ImgLink?: string | null;
};

/** BE: EquipmentReservationItemResponse */
export type EquipmentReservationItemResponse = {
  EquipmentId: number;
  IsTemporarilyCancelled?: boolean | null;
  CreatedAt?: string | null;
  Equipment?: EquipmentItemResponse | null;
};

/** BE: SessionReservationResponse */
export type SessionReservationResponse = {
  SessionId: number;
  SessionNo: number;
  StartAt: string;
  EndAt: string;
  Notes?: string | null;
  Status?: string | null;
  Location?: string | null;
  IsOnline?: boolean | null;
};

/** BE: ReservationResponse */
export type ReservationResponse = {
  ReservationId: number;
  CreatedByMemberId?: number | null;
  IsTemporarilyCancelled?: boolean | null;
  StartAt?: string | null;
  EndAt?: string | null;
  CreatedAt?: string | null;
  CreatedByUser?: CreateByUserReservationResponse | null;
  EquipmentReservations?: EquipmentReservationItemResponse[] | null;
  Sessions?: SessionReservationResponse[] | null;
};

export type PagedReservationResponse = PagedResponse<ReservationResponse>;

/** BE: ReservationFilterRequest (query) */
export type ReservationFilterRequest = {
  ReservationId?: number;
  IsTemporarilyCancelled?: boolean;
  CreatedByMemberId?: number;
  StartAt?: string;
  EndAt?: string;
  CreatedAt?: string;
  PageNumber?: number;
  PageSize?: number;
};

/** BE: CheckAvailabilityRequest (query) */
export type CheckAvailabilityRequest = {
  StartAt: string;
  EndAt: string;
  CategoryIds?: number[];
  EquipmentName?: string;
  EquipmentCode?: string;
  PageNumber?: number;
  PageSize?: number;
};

/** BE: EquipmentResponse (availability / filter) */
export type EquipmentResponse = {
  EquipmentId: number;
  CategoryId: number;
  CategoryName?: string | null;
  SponsoredBy?: string | null;
  EquipmentName?: string | null;
  EquipmentCode?: string | null;
  HandoverMinute?: string | null;
  Status?: string | null;
  Description?: string | null;
  ImgLink?: string | null;
  CreatedAt?: string | null;
};

export type PagedEquipmentResponse = PagedResponse<EquipmentResponse>;

/** BE: ReservationCreateRequest */
export type ReservationCreateRequest = {
  SessionIds: number[];
  StartAt: string;
  EndAt: string;
  Equipment: { EquipmentId: number }[];
};

export type ReservationBulkCreateRequest = {
  Reservations: ReservationCreateRequest[];
};

/** BE: ReservationUpdateRequest */
export type ReservationUpdateRequest = {
  StartAt: string;
  EndAt: string;
  SessionIds?: number[];
  Equipment: { EquipmentId: number }[];
};

/** Alias: chi tiết / một dòng danh sách filter đều là ReservationResponse */
export type ReservationDetail = ReservationResponse;

/** Alias cho bảng danh sách (cùng DTO filter BE) */
export type ReservationListItem = ReservationResponse;
