import { DataTable } from "@/components/common/DataTable";
import { Badge } from "@/components/ui/badge";
import HoverSearch from "@/components/ui/search";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { useOutletContext } from "react-router-dom";
 type Category = {
  id: string
  name: string
  description: string
  totalDevices: number
  borrowing: number
  createdAt: string
}
const data: Category[] = [
  {
    id: "CAT-001",
    name: "Laptop",
    description: "Máy tính xách tay phục vụ giảng dạy và học tập",
    totalDevices: 45,
    borrowing: 12,
    createdAt: "15/01/2024",
  },
  {
    id: "CAT-002",
    name: "Màn hình",
    description: "Màn hình rời cho phòng lab và văn phòng",
    totalDevices: 32,
    borrowing: 8,
    createdAt: "18/01/2024",
  },
  {
    id: "CAT-003",
    name: "Bàn phím",
    description: "Bàn phím cơ và bàn phím văn phòng",
    totalDevices: 28,
    borrowing: 5,
    createdAt: "20/01/2024",
  },
  {
    id: "CAT-004",
    name: "Chuột máy tính",
    description: "Chuột quang và chuột gaming",
    totalDevices: 35,
    borrowing: 7,
    createdAt: "22/01/2024",
  },
  {
    id: "CAT-005",
    name: "Máy chiếu",
    description: "Thiết bị trình chiếu cho lớp học",
    totalDevices: 8,
    borrowing: 3,
    createdAt: "25/01/2024",
  },
  {
    id: "CAT-006",
    name: "Máy in",
    description: "Máy in tài liệu cho phòng hành chính",
    totalDevices: 12,
    borrowing: 2,
    createdAt: "28/01/2024",
  },
  {
    id: "CAT-007",
    name: "Tai nghe",
    description: "Tai nghe học ngoại ngữ và multimedia",
    totalDevices: 22,
    borrowing: 6,
    createdAt: "01/02/2024",
  },
]
 const columns: ColumnDef<Category>[] = [
  {
    accessorKey: "name",
    header: "Tên danh mục",
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.name}</div>
        <div className="text-xs text-muted-foreground">
          {row.original.id}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "description",
    header: "Mô tả",
  },
  {
    accessorKey: "totalDevices",
    header: "Số thiết bị",
    cell: ({ row }) => (
      <span className="font-semibold">
        {row.getValue("totalDevices")}
      </span>
    ),
  },
  {
    accessorKey: "borrowing",
    header: "Đang mượn",
    cell: ({ row }) => (
      <Badge variant="secondary">
        {row.getValue("borrowing")}
      </Badge>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Ngày tạo",
  },
  {
    id: "actions",
    header: "Thao tác",
    enableSorting: false,
    cell: () => (
      <div className="flex items-center gap-3">
        <Eye className="w-4 h-4 cursor-pointer text-blue-600" />
        <Pencil className="w-4 h-4 cursor-pointer text-gray-600" />
        <Trash2 className="w-4 h-4 cursor-pointer text-red-600" />
      </div>
    ),
  },
]
export default function CategoriesManagement() {
  const context = useOutletContext<{ position: string }>()

  if (context.position === "toolbar") {
    return (
      <div className="flex gap-3">
<HoverSearch
  placeholder="Tìm tên danh mục..."
/>      </div>
    )
  }
  return <div>
  <DataTable columns={columns} data={data} /></div> 
}
