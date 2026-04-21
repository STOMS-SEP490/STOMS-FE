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
  isContinuous?: boolean;

  sessions: CreateRequestSession[];
};

export type SessionTopicInfo = {
  title?: string | null;
  description?: string | null;
  duration?: string | null;
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
  subjectSession?: SessionTopicInfo | null;
  eventSession?: SessionTopicInfo | null;
  sessionSkills?: string[];
};

export type RequestCourseInfo = {
  courseId?: number;
  courseCode?: string | null;
  courseName?: string | null;
  description?: string | null;
  isActive?: boolean;
  duration?: string | null;
  numberOfSubject?: number;
  numberOfSession?: number;
  updatedAt?: string | null;
};

export type RequestSubjectInfo = {
  subjectId?: number;
  subjectCode?: string | null;
  subjectName?: string | null;
  isActive?: boolean;
  description?: string | null;
  topicId?: number | null;
  duration?: string | null;
  numberOfSession?: number;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type RequestEventInfo = {
  eventId?: number;
  eventCode?: string | null;
  eventName?: string | null;
  isActive?: boolean;
  description?: string | null;
  duration?: string | null;
  numberOfSession?: number;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type RequestProgramCoordinatorInfo = {
  memberId?: number;
  userId?: number;
  fullName?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  email?: string | null;
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
  note?: string | null;
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

  course?: RequestCourseInfo | null;
  subject?: RequestSubjectInfo | null;
  event?: RequestEventInfo | null;
  programCoordinator?: RequestProgramCoordinatorInfo | null;
};

export type RequestFilterParams = {
  pageNumber?: number;
  pageSize?: number;
  programCoordinatorId?: number;
  requestId?: number;
  statuses?: string[];
  sessionStatuses?: string[];
  assignmentStatuses?: string[];
  requireAllAssignmentsHaveStaffMember?: boolean;
  teamId?: number;
};