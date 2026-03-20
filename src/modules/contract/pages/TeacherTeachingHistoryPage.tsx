import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Funnel, MapPin, Globe, ChevronRight, FileText, PlusCircle, CalendarDays, Clock } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { DataTable } from '@/shared/components/common/DataTable';
import HoverSearch from '@/shared/components/ui/search';
import { Button } from '@/shared/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import type { TeachingHistoryItem } from '@/modules/contract/teachingHistory';
import { sessionDisplayName } from '@/modules/contract/teachingHistory';
import { StatCard } from '@/shared/components/common/StatCard';
import CreateContractModal from './CreateContractModal';
import { useNavigate } from 'react-router-dom';
import contractApi from '../api/contractApi';
import type { ContractListItem } from '../contract';
import ContractDetailSidebar from './ContractDetailSidebar';
import { useTeacherTeachingHistory } from '@/modules/contract/hooks/useTeacherTeachingHistory';

function formatDate(value?: string) {
  if (!value) return '—';
  return dayjs(value).locale('vi').format('DD/MM/YYYY');
}

function formatTimeRange(start?: string, end?: string) {
  if (!start || !end) return '—';
  return `${dayjs(start).format('HH:mm')} - ${dayjs(end).format('HH:mm')}`;
}

export default function TeacherTeachingHistoryPage() {
  const navigate = useNavigate();
  const {
    items,
    loading,
    pageNumber,
    pageSize,
    totalItems,
    search,
    hasContract,
    reportsBySession,
    setPageNumber,
    setSearch,
    setHasContract,
  } = useTeacherTeachingHistory({ pageSize: 8 });

  const [createOpen, setCreateOpen] = useState(false);
  const [createSessionId, setCreateSessionId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailContract, setDetailContract] = useState<ContractListItem | null>(null);
  const [detailRoleLabel, setDetailRoleLabel] = useState<string | null>(null);

  const columns: ColumnDef<TeachingHistoryItem>[] = useMemo(() => {
    const base: ColumnDef<TeachingHistoryItem>[] = [
      {
        id: 'datetime',
        header: 'NGÀY',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-900">
              {formatDate(row.original.startAt)}
            </span>
            <span className="text-xs text-slate-500">
              {formatTimeRange(row.original.startAt, row.original.endAt)}
            </span>
          </div>
        ),
      },
      {
        id: 'sessionName',
        header: 'PHIÊN',
        cell: ({ row }) => (
          <div className="min-w-0 max-w-[260px] md:max-w-[320px]">
            <div className="text-[13px] font-semibold text-slate-900 line-clamp-2">
              {row.original.request?.requestName || row.original.request?.requestCode || '—'}
            </div>
            <div className="text-[11px] text-slate-500">
              {sessionDisplayName(row.original) || '—'}
            </div>
          </div>
        ),
      },
      {
        id: 'request',
        header: 'YÊU CẦU',
        cell: ({ row }) => {
          const requestCode = row.original.request?.requestCode;
          if (!requestCode) {
            return <span className="text-xs text-slate-400">—</span>;
          }
          return (
            <div className="min-w-0 max-w-[180px]">
              <div className="text-xs text-slate-600 truncate">
                <span className="font-semibold text-slate-900">{requestCode}</span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'location',
        header: 'ĐỊA ĐIỂM',
        cell: ({ row }) => {
          const isOnline =
            row.original.isOnline === true ||
            String(row.original.location || '').toLowerCase().includes('online');
          return (
            <div className="flex items-start gap-2 max-w-[220px]">
              {isOnline ? (
                <Globe className="h-4 w-4 text-violet-500 mt-0.5" />
              ) : (
                <MapPin className="h-4 w-4 text-sky-600 mt-0.5" />
              )}
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-slate-900 truncate">
                  {row.original.location || '—'}
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {isOnline ? 'Online' : 'Offline'}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        id: 'contract',
        header: 'HỢP ĐỒNG',
        cell: ({ row }) => {
          const hasContract = !!row.original.contract?.contractId;
          const code = row.original.contract?.contractCode || 'Hợp đồng';
          if (hasContract) {
            const isPaid = row.original.contract?.isPaid ?? null;
            const paidClass =
              isPaid === true
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : isPaid === false
                  ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100';
            return (
              <button
                type="button"
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold whitespace-nowrap ${paidClass}`}
                onClick={async () => {
                  try {
                    const rawRole = String(row.original.role || '');
                    const normalized = rawRole.toLowerCase();
                    const roleLabel =
                      normalized.includes('ta') || normalized.includes('trợ')
                        ? 'Trợ giảng'
                        : 'Giáo viên';
                    setDetailRoleLabel(roleLabel);
                    const full = await contractApi.getById(row.original.contract!.contractId);
                    setDetailContract(full);
                    setDetailOpen(true);
                  } catch (err) {
                    console.error(err);
                  }
                }}
              >
                <FileText className="h-3.5 w-3.5" />
                {code}
              </button>
            );
          }
          return (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-100 whitespace-nowrap"
              onClick={() => {
                setCreateSessionId(row.original.sessionId);
                setCreateOpen(true);
              }}
            >
              <PlusCircle className="h-3.5 w-3.5" />
            </button>
          );
        },
      },
      {
        id: 'report',
        header: 'BÁO CÁO',
        cell: ({ row }) => {
          const hasReport = !!reportsBySession[row.original.sessionId]?.length;
          if (hasReport) {
            return (
              <span className="inline-flex items-center text-[11px] font-semibold text-violet-700 bg-violet-50 border border-violet-100 rounded-full px-3 py-1">
                Đã viết báo cáo
              </span>
            );
          }
          return (
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full border border-violet-200 bg-violet-50 w-7 h-7 text-violet-700 hover:bg-violet-100 text-lg leading-none"
              onClick={() => {
                const rid = row.original.request?.requestId;
                const sid = row.original.sessionId;
                const params = new URLSearchParams();
                if (rid != null) params.set('requestId', String(rid));
                if (sid != null) params.set('sessionId', String(sid));
                navigate(`/teacher/tasks?${params.toString()}`);
              }}
            >
              +
            </button>
          );
        },
      },
      {
        id: 'actions',
        header: 'THAO TÁC',
        cell: ({ row }) => (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-sm font-semibold text-sky-700 hover:text-sky-800"
            onClick={() => navigate(`/teacher/attendance/${row.original.sessionId}`)}
          >
            Chi tiết <ChevronRight className="h-4 w-4" />
          </button>
        ),
      },
    ];

    return base;
  }, [navigate, reportsBySession]);

  const totalWithContract = useMemo(
    () => items.filter((x) => x.contract?.contractId != null).length,
    [items]
  );
  const totalWithoutContract = useMemo(
    () => items.filter((x) => !x.contract?.contractId).length,
    [items],
  );

  return (
    <div className="relative p-6 space-y-6">
      {loading && (
        <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-md">
          <span className="text-sm text-slate-500">Đang tải danh sách phiên đã dạy...</span>
        </div>
      )}

      {/* HEADER */}
      <div className="flex justify-between bg-white px-6 py-4 mb-2 rounded-xl border shadow-sm items-center">
        <div>
          <h2 className="text-xl font-semibold text-black">Danh sách phiên đã dạy</h2>
          <p className="text-xs text-gray-500">Các phiên bạn đã dạy cùng trạng thái hợp đồng.</p>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-4 mb-2">
        <StatCard
          icon={<CalendarDays />}
          label="Tổng phiên"
          value={totalItems.toString()}
          sub="trong danh sách hiện tại"
        />
        <StatCard
          icon={<FileText />}
          label="Đã có hợp đồng"
          value={totalWithContract.toString()}
          sub="phiên"
        />
        <StatCard
          icon={<Clock />}
          label="Chưa có hợp đồng"
          value={totalWithoutContract.toString()}
          sub="phiên"
        />
      </div>

      {/* FILTERS */}
      <div className="flex justify-end gap-3 mb-2">
        <HoverSearch value={search} onChange={setSearch} placeholder="Tìm theo tên phiên..." />
        <Select value={hasContract} onValueChange={(v) => setHasContract(v as typeof hasContract)}>
          <SelectTrigger className="h-9 w-[160px] text-sm bg-white border-slate-200">
            <SelectValue placeholder="Lọc hợp đồng" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="yes">Có hợp đồng</SelectItem>
            <SelectItem value="no">Chưa có hợp đồng</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          className="h-9 px-3 border-slate-200 text-slate-700"
          onClick={() => {
            setSearch('');
            setHasContract('all');
            setPageNumber(1);
          }}
        >
          <Funnel className="h-4 w-4" />
        </Button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl border shadow-sm px-6 py-4">
        <DataTable
          columns={columns}
          data={items}
          pageNumber={pageNumber}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={(p) => setPageNumber(p)}
        />
      </div>

      <CreateContractModal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setCreateSessionId(null);
        }}
        onCreated={() => {
          setCreateOpen(false);
          setCreateSessionId(null);
          setPageNumber(1);
        }}
        initialSessionId={createSessionId}
      />

      <ContractDetailSidebar
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetailContract(null);
          setDetailRoleLabel(null);
        }}
        contract={detailContract}
        roleLabel={detailRoleLabel ?? undefined}
      />
    </div>
  );
}

