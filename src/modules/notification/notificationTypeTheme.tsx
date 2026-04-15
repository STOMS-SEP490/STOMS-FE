import type { LucideIcon } from 'lucide-react';
import {
  Award,
  Bell,
  CalendarClock,
  ClipboardList,
  Inbox,
  Laptop,
  Package,
  User,
  UserCircle,
  Users,
  Wallet,
} from 'lucide-react';

/** Các key chuẩn (và số 1–10 tương ứng) */
export type NotificationKind =
  | 'ASSIGNMENT'
  | 'BORROWING'
  | 'EQUIPMENT_BORROWING'
  | 'MEMBER'
  | 'REQUEST'
  | 'SESSION'
  | 'RESERVATION'
  | 'SKILL'
  | 'TEAM'
  | 'TRANSACTION'
  | 'USER'
  | 'GENERIC';

export type NotificationVisual = {
  kind: NotificationKind;
  label: string;
  Icon: LucideIcon;
  /** Chỉ khác nhau phần icon (nền thẻ thống nhất ở UI) */
  iconWrapClass: string;
};

const NUM_TO_KIND: Record<string, NotificationKind> = {
  '1': 'ASSIGNMENT',
  '2': 'BORROWING',
  '3': 'EQUIPMENT_BORROWING',
  '4': 'MEMBER',
  '5': 'REQUEST',
  '6': 'SESSION',
  '7': 'SKILL',
  '8': 'TEAM',
  '9': 'TRANSACTION',
  '10': 'USER',
  '11': 'RESERVATION',
};

const THEMES: Record<NotificationKind, Omit<NotificationVisual, 'kind'>> = {
  ASSIGNMENT: {
    label: 'Phân công',
    Icon: ClipboardList,
    iconWrapClass: 'bg-violet-50 text-violet-600 ring-1 ring-violet-100',
  },
  BORROWING: {
    label: 'Mượn trả',
    Icon: Package,
    iconWrapClass: 'bg-amber-50 text-amber-600 ring-1 ring-amber-100',
  },
  EQUIPMENT_BORROWING: {
    label: 'Mượn thiết bị',
    Icon: Laptop,
    iconWrapClass: 'bg-teal-50 text-teal-600 ring-1 ring-teal-100',
  },
  MEMBER: {
    label: 'Thành viên',
    Icon: UserCircle,
    iconWrapClass: 'bg-sky-50 text-sky-600 ring-1 ring-sky-100',
  },
  REQUEST: {
    label: 'Yêu cầu',
    Icon: Inbox,
    iconWrapClass: 'bg-rose-50 text-rose-600 ring-1 ring-rose-100',
  },
  SESSION: {
    label: 'Buổi học',
    Icon: CalendarClock,
    iconWrapClass: 'bg-cyan-50 text-cyan-600 ring-1 ring-cyan-100',
  },
  RESERVATION: {
    label: 'Đơn yêu cầu thiết bị',
    Icon: CalendarClock,
    iconWrapClass: 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100',
  },
  SKILL: {
    label: 'Kỹ năng',
    Icon: Award,
    iconWrapClass: 'bg-fuchsia-50 text-fuchsia-600 ring-1 ring-fuchsia-100',
  },
  TEAM: {
    label: 'Nhóm',
    Icon: Users,
    iconWrapClass: 'bg-blue-50 text-blue-600 ring-1 ring-blue-100',
  },
  TRANSACTION: {
    label: 'Giao dịch / Quỹ',
    Icon: Wallet,
    iconWrapClass: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100',
  },
  USER: {
    label: 'Tài khoản',
    Icon: User,
    iconWrapClass: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  },
  GENERIC: {
    label: 'Thông báo',
    Icon: Bell,
    iconWrapClass: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  },
};

function normalizeRawType(raw: string): NotificationKind {
  const t = raw?.trim() ?? '';
  if (!t) return 'GENERIC';

  if (/^\d+$/.test(t)) {
    return NUM_TO_KIND[t] ?? 'GENERIC';
  }

  let u = t.toUpperCase().replace(/\s+/g, '_');

  if (u === 'EQUIPMENTBORROWING') return 'EQUIPMENT_BORROWING';
  if (u.includes('EQUIPMENT') && (u.includes('BORROW') || u.includes('BORROWING'))) {
    return 'EQUIPMENT_BORROWING';
  }

  if (u in THEMES) return u as NotificationKind;

  return 'GENERIC';
}

export function getNotificationVisual(type: string | undefined | null): NotificationVisual {
  const kind = normalizeRawType(String(type ?? ''));
  const base = THEMES[kind] ?? THEMES.GENERIC;
  return { kind, ...base };
}

/** Chip loại — một kiểu cho mọi thông báo */
export const NOTIFICATION_TYPE_CHIP_CLASS =
  'bg-slate-100/95 text-slate-600 ring-1 ring-slate-200/90';
