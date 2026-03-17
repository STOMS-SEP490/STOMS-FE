import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays, List } from 'lucide-react';

export default function TeacherScheduleLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const isAssignments = location.pathname.includes('/timetable/assignments');
  const basePath = '/teacher/timetable';

  return (
    <div className="p-6 space-y-6 bg-[#f3f4f6]" style={{ minHeight: 'var(--content-height, 100vh)' }}>
      {/* HEADER */}
      <div className="bg-white flex justify-between items-center px-6 py-4 mb-2 rounded-xl border shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-black">Thời khóa biểu & phân công</h2>
          <p className="text-xs text-gray-500">
            Xem lịch dạy theo dạng lịch hoặc danh sách phân công.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(basePath)}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
              !isAssignments
                ? 'bg-sky-50 border-sky-200 text-sky-700'
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
            title="Xem dạng thời khóa biểu"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Thời khóa biểu</span>
          </button>
          <button
            type="button"
            onClick={() => navigate(`${basePath}/assignments`)}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
              isAssignments
                ? 'bg-sky-50 border-sky-200 text-sky-700'
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
            title="Xem dạng bảng phân công"
          >
            <List className="w-3.5 h-3.5" />
            <span>Danh sách</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm px-6 py-4">
        <Outlet />
      </div>
    </div>
  );
}

