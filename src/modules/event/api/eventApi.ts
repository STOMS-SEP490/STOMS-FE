import axiosClient from '@/shared/lib/axios';
import type { PaginationResponse } from '@/shared/types/api';
import type {
  EventFilterParams,
  EventListItem,
  EventCreatePayload,
  EventUpdatePayload,
} from '@/modules/event/event';

function isEventShape(o: unknown): o is Record<string, unknown> {
  return (
    o != null &&
    typeof o === 'object' &&
    !Array.isArray(o) &&
    ('eventId' in o || 'eventCode' in o || 'eventName' in o)
  );
}

/** Một số gateway / wrapper bọc body trong `data` hoặc `result` (vẫn camelCase). */
function unwrapEventPayload(payload: unknown): EventListItem {
  if (payload == null) {
    throw new Error('Event API: empty response');
  }
  if (isEventShape(payload)) return payload as EventListItem;
  if (typeof payload !== 'object') return payload as EventListItem;
  const root = payload as Record<string, unknown>;
  const inner = root.data ?? root.result ?? root.item;
  if (isEventShape(inner)) return inner as EventListItem;
  return payload as EventListItem;
}

/** Map FE params → BE [FromQuery] EventFilterRequest (PascalCase), kể cả IsActive */
function toEventFilterQuery(
  params: EventFilterParams
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (params.pageNumber != null) out.PageNumber = params.pageNumber;
  if (params.pageSize != null) out.PageSize = params.pageSize;
  const kw = params.keyword?.trim();
  if (kw) out.EventName = kw;
  if (params.isActive !== undefined) out.IsActive = params.isActive;
  if (params.eventId != null) out.EventId = params.eventId;
  return out;
}

const eventApi = {
  // GET PAGED + FILTER
  getEvents: (params: EventFilterParams): Promise<PaginationResponse<EventListItem>> =>
    axiosClient.get('/events/filter', { params: toEventFilterQuery(params) }),

  // GET BY ID
  getById: async (id: number): Promise<EventListItem> => {
    const raw = await axiosClient.get<unknown>(`/events/${id}`);
    return unwrapEventPayload(raw);
  },

  // CREATE
  create: (data: EventCreatePayload): Promise<EventListItem> =>
    axiosClient.post('/events', data),

  // UPDATE
  update: (id: number, data: EventUpdatePayload): Promise<EventListItem> =>
    axiosClient.put(`/events/${id}`, data),

  // ACTIVATE / DEACTIVATE
  activate: (id: number): Promise<EventListItem> =>
    axiosClient.put(`/events/${id}/activate`),

  deactivate: (id: number): Promise<EventListItem> =>
    axiosClient.put(`/events/${id}/deactivate`),

  // DELETE
  remove: (id: number): Promise<void> =>
    axiosClient.delete(`/events/${id}`),
};

export default eventApi;