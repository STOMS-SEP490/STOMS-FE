import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import HoverSearch from '@/shared/components/ui/search';
import type { CoursesReadonlyOutletContext } from '@/modules/course/pages/coursesReadonlyOutletContext';

export default function CoursesReadonlyLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isTeacher = location.pathname.startsWith('/teacher/');
  const isProgramCoordinator = location.pathname.startsWith('/pc/');
  const basePath = isTeacher ? '/teacher/courses' : isProgramCoordinator ? '/pc/courses' : '/tl/courses';
  const currentTab = location.pathname.includes('/subjects') ? 'subjects' : 'courses';

  const [courseSearch, setCourseSearch] = useState('');
  const [subjectSearch, setSubjectSearch] = useState('');

  const outletContext: CoursesReadonlyOutletContext = {
    courseSearch,
    setCourseSearch,
    subjectSearch,
    setSubjectSearch,
  };

  return (
    <div
      className="p-6 bg-slate-50 flex flex-col gap-3 min-h-0 overflow-hidden"
      style={{ height: 'var(--content-height, 100vh)' }}
    >
      <div className="shrink-0 bg-white px-6 py-4 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-semibold text-black">Quản lý giáo trình</h2>
        <p className="text-xs text-gray-500">Quản lý khóa học và môn học trong hệ thống</p>
      </div>

      <div className="shrink-0 px-2 py-1">
        <Tabs value={currentTab}>
          <div className="flex items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="courses" onClick={() => navigate(basePath)}>
                KHÓA HỌC
              </TabsTrigger>
              <TabsTrigger value="subjects" onClick={() => navigate(`${basePath}/subjects`)}>
                MÔN HỌC
              </TabsTrigger>
            </TabsList>
            {currentTab === 'courses' ? (
              <HoverSearch
                value={courseSearch}
                onChange={(v) => setCourseSearch(v)}
                placeholder="Tìm theo tên khóa học..."
              />
            ) : (
              <HoverSearch
                value={subjectSearch}
                onChange={(v) => setSubjectSearch(v)}
                placeholder="Tìm theo tên môn học..."
              />
            )}
          </div>
        </Tabs>
      </div>

      <div className="relative flex w-full min-w-0 flex-1 min-h-0 flex-col bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <Outlet context={outletContext} />
      </div>
    </div>
  );
}

