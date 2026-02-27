import { useEffect, useMemo, useState } from 'react';
import { DataTable } from '@/components/common/DataTable';
import HoverSearch from '@/components/ui/search';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, Pencil } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import dayjs from 'dayjs';
import subjectService from '@/services/subjectService';
import type { SubjectListItem } from '@/types/subject';

export default function SubjectsManagement() {
  const context = useOutletContext<{ position: string }>();

  const [data, setData] = useState<SubjectListItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const fetchSubjects = async () => {
    try {
      setLoading(true);

      const res = await subjectService.getSubjects({
        pageNumber,
        pageSize,
        SubjectName: search || undefined,
      });

      setData(res.items);
      setTotalItems(res.totalItems);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, [pageNumber, search]);

  const columns = useMemo<ColumnDef<SubjectListItem>[]>(
    () => [
      {
        accessorKey: 'subjectCode',
        header: 'MÃ MÔN HỌC',
        cell: ({ row }) => (
          <div className="text-sm font-medium">
            {row.original.subjectCode}
          </div>
        ),
      },
      {
        accessorKey: 'subjectName',
        header: 'TÊN MÔN HỌC',
      },
      {
        accessorKey: 'topicId',
        header: 'CHỦ ĐỀ',
        cell: ({ row }) => `TOPIC-${row.original.topicId}`,
      },
      {
        accessorKey: 'isActive',
        header: 'TRẠNG THÁI',
        cell: ({ row }) => {
          const active = row.original.isActive;

          return active ? (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
              Hoạt động
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600">
              Không hoạt động
            </span>
          );
        },
      },
      {
        accessorKey: 'numberOfSession',
        header: 'SỐ BUỔI HỌC',
        cell: ({ row }) =>
          `${row.original.numberOfSession ?? 0} buổi`,
      },
      {
        accessorKey: 'createdAt',
        header: 'NGÀY TẠO',
        cell: ({ row }) =>
          dayjs(row.original.createdAt).format('DD/MM/YYYY'),
      },
      {
        id: 'actions',
        header: 'HÀNH ĐỘNG',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex gap-3">
            <Eye
              size={16}
              className="text-gray-600 cursor-pointer hover:text-blue-600"
              onClick={() => console.log('view', row.original.subjectId)}
            />
            <Pencil
              size={16}
              className="text-gray-600 cursor-pointer hover:text-blue-600"
              onClick={() => console.log('edit', row.original.subjectId)}
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
          placeholder="Tìm môn học..."
          
        />
      </div>
    );
  }

  return (
    <DataTable
      columns={columns}
      data={data}
      pageNumber={pageNumber}
      pageSize={pageSize}
      totalItems={totalItems}
      onPageChange={(page) => setPageNumber(page)}
    />
  );
}