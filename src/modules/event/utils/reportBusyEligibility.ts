import dayjs from 'dayjs';

/** Số ngày (theo lịch) tối thiểu giữa hôm nay và ngày diễn ra buổi mới được báo bận. */
export const REPORT_BUSY_MIN_LEAD_DAYS = 2;

/** Thông báo khi buổi quá gần (dùng Tooltip / message). */
export const REPORT_BUSY_TOO_SOON_VI = 'Chỉ được báo bận trước buổi ít nhất 2 ngày.';

/**
 * Buổi phải cách hôm nay ít nhất {@link REPORT_BUSY_MIN_LEAD_DAYS} ngày lịch (so sánh theo startOf day).
 */
export function canReportBusyForSessionStart(sessionStart: Date): boolean {
  const sessionDay = dayjs(sessionStart).startOf('day');
  const today = dayjs().startOf('day');
  return sessionDay.diff(today, 'day') >= REPORT_BUSY_MIN_LEAD_DAYS;
}
