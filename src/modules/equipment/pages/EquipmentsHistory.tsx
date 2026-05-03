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
import type { BorrowingListItem } from '@/modules/equipment/borrowing';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, RotateCcw } from 'lucide-react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useBorrowings } from '../hooks/useBorrowings';
import {
  BORROWING_STATUS_OPTIONS,
  getBorrowingStatusDisplay,
  getBorrowingStatusColor,
} from '@/constants/borrowing';
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
  embedded: boolean,
  /** Chỉ bật trên /manager/borrowings (không embedded) */
  brandBorrowerName: boolean,
): ColumnDef<BorrowingListItem>[] => [
  {
    accessorKey: 'borrowingId',
    header: 'Mã phiếu',
    cell: ({ row }) => (
      <span className="font-semibold text-[#1a7a99]">#{row.original.borrowingId}</span>
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
            <div
              className={
                embedded || (!embedded && brandBorrowerName)
                  ? 'truncate font-medium text-[#1a7a99]'
                  : 'truncate font-medium text-slate-900'
              }
            >
              {m?.fullName ?? '—'}
            </div>
            <div className="truncate text-xs text-muted-foreground" title={sub}>
              {sub}
            </div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'description',
    header: 'Mô tả',
    cell: ({ row }) => (
      <div className="max-w-[200px]">
        <span className="text-sm text-slate-700 line-clamp-2" title={row.original.description || undefined}>
          {row.original.description?.trim() || '—'}
        </span>
      </div>
    ),
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
];

type Props = {
  borrowedByMemberId?: number;
  /** Trang đầy đủ (manager / EM route). */
  standalone?: boolean;
  /** Chèn trong tab (vd. thành viên): chỉ bảng, không header / thống kê / bộ lọc. */
  embedded?: boolean;
};

export default function EquipmentsHistory({
  borrowedByMemberId,
  standalone = false,
  embedded = false,
}: Props = {}) {
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

  const { data, loading, pageSize, totalItems, refetch } = useBorrowings({
    borrowedByMemberId,
    search: searchValue,
    status: statusValue,
    pageNumber: pageFromUrl,
  });
  const [createOpen, setCreateOpen] = useState(false);
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
  const showFullShell = !embedded && (standalone || !borrowedByMemberId);
  const brandBorrowerNameOnPage =
    !embedded && location.pathname.startsWith('/manager/borrowings');

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
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
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
          columns={columns(embedded, brandBorrowerNameOnPage)}
          data={data}
          pageNumber={pageFromUrl}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={(page) => setPageQuery(page)}
          onRowClick={handleView}
          fillHeight
        />
      </div>
    </>
  );

  if (!showFullShell) {
    return contentNode;
  }

  return (
    <div
      className="space-y-6 p-6 app-page-bg"
      style={{ minHeight: 'var(--content-height, 100vh)' }}
    >
      <div className="mb-2 flex items-center justify-between rounded-xl border bg-white px-6 py-4 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-[#1a7a99]">Phiếu mượn thiết bị</h2>
          <p className="text-xs text-slate-500">
            Quản lý phiếu mượn, theo dõi trạng thái trả thiết bị
          </p>
        </div>
        {isEquipmentManager ? (
          <Button
            className="gap-2 rounded-md bg-[#2197C0] px-3 py-2 text-white hover:bg-[#208AAE]"
            type="button"
            onClick={() => setCreateOpen(true)}
          >
            <Plus size={16} />
            Tạo phiếu mượn
          </Button>
        ) : null}
      </div>


      <div className="mb-1 px-6 py-2">
        <div className="flex items-center justify-end gap-3 flex-wrap">
          <HoverSearch
            placeholder="Tìm theo mô tả..."
            value={searchValue}
            onChange={(v) => setSearchQuery(v)}
          />
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Select
                value={statusValue ?? 'all'}
                onValueChange={(v: string) => setStatusQuery(v === 'all' ? undefined : v)}
              >
                <SelectTrigger className="w-[180px] gap-2 bg-white text-sm text-gray-500">
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  {BORROWING_STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 bg-white border-slate-200 text-gray-600 hover:bg-gray-50" onClick={resetFiltersQuery} type="button" title="Đặt lại bộ lọc">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white px-6 py-4 shadow-sm">
        {contentNode}
      </div>
    </div>
  );
}
