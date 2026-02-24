import { DataTable } from "@/components/common/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import HoverSearch from "@/components/ui/search";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useOutletContext } from "react-router-dom";
type Device = {
  id: string
  name: string
  category: string
  supplier: string
  handoverCode: string
  status: "Sẵn sàng" | "Đang mượn" | "Bảo trì" | "Hỏng hóc"
  createdAt: string
}

const data: Device[] = [
  {
    id: "EQP-2024-001",
    name: "Dell Latitude 5420",
    category: "Máy tính",
    supplier: "Công ty TNHH ABC",
    handoverCode: "BB-2024-056",
    status: "Sẵn sàng",
    createdAt: "15/01/2024",
  },
  {
    id: "EQP-2024-002",
    name: "Arduino Uno R3 Kit",
    category: "Arduino",
    supplier: "Quỹ phát triển giáo dục",
    handoverCode: "BB-2024-057",
    status: "Đang mượn",
    createdAt: "16/01/2024",
  },
  {
    id: "EQP-2024-003",
    name: "Lego Mindstorms EV3",
    category: "Robot",
    supplier: "Nhà tài trợ XYZ",
    handoverCode: "BB-2024-058",
    status: "Sẵn sàng",
    createdAt: "18/01/2024",
  },
  {
    id: "EQP-2024-004",
    name: "Creality Ender 3 V2",
    category: "Máy in 3D",
    supplier: "Học viện STEM",
    handoverCode: "BB-2024-059",
    status: "Bảo trì",
    createdAt: "20/01/2024",
  },
  {
    id: "EQP-2024-005",
    name: "HP ProBook 450 G8",
    category: "Máy tính",
    supplier: "Công ty TNHH DEF",
    handoverCode: "BB-2024-060",
    status: "Sẵn sàng",
    createdAt: "22/01/2024",
  },
  {
    id: "EQP-2024-006",
    name: "Bộ cảm biến đa năng",
    category: "Linh kiện",
    supplier: "Quỹ phát triển STEM",
    handoverCode: "BB-2024-061",
    status: "Đang mượn",
    createdAt: "25/01/2024",
  },
  {
    id: "EQP-2024-007",
    name: "Raspberry Pi 4 Model B",
    category: "Arduino",
    supplier: "Nhà tài trợ GHI",
    handoverCode: "BB-2024-062",
    status: "Sẵn sàng",
    createdAt: "26/01/2024",
  },
  {
    id: "EQP-2024-008",
    name: "Lenovo ThinkPad E15",
    category: "Máy tính",
    supplier: "Công ty TNHH JKL",
    handoverCode: "BB-2024-063",
    status: "Hỏng hóc",
    createdAt: "28/01/2024",
  },
  {
    id: "EQP-2024-009",
    name: "mBot Ranger Robot Kit",
    category: "Robot",
    supplier: "Học viện AI & Robotics",
    handoverCode: "BB-2024-064",
    status: "Đang mượn",
    createdAt: "29/01/2024",
  },
]

 const columns: ColumnDef<Device>[] = [
  {
    accessorKey: "id",
    header: "Mã thiết bị",
  },
  {
    accessorKey: "name",
    header: "Tên thiết bị",
  },
  {
    accessorKey: "category",
    header: "Danh mục",
    cell: ({ row }) => {
      const value = row.getValue("category") as string
      return <Badge variant="secondary">{value}</Badge>
    },
  },
  {
    accessorKey: "supplier",
    header: "Bên cung cấp",
  },
  {
    accessorKey: "handoverCode",
    header: "Biên bản bàn giao",
    cell: ({ row }) => {
      const value = row.getValue("handoverCode") as string
      return (
        <span className="text-blue-600 hover:underline cursor-pointer">
          {value}
        </span>
      )
    },
  },
  {
    accessorKey: "status",
    header: "Trạng thái",
    cell: ({ row }) => {
      const status = row.getValue("status") as Device["status"]

      const statusColor = {
        "Sẵn sàng": "bg-green-100 text-green-700",
        "Đang mượn": "bg-orange-100 text-orange-700",
        "Bảo trì": "bg-red-100 text-red-700",
        "Hỏng hóc": "bg-red-500 text-white",
      }

      return (
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor[status]}`}
        >
          {status}
        </span>
      )
    },
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
export default function EquipmentsManagement() {
  const context = useOutletContext<{ position: string }>()

  if (context.position === "toolbar") {
    return (
      <div className="flex gap-3">
<HoverSearch
  placeholder="Tìm tên thiết bị..."
/>    

              <div className="flex items-center gap-3">
                <Select>
                  <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white ">
                    <SelectValue placeholder="Danh mục" />
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
                <Select >
                  <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white">
                    <SelectValue  placeholder="Trạng thái" />
                  </SelectTrigger>
                  <SelectContent >
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
    )
  }
  return <div>
    
  <DataTable columns={columns} data={data} /></div> 
}
