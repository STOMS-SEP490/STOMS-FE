import axiosClient from '@/shared/lib/axios';
import type { PaginationResponse } from '@/shared/types/api';
import type { EventFilterParams, EventListItem } from '@/modules/event/event';

const eventService = {
  getEvents: async (
    params: EventFilterParams
  ): Promise<PaginationResponse<EventListItem>> => {
    return axiosClient.get('/events/filter', { params });
  },
};

export default eventService;