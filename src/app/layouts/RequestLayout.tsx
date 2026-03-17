import RequestSidebar from '@/shared/components/request/RequestSideBar';
import HoverSearch from '@/shared/components/ui/search';
import { Button } from '@/shared/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Switch } from '@/shared/components/ui/switch';
import { RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';

export default function RequestLayout() {
  const [onlyPending, setOnlyPending] = useState(false);
  const [search, setSearch] = useState('');
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);
  const [typeFilter, setTypeFilter] = useState<'all' | 'event' | 'subject' | 'course'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'assigning'>('all');
  const [viewMode, setViewMode] = useState<'request' | 'assignment'>('request');

  const handleResetFilters = () => {
    setSearch('');
    setOnlyPending(false);
    setTypeFilter('all');
    setStatusFilter('all');
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50" style={{ minHeight: 'var(--content-height, 100vh)' }}>
      {/* HEADER */}

      <div className="bg-white px-6 py-4 mb-2 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-semibold text-black">Trung tâm phê duyệt</h2>
        <p className="text-xs text-gray-500">
          Quản lý phê duyệt yêu cầu và phê duyệt phân công nhân sự
        </p>
      </div>

      <div className="flex justify-between items-center mb-2">
        <Tabs
          value={viewMode}
          onValueChange={(v) => {
            const mode = v as 'request' | 'assignment';
            setViewMode(mode);
            if (mode === 'assignment') {
              setOnlyPending(false);
              setStatusFilter('assigning');
            } else {
              setStatusFilter('all');
            }
          }}
        >
          <TabsList className="bg-transparent border-0 shadow-none p-0 h-8 gap-3">
            <TabsTrigger
              value="request"
              className="h-7 rounded-none text-xs px-0 data-[state=active]:font-semibold data-[state=active]:text-black data-[state=active]:border-b-2 data-[state=active]:border-sky-500"
            >
              Duyệt yêu cầu
            </TabsTrigger>
            <TabsTrigger
              value="assignment"
              className="h-7 rounded-none text-xs px-0 data-[state=active]:font-semibold data-[state=active]:text-black data-[state=active]:border-b-2 data-[state=active]:border-sky-500"
            >
              Duyệt phân công
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex justify-start gap-3 mb-2">
        <HoverSearch value={search} onChange={setSearch} placeholder="Tìm theo mã hoặc tên yêu cầu..." />
        <div className="flex items-center gap-3">
          {/* Type Filter */}
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

          {/* Status Filter — khác theo tab */}
          {viewMode === 'request' ? (
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white border-slate-200 min-w-[160px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="pending">Chờ duyệt</SelectItem>
                <SelectItem value="approved">Đã duyệt</SelectItem>
                <SelectItem value="rejected">Từ chối</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Select
              value="assigning"
              disabled
            >
              <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white border-slate-200 min-w-[160px] opacity-70">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="assigning">Đang phân công</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Reset Button */}
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 bg-white border-slate-200 text-gray-600 hover:bg-gray-50"
            onClick={handleResetFilters}
          >
            <RotateCcw size={16} />
          </Button>

          {/* Chỉ hiện switch ở tab Duyệt yêu cầu */}
          {viewMode === 'request' && (
            <div className="flex items-center space-x-2 ">
              <Switch
                className="!rounded-[15px]"
                checked={onlyPending}
                onCheckedChange={setOnlyPending}
              />
              <p className="text-black whitespace-nowrap">Chỉ hiện yêu cầu cần xử lý</p>
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-4">
        {/* Sidebar */}
        <div className="w-[360px] bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <RequestSidebar
            search={search}
            onlyPending={onlyPending}
            typeFilter={typeFilter}
            statusFilter={statusFilter}
            refreshKey={sidebarRefreshKey}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <Outlet
            context={{
              refreshRequestSidebar: () => setSidebarRefreshKey((k) => k + 1),
              viewMode,
            }}
          />
        </div>
      </div>
    </div>
  );
}
