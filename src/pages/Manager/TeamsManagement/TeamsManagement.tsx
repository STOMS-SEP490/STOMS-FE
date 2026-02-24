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

type Team = {
  id: string;
  name: string;
  code: string;
  leaderName: string;
  topic: string;
};
const data: Team[] = [
  {
    id: 'TEAM-2024-001',
    code: 'AP',
    name: 'AI Pioneers',
    leaderName: 'Nguyễn Văn A',
    topic: 'Trí tuệ nhân tạo AI',
  },
  {
    id: 'TEAM-2024-002',
    code: 'RB',
    name: 'Robotics Builders',
    leaderName: 'Trần Thị B',
    topic: 'Robot & Tự động hóa',
  },
  {
    id: 'TEAM-2024-003',
    code: 'SI',
    name: 'STEM Innovators',
    leaderName: 'Lê Văn C',
    topic: 'Hệ thống thông minh',
  },
  {
    id: 'TEAM-2024-004',
    code: 'DS',
    name: 'Data Scientists',
    leaderName: 'Phạm Thị D',
    topic: 'Khoa học dữ liệu',
  },
  {
    id: 'TEAM-2024-005',
    code: 'EM',
    name: 'Engineering Minds',
    leaderName: 'Hoàng Văn E',
    topic: 'Kỹ thuật & thiết kế',
  },
  {
    id: 'TEAM-2024-006',
    code: 'ML',
    name: 'Machine Learning Masters',
    leaderName: 'Đỗ Văn F',
    topic: 'Trí tuệ nhân tạo AI',
  },
  {
    id: 'TEAM-2024-007',
    code: 'IA',
    name: 'IoT Architects',
    leaderName: 'Nguyễn Văn A',
    topic: 'Hệ thống thông minh',
  },
];
const columns: ColumnDef<Team>[] = [
  {
    accessorKey: 'id',
    header: 'Mã nhóm',
  },
  {
    accessorKey: 'name',
    header: 'Tên nhóm',
  },
  {
    accessorKey: 'leaderName',
    header: 'Trưởng nhóm',
  },
  {
    accessorKey: 'topic',
    header: 'Chủ đề',
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
export default function TeamsManagement() {
  return (
    <div className=" p-6 space-y-6 ">
      {/* HEADER */}
      <div className="flex justify-between bg-white px-6 py-4 mb-2 rounded-xl border shadow-sm items-center">
        <div>
          <h2 className="text-xl font-semibold text-black">Quản lý nhóm</h2>
          <p className="text-xs text-gray-500">Quản lý </p>
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
              <SelectValue placeholder="Chủ đề" />
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
