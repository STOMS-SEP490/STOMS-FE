import { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useSearchParams } from 'react-router-dom';
import { GraduationCap, CheckCircle2, Layers, CalendarDays, Plus } from 'lucide-react';
import { StatCard } from '@/shared/components/common/StatCard';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, dashboardCoursesSummaryQueryKey } from '@/modules/dashboard/api/dashboardApi';
import { Button } from '@/shared/components/ui/button';
import { useAuth } from '@/app/providers/AuthProvider';
import type { CoursesManagementLayoutOutletContext } from '@/app/layouts/coursesManagementOutletContext';
import type { CourseListStatusFilter } from '@/modules/course/hooks/useCourses';

const iconClass = 'h-6 w-6';

export type CoursesManagementPageVariant = 'courses' | 'subjects';

type Props = {
  variant: CoursesManagementPageVariant;
};

export default function CoursesLayout({ variant }: Props) {
  const { user } = useAuth();
  const roleId = Number(user?.role ?? 0);
  const canEdit = roleId === 1;

  const currentTab = variant;
  const [, setSearchParams] = useSearchParams();

  /** Hai `<Outlet />` mount cùng một page hai lần (toolbar + nội dung) — state danh sách nằm ở layout. */
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

  /** Trang môn học: reset state danh sách khóa. */
  useEffect(() => {
    if (currentTab !== 'subjects') return;
    setCourseListSearchState('');
    setCourseListStatusFilterState('all');
    setCourseListPage(1);
  }, [currentTab]);

  /** Trang khóa học: reset state danh sách môn. */
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

  const pageTitle = variant === 'courses' ? 'Quản lý giáo trình' : 'Quản lý môn học';
  const pageSubtitle =
    variant === 'courses'
      ? 'Quản lý khóa học trong hệ thống'
      : 'Quản lý môn học trong hệ thống';

  return (
    <div className="p-6 pl-8 space-y-4 app-page-bg" style={{ minHeight: 'var(--content-height, 100vh)' }}>
      {/* HEADER */}
      <div className="bg-white flex justify-between px-4 py-3 mb-2 rounded-xl border shadow-sm items-center">
        <div>
          <h2 className="text-xl font-semibold text-[#1a7a99]">{pageTitle}</h2>
          <p className="text-xs text-slate-500">{pageSubtitle}</p>
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
      <div className="mb-0 grid grid-cols-2 gap-4 md:grid-cols-4">
        {variant === 'courses' ? (
          <>
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
          </>
        ) : (
          <>
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
            <StatCard
              icon={<GraduationCap className={iconClass} strokeWidth={2} />}
              label="Tổng khóa học"
              value={statValue(summaryLoading, totalCourses)}
              sub="Tất cả khóa trong hệ thống"
              variant="blue"
            />
            <StatCard
              icon={<CheckCircle2 className={iconClass} strokeWidth={2} />}
              label="Khóa đang hoạt động"
              value={statValue(summaryLoading, totalActiveCourses)}
              sub="Khóa học đang bật"
              variant="green"
            />
          </>
        )}
      </div>

      <div className="mb-1 flex items-center justify-end px-4 py-2">
        <Outlet
          context={{
            position: 'toolbar',
            ...coursesListOutletContext,
            ...subjectsListOutletContext,
          } satisfies CoursesManagementLayoutOutletContext}
        />
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
