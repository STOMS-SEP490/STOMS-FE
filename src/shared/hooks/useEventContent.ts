import { useState } from 'react';
import eventService from '@/modules/event/api/eventApi';
import type { EventPagedResponse, EventResponse } from '@/modules/event/event.types';

export type EventSessionApi = {
  eventSessionId: number;
  duration: string;
  sessionNo: number;
};

export const useEventContent = () => {
  const [sessions, setSessions] = useState<EventSessionApi[]>([]);

  const fetchList = async () => {
    const res = await eventService.getEvents({
      PageNumber: 1,
      PageSize: 100,
      IsActive: true,
    });

    return (res.Items ?? []).map((x: EventResponse) => ({
      id: x.EventId,
      name: x.EventName,
    }));
  };

  const fetchDetail = async (id: number) => {
    const res: EventPagedResponse<EventResponse> = await eventService.getEvents({
      PageNumber: 1,
      PageSize: 1,
      EventId: id,
    });

    const event = res.Items?.[0];
    const mapped: EventSessionApi[] =
      event?.EventSessions?.map((s) => ({
        eventSessionId: Number(s.EventSessionId ?? 0),
        duration: (s.Duration ?? '02:00:00') as string,
        sessionNo: Number(s.SessionNo ?? 0) || 1,
      })) ?? [];
    setSessions(mapped);
  };

  return { sessions, fetchList, fetchDetail };
};