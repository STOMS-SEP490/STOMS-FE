
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


export const TRANSACTION_TYPE = {
  EXPENSE: 1,
  CONTRIBUTION: 2,
} as const;

export const EXPENSE_STATUS = {
  PENDING: 1,
  APPROVED: 2,
  REJECTED: 3,
} as const;


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


export const REQUEST_STATUS_LABEL: Record<number, string> = {
  1: 'Chờ duyệt',
  2: 'Từ chối',
  3: 'Đã duyệt',
  4: 'Đã phân công',
  5: 'Đã công bố',
  6: 'Hoàn thành',
  7: 'Huỷ',
};

export const SESSION_STATUS_LABEL: Record<number, string> = {
  1: 'Chờ duyệt',
  2: 'Đã duyệt',
  3: 'Từ chối',
  4: 'Đã phân công',
  5: 'Từ chối phân công',
  6: 'Duyệt phân công',
  7: 'Huỷ',
  8: 'Đang diễn ra',
  9: 'Hoàn thành',
};

export function isSessionAssignmentRejectedStatus(
  status: string | number | null | undefined,
): boolean {
  if (status == null || status === '') return false;
  const n = Number(status);
  if (!Number.isNaN(n) && n === SESSION_STATUS.ASSIGNMENT_REJECTED) return true;
  const compact = String(status).toUpperCase().replace(/[\s_-]/g, '');
  return compact === 'ASSIGNMENTREJECTED';
}

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

export const ASSIGNMENT_STATUS = {
  PENDING: 1,
  APPROVED: 2,
  REJECTED: 3,
  CANCELLED: 4,
} as const;

