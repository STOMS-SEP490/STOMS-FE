import { DataTable } from "@/components/common/DataTable"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import HoverSearch from "@/components/ui/search"
import type { ColumnDef } from "@tanstack/react-table"

import {
  Plus,
  Pencil,
  Eye,
  BookOpen,
  GraduationCap,
  Clock,
  CheckCircle,
} from "lucide-react"

type Course = {
  id: string
  name: string
  status: string
  subjects: number
  updated: string
}

const data: Course[] = [
  {
    id: "CRS-2024-001",
    name: "AI Foundation for Kids",
    status: "active",
    subjects: 8,
    updated: "28/01/2024",
  },
  {
    id: "CRS-2024-002",
    name: "Robotics Programming Level 1",
    status: "active",
    subjects: 6,
    updated: "27/01/2024",
  },
  {
    id: "CRS-2024-003",
    name: "Python for Beginners",
    status: "draft",
    subjects: 4,
    updated: "26/01/2024",
  },
]

const columns: ColumnDef<Course>[] = [
  {
    accessorKey: "id",
    header: "Mã khóa học",
  },
  {
    accessorKey: "name",
    header: "Tên khóa học",
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
        <Badge className="bg-orange-100 text-orange-600">
          Ngừng hoạt động
        </Badge>
      ),
  },
  {
    accessorKey: "subjects",
    header: "Số môn học",
    cell: ({ row }) => `${row.original.subjects} môn học`,
  },
  {
    accessorKey: "updated",
    header: "Cập nhật",
  },
  {
    id: "actions",
    header: "Thao tác",
    enableSorting: false,
    cell: () => (
      <div className="flex gap-3">
        <Pencil
          size={18}
          className="cursor-pointer text-gray-500 hover:text-blue-600"
        />
        <Eye
          size={18}
          className="cursor-pointer text-gray-500 hover:text-blue-600"
        />
      </div>
    ),
  },
]

export default function CurriculumManagement() {
  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* HEADER */}
      <div className="flex justify-between bg-white p-6 rounded-xl border shadow-sm items-center">
        <div>
          <h2 className="text-xl font-semibold text-black">
            Quản lý giáo trình
          </h2>
          <p className="text-xs text-gray-500">
            Quản lý khóa học và môn học trong hệ thống
          </p>
        </div>

        <div className="flex gap-3 items-center">
          <HoverSearch />

          <Button className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white px-3 py-2 rounded-md">
            <Plus size={16} />
            Thêm khóa học
          </Button>

          <Button className="gap-2 bg-[#2166C0] hover:bg-[#1F58A8] text-white px-4 py-2 rounded-md">
            <Plus size={16} />
            Thêm môn học
          </Button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={<GraduationCap />} label="Tổng khóa học" value="48" sub="Khóa học" />
        <StatCard icon={<CheckCircle />} label="Đang hoạt động" value="42" sub="Khóa học" green />
        <StatCard icon={<BookOpen />} label="Tổng môn học" value="156" sub="Môn học" />
        <StatCard icon={<Clock />} label="Tổng buổi học" value="1,248" sub="Buổi học" />
      </div>

      {/* TABLE CARD */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <DataTable columns={columns} data={data} />
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  sub,
  green,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  green?: boolean
}) {
  return (
    <div className="bg-white rounded-xl border p-4 flex gap-4 items-center shadow-sm">
      <div
        className={`p-3 rounded-lg ${
          green ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
        }`}
      >
        {icon}
      </div>

      <div>
        <p className="text-xs text-gray-500 uppercase font-semibold">
          {label}
        </p>
        <h2 className="text-xl font-semibold text-black">{value}</h2>
        <p className="text-xs text-gray-500">{sub}</p>
      </div>
    </div>
  )
}