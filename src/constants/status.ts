// Hệ thống status/tình trạng dùng chung cho nhiều màn hình.
// Các constant này chỉ gom mapping mã số <-> key tiếng Anh + nhãn hiển thị tiếng Việt.

// -------------------- BORROWING / EQUIPMENT BORROWING / EQUIPMENT --------------------

export const BORROWING_STATUS = {
  BORROWED: 1,
  PARTIAL_RETURNED: 2,
  RETURNED: 3,
  OVERDUE: 4,
} as const;

export const EQUIPMENT_STATUS = {
  AVAILABLE: 1,
  BORROWED: 2,
  DAMAGED: 3,
  LOST: 4,
  UNAVAILABLE: 5,
} as const;

export const EQUIPMENT_BORROWING_STATUS = {
  BORROWED: 1,
  RETURNED: 2,
  DAMAGED: 3,
  LOST: 4,
} as const;

// -------------------- TRANSACTION / EXPENSE --------------------

export const TRANSACTION_TYPE = {
  EXPENSE: 1,
  CONTRIBUTION: 2,
} as const;

export const EXPENSE_STATUS = {
  PENDING: 1,
  APPROVED: 2,
  REJECTED: 3,
} as const;

// -------------------- REQUEST / SESSION --------------------

export const REQUEST_STATUS = {
  PENDING: 1,
  REJECTED: 2,
  APPROVED: 3,
  ASSIGNING: 4,
  PUBLISHED: 5,
  COMPLETED: 6,
  CANCELLED: 7,
} as const;

export const SESSION_STATUS = {
  PENDING: 1,
  APPROVED: 2,
  REJECTED: 3,
  ASSIGNING: 4,
  ASSIGNMENT_REJECTED: 5,
  ASSIGNED: 6,
  CANCELLED: 7,
  ONGOING: 8,
  COMPLETED: 9,
} as const;

// -------------------- LABEL HELPERS (VN) --------------------

export const REQUEST_STATUS_LABEL: Record<number, string> = {
  1: 'Chờ duyệt',
  2: 'Từ chối',
  3: 'Đã duyệt',
  4: 'Đang phân công',
  5: 'Đã công bố',
  6: 'Hoàn thành',
  7: 'Đã hủy',
};

export const SESSION_STATUS_LABEL: Record<number, string> = {
  1: 'Chờ duyệt',
  2: 'Đã duyệt',
  3: 'Từ chối',
  4: 'Đang phân công',
  5: 'Phân công bị từ chối',
  6: 'Đã phân công',
  7: 'Đã hủy',
  8: 'Đang diễn ra',
  9: 'Hoàn thành',
};

export const EQUIPMENT_STATUS_LABEL: Record<number, string> = {
  1: 'Sẵn sàng',
  2: 'Đang mượn',
  3: 'Hư hỏng',
  4: 'Mất',
  5: 'Không khả dụng',
};

export const EQUIPMENT_BORROWING_STATUS_LABEL: Record<number, string> = {
  1: 'Đang mượn',
  2: 'Đã trả',
  3: 'Hư hỏng',
  4: 'Mất',
};

export const TRANSACTION_TYPE_LABEL: Record<number, string> = {
  1: 'Chi phí',
  2: 'Đóng góp',
};

export const EXPENSE_STATUS_LABEL: Record<number, string> = {
  1: 'Chờ duyệt',
  2: 'Đã duyệt',
  3: 'Từ chối',
};

// -------------------- HELPERS --------------------

