import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { message } from 'antd';
import { CalendarClock, Hash, RotateCcw, User, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { DataTable } from '@/shared/components/common/DataTable';
import { Button } from '@/shared/components/ui/button';
import HoverSearch from '@/shared/components/ui/search';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { getErrorMessage } from '@/shared/lib/errorMessage';
import { cn } from '@/shared/lib/utils';

import type { AuditLogItem } from '../api/auditLogApi';
import { auditLogApi } from '../api/auditLogApi';

const entityTypeLabelMap: Record<string, string> = {
  '1': 'Phân công', '2': 'Xác nhận tham gia', '3': 'Buổi đăng nhập',
  '4': 'Phiếu mượn', '5': 'Danh mục', '6': 'Chương trình học',
  '7': 'Thiết bị', '8': 'Mượn thiết bị', '9': 'Sự kiện',
  '10': 'Tài khoản', '11': 'Thành viên', '12': 'Yêu cầu',
  '13': 'Buổi học', '14': 'Kỹ năng', '15': 'Buổi môn học',
  '16': 'Môn học', '17': 'Báo cáo công việc', '18': 'Nhóm',
  '19': 'Chủ đề', '20': 'Giao dịch',
};

const actionLabelMap: Record<string, string> = {
  Create: 'Tạo', Update: 'Cập nhật', Approve: 'Duyệt',
  Delete: 'Xóa', View: 'Xem', Reject: 'Từ chối',
};

const actionColorMap: Record<string, string> = {
  Create: 'bg-emerald-100 text-emerald-700',
  Update: 'bg-blue-100 text-blue-700',
  Approve: 'bg-purple-100 text-purple-700',
  Delete: 'bg-red-100 text-red-600',
  View: 'bg-orange-100 text-orange-700',
  Reject: 'bg-rose-100 text-rose-600',
};

const columns: ColumnDef<AuditLogItem>[] = [
  {
    accessorKey: 'logId',
    header: 'Mã nhật ký',
    cell: ({ row }) => (
      <span className="font-semibold text-[#1a7a99]">#{row.original.logId}</span>
    ),
  },
  {
    id: 'createdAt',
    header: 'Thời gian',
    cell: ({ row }) => {
      const d = row.original.createdAt ? new Date(row.original.createdAt) : null;
      if (!d) return '—';
      return (
        <div>
          <div className="text-sm font-medium">{d.toLocaleDateString('vi-VN')}</div>
          <div className="text-xs text-slate-500">{d.toLocaleTimeString('vi-VN')}</div>
        </div>
      );
    },
  },
  {
    id: 'user',
    header: 'Người dùng',
    cell: ({ row }) => {
      const log = row.original;
      const fullName = log.user?.member?.fullName;
      const email = log.user?.email;
      return (
        <div className="min-w-0">
          {fullName && <div className="text-sm font-medium text-[#1a7a99] truncate">{fullName}</div>}
          {email && <div className="text-xs text-slate-500 truncate">{email}</div>}
          {!fullName && !email && '—'}
        </div>
      );
    },
  },
  {
    accessorKey: 'action',
    header: 'Hành động',
    cell: ({ row }) => {
      const action = row.original.action;
      const cls = actionColorMap[action] ?? 'bg-gray-100 text-gray-700';
      return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${cls}`}>
          {actionLabelMap[action] ?? action}
        </span>
      );
    },
  },
  {
    accessorKey: 'entityType',
    header: 'Loại thực thể',
    cell: ({ row }) => {
      const code = String(row.original.entityType ?? '');
      const label = entityTypeLabelMap[code];
      return (
        <span className="text-sm font-medium text-slate-700">
          {label ?? code ?? '—'}
        </span>
      );
    },
  },
  {
    accessorKey: 'description',
    header: 'Mô tả',
    cell: ({ row }) => (
      <span className="text-sm text-slate-600 line-clamp-2">
        {row.original.description || '—'}
      </span>
    ),
  },
];

// ── Detail Panel ──────────────────────────────────────────────────────────────

function Section({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
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

function MetaRow({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={cn('py-1.5', className)}>
      <div className="text-xs font-medium text-[#2197C0]">{label}</div>
      <div className="mt-0.5 break-words text-sm text-black">{value}</div>
    </div>
  );
}

function AuditLogDetailPanel({ item, onClose }: { item: AuditLogItem; onClose: () => void }) {
  const entityCode = String(item.entityType ?? '');
  const entityLabel = entityTypeLabelMap[entityCode] ?? entityCode;
  const action = item.action;
  const actionLabel = actionLabelMap[action] ?? action;
  const actionCls = actionColorMap[action] ?? 'bg-gray-100 text-gray-700';
  const d = item.createdAt ? new Date(item.createdAt) : null;

  return (
    <>
      <div className="fixed inset-0 z-40 h-full bg-black/35" onClick={onClose} aria-hidden />
      <div className={cn(
        'fixed right-0 top-0 z-50 h-full w-[560px] max-w-[96vw]',
        'border-l border-slate-200 bg-white shadow-2xl',
        'translate-x-0 transition-transform duration-300 ease-out',
      )}>
        <div className="flex h-full flex-col overflow-hidden">
          {/* HEADER */}
          <header className="w-full shrink-0 border-b border-slate-200 bg-white">
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-widest text-slate-400">CHI TIẾT NHẬT KÝ</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold text-[#1a7a99]">Nhật ký #{item.logId}</h2>
                    <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium', actionCls)}>
                      {actionLabel}
                    </span>
                  </div>
                  {d && (
                    <p className="mt-1 text-xs text-slate-500">{d.toLocaleString('vi-VN')}</p>
                  )}
                </div>
                <button type="button" onClick={onClose} className="shrink-0 rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors" aria-label="Đóng">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            {/* Meta bar */}
            <div className="grid w-full grid-cols-3 divide-x divide-slate-200 border-t border-slate-200 bg-slate-50">
              <div className="px-5 py-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#2197C0]">Hành động</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-900">{actionLabel}</p>
              </div>
              <div className="px-5 py-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#2197C0]">Loại thực thể</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-900">{entityLabel || '—'}</p>
              </div>
              <div className="px-5 py-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#2197C0]">Mã thực thể</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-900">{item.entityId ?? '—'}</p>
              </div>
            </div>
          </header>

          {/* BODY */}
          <div className="min-h-0 flex-1 overflow-y-auto bg-white px-5 py-4 space-y-4">
            <Section icon={Hash} title="Thông tin nhật ký">
              <div className="pl-4 grid grid-cols-2 gap-x-6">
                <MetaRow label="Mã nhật ký" value={`#${item.logId}`} />
                <MetaRow label="Thời gian" value={d ? d.toLocaleString('vi-VN') : '—'} />
                <MetaRow label="Hành động" value={
                  <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', actionCls)}>{actionLabel}</span>
                } />
                <MetaRow label="Loại thực thể" value={entityLabel || '—'} />
                <MetaRow label="Mã thực thể" value={item.entityId ?? '—'} />
              </div>
            </Section>

            <Section icon={User} title="Người thực hiện">
              <div className="pl-4 grid grid-cols-2 gap-x-6">
                <MetaRow label="Email" value={item.user?.email || '—'} />
              </div>
            </Section>

            <Section icon={CalendarClock} title="Mô tả">
              <div className="pl-4">
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {item.description || '—'}
                </p>
              </div>
            </Section>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AuditLogs() {
  const [pageNumber, setPageNumber] = useState(1);
  const pageSize = 10;
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterEntityType, setFilterEntityType] = useState<string>('all');
  const [detailItem, setDetailItem] = useState<AuditLogItem | null>(null);
  const navigate = useNavigate();

  const handleRowClick = (item: AuditLogItem) => {
    const entityType = String(item.entityType ?? '').trim().toLowerCase();
    const entityId = item.entityId;

    if (entityId != null) {
      if (entityType === '12' || entityType === 'request') { navigate(`/manager/requests/${entityId}`); return; }
      if (entityType === '6' || entityType === 'course') { navigate(`/manager/courses?openDetail=1&courseId=${entityId}`); return; }
      if (entityType === '9' || entityType === 'event') { navigate(`/manager/events?openDetail=1&eventId=${entityId}`); return; }
      if (entityType === '7' || entityType === 'equipment') { navigate(`/manager/equipments?openDetail=1&equipmentId=${entityId}`); return; }
      if (entityType === '10' || entityType === 'user') { navigate(`/manager/users?openDetail=1&userId=${entityId}`); return; }
      if (entityType === '11' || entityType === 'member') { navigate(`/manager/members?openDetail=1&memberId=${entityId}`); return; }
      if (entityType === '19' || entityType === 'topic') { navigate(`/manager/topics?openDetail=1&topicId=${entityId}`); return; }
      if (entityType === '18' || entityType === 'team') { navigate(`/manager/teams?openDetail=1&teamId=${entityId}`); return; }
      if (entityType === '17' || entityType === 'taskreport') { navigate(`/manager/tasks?openDetail=1&taskReportId=${entityId}`); return; }
      if (entityType === '4' || entityType === 'borrowing') { navigate(`/manager/borrowings?openDetail=1&borrowingId=${entityId}`); return; }
      if (entityType === '5' || entityType === 'category') { navigate(`/manager/equipments/categories?openDetail=1&categoryId=${entityId}`); return; }
      if (entityType === '15' || entityType === '16' || entityType === 'subject' || entityType === 'subjectsession') { navigate(`/manager/subjects?openDetail=1&subjectId=${entityId}`); return; }
      if (entityType === '20' || entityType === 'transaction') { navigate(`/manager/transactions?openDetail=1&transactionId=${entityId}`); return; }
      if (entityType === '14' || entityType === 'skill') { navigate(`/manager/skills?openDetail=1&skillId=${entityId}`); return; }
    }

    setDetailItem(item);
  };

  const { data: paged, isLoading, error } = useQuery({
    queryKey: ['audit-logs', pageNumber, pageSize, filterAction, filterEntityType],
    queryFn: () => auditLogApi.getAuditLogs({
      pageNumber, pageSize,
      action: filterAction !== 'all' ? filterAction : undefined,
      entityType: filterEntityType !== 'all' ? filterEntityType : undefined,
    }),
  });

  const logs = useMemo(() => paged?.items ?? [], [paged]);
  const totalItems = paged?.totalItems ?? 0;

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((log) => {
      const text = `${log.description || ''} ${log.action || ''} ${log.entityType || ''} ${log.user?.member?.fullName || ''} ${log.user?.email || ''}`.toLowerCase();
      return text.includes(q);
    });
  }, [logs, search]);

  const lastErrorRef = useRef<string | null>(null);
  useEffect(() => {
    if (!error) return;
    const msg = getErrorMessage(error);
    if (lastErrorRef.current === msg) return;
    lastErrorRef.current = msg;
    message.error(msg);
  }, [error]);

  return (
    <div className="p-6 pl-8 space-y-6">
      {/* HEADER */}
      <div className="flex justify-between bg-white px-6 py-4 mb-2 rounded-xl border shadow-sm items-center">
        <div>
          <h2 className="text-xl font-semibold text-[#1a7a99]">Quản lý nhật ký hoạt động</h2>
          <p className="text-xs text-gray-500">Quản lý nhật ký hoạt động của người dùng</p>
        </div>
        {isLoading && <span className="text-xs text-gray-500">Đang tải dữ liệu...</span>}
      </div>

      {/* FILTER BAR */}
      <div className="flex justify-end gap-3 mb-2 flex-wrap">
        <HoverSearch placeholder="Tìm theo mô tả, người dùng..." value={search} onChange={setSearch} />
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={filterAction} onValueChange={(v) => { setFilterAction(v); setPageNumber(1); }}>
            <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white w-[160px]">
              <SelectValue placeholder="Hành động" />
            </SelectTrigger>
            <SelectContent className="max-h-64 overflow-y-auto">
              <SelectItem value="all">Tất cả hành động</SelectItem>
              <SelectItem value="Create">Tạo</SelectItem>
              <SelectItem value="Update">Cập nhật</SelectItem>
              <SelectItem value="Approve">Duyệt</SelectItem>
              <SelectItem value="Delete">Xóa</SelectItem>
              <SelectItem value="View">Xem</SelectItem>
              <SelectItem value="Reject">Từ chối</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterEntityType} onValueChange={(v) => { setFilterEntityType(v); setPageNumber(1); }}>
            <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white w-[160px]">
              <SelectValue placeholder="Loại thực thể" />
            </SelectTrigger>
            <SelectContent className="max-h-64 overflow-y-auto">
              <SelectItem value="all">Tất cả loại</SelectItem>
              {Object.entries(entityTypeLabelMap).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 bg-white border-slate-200 text-gray-600 hover:bg-gray-50"
            onClick={() => { setSearch(''); setFilterAction('all'); setFilterEntityType('all'); setPageNumber(1); }}
            title="Đặt lại bộ lọc"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl border shadow-sm px-6 py-4">
        <DataTable
          columns={columns}
          data={filteredLogs}
          pageNumber={pageNumber}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={setPageNumber}
          onRowClick={handleRowClick}
        />
      </div>

      {/* DETAIL PANEL */}
      {detailItem && (
        <AuditLogDetailPanel item={detailItem} onClose={() => setDetailItem(null)} />
      )}
    </div>
  );
}
