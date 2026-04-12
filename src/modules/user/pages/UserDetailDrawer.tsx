import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Skeleton, message } from 'antd';
import {
  Bell,
  CalendarClock,
  Laptop,
  Lock,
  Mail,
  MonitorSmartphone,
  Shield,
  X,
} from 'lucide-react';
import userService from '@/modules/user/api/userApi';
import type { User, UserDevice } from '@/modules/user/user';
import { getRoleLabel, getRoleBadgeClass } from '@/constants/role';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/lib/utils';
import { getErrorMessage } from '@/shared/lib/errorMessage';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Khi mở drawer, luôn gọi lại GET /users/{id} để có đủ userDevices, avatarUrl, … */
  userId: number | null;
};

function formatDateTime(date?: string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleString('vi-VN');
}

function platformLabel(p: string) {
  const x = p?.toLowerCase() ?? '';
  if (x === 'web') return 'Web';
  if (x === 'ios') return 'iOS';
  if (x === 'android') return 'Android';
  return p || '—';
}

function shortenAgent(ua: string, max = 72) {
  if (!ua) return '—';
  const t = ua.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export default function UserDetailDrawer({ open, onClose, userId }: Props) {
  const [detail, setDetail] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || userId == null) {
      setDetail(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    userService
      .getUserById(userId)
      .then((res) => {
        if (!cancelled) setDetail(res);
      })
      .catch((err) => {
        if (!cancelled) {
          message.error(getErrorMessage(err) || 'Không tải được chi tiết tài khoản');
          setDetail(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, userId]);

  const sortedDevices = useMemo(() => {
    const list = detail?.userDevices ?? [];
    return [...list].sort(
      (a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime(),
    );
  }, [detail?.userDevices]);

  const notificationCount = Array.isArray(detail?.notifications) ? detail!.notifications!.length : 0;

  if (!open) return null;

  const showBody = detail != null;
  const roleId = detail?.roleId ?? 0;
  const roleName = getRoleLabel(roleId);

  return (
    <>
      <div className="fixed inset-0 z-40 h-full bg-black/35" onClick={onClose} aria-hidden />

      <div
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-[720px] max-w-[96vw]',
          'border-l border-slate-200/80 bg-white shadow-2xl',
          'transition-transform duration-300 ease-out translate-x-0',
        )}
      >
        <div className="flex h-full flex-col overflow-hidden">
          <header className="shrink-0 border-b border-slate-100 bg-gradient-to-b from-slate-50/90 to-white px-5 pb-4 pt-5">
            {loading && !detail ? (
              <div className="flex gap-4 pr-10">
                <Skeleton.Avatar active size={72} shape="circle" />
                <div className="min-w-0 flex-1 space-y-3">
                  <Skeleton active title={{ width: '55%' }} paragraph={{ rows: 1 }} />
                  <Skeleton.Button active size="small" style={{ width: 220 }} />
                </div>
              </div>
            ) : detail ? (
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 gap-4">
                  <img
                    src={detail.avatarUrl?.trim() || '/img/ava.png'}
                    alt=""
                    className="h-[72px] w-[72px] shrink-0 rounded-full object-cover shadow-sm ring-1 ring-slate-200/80"
                  />
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-lg font-semibold tracking-tight text-slate-900">
                        {detail.email}
                      </h2>
                      <Badge
                        className={cn(
                          'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium',
                          detail.isActive
                            ? 'border-0 bg-emerald-100 text-emerald-800'
                            : 'border-0 bg-slate-200 text-slate-700',
                        )}
                      >
                        {detail.isActive ? 'Hoạt động' : 'Vô hiệu hóa'}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <HeaderChip
                        icon={Mail}
                        label={detail.email}
                        title="Email đăng nhập"
                      />
                      <span
                        title="Vai trò"
                        className={cn(
                          'inline-flex max-w-full items-center rounded-lg px-2.5 py-1 text-xs font-medium shadow-sm ring-1 ring-slate-200/80',
                          getRoleBadgeClass(roleId),
                        )}
                      >
                        {roleName}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="shrink-0 rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Đóng"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-slate-500">Không có dữ liệu.</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="shrink-0 rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Đóng"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
          </header>

          <div className="relative min-h-0 flex-1 overflow-y-auto bg-slate-50/70 px-5 py-5">
            {loading && detail && (
              <div className="pointer-events-none absolute inset-0 z-10 bg-white/45" aria-hidden />
            )}
            {loading && detail && (
              <p className="absolute left-1/2 top-6 z-20 -translate-x-1/2 rounded-full bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm ring-1 ring-slate-200/60">
                Đang cập nhật…
              </p>
            )}

            {loading && !detail ? (
              <div className="space-y-4">
                <Skeleton active paragraph={{ rows: 4 }} />
                <Skeleton active paragraph={{ rows: 6 }} />
              </div>
            ) : showBody && detail ? (
              <div className="space-y-8">
                <Section icon={CalendarClock} title="Thông tin chung">
                  <MetaPanel layout="grid">
                    <MetaRow
                      variant="grid"
                      icon={CalendarClock}
                      label="Ngày tạo"
                      value={formatDateTime(detail.createdAt)}
                    />
                    <MetaRow
                      variant="grid"
                      icon={CalendarClock}
                      label="Cập nhật lần cuối"
                      value={formatDateTime(detail.updatedAt)}
                    />
                    <MetaRow
                      variant="grid"
                      icon={Bell}
                      label="Thông báo (số bản ghi)"
                      value={String(notificationCount)}
                    />
                  </MetaPanel>
                </Section>

                <Section icon={Shield} title="Bảo mật & trạng thái">
                  <MetaPanel>
                    <MetaRow
                      icon={Shield}
                      label="Trạng thái tài khoản"
                      value={
                        detail.isActive ? (
                          <Badge className="border-0 bg-emerald-100 text-emerald-800">Hoạt động</Badge>
                        ) : (
                          <Badge className="border-0 bg-red-100 text-red-700">Vô hiệu hóa</Badge>
                        )
                      }
                    />
                    <MetaRow
                      icon={Lock}
                      label="Khóa đăng nhập"
                      value={
                        detail.lockedAt ? (
                          <span className="text-amber-800">Đến {formatDateTime(detail.lockedAt)}</span>
                        ) : (
                          <span className="text-slate-600">Không</span>
                        )
                      }
                    />
                  </MetaPanel>
                </Section>

                <Section icon={MonitorSmartphone} title="Thiết bị đăng nhập">
                  {sortedDevices.length > 0 ? (
                    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
                      {sortedDevices.map((d, index) => (
                        <DeviceRow
                          key={d.userDeviceId}
                          device={d}
                          isLast={index === sortedDevices.length - 1}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">Chưa có bản ghi thiết bị từ máy chủ.</p>
                  )}
                </Section>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}

function DeviceRow({ device, isLast }: { device: UserDevice; isLast: boolean }) {
  const short = shortenAgent(device.deviceName);
  return (
    <div
      className={cn(
        'flex gap-3 px-4 py-3.5 sm:gap-4',
        !isLast && 'border-b border-slate-100',
      )}
    >
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
        <Laptop className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-[#2197C0]/10 px-2 py-0.5 text-xs font-semibold text-[#1a7a99]">
            {platformLabel(device.platform)}
          </span>
          {device.isActive ? (
            <Badge className="border-0 bg-emerald-50 text-emerald-800">Phiên hoạt động</Badge>
          ) : (
            <Badge className="border-0 bg-slate-100 text-slate-600">Không hoạt động</Badge>
          )}
        </div>
        <p className="break-words text-xs leading-relaxed text-slate-700" title={device.deviceName}>
          {short}
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          <span>
            <span className="font-medium text-slate-600">Lần cuối: </span>
            {formatDateTime(device.lastSeenAt)}
          </span>
          <span>
            <span className="font-medium text-slate-600">Tạo: </span>
            {formatDateTime(device.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

function HeaderChip({
  icon: Icon,
  label,
  title,
}: {
  icon: LucideIcon;
  label: string;
  title: string;
}) {
  return (
    <span
      title={title}
      className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-white/90 px-2.5 py-1 text-xs text-slate-700 shadow-sm ring-1 ring-slate-200/80"
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-[#2197C0]" aria-hidden />
      <span className="min-w-0 truncate font-medium">{label}</span>
    </span>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2.5">
        <Icon className="h-5 w-5 shrink-0 text-[#2197C0]" strokeWidth={2} aria-hidden />
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      <div>{children}</div>
    </section>
  );
}

/** Khối nền trắng bo góc: list = chia dòng; grid = nhiều cột trong cùng khung viền */
function MetaPanel({
  children,
  layout = 'list',
}: {
  children: ReactNode;
  layout?: 'list' | 'grid';
}) {
  if (layout === 'grid') {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 p-4 sm:grid-cols-2 sm:px-5 sm:py-4">
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="divide-y divide-slate-100 px-4">{children}</div>
    </div>
  );
}

function MetaRow({
  icon: Icon,
  label,
  value,
  variant = 'list',
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  variant?: 'list' | 'grid';
}) {
  return (
    <div className={cn('flex gap-3', variant === 'list' && 'py-3.5')}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#2197C0]/90" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-slate-500">{label}</div>
        <div className="mt-0.5 break-words text-sm font-medium text-slate-900">{value}</div>
      </div>
    </div>
  );
}
