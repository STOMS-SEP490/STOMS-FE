import { useState } from 'react';
import eventService from '@/modules/event/api/eventApi';

export type EventSessionApi = {
  eventSessionId: number;
  duration: string;
  sessionNo: number;
};

export const useEventContent = () => {
  const [sessions, setSessions] = useState<EventSessionApi[]>([]);

  const fetchList = async () => {
    const res: any = await eventService.getEvents({
      pageNumber: 1,
      pageSize: 100,
      isActive: true,
    });

    return (res.items ?? []).map((x: any) => ({
      id: x.eventId,
      name: x.eventName,
    }));
  };

  const fetchDetail = async (id: number) => {
    const res: any = await eventService.getEvents({
      pageNumber: 1,
      pageSize: 1,
      eventId: id,
    });

    const event = res.items?.[0];
    setSessions(event?.eventSessions ?? []);
  };

  return { sessions, fetchList, fetchDetail };
};