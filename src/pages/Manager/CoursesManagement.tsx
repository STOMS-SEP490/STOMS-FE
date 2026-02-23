import { DataTable } from '@/components/common/DataTable';
import { Badge } from '@/components/ui/badge';
import HoverSearch from '@/components/ui/search';
import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Eye  } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

type Course = {
  id: string;
  name: string;
  status: string;
  subjects: number;
  updated: string;
};

const data: Course[] = [
  {
    id: 'CRS-2024-001',
    name: 'AI Foundation for Kids',
    status: 'active',
    subjects: 8,
    updated: '28/01/2024',
  },
  {
    id: 'CRS-2024-002',
    name: 'Robotics Programming Level 1',
    status: 'active',
    subjects: 6,
    updated: '27/01/2024',
  },
  {
    id: 'CRS-2024-003',
    name: 'Python for Beginners',
    status: 'draft',
    subjects: 4,
    updated: '26/01/2024',
  },
];

const columns: ColumnDef<Course>[] = [
  {
    accessorKey: 'id',
    header: 'MÃ KHÓA HỌC',
     cell: ({ row }) => (
      <div className="text-sm font-medium">
        {row.original.id}
      </div>
    ),
  },
  {
    accessorKey: 'name',
    header: 'TÊN KHÓA HỌC',
  },
  {
    accessorKey: 'status',
    header: 'TRẠNG THÁI',
    cell: ({ row }) =>
      row.original.status === 'active' ? (
        <Badge className="bg-green-100 text-green-700">Hoạt động</Badge>
      ) : (
        <Badge className="bg-orange-100 text-orange-600">Ngừng hoạt động</Badge>
      ),
  },
  {
    accessorKey: 'subjects',
    header: 'SỐ MÔN HỌC',
    cell: ({ row }) => `${row.original.subjects} môn học`,
  },
  {
    accessorKey: 'updated',
    header: 'CẬP NHẬT',
  },
  {
    id: 'actions',
    header: 'HÀNH ĐỘNG',
    enableSorting: false,
    cell: () => (
      <div className="flex gap-3">
        <Pencil size={18} className="cursor-pointer text-gray-600 hover:text-blue-600" />
        <Eye size={18} className="cursor-pointer text-gray-600 hover:text-blue-600" />
      </div>
    ),
  },
];

export default function CoursesManagement() {
  const context = useOutletContext<{ position: string }>()

  if (context.position === "toolbar") {
    return (
      <div className="flex gap-3">
<HoverSearch
  placeholder="Tìm khóa học..."
/>      </div>
    )
  }
  return <div>
  <DataTable columns={columns} data={data} /></div> 
}
