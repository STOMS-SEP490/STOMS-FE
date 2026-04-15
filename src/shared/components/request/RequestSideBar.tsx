import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRequests } from '@/modules/request/hooks/useRequests';
import RequestCard from './RequestCard';
import { getRequestStatusCode, getRequestStatusInfo, REQUEST_STATUS } from '@/constants/status';

const REQUEST_APPROVAL_STATUSES = ['PENDING', 'REJECTED', 'APPROVED'] as const;

/** Tab Phân công cần duyệt: chỉ yêu cầu trạng thái 3–5 (APPROVED / ASSIGNING / PUBLISHED). */
const ASSIGNMENT_TAB_REQUEST_STATUSES_API = ['APPROVED', 'ASSIGNING', 'PUBLISHED'] as const;
const ASSIGNMENT_TAB_REQUEST_STATUS_CODES = new Set<number>([
  REQUEST_STATUS.APPROVED,
  REQUEST_STATUS.ASSIGNING,
  REQUEST_STATUS.PUBLISHED,
]);

function isPendingStatus(status: string | undefined): boolean {
  const s = (status ?? '').toLowerCase();
  return s === 'pending' || s.includes('chờ') || s.includes('pending');
}

/** Bộ lọc trạng thái yêu cầu (manager / PC layout). */
export type ManagerRequestStatusFilter =
  | 'all'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'assigning'
  | 'published'
  | 'completed'
  | 'cancelled';

const STATUS_FILTER_TO_REQUEST_CODE: Record<Exclude<ManagerRequestStatusFilter, 'all'>, number> = {
  pending: REQUEST_STATUS.PENDING,
  approved: REQUEST_STATUS.APPROVED,
  rejected: REQUEST_STATUS.REJECTED,
  assigning: REQUEST_STATUS.ASSIGNING,
  published: REQUEST_STATUS.PUBLISHED,
  completed: REQUEST_STATUS.COMPLETED,
  cancelled: REQUEST_STATUS.CANCELLED,
};

const STATUS_FILTER_TO_API: Record<Exclude<ManagerRequestStatusFilter, 'all'>, string> = {
  pending: 'PENDING',
  approved: 'APPROVED',
  rejected: 'REJECTED',
  assigning: 'ASSIGNING',
  published: 'PUBLISHED',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
};

export type RequestSidebarProps = {
  basePath?: string;
  search?: string;
  onlyPending?: boolean;
  typeFilter?: 'all' | 'event' | 'subject' | 'course';
  statusFilter?: ManagerRequestStatusFilter;
  refreshKey?: number;
  /**
   * manager chỉ cần lọc các trạng thái phê duyệt,
   * pc cần show đủ để tránh redirect về danh sách khi mở chi tiết.
   */
  requestStatusesScope?: 'approval' | 'all';
  /** Tắt redirect tự động khi danh sách theo filter đang rỗng. */
  autoNavigateWhenEmpty?: boolean;
  /**
   * Tab Duyệt phân công: luôn AssignmentStatuses=1 (Pending); thêm Statuses khi statusFilter khác all.
   */
  filterByPendingAssignments?: boolean;
  programCoordinatorId?: number;
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
  filterByPendingAssignments = false,
  programCoordinatorId,
}: RequestSidebarProps) {
  const navigate = useNavigate();
  const { id } = useParams();
  const REQUEST_SIDEBAR_PAGE_SIZE = 500;

  /** Tab Tất cả + trạng thái “Tất cả”: không gửi Statuses, BE trả về mọi yêu cầu (đỡ lặp list đủ enum). */
  const requestQueryOptions = (() => {
    if (filterByPendingAssignments) {
      if (statusFilter !== 'all') {
        return {
          programCoordinatorId,
          assignmentStatuses: ['1'],
          statuses: [STATUS_FILTER_TO_API[statusFilter]],
        };
      }
      return {
        programCoordinatorId,
        assignmentStatuses: ['1'],
        statuses: [...ASSIGNMENT_TAB_REQUEST_STATUSES_API],
      };
    }
    if (onlyPending) {
      return { programCoordinatorId, statuses: ['PENDING'] };
    }
    if (statusFilter !== 'all') {
      return { programCoordinatorId, statuses: [STATUS_FILTER_TO_API[statusFilter]] };
    }
    if (requestStatusesScope === 'all') {
      return { programCoordinatorId };
    }
    return { programCoordinatorId, statuses: [...REQUEST_APPROVAL_STATUSES] };
  })();

  const { data: requestList, totalItems, loading } = useRequests(
    1,
    REQUEST_SIDEBAR_PAGE_SIZE,
    refreshKey,
    requestQueryOptions
  );
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  // Manager assignment view should still display the same request status UI as PC.
  // Always use the canonical mapping: getRequestStatusInfo.
  const getManagerAssignmentStatusInfo = useMemo(
    () => (status: string | number | null | undefined) => getRequestStatusInfo(status),
    [],
  );

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

      if (filterByPendingAssignments) {
        const code = getRequestStatusCode(item.status);
        if (code == null || !ASSIGNMENT_TAB_REQUEST_STATUS_CODES.has(code)) return false;
        if (statusFilter === 'all') return true;
        const want = STATUS_FILTER_TO_REQUEST_CODE[statusFilter];
        return code === want;
      }

      if (onlyPending) return isPendingStatus(item.status);
      if (statusFilter === 'all') return true;
      const want = STATUS_FILTER_TO_REQUEST_CODE[statusFilter];
      return getRequestStatusCode(item.status) === want;
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
        <div className="flex-1 overflow-y-auto scrollbar-hide no-scrollbar p-3 space-y-1 app-page-bg">
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
                statusInfoOverride={getManagerAssignmentStatusInfo(item.status)}
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
