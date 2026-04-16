import { useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Spin } from 'antd';
import {
  Award,
  Building2,
  CreditCard,
  Hash,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  User,
  Users,
  X,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { DataTable } from '@/shared/components/common/DataTable';
import { TableTextAction } from '@/shared/components/common/TableTextAction';
import HoverSearch from '@/shared/components/ui/search';
import { getRoleLabel, getRoleBadgeClass } from '@/constants/role';
import { useMyTeam } from '../hooks/useMyTeam';
import type { MemberSkillItem, TeamMemberItem, TeamTopicItem } from '../team';

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

  const [search, setSearch] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const pageSize = 10;

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMemberItem | null>(null);

  const filteredMembers = useMemo(() => {
    if (!teamDetail?.members) return [];
    const q = search.trim().toLowerCase();
    if (!q) return teamDetail.members;
    return teamDetail.members.filter(
      (m) =>
        m.fullName?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.phone?.toLowerCase().includes(q),
    );
  }, [teamDetail, search]);

  const pagedMembers = useMemo(() => {
    const start = (pageNumber - 1) * pageSize;
    return filteredMembers.slice(start, start + pageSize);
  }, [filteredMembers, pageNumber, pageSize]);

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
      id: 'stt',
      header: 'STT',
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-xs tabular-nums text-gray-800">
          {(pageNumber - 1) * pageSize + row.index + 1}
        </span>
      ),
    },
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
            <div className="text-sm font-medium text-slate-900 truncate">{row.original.fullName}</div>
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
      id: 'actions',
      header: 'Thao tác',
      enableSorting: false,
      cell: ({ row }) => <TableTextAction onClick={() => handleView(row.original)} />,
    },
  ];

  if (loading) {
    return (
      <div
        className="flex items-center justify-center p-6 app-page-bg"
        style={{ height: 'var(--content-height, 100vh)' }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="p-6 app-page-bg flex flex-col items-center justify-center gap-4"
        style={{ height: 'var(--content-height, 100vh)' }}
      >
        <p className="text-sm text-red-600">{error}</p>
        <Button type="button" variant="secondary" onClick={() => void refetch()}>
          Thử lại
        </Button>
      </div>
    );
  }

  if (!teamDetail) {
    return (
      <div
        className="p-6 app-page-bg flex flex-col min-h-0 overflow-hidden"
        style={{ height: 'var(--content-height, 100vh)' }}
      >
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center max-w-md mx-auto">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
            <Users className="h-7 w-7" />
          </div>
          <p className="text-sm text-slate-700 font-semibold">Bạn chưa thuộc nhóm nào</p>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Khi được quản lý gán vào nhóm, danh sách thành viên sẽ hiển thị tại đây.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col gap-2 p-6 pb-8 app-page-bg">
      <div className="flex shrink-0 flex-col gap-1 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <h2 className="text-xl font-semibold text-black">{teamDetail.teamName}</h2>
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {(teamDetail.topics ?? []).length > 0 ? (
              (teamDetail.topics ?? []).map((t) => formatTopicBadge(t))
            ) : (
              <span className="text-xs text-gray-400">Chủ đề nhóm sẽ hiển thị tại đây khi được gán.</span>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
            <HoverSearch
              placeholder="Tìm theo tên, email, SĐT..."
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPageNumber(1);
              }}
            />
            <Button
              variant="secondary"
              className="h-9 border-slate-200 bg-white"
              type="button"
              onClick={() => {
                setSearch('');
                setPageNumber(1);
              }}
              title="Đặt lại bộ lọc"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="relative flex w-full min-w-0 flex-col bg-white rounded-2xl border border-slate-200 shadow-sm p-4 [&_tbody_tr]:min-h-16 [&_tbody_td]:align-middle">
        <DataTable
          columns={columns}
          data={pagedMembers}
          pageNumber={pageNumber}
          pageSize={pageSize}
          totalItems={filteredMembers.length}
          onPageChange={(page) => setPageNumber(page)}
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
  if (!member) return null;

  const roleLabel = getRoleLabel(member.roleId);
  const skills: MemberSkillItem[] = member.skills ?? [];

  return (
    <>
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 cursor-default bg-slate-900/40 backdrop-blur-[2px] transition-opacity"
          aria-label="Đóng"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 right-0 z-50 flex h-full w-full max-w-[min(100%,560px)] flex-col border-l border-slate-200/80 bg-white shadow-2xl transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
      >
        <div className="shrink-0 border-b border-slate-100 bg-gradient-to-b from-slate-50/90 to-white px-5 pb-5 pt-6">
          <div className="flex justify-between gap-3">
            <div className="flex min-w-0 gap-4">
              <div className="relative shrink-0">
                <img
                  src={member.avatarUrl || '/img/ava.png'}
                  alt={member.fullName}
                  className="h-20 w-20 rounded-2xl object-cover bg-white ring-1 ring-slate-200/80"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/img/ava.png';
                  }}
                />
              </div>
              <div className="min-w-0 pt-0.5">
                <h2 className="truncate text-lg font-semibold text-slate-900">{member.fullName}</h2>
                <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-slate-600">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                  {member.email || '—'}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge className={`${getRoleBadgeClass(member.roleId)} border px-2.5 py-0.5 text-[11px]`}>
                    {roleLabel}
                  </Badge>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto app-page-bg px-5 py-5">
          <div className="space-y-8">
            <DetailSection icon={User} title="Liên hệ & địa chỉ" tone="sky">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                  <MemberMetaRow icon={Phone} label="Số điện thoại" value={member.phone} />
                  <MemberMetaRow icon={MapPin} label="Địa chỉ" value={member.address} className="sm:col-span-2" />
                </div>
              </div>
            </DetailSection>

            <DetailSection icon={CreditCard} title="Giấy tờ & ngân hàng" tone="violet">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                  <MemberMetaRow icon={Hash} label="CMND / CCCD" value={member.cin} />
                  <MemberMetaRow icon={Hash} label="Mã số thuế" value={member.taxNumber} />
                  <MemberMetaRow icon={Building2} label="Ngân hàng" value={member.bankName} />
                  <MemberMetaRow icon={CreditCard} label="Số tài khoản" value={member.bankCode} />
                </div>
              </div>
            </DetailSection>

            <DetailSection icon={Award} title="Kỹ năng" tone="amber">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                {skills.length === 0 ? (
                  <p className="text-sm text-slate-500">Chưa có kỹ năng được ghi nhận.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {skills.map((s) => (
                      <span
                        key={`${s.skillId}-${s.skillName}`}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium',
                          s.isActive
                            ? 'bg-amber-50/90 text-amber-950 ring-1 ring-amber-100/90'
                            : 'bg-slate-100/90 text-slate-500 line-through opacity-75 ring-1 ring-slate-200/80',
                        )}
                      >
                        <Award className="h-3.5 w-3.5 shrink-0 opacity-80" />
                        {s.skillName}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </DetailSection>
          </div>
        </div>
      </aside>
    </>
  );
}

const detailSectionToneClass: Record<'sky' | 'violet' | 'amber', string> = {
  sky: 'text-sky-600',
  violet: 'text-violet-600',
  amber: 'text-amber-600',
};

/** Cùng pattern với `MetaRow` trong chi tiết hợp đồng — không viền từng ô. */
function DetailSection({
  icon: Icon,
  title,
  tone,
  children,
}: {
  icon: LucideIcon;
  title: string;
  tone: keyof typeof detailSectionToneClass;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2.5">
        <Icon className={cn('h-5 w-5 shrink-0', detailSectionToneClass[tone])} strokeWidth={2} aria-hidden />
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function MemberMetaRow({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  className?: string;
}) {
  const display = value == null || value === '' ? '—' : value;
  return (
    <div className={cn('flex min-w-0 gap-3', className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#2197C0]" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-slate-500">{label}</div>
        <div className="mt-0.5 break-words text-sm font-medium text-slate-900">{display}</div>
      </div>
    </div>
  );
}