function normalizeStatusCode(
  status: string | number | null | undefined,
  mapping: Record<number, string>
): number | null {
  if (status === null || status === undefined) return null;
  const n = Number(status);
  if (!Number.isNaN(n) && mapping[n]) return n;

  const s = String(status).toLowerCase();
  // Map một số text phổ biến sang code chuẩn
  if (mapping === REQUEST_STATUS_LABEL) {
    if (s.includes('pending') || s.includes('chờ')) return REQUEST_STATUS.PENDING;
    if (s.includes('approved') || s.includes('đã duyệt')) return REQUEST_STATUS.APPROVED;
    if (s.includes('rejected') || s.includes('reject') || s.includes('từ chối'))
      return REQUEST_STATUS.REJECTED;
  }
  if (mapping === SESSION_STATUS_LABEL) {
    if (s.includes('pending') || s.includes('chờ')) return SESSION_STATUS.PENDING;
    if (s.includes('approved') || s.includes('đã duyệt')) return SESSION_STATUS.APPROVED;
    if (s.includes('rejected') || s.includes('reject') || s.includes('từ chối'))
      return SESSION_STATUS.REJECTED;
    if (s === 'assigning' || s.includes('đang phân công')) return SESSION_STATUS.ASSIGNING;
    if (s === 'assignment_rejected' || s.includes('phân công bị từ chối'))
      return SESSION_STATUS.ASSIGNMENT_REJECTED;
    if (s === 'assigned' || s.includes('đã phân công')) return SESSION_STATUS.ASSIGNED;
    if (s === 'cancelled' || s.includes('đã hủy')) return SESSION_STATUS.CANCELLED;
    if (s.includes('ongoing') || s.includes('đang diễn')) return SESSION_STATUS.ONGOING;
    if (s.includes('completed') || s.includes('hoàn thành')) return SESSION_STATUS.COMPLETED;
  }
  return null;
}

export function getSessionStatusLabel(status: string | number | null | undefined): string {
  const code = normalizeStatusCode(status, SESSION_STATUS_LABEL);
  if (!code) return String(status || '—');
  return SESSION_STATUS_LABEL[code] ?? String(status);
}

export function getRequestStatusLabel(status: string | number | null | undefined): string {
  const code = normalizeStatusCode(status, REQUEST_STATUS_LABEL);
  if (!code) return String(status || '—');
  return REQUEST_STATUS_LABEL[code] ?? String(status);
}

export function getRequestStatusInfo(status: string | number | null | undefined): {
  label: string;
  className: string;
  leftBarClass: string;
} {
  const baseClass = 'bg-slate-50 text-slate-700 border-slate-200';
  const code = normalizeStatusCode(status, REQUEST_STATUS_LABEL);
  if (!code) {
    return { label: String(status || '—'), className: baseClass, leftBarClass: 'border-l-slate-400' };
  }
  const label = REQUEST_STATUS_LABEL[code] ?? String(status || '—');
  const classNameByCode: Record<number, string> = {
    [REQUEST_STATUS.PENDING]: 'bg-amber-50 text-amber-700 border-amber-200',
    [REQUEST_STATUS.APPROVED]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    [REQUEST_STATUS.REJECTED]: 'bg-rose-50 text-rose-700 border-rose-200',
    [REQUEST_STATUS.ASSIGNING]: 'bg-sky-50 text-sky-700 border-sky-200',
    [REQUEST_STATUS.PUBLISHED]: baseClass,
    [REQUEST_STATUS.COMPLETED]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    [REQUEST_STATUS.CANCELLED]: 'bg-slate-50 text-slate-700 border-slate-200',
  };
  const leftBarByCode: Record<number, string> = {
    [REQUEST_STATUS.PENDING]: 'border-l-amber-500',
    [REQUEST_STATUS.APPROVED]: 'border-l-emerald-500',
    [REQUEST_STATUS.REJECTED]: 'border-l-rose-500',
    [REQUEST_STATUS.ASSIGNING]: 'border-l-sky-500',
    [REQUEST_STATUS.PUBLISHED]: 'border-l-slate-400',
    [REQUEST_STATUS.COMPLETED]: 'border-l-emerald-500',
    [REQUEST_STATUS.CANCELLED]: 'border-l-slate-400',
  };
  return {
    label,
    className: classNameByCode[code] ?? baseClass,
    leftBarClass: leftBarByCode[code] ?? 'border-l-slate-400',
  };
}


