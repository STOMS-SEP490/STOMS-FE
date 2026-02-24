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
  FileText,
  GraduationCap,
  Plus,
  RotateCcw,
} from 'lucide-react';

type Contract = {
  id: string;
  requestCode: string;
  payer: string;
  receiver: string;
  status: 'Đang hiệu lực' | 'Chờ xử lý' | 'Hoàn thành' | 'Đã hủy' | 'Hết hạn';
  amount: number;
  createdAt: string;
};

const data: Contract[] = [
  {
    id: 'CTR-2024-001',
    requestCode: 'REQ-2024-0234',
    payer: 'PAY-001',
    receiver: 'PAY-089',
    status: 'Đang hiệu lực',
    amount: 45000000,
    createdAt: '15/01/2024',
  },
  {
    id: 'CTR-2024-002',
    requestCode: 'REQ-2024-0235',
    payer: 'PAY-002',
    receiver: 'PAY-045',
    status: 'Chờ xử lý',
    amount: 32500000,
    createdAt: '18/01/2024',
  },
  {
    id: 'CTR-2024-003',
    requestCode: 'REQ-2024-0236',
    payer: 'PAY-003',
    receiver: 'PAY-078',
    status: 'Đang hiệu lực',
    amount: 58000000,
    createdAt: '20/01/2024',
  },
  {
    id: 'CTR-2024-004',
    requestCode: 'REQ-2024-0237',
    payer: 'PAY-004',
    receiver: 'PAY-056',
    status: 'Hoàn thành',
    amount: 25000000,
    createdAt: '22/01/2024',
  },
  {
    id: 'CTR-2024-005',
    requestCode: 'REQ-2024-0238',
    payer: 'PAY-005',
    receiver: 'PAY-034',
    status: 'Đã hủy',
    amount: 15000000,
    createdAt: '23/01/2024',
  },
  {
    id: 'CTR-2024-006',
    requestCode: 'REQ-2024-0239',
    payer: 'PAY-006',
    receiver: 'PAY-067',
    status: 'Đang hiệu lực',
    amount: 72000000,
    createdAt: '25/01/2024',
  },
  {
    id: 'CTR-2024-007',
    requestCode: 'REQ-2024-0240',
    payer: 'PAY-007',
    receiver: 'PAY-023',
    status: 'Chờ xử lý',
    amount: 28000000,
    createdAt: '26/01/2024',
  },
  {
    id: 'CTR-2024-008',
    requestCode: 'REQ-2024-0241',
    payer: 'PAY-008',
    receiver: 'PAY-091',
    status: 'Đang hiệu lực',
    amount: 38500000,
    createdAt: '27/01/2024',
  },
  {
    id: 'CTR-2024-009',
    requestCode: 'REQ-2024-0242',
    payer: 'PAY-009',
    receiver: 'PAY-012',
    status: 'Hết hạn',
    amount: 42000000,
    createdAt: '28/01/2024',
  },
];
const columns: ColumnDef<Contract>[] = [
  {
    accessorKey: 'id',
    header: 'Mã hợp đồng',
  },
  {
    accessorKey: 'requestCode',
    header: 'Mã yêu cầu',
  },
  {
    accessorKey: 'payer',
    header: 'Người trả',
  },
  {
    accessorKey: 'receiver',
    header: 'Người nhận',
  },
  {
    accessorKey: 'status',
    header: 'Trạng thái',
    cell: ({ row }) => {
      const status = row.original.status;

      const statusStyle = {
        'Đang hiệu lực': 'bg-green-100 text-green-700',
        'Chờ xử lý': 'bg-orange-100 text-orange-700',
        'Hoàn thành': 'bg-blue-100 text-blue-700',
        'Đã hủy': 'bg-red-100 text-red-600',
        'Hết hạn': 'bg-purple-100 text-purple-700',
      };

      return (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyle[status]}`}>
          {status}
        </span>
      );
    },
  },
  {
    accessorKey: 'amount',
    header: 'Số tiền',
    cell: ({ row }) => (
      <span className="font-semibold">{row.original.amount.toLocaleString()} đ</span>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Ngày tạo',
  },
  {
    id: 'document',
    header: 'Tài liệu',
    enableSorting: false,
    cell: () => <FileText className="w-4 h-4 text-blue-600 cursor-pointer" />,
  },
  {
    id: 'actions',
    header: 'Thao tác',
    enableSorting: false,
    cell: () => <Eye className="w-4 h-4 text-blue-600 cursor-pointer" />,
  },
];
export default function ContractsManagement() {
  return (
    <div className=" p-6 space-y-6 ">
      {/* HEADER */}
      <div className="flex justify-between bg-white px-6 py-4 mb-2 rounded-xl border shadow-sm items-center">
        <div>
          <h2 className="text-xl font-semibold text-black">Quản lý hợp đồng</h2>
          <p className="text-xs text-gray-500">Quản lý hợp đồng giảng viên và trợ giảng</p>
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

      {/* Filter Bar */}
      <div className="flex justify-end gap-3 mb-2">
        <HoverSearch />
        <div className="flex items-center gap-3">
          {/* Status Filter */}
          <Select>
            <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white">
              <SelectValue placeholder="Trạng thái" />
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
