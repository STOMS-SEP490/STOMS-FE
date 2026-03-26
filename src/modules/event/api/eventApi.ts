import axiosClient from '@/shared/lib/axios';
import type { PaginationResponse } from '@/shared/types/api';
import type {
  EventFilterParams,
  EventListItem,
  EventCreatePayload,
  EventUpdatePayload,
} from '@/modules/event/event';

const eventApi = {
  // GET PAGED + FILTER
  getEvents: (params: EventFilterParams): Promise<PaginationResponse<EventListItem>> =>
    axiosClient.get('/events/filter', { params }),

  // GET BY ID
  getById: (id: number): Promise<EventListItem> => axiosClient.get(`/events/${id}`),

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