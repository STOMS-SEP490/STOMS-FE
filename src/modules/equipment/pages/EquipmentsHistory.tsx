import { DataTable } from '@/shared/components/common/DataTable';
import { Button } from '@/shared/components/ui/button';
import HoverSearch from '@/shared/components/ui/search';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, RotateCcw } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
type BorrowSlip = {
  id: string;
  borrowerName: string;
  email: string;
  borrowDate: string;
  borrowTime: string;
  dueDate: string;
  dueNote: string;
  status: 'Quá hạn' | 'Đang mượn' | 'Đã trả' | 'Trả 1 phần';
};
const data: BorrowSlip[] = [
  {
    id: '#PM-2024-0154',
    borrowerName: 'Phạm Minh Đức',
    email: 'duc.pham@stoms.vn',
    borrowDate: '05/01/2024',
    borrowTime: '08:30',
    dueDate: '12/01/2024',
    dueNote: 'Quá hạn 3 ngày',
    status: 'Quá hạn',
  },
  {
    id: '#PM-2024-0156',
    borrowerName: 'Trần Thị Bình',
    email: 'binh.tran@stoms.vn',
    borrowDate: '15/01/2024',
    borrowTime: '09:15',
    dueDate: '22/01/2024',
    dueNote: 'Còn 7 ngày',
    status: 'Đang mượn',
  },
  {
    id: '#PM-2024-0155',
    borrowerName: 'Lê Văn Cường',
    email: 'cuong.le@stoms.vn',
    borrowDate: '12/01/2024',
    borrowTime: '14:20',
    dueDate: '15/01/2024',
    dueNote: 'Đã trả đúng hạn',
    status: 'Đã trả',
  },
  {
    id: '#PM-2024-0153',
    borrowerName: 'Ngô Thị Hương',
    email: 'huong.ngo@stoms.vn',
    borrowDate: '14/01/2024',
    borrowTime: '10:00',
    dueDate: '21/01/2024',
    dueNote: 'Còn 6 ngày',
    status: 'Đang mượn',
  },
  {
    id: '#PM-2024-0152',
    borrowerName: 'Vũ Đình Khoa',
    email: 'khoa.vu@stoms.vn',
    borrowDate: '13/01/2024',
    borrowTime: '11:45',
    dueDate: '21/01/2024',
    dueNote: 'Còn 5 ngày',
    status: 'Trả 1 phần',
  },
  {
    id: '#PM-2024-0151',
    borrowerName: 'Trần Văn Hùng',
    email: 'hung.tran@stoms.vn',
    borrowDate: '10/01/2024',
    borrowTime: '13:30',
    dueDate: '15/01/2024',
    dueNote: 'Hôm nay',
    status: 'Đang mượn',
  },
  {
    id: '#PM-2024-0150',
    borrowerName: 'Lê Minh Tuấn',
    email: 'tuan.le@stoms.vn',
    borrowDate: '08/01/2024',
    borrowTime: '09:00',
    dueDate: '18/01/2024',
    dueNote: 'Còn 3 ngày',
    status: 'Đang mượn',
  },
];

const columns: ColumnDef<BorrowSlip>[] = [
  {
    accessorKey: 'id',
    header: 'Mã phiếu',
  },
  {
    id: 'borrower',
    header: 'Người mượn',
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.borrowerName}</div>
        <div className="text-xs text-muted-foreground">{row.original.email}</div>
      </div>
    ),
  },
  {
    id: 'borrowDate',
    header: 'Ngày mượn',
    cell: ({ row }) => (
      <div>
        <div>{row.original.borrowDate}</div>
        <div className="text-xs text-muted-foreground">{row.original.borrowTime}</div>
      </div>
    ),
  },
  {
    id: 'dueDate',
    header: 'Hạn trả',
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.dueDate}</div>
        <div
          className={`text-xs ${
            row.original.status === 'Quá hạn'
              ? 'text-red-500'
              : row.original.status === 'Đã trả'
                ? 'text-green-600'
                : 'text-muted-foreground'
          }`}
        >
          {row.original.dueNote}
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Trạng thái',
    cell: ({ row }) => {
      const status = row.original.status;

      const statusStyle = {
        'Quá hạn': 'bg-red-100 text-red-600',
        'Đang mượn': 'bg-green-100 text-green-700',
        'Đã trả': 'bg-blue-100 text-blue-700',
        'Trả 1 phần': 'bg-gray-200 text-gray-700',
      };

      return (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyle[status]}`}>
          {status}
        </span>
      );
    },
  },
  {
    id: 'actions',
    header: 'Thao tác',
    enableSorting: false,
    cell: () => <Eye className="w-4 h-4 text-blue-600 cursor-pointer" />,
  },
];
export default function EquipmentsHistory() {
  const context = useOutletContext<{ position: string }>();

  if (context.position === 'toolbar') {
    return (
      <div className="flex gap-3">
        <HoverSearch placeholder="Tìm tên thiết bị..." />

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
    );
  }
  return (
    <div>
      <DataTable columns={columns} data={data} />
    </div>
  );
}
