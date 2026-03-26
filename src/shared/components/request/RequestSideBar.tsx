  import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRequests } from '@/modules/request/hooks/useRequests';
import RequestCard from './RequestCard';

const REQUEST_APPROVAL_STATUSES = ['PENDING', 'REJECTED', 'APPROVED'] as const;
const REQUEST_ALL_STATUSES = [
  'PENDING',
  'REJECTED',
  'APPROVED',
  'ASSIGNING',
  'PUBLISHED',
  'COMPLETED',
  'CANCELLED',
] as const;

function isPendingStatus(status: string | undefined): boolean {
  const s = (status ?? '').toLowerCase();
  return s === 'pending' || s.includes('chờ') || s.includes('pending');
}

export type RequestSidebarProps = {
  basePath?: string;
  search?: string;
  onlyPending?: boolean;
  typeFilter?: 'all' | 'event' | 'subject' | 'course';
  statusFilter?: 'all' | 'pending' | 'approved' | 'rejected' | 'assigning';
  refreshKey?: number;
  /**
   * manager chỉ cần lọc các trạng thái phê duyệt,
   * pc cần show đủ để tránh redirect về danh sách khi mở chi tiết.
   */
  requestStatusesScope?: 'approval' | 'all';
  /** Tắt redirect tự động khi danh sách theo filter đang rỗng. */
  autoNavigateWhenEmpty?: boolean;
};

export default function RequestSidebar({
  basePath = '/manager/requests',
  search = '',
  onlyPending = false,
  typeFilter = 'all',
  statusFilter = 'all',
  refreshKey = 0,
  requestStatusesScope = 'approval',
  autoNavigateWhenEmpty = true,
}: RequestSidebarProps) {
  const navigate = useNavigate();
  const { id } = useParams();

  const apiStatuses = (() => {
    if (onlyPending) return ['PENDING'];
    if (statusFilter === 'pending') return ['PENDING'];
    if (statusFilter === 'approved') return ['APPROVED'];
    if (statusFilter === 'rejected') return ['REJECTED'];
    if (statusFilter === 'assigning') return ['ASSIGNING'];
    return requestStatusesScope === 'all'
      ? [...REQUEST_ALL_STATUSES]
      : [...REQUEST_APPROVAL_STATUSES];
  })();

  const { data: requestList, totalItems, loading } = useRequests(1, 50, refreshKey, {
    statuses: apiStatuses,
  });
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

  // Nếu theo bộ lọc hiện tại không còn yêu cầu nào
  // mà URL vẫn đang ở /requests/:id thì điều hướng về trang placeholder
  useEffect(() => {
    if (!loading && autoNavigateWhenEmpty && filtered.length === 0 && id) {
      navigate(basePath);
    }
  }, [autoNavigateWhenEmpty, basePath, filtered.length, id, loading, navigate]);

  return (
    <div className="text-black h-full">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-200">
          <div className="min-w-0">
            <h2 className="font-semibold text-base text-black truncate">Danh sách yêu cầu</h2>
            <p className="text-[11px] text-slate-500">
              {loading ? 'Đang tải...' : `${filtered.length}${typeof totalItems === 'number' ? `/${totalItems}` : ''} yêu cầu`}
            </p>
          </div>
          <span className="text-xs font-medium text-sky-800 bg-sky-100 border border-sky-200 rounded-full px-3 py-1">
            {filtered.length}
          </span>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto scrollbar-hide no-scrollbar p-3 space-y-2 bg-slate-50">
          {loading && (
            <div className="p-4 text-sm text-gray-500">Đang tải danh sách...</div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="p-4 text-sm text-gray-500">Chưa có yêu cầu nào.</div>
          )}
          {!loading &&
            filtered.map((item) => (
              <RequestCard
                key={item.requestId}
                requestName={item.requestName ?? '—'}
                requestCode={item.requestCode}
                customerName={item.customerName}
                subjectId={item.subjectId}
                courseId={item.courseId}
                eventId={item.eventId}
                status={item.status}
                showNeedsAction={isPendingStatus(item.status)}
                isActive={id === String(item.requestId)}
                isHovered={hoveredId === item.requestId}
                onClick={() => navigate(`${basePath}/${item.requestId}`)}
                onMouseEnter={() => setHoveredId(item.requestId)}
                onMouseLeave={() => setHoveredId(null)}
              />
            ))}
        </div>
      </div>
    </div>
  );
}
