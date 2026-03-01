import { DataTable } from '@/shared/components/common/DataTable';
import { StatCard } from '@/shared/components/common/StatCard';
import { Button } from '@/shared/components/ui/button';
import HoverSearch from '@/shared/components/ui/search';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import type { ColumnDef } from '@tanstack/react-table';
import { BookOpen, CheckCircle, Clock, Eye, GraduationCap, Plus, RotateCcw } from 'lucide-react';


type ActivityLog = {
  id: string;
  createdAt: string;
  createdTime: string;
  user: string;
  action: 'Tạo' | 'Cập nhật' | 'Duyệt' | 'Xóa' | 'Xem' | 'Từ chối';
  entityType: 'Event' | 'Contract' | 'Transaction' | 'Equipment' | 'User' | 'Team';
  entityId: string;
  description: string;
};

const data: ActivityLog[] = [
  {
    id: 'LOG-2024-12847',
    createdAt: '31/01/2024',
    createdTime: '14:23:45',
    user: 'Nguyễn Văn A',
    action: 'Tạo',
    entityType: 'Event',
    entityId: 'EVT-2024-025',
    description: 'Tạo sự kiện mới: Web Development Bootcamp',
  },
  {
    id: 'LOG-2024-12846',
    createdAt: '31/01/2024',
    createdTime: '13:45:12',
    user: 'Trần Thị B',
    action: 'Cập nhật',
    entityType: 'Contract',
    entityId: 'CTR-2024-089',
    description: 'Cập nhật thông tin hợp đồng: Thay đổi điều khoản',
  },
  {
    id: 'LOG-2024-12845',
    createdAt: '31/01/2024',
    createdTime: '12:30:08',
    user: 'Lê Văn C',
    action: 'Duyệt',
    entityType: 'Transaction',
    entityId: 'TXN-2024-456',
    description: 'Phê duyệt giao dịch đóng góp quỹ: 5.000.000đ',
  },
  {
    id: 'LOG-2024-12844',
    createdAt: '31/01/2024',
    createdTime: '11:15:22',
    user: 'Phạm Thị D',
    action: 'Xóa',
    entityType: 'Equipment',
    entityId: 'EQP-2024-012',
    description: 'Xóa thiết bị: Laptop Dell Inspiron 15',
  },
  {
    id: 'LOG-2024-12843',
    createdAt: '31/01/2024',
    createdTime: '10:42:35',
    user: 'Hoàng Văn E',
    action: 'Tạo',
    entityType: 'User',
    entityId: 'USR-2024-156',
    description: 'Tạo tài khoản người dùng mới',
  },
  {
    id: 'LOG-2024-12842',
    createdAt: '31/01/2024',
    createdTime: '09:28:17',
    user: 'Nguyễn Văn A',
    action: 'Cập nhật',
    entityType: 'Team',
    entityId: 'TM-2024-008',
    description: 'Cập nhật thành viên nhóm',
  },
  {
    id: 'LOG-2024-12841',
    createdAt: '31/01/2024',
    createdTime: '08:55:43',
    user: 'Trần Thị B',
    action: 'Xem',
    entityType: 'Contract',
    entityId: 'CTR-2024-078',
    description: 'Xem chi tiết hợp đồng',
  },
  {
    id: 'LOG-2024-12840',
    createdAt: '31/01/2024',
    createdTime: '08:12:29',
    user: 'Lê Văn C',
    action: 'Từ chối',
    entityType: 'Transaction',
    entityId: 'TXN-2024-432',
    description: 'Từ chối giao dịch: Thiếu chứng từ hợp lệ',
  },
  {
    id: 'LOG-2024-12839',
    createdAt: '31/01/2024',
    createdTime: '07:35:51',
    user: 'Phạm Thị D',
    action: 'Tạo',
    entityType: 'Equipment',
    entityId: 'EQP-2024-045',
    description: 'Thêm thiết bị mới: Arduino Starter Kit x10',
  },
];

const columns: ColumnDef<ActivityLog>[] = [
  {
    accessorKey: 'id',
    header: 'Mã nhật ký',
  },
  {
    id: 'createdAt',
    header: 'Thời gian',
    cell: ({ row }) => (
      <div>
        <div>{row.original.createdAt}</div>
        <div className="text-xs text-muted-foreground">{row.original.createdTime}</div>
      </div>
    ),
  },
  {
    accessorKey: 'user',
    header: 'Người dùng',
  },
  {
    accessorKey: 'action',
    header: 'Hành động',
    cell: ({ row }) => {
      const action = row.original.action;

      const colorMap: Record<string, string> = {
        Tạo: 'bg-green-100 text-green-700',
        'Cập nhật': 'bg-blue-100 text-blue-700',
        Duyệt: 'bg-purple-100 text-purple-700',
        Xóa: 'bg-red-100 text-red-600',
        Xem: 'bg-orange-100 text-orange-700',
        'Từ chối': 'bg-rose-100 text-rose-600',
      };

      return (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${colorMap[action]}`}>
          {action}
        </span>
      );
    },
  },
  {
    accessorKey: 'entityType',
    header: 'Loại thực thể',
  },
  {
    accessorKey: 'entityId',
    header: 'Mã thực thể',
    cell: ({ row }) => (
      <span className="text-blue-600 font-medium cursor-pointer">{row.original.entityId}</span>
    ),
  },
  {
    accessorKey: 'description',
    header: 'Mô tả',
  },
  {
    id: 'actions',
    header: 'Chi tiết',
    enableSorting: false,
    cell: () => <Eye className="w-4 h-4 text-blue-600 cursor-pointer" />,
  },
];
export default function AuditLogs() {
  return (
    <div className=" p-6 space-y-6 ">
      {/* HEADER */}
      <div className="flex justify-between bg-white px-6 py-4 mb-2 rounded-xl border shadow-sm items-center">
        <div>
          <h2 className="text-xl font-semibold text-black">Quản lý nhật ký hoạt động</h2>
          <p className="text-xs text-gray-500">Quản lý nhật ký hoạt động của người dùng</p>
        </div>

        <div className="flex gap-3 items-center">
          <Button className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white px-3 py-2 rounded-md">
            <Plus size={16} />
            Thêm người dùng
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
      {/* <div className="flex justify-between bg-white px-6 py-4 mb-2 rounded-xl border shadow-sm items-center ">
  <HoverSearch />
</div> */}{' '}
      {/* Filter Bar */}
      <div className="flex justify-end gap-3 mb-2">
        <HoverSearch />
        <div className="flex items-center gap-3">
          {/* Role Filter */}
          <Select>
            <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white ">
              <SelectValue placeholder="Hành động" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="coordinator">Program Coordinator</SelectItem>
              <SelectItem value="teacher">Teacher</SelectItem>
              <SelectItem value="ta">Teaching Assistant</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select>
            <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white">
              <SelectValue placeholder="Loại" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
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
