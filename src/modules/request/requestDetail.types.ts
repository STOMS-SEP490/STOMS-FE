import type { RequestSessionSummary } from './request';

export type SessionWithFlags = RequestSessionSummary & {
  reservationId?: number | null;
  teamAssigned?: boolean;
  equipmentReserved?: boolean;
};

export type SessionAssignmentRow = {
  assignmentId: number;
  staffMemberId: number;
  staffRole: string;
  status?: string;
  /** Lý do hủy nhận / báo bận (khi status cancelled). */
  reason?: string;
  fullName: string;
  email: string;
  avatarUrl: string;
};

export type RightPanelState =
  | { mode: 'team'; session: SessionWithFlags }
  | { mode: 'detail'; session: SessionWithFlags }
  | { mode: 'assignment'; session: SessionWithFlags }
  | { mode: 'equipment' }
  | null;

export type RequestLayoutOutletContext = {
  refreshRequestSidebar?: () => void;
  /**
   * request: chi tiết đầy đủ
   * assignment: duyệt phân công (manager)
   * approval: duyệt yêu cầu (chỉ thông tin + duyệt/từ chối, không gắn nhóm)
   * team_assign: gán nhóm cho các yêu cầu đã duyệt
   */
  viewMode?: 'request' | 'assignment' | 'approval' | 'team_assign';
};
