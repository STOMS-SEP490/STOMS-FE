import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Spin } from 'antd';
import { X, BarChart3, Sparkles, UserCircle, Building2 } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { DataTable } from '@/shared/components/common/DataTable';
import { getRoleLabel, getRoleBadgeClass } from '@/constants/role';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { useMyTeam } from '../hooks/useMyTeam';
import type { MemberSkillItem, TeamMemberItem, TeamTopicItem } from '../team';
import { dashboardApi } from '@/modules/dashboard/api/dashboardApi';

function roleBadge(roleId: number | null | undefined) {
  return (
    <Badge className={`${getRoleBadgeClass(roleId)} text-[10px] px-1.5 py-0 leading-normal border`}>
      {getRoleLabel(roleId)}
    </Badge>
  );
}

function formatTopicBadge(t: TeamTopicItem) {
  const active = t.isActive !== false;
  return (
    <Badge
      key={t.topicId}
      className={
        active
          ? 'bg-amber-50 text-amber-900 border border-amber-200 text-xs shrink-0'
          : 'bg-slate-100 text-slate-500 border border-slate-200 text-xs shrink-0 line-through opacity-80'
      }
    >
      {t.topicName}
    </Badge>
  );
}

export default function MyTeamPage() {
  const { data: teamDetail, loading, error, refetch } = useMyTeam();

  const [pageNumber, setPageNumber] = useState(1);
  const pageSize = 10;

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMemberItem | null>(null);

  const pagedMembers = useMemo(() => {
    if (!teamDetail?.members) return [];
    const start = (pageNumber - 1) * pageSize;
    return teamDetail.members.slice(start, start + pageSize);
  }, [teamDetail, pageNumber, pageSize]);

  const handleView = (member: TeamMemberItem) => {
    setSelectedMember(member);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setSelectedMember(null);
  };

  const columns: ColumnDef<TeamMemberItem>[] = [
    {
      id: 'user',
      header: 'Thành viên',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <img
            src={row.original.avatarUrl || '/img/ava.png'}
            alt={row.original.fullName}
            className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200 bg-white"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/img/ava.png';
            }}
          />
          <div className="min-w-0 leading-snug">
            <div className="text-sm font-medium text-[#1a7a99] truncate">{row.original.fullName}</div>
            <div className="text-xs text-slate-500 truncate">{row.original.email}</div>
          </div>
        </div>
      ),
    },
    {
      id: 'role',
      header: 'Vai trò',
      cell: ({ row }) => roleBadge(row.original.roleId),
    },
    {
      accessorKey: 'phone',
      header: 'SĐT',
      cell: ({ row }) => (
        <span className="text-sm text-gray-700">{row.original.phone || '—'}</span>
      ),
    },
    {
      id: 'skillCount',
      header: 'Số kỹ năng',
      cell: ({ row }) => {
        const activeSkills = (row.original.skills ?? []).filter(s => s.isActive);
        return (
          <span className="text-sm text-gray-700 tabular-nums">{activeSkills.length}</span>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div
        className="flex flex-col gap-3 p-6 pl-8 app-page-bg"
        style={{ height: 'var(--content-height, 100vh)' }}
      >
        <div className="shrink-0 flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
          <h2 className="text-xl font-semibold text-[#1a7a99]">Nhóm của tôi</h2>
          <p className="text-xs text-gray-500">Đang tải thông tin nhóm...</p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Spin size="large" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex flex-col gap-3 p-6 pl-8 app-page-bg"
        style={{ height: 'var(--content-height, 100vh)' }}
      >
        <div className="shrink-0 flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
          <h2 className="text-xl font-semibold text-[#1a7a99]">Nhóm của tôi</h2>
          <p className="text-xs text-gray-500">Thông tin nhóm của bạn</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-sm text-red-600">{error}</p>
          <Button type="button" variant="secondary" onClick={() => void refetch()}>
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  if (!teamDetail) {
    return (
      <div
        className="flex flex-col gap-3 p-6 pl-8 app-page-bg"
        style={{ height: 'var(--content-height, 100vh)' }}
      >
        <div className="shrink-0 flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
          <h2 className="text-xl font-semibold text-[#1a7a99]">Nhóm của tôi</h2>
          <p className="text-xs text-gray-500">Thông tin nhóm của bạn</p>
        </div>
        <div className="relative bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex-1 min-h-0 overflow-auto">
          <div className="flex flex-col items-center justify-center h-full py-16">
            <p className="text-sm text-slate-700 font-semibold">Bạn chưa thuộc nhóm nào</p>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed text-center max-w-md">
              Khi được quản lý gán vào nhóm, danh sách thành viên sẽ hiển thị tại đây.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col gap-2 p-6 pl-8 pb-8 app-page-bg">
      <div className="flex shrink-0 flex-col gap-1 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <h2 className="text-xl font-semibold text-[#1a7a99]">{teamDetail.teamName}</h2>
        <p className="text-xs text-gray-500">
          {teamDetail.members.length} thành viên
          {teamDetail.leaderMemberName ? (
            <>
              {' '}
              · Trưởng nhóm:{' '}
              <span className="font-medium text-gray-700">{teamDetail.leaderMemberName}</span>
            </>
          ) : null}
        </p>
      </div>

      <div className="shrink-0 px-2 py-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {(teamDetail.topics ?? []).length > 0 ? (
            (teamDetail.topics ?? []).map((t) => formatTopicBadge(t))
          ) : (
            <span className="text-xs text-gray-400">Chủ đề nhóm sẽ hiển thị tại đây khi được gán.</span>
          )}
        </div>
      </div>

      <div className="relative flex w-full min-w-0 flex-col bg-white rounded-2xl border border-slate-200 shadow-sm p-4 [&_tbody_tr]:min-h-16 [&_tbody_td]:align-middle [&_tbody_tr]:cursor-pointer [&_tbody_tr:hover]:bg-slate-50">
        <DataTable
          columns={columns}
          data={pagedMembers}
          pageNumber={pageNumber}
          pageSize={pageSize}
          totalItems={teamDetail?.members.length ?? 0}
          onPageChange={(page) => setPageNumber(page)}
          onRowClick={(row) => handleView(row)}
          comfortable
        />
      </div>

      <MemberDetailPanel open={detailOpen} onClose={closeDetail} member={selectedMember} />
    </div>
  );
}

function MemberDetailPanel({
  open,
  onClose,
  member,
}: {
  open: boolean;
  onClose: () => void;
  member: TeamMemberItem | null;
}) {
  const [workloadRange, setWorkloadRange] = useState('thismonth');

  const { data: workload } = useQuery({
    queryKey: ['dashboard', 'member-workload', member?.memberId ?? 0, workloadRange],
    queryFn: () => dashboardApi.getUserWorkload(member?.memberId ?? 0, { range: workloadRange as 'thismonth' | 'today' | 'thisweek' | 'last3months' | 'last6months' | '1year' }),
    enabled: Boolean(open && member?.memberId),
  });

  if (!member) return null;

  const roleLabel = getRoleLabel(member.roleId);
  const skills: MemberSkillItem[] = member.skills ?? [];
  const activeSkills = skills.filter(s => s.isActive);

  return (
    <>
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 cursor-default bg-black/35"
          aria-label="Đóng"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 right-0 z-50 flex h-full w-[720px] max-w-[96vw] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
      >
        {/* Header */}
        <header className="w-full shrink-0 border-b border-slate-200 bg-white">
          <div className="flex w-full items-start justify-between gap-3 px-5 pb-3 pt-4">
            <div className="flex min-w-0 flex-1 gap-4">
              <img
                src={member.avatarUrl || '/img/ava.png'}
                alt={member.fullName}
                className="h-14 w-14 shrink-0 rounded-full object-cover border border-slate-200"
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/img/ava.png'; }}
              />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-lg font-semibold tracking-tight text-black">{member.fullName}</h2>
                </div>
                <p className="truncate text-sm text-[#2197C0]">{member.email || '—'}</p>
                <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', getRoleBadgeClass(member.roleId))}>
                  {roleLabel}
                </span>
              </div>
            </div>
            <button type="button" onClick={onClose} className="shrink-0 p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" aria-label="Đóng">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex w-full flex-col divide-y divide-slate-200 border-t border-slate-200 bg-white sm:flex-row sm:divide-x sm:divide-y-0">
            <div className="min-w-0 flex-1 px-5 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#2197C0]">Vai trò</p>
              <p className="mt-1 text-sm font-medium text-black">{roleLabel}</p>
            </div>
            <div className="min-w-0 flex-1 px-5 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#2197C0]">Số điện thoại</p>
              <p className="mt-1 text-sm font-medium text-black">{member.phone || '—'}</p>
            </div>
            <div className="min-w-0 flex-1 px-5 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#2197C0]">Kỹ năng</p>
              <p className="mt-1 text-sm font-medium text-black">{activeSkills.length} kỹ năng</p>
            </div>
          </div>
        </header>

        {/* Body */}
        <div className="relative min-h-0 w-full flex-1 overflow-y-auto bg-white px-5 py-4">
          <div className="w-full space-y-4">

            <PanelSection icon={UserCircle} title="Thông tin liên hệ">
              <MetaGrid>
                <MetaRow label="Số điện thoại" value={member.phone || '—'} />
                <MetaRow label="Địa chỉ" value={member.address || '—'} className="sm:col-span-2" />
              </MetaGrid>
            </PanelSection>

            <PanelSection icon={Building2} title="Giấy tờ & ngân hàng">
              <MetaGrid>
                <MetaRow label="CMND / CCCD" value={member.cin || '—'} />
                <MetaRow label="Mã số thuế" value={member.taxNumber || '—'} />
                <MetaRow label="Ngân hàng" value={member.bankName || '—'} />
                <MetaRow label="Số tài khoản" value={member.bankCode || '—'} />
              </MetaGrid>
            </PanelSection>

            <PanelSection icon={Sparkles} title={`Kỹ năng${activeSkills.length > 0 ? ` (${activeSkills.length})` : ''}`}>
              <div className="pl-4 py-2">
                <p className="mb-2 text-xs font-medium text-[#2197C0]">Các kỹ năng đã gắn</p>
                {skills.length === 0 ? (
                  <p className="text-sm text-slate-500">Chưa có kỹ năng được ghi nhận.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {skills.map((s, i) => (
                      <Badge
                        key={`${s.skillId}-${s.skillName}`}
                        className={cn(
                          'rounded-full border-0 font-medium',
                          !s.isActive
                            ? 'bg-slate-100 text-slate-500 line-through opacity-75'
                            : i % 2 === 0
                              ? 'bg-teal-50 text-teal-800'
                              : 'bg-violet-50 text-violet-800',
                        )}
                      >
                        {s.skillName}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </PanelSection>

            <PanelSection icon={BarChart3} title="Khối lượng công việc">
              <div className="bg-white pl-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 py-2">
                  <p className="text-xs font-medium text-[#2197C0]">Thống kê theo khoảng thời gian</p>
                  <Select
                    value={workloadRange}
                    onValueChange={setWorkloadRange}
                    disabled={!member.memberId}
                  >
                    <SelectTrigger className="h-9 w-[min(100%,228px)] shrink-0 border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
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
                  <p className="py-4 text-sm text-slate-500">Không có mã thành viên để tải workload.</p>
                ) : !workload ? (
                  <div className="flex items-center justify-center py-6"><Spin size="small" /></div>
                ) : (
                  <div className="flex flex-col divide-y divide-slate-200 sm:flex-row sm:divide-x sm:divide-y-0">
                    <WorkloadCell label="Tổng giờ giảng" value={`${Number(workload.totalTeachingHours ?? 0).toFixed(1)}h`} changePercent={workload.totalTeachingHoursChangePercent ?? 0} color="text-sky-600" />
                    <WorkloadCell label="Buổi hoàn thành" value={Number(workload.completedSessions ?? 0)} changePercent={workload.completedSessionsChangePercent ?? 0} color="text-emerald-600" />
                    <WorkloadCell label="Buổi bị hủy" value={Number(workload.canceledSessions ?? 0)} changePercent={workload.canceledSessionsChangePercent ?? 0} color="text-rose-600" />
                    <WorkloadCell label="Thu nhập ước tính" value={`${Number(workload.estimatedIncome ?? 0).toLocaleString('vi-VN')} đ`} changePercent={workload.estimatedIncomeChangePercent ?? 0} color="text-amber-700" />
                  </div>
                )}
              </div>
            </PanelSection>

          </div>
        </div>
      </aside>
    </>
  );
}

function PanelSection({ icon: Icon, title, children }: { icon: (props: { className?: string; strokeWidth?: number }) => ReactNode; title: string; children: ReactNode }) {
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

function MetaGrid({ children }: { children: ReactNode }) {
  return (
    <div className="bg-white pl-4">
      <div className="grid grid-cols-1 divide-y divide-slate-200 sm:grid-cols-2 sm:divide-y-0">
        {children}
      </div>
    </div>
  );
}

function MetaRow({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={cn('py-1.5', className)}>
      <div className="text-xs font-medium text-[#2197C0]">{label}</div>
      <div className="mt-0.5 break-words text-sm text-black">{value}</div>
    </div>
  );
}

function WorkloadCell({ label, value, changePercent, color }: { label: string; value: ReactNode; changePercent: number; color: string }) {
  const v = Number(changePercent ?? 0);
  const pct = `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
  return (
    <div className="min-w-0 flex-1 px-3 py-2">
      <p className="text-[11px] font-medium text-[#2197C0]">{label}</p>
      <p className="mt-0.5 truncate text-lg font-semibold tabular-nums text-black">{value}</p>
      <p className={cn('mt-0.5 text-[11px] font-medium tabular-nums', color)}>{pct}</p>
    </div>
  );
}