export const ASSIGNMENT_STATUS_LABEL: Record<number, string> = {
  1: 'Chờ duyệt',
  2: 'Đã duyệt',
  3: 'Bị từ chối',
  4: 'Bị hủy',
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

export function getExpenseStatusInfo(status: string | number | null | undefined): {
  code: number | null;
  label: string;
  className: string;
} {
  const baseClass = 'bg-slate-50 text-slate-700 border-slate-200';
  if (status == null || status === '') return { code: null, label: '—', className: baseClass };
  const n = Number(status);
  const code = !Number.isNaN(n) && EXPENSE_STATUS_LABEL[n] ? n : null;
  if (!code) return { code: null, label: String(status), className: baseClass };
  const classNameByCode: Record<number, string> = {
    [EXPENSE_STATUS.PENDING]: 'bg-amber-50 text-amber-700 border-amber-200',
    [EXPENSE_STATUS.APPROVED]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    [EXPENSE_STATUS.REJECTED]: 'bg-rose-50 text-rose-700 border-rose-200',
  };
  return {
    code,
    label: EXPENSE_STATUS_LABEL[code] ?? String(status),
    className: classNameByCode[code] ?? baseClass,
  };
}

function normalizeEquipmentBorrowingStatusCode(
  status: string | number | null | undefined
): number | null {
  if (status == null || status === '') return null;
  const n = Number(status);
  if (!Number.isNaN(n) && EQUIPMENT_BORROWING_STATUS_LABEL[n]) return n;
  const s = String(status).toLowerCase().trim();
  if (s.includes('borrowed') || s.includes('đang mượn')) return EQUIPMENT_BORROWING_STATUS.BORROWED;
  if (s.includes('returned') || s.includes('đã trả')) return EQUIPMENT_BORROWING_STATUS.RETURNED;
  if (s.includes('damaged') || s.includes('hư') || s.includes('hỏng')) return EQUIPMENT_BORROWING_STATUS.DAMAGED;
  if (s.includes('lost') || s.includes('mất')) return EQUIPMENT_BORROWING_STATUS.LOST;
  return null;
}

export function getEquipmentBorrowingStatusInfo(status: string | number | null | undefined): {
  code: number | null;
  label: string;
  className: string;
  isReturned: boolean;
} {
  const baseClass = 'bg-gray-100 text-gray-700';
  const code = normalizeEquipmentBorrowingStatusCode(status);
  if (!code) {
    return {
      code: null,
      label: String(status || '—'),
      className: baseClass,
      isReturned: false,
    };
  }
  const classNameByCode: Record<number, string> = {
    [EQUIPMENT_BORROWING_STATUS.BORROWED]: 'bg-orange-100 text-orange-700',
    [EQUIPMENT_BORROWING_STATUS.RETURNED]: 'bg-emerald-100 text-emerald-700',
    [EQUIPMENT_BORROWING_STATUS.DAMAGED]: 'bg-amber-100 text-amber-700',
    [EQUIPMENT_BORROWING_STATUS.LOST]: 'bg-red-100 text-red-700',
  };
  return {
    code,
    label: EQUIPMENT_BORROWING_STATUS_LABEL[code] ?? String(status || '—'),
    className: classNameByCode[code] ?? baseClass,
    isReturned: code === EQUIPMENT_BORROWING_STATUS.RETURNED,
  };
}

function normalizeAssignmentStatusCode(
  status: string | number | null | undefined
): number | null {
  if (status == null || status === '') return null;
  const n = Number(status);
  if (!Number.isNaN(n)) {
    if (n === ASSIGNMENT_STATUS.CANCELLED || n === SESSION_STATUS.CANCELLED) {
      return ASSIGNMENT_STATUS.CANCELLED;
    }
    if (ASSIGNMENT_STATUS_LABEL[n]) return n;
  }
  const s = String(status).toLowerCase().trim();
  if (s.includes('pending') || s.includes('chờ')) return ASSIGNMENT_STATUS.PENDING;
  if (s.includes('approved') || s.includes('đã duyệt')) return ASSIGNMENT_STATUS.APPROVED;
  if (s.includes('rejected') || s.includes('từ chối')) return ASSIGNMENT_STATUS.REJECTED;
  if (s.includes('cancelled') || s.includes('canceled') || s.includes('đã hủy') || s.includes('hủy')) {
    return ASSIGNMENT_STATUS.CANCELLED;
  }
  return null;
}

export function getAssignmentStatusInfo(status: string | number | null | undefined): {
  code: number | null;
  label: string;
  className: string;
} {
  const baseClass = 'bg-slate-50 text-slate-700 border-slate-200';
  const code = normalizeAssignmentStatusCode(status);
  if (!code) {
    return { code: null, label: String(status || '—'), className: baseClass };
  }
  const classNameByCode: Record<number, string> = {
    [ASSIGNMENT_STATUS.PENDING]: 'bg-amber-50 text-amber-700 border-amber-200',
    [ASSIGNMENT_STATUS.APPROVED]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    [ASSIGNMENT_STATUS.REJECTED]: 'bg-rose-50 text-rose-700 border-rose-200',
    [ASSIGNMENT_STATUS.CANCELLED]: 'bg-slate-50 text-slate-700 border-slate-200',
  };
  return {
    code,
    label: ASSIGNMENT_STATUS_LABEL[code] ?? String(status || '—'),
    className: classNameByCode[code] ?? baseClass,
  };
}

export function getAssignmentStaffRoleAccent(isTeacherRole: boolean): {
  stripe: string;
  avatar: string;
  selectHi: string;
} {
  if (isTeacherRole) {
    return {
      stripe: 'border-l-[3px] border-l-[#A78BFA] bg-[#FAF5FF]',
      avatar: 'bg-[#F3E8FF] text-[#6D28D9]',
      selectHi: 'ring-1 ring-inset ring-[#A78BFA66] bg-[#FAF5FF]',
    };
  }
  return {
    stripe: 'border-l-[3px] border-l-[#EAB308] bg-[#FFFBEB]',
    avatar: 'bg-[#FEF3C7] text-[#854D0E]',
    selectHi: 'ring-1 ring-inset ring-[#FACC1566] bg-[#FFFBEB]',
  };
}

export function getTransactionTypeInfo(type: string | number | null | undefined): {
  code: number | null;
  label: string;
  className: string;
} {
  const baseClass = 'bg-gray-50 text-gray-700 border-gray-200';
  if (type == null || type === '') return { code: null, label: '—', className: baseClass };
  const n = Number(type);
  if (Number.isNaN(n)) {
    return { code: null, label: String(type), className: baseClass };
  }
  const classNameByCode: Record<number, string> = {
    [TRANSACTION_TYPE.EXPENSE]: 'bg-rose-50 text-rose-700 border-rose-200',
    [TRANSACTION_TYPE.CONTRIBUTION]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  return {
    code: n,
    label: TRANSACTION_TYPE_LABEL[n] ?? String(type),
    className: classNameByCode[n] ?? baseClass,
  };
}


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
    if (
      s.includes('assigning') ||
      s.includes('đang phân công') ||
      s.includes('đã phân công')
    )
      return REQUEST_STATUS.ASSIGNING;
    if (s.includes('published') || s.includes('đã công bố'))
      return REQUEST_STATUS.PUBLISHED;
    if (s.includes('completed') || s.includes('hoàn thành') || s.includes('done') || s.includes('finished'))
      return REQUEST_STATUS.COMPLETED;
    if (
      s.includes('cancelled') ||
      s.includes('canceled') ||
      s.includes('đã hủy') ||
      s.includes('huỷ')
    )
      return REQUEST_STATUS.CANCELLED;
  }
  if (mapping === SESSION_STATUS_LABEL) {
    const normalized = s.replace(/\s|-/g, '_');
    if (normalized === 'pending' || s.includes('chờ')) return SESSION_STATUS.PENDING;
    if (normalized === 'approved' || s.includes('đã duyệt')) return SESSION_STATUS.APPROVED;
    if (
      s.includes('assignmentrejected') ||
      normalized === 'assignment_rejected' ||
      s.includes('từ chối phân công') ||
      s.includes('phân công bị từ chối')
    ) {
      return SESSION_STATUS.ASSIGNMENT_REJECTED;
    }
    if (normalized === 'rejected' || s.includes('reject') || s.includes('từ chối'))
      return SESSION_STATUS.REJECTED;
    // Mã 4 (ASSIGNING): nhãn «Đã phân công»; mã 6 (ASSIGNED): «Duyệt phân công»
    if (normalized === 'assigned' || s.includes('duyệt phân công')) return SESSION_STATUS.ASSIGNED;
    if (
      normalized === 'assigning' ||
      s.includes('đang phân công') ||
      s.includes('đã phân công')
    )
      return SESSION_STATUS.ASSIGNING;
    if (normalized === 'cancelled' || s.includes('đã hủy') || s.includes('huỷ'))
      return SESSION_STATUS.CANCELLED;
    if (normalized === 'ongoing' || s.includes('đang diễn')) return SESSION_STATUS.ONGOING;
    if (normalized === 'completed' || s.includes('hoàn thành')) return SESSION_STATUS.COMPLETED;
  }
  return null;
}

