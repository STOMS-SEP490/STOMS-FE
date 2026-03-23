import RequestSidebar from '@/shared/components/request/RequestSideBar';
import HoverSearch from '@/shared/components/ui/search';
import { Button } from '@/shared/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Switch } from '@/shared/components/ui/switch';
import { RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';

export default function RequestLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [onlyPending, setOnlyPending] = useState(false);
  const [search, setSearch] = useState('');
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);
  const [typeFilter, setTypeFilter] = useState<'all' | 'event' | 'subject' | 'course'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'assigning'>('all');
  const viewMode = useMemo<'request' | 'assignment'>(
    () => (location.pathname.includes('/requests/assignments') ? 'assignment' : 'request'),
    [location.pathname]
  );
  const requestBasePath = viewMode === 'assignment' ? '/manager/requests/assignments' : '/manager/requests';

  const handleResetFilters = () => {
    setSearch('');
    setOnlyPending(false);
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

  useEffect(() => {
    if (viewMode === 'assignment') {
      setOnlyPending(false);
      setStatusFilter('assigning');
      return;
    }

    setStatusFilter((prev) => (prev === 'assigning' ? 'all' : prev));
  }, [viewMode]);

  return (
    <div
      className="p-6 bg-slate-50 flex flex-col gap-1 min-h-0 overflow-hidden"
      style={{ height: 'var(--content-height, 100vh)' }}
    >
      {/* HEADER */}

      <div className="bg-white px-6 py-4 mb-0 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-semibold text-black">Trung tâm phê duyệt</h2>
        <p className="text-xs text-gray-500">
          Quản lý phê duyệt yêu cầu và phê duyệt phân công nhân sự
        </p>
      </div>

      <div className="px-4 pb-2 mb-1 pt-0">
        <Tabs
          value={viewMode}
          onValueChange={(v) => {
            const mode = v as 'request' | 'assignment';
            if (mode === 'assignment') {
              setOnlyPending(false);
              setStatusFilter('assigning');
              navigate('/manager/requests/assignments');
              return;
            }
            setStatusFilter('all');
            navigate('/manager/requests');
          }}
        >
          <TabsList>
            <TabsTrigger value="request">
              Duyệt yêu cầu
            </TabsTrigger>
            <TabsTrigger value="assignment">
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
            <></>
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
      <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <div className="w-[360px] bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col min-h-0">
          <RequestSidebar
            basePath={requestBasePath}
            search={search}
            onlyPending={onlyPending}
            typeFilter={typeFilter}
            statusFilter={statusFilter}
            refreshKey={sidebarRefreshKey}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full overflow-y-auto no-scrollbar pr-1">
            <Outlet
              context={{
                refreshRequestSidebar: () => setSidebarRefreshKey((k) => k + 1),
                viewMode,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
