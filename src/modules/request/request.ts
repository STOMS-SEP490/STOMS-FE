export type CreateRequestSession = {
  sessionNo: number;
  startAt: string;
  endAt: string;
  notes: string;

  teachersRequired: number;
  tasRequired: number;
  location: string;
  isOnline: boolean;

  subjectSessionId: number | null;
  eventSessionId: number | null;

  borrowingId: number | null;
  reservationId: number | null;
};

export type CreateRequestPayload = {
  programCoordinatorId: number;

  subjectId: number | null;
  courseId: number | null;
  eventId: number | null;

  startDate: string;
  requestName: string;
  customerName: string;
  note: string;

  sessions: CreateRequestSession[];
};

export type RequestSessionSummary = {
  sessionId: number;
  sessionNo: number;
  startAt: string;
  endAt: string;
  status: string;
  location?: string;
  isOnline?: boolean | null;
  teachersRequired?: number | null;
  tasRequired?: number | null;
};

export type RequestListItem = {
  requestId: number;
  requestCode: string;
  requestName: string;
  customerName: string;

  subjectId?: number | null;
  courseId?: number | null;
  eventId?: number | null;

  startDate: string;
  sessionsRequired: number;

  status: string;
  reason?: string | null;
  createdAt: string;

  sessions?: RequestSessionSummary[];

  attachments?: Array<{
    attachmentId?: number | null;
    requestId?: number | null;
    uploadedByMemberId?: number | null;
    fileName?: string | null;
    fileUrl?: string | null;
    uploadedAt?: string | null;
  }>;
};

export type RequestFilterParams = {
  pageNumber?: number;
  pageSize?: number;
  requestId?: number;
  statuses?: string[];
  /** Filter requests that have at least one session in these statuses (e.g. ASSIGNMENT_REJECTED). */
  sessionStatuses?: string[];
  teamId?: number;
};