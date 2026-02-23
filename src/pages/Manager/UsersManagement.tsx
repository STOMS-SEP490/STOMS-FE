import { DataTable } from "@/components/common/DataTable";
import { StatCard } from "@/components/common/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import HoverSearch from "@/components/ui/search";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ColumnDef } from "@tanstack/react-table";
import { Ban, BookOpen, CheckCircle, Clock, Eye, GraduationCap, Key, Pencil, Plus, RotateCcw } from "lucide-react";


type User = {
  id: string
  username: string
  email: string
  fullName: string
  role: "Trưởng nhóm" | "Giảng viên" | "Trợ giảng"
  group: string
  status: "active" | "inactive"
  lastLogin: string
  avatar: string
}

const data: User[] = [
  {
    id: "USER-001",
    username: "nguyen.vana",
    email: "nguyen.vana@stoms.edu.vn",
    fullName: "Nguyễn Văn A",
    role: "Trưởng nhóm",
    group: "AI Pioneers",
    status: "active",
    lastLogin: "30/01/2024 14:32",
    avatar: "https://i.pravatar.cc/40?img=1",
  },
  {
    id: "USER-002",
    username: "tran.thib",
    email: "tran.thib@stoms.edu.vn",
    fullName: "Trần Thị B",
    role: "Trưởng nhóm",
    group: "Robotics Builders",
    status: "active",
    lastLogin: "30/01/2024 11:15",
    avatar: "https://i.pravatar.cc/40?img=2",
  },
  {
    id: "USER-003",
    username: "le.vanc",
    email: "le.vanc@stoms.edu.vn",
    fullName: "Lê Văn C",
    role: "Giảng viên",
    group: "Robotics Builders",
    status: "inactive",
    lastLogin: "28/01/2024 09:42",
    avatar: "https://i.pravatar.cc/40?img=3",
  },
  {
    id: "USER-004",
    username: "pham.thid",
    email: "pham.thid@stoms.edu.vn",
    fullName: "Phạm Thị D",
    role: "Giảng viên",
    group: "Data Scientists",
    status: "active",
    lastLogin: "30/01/2024 08:20",
    avatar: "https://i.pravatar.cc/40?img=4",
  },
  {
    id: "USER-005",
    username: "hoang.vane",
    email: "hoang.vane@stoms.edu.vn",
    fullName: "Hoàng Văn E",
    role: "Trợ giảng",
    group: "AI Pioneers",
    status: "active",
    lastLogin: "29/01/2024 16:55",
    avatar: "https://i.pravatar.cc/40?img=5",
  },
  {
    id: "USER-006",
    username: "do.vanf",
    email: "do.vanf@stoms.edu.vn",
    fullName: "Đỗ Văn F",
    role: "Trợ giảng",
    group: "AI Pioneers",
    status: "active",
    lastLogin: "30/01/2024 13:10",
    avatar: "https://i.pravatar.cc/40?img=6",
  },
  {
    id: "USER-007",
    username: "nguyen.vangg",
    email: "nguyen.vangg@stoms.edu.vn",
    fullName: "Nguyễn Văn G",
    role: "Trợ giảng",
    group: "Data Scientists",
    status: "inactive",
    lastLogin: "25/01/2024 10:30",
    avatar: "https://i.pravatar.cc/40?img=7",
  },
]
const columns: ColumnDef<User>[] = [
  {
    accessorKey: "id",
    header: "Mã người dùng",
  },
  {
    id: "user",
    header: "Tên người dùng",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <img
          src={row.original.avatar}
          className="w-8 h-8 rounded-full"
        />
        <div>
          <p className="font-medium text-sm">{row.original.username}</p>
          <p className="text-xs text-gray-500">{row.original.email}</p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "role",
    header: "Vai trò",
    cell: ({ row }) => {
      const role = row.original.role

      const roleColor =
        role === "Trưởng nhóm"
          ? "bg-blue-100 text-blue-700"
          : role === "Giảng viên"
          ? "bg-green-100 text-green-700"
          : "bg-orange-100 text-orange-600"

      return <Badge className={roleColor}>{role}</Badge>
    },
  },
  {
    accessorKey: "group",
    header: "Nhóm",
  },
  {
    accessorKey: "status",
    header: "Trạng thái",
    cell: ({ row }) =>
      row.original.status === "active" ? (
        <Badge className="bg-green-100 text-green-700">
          Hoạt động
        </Badge>
      ) : (
        <Badge className="bg-red-100 text-red-600">
          Vô hiệu hóa
        </Badge>
      ),
  },
  {
    accessorKey: "lastLogin",
    header: "Đăng nhập gần nhất",
  },
  {
    id: "actions",
    header: "Thao tác",
    enableSorting: false,
    cell: () => (
      <div className="flex gap-3">
        <Key size={16} className="text-yellow-600 cursor-pointer" />
        <Ban size={16} className="text-red-500 cursor-pointer" />
        <Eye size={16} className="text-blue-600 cursor-pointer" />
        <Pencil size={16} className="text-blue-600 cursor-pointer" />
      </div>
    ),
  },
]
export default function UserManagement() {
  return (
    <div className=" p-6 space-y-6 bg-gray-50 ">
        {/* HEADER */}
      <div className="flex justify-between bg-white px-6 py-4 mb-3 rounded-xl border shadow-sm items-center">
        <div>
          <h2 className="text-xl font-semibold text-black">Quản lý người dùng</h2>
          <p className="text-xs text-gray-500">Quản lý tài khoản và phân quyền người dùng</p>
        </div>

        <div className="flex gap-3 items-center">
          

          <Button className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white px-3 py-2 rounded-md">
            <Plus size={16} />
            Thêm người dùng
          </Button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-4 gap-4 mb-3">
        <StatCard icon={<GraduationCap />} label="Tổng người dùng" value="186" sub="tài khoản đang hoạt động" />
        <StatCard icon={<CheckCircle />} label="Tổng giảng viên" value="42" sub="giảng viên và trợ giảng" variant="green" />
        <StatCard icon={<BookOpen />} label="Vô hiệu hóa" value="156" sub="người dùng đã bị vô hiệu hóa" />
        <StatCard icon={<Clock />} label="Tổng buổi học" value="1,248" sub="Buổi học" />
      </div>

{/* <div className="flex justify-between bg-white px-6 py-4 mb-3 rounded-xl border shadow-sm items-center ">
  <HoverSearch />
</div> */}

       {/* TABLE CARD */}
            <div className="bg-white rounded-xl border shadow-sm px-6 py-4">

        {/* Filter Bar */}
<div className="flex justify-between pb-2">
 <HoverSearch/>
 <div className="flex items-center gap-3">
  {/* Role Filter */}
  <Select>
    <SelectTrigger className="text-gray-500 text-sm gap-2">
      <SelectValue placeholder="Vai trò" />
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
    <SelectTrigger className="text-gray-500 text-sm gap-2">
      <SelectValue  placeholder="Trạng thái" />
    </SelectTrigger>
    <SelectContent >
      <SelectItem value="all">Tất cả</SelectItem>
      <SelectItem value="active">Active</SelectItem>
      <SelectItem value="inactive">Inactive</SelectItem>
      <SelectItem value="pending">Pending</SelectItem>
    </SelectContent>
  </Select>

  {/* Group Filter */}
  <Select>
    <SelectTrigger className="text-gray-500 text-sm gap-2">
      <SelectValue  placeholder="Nhóm" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Tất cả</SelectItem>
      <SelectItem value="group-a">Group A</SelectItem>
      <SelectItem value="group-b">Group B</SelectItem>
      <SelectItem value="group-c">Group C</SelectItem>
    </SelectContent>
  </Select>

  {/* Reset Button */}
  <Button variant="secondary">
    <RotateCcw />
  </Button>
</div>
</div>
             
              <DataTable columns={columns} data={data} />
            </div>
    </div>
  )
}
