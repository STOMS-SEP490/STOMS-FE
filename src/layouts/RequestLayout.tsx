import RequestSidebar from "@/components/request/RequestSideBar"
import { Outlet } from "react-router-dom"

export default function RequestLayout() {
  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <div className="w-[320px] bg-white border-r overflow-y-auto">
        <RequestSidebar />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </div>
    </div>
  )
}