import axiosClient from '@/shared/lib/axios';
import type { PaginationResponse } from '@/shared/types/api';
import type {
  EventFilterParams,
  EventListItem,
  EventSession,
  EventSessionSlot,
  EventUpsertPayload,
} from '@/modules/event/event';

// ===== Helpers: BE PascalCase ↔ FE camelCase =====

function mapSessionSlotFromApi(raw: Record<string, unknown>): EventSessionSlot {
  return {
    sessionId: raw['sessionId'] != null ? Number(raw['sessionId']) : raw['SessionId'] != null ? Number(raw['SessionId']) : undefined,
    startAt: (raw['startAt'] ?? raw['StartAt'] ?? null) as string | null,
    endAt: (raw['endAt'] ?? raw['EndAt'] ?? null) as string | null,
    location: (raw['location'] ?? raw['Location'] ?? null) as string | null,
  };
}

function mapEventSessionFromApi(raw: Record<string, unknown>): EventSession {
  const sessionsRaw = (raw['sessions'] ?? raw['Sessions']) as unknown[] | undefined;
  const sessions: EventSessionSlot[] | null = sessionsRaw?.length
    ? sessionsRaw.map((s) => mapSessionSlotFromApi((s ?? {}) as Record<string, unknown>))
    : null;
  return {
    eventSessionId: raw['eventSessionId'] != null ? Number(raw['eventSessionId']) : raw['EventSessionId'] != null ? Number(raw['EventSessionId']) : undefined,
    title: (raw['title'] ?? raw['Title'] ?? '') as string,
    description: (raw['description'] ?? raw['Description'] ?? null) as string | null,
    eventId: raw['eventId'] != null ? Number(raw['eventId']) : raw['EventId'] != null ? Number(raw['EventId']) : undefined,
    duration: (raw['duration'] ?? raw['Duration'] ?? null) as string | null,
    sessionNo: raw['sessionNo'] != null ? Number(raw['sessionNo']) : raw['SessionNo'] != null ? Number(raw['SessionNo']) : undefined,
    sessions: sessions ?? undefined,
  };
}

function mapEventFromApi(raw: Record<string, unknown>): EventListItem {
  const sessions =
    ((raw['eventSessions'] ?? raw['EventSessions']) as unknown[] | undefined) ?? null;

  return {
    eventId: Number(raw['eventId'] ?? raw['EventId']),
    eventCode: String(raw['eventCode'] ?? raw['EventCode'] ?? ''),
    eventName: String(raw['eventName'] ?? raw['EventName'] ?? ''),
    isActive: Boolean(raw['isActive'] ?? raw['IsActive'] ?? false),
    description: String(raw['description'] ?? raw['Description'] ?? ''),
    duration: String(raw['duration'] ?? raw['Duration'] ?? ''),
    numberOfSession: Number(raw['numberOfSession'] ?? raw['NumberOfSession'] ?? 0),
    createdAt: String(raw['createdAt'] ?? raw['CreatedAt'] ?? ''),
    updatedAt: String(raw['updatedAt'] ?? raw['UpdatedAt'] ?? ''),
    eventSessions: sessions
      ? sessions.map((s) => mapEventSessionFromApi((s ?? {}) as Record<string, unknown>))
      : null,
  };
}

function mapPagedFromApi(
  raw: Record<string, unknown>
): PaginationResponse<EventListItem> {
  const items = ((raw['items'] ?? raw['Items']) as unknown[] | undefined) ?? [];
  return {
    pageNumber: Number(raw['pageNumber'] ?? raw['PageNumber'] ?? 1),
    pageSize: Number(raw['pageSize'] ?? raw['PageSize'] ?? 10),
    totalItems: Number(raw['totalItems'] ?? raw['TotalItems'] ?? 0),
    totalPages: Number(raw['totalPages'] ?? raw['TotalPages'] ?? 0),
    items: items.map((x) => mapEventFromApi((x ?? {}) as Record<string, unknown>)),
  };
}

const eventApi = {
  // GET PAGED + FILTER
  getEvents: async (
    params: EventFilterParams
  ): Promise<PaginationResponse<EventListItem>> => {
    const res = await axiosClient.get<Record<string, unknown>>('/events/filter', { params });
    return mapPagedFromApi(res ?? {});
  },

  // GET BY ID
  getById: async (id: number): Promise<EventListItem> => {
    const res = await axiosClient.get<Record<string, unknown>>(`/events/${id}`);
    return mapEventFromApi((res ?? {}) as Record<string, unknown>);
  },

  // CREATE
  create: async (data: EventUpsertPayload): Promise<EventListItem> => {
    const res = await axiosClient.post<Record<string, unknown>>('/events', data);
    return mapEventFromApi((res ?? {}) as Record<string, unknown>);
  },

  // UPDATE
  update: async (id: number, data: EventUpsertPayload): Promise<EventListItem> => {
    const res = await axiosClient.put<Record<string, unknown>>(`/events/${id}`, data);
    return mapEventFromApi((res ?? {}) as Record<string, unknown>);
  },

  // ACTIVATE / DEACTIVATE
  activate: async (id: number): Promise<EventListItem> => {
    const res = await axiosClient.put<Record<string, unknown>>(
      `/events/${id}/activate`
    );
    return mapEventFromApi((res ?? {}) as Record<string, unknown>);
  },

  deactivate: async (id: number): Promise<EventListItem> => {
    const res = await axiosClient.put<Record<string, unknown>>(
      `/events/${id}/deactivate`
    );
    return mapEventFromApi((res ?? {}) as Record<string, unknown>);
  },

  // DELETE
  remove: (id: number): Promise<void> =>
    axiosClient.delete(`/events/${id}`),
};

export default eventApi;