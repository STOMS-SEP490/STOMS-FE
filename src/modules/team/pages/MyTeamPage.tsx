import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Spin } from 'antd';
import { Users, X } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { DataTable } from '@/shared/components/common/DataTable';
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
        className="flex items-center justify-center p-6 pl-8 app-page-bg"
        style={{ height: 'var(--content-height, 100vh)' }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="p-6 pl-8 app-page-bg flex flex-col items-center justify-center gap-4"
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
        className="p-6 pl-8 app-page-bg flex flex-col min-h-0 overflow-hidden"
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
  if (!member) return null;

  const roleLabel = getRoleLabel(member.roleId);
  const skills: MemberSkillItem[] = member.skills ?? [];
  const activeSkills = skills.filter(s => s.isActive);

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
        className={`fixed top-0 right-0 z-50 flex h-full w-[720px] max-w-[96vw] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="shrink-0 border-b border-gray-200 bg-sky-50/30 px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 gap-4">
              <img
                src={member.avatarUrl || '/img/ava.png'}
                alt={member.fullName}
                className="h-16 w-16 shrink-0 border border-slate-200 bg-slate-100 object-cover"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '/img/ava.png';
                }}
              />
              <div className="min-w-0 pt-0.5">
                <h2 className="text-lg font-semibold text-slate-900">{member.fullName}</h2>
                <p className="mt-1 text-sm text-slate-600">{member.email || '—'}</p>
                <div className="mt-2">
                  <Badge className={`${getRoleBadgeClass(member.roleId)} border px-2 py-0.5 text-xs`}>
                    {roleLabel}
                  </Badge>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 p-2 text-slate-400 transition hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#fafafa]">
          {/* Thông tin liên hệ */}
          <div className="border-b border-gray-200 bg-white">
            <div className="border-b border-gray-100 bg-sky-50/30 px-6 py-3">
              <h3 className="text-sm font-semibold text-slate-900">Thông tin liên hệ</h3>
            </div>
            <div className="px-6 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoRow label="Số điện thoại" value={member.phone || '—'} />
                <InfoRow label="Địa chỉ" value={member.address || '—'} className="sm:col-span-2" />
              </div>
            </div>
          </div>

          {/* Giấy tờ & ngân hàng */}
          <div className="border-b border-gray-200 bg-white">
            <div className="border-b border-gray-100 bg-sky-50/30 px-6 py-3">
              <h3 className="text-sm font-semibold text-slate-900">Giấy tờ & ngân hàng</h3>
            </div>
            <div className="px-6 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoRow label="CMND / CCCD" value={member.cin || '—'} />
                <InfoRow label="Mã số thuế" value={member.taxNumber || '—'} />
                <InfoRow label="Ngân hàng" value={member.bankName || '—'} />
                <InfoRow label="Số tài khoản" value={member.bankCode || '—'} />
              </div>
            </div>
          </div>

          {/* Kỹ năng */}
          <div className="border-b border-gray-200 bg-white">
            <div className="border-b border-gray-100 bg-sky-50/30 px-6 py-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Kỹ năng {activeSkills.length > 0 && `(${activeSkills.length})`}
              </h3>
            </div>
            <div className="px-6 py-4">
              {skills.length === 0 ? (
                <p className="text-sm text-slate-500">Chưa có kỹ năng được ghi nhận.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {skills.map((s) => (
                    <Badge
                      key={`${s.skillId}-${s.skillName}`}
                      className={cn(
                        'border px-2.5 py-1 text-xs font-medium',
                        s.isActive
                          ? 'border-amber-200 bg-amber-50 text-amber-900'
                          : 'border-slate-200 bg-slate-100 text-slate-500 line-through opacity-75',
                      )}
                    >
                      {s.skillName}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function InfoRow({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="text-xs font-medium uppercase tracking-wide text-[#2197C0]">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-slate-900">{value || '—'}</div>
    </div>
  );
}
