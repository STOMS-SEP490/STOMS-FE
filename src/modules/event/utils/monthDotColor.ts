/**
 * Chấm tròn lịch: màu theo trạng thái phiên từ BE.
 * - Đã phân công / chưa diễn ra (Assigned, …): xanh dương
 * - Đang diễn ra: vàng
 * - Hoàn thành: xanh lá
 * Nếu không parse được status: suy luận theo khung giờ (quá khứ = hoàn thành, trong slot = đang diễn ra, tương lai = đã phân công).
 */
import { getSessionStatusCode, SESSION_STATUS } from '@/constants/status';

/** Xanh dương nhạt (sky), đồng bộ tông lịch / nút toolbar */
const BLUE = '#38bdf8';
const YELLOW = '#eab308';
const GREEN = '#22c55e';
const SLATE = '#94a3b8';

export function resolveMonthDotColor(
  status: string | number | null | undefined,
  start: Date | null,
  end: Date | null,
): string {
  const code = getSessionStatusCode(status);

  if (code === SESSION_STATUS.COMPLETED) return GREEN;
  if (code === SESSION_STATUS.ONGOING) return YELLOW;
  if (
    code === SESSION_STATUS.ASSIGNED ||
    code === SESSION_STATUS.ASSIGNING ||
    code === SESSION_STATUS.APPROVED ||
    code === SESSION_STATUS.PENDING
  ) {
    return BLUE;
  }
  if (
    code === SESSION_STATUS.CANCELLED ||
    code === SESSION_STATUS.REJECTED ||
    code === SESSION_STATUS.ASSIGNMENT_REJECTED
  ) {
    return SLATE;
  }

  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return BLUE;
  }

  const now = Date.now();
  const t0 = start.getTime();
  const t1 = end.getTime();
  if (now > t1) return GREEN;
  if (now >= t0 && now <= t1) return YELLOW;
  return BLUE;
}
