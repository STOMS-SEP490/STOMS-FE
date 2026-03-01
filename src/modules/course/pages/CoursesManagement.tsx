import { useEffect, useMemo, useState } from 'react';

import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Eye } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import dayjs from 'dayjs';
import courseService from '@/modules/course/api/courseApi';
import type { CourseListItem } from '@/modules/course/course';
import { Badge } from '@/shared/components/ui/badge';
import HoverSearch from '@/shared/components/ui/search';
import { DataTable } from '@/shared/components/common/DataTable';

export default function CoursesManagement() {
  const context = useOutletContext<{ position: string }>();

  const [data, setData] = useState<CourseListItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const fetchCourses = async () => {
    try {
      setLoading(true);

      const res = await courseService.getCourses({
        pageNumber,
        pageSize,
        CourseName: search || undefined,
      });

      setData(res.items);
      setTotalItems(res.totalItems);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [pageNumber, search]);

  const columns = useMemo<ColumnDef<CourseListItem>[]>(
    () => [
      {
        accessorKey: 'courseCode',
        header: 'MÃ KHÓA HỌC',
        cell: ({ row }) => (
          <div className="text-sm font-medium">
            {row.original.courseCode}
          </div>
        ),
      },
      {
        accessorKey: 'courseName',
        header: 'TÊN KHÓA HỌC',
      },
      {
        accessorKey: 'isActive',
        header: 'TRẠNG THÁI',
        cell: ({ row }) =>
          row.original.isActive ? (
            <Badge className="bg-green-100 text-green-700">
              Hoạt động
            </Badge>
          ) : (
            <Badge className="bg-orange-100 text-orange-600">
              Ngừng hoạt động
            </Badge>
          ),
      },
      {
        id: 'subjects',
        header: 'SỐ MÔN HỌC',
        cell: ({ row }) =>
          `${row.original.courseSubjects?.length ?? 0} môn học`,
      },
      {
        id: 'requests',
        header: 'SỐ YÊU CẦU',
        cell: ({ row }) =>
          `${row.original.requests?.length ?? 0} yêu cầu`,
      },
      {
        accessorKey: 'updatedAt',
        header: 'CẬP NHẬT',
        cell: ({ row }) =>
          dayjs(row.original.updatedAt).format('DD/MM/YYYY'),
      },
      {
        id: 'actions',
        header: 'HÀNH ĐỘNG',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex gap-3">
            <Pencil
              size={18}
              className="cursor-pointer text-gray-600 hover:text-blue-600"
              onClick={() => console.log('edit', row.original.courseId)}
            />
            <Eye
              size={18}
              className="cursor-pointer text-gray-600 hover:text-blue-600"
              onClick={() => console.log('view', row.original.courseId)}
            />
          </div>
        ),
      },
    ],
    []
  );

  if (context.position === 'toolbar') {
    return (
      <div className="flex gap-3">
        <HoverSearch
          placeholder="Tìm khóa học..."
         
        />
      </div>
    );
  }

  return (
    <div>
      <DataTable
        columns={columns}
        data={data}
        pageNumber={pageNumber}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={(page) => setPageNumber(page)}
      />
    </div>
  );
}