import { DataTable } from '@/components/common/DataTable';
import HoverSearch from '@/components/ui/search';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
type Expense = {
  id: string;
  amount: number;
  balanceAfter: number;
  performer: string;
  createdAt: string;
  createdTime: string;
};
const data: Expense[] = [
  {
    id: 'TXN-2024-088',
    amount: -1200000,
    balanceAfter: 45280000,
    performer: 'Trần Thị B',
    createdAt: '30/01/2024',
    createdTime: '10:15',
  },
  {
    id: 'TXN-2024-085',
    amount: -2500000,
    balanceAfter: 45380000,
    performer: 'Hoàng Văn E',
    createdAt: '28/01/2024',
    createdTime: '16:50',
  },
  {
    id: 'TXN-2024-083',
    amount: -850000,
    balanceAfter: 46880000,
    performer: 'Nguyễn Văn A',
    createdAt: '27/01/2024',
    createdTime: '14:10',
  },
];

const columns: ColumnDef<Expense>[] = [
  {
    accessorKey: 'id',
    header: 'Mã GD',
  },
  {
    accessorKey: 'performer',
    header: 'Người thực hiện',
  },

  {
    accessorKey: 'amount',
    header: 'Số tiền',
    cell: ({ row }) => {
      const amount = row.original.amount;
      const isPositive = amount > 0;

      return (
        <span className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? '+' : '-'} {Math.abs(amount).toLocaleString('vi-VN')} đ
        </span>
      );
    },
  },
  {
    accessorKey: 'balanceAfter',
    header: 'Số dư sau GD',
    cell: ({ row }) => (
      <span className="font-medium">{row.original.balanceAfter.toLocaleString('vi-VN')} đ</span>
    ),
  },

  {
    id: 'createdAt',
    header: 'Ngày tạo',
    cell: ({ row }) => (
      <div>
        <div>{row.original.createdAt}</div>
        <div className="text-xs text-muted-foreground">{row.original.createdTime}</div>
      </div>
    ),
  },
  {
    id: 'actions',
    header: 'Chi tiết',
    enableSorting: false,
    cell: () => <Eye className="w-4 h-4 text-blue-600 cursor-pointer" />,
  },
];
export default function ExpenditureFund() {
  const context = useOutletContext<{ position: string }>();

  if (context.position === 'toolbar') {
    return (
      <div className="flex gap-3">
        <HoverSearch placeholder="Tìm tên thiết bị..." />
      </div>
    );
  }
  return (
    <div>
      <DataTable columns={columns} data={data} />
    </div>
  );
}
