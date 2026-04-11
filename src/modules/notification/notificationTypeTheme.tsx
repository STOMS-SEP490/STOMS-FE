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
    iconWrapClass: 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-sm shadow-violet-500/20',
  },
  BORROWING: {
    label: 'Mượn trả',
    Icon: Package,
    iconWrapClass: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm shadow-amber-500/20',
  },
  EQUIPMENT_BORROWING: {
    label: 'Mượn thiết bị',
    Icon: Laptop,
    iconWrapClass: 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-sm shadow-teal-500/20',
  },
  MEMBER: {
    label: 'Thành viên',
    Icon: UserCircle,
    iconWrapClass: 'bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-sm shadow-sky-500/20',
  },
  REQUEST: {
    label: 'Yêu cầu',
    Icon: Inbox,
    iconWrapClass: 'bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-sm shadow-rose-500/20',
  },
  SESSION: {
    label: 'Phiên học',
    Icon: CalendarClock,
    iconWrapClass: 'bg-gradient-to-br from-cyan-500 to-sky-600 text-white shadow-sm shadow-cyan-500/20',
  },
  RESERVATION: {
    label: 'Đặt trước',
    Icon: CalendarClock,
    iconWrapClass: 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-sm shadow-indigo-500/20',
  },
  SKILL: {
    label: 'Kỹ năng',
    Icon: Award,
    iconWrapClass: 'bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white shadow-sm shadow-fuchsia-500/20',
  },
  TEAM: {
    label: 'Nhóm',
    Icon: Users,
    iconWrapClass: 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm shadow-blue-500/20',
  },
  TRANSACTION: {
    label: 'Giao dịch / Quỹ',
    Icon: Wallet,
    iconWrapClass: 'bg-gradient-to-br from-emerald-500 to-green-700 text-white shadow-sm shadow-emerald-500/20',
  },
  USER: {
    label: 'Tài khoản',
    Icon: User,
    iconWrapClass: 'bg-gradient-to-br from-slate-600 to-slate-800 text-white shadow-sm shadow-slate-600/20',
  },
  GENERIC: {
    label: 'Thông báo',
    Icon: Bell,
    iconWrapClass: 'bg-gradient-to-br from-slate-400 to-slate-600 text-white shadow-sm shadow-slate-400/15',
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
