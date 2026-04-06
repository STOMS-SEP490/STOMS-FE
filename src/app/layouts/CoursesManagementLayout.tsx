import { Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { GraduationCap, CheckCircle, BookOpen, Clock, Plus } from 'lucide-react';
import { StatCard } from '@/shared/components/common/StatCard';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import courseApi from '@/modules/course/api/courseApi';
import subjectApi from '@/modules/subject/api/subjectApi';
import sessionApi from '@/modules/request/api/sessionApi';
import { Button } from '@/shared/components/ui/button';
import { useAuth } from '@/app/providers/AuthProvider';

export default function CoursesLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const roleId = Number(user?.role ?? 0);
  const canEdit = roleId === 1;
  const isManager = location.pathname.startsWith('/manager/');
  const isTeacher = location.pathname.startsWith('/teacher/');
  const basePath = isManager ? '/manager/courses' : isTeacher ? '/teacher/courses' : '/tl/courses';

  const currentTab = location.pathname.includes('subjects') ? 'subjects' : 'courses';
  const [searchParams, setSearchParams] = useSearchParams();

  const openCreateCourse = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('openCourseCreate', '1');
      next.delete('openSubjectCreate');
      return next;
    });
  };

  const openCreateSubject = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('openSubjectCreate', '1');
      next.delete('openCourseCreate');
      return next;
    });
  };

  const { data: coursesPaged, isLoading: coursesLoading } = useQuery({
    queryKey: ['courses-summary'],
    queryFn: () => courseApi.getCourses({ pageNumber: 1, pageSize: 1 }),
  });

  const { data: activeCoursesPaged, isLoading: activeCoursesLoading } = useQuery({
    queryKey: ['courses-summary', 'active'],
    queryFn: () => courseApi.getCourses({ pageNumber: 1, pageSize: 1, IsActive: true }),
  });

  const { data: subjectsPaged, isLoading: subjectsLoading } = useQuery({
    queryKey: ['subjects-summary'],
    queryFn: () => subjectApi.getSubjects({ pageNumber: 1, pageSize: 1 }),
  });

  const { data: sessionsPaged, isLoading: sessionsLoading } = useQuery({
    queryKey: ['sessions-summary'],
    queryFn: () => sessionApi.getFilter({ PageNumber: 1, PageSize: 1 }),
  });

  const totalCourses = coursesPaged?.totalItems ?? 0;
  const totalActiveCourses = activeCoursesPaged?.totalItems ?? 0;
  const totalSubjects = subjectsPaged?.totalItems ?? 0;
  const totalSessions = sessionsPaged?.TotalItems ?? 0;

  const statValue = (loading: boolean, value: number) => (loading ? '—' : value.toLocaleString('vi-VN'));

  return (
    <div className="overflow-y-auto p-6 space-y-6 bg-[#f3f4f6]" style={{ minHeight: 'var(--content-height, 100vh)' }}>
      {/* HEADER */}
      <div className="bg-white flex justify-between px-6 py-4 mb-2 rounded-xl border shadow-sm items-center">
        <div>
          <h2 className="text-xl font-semibold text-black">Quản lý giáo trình</h2>
          <p className="text-xs text-gray-500">Quản lý khóa học và môn học trong hệ thống</p>
        </div>
        {canEdit && currentTab === 'courses' && (
          <Button
            onClick={openCreateCourse}
            className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white px-3 py-2 rounded-md"
          >
            <Plus size={16} />
            Thêm khóa học
          </Button>
        )}
        {canEdit && currentTab === 'subjects' && (
          <Button
            onClick={openCreateSubject}
            className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white px-3 py-2 rounded-md"
          >
            <Plus size={16} />
            Thêm môn học
          </Button>
        )}
      </div>

      {/* STATS */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <StatCard
          icon={<GraduationCap />}
          label="Tổng khóa học"
          value={statValue(coursesLoading, totalCourses)}
          sub="Khóa học"
        />
        <StatCard
          icon={<CheckCircle />}
          label="Đang hoạt động"
          value={statValue(activeCoursesLoading, totalActiveCourses)}
          sub="Khóa học"
          variant="green"
        />
        <StatCard
          icon={<BookOpen />}
          label="Tổng môn học"
          value={statValue(subjectsLoading, totalSubjects)}
          sub="Môn học"
        />
        <StatCard
          icon={<Clock />}
          label="Tổng buổi học"
          value={statValue(sessionsLoading, totalSessions)}
          sub="Buổi học"
        />
      </div>

      {/* TABS */}
      <div className=" px-6 py-2">
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
