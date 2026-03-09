import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import { CalendarDays, List } from 'lucide-react';

export default function EventsLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isCalendar = !location.pathname.endsWith('/list');

  return (
    <>
      <div className="flex items-center gap-2 px-6 pt-2 pb-0">
        <Button
          variant={isCalendar ? 'secondary' : 'ghost'}
          size="sm"
          className={isCalendar ? 'bg-white border border-gray-200 hover:bg-gray-50' : ''}
          onClick={() => navigate('/manager/events')}
        >
          <CalendarDays className="size-4 mr-1" />
          Lịch
        </Button>
        <Button
          variant={!isCalendar ? 'secondary' : 'ghost'}
          size="sm"
          className={!isCalendar ? 'bg-white border border-gray-200 hover:bg-gray-50' : ''}
          onClick={() => navigate('/manager/events/list')}
        >
          <List className="size-4 mr-1" />
          Danh sách
        </Button>
      </div>
      <Outlet />
    </>
  );
}
