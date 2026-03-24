import { getRequestStatusInfo } from '@/constants/status';
import { GraduationCap, Star, User } from 'lucide-react';

type RequestStatusInfo = ReturnType<typeof getRequestStatusInfo>;

export function getRequestType(item: {
  subjectId?: number | null;
  courseId?: number | null;
  eventId?: number | null;
}) {
  if (item.eventId) return { label: 'Yêu cầu sự kiện', icon: Star };
  if (item.subjectId || item.courseId) return { label: 'Yêu cầu giảng dạy', icon: GraduationCap };
  return { label: 'Khác', icon: GraduationCap };
}

function StatusPill({ statusInfo }: { statusInfo: RequestStatusInfo }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap shrink-0 rounded-full px-3 py-1 text-[11px] font-medium border ${statusInfo.className}`}
    >
      {statusInfo.label}
    </span>
  );
}

export type RequestCardProps = {
  requestName: string;
  requestCode: string;
  /** Người tạo / khách hàng hiển thị dưới type */
  customerName?: string | null;
  subjectId?: number | null;
  courseId?: number | null;
  eventId?: number | null;
  status?: string | number | null;
  /** Override hiển thị trạng thái (dùng khi cùng 1 status code nhưng diễn giải khác nhau theo màn hình) */
  statusInfoOverride?: RequestStatusInfo | null;
  /** Hiển thị "Cần xử lý" khi trạng thái chờ duyệt */
  showNeedsAction?: boolean;
  isActive?: boolean;
  isHovered?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  hintText?: string;
};

export default function RequestCard({
  requestName,
  requestCode,
  customerName,
  subjectId,
  courseId,
  eventId,
  status,
  statusInfoOverride,
  isActive = false,
  isHovered = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
  hintText = 'Bấm để xem chi tiết',
}: RequestCardProps) {
  const typeInfo = getRequestType({ subjectId, courseId, eventId });
  const statusInfo =
    statusInfoOverride ??
    (status != null && String(status).trim() !== '' ? getRequestStatusInfo(status) : null);

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`rounded-xl border border-l-4 border-slate-200 p-3 transition group text-left ${
        onClick ? 'cursor-pointer' : ''
      } ${
        isActive
          ? 'bg-sky-50/80 border-sky-300 shadow-sm'
          : 'bg-white hover:border-slate-300 hover:shadow-sm'
      } ${statusInfo ? statusInfo.leftBarClass : 'border-l-slate-300'}`}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-900 truncate">
            {requestName || requestCode || '—'}
          </div>
          <div className="mt-1.5 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
              <typeInfo.icon className="w-3.5 h-3.5 shrink-0" />
              <span>{typeInfo.label}</span>
            </div>
            {customerName != null && customerName !== '' && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <User className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{customerName}</span>
              </div>
            )}
            
          </div>
        </div>
        {statusInfo && <StatusPill statusInfo={statusInfo} />}
      </div>
      {(isActive || isHovered) && hintText && (
        <div className="mt-2 text-[11px] text-slate-500">{hintText}</div>
      )}
    </div>
  );
}
