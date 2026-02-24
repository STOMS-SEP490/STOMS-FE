import { DataTable } from '@/components/common/DataTable';
import HoverSearch from '@/components/ui/search';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, Pencil } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

type Subject = {
  id: string;
  name: string;
  topic: string;
  status: 'active' | 'draft' | 'inactive';
  sessions: number;
  created: string;
};

const data: Subject[] = [
  {
    id: 'SUB-2024-001',
    name: 'Introduction to Neural Networks',
    topic: 'TOPIC-001',
    status: 'active',
    sessions: 12,
    created: '15/01/2024',
  },
  {
    id: 'SUB-2024-002',
    name: 'Arduino Basics',
    topic: 'TOPIC-002',
    status: 'active',
    sessions: 8,
    created: '16/01/2024',
  },
  {
    id: 'SUB-2024-003',
    name: 'Python Data Structures',
    topic: 'TOPIC-003',
    status: 'active',
    sessions: 10,
    created: '17/01/2024',
  },
  {
    id: 'SUB-2024-004',
    name: 'Computer Vision Fundamentals',
    topic: 'TOPIC-001',
    status: 'draft',
    sessions: 15,
    created: '18/01/2024',
  },
  {
    id: 'SUB-2024-005',
    name: 'IoT Sensor Networks',
    topic: 'TOPIC-004',
    status: 'active',
    sessions: 9,
    created: '19/01/2024',
  },
];
const columns: ColumnDef<Subject>[] = [
  {
    accessorKey: 'id',
    header: 'MÃ MÔN HỌC',
    cell: ({ row }) => <div className="text-sm font-medium">{row.original.id}</div>,
  },
  {
    accessorKey: 'name',
    header: 'TÊN MÔN HỌC',
  },
  {
    accessorKey: 'topic',
    header: 'CHỦ ĐỀ',
  },
  {
    accessorKey: 'status',
    header: 'TRẠNG THÁI',
    cell: ({ row }) => {
      const status = row.original.status;

      const statusMap = {
        active: 'Hoạt động',
        draft: 'Nháp',
        inactive: 'Không hoạt động',
      };

      const colorMap = {
        active: 'bg-green-100 text-green-700',
        draft: 'bg-orange-100 text-orange-600',
        inactive: 'bg-red-100 text-red-600',
      };

      return (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${colorMap[status]}`}>
          {statusMap[status]}
        </span>
      );
    },
  },

  {
    accessorKey: 'sessions',
    header: 'SỐ BUỔI HỌC',
    cell: ({ row }) => `${row.original.sessions} buổi`,
  },
  {
    accessorKey: 'created',
    header: 'NGÀY TẠO',
  },
  {
    id: 'actions',
    header: 'HÀNH ĐỘNG',
    enableSorting: false,
    cell: () => (
      <div className="flex gap-3">
        <Eye size={16} className="text-gray-600 cursor-pointer" />
        <Pencil size={16} className="text-gray-600 cursor-pointer" />
      </div>
    ),
  },
];
export default function SubjectsManagement() {
  const context = useOutletContext<{ position: string }>();

  if (context.position === 'toolbar') {
    return (
      <div className="flex gap-3">
        <HoverSearch placeholder="Tìm môn học..." />{' '}
      </div>
    );
  }
  return <DataTable columns={columns} data={data} />;
}
