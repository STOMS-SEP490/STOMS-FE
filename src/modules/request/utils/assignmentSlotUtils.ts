import { ASSIGNMENT_STATUS, getAssignmentStatusInfo, SESSION_STATUS } from '@/constants/status';
import type { SessionAssignmentRow } from '../requestDetail.types';

const PLACEHOLDER_NAMES = new Set(['—', '-', '–', 'n/a', 'na']);

/** Có nhân sự được gán thật (slot không trống sau khi GV báo bận / chưa gán). */
export function isAssignmentSlotFilled(row: SessionAssignmentRow): boolean {
  if (row.staffMemberId > 0) return true;
  const name = (row.fullName || '').trim();
  if (!name) return false;
  if (PLACEHOLDER_NAMES.has(name.toLowerCase())) return false;
  return true;
}

export function isAssignmentApproved(row: SessionAssignmentRow): boolean {
  return getAssignmentStatusInfo(row.status).code === ASSIGNMENT_STATUS.APPROVED;
}

export function isAssignmentRejected(row: SessionAssignmentRow): boolean {
  return getAssignmentStatusInfo(row.status).code === ASSIGNMENT_STATUS.REJECTED;
}

/** Assignment đã hủy nhận (vd. báo bận) — không duyệt/từ chối được. */
export function isAssignmentCancelled(row: SessionAssignmentRow): boolean {
  const s = row.status;
  if (s == null || s === '') return false;
  const n = Number(s);
  if (!Number.isNaN(n) && n === SESSION_STATUS.CANCELLED) return true;
  const compact = String(s).toUpperCase().replace(/[\s_-]/g, '');
  return compact === 'CANCELLED' || compact === 'CANCELED';
}

/** Manager có thể duyệt / từ chối assignment này (đã có người, chưa kết thúc workflow). */
export function canManagerReviewAssignmentRow(row: SessionAssignmentRow): boolean {
  if (isAssignmentCancelled(row)) return false;
  if (!isAssignmentSlotFilled(row)) return false;
  return !isAssignmentApproved(row) && !isAssignmentRejected(row);
}
