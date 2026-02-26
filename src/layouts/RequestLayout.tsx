import RequestSidebar from '@/components/request/RequestSideBar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import HoverSearch from '@/components/ui/search';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { RotateCcw, X } from 'lucide-react';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';

export default function RequestLayout() {
  const [onlyPending, setOnlyPending] = useState(false);

  return (
    <div className="h-screen overflow-hidden p-6 space-y-6 bg-[#f3f4f6]">
      {/* HEADER */}

      <div className="bg-white px-6 py-4 mb-2 rounded-xl border shadow-sm ">
        <h2 className="text-xl font-semibold text-black">Phê duyệt yêu cầu</h2>
        <p className="text-xs text-gray-500">Phê duyệt hoặc từ chối các yêu cầu từ khách hàng</p>
      </div>

      <div className="flex justify-start gap-3 mb-2">
        <HoverSearch />
        <div className="flex items-center gap-3">
          {/* Role Filter */}
          <Select>
            <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white ">
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

          {/* Group Filter */}
          <Select>
            <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white">
              <SelectValue placeholder="Nhóm" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="group-a">Group A</SelectItem>
              <SelectItem value="group-b">Group B</SelectItem>
              <SelectItem value="group-c">Group C</SelectItem>
            </SelectContent>
          </Select>

          {/* Reset Button */}
          <Button variant="secondary" className="bg-white">
            <RotateCcw />
          </Button>

          <div className="flex items-center space-x-2 ">
            <Switch className=" !rounded-[15px] " />
            <p className="text-black whitespace-nowrap">Chỉ hiện yêu cầu cần xử lý</p>
          </div>
        </div>
      </div>
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
    </div>
  );
}