export function getSessionStatusCode(status: string | number | null | undefined): number | null {
  return normalizeStatusCode(status, SESSION_STATUS_LABEL);
}

export function getSessionStatusLabel(status: string | number | null | undefined): string {
  const code = normalizeStatusCode(status, SESSION_STATUS_LABEL);
  if (!code) return String(status || '—');
  return SESSION_STATUS_LABEL[code] ?? String(status);
}

export function getRequestStatusCode(status: string | number | null | undefined): number | null {
  return normalizeStatusCode(status, REQUEST_STATUS_LABEL);
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
    [REQUEST_STATUS.PUBLISHED]: 'bg-violet-50 text-violet-700 border-violet-200',
    [REQUEST_STATUS.COMPLETED]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    [REQUEST_STATUS.CANCELLED]: 'bg-slate-50 text-slate-700 border-slate-200',
  };
  const leftBarByCode: Record<number, string> = {
    [REQUEST_STATUS.PENDING]: 'border-l-amber-500',
    [REQUEST_STATUS.APPROVED]: 'border-l-emerald-500',
    [REQUEST_STATUS.REJECTED]: 'border-l-rose-500',
    [REQUEST_STATUS.ASSIGNING]: 'border-l-sky-500',
    [REQUEST_STATUS.PUBLISHED]: 'border-l-violet-500',
    [REQUEST_STATUS.COMPLETED]: 'border-l-emerald-500',
    [REQUEST_STATUS.CANCELLED]: 'border-l-slate-400',
  };
  return {
    label,
    className: classNameByCode[code] ?? baseClass,
    leftBarClass: leftBarByCode[code] ?? 'border-l-slate-400',
  };
}

export function getTeamLeaderRequestStatusInfo(
  status: string | number | null | undefined
): {
  label: string;
  className: string;
  leftBarClass: string;
} {
  // Team Leader request status should be consistent with PC.
  // Use the same mapping so all roles render identical labels/colors for the same BE status code.
  return getRequestStatusInfo(status);
}


export function getSessionStatusInfo(status: string | number | null | undefined): {
  label: string;
  className: string;
} {
  const baseClass = 'bg-slate-50 text-slate-700 border-slate-200';
  const code = normalizeStatusCode(status, SESSION_STATUS_LABEL);
  if (!code) {
    return { label: String(status || '—'), className: baseClass };
  }
  const label = SESSION_STATUS_LABEL[code] ?? String(status || '—');
  const classNameByCode: Record<number, string> = {
    [SESSION_STATUS.PENDING]: 'bg-amber-50 text-amber-700 border-amber-200',
    [SESSION_STATUS.APPROVED]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    [SESSION_STATUS.REJECTED]: 'bg-rose-50 text-rose-700 border-rose-200',
    [SESSION_STATUS.ASSIGNING]: 'bg-sky-50 text-sky-700 border-sky-200',
    [SESSION_STATUS.ASSIGNMENT_REJECTED]: 'bg-rose-50 text-rose-800 border-rose-200',
    [SESSION_STATUS.ASSIGNED]: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    [SESSION_STATUS.CANCELLED]: 'bg-slate-50 text-slate-700 border-slate-200',
    [SESSION_STATUS.ONGOING]: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    [SESSION_STATUS.COMPLETED]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  return {
    label,
    className: classNameByCode[code] ?? baseClass,
  };
}


