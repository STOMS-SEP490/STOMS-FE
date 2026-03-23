import { useLayoutEffect, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useOutletContext } from 'react-router-dom';
import dayjs from 'dayjs';
import type { CourseListItem } from '@/modules/course/courseType';
import { Badge } from '@/shared/components/ui/badge';
import { DataTable } from '@/shared/components/common/DataTable';
import { TableTextAction } from '@/shared/components/common/TableTextAction';
import type { CoursesReadonlyOutletContext } from '@/modules/course/pages/coursesReadonlyOutletContext';
import { useCourses } from '@/modules/course/hooks/useCourses';
import { useCourseDetailDrawer } from '@/modules/course/hooks/useCourseDetailDrawer';
import { CourseDetailDrawer } from '@/modules/course/components/CourseDetailDrawer';

export default function CoursesReadonlyPage() {
  const { courseSearch, setCourseSearch } = useOutletContext<CoursesReadonlyOutletContext>();
  const {
    data,
    loading,
    pageNumber,
    pageSize,
    totalItems,
    setPageNumber,
  } = useCourses({
    search: courseSearch,
    setSearch: setCourseSearch,
  });

  const { detailOpen, detailCourse, detailLoading, closeDetailFromUrl, openDetailById } =
    useCourseDetailDrawer();

  useLayoutEffect(() => {
    setPageNumber(1);
  }, [courseSearch, setPageNumber]);

  const columns = useMemo<ColumnDef<CourseListItem>[]>(
    () => [
      {
        accessorKey: 'courseCode',
        header: 'Mã khóa học',
        cell: ({ row }) => <span className="font-semibold text-gray-900">{row.original.courseCode}</span>,
      },
      {
        accessorKey: 'courseName',
        header: 'Tên khóa học',
        cell: ({ row }) => (
          <div className="min-w-0 font-medium text-gray-900 truncate">{row.original.courseName}</div>
        ),
      },
      {
        accessorKey: 'isActive',
        header: 'Trạng thái',
        cell: ({ row }) =>
          row.original.isActive ? (
            <Badge className="bg-green-100 text-green-700">Hoạt động</Badge>
          ) : (
            <Badge className="bg-orange-100 text-orange-600">Ngừng hoạt động</Badge>
          ),
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
      {
        id: 'actions',
        header: 'Thao tác',
        enableSorting: false,
        cell: ({ row }) => (
          <TableTextAction onClick={() => void openDetailById(row.original.courseId)} />
        ),
      },
    ],
    [openDetailById],
  );

  return (
    <div className="relative flex w-full min-w-0 flex-1 min-h-0 flex-col">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/60">
          <span className="text-sm text-slate-500">Đang tải...</span>
        </div>
      )}
      <DataTable
        columns={columns}
        data={data}
        pageNumber={pageNumber}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={setPageNumber}
        fillHeight
        comfortable
      />

      <CourseDetailDrawer
        open={detailOpen}
        onClose={closeDetailFromUrl}
        detailCourse={detailCourse}
        detailLoading={detailLoading}
      />
    </div>
  );
}
