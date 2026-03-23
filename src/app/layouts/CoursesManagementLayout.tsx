import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { GraduationCap, CheckCircle, BookOpen, Clock } from 'lucide-react';
import { StatCard } from '@/shared/components/common/StatCard';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';

export default function CoursesLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isManager = location.pathname.startsWith('/manager/');
  const isTeacher = location.pathname.startsWith('/teacher/');
  const basePath = isManager ? '/manager/courses' : isTeacher ? '/teacher/courses' : '/tl/courses';

  const currentTab = location.pathname.includes('subjects') ? 'subjects' : 'courses';

  return (
    <div className="overflow-y-auto p-6 space-y-6 bg-[#f3f4f6]" style={{ minHeight: 'var(--content-height, 100vh)' }}>
      {/* HEADER */}
      <div className="bg-white px-6 py-4 mb-2 rounded-xl border shadow-sm">
        <h2 className="text-xl font-semibold text-black">Quản lý giáo trình</h2>
        <p className="text-xs text-gray-500">Quản lý khóa học và môn học trong hệ thống</p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-4 gap-4  mb-0">
        <StatCard icon={<GraduationCap />} label="Tổng khóa học" value="48" sub="Khóa học" />
        <StatCard
          icon={<CheckCircle />}
          label="Đang hoạt động"
          value="42"
          sub="Khóa học"
          variant="green"
        />
        <StatCard icon={<BookOpen />} label="Tổng môn học" value="156" sub="Môn học" />
        <StatCard icon={<Clock />} label="Tổng buổi học" value="1,248" sub="Buổi học" />
      </div>

      {/* TABS */}
      <div className=" px-6 py-2 mb-1">
        <Tabs value={currentTab}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="courses" onClick={() => navigate(basePath)}>
                KHÓA HỌC
              </TabsTrigger>

              {isManager && (
                <TabsTrigger value="subjects" onClick={() => navigate('/manager/courses/subjects')}>
                  MÔN HỌC
                </TabsTrigger>
              )}
            </TabsList>

            <Outlet context={{ position: 'toolbar' }} />
          </div>
        </Tabs>
      </div>
      <div className="bg-white rounded-xl border shadow-sm px-6 py-4">
        <Outlet context={{ position: 'content' }} />
      </div>
    </div>
  );
}
