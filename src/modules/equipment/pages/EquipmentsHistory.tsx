import { DataTable } from '@/shared/components/common/DataTable';
import { TableTextAction } from '@/shared/components/common/TableTextAction';
import { Button } from '@/shared/components/ui/button';
import HoverSearch from '@/shared/components/ui/search';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import type { BorrowingListItem } from '@/modules/equipment/borrowing';
import type { ColumnDef } from '@tanstack/react-table';
import { RotateCcw } from 'lucide-react';
import { useLocation, useOutletContext, useSearchParams } from 'react-router-dom';
import { useBorrowings } from '../hooks/useBorrowings';
import {
  BORROWING_STATUS_OPTIONS,
  getBorrowingStatusDisplay,
  getBorrowingStatusColor,
} from '@/constants/borrowing';
import { Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import borrowingApi from '../api/borrowingApi';
import CreateBorrowingModal from './CreateBorrowingModal';
import BorrowingDetailSidebar from './BorrowingDetailSidebar';

const DEFAULT_AVATAR_SRC = '/img/ava.png';
const QP_SEARCH = 'q';
const QP_STATUS = 'st';
const QP_PAGE = 'p';

function getAvatarSrc(src?: string | null) {
  return src && String(src).trim() ? String(src) : DEFAULT_AVATAR_SRC;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('vi-VN');
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function parsePositiveInt(v: string | null, fallback: number): number {
  const n = v ? Number(v) : NaN;
  if (!Number.isFinite(n)) return fallback;
  const i = Math.floor(n);
  return i > 0 ? i : fallback;
}

const columns = (
  onView: (item: BorrowingListItem) => void
): ColumnDef<BorrowingListItem>[] => [
  {
    accessorKey: 'borrowingId',
    header: 'Mã phiếu',
    cell: ({ row }) => (
      <span className="font-medium">#{row.original.borrowingId}</span>
    ),
  },
  {
    id: 'borrower',
    header: 'Người mượn',
    cell: ({ row }) => {
      const m = row.original.borrowedByMember;
      const email = m?.email?.trim() || '';
      const sub =
        email ||
        (row.original.borrowedByMemberId ? `ID #${row.original.borrowedByMemberId}` : '—');
      return (
        <div className="flex min-w-0 max-w-[280px] items-center gap-3">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
            <img
              src={getAvatarSrc(m?.avatarUrl)}
              alt=""
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR_SRC;
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium text-slate-900">{m?.fullName ?? '—'}</div>
            <div className="truncate text-xs text-muted-foreground" title={sub}>
              {sub}
            </div>
          </div>
        </div>
      );
    },
  },
  {
    id: 'borrowDate',
    header: 'Ngày mượn',
    cell: ({ row }) => {
      const createdAt = row.original.createdAt;
      if (!createdAt) return '—';
      const d = new Date(createdAt);
      return (
        <div>
          <div>{d.toLocaleDateString('vi-VN')}</div>
          <div className="text-xs text-muted-foreground">
            {d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      );
    },
  },
  {
    id: 'dueDate',
    header: 'Hạn trả',
    cell: ({ row }) => {
      const due = row.original.returnedDueDate;
      const status = row.original.status;
      const isOverdue = status === 'Overdue' || status === '4';
      const isReturned = status === 'Returned' || status === '3';
      return (
        <div>
          <div className="font-medium">{formatDate(due)}</div>
          <div
            className={`text-xs ${
              isOverdue ? 'text-red-500' : isReturned ? 'text-green-600' : 'text-muted-foreground'
            }`}
          >
            {formatTime(due)}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Trạng thái',
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${getBorrowingStatusColor(status)}`}
        >
          {getBorrowingStatusDisplay(status)}
        </span>
      );
    },
  },
  {
    id: 'actions',
    header: 'Thao tác',
    enableSorting: false,
    cell: ({ row }) => (
      <TableTextAction onClick={() => void onView(row.original)} />
    ),
  },
];

type OutletContext = {
  position?: string;
  createBorrowingOpen?: boolean;
  setCreateBorrowingOpen?: (open: boolean) => void;
};

type Props = {
  borrowedByMemberId?: number;
  standalone?: boolean;
};

export default function EquipmentsHistory({ borrowedByMemberId, standalone = false }: Props = {}) {
  const context = useOutletContext<OutletContext>();
  const location = useLocation();

  const [searchParams, setSearchParams] = useSearchParams();
  const searchValue = searchParams.get(QP_SEARCH) ?? '';
  const statusValue = searchParams.get(QP_STATUS) ?? undefined;
  const pageFromUrl = useMemo(() => parsePositiveInt(searchParams.get(QP_PAGE), 1), [searchParams]);

  const setQuery = useCallback(
    (updater: (next: URLSearchParams) => URLSearchParams) => {
      setSearchParams((prev) => updater(new URLSearchParams(prev)));
    },
    [setSearchParams],
  );

  const setSearchQuery = useCallback(
    (v: string) => {
      setQuery((next) => {
        const value = (v ?? '').trim();
        if (value) next.set(QP_SEARCH, value);
        else next.delete(QP_SEARCH);
        next.delete(QP_PAGE);
        return next;
      });
    },
    [setQuery],
  );

  const setStatusQuery = useCallback(
    (v: string | undefined) => {
      setQuery((next) => {
        if (v) next.set(QP_STATUS, v);
        else next.delete(QP_STATUS);
        next.delete(QP_PAGE);
        return next;
      });
    },
    [setQuery],
  );

  const resetFiltersQuery = useCallback(() => {
    setQuery((next) => {
      next.delete(QP_SEARCH);
      next.delete(QP_STATUS);
      next.delete(QP_PAGE);
      return next;
    });
  }, [setQuery]);

  const setPageQuery = useCallback(
    (p: number) => {
      setQuery((next) => {
        if (p && p > 1) next.set(QP_PAGE, String(p));
        else next.delete(QP_PAGE);
        return next;
      });
    },
    [setQuery],
  );

  const enabledFetch = context?.position !== 'header' && context?.position !== 'toolbar';
  const { data, loading, pageSize, totalItems, refetch } = useBorrowings({
    borrowedByMemberId,
    search: searchValue,
    status: statusValue,
    pageNumber: pageFromUrl,
    enabled: enabledFetch,
  });
  const [createOpenLocal, setCreateOpenLocal] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailBorrowing, setDetailBorrowing] = useState<BorrowingListItem | null>(
    null
  );
  const openDetailFromUrl = searchParams.get('openDetail');
  const borrowingIdFromUrl = searchParams.get('borrowingId');

  // Prevent: user closes detail, but URL params update async -> effect runs once more and re-opens.
  const skipNextAutoOpenRef = useRef(false);

  const closeDetailFromUrl = () => {
    skipNextAutoOpenRef.current = true;
    setDetailOpen(false);
    setDetailBorrowing(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('openDetail');
      next.delete('borrowingId');
      return next;
    });
  };

  const openCreate = context?.createBorrowingOpen ?? createOpenLocal;
  const setOpenCreate =
    context?.setCreateBorrowingOpen ?? setCreateOpenLocal;

  const handleView = async (item: BorrowingListItem) => {
    try {
      const full = await borrowingApi.getById(item.borrowingId);
      setDetailBorrowing(full);
      setDetailOpen(true);
    } catch {
      // eslint-disable-next-line no-console
      console.error('get borrowing detail error');
    }
  };

  const handleReturned = async () => {
    await refetch();
    if (!detailBorrowing?.borrowingId) return;
    try {
      const refreshed = await borrowingApi.getById(detailBorrowing.borrowingId);
      setDetailBorrowing(refreshed);
    } catch {
      // eslint-disable-next-line no-console
      console.error('refresh borrowing detail after return error');
    }
  };

  useEffect(() => {
    if (openDetailFromUrl !== '1') return;
    if (!borrowingIdFromUrl) return;
    if (skipNextAutoOpenRef.current) {
      skipNextAutoOpenRef.current = false;
      return;
    }

    const id = Number(borrowingIdFromUrl);
    if (!id || Number.isNaN(id)) return;

    if (detailOpen && detailBorrowing?.borrowingId === id) return;

    (async () => {
      try {
        const full = await borrowingApi.getById(id);
        setDetailBorrowing(full);
        setDetailOpen(true);
      } catch {
        // eslint-disable-next-line no-console
        console.error('get borrowing detail from url error');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    openDetailFromUrl,
    borrowingIdFromUrl,
    detailOpen,
    detailBorrowing?.borrowingId,
  ]);

  const isEquipmentManager = location.pathname.startsWith('/em/');
  const renderStandalone = standalone || (!context?.position && isEquipmentManager);

  if (context?.position === 'header') {
    if (!isEquipmentManager) return null;
    return (
      <Button
        className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white px-3 py-2 rounded-md"
        type="button"
        onClick={() => setOpenCreate(true)}
      >
        <Plus size={16} />
        Tạo phiếu mượn
      </Button>
    );
  }
  if (context?.position === 'toolbar') {
    return (
      <div className="flex gap-3 items-center">
        <HoverSearch
          placeholder="Tìm theo mô tả, ghi chú..."
          value={searchValue}
          onChange={(v) => setSearchQuery(v)}
        />
        <Select
          value={statusValue ?? 'all'}
          onValueChange={(v: string) => setStatusQuery(v === 'all' ? undefined : v)}
        >
          <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white w-[140px]">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            {BORROWING_STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="secondary"
          className="bg-white"
          onClick={resetFiltersQuery}
          type="button"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  const contentNode = (
    <>
      <BorrowingDetailSidebar
        open={detailOpen}
        onClose={closeDetailFromUrl}
        borrowing={detailBorrowing}
        onReturned={handleReturned}
        canManageReturn={isEquipmentManager}
      />
      <CreateBorrowingModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onCreated={() => {
          setOpenCreate(false);
          refetch();
        }}
      />
      <div className="relative h-full flex flex-col">
        {loading && (
          <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-md">
            <span className="text-sm text-muted-foreground">Đang tải...</span>
          </div>
        )}
        <DataTable
          columns={columns(handleView)}
          data={data}
          pageNumber={pageFromUrl}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={(page) => setPageQuery(page)}
          fillHeight
        />
      </div>
    </>
  );

  if (renderStandalone) {
    return (
      <div
        className="p-6 bg-[#f3f4f6] flex flex-col min-h-0 gap-3"
        style={{ height: 'var(--content-height, 100vh)' }}
      >
        <div className="shrink-0 bg-white flex justify-between items-center px-6 py-4 rounded-xl border shadow-sm">
          <div>
            <h2 className="text-xl font-semibold text-black">Phiếu mượn thiết bị</h2>
            <p className="text-xs text-gray-500">Quản lý phiếu mượn, theo dõi trạng thái trả thiết bị</p>
          </div>
          <Button
            className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white px-3 py-2 rounded-md"
            type="button"
            onClick={() => setOpenCreate(true)}
          >
            <Plus size={16} />
            Tạo phiếu mượn
          </Button>
        </div>

        <div className="shrink-0 px-6 py-2">
          <div className="flex gap-3 items-center justify-end">
            <HoverSearch
              placeholder="Tìm theo mô tả, ghi chú..."
              value={searchValue}
              onChange={(v) => setSearchQuery(v)}
            />
            <Select
              value={statusValue ?? 'all'}
              onValueChange={(v: string) => setStatusQuery(v === 'all' ? undefined : v)}
            >
              <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white w-[140px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {BORROWING_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="secondary"
              className="bg-white"
              onClick={resetFiltersQuery}
              type="button"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm px-6 py-4 flex-1 min-h-0">
          {contentNode}
        </div>
      </div>
    );
  }

  return contentNode;
}
