import RequestSidebar from '@/shared/components/request/RequestSideBar';
import HoverSearch from '@/shared/components/ui/search';
import { Button } from '@/shared/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';

import type { RequestLayoutOutletContext } from '@/modules/request/requestDetail.types';

export default function ManagerRequestReadonlyLayout() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);
  const [typeFilter, setTypeFilter] = useState<'all' | 'event' | 'subject' | 'course'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'assigning'>('all');

  const viewMode: RequestLayoutOutletContext['viewMode'] = 'request';

  const handleResetFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setStatusFilter('all');
  };

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    root.classList.add('scrollbar-hide', 'no-scrollbar');
    body.classList.add('scrollbar-hide', 'no-scrollbar');
    return () => {
      root.classList.remove('scrollbar-hide', 'no-scrollbar');
      body.classList.remove('scrollbar-hide', 'no-scrollbar');
    };
  }, []);

  return (
    <div className="p-6 bg-slate-50 flex flex-col gap-1 min-h-0 overflow-hidden" style={{ height: 'var(--content-height, 100vh)' }}>
      <div className="bg-white px-6 py-4 mb-0 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/manager/requests')}
            className="!p-0 w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-black bg-white hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-semibold text-black">Chi tiết yêu cầu</h2>
            <p className="text-xs text-gray-500">Chế độ chỉ xem (không CRUD)</p>
          </div>
        </div>
      </div>

      <div className="px-4 pb-2 mb-1 pt-0">
        <div className="flex justify-start gap-3 mb-0 mt-2">
          <HoverSearch value={search} onChange={setSearch} placeholder="Tìm theo mã hoặc tên yêu cầu..." />
          <div className="flex items-center gap-3">
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
              <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white border-slate-200 min-w-[160px]">
                <SelectValue placeholder="Loại yêu cầu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả loại</SelectItem>
                <SelectItem value="event">Event</SelectItem>
                <SelectItem value="subject">Môn</SelectItem>
                <SelectItem value="course">Khóa học</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white border-slate-200 min-w-[160px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="pending">Chờ duyệt</SelectItem>
                <SelectItem value="approved">Đã duyệt</SelectItem>
                <SelectItem value="rejected">Từ chối</SelectItem>
                <SelectItem value="assigning">Đang phân công</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              className="shrink-0 bg-white border-slate-200 text-gray-600 hover:bg-gray-50"
              onClick={handleResetFilters}
            >
              <RotateCcw size={16} />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0 min-w-0 overflow-hidden pb-4">
        <div className="w-[min(420px,40vw)] min-w-[320px] shrink-0 bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col min-h-0">
          <RequestSidebar
            basePath="/manager/requests-view"
            search={search}
            typeFilter={typeFilter}
            statusFilter={statusFilter}
            refreshKey={sidebarRefreshKey}
            requestStatusesScope="all"
            autoNavigateWhenEmpty={false}
          />
        </div>

        <div className="flex-1 min-w-0 min-h-0 overflow-hidden flex flex-col">
          <div className="h-full min-h-0 overflow-hidden pr-1">
            <Outlet
              context={
                {
                  refreshRequestSidebar: () => setSidebarRefreshKey((k) => k + 1),
                  viewMode,
                } satisfies RequestLayoutOutletContext
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

