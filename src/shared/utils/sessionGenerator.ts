import type { CreateRequestSession } from '@/modules/request/request';
import type { SessionSchedulerConfig } from '@/shared/types/scheduler';
import dayjs from 'dayjs';

type Template = {
  sessionNo: number;
  title: string;
  duration: string; // "02:00:00"
  subjectSessionId: number;
};

export const generateSessions = (
  templates: Template[],
  config: SessionSchedulerConfig
): CreateRequestSession[] => {
  const baseDate = dayjs(config.startDate);

  const interval =
    config.repeatType === 'daily'
      ? 1
      : config.repeatType === 'weekly'
      ? 7
      : config.repeatValue ?? 7;

  return templates.map((tpl, index) => {
    const sessionDate = baseDate.add(index * interval, 'day');

    const [h, m, s] = tpl.duration.split(':');

    const startAt = sessionDate
      .hour(config.startHour)
      .minute(config.startMinute)
      .second(0);

    const endAt = startAt
      .add(Number(h), 'hour')
      .add(Number(m), 'minute')
      .add(Number(s ?? 0), 'second');

    return {
      sessionNo: tpl.sessionNo,

      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),

      notes: tpl.title, 

      subjectSessionId: tpl.subjectSessionId,
      eventSessionId: null,

      teachersRequired: 1,
      tasRequired: 1,

      location: '',
      isOnline: false,

      borrowingId: null,
      reservationId: null,
    };
  });
};