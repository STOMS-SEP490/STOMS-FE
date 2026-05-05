/**
 * Chấm tròn lịch: màu theo trạng thái buổi từ BE.
 * Đồng bộ với config status chung trong constants/status.ts
 */
import { getSessionStatusCode, SESSION_STATUS } from '@/constants/status';

const AMBER = '#f59e0b';   // Pending, Assigning - bg-amber-50
const EMERALD = '#10b981'; // Approved, Completed - bg-emerald-50
const ROSE = '#f43f5e';    // Rejected, Assignment Rejected - bg-rose-50
const SKY = '#0ea5e9';     // (không dùng cho session status)
const VIOLET = '#8b5cf6';  // Assigned (Duyệt phân công) - bg-violet-50
const CYAN = '#06b6d4';    // Ongoing (Đang diễn ra) - bg-cyan-50
const SLATE = '#64748b';   // Cancelled - bg-slate-50

export function resolveMonthDotColor(
  status: string | number | null | undefined,
  start: Date | null,
  end: Date | null,
): string {
  const code = getSessionStatusCode(status);

  // Đồng bộ với getSessionStatusInfo trong constants/status.ts
  if (code === SESSION_STATUS.PENDING) return AMBER;
  if (code === SESSION_STATUS.APPROVED) return EMERALD;
  if (code === SESSION_STATUS.REJECTED) return ROSE;
  if (code === SESSION_STATUS.ASSIGNING) return SKY;
  if (code === SESSION_STATUS.ASSIGNMENT_REJECTED) return ROSE;
  if (code === SESSION_STATUS.ASSIGNED) return VIOLET;
  if (code === SESSION_STATUS.CANCELLED) return SLATE;
  if (code === SESSION_STATUS.ONGOING) return CYAN;
  if (code === SESSION_STATUS.COMPLETED) return EMERALD;

  // Fallback: suy luận theo thời gian
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return VIOLET; // Default cho buổi đã được phân công
  }

  const now = Date.now();
  const t0 = start.getTime();
  const t1 = end.getTime();
  if (now > t1) return EMERALD;  // Hoàn thành
  if (now >= t0 && now <= t1) return CYAN;  // Đang diễn ra
  return VIOLET;  // Chưa diễn ra (đã phân công)
}
