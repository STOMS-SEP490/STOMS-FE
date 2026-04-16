import { Outlet, useNavigate } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';

export default function TeacherScheduleLayout() {
  const navigate = useNavigate();

  return (
    <div className="p-6 pl-8 space-y-6 app-page-bg" style={{ minHeight: 'var(--content-height, 100vh)' }}>
      {/* HEADER */}
      <div className="bg-white flex justify-between items-center px-6 py-4 mb-2 rounded-xl border shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-black">Thời khóa biểu & phân công</h2>
          <p className="text-xs text-gray-500">Nội dung lịch hoặc danh sách tùy trang con.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/teacher/timetable')}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            title="Mở thời khóa biểu"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Mở lịch</span>
          </button>
        </div>
      </div>

      <Outlet />
    </div>
  );
}

