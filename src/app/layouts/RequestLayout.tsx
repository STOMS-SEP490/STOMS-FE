import RequestSidebar, { type ManagerRequestStatusFilter } from '@/shared/components/request/RequestSideBar';
import HoverSearch from '@/shared/components/ui/search';
import { Button } from '@/shared/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { REQUEST_STATUS, REQUEST_STATUS_LABEL } from '@/constants/status';

/** Tab Duyệt yêu cầu (/approval): chỉ lọc theo các trạng thái phê duyệt. */
const APPROVAL_TAB_STATUS_FILTERS: ManagerRequestStatusFilter[] = [
  'all',
  'pending',
  'rejected',
  'approved',
];

export default function RequestLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);
  const [typeFilter, setTypeFilter] = useState<'all' | 'event' | 'subject' | 'course'>('all');
  const [statusFilter, setStatusFilter] = useState<ManagerRequestStatusFilter>('all');
  const tabValue = useMemo<'all' | 'approval' | 'assignment'>(() => {
    if (location.pathname.includes('/requests/assignments')) return 'assignment';
    if (location.pathname.includes('/requests/approval')) return 'approval';
    return 'all';
  }, [location.pathname]);

  const outletViewMode = tabValue === 'assignment' ? 'assignment' : 'request';

  const requestBasePath =
    tabValue === 'assignment'
      ? '/manager/requests/assignments'
      : tabValue === 'approval'
        ? '/manager/requests/approval'
        : '/manager/requests';

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

  useEffect(() => {
    if (tabValue === 'assignment') {
      setStatusFilter('assigning');
      return;
    }

    if (tabValue === 'approval') {
      setStatusFilter((prev) =>
        APPROVAL_TAB_STATUS_FILTERS.includes(prev) ? prev : 'all',
      );
      return;
    }

    setStatusFilter((prev) => (prev === 'assigning' ? 'all' : prev));
  }, [tabValue]);

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
          value={tabValue}
          onValueChange={(v) => {
            const mode = v as 'all' | 'approval' | 'assignment';
            if (mode === 'assignment') {
              setStatusFilter('assigning');
              navigate('/manager/requests/assignments');
              return;
            }
            if (mode === 'approval') {
              setStatusFilter((prev) =>
                APPROVAL_TAB_STATUS_FILTERS.includes(prev) ? prev : 'all',
              );
              navigate('/manager/requests/approval');
              return;
            }
            setStatusFilter((prev) => (prev === 'assigning' ? 'all' : prev));
            navigate('/manager/requests');
          }}
        >
          <TabsList>
            <TabsTrigger value="all">
              Tất cả yêu cầu
            </TabsTrigger>
            <TabsTrigger value="approval">
            Yêu cầu cần duyệt
            </TabsTrigger>
            <TabsTrigger value="assignment">
              Phân công cần duyệt
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
              <SelectItem value="event">Sự kiện</SelectItem>
              <SelectItem value="subject">Môn học</SelectItem>
              <SelectItem value="course">Khóa học</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter — khác theo tab */}
          {tabValue !== 'assignment' && tabValue !== 'approval' ? (
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as ManagerRequestStatusFilter)}
            >
              <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white border-slate-200 min-w-[180px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="pending">{REQUEST_STATUS_LABEL[REQUEST_STATUS.PENDING]}</SelectItem>
                <SelectItem value="rejected">{REQUEST_STATUS_LABEL[REQUEST_STATUS.REJECTED]}</SelectItem>
                <SelectItem value="approved">{REQUEST_STATUS_LABEL[REQUEST_STATUS.APPROVED]}</SelectItem>
                {tabValue === 'all' ? (
                  <>
                    <SelectItem value="assigning">{REQUEST_STATUS_LABEL[REQUEST_STATUS.ASSIGNING]}</SelectItem>
                    <SelectItem value="published">{REQUEST_STATUS_LABEL[REQUEST_STATUS.PUBLISHED]}</SelectItem>
                    <SelectItem value="completed">{REQUEST_STATUS_LABEL[REQUEST_STATUS.COMPLETED]}</SelectItem>
                    <SelectItem value="cancelled">{REQUEST_STATUS_LABEL[REQUEST_STATUS.CANCELLED]}</SelectItem>
                  </>
                ) : null}
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

        </div>
      </div>
      <div className="flex gap-4 flex-1 min-h-0 min-w-0 overflow-hidden pb-4">
        {/* Sidebar */}
        <div className="w-[360px] shrink-0 bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col min-h-0">
          <RequestSidebar
            basePath={requestBasePath}
            search={search}
            onlyPending={tabValue === 'approval'}
            typeFilter={typeFilter}
            statusFilter={statusFilter}
            refreshKey={sidebarRefreshKey}
            requestStatusesScope={tabValue === 'all' ? 'all' : 'approval'}
            filterByPendingAssignments={tabValue === 'assignment'}
          />
        </div>

        {/* Content — cuộn một vùng trong trang chi tiết (giống TL assignments), tránh lồng 2 lớp overflow-y */}
        <div className="flex-1 min-w-0 min-h-0 overflow-hidden flex flex-col">
          <div className="h-full min-h-0 overflow-hidden pr-1">
            <Outlet
              context={{
                refreshRequestSidebar: () => setSidebarRefreshKey((k) => k + 1),
                viewMode: outletViewMode,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
