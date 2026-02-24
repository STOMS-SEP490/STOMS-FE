import { DataTable } from '@/components/common/DataTable';
import { StatCard } from '@/components/common/StatCard';
import { Button } from '@/components/ui/button';
import HoverSearch from '@/components/ui/search';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ColumnDef } from '@tanstack/react-table';
import {
  BookOpen,
  CheckCircle,
  Clock,
  Eye,
  GraduationCap,
  Pencil,
  Plus,
  RotateCcw,
} from 'lucide-react';

type Event = {
  id: string;
  name: string;
  status: 'Hoạt động' | 'Nháp' | 'Đã hoàn thành';
  duration: string;
  sessions: number;
  createdAt: string;
};
const data: Event[] = [
  {
    id: 'EVT-2024-001',
    name: 'AI Innovation Summit 2024',
    status: 'Hoạt động',
    duration: '3 ngày',
    sessions: 12,
    createdAt: '10/01/2024',
  },
  {
    id: 'EVT-2024-002',
    name: 'Robotics Workshop Series',
    status: 'Hoạt động',
    duration: '5 tuần',
    sessions: 10,
    createdAt: '12/01/2024',
  },
  {
    id: 'EVT-2024-003',
    name: 'Python Coding Bootcamp',
    status: 'Nháp',
    duration: '2 tuần',
    sessions: 8,
    createdAt: '15/01/2024',
  },
  {
    id: 'EVT-2024-004',
    name: 'IoT Smart Home Hackathon',
    status: 'Hoạt động',
    duration: '1 ngày',
    sessions: 4,
    createdAt: '18/01/2024',
  },
  {
    id: 'EVT-2024-005',
    name: 'Data Science Masterclass',
    status: 'Hoạt động',
    duration: '4 tuần',
    sessions: 16,
    createdAt: '20/01/2024',
  },
  {
    id: 'EVT-2024-006',
    name: '3D Printing & Design Challenge',
    status: 'Hoạt động',
    duration: '2 ngày',
    sessions: 6,
    createdAt: '22/01/2024',
  },
  {
    id: 'EVT-2024-007',
    name: 'Computer Vision Workshop',
    status: 'Đã hoàn thành',
    duration: '1 tuần',
    sessions: 5,
    createdAt: '05/01/2024',
  },
  {
    id: 'EVT-2024-008',
    name: 'Mobile App Development Sprint',
    status: 'Hoạt động',
    duration: '3 tuần',
    sessions: 9,
    createdAt: '25/01/2024',
  },
];
const columns: ColumnDef<Event>[] = [
  {
    accessorKey: 'id',
    header: 'Mã sự kiện',
  },
  {
    accessorKey: 'name',
    header: 'Tên sự kiện',
  },
  {
    accessorKey: 'status',
    header: 'Trạng thái',
    cell: ({ row }) => {
      const status = row.original.status;

      const statusStyle = {
        'Hoạt động': 'bg-green-100 text-green-700',
        Nháp: 'bg-orange-100 text-orange-700',
        'Đã hoàn thành': 'bg-blue-100 text-blue-700',
      };

      return (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyle[status]}`}>
          {status}
        </span>
      );
    },
  },
  {
    accessorKey: 'duration',
    header: 'Thời lượng',
  },
  {
    accessorKey: 'sessions',
    header: 'Số buổi',
    cell: ({ row }) => <span className="font-medium">{row.original.sessions} buổi</span>,
  },
  {
    accessorKey: 'createdAt',
    header: 'Ngày tạo',
  },
  {
    id: 'actions',
    header: 'Thao tác',
    enableSorting: false,
    cell: () => (
      <div className="flex gap-3">
        <Pencil className="w-4 h-4 text-blue-600 cursor-pointer" />
        <Eye className="w-4 h-4 text-blue-600 cursor-pointer" />
      </div>
    ),
  },
];
export default function EventsManagement() {
  return (
    <div className=" p-6 space-y-6 ">
      {/* HEADER */}
      <div className="flex justify-between bg-white px-6 py-4 mb-2 rounded-xl border shadow-sm items-center">
        <div>
          <h2 className="text-xl font-semibold text-black">Quản lý sự kiện</h2>
          <p className="text-xs text-gray-500">
            Quản lý các sự kiện đã được ghi lại trong hệ thống
          </p>
        </div>

        <div className="flex gap-3 items-center">
          <Button className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white px-3 py-2 rounded-md">
            <Plus size={16} />
            Thêm nhóm mới
          </Button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-4 gap-4 mb-2">
        <StatCard
          icon={<GraduationCap />}
          label="Tổng người dùng"
          value="186"
          sub="tài khoản đang hoạt động"
        />
        <StatCard
          icon={<CheckCircle />}
          label="Tổng giảng viên"
          value="42"
          sub="giảng viên và trợ giảng"
          variant="green"
        />
        <StatCard
          icon={<BookOpen />}
          label="Vô hiệu hóa"
          value="156"
          sub="người dùng đã bị vô hiệu hóa"
        />
        <StatCard icon={<Clock />} label="Tổng buổi học" value="1,248" sub="Buổi học" />
      </div>

      {/* Filter Bar */}
      <div className="flex justify-end gap-3 mb-2">
        <HoverSearch />
        <div className="flex items-center gap-3">
          {/* Group Filter */}
          <Select>
            <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="group-a">Group A</SelectItem>
              <SelectItem value="group-b">Group B</SelectItem>
              <SelectItem value="group-c">Group C</SelectItem>
            </SelectContent>
          </Select>

          {/* Reset Button */}
          <Button variant="secondary" className="bg-white">
            <RotateCcw />
          </Button>
        </div>
      </div>
      {/* TABLE CARD */}
      <div className="bg-white rounded-xl border shadow-sm px-6 py-4">
        <DataTable columns={columns} data={data} />
      </div>
    </div>
  );
}
