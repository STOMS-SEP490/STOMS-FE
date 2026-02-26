export type CreateRequestSession = {
  sessionNo: number;
  startAt: string;
  endAt: string;
  notes?: string;

  subjectSessionId: number | null;
  eventSessionId: number | null;

  teachersRequired: number;
  tasRequired: number;

  location?: string;
  isOnline: boolean;

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
  note?: string;

  sessions: CreateRequestSession[];
  attachments: CreateRequestAttachment[];
};