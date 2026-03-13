import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRequests } from '@/modules/request/hooks/useRequests';
import { Badge } from '@/shared/components/ui/badge';
import { getRequestStatusInfo } from '@/constants/status';

function isPendingStatus(status: string | undefined): boolean {
  const s = (status ?? '').toLowerCase();
  return s === 'pending' || s.includes('chờ') || s.includes('pending');
}

function getRequestType(item: { subjectId?: number | null; courseId?: number | null; eventId?: number | null }) {
  if (item.eventId) return { label: 'Event', cls: 'bg-orange-50 text-orange-700 border-orange-200' };
  if (item.subjectId) return { label: 'Môn', cls: 'bg-blue-50 text-blue-700 border-blue-200' };
  if (item.courseId) return { label: 'Khóa học', cls: 'bg-purple-50 text-purple-700 border-purple-200' };
  return { label: 'Khác', cls: 'bg-slate-50 text-slate-700 border-slate-200' };
}

export type RequestSidebarProps = {
  search?: string;
  onlyPending?: boolean;
  typeFilter?: 'all' | 'event' | 'subject' | 'course';
  statusFilter?: 'all' | 'pending' | 'approved' | 'rejected' | 'assigning';
  refreshKey?: number;
};

export default function RequestSidebar({
  search = '',
  onlyPending = false,
  typeFilter = 'all',
  statusFilter = 'all',
  refreshKey = 0,
}: RequestSidebarProps) {
  const navigate = useNavigate();
  const { id } = useParams();

  const { data: requestList, totalItems, loading } = useRequests(1, 50, refreshKey);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  const filtered = requestList
    .filter((item) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        (item.requestCode ?? '').toLowerCase().includes(q) ||
        (item.requestName ?? '').toLowerCase().includes(q);
      if (!matchSearch) return false;
      const matchType = (() => {
        if (typeFilter === 'all') return true;
        if (typeFilter === 'event') return !!item.eventId;
        if (typeFilter === 'subject') return !!item.subjectId;
        if (typeFilter === 'course') return !!item.courseId;
      })();
      if (!matchType) return false;

      if (onlyPending) return isPendingStatus(item.status);
      if (statusFilter === 'all') return true;
      const s = String(item.status ?? '').toLowerCase();
      if (statusFilter === 'pending') return s.includes('pending') || s.includes('chờ');
      if (statusFilter === 'approved') return s.includes('approved') || s.includes('đã duyệt');
      if (statusFilter === 'rejected')
        return s.includes('rejected') || s.includes('reject') || s.includes('từ chối');
      if (statusFilter === 'assigning')
        return s.includes('assigning') || s.includes('đang phân công');
      return true;
    });

  return (
    <div className="text-black">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-200">
          <div className="min-w-0">
            <h2 className="font-semibold text-base text-black truncate">Danh sách yêu cầu</h2>
            <p className="text-[11px] text-slate-500">
              {loading ? 'Đang tải...' : `${filtered.length}${typeof totalItems === 'number' ? `/${totalItems}` : ''} yêu cầu`}
            </p>
          </div>
          <span className="text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 rounded-full px-2 py-1">
            {filtered.length}
          </span>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50">
          {loading && (
            <div className="p-4 text-sm text-gray-500">Đang tải danh sách...</div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="p-4 text-sm text-gray-500">Chưa có yêu cầu nào.</div>
          )}
          {!loading &&
            filtered.map((item) => {
              const isActive = id === String(item.requestId);
              const isHovered = hoveredId === item.requestId;

              return (
                <div
                  key={item.requestId}
                  onClick={() => navigate(`/manager/requests/${item.requestId}`)}
                  onMouseEnter={() => setHoveredId(item.requestId)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`cursor-pointer rounded-2xl border p-3 transition group
                  ${isActive ? 'bg-blue-50/70 border-blue-300 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'}`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-black truncate">
                        {item.requestName || '—'}
                      </div>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <Badge className="bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium">
                          {item.requestCode}
                        </Badge>
                        <Badge className={`border text-[11px] font-medium ${getRequestType(item).cls}`}>
                          {getRequestType(item).label}
                        </Badge>
                      </div>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  {(isActive || isHovered) && (
                    <div className="mt-2 text-[11px] text-slate-600">
                      Bấm để xem chi tiết
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string | number }) {
  const info = getRequestStatusInfo(status);
  return (
    <Badge className={`${info.className} text-[11px] font-medium whitespace-nowrap shrink-0`}>
      {info.label}
    </Badge>
  );
}
