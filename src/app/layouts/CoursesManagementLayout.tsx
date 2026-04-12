import { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { GraduationCap, CheckCircle2, Layers, CalendarDays, Plus } from 'lucide-react';
import { StatCard } from '@/shared/components/common/StatCard';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, dashboardCoursesSummaryQueryKey } from '@/modules/dashboard/api/dashboardApi';
import { Button } from '@/shared/components/ui/button';
import { useAuth } from '@/app/providers/AuthProvider';
import type { CoursesManagementLayoutOutletContext } from '@/app/layouts/coursesManagementOutletContext';
import type { CourseListStatusFilter } from '@/modules/course/hooks/useCourses';

const iconClass = 'h-6 w-6';

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
  const [, setSearchParams] = useSearchParams();

  /** Hai `<Outlet />` mount `CoursesManagement` hai lần — state danh sách phải nằm ở layout. */
  const [courseListSearch, setCourseListSearchState] = useState('');
  const [courseListStatusFilter, setCourseListStatusFilterState] =
    useState<CourseListStatusFilter>('all');
  const [courseListPage, setCourseListPage] = useState(1);

  const setCourseListSearch = useCallback((v: string) => {
    setCourseListPage(1);
    setCourseListSearchState(v);
  }, []);

  const setCourseListStatusFilter = useCallback((v: CourseListStatusFilter) => {
    setCourseListPage(1);
    setCourseListStatusFilterState(v);
  }, []);

  const [subjectListSearch, setSubjectListSearchState] = useState('');
  const [subjectListPage, setSubjectListPage] = useState(1);

  const setSubjectListSearch = useCallback((v: string) => {
    setSubjectListPage(1);
    setSubjectListSearchState(v);
  }, []);

  /** Tab Môn học: reset state danh sách khóa (hai Outlet không còn mount CoursesManagement). */
  useEffect(() => {
    if (currentTab !== 'subjects') return;
    setCourseListSearchState('');
    setCourseListStatusFilterState('all');
    setCourseListPage(1);
  }, [currentTab]);

  /** Tab Khóa học: reset state danh sách môn. */
  useEffect(() => {
    if (currentTab !== 'courses') return;
    setSubjectListSearchState('');
    setSubjectListPage(1);
  }, [currentTab]);

  const coursesListOutletContext = useMemo((): Partial<CoursesManagementLayoutOutletContext> => {
    if (currentTab !== 'courses') return {};
    return {
      courseListLifted: true,
      courseListSearch,
      setCourseListSearch,
      courseListStatusFilter,
      setCourseListStatusFilter,
      courseListPage,
      setCourseListPage,
    };
  }, [
    currentTab,
    courseListSearch,
    setCourseListSearch,
    courseListStatusFilter,
    setCourseListStatusFilter,
    courseListPage,
  ]);

  const subjectsListOutletContext = useMemo((): Partial<CoursesManagementLayoutOutletContext> => {
    if (currentTab !== 'subjects') return {};
    return {
      subjectListLifted: true,
      subjectListSearch,
      setSubjectListSearch,
      subjectListPage,
      setSubjectListPage,
    };
  }, [currentTab, subjectListSearch, setSubjectListSearch, subjectListPage]);

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

  /** Một request GET /dashboard/courses/summary — thay cho 4 query totalItems riêng lẻ. */
  const { data: courseSummary, isLoading: summaryLoading } = useQuery({
    queryKey: dashboardCoursesSummaryQueryKey,
    queryFn: () => dashboardApi.getCourseSummary(),
    staleTime: 60_000,
  });

  const totalCourses = courseSummary?.totalCourses ?? 0;
  const totalActiveCourses = courseSummary?.activeCourses ?? 0;
  const totalSubjects = courseSummary?.totalSubjects ?? 0;
  const totalSessions = courseSummary?.totalSubjectSessions ?? 0;

  const statValue = (loading: boolean, value: number) => (loading ? '—' : value.toLocaleString('vi-VN'));

  return (
    <div className="p-6 space-y-4 bg-[#f3f4f6]" style={{ minHeight: 'var(--content-height, 100vh)' }}>
      {/* HEADER */}
      <div className="bg-white flex justify-between px-4 py-3 mb-2 rounded-xl border shadow-sm items-center">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Quản lý giáo trình</h2>
          <p className="text-xs text-slate-500">Quản lý khóa học và môn học trong hệ thống</p>
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

      {/* STATS — palette giống Quản lý thiết bị: xanh / xanh lá / tím / cam */}
      <div className="grid grid-cols-4 gap-4 mb-0">
        <StatCard
          icon={<GraduationCap className={iconClass} strokeWidth={2} />}
          label="Tổng khóa học"
          value={statValue(summaryLoading, totalCourses)}
          sub="Tất cả khóa trong hệ thống"
          variant="blue"
        />
        <StatCard
          icon={<CheckCircle2 className={iconClass} strokeWidth={2} />}
          label="Đang hoạt động"
          value={statValue(summaryLoading, totalActiveCourses)}
          sub="Khóa học đang bật"
          variant="green"
        />
        <StatCard
          icon={<Layers className={iconClass} strokeWidth={2} />}
          label="Tổng môn học"
          value={statValue(summaryLoading, totalSubjects)}
          sub="Phân bổ theo chương trình"
          variant="violet"
        />
        <StatCard
          icon={<CalendarDays className={iconClass} strokeWidth={2} />}
          label="Tổng buổi học"
          value={statValue(summaryLoading, totalSessions)}
          sub="Buổi theo môn học"
          variant="orange"
        />
      </div>

      {/* TABS */}
      <div className="px-4 py-2 mb-1">
        <Tabs value={currentTab}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="courses" onClick={() => navigate(basePath)}>
                Khóa học
              </TabsTrigger>

              {isManager && (
                <TabsTrigger value="subjects" onClick={() => navigate('/manager/courses/subjects')}>
                  Môn học
                </TabsTrigger>
              )}
            </TabsList>

            <Outlet
              context={{
                position: 'toolbar',
                ...coursesListOutletContext,
                ...subjectsListOutletContext,
              } satisfies CoursesManagementLayoutOutletContext}
            />
          </div>
        </Tabs>
      </div>
      <div className="bg-white rounded-xl border shadow-sm px-4 py-3">
        <Outlet
          context={{
            position: 'content',
            ...coursesListOutletContext,
            ...subjectsListOutletContext,
          } satisfies CoursesManagementLayoutOutletContext}
        />
      </div>
    </div>
  );
}
