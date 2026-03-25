import { useMemo, useState } from 'react';
import { Spin } from 'antd';
import { RotateCcw, Users, X } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { DataTable } from '@/shared/components/common/DataTable';
import { TableTextAction } from '@/shared/components/common/TableTextAction';
import HoverSearch from '@/shared/components/ui/search';
import { getRoleLabel, getRoleBadgeClass } from '@/constants/role';
import { useTeamByMember } from '../hooks/useTeamByMember';
import type { TeamMemberItem } from '../team';

function roleBadge(roleId: number) {
  return (
    <Badge className={`${getRoleBadgeClass(roleId)} text-[10px] px-1.5 py-0 leading-normal border`}>
      {getRoleLabel(roleId)}
    </Badge>
  );
}

export default function TeamLeaderTeamPage() {
  const memberId =
    Number(JSON.parse(localStorage.getItem('user') || '{}')?.memberId || 0) || 0;

  const { data: teamDetail, loading } = useTeamByMember(memberId);

  const [search, setSearch] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const pageSize = 7;

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
      accessorKey: 'memberId',
      header: 'ID',
      cell: ({ row }) => (
        <span className="text-xs tabular-nums text-gray-800">{row.original.memberId}</span>
      ),
    },
    {
      id: 'user',
      header: 'Tên người dùng',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <img
            src={row.original.avatarUrl || '/img/avatar.png'}
            alt={row.original.fullName}
            className="w-9 h-9 rounded-full object-cover shrink-0"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/img/avatar.png';
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
      cell: ({ row }) => (
        <TableTextAction onClick={() => handleView(row.original)} />
      ),
    },
  ];

  if (loading) {
    return (
      <div
        className="flex items-center justify-center p-6 bg-slate-50"
        style={{ height: 'var(--content-height, 100vh)' }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (!teamDetail) {
    return (
      <div
        className="p-6 bg-slate-50 flex flex-col min-h-0 overflow-hidden"
        style={{ height: 'var(--content-height, 100vh)' }}
      >
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          <Users className="mx-auto text-slate-300 mb-3" size={40} />
          <p className="text-sm text-gray-600 font-medium">
            Bạn chưa được gán vào nhóm nào.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Vui lòng liên hệ quản lý để được thêm vào nhóm.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative p-6 bg-slate-50 flex flex-col gap-2 min-h-0 overflow-hidden"
      style={{ height: 'var(--content-height, 100vh)' }}
    >
      {/* HEADER: tiêu đề + (chủ đề | search | reset) cùng một hàng như trang thiết bị */}
      <div className="shrink-0 bg-white px-6 py-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-4 min-[900px]:flex-row min-[900px]:items-center min-[900px]:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-black">{teamDetail.teamName}</h2>
            <p className="text-xs text-gray-500">
              Danh sách thành viên trong nhóm · {teamDetail.members.length} thành viên
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {(teamDetail.topics ?? []).map((t) => (
              <Badge
                key={t.topicId}
                className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs shrink-0"
              >
                {t.topicName}
              </Badge>
            ))}
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
              className="bg-white shrink-0"
              onClick={() => {
                setSearch('');
                setPageNumber(1);
              }}
              title="Đặt lại bộ lọc"
            >
              <RotateCcw />
            </Button>
          </div>
        </div>
      </div>

      {/* TABLE: comfortable + min-hàng để bớt khoảng trắng dưới bảng khi fill chiều cao */}
      <div
        className="relative bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex-1 min-h-0 flex flex-col [&_tbody_tr]:min-h-16 [&_tbody_td]:align-middle"
      >
        <DataTable
          columns={columns}
          data={pagedMembers}
          pageNumber={pageNumber}
          pageSize={pageSize}
          totalItems={filteredMembers.length}
          onPageChange={(page) => setPageNumber(page)}
          fillHeight
          comfortable
        />
      </div>

      <MemberDetailPanel open={detailOpen} onClose={closeDetail} member={selectedMember} />
    </div>
  );
}

/* ─── Detail slide-over panel ─── */

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

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/30 z-40 h-full" onClick={onClose} />}

      <div
        className={`fixed top-0 right-0 h-full w-[520px] bg-[#f3f4f6] z-50
        transition-transform duration-300
        ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex flex-col h-full overflow-y-auto no-scrollbar text-gray-700">
          {/* Header */}
          <div className="px-8 py-6">
            <div className="flex justify-between items-start">
              <div className="flex gap-4">
                <img
                  src={member.avatarUrl || '/img/avatar.png'}
                  alt={member.fullName}
                  className="w-16 h-16 rounded-full object-cover ring-4 ring-white shadow-lg"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/img/avatar.png';
                  }}
                />
                <div>
                  <h2 className="text-lg font-semibold text-black">{member.fullName}</h2>
                  <p className="text-sm text-gray-500">{member.email}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge className={`${getRoleBadgeClass(member.roleId)} border`}>
                      {roleLabel}
                    </Badge>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mt-4">
              <div>
                <p className="text-xs text-gray-400 font-semibold">ID THÀNH VIÊN</p>
                <p>{member.memberId}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold">VAI TRÒ</p>
                <p>{roleLabel}</p>
              </div>
            </div>
          </div>

          {/* Thông tin cá nhân */}
          <Section title="Thông tin cá nhân">
            <Field label="Họ và tên" value={member.fullName} />
            <Field label="Email" value={member.email} />
            <Field label="Số điện thoại" value={member.phone} />
            <Field label="Địa chỉ" value={member.address} />
          </Section>

          {/* Thông tin giấy tờ */}
          <Section title="Giấy tờ & Ngân hàng">
            <Field label="CMND/CCCD" value={member.cin} />
            <Field label="Mã số thuế" value={member.taxNumber} />
            <Field label="Tên ngân hàng" value={member.bankName} />
            <Field label="Số tài khoản" value={member.bankCode} />
          </Section>
        </div>
      </div>
    </>
  );
}

/* ─── Shared UI helpers (same pattern as MemberDetailSidebar) ─── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-6 bg-white rounded-xl shadow-sm mx-6 mb-4 space-y-4">
      <h3 className="font-semibold text-black">{title}</h3>
      <div className="grid grid-cols-2 gap-4 text-sm">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm">
        {value ?? '—'}
      </div>
    </div>
  );
}
