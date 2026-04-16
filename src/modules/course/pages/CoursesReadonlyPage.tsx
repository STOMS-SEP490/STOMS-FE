import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import dayjs from 'dayjs';
import { RotateCcw } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { MANAGER_ROLE_ID } from '@/constants/role';
import { formatCourseDuration } from '@/modules/course/formatCourseDuration';
import type { CourseListItem } from '@/modules/course/courseType';
import { DataTable } from '@/shared/components/common/DataTable';
import { Button } from '@/shared/components/ui/button';
import HoverSearch from '@/shared/components/ui/search';
import { useCourses } from '@/modules/course/hooks/useCourses';
import { useCourseDetailDrawer } from '@/modules/course/hooks/useCourseDetailDrawer';
import { CourseDetailDrawer } from '@/modules/course/components/CourseDetailDrawer';

export default function CoursesReadonlyPage() {
  const { user } = useAuth();
  const activeOnly = Number(user?.role ?? 0) !== MANAGER_ROLE_ID;
  const {
    data,
    isListBlocking,
    search,
    setSearch,
    resetFilters,
    pageNumber,
    pageSize,
    totalItems,
    setPageNumber,
  } = useCourses({ activeOnly });
  const { detailOpen, detailCourse, detailLoading, closeDetailFromUrl, openDetailById } = useCourseDetailDrawer();

  const columns = useMemo<ColumnDef<CourseListItem>[]>(
    () => [
      {
        accessorKey: 'courseCode',
        header: 'Mã khóa học',
        cell: ({ row }) => <span className="font-semibold text-slate-900">{row.original.courseCode}</span>,
      },
      {
        accessorKey: 'courseName',
        header: 'Tên khóa học',
        cell: ({ row }) => (
          <div className="min-w-0 truncate font-medium text-slate-900">{row.original.courseName}</div>
        ),
      },
      {
        id: 'duration',
        header: 'Thời lượng',
        cell: ({ row }) => formatCourseDuration(row.original.duration ?? undefined) ?? '—',
      },
      {
        id: 'subjects',
        header: 'Số môn học',
        cell: ({ row }) => {
          const count = row.original.numberOfSubject ?? row.original.courseSubjects?.length ?? 0;
          return `${count} môn học`;
        },
      },
      {
        id: 'requests',
        header: 'Số yêu cầu',
        cell: ({ row }) => `${row.original.requests?.length ?? 0} yêu cầu`,
      },
      {
        accessorKey: 'updatedAt',
        header: 'Cập nhật',
        cell: ({ row }) => (row.original.updatedAt ? dayjs(row.original.updatedAt).format('DD/MM/YYYY') : '—'),
      },
    ],
    [],
  );

  return (
    <div className="relative flex min-h-[var(--content-height)] flex-col gap-2 app-page-bg p-6 pb-8">
      <div className="flex shrink-0 flex-col gap-1 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <h2 className="text-xl font-semibold text-black">Danh sách khóa học</h2>
        <p className="text-xs text-gray-500">Xem thông tin các khóa học trong hệ thống</p>
      </div>

      <div className="shrink-0 px-2 py-1">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <HoverSearch
            value={search}
            onChange={(v) => setSearch(v)}
            placeholder="Tìm theo tên khóa học..."
          />
          <Button variant="secondary" className="bg-white h-9 border-slate-200" onClick={resetFilters} type="button">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {isListBlocking ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl bg-white/70 backdrop-blur-[1px]">
            <span className="text-sm text-slate-500">Đang tải...</span>
          </div>
        ) : null}
        <DataTable
          columns={columns}
          data={data}
          pageNumber={pageNumber}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={setPageNumber}
          onRowClick={(row) => {
            void openDetailById(row.courseId);
          }}
          fillHeight
          comfortable
        />
      </div>

      <CourseDetailDrawer
        open={detailOpen}
        onClose={closeDetailFromUrl}
        detailCourse={detailCourse}
        detailLoading={detailLoading}
      />
    </div>
  );
}
