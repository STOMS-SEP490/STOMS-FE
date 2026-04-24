import { useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

function isTimetableCalendarPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  return /\/timetable$/i.test(normalized);
}

export default function MainContent({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const calendarSafe = isTimetableCalendarPath(pathname);
  return (
    <div className={`main-content${calendarSafe ? ' main-content--calendar-safe' : ''}`}>{children}</div>
  );
}
