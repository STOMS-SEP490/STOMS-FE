import { DataTable } from '@/components/common/DataTable';
import HoverSearch from '@/components/ui/search';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
type Transaction = {
  id: string
  type: "Đóng góp" | "Chi"
  amount: number
  balanceAfter: number
  performer: string
  createdAt: string
  createdTime: string
}
const data: Transaction[] = [
  {
    id: "TXN-2024-089",
    type: "Đóng góp",
    amount: 500000,
    balanceAfter: 45780000,
    performer: "Nguyễn Văn A",
    createdAt: "30/01/2024",
    createdTime: "15:30",
  },
  {
    id: "TXN-2024-088",
    type: "Chi",
    amount: -1200000,
    balanceAfter: 45280000,
    performer: "Trần Thị B",
    createdAt: "30/01/2024",
    createdTime: "10:15",
  },
  {
    id: "TXN-2024-087",
    type: "Đóng góp",
    amount: 300000,
    balanceAfter: 46480000,
    performer: "Lê Văn C",
    createdAt: "29/01/2024",
    createdTime: "18:45",
  },
  {
    id: "TXN-2024-086",
    type: "Đóng góp",
    amount: 800000,
    balanceAfter: 46180000,
    performer: "Phạm Thị D",
    createdAt: "29/01/2024",
    createdTime: "14:20",
  },
  {
    id: "TXN-2024-085",
    type: "Chi",
    amount: -2500000,
    balanceAfter: 45380000,
    performer: "Hoàng Văn E",
    createdAt: "28/01/2024",
    createdTime: "16:50",
  },
  {
    id: "TXN-2024-084",
    type: "Đóng góp",
    amount: 1000000,
    balanceAfter: 47880000,
    performer: "Đỗ Văn F",
    createdAt: "28/01/2024",
    createdTime: "09:30",
  },
  {
    id: "TXN-2024-083",
    type: "Chi",
    amount: -850000,
    balanceAfter: 46880000,
    performer: "Nguyễn Văn A",
    createdAt: "27/01/2024",
    createdTime: "14:10",
  },
  {
    id: "TXN-2024-082",
    type: "Đóng góp",
    amount: 600000,
    balanceAfter: 47730000,
    performer: "Trần Thị B",
    createdAt: "27/01/2024",
    createdTime: "11:25",
  },
]

const columns: ColumnDef<Transaction>[] = [
  {
    accessorKey: "id",
    header: "Mã GD",
  },
  {
    accessorKey: "performer",
    header: "Người thực hiện",
  },
  {
    accessorKey: "type",
    header: "Loại",
    cell: ({ row }) => {
      const type = row.original.type

      const style =
        type === "Đóng góp"
          ? "bg-green-100 text-green-700"
          : "bg-red-100 text-red-600"

      return (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${style}`}>
          {type}
        </span>
      )
    },
  },
  {
    accessorKey: "amount",
    header: "Số tiền",
    cell: ({ row }) => {
      const amount = row.original.amount
      const isPositive = amount > 0

      return (
        <span
          className={`font-semibold ${
            isPositive ? "text-green-600" : "text-red-600"
          }`}
        >
          {isPositive ? "+" : "-"}{" "}
          {Math.abs(amount).toLocaleString("vi-VN")} đ
        </span>
      )
    },
  },
  {
    accessorKey: "balanceAfter",
    header: "Số dư sau GD",
    cell: ({ row }) => (
      <span className="font-medium">
        {row.original.balanceAfter.toLocaleString("vi-VN")} đ
      </span>
    ),
  },
  
  {
    id: "createdAt",
    header: "Ngày tạo",
    cell: ({ row }) => (
      <div>
        <div>{row.original.createdAt}</div>
        <div className="text-xs text-muted-foreground">
          {row.original.createdTime}
        </div>
      </div>
    ),
  },
  {
    id: "actions",
    header: "Chi tiết",
    enableSorting: false,
    cell: () => <Eye className="w-4 h-4 text-blue-600 cursor-pointer" />,
  },
]
export default function Transactions() {
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
