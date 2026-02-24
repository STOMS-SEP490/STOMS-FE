import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search } from "lucide-react"

export default function RequestSidebar() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [search, setSearch] = useState("")

  const requestList = [
    {
      id: "1",
      title: "Yêu cầu giảng dạy - AI cơ bản K12",
      createdBy: "Trần Thị Bình",
      status: "pending",
    },
    {
      id: "2",
      title: "Yêu cầu Python nâng cao",
      createdBy: "Nguyễn Văn Cường",
      status: "processing",
    },
    {
      id: "3",
      title: "Workshop STEM 2024",
      createdBy: "Lê Minh Đức",
      status: "approved",
    },
  ]

  const filtered = requestList.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex justify-between mb-4">
          <h2 className="font-semibold text-lg">
            Danh sách yêu cầu
          </h2>
          <span className="text-sm font-medium text-primary">
            {requestList.length}
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <Input
            placeholder="Tìm kiếm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {filtered.map((item) => {
          const isActive = id === item.id

          return (
            <div
              key={item.id}
              onClick={() => navigate(`/manager/requests/${item.id}`)}
              className={`cursor-pointer rounded-xl border p-4 transition
                ${isActive
                  ? "bg-blue-50 border-blue-500"
                  : "bg-white hover:shadow-sm"
                }`}
            >
              <div className="flex justify-between items-start">
                <div className="text-sm font-medium">
                  {item.title}
                </div>

                <StatusBadge status={item.status} />
              </div>

              <div className="text-xs text-gray-500 mt-2">
                {item.createdBy}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === "pending")
    return (
      <Badge className="bg-orange-100 text-orange-600 text-xs">
        Chờ duyệt
      </Badge>
    )

  if (status === "approved")
    return (
      <Badge className="bg-green-100 text-green-600 text-xs">
        Đã duyệt
      </Badge>
    )

  if (status === "processing")
    return (
      <Badge className="bg-blue-100 text-blue-600 text-xs">
        Đang xử lý
      </Badge>
    )

  return (
    <Badge className="bg-red-100 text-red-600 text-xs">
      Từ chối
    </Badge>
  )
}