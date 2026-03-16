import { Badge } from '@/shared/components/ui/badge';
import { getRequestStatusInfo } from '@/constants/status';

export function getRequestType(item: {
  subjectId?: number | null;
  courseId?: number | null;
  eventId?: number | null;
}) {
  if (item.eventId) return { label: 'Event', cls: 'bg-orange-50 text-orange-700 border-orange-200' };
  if (item.subjectId) return { label: 'Môn', cls: 'bg-blue-50 text-blue-700 border-blue-200' };
  if (item.courseId) return { label: 'Khóa học', cls: 'bg-purple-50 text-purple-700 border-purple-200' };
  return { label: 'Khác', cls: 'bg-slate-50 text-slate-700 border-slate-200' };
}

function StatusBadge({ status }: { status: string | number }) {
  const info = getRequestStatusInfo(status);
  return (
    <Badge className={`${info.className} text-[11px] font-medium whitespace-nowrap shrink-0`}>
      {info.label}
    </Badge>
  );
}

export type RequestCardProps = {
  requestName: string;
  requestCode: string;
  /** Nếu có subjectId/courseId/eventId sẽ hiển thị badge loại (Event/Môn/Khóa học) */
  subjectId?: number | null;
  courseId?: number | null;
  eventId?: number | null;
  /** Trạng thái yêu cầu, hiển thị badge bên phải */
  status?: string | number | null;
  /** Dòng phụ dưới badges, ví dụ "3 phiên" */
  subtitle?: string;
  isActive?: boolean;
  isHovered?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  /** Gợi ý khi active/hover, ví dụ "Bấm để xem chi tiết" */
  hintText?: string;
};

export default function RequestCard({
  requestName,
  requestCode,
  subjectId,
  courseId,
  eventId,
  status,
  subtitle,
  isActive = false,
  isHovered = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
  hintText = 'Bấm để xem chi tiết',
}: RequestCardProps) {
  const typeInfo = getRequestType({ subjectId, courseId, eventId });

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`rounded-2xl border p-3 transition group ${
        onClick ? 'cursor-pointer' : ''
      } ${
        isActive ? 'bg-blue-50/70 border-blue-300 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-black truncate">
            {requestName || '—'}
          </div>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <Badge className="bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium">
              {requestCode}
            </Badge>
            <Badge className={`border text-[11px] font-medium ${typeInfo.cls}`}>
              {typeInfo.label}
            </Badge>
            {subtitle && (
              <span className="text-[11px] text-slate-500">{subtitle}</span>
            )}
          </div>
        </div>
        {status != null && String(status).trim() !== '' && (
          <StatusBadge status={status} />
        )}
      </div>
      {(isActive || isHovered) && hintText && (
        <div className="mt-2 text-[11px] text-slate-600">{hintText}</div>
      )}
    </div>
  );
}
