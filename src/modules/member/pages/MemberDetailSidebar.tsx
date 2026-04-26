import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';import {
  BarChart3,
  Building2,
  Shield,
  Sparkles,
  UserCircle,
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
          'border-l border-slate-200 bg-white shadow-2xl',
          'translate-x-0 transition-transform duration-300 ease-out',
        )}
      >
        <div className="flex h-full w-full min-w-0 flex-col overflow-hidden">
          <header className="w-full shrink-0 border-b border-slate-200 bg-white">
            <div className="flex w-full items-start justify-between gap-3 px-5 pb-3 pt-4">
              <div className="flex min-w-0 flex-1 gap-4">
                <img
                  src={member.avatarUrl?.trim() || '/img/ava.png'}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-lg font-semibold tracking-tight text-black">
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
                  <p className="truncate text-sm text-[#2197C0]">{dash(member.email)}</p>
                  <div className="flex w-full flex-wrap gap-2">
                    {team?.teamName ? (
                      <HeaderChip
                        icon={Building2}
                        label={team.teamName}
                        title="Nhóm"
                        iconClassName="text-[#2197C0]"
                      />
                    ) : null}
                    <span
                      title="Vai trò"
                      className={cn(
                        'inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-xs font-medium',
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
                className="shrink-0 p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex w-full flex-col divide-y divide-slate-200 border-t border-slate-200 bg-white sm:flex-row sm:divide-x sm:divide-y-0">
              <div className="min-w-0 flex-1 px-5 py-2">
                <HeaderStat label="Vai trò" value={roleLabel} layout="strip" />
              </div>
              <div className="min-w-0 flex-1 px-5 py-2">
                <HeaderStat label="Ngày tham gia" value={formatDateOnly(member.createdAt)} layout="strip" />
              </div>
              <div className="min-w-0 flex-1 px-5 py-2">
                <HeaderStat label="Cập nhật lần cuối" value={formatDateTime(member.updatedAt)} layout="strip" />
              </div>
            </div>
          </header>

          <div className="relative min-h-0 w-full flex-1 overflow-y-auto bg-white px-5 py-4">
            <div className="w-full max-w-none space-y-4">
              <Section icon={Shield} title="Thông tin tài khoản">
                <MetaPanel layout="grid">
                  <MetaRow label="Email" value={dash(member.email)} />
                  <MetaRow label="Vai trò" value={hasRole ? roleLabel : '—'} />
                  <MetaRow
                    label="Trạng thái"
                    value={
                      member.isActive ? (
                        <Badge className="border-0 bg-emerald-100 text-emerald-800">Hoạt động</Badge>
                      ) : (
                        <Badge className="border-0 bg-rose-100 text-rose-800">Đã khóa</Badge>
                      )
                    }
                  />
                  <MetaRow label="Ngày tạo tài khoản" value={formatDateTime(member.userCreatedAt)} />
                  <MetaRow label="Cập nhật tài khoản" value={formatDateTime(member.userUpdatedAt)} />
                </MetaPanel>
              </Section>

              <Section icon={UserCircle} title="Thông tin cá nhân">
                <MetaPanel layout="grid">
                  <MetaRow label="Họ và tên" value={dash(member.fullName)} />
                  <MetaRow label="Số điện thoại" value={dash(member.phone)} />
                  <MetaRow label="Địa chỉ" value={dash(member.address)} className="sm:col-span-2" />
                  <MetaRow label="CCCD" value={dash(member.cin)} />
                  <MetaRow label="Mã số thuế" value={dash(member.taxNumber)} />
                  <MetaRow label="Số tài khoản" value={dash(member.bankCode)} />
                  <MetaRow label="Tên ngân hàng" value={dash(member.bankName)} />
                </MetaPanel>
              </Section>

              <Section icon={Building2} title="Nhóm">
                {team ? (
                  <MetaPanel layout="grid">
                    <MetaRow label="Tên nhóm" value={dash(team.teamName)} />
                    <MetaRow label="Trưởng nhóm" value={dash(team.leaderMemberName)} />
                    <MetaRow label="Số thành viên" value={team.totalMembers != null ? String(team.totalMembers) : '—'} />
                    <MetaRow label="Nhóm tạo lúc" value={formatDateTime(team.createdAt)} />
                    <MetaRow label="Nhóm cập nhật" value={formatDateTime(team.updatedAt)} />
                    <MetaRow label="Buổi nhóm" value={String(Array.isArray(team.teamSessions) ? team.teamSessions.length : 0)} />
                    <MetaRow label="Đề tài nhóm" value={String(Array.isArray(team.teamTopics) ? team.teamTopics.length : 0)} />
                  </MetaPanel>
                ) : (
                  <div className="pl-4 py-2">
                    <p className="text-sm text-slate-500">Chưa gắn nhóm.</p>
                  </div>
                )}
              </Section>

              <Section icon={Sparkles} title="Kỹ năng">
                <div className="pl-4 py-2">
                  <p className="mb-2 text-xs font-medium text-[#2197C0]">Các kỹ năng đã gắn</p>
                  {displaySkillNames.length === 0 ? (
                    <p className="text-sm text-slate-500">Chưa có kỹ năng nào.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {displaySkillNames.map((name, i) => (
                        <Badge
                          key={name}
                          className={cn(
                            'rounded-full border-0 font-medium',
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

              <Section icon={BarChart3} title="Khối lượng công việc">
                <div className="bg-white pl-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 py-2">
                    <p className="text-xs font-medium text-[#2197C0]">Thống kê theo khoảng thời gian</p>
                    <Select
                      value={workloadRange}
                      onValueChange={(v) =>
                        setWorkloadRange(v as NonNullable<DashboardRangeParams['range']>)
                      }
                      disabled={!member.memberId}
                    >
                      <SelectTrigger
                        className={cn(
                          'h-9 w-[min(100%,228px)] shrink-0 border-slate-200 bg-white px-3 text-sm font-medium text-slate-700',
                          'hover:bg-slate-50 focus:ring-2 focus:ring-slate-300/50',
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
                    <p className="px-4 py-4 text-sm text-slate-500">
                      Không có mã thành viên để tải workload.
                    </p>
                  ) : !workload ? (
                    <p className="px-4 py-4 text-sm text-slate-500">Đang tải…</p>
                  ) : (
                    <div className="flex flex-col divide-y divide-slate-200 sm:flex-row sm:divide-x sm:divide-y-0">
                      <WorkloadMetricCell label="Tổng giờ giảng" value={`${Number(workload.totalTeachingHours ?? 0).toFixed(1)}h`} changePercent={workload.totalTeachingHoursChangePercent ?? 0} deltaClass="text-sky-600" />
                      <WorkloadMetricCell label="Buổi hoàn thành" value={Number(workload.completedSessions ?? 0)} changePercent={workload.completedSessionsChangePercent ?? 0} deltaClass="text-emerald-600" />
                      <WorkloadMetricCell label="Buổi bị hủy" value={Number(workload.canceledSessions ?? 0)} changePercent={workload.canceledSessionsChangePercent ?? 0} deltaClass="text-rose-600" />
                      <WorkloadMetricCell label="Thu nhập ước tính" value={`${Number(workload.estimatedIncome ?? 0).toLocaleString('vi-VN')} đ`} changePercent={workload.estimatedIncomeChangePercent ?? 0} deltaClass="text-amber-700" />
                    </div>
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



function HeaderStat({
  label,
  value,
  layout = 'inline',
}: {
  label: string;
  value: string;
  layout?: 'inline' | 'strip';
}) {
  if (layout === 'strip') {
    return (
      <div className="w-full min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#2197C0]">{label}</p>
        <p className="mt-1 break-words text-sm font-medium leading-snug text-black" title={value}>
          {value}
        </p>
      </div>
    );
  }
  return (
    <div className="min-w-0 py-0.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#2197C0]">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium text-black" title={value}>
        {value}
      </p>
    </div>
  );
}

function HeaderChip({
  icon: Icon,
  label,
  title,
  iconClassName = 'text-[#2197C0]',
}: {
  icon: LucideIcon;
  label: string;
  title: string;
  iconClassName?: string;
}) {
  return (
    <span
      title={title}
      className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
    >
      <Icon className={cn('h-3.5 w-3.5 shrink-0', iconClassName)} aria-hidden />
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
    <section className="space-y-2">
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
        <Icon className="h-4 w-4 shrink-0 text-[#2197C0]" strokeWidth={2} aria-hidden />
        <h3 className="text-sm font-semibold text-black">{title}</h3>
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
      <div className="bg-white pl-4">
        <div className="grid grid-cols-1 divide-y divide-slate-200 sm:grid-cols-2 sm:divide-y-0">
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className="bg-white pl-4">
      <div className="divide-y divide-slate-200">{children}</div>
    </div>
  );
}

function MetaRow({
  label,
  value,
  valueClassName,
  className,
}: {
  icon?: LucideIcon;
  label: string;
  value: ReactNode;
  variant?: 'list' | 'grid';
  valueClassName?: string;
  className?: string;
}) {
  return (
    <div className={cn('py-1.5', className)}>
      <div className="text-xs font-medium text-[#2197C0]">{label}</div>
      <div className={cn('mt-0.5 break-words text-sm text-black', valueClassName)}>{value}</div>
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
    <div className="min-w-0 flex-1 px-3 py-2">
      <p className="text-[11px] font-medium text-[#2197C0]">{label}</p>
      <p className="mt-0.5 truncate text-lg font-semibold tabular-nums text-black">{value}</p>
      <p className={cn('mt-0.5 text-[11px] font-medium tabular-nums', deltaClass)}>{pct}</p>
    </div>
  );
}
