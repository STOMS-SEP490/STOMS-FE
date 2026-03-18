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
  viewMode?: 'request' | 'assignment';
};
