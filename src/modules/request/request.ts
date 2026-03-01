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

export type CreateRequestAttachment = {
  fileName: string;
  fileUrl: string;
  uploadedByMemberId: number;
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
  attachments: CreateRequestAttachment[];
};

export type RequestSessionSummary = {
  sessionId: number;
  sessionNo: number;
  startAt: string;
  endAt: string;
  status: string;
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
  createdAt: string;

  sessions?: RequestSessionSummary[];
};

export type RequestFilterParams = {
  pageNumber?: number;
  pageSize?: number;
  requestId?: number;
  status?: string;
};