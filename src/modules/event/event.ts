/** Một slot lịch cụ thể (từ EventSession.Sessions của BE) */
export type EventSessionSlot = {
  sessionId?: number;
  startAt?: string | null;
  endAt?: string | null;
  location?: string | null;
};

/** Buổi trong sự kiện (EventSession từ BE: Title, SessionNo, Duration; lịch trong Sessions) */
export type EventSession = {
  eventSessionId?: number;
  title?: string;
  description?: string | null;
  eventId?: number | null;
  duration?: string | null;
  sessionNo?: number | null;
  /** Lịch cụ thể (StartAt, EndAt, Location) từ BE SessionResponse */
  sessions?: EventSessionSlot[] | null;
  eventSessionSkills?: {
    eventSessionId: number;
    skillId: number;
    isActive: boolean;
    skillName?: string | null;
  }[] | null;
  eventSessionTopics?: {
    eventSessionId: number;
    topicId: number;
    isActive: boolean;
    topicName?: string | null;
  }[] | null;
};

export type EventListItem = {
  eventId: number;
  eventCode: string;
  eventName: string;
  isActive: boolean;
  description: string;
  duration: string;
  numberOfSession: number;
  createdAt: string;
  updatedAt: string;
  eventSessions: EventSession[] | null;
};

export type EventSessionUpsertItem = {
  title: string;
  description: string;
  duration?: string; // "HH:mm:ss"
  sessionNo?: number;
};

export type EventCreatePayload = {
  eventCode: string;
  eventName: string;
  description: string;
  /** BE yêu cầu tối thiểu 1 buổi */
  eventSessions: EventSessionUpsertItem[];
};

export type EventUpdatePayload = {
  eventCode: string;
  eventName: string;
  description: string;
};

export type EventFilterParams = {
  pageNumber?: number;
  pageSize?: number;
  keyword?: string;
  isActive?: boolean;
  eventId?: number;
};

/** Sự kiện hiển thị trên lịch (có thời gian bắt đầu/kết thúc) */
export type CalendarEvent = {
  id: string | number;
  title: string;
  start: Date;
  end: Date;
  resource?: string;
  color?: string;
  /** Dùng cho team leader: true nếu phiên chưa có teacher/TA được phân công */
  unassigned?: boolean;
};