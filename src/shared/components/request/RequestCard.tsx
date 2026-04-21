import { getRequestStatusInfo } from '@/constants/status';
import { Hash, GraduationCap, Star, User } from 'lucide-react';

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
  /** Badges bổ sung (ví dụ tiến độ phân công team), hiển thị cạnh trạng thái từ API */
  secondaryStatusPills?: { label: string; className: string }[];
  isActive?: boolean;
  isHovered?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  hintText?: string;
  /** Hình thức tham gia: true = Liên tục, false = Từng buổi */
  isContinuous?: boolean | null;
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
  secondaryStatusPills,
  isActive = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: RequestCardProps) {
  const typeInfo = getRequestType({ subjectId, courseId, eventId });
  // Thanh màu bên trái theo type (môn học: xanh, khóa học: tím, sự kiện: cam)
  const accentColor = eventId
    ? '#F59E0B'
    : courseId
      ? '#8B5CF6'
      : subjectId
        ? '#2197C0'
        : '#94A3B8';
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
      className={`rounded-xl border border-slate-200 p-3 transition group text-left relative overflow-hidden ${
        onClick ? 'cursor-pointer' : ''
      } ${
        isActive
          ? 'bg-sky-50/80 border-sky-300 shadow-sm'
          : 'bg-white hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      <div
        aria-hidden
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: `${accentColor}55` }}
      />
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-[#1a7a99] truncate">
            {requestName || requestCode || '—'}
          </div>
          {requestCode && (
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
              <Hash className="h-3.5 w-3.5 shrink-0" />
              <span className="font-semibold text-slate-600 truncate">{requestCode}</span>
            </div>
          )}
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
        <div className="flex flex-wrap items-center justify-end gap-1 shrink-0 max-w-[58%]">
          {statusInfo && <StatusPill statusInfo={statusInfo} />}
          {(secondaryStatusPills ?? []).map((pill, idx) => (
            <span
              key={`${pill.label}-${idx}`}
              className={`inline-flex items-center whitespace-nowrap shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold border ${pill.className}`}
            >
              {pill.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
