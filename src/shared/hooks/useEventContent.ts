import { useState } from 'react';
import eventService from '@/modules/event/api/eventApi';
import type { EventListItem, EventSession } from '@/modules/event/event';

export type EventSessionApi = {
  eventSessionId: number;
  duration: string;
  sessionNo: number;
};

export const useEventContent = () => {
  const [sessions, setSessions] = useState<EventSessionApi[]>([]);

  const fetchList = async () => {
    const res = await eventService.getEvents({
      pageNumber: 1,
      pageSize: 100,
      isActive: true,
    });

    return (res.items ?? []).map((x: EventListItem) => ({
      id: x.eventId,
      name: x.eventName,
    }));
  };

  const fetchDetail = async (id: number) => {
    const res = await eventService.getEvents({
      pageNumber: 1,
      pageSize: 1,
      eventId: id,
    });

    const event = res.items?.[0];
    const mapped: EventSessionApi[] =
      event?.eventSessions?.map((s: EventSession) => ({
        eventSessionId: Number(s.eventSessionId ?? 0),
        duration: (s.duration ?? '02:00:00') as string,
        sessionNo: Number(s.sessionNo ?? 0) || 1,
      })) ?? [];
    setSessions(mapped);
  };

  return { sessions, fetchList, fetchDetail };
};