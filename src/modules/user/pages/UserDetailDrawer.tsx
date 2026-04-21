import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Skeleton, message } from 'antd';
import {
  CalendarClock,
  Laptop,
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
      .then((res) => { if (!cancelled) setDetail(res); })
      .catch((err) => {
        if (!cancelled) {
          message.error(getErrorMessage(err) || 'Không tải được chi tiết tài khoản');
          setDetail(null);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, userId]);

  const sortedDevices = useMemo(() => {
    const list = detail?.userDevices ?? [];
    return [...list].sort(
      (a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime(),
    );
  }, [detail?.userDevices]);


  if (!open) return null;

  const roleId = detail?.roleId ?? 0;
  const roleName = getRoleLabel(roleId);

  return (
    <>
      <div className="fixed inset-0 z-40 h-full bg-black/35" onClick={onClose} aria-hidden />

      <div
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-[720px] max-w-[96vw]',
          'border-l border-slate-200 bg-white shadow-2xl',
          'translate-x-0 transition-transform duration-300 ease-out',
        )}
      >
        <div className="flex h-full w-full min-w-0 flex-col overflow-hidden">
          {/* ── HEADER ── */}
          <header className="w-full shrink-0 border-b border-slate-200 bg-white">
            {loading && !detail ? (
              <div className="flex gap-4 px-5 py-4 pr-10">
                <Skeleton.Avatar active size={56} shape="circle" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton active title={{ width: '55%' }} paragraph={{ rows: 1 }} />
                </div>
              </div>
            ) : detail ? (
              <>
                <div className="flex w-full items-start justify-between gap-3 px-5 pb-3 pt-4">
                  <div className="flex min-w-0 flex-1 gap-4">
                    <img
                      src={detail.avatarUrl?.trim() || '/img/ava.png'}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-full object-cover"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-base font-semibold text-black">
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
                        <span
                          title="Vai trò"
                          className={cn(
                            'inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-xs font-medium',
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
                    className="shrink-0 p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Đóng"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex w-full flex-col divide-y divide-slate-200 border-t border-slate-200 bg-white sm:flex-row sm:divide-x sm:divide-y-0">
                  <div className="min-w-0 flex-1 px-5 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#2197C0]">Vai trò</p>
                    <p className="mt-0.5 text-sm font-medium text-black">{roleName}</p>
                  </div>
                  <div className="min-w-0 flex-1 px-5 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#2197C0]">Ngày tạo</p>
                    <p className="mt-0.5 text-sm font-medium text-black">{formatDateTime(detail.createdAt)}</p>
                  </div>
                  <div className="min-w-0 flex-1 px-5 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#2197C0]">Cập nhật lần cuối</p>
                    <p className="mt-0.5 break-words text-sm font-medium text-black">{formatDateTime(detail.updatedAt)}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-start justify-between gap-3 px-5 py-4">
                <p className="text-sm text-slate-500">Không có dữ liệu.</p>
                <button type="button" onClick={onClose} className="shrink-0 p-2 text-slate-400 hover:bg-slate-100">
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
          </header>

          {/* ── BODY ── */}
          <div className="relative min-h-0 w-full flex-1 overflow-y-auto bg-white px-5 py-4">
            {loading && detail && (
              <div className="pointer-events-none absolute inset-0 z-10 bg-white/45" aria-hidden />
            )}

            {loading && !detail ? (
              <div className="space-y-4">
                <Skeleton active paragraph={{ rows: 4 }} />
                <Skeleton active paragraph={{ rows: 6 }} />
              </div>
            ) : detail ? (
              <div className="space-y-4">
                <Section icon={CalendarClock} title="Thông tin chung">
                  <MetaPanel layout="grid">
                    <MetaRow label="Ngày tạo" value={formatDateTime(detail.createdAt)} />
                    <MetaRow label="Cập nhật lần cuối" value={formatDateTime(detail.updatedAt)} />
                  </MetaPanel>
                </Section>

                <Section icon={Shield} title="Bảo mật & trạng thái">
                  <MetaPanel>
                    <MetaRow
                      label="Trạng thái tài khoản"
                      value={
                        detail.isActive ? (
                          <Badge className="border-0 bg-emerald-100 text-emerald-800">Hoạt động</Badge>
                        ) : (
                          <Badge className="border-0 bg-red-100 text-red-700">Vô hiệu hóa</Badge>
                        )
                      }
                    />
                  </MetaPanel>
                </Section>

                <Section icon={MonitorSmartphone} title="Thiết bị đăng nhập">
                  {sortedDevices.length > 0 ? (
                    <div className="pl-4 divide-y divide-slate-200">
                      {sortedDevices.map((d) => (
                        <DeviceRow key={d.userDeviceId} device={d} />
                      ))}
                    </div>
                  ) : (
                    <div className="pl-4 py-2">
                      <p className="text-sm text-slate-500">Chưa có bản ghi thiết bị từ máy chủ.</p>
                    </div>
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

function DeviceRow({ device }: { device: UserDevice }) {
  const short = shortenAgent(device.deviceName);
  return (
    <div className="py-2.5">
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <Laptop className="h-3.5 w-3.5 text-[#2197C0]" aria-hidden />
        <span className="rounded bg-[#2197C0]/10 px-1.5 py-0.5 text-xs font-semibold text-[#2197C0]">
          {platformLabel(device.platform)}
        </span>
        {device.isActive ? (
          <Badge className="border-0 bg-emerald-50 text-emerald-800">Đang hoạt động</Badge>
        ) : (
          <Badge className="border-0 bg-slate-100 text-slate-600">Không hoạt động</Badge>
        )}
      </div>
      <p className="break-words text-xs text-slate-700 mb-1" title={device.deviceName}>{short}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
        <span><span className="text-[#2197C0]">Lần cuối: </span>{formatDateTime(device.lastSeenAt)}</span>
        <span><span className="text-[#2197C0]">Tạo: </span>{formatDateTime(device.createdAt)}</span>
      </div>
    </div>
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
    <section className="space-y-2">
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
        <Icon className="h-4 w-4 shrink-0 text-[#2197C0]" strokeWidth={2} aria-hidden />
        <h3 className="text-sm font-semibold text-black">{title}</h3>
      </div>
      <div>{children}</div>
    </section>
  );
}

function MetaPanel({
  children,
  layout = 'list',
}: {
  children: ReactNode;
  layout?: 'list' | 'grid';
}) {
  if (layout === 'grid') {
    return (
      <div className="pl-4">
        <div className="grid grid-cols-1 divide-y divide-slate-200 sm:grid-cols-2 sm:divide-y-0">
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className="pl-4">
      <div className="divide-y divide-slate-200">{children}</div>
    </div>
  );
}

function MetaRow({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('py-1.5', className)}>
      <div className="text-xs font-medium text-[#2197C0]">{label}</div>
      <div className="mt-0.5 break-words text-sm text-black">{value}</div>
    </div>
  );
}
