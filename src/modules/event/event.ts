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
  eventSessions: [] | null;
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
};