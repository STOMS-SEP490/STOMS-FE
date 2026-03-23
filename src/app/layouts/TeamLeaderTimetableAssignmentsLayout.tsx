import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { CalendarDays, List } from 'lucide-react';
import { useMemo, type Dispatch, type SetStateAction } from 'react';
import HoverSearch from '@/shared/components/ui/search';
import {
  useTeamLeaderTimetableAssignments,
  type TeamLeaderTimetableAssignmentRow,
} from '@/modules/contract/hooks/useTeamLeaderTimetableAssignments';

type TeamLeaderTimetableAssignmentsLayoutContext = {
  statuses: string[];
  isAttendanceTab: boolean;
  items: TeamLeaderTimetableAssignmentRow[];
  loading: boolean;
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  setPageNumber: Dispatch<SetStateAction<number>>;
  refetch: () => Promise<void>;
};

export default function TeamLeaderTimetableAssignmentsLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const basePath = '/tl/timetable/assignments';
  const isAttendanceTab = useMemo(
    () => location.pathname.includes(`${basePath}/attendance`),
    [location.pathname],
  );

  const statuses = isAttendanceTab ? ['ONGOING', 'ASSIGNED'] : ['ASSIGNED', 'ONGOING', 'COMPLETED'];

  const {
    items,
    loading,
    pageNumber,
    pageSize,
    totalItems,
    search,
    setSearch,
    setPageNumber,
    refetch,
  } = useTeamLeaderTimetableAssignments({ pageSize: 8, statuses, todayOnly: isAttendanceTab });

  return (
    <div
      className="flex flex-col gap-3 min-h-0 overflow-hidden p-6 bg-slate-50"
      style={{ height: 'var(--content-height, 100vh)' }}
    >
      <div className="shrink-0 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Quản lý phân công & điểm danh</h2>
            <p className="mt-1 text-sm text-slate-500">
              Theo dõi phiên dạy, ủy quyền điểm danh và check-in/check-out cho member theo từng buổi.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => navigate('/tl/timetable')}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-colors text-slate-500 hover:bg-slate-50"
              title="Xem dạng thời khóa biểu"
            >
              <CalendarDays className="h-4 w-4" />
              Lịch
            </button>

            <button
              type="button"
              onClick={() => navigate(basePath)}
              className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-4 py-2 text-xs font-semibold text-sky-700 shadow-sm"
              title="Xem dạng bảng phân công"
            >
              <List className="h-4 w-4" />
              Danh sách
            </button>
          </div>
        </div>
      </div>

      <div className="shrink-0 px-2 py-1">
        <Tabs value={isAttendanceTab ? 'attendance' : 'assignment'}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList className="bg-transparent border-0 shadow-none p-0 h-8 gap-3">
              <TabsTrigger value="assignment" onClick={() => navigate(basePath)}>
                PHÂN CÔNG
              </TabsTrigger>
              <TabsTrigger value="attendance" onClick={() => navigate(`${basePath}/attendance`)}>
                ĐIỂM DANH
              </TabsTrigger>
            </TabsList>
            <HoverSearch
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPageNumber(1);
              }}
              placeholder="Tìm theo phiên/địa điểm/trạng thái..."
            />
          </div>
        </Tabs>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <Outlet
          context={{
            statuses,
            isAttendanceTab,
            items,
            loading,
            pageNumber,
            pageSize,
            totalItems,
            search,
            setSearch,
            setPageNumber,
            refetch,
          } satisfies TeamLeaderTimetableAssignmentsLayoutContext}
        />
      </div>
    </div>
  );
}

