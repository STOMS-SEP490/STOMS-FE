import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Building2,
  CalendarClock,
  CreditCard,
  Hash,
  ListChecks,
  Mail,
  MapPin,
  Phone,
  Shield,
  Sparkles,
  UserCircle,
  Users,
  X,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { MemberDetail } from '@/modules/member/member';
import { getRoleLabel, getRoleBadgeClass } from '@/constants/role';
import { Badge } from '@/shared/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { cn } from '@/shared/lib/utils';
import memberSkillApi from '@/modules/member/api/memberSkillApi';
import skillApi from '@/modules/skill/api/skillApi';
import type { SkillListItem } from '@/modules/skill/skill';
import type { PaginationResponse } from '@/shared/types/api';
import { dashboardApi, type DashboardRangeParams } from '@/modules/dashboard/api/dashboardApi';

type Props = {
  open: boolean;
  onClose: () => void;
  member: MemberDetail | null;
};

function formatDateTime(date?: string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleString('vi-VN');
}

function formatDateOnly(date?: string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('vi-VN');
}

function dash(v: unknown): ReactNode {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'string' && !v.trim()) return '—';
  return v as ReactNode;
}

export default function MemberDetailSidebar({ open, onClose, member }: Props) {
  const [skillNamesFallback, setSkillNamesFallback] = useState<string[]>([]);
  const [workloadRange, setWorkloadRange] =
    useState<NonNullable<DashboardRangeParams['range']>>('thismonth');

  const skillsFromMember = useMemo(() => {
    const list = member?.skills ?? [];
    return list.filter((s) => s.isActive !== false).map((s) => s.skillName);
  }, [member?.skills]);

  useEffect(() => {
    if (!open || !member?.memberId) {
      setSkillNamesFallback([]);
      return;
    }
    if (skillsFromMember.length > 0) {
      setSkillNamesFallback([]);
      return;
    }
    let cancelled = false;
    Promise.all([memberSkillApi.getByMember(member.memberId), skillApi.getSkills({ pageSize: 500 })])
      .then(([memberSkills, skillsRes]) => {
        if (cancelled) return;
        const allSkills = (skillsRes as PaginationResponse<SkillListItem>).items ?? [];
        const activeOnly = memberSkills.filter((s) => s.isActive !== false);
        const ids = new Set(activeOnly.map((s) => s.skillId));
        const names = allSkills.filter((s) => ids.has(s.skillId)).map((s) => s.skillName);
        setSkillNamesFallback(names);
      })
      .catch(() => setSkillNamesFallback([]));
    return () => {
      cancelled = true;
    };
  }, [open, member?.memberId, skillsFromMember.length]);

  const displaySkillNames = skillsFromMember.length > 0 ? skillsFromMember : skillNamesFallback;

  const { data: workload } = useQuery({
    queryKey: ['dashboard', 'member-workload', member?.memberId ?? 0, workloadRange],
    queryFn: () => dashboardApi.getUserWorkload(member?.memberId ?? 0, { range: workloadRange }),
    enabled: Boolean(open && member?.memberId),
  });

  if (!open || !member) return null;

  const hasRole = member.roleId != null;
  const roleLabel = hasRole ? getRoleLabel(member.roleId) : '—';
  const team = member.team;

  return (
    <>
      <div className="fixed inset-0 z-40 h-full bg-black/35" onClick={onClose} aria-hidden />

      <div
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-[720px] max-w-[96vw]',
          'border-l border-slate-200/80 bg-white shadow-2xl',
          'translate-x-0 transition-transform duration-300 ease-out',
        )}
      >
        <div className="flex h-full w-full min-w-0 flex-col overflow-hidden">
          <header className="w-full shrink-0 bg-gradient-to-b from-slate-50/90 to-white">
            <div className="flex w-full items-start justify-between gap-3 px-5 pb-3 pt-5">
              <div className="flex min-w-0 flex-1 gap-4">
                <img
                  src={member.avatarUrl?.trim() || '/img/ava.png'}
                  alt=""
                  className="h-[72px] w-[72px] shrink-0 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-lg font-semibold tracking-tight text-slate-900">
                      {dash(member.fullName)}
                    </h2>
                    <Badge
                      className={cn(
                        'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium',
                        member.isActive
                          ? 'border-0 bg-emerald-100 text-emerald-800'
                          : 'border-0 bg-rose-100 text-rose-800',
                      )}
                    >
                      {member.isActive ? 'Hoạt động' : 'Đã khóa'}
                    </Badge>
                  </div>
                  <p className="truncate text-sm text-slate-500">{dash(member.email)}</p>
                  <div className="flex w-full flex-wrap gap-2">
                    {team?.teamName ? (
                      <HeaderChip
                        icon={Building2}
                        label={team.teamName}
                        title="Nhóm"
                        iconClassName="text-emerald-600"
                      />
                    ) : null}
                    <span
                      title="Vai trò"
                      className={cn(
                        'inline-flex max-w-full items-center rounded-lg px-2.5 py-1 text-xs font-medium',
                        hasRole ? getRoleBadgeClass(member.roleId) : 'bg-slate-100 text-slate-600',
                      )}
                    >
                      {roleLabel}
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
            <div className="flex w-full flex-col divide-y divide-slate-200/60 bg-slate-50/50 sm:flex-row sm:divide-x sm:divide-y-0">
              <div className="min-w-0 flex-1 px-4 py-3 sm:px-5">
                <HeaderStat label="Vai trò" value={roleLabel} accent="violet" layout="strip" />
              </div>
              <div className="min-w-0 flex-1 px-4 py-3 sm:px-5">
                <HeaderStat label="Ngày tham gia" value={formatDateOnly(member.createdAt)} accent="emerald" layout="strip" />
              </div>
              <div className="min-w-0 flex-1 px-4 py-3 sm:px-5">
                <HeaderStat
                  label="Cập nhật lần cuối"
                  value={formatDateTime(member.updatedAt)}
                  accent="amber"
                  layout="strip"
                />
              </div>
            </div>
          </header>

          <div className="relative min-h-0 w-full flex-1 overflow-y-auto bg-slate-50/70 px-5 py-5">
            <div className="w-full max-w-none space-y-8">
              <Section icon={Shield} title="Thông tin tài khoản" accent="sky">
                <MetaPanel layout="grid">
                  <MetaRow variant="grid" icon={Mail} label="Email" value={dash(member.email)} iconClassName="text-sky-600" />
                  <MetaRow
                    variant="grid"
                    icon={UserCircle}
                    label="Vai trò"
                    value={hasRole ? roleLabel : '—'}
                    iconClassName="text-sky-600"
                  />
                  <MetaRow
                    variant="grid"
                    icon={Shield}
                    label="Trạng thái"
                    value={
                      member.isActive ? (
                        <Badge className="border-0 bg-emerald-100 text-emerald-800">Hoạt động</Badge>
                      ) : (
                        <Badge className="border-0 bg-rose-100 text-rose-800">Đã khóa</Badge>
                      )
                    }
                    iconClassName="text-sky-600"
                  />
                  <MetaRow
                    variant="grid"
                    icon={CalendarClock}
                    label="Ngày tạo tài khoản"
                    value={formatDateTime(member.userCreatedAt)}
                    iconClassName="text-sky-600"
                  />
                  <MetaRow
                    variant="grid"
                    icon={CalendarClock}
                    label="Cập nhật tài khoản"
                    value={formatDateTime(member.userUpdatedAt)}
                    iconClassName="text-sky-600"
                  />
                  
                </MetaPanel>
              </Section>

              <Section icon={UserCircle} title="Thông tin cá nhân" accent="emerald">
                <MetaPanel layout="grid">
                  <MetaRow variant="grid" icon={UserCircle} label="Họ và tên" value={dash(member.fullName)} iconClassName="text-emerald-600" />
                  <MetaRow variant="grid" icon={Phone} label="Số điện thoại" value={dash(member.phone)} iconClassName="text-emerald-600" />
                  <MetaRow
                    variant="grid"
                    icon={MapPin}
                    label="Địa chỉ"
                    value={dash(member.address)}
                    iconClassName="text-emerald-600"
                    className="sm:col-span-2"
                  />
                  <MetaRow variant="grid" icon={Hash} label="CMND/CCCD" value={dash(member.cin)} iconClassName="text-emerald-600" />
                  <MetaRow variant="grid" icon={Hash} label="Mã số thuế" value={dash(member.taxNumber)} iconClassName="text-emerald-600" />
                  <MetaRow variant="grid" icon={CreditCard} label="Mã ngân hàng" value={dash(member.bankCode)} iconClassName="text-emerald-600" />
                  <MetaRow variant="grid" icon={CreditCard} label="Tên ngân hàng" value={dash(member.bankName)} iconClassName="text-emerald-600" />
                </MetaPanel>
              </Section>

              <Section icon={Building2} title="Nhóm" accent="violet">
                {team ? (
                  <MetaPanel layout="grid">
                    <MetaRow variant="grid" icon={Building2} label="Tên nhóm" value={dash(team.teamName)} iconClassName="text-violet-600" />
                    <MetaRow variant="grid" icon={UserCircle} label="Trưởng nhóm" value={dash(team.leaderMemberName)} iconClassName="text-violet-600" />
                    <MetaRow
                      variant="grid"
                      icon={Users}
                      label="Số thành viên nhóm"
                      value={team.totalMembers != null ? String(team.totalMembers) : '—'}
                      iconClassName="text-violet-600"
                    />
                    <MetaRow variant="grid" icon={CalendarClock} label="Nhóm tạo lúc" value={formatDateTime(team.createdAt)} iconClassName="text-violet-600" />
                    <MetaRow variant="grid" icon={CalendarClock} label="Nhóm cập nhật" value={formatDateTime(team.updatedAt)} iconClassName="text-violet-600" />
                    <MetaRow
                      variant="grid"
                      icon={ListChecks}
                      label="Phiên nhóm (teamSessions)"
                      value={String(Array.isArray(team.teamSessions) ? team.teamSessions.length : 0)}
                      iconClassName="text-violet-600"
                    />
                    <MetaRow
                      variant="grid"
                      icon={ListChecks}
                      label="Đề tài nhóm (teamTopics)"
                      value={String(Array.isArray(team.teamTopics) ? team.teamTopics.length : 0)}
                      iconClassName="text-violet-600"
                    />
                  </MetaPanel>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:px-5 sm:py-4">
                    <p className="text-sm text-slate-500">Chưa gắn nhóm.</p>
                  </div>
                )}
              </Section>

              <Section icon={Sparkles} title="Kỹ năng" accent="fuchsia">
                <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
                  <p className="mb-2 text-xs font-medium text-fuchsia-900/70">Các kỹ năng đã gắn</p>
                  {displaySkillNames.length === 0 ? (
                    <p className="text-sm text-slate-500">Chưa có kỹ năng nào.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {displaySkillNames.map((name, i) => (
                        <Badge
                          key={name}
                          className={cn(
                            'border-0 font-medium',
                            i % 2 === 0
                              ? 'bg-teal-50 text-teal-800'
                              : 'bg-violet-50 text-violet-800',
                          )}
                        >
                          {name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </Section>

              <Section icon={BarChart3} title="Khối lượng công việc" accent="orange">
                <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-2 pt-3 sm:px-4 sm:pb-3 sm:pt-4">
                    <p className="text-xs text-slate-600">Thống kê theo khoảng thời gian</p>
                    <Select
                      value={workloadRange}
                      onValueChange={(v) =>
                        setWorkloadRange(v as NonNullable<DashboardRangeParams['range']>)
                      }
                      disabled={!member.memberId}
                    >
                      <SelectTrigger
                        className={cn(
                          'h-9 w-[min(100%,228px)] shrink-0 border-slate-200/90 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm',
                          'hover:bg-slate-50/90 focus:ring-2 focus:ring-slate-300/50',
                        )}
                      >
                        <SelectValue placeholder="Chọn khoảng thời gian" />
                      </SelectTrigger>
                      <SelectContent align="end" position="popper" className="z-[60]">
                        <SelectItem value="today">Hôm nay</SelectItem>
                        <SelectItem value="thisweek">Tuần này</SelectItem>
                        <SelectItem value="thismonth">Tháng này</SelectItem>
                        <SelectItem value="last3months">3 tháng gần đây</SelectItem>
                        <SelectItem value="last6months">6 tháng gần đây</SelectItem>
                        <SelectItem value="1year">1 năm gần đây</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {!member.memberId ? (
                    <p className="px-3 pb-4 pt-1 text-sm text-slate-500 sm:px-4">
                      Không có mã thành viên để tải workload.
                    </p>
                  ) : !workload ? (
                    <p className="px-3 pb-4 pt-1 text-sm text-slate-500 sm:px-4">Đang tải…</p>
                  ) : (
                    <>
                      
                        <div className="flex flex-col divide-y divide-slate-200/70 border-t border-slate-200/70 sm:flex-row sm:divide-x sm:divide-y-0">
                          <WorkloadMetricCell
                            label="Tổng giờ giảng"
                            value={`${Number(workload.totalTeachingHours ?? 0).toFixed(1)}h`}
                            changePercent={workload.totalTeachingHoursChangePercent ?? 0}
                            deltaClass="text-sky-600"
                          />
                          <WorkloadMetricCell
                            label="Phiên hoàn thành"
                            value={Number(workload.completedSessions ?? 0)}
                            changePercent={workload.completedSessionsChangePercent ?? 0}
                            deltaClass="text-emerald-600"
                          />
                          <WorkloadMetricCell
                            label="Phiên bị hủy"
                            value={Number(workload.canceledSessions ?? 0)}
                            changePercent={workload.canceledSessionsChangePercent ?? 0}
                            deltaClass="text-rose-600"
                          />
                          <WorkloadMetricCell
                            label="Thu nhập ước tính"
                            value={Number(workload.estimatedIncome ?? 0).toLocaleString('vi-VN', {
                              style: 'currency',
                              currency: 'VND',
                              maximumFractionDigits: 0,
                            })}
                            changePercent={workload.estimatedIncomeChangePercent ?? 0}
                            deltaClass="text-amber-700"
                          />
                        </div>
                      
                    </>
                  )}
                </div>
              </Section>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

type AccentKey = 'sky' | 'violet' | 'emerald' | 'amber' | 'fuchsia' | 'orange';

const HEADER_STAT_ACCENT: Record<
  AccentKey,
  { bar: string; labelTint: string }
> = {
  sky: { bar: 'border-l-sky-400', labelTint: 'text-sky-700/80' },
  violet: { bar: 'border-l-violet-400', labelTint: 'text-violet-800/80' },
  emerald: { bar: 'border-l-emerald-400', labelTint: 'text-emerald-800/80' },
  amber: { bar: 'border-l-amber-400', labelTint: 'text-amber-900/75' },
  fuchsia: { bar: 'border-l-fuchsia-400', labelTint: 'text-fuchsia-900/75' },
  orange: { bar: 'border-l-orange-400', labelTint: 'text-orange-900/75' },
};

const SECTION_ICON_ACCENT: Record<AccentKey, string> = {
  sky: 'text-sky-600',
  violet: 'text-violet-600',
  emerald: 'text-emerald-600',
  amber: 'text-amber-600',
  fuchsia: 'text-fuchsia-600',
  orange: 'text-orange-600',
};

function HeaderStat({
  label,
  value,
  accent,
  layout = 'inline',
}: {
  label: string;
  value: string;
  accent: AccentKey;
  /** `strip` = dùng trong thanh full-width, không vạch trái từng ô. */
  layout?: 'inline' | 'strip';
}) {
  const a = HEADER_STAT_ACCENT[accent];
  if (layout === 'strip') {
    return (
      <div className="w-full min-w-0">
        <p className={cn('text-[10px] font-semibold uppercase tracking-wide', a.labelTint)}>{label}</p>
        <p className="mt-1 break-words text-sm font-medium leading-snug text-slate-900" title={value}>
          {value}
        </p>
      </div>
    );
  }
  return (
    <div className={cn('min-w-0 border-l-2 py-0.5 pl-3', a.bar)}>
      <p className={cn('text-[10px] font-semibold uppercase tracking-wide', a.labelTint)}>{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium text-slate-900" title={value}>
        {value}
      </p>
    </div>
  );
}

function HeaderChip({
  icon: Icon,
  label,
  title,
  iconClassName = 'text-sky-600',
}: {
  icon: LucideIcon;
  label: string;
  title: string;
  iconClassName?: string;
}) {
  return (
    <span
      title={title}
      className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-slate-100/80 px-2.5 py-1 text-xs text-slate-700"
    >
      <Icon className={cn('h-3.5 w-3.5 shrink-0', iconClassName)} aria-hidden />
      <span className="min-w-0 truncate font-medium">{label}</span>
    </span>
  );
}

function Section({
  icon: Icon,
  title,
  accent = 'sky',
  children,
}: {
  icon: LucideIcon;
  title: string;
  accent?: AccentKey;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2.5">
        <Icon className={cn('h-5 w-5 shrink-0', SECTION_ICON_ACCENT[accent])} strokeWidth={2} aria-hidden />
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="w-full">{children}</div>
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
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 p-4 sm:grid-cols-2 sm:px-5 sm:py-4">{children}</div>
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
  iconClassName = 'text-slate-500',
  valueClassName,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  variant?: 'list' | 'grid';
  iconClassName?: string;
  valueClassName?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex gap-3', variant === 'list' && 'py-3.5', className)}>
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', iconClassName)} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-slate-500">{label}</div>
        <div className={cn('mt-0.5 break-words text-sm font-medium text-slate-900', valueClassName)}>{value}</div>
      </div>
    </div>
  );
}

function WorkloadMetricCell({
  label,
  value,
  changePercent,
  deltaClass,
}: {
  label: string;
  value: ReactNode;
  changePercent: number;
  deltaClass: string;
}) {
  const v = Number(changePercent ?? 0);
  const sign = v > 0 ? '+' : '';
  const pct = `${sign}${v.toFixed(1)}%`;
  return (
    <div className="min-w-0 flex-1 px-3 py-3 sm:px-4">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className="mt-1 truncate text-xl font-semibold tabular-nums text-slate-900">{value}</p>
      <p className={cn('mt-1.5 text-[11px] font-medium tabular-nums', deltaClass)}>{pct}</p>
    </div>
  );
}
