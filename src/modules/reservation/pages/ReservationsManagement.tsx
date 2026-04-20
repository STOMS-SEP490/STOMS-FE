import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { BookOpen, CheckCircle, Clock, Eye, Pencil, Trash2, XCircle } from 'lucide-react';
import { Modal, message } from 'antd';
import { ExclamationCircleFilled } from '@ant-design/icons';
import HoverSearch from '@/shared/components/ui/search';
import { DataTable } from '@/shared/components/common/DataTable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import type { ColumnDef } from '@tanstack/react-table';
import reservationApi from '@/modules/reservation/api/reservationApi';
import type { ReservationDetail, ReservationListItem } from '@/modules/reservation/reservation.types';
import {
  normalizeReservationPagedResponse,
  normalizeReservationResponse,
} from '@/modules/reservation/utils/normalizeReservationResponse';
import { useReservationsListStats } from '@/modules/reservation/hooks/useReservationsListStats';
import { StatCard } from '@/shared/components/common/StatCard';
import ReservationDetailSidebar from './ReservationDetailSidebar';
import EditReservationModal from './EditReservationModal';

const PAGE_SIZE = 10;
const DEFAULT_AVATAR_SRC = '/img/ava.png';

function getAvatarSrc(src?: string | null) {
  return src && String(src).trim() ? String(src) : DEFAULT_AVATAR_SRC;
}

/** Cùng cách tách ngày / giờ với bảng phiếu mượn (`EquipmentsHistory`). */
function formatDateOnly(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('vi-VN');
}

/** Cùng điều kiện với sidebar: chưa kết thúc và không ở trạng thái tạm hủy toàn bộ. */
function canEditReservationRow(item: ReservationListItem): boolean {
  if (!item.EndAt) return false;
  if (item.IsTemporarilyCancelled === true) return false;
  return dayjs(item.EndAt).isAfter(dayjs());
}

/** BE: chưa bắt đầu (StartAt > now) và user hiện tại là người tạo. */
function canDeleteReservationRow(
  item: ReservationListItem,
  currentMemberId: number | null,
): boolean {
  if (!item.StartAt || currentMemberId == null) return false;
  if (item.CreatedByMemberId == null || item.CreatedByMemberId !== currentMemberId) return false;
  return dayjs(item.StartAt).isAfter(dayjs());
}

export default function ReservationsManagement() {
  const { loading: loadingStats, stats: reservationsStats } = useReservationsListStats();

  const [searchParams, setSearchParams] = useSearchParams();

  const openDetailFromUrl = searchParams.get('openDetail');
  const reservationIdFromUrl = searchParams.get('reservationId');

  const skipNextAutoOpenRef = useRef(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailReservation, setDetailReservation] = useState<ReservationDetail | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const [reservationIdSearch, setReservationIdSearchState] = useState('');
  const [cancelFilter, setCancelFilterState] = useState<'all' | 'cancelled' | 'active'>('all');
  const [pageNumber, setPageNumber] = useState(1);

  const setReservationIdSearch = useCallback((value: string) => {
    setReservationIdSearchState(value);
    setPageNumber(1);
  }, []);

  const setCancelFilter = useCallback((v: 'all' | 'cancelled' | 'active') => {
    setCancelFilterState(v);
    setPageNumber(1);
  }, []);
  const [totalItems, setTotalItems] = useState(0);
  const [items, setItems] = useState<ReservationListItem[]>([]);
  const [loading, setLoading] = useState(false);

  const currentMemberId = useMemo(() => {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return null;
      const n = Number(JSON.parse(raw).memberId);
      return Number.isFinite(n) && n > 0 ? n : null;
    } catch {
      return null;
    }
  }, []);

  const isTemporarilyCancelled =
    cancelFilter === 'cancelled' ? true : cancelFilter === 'active' ? false : undefined;

  const closeDetail = useCallback(() => {
    skipNextAutoOpenRef.current = true;
    setEditOpen(false);
    setDetailOpen(false);
    setDetailReservation(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('openDetail');
      next.delete('reservationId');
      return next;
    });
  }, [setSearchParams]);

  const handleView = useCallback(async (item: ReservationListItem) => {
    try {
      const full = normalizeReservationResponse(await reservationApi.getById(item.ReservationId));
      setDetailReservation(full);
      setDetailOpen(true);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      message.error(msg || 'Không tải được chi tiết lịch sử đặt trước');
    }
  }, []);

  const handleEditFromList = useCallback(async (item: ReservationListItem) => {
    try {
      const full = normalizeReservationResponse(await reservationApi.getById(item.ReservationId));
      setDetailReservation(full);
      setDetailOpen(false);
      setEditOpen(true);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      message.error(msg || 'Không tải được đặt trước để chỉnh sửa');
    }
  }, []);

  const fetchReservations = useCallback(async () => {
    const rawReservationId = reservationIdSearch.trim();
    const parsedId = rawReservationId ? Number(rawReservationId) : undefined;
    const reservationId = parsedId && !Number.isNaN(parsedId) ? parsedId : undefined;

    setLoading(true);
    try {
      const res = normalizeReservationPagedResponse(
        await reservationApi.getFilter({
          ReservationId: reservationId,
          IsTemporarilyCancelled: isTemporarilyCancelled,
          PageNumber: pageNumber,
          PageSize: PAGE_SIZE,
        }),
      );

      setItems(res.Items ?? []);
      setTotalItems(res.TotalItems ?? 0);
    } catch (err: unknown) {
      console.error('fetchReservations error:', err);
      message.error('Không tải được danh sách lịch sử đặt trước');
      setItems([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [reservationIdSearch, isTemporarilyCancelled, pageNumber]);

  const handleDelete = useCallback(
    (item: ReservationListItem) => {
      if (!canDeleteReservationRow(item, currentMemberId)) return;
      Modal.confirm({
        title: 'Xác nhận xóa đặt trước',
        icon: <ExclamationCircleFilled className="text-rose-500" />,
        okText: 'Xóa',
        cancelText: 'Hủy',
        okButtonProps: {
          className: 'bg-rose-500 hover:bg-rose-600 border-0 text-white font-medium rounded-lg px-4 shadow-sm',
          style: { color: '#FFFFFF' },
        },
        content: `Đặt trước #${item.ReservationId} sẽ bị xóa vĩnh viễn. Bạn có chắc không?`,
        onOk: async () => {
          try {
            await reservationApi.remove(item.ReservationId);
            message.success('Đã xóa đặt trước.');
            setEditOpen(false);
            if (detailReservation?.ReservationId === item.ReservationId) {
              closeDetail();
            }
            await fetchReservations();
          } catch (err: unknown) {
            const e = err as Record<string, unknown>;
            const apiMessage =
              (typeof err === 'string' && err) ||
              (e?.message as string) ||
              (e?.detail as string) ||
              (e?.title as string) ||
              (e?.error as string) ||
              (typeof e?.data === 'object' &&
                e?.data &&
                typeof (e.data as Record<string, unknown>)?.message === 'string' &&
                (e.data as { message: string }).message) ||
              '';
            message.error(
              (typeof apiMessage === 'string' && apiMessage.trim()) ||
                'Không thể xóa đặt trước.',
            );
          }
        },
      });
    },
    [currentMemberId, detailReservation?.ReservationId, fetchReservations, closeDetail],
  );

  const columns: ColumnDef<ReservationListItem>[] = useMemo(
    () => [
      {
        accessorKey: 'ReservationId',
        header: 'Mã đặt trước',
        cell: ({ row }) => <span className="font-medium">#{row.original.ReservationId}</span>,
      },
      {
        id: 'createdBy',
        header: 'Người tạo',
        cell: ({ row }) => {
          const u = row.original.CreatedByUser;
          const email = u?.Email?.trim() || '';
          const sub =
            email ||
            (u?.Phone?.trim() ? u.Phone : u?.MemberId ? `ID #${u.MemberId}` : '—');
          return (
            <div className="flex items-center gap-3 min-w-0 max-w-[280px]">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                <img
                  src={getAvatarSrc(u?.AvatarUrl)}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR_SRC;
                  }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-slate-900 truncate">{u?.FullName ?? '—'}</div>
                <div className="text-xs text-muted-foreground truncate" title={sub}>
                  {sub}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        id: 'bookingAt',
        header: 'Ngày đặt',
        cell: ({ row }) => {
          const createdAt = row.original.StartAt ?? null;
          if (!createdAt) return '—';
          const d = new Date(createdAt);
          if (Number.isNaN(d.getTime())) return '—';
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
        id: 'dueAt',
        header: 'Hạn trả',
        cell: ({ row }) => {
          const due = row.original.EndAt ?? null;
          const cancelled = row.original.IsTemporarilyCancelled === true;
          const start = row.original.StartAt ? dayjs(row.original.StartAt) : null;
          const end = due ? dayjs(due) : null;
          const now = dayjs();

          let subLine: string;
          let subClass: string;
          if (cancelled) {
            subLine = 'Tạm hủy';
            subClass = 'text-red-500';
          } else if (end && end.isBefore(now)) {
            subLine = 'Đã kết thúc';
            subClass = 'text-green-600';
          } else if (start && start.isAfter(now)) {
            subLine = 'Chưa bắt đầu';
            subClass = 'text-muted-foreground';
          } else {
            subLine = 'Chưa đến hạn';
            subClass = 'text-muted-foreground';
          }

          return (
            <div>
              <div className="font-medium">{formatDateOnly(due)}</div>
              <div className={`text-xs ${subClass}`}>{subLine}</div>
            </div>
          );
        },
      },
      {
        id: 'equipmentCount',
        header: 'Số thiết bị',
        cell: ({ row }) => {
          const r = row.original;
          const totalRaw = r.TotalEquipments;
          if (totalRaw != null) {
            const totalNum = Number(totalRaw);
            if (Number.isFinite(totalNum) && totalNum >= 0) {
              return (
                <span className="font-medium tabular-nums text-slate-900">{totalNum}</span>
              );
            }
          }
          const list = r.EquipmentReservations;
          if (Array.isArray(list)) {
            return (
              <span className="font-medium tabular-nums text-slate-900">{list.length}</span>
            );
          }
          return (
            <span className="text-sm text-muted-foreground" title="Chưa có dữ liệu số lượng">
              —
            </span>
          );
        },
      },
      {
        id: 'cancel',
        header: 'Trạng thái',
        cell: ({ row }) => {
          const v = row.original.IsTemporarilyCancelled;
          if (v == null) {
            return (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                —
              </span>
            );
          }
          if (v) {
            return (
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-600">
                Tạm hủy
              </span>
            );
          }
          return (
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              Đang hoạt động
            </span>
          );
        },
      },
      {
        id: 'actions',
        header: 'Thao tác',
        enableSorting: false,
        cell: ({ row }) => {
          const item = row.original;
          const canEdit = canEditReservationRow(item);
          const canDelete = canDeleteReservationRow(item, currentMemberId);
          return (
            <div className="flex items-center gap-3">
              <Eye
                size={16}
                className="text-black cursor-pointer shrink-0"
                onClick={() => void handleView(item)}
                aria-label="Xem chi tiết"
              />
              <span
                title={
                  canEdit
                    ? 'Sửa'
                    : item.IsTemporarilyCancelled === true
                      ? 'Không sửa khi đặt trước đang tạm hủy'
                      : 'Không sửa khi đã kết thúc'
                }
              >
                <Pencil
                  size={16}
                  className={
                    canEdit
                      ? 'text-blue-600 cursor-pointer shrink-0'
                      : 'text-gray-300 cursor-not-allowed shrink-0'
                  }
                  onClick={() => {
                    if (!canEdit) return;
                    void handleEditFromList(item);
                  }}
                  aria-label="Sửa đặt trước"
                />
              </span>
              <span
                title={
                  canDelete
                    ? 'Xóa'
                    : currentMemberId == null || item.CreatedByMemberId !== currentMemberId
                      ? 'Chỉ người tạo mới được xóa'
                      : 'Không xóa khi đặt trước đã bắt đầu'
                }
              >
                <Trash2
                  size={16}
                  className={
                    canDelete
                      ? 'text-red-500 cursor-pointer shrink-0'
                      : 'text-red-300 cursor-not-allowed shrink-0'
                  }
                  onClick={() => {
                    if (!canDelete) return;
                    handleDelete(item);
                  }}
                  aria-label="Xóa đặt trước"
                />
              </span>
            </div>
          );
        },
      },
    ],
    [handleView, handleEditFromList, handleDelete, currentMemberId],
  );

  const statCards = useMemo(
    () => [
      {
        icon: <BookOpen />,
        label: 'Tổng đặt trước',
        value: loadingStats ? '—' : reservationsStats.total,
        sub: '',
        variant: 'blue' as const,
      },
      {
        icon: <CheckCircle />,
        label: 'Đang diễn ra',
        value: loadingStats ? '—' : reservationsStats.ongoing,
        sub: '',
        variant: 'green' as const,
      },
      {
        icon: <Clock />,
        label: 'Sắp diễn ra',
        value: loadingStats ? '—' : reservationsStats.upcoming,
        sub: '',
        variant: 'orange' as const,
      },
      {
        icon: <XCircle />,
        label: 'Tạm hủy',
        value: loadingStats ? '—' : reservationsStats.cancelled,
        sub: '',
        variant: 'rose' as const,
      },
    ],
    [loadingStats, reservationsStats],
  );

  // Debounce for reservationId search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchReservations();
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [reservationIdSearch, cancelFilter, pageNumber, fetchReservations]);

  useEffect(() => {
    if (openDetailFromUrl !== '1') return;
    if (!reservationIdFromUrl) return;
    if (skipNextAutoOpenRef.current) {
      skipNextAutoOpenRef.current = false;
      return;
    }

    const reservationId = Number(reservationIdFromUrl);
    if (!reservationId || Number.isNaN(reservationId)) return;
    if (detailOpen && detailReservation?.ReservationId === reservationId) return;

    (async () => {
      try {
        const full = normalizeReservationResponse(await reservationApi.getById(reservationId));
        setDetailReservation(full);
        setDetailOpen(true);
      } catch {
        message.error('Không tải được chi tiết lịch sử đặt trước');
      }
    })();
  }, [openDetailFromUrl, reservationIdFromUrl, detailOpen, detailReservation?.ReservationId]);

  return (
    <div
      className="space-y-6 p-6 pl-8 app-page-bg"
      style={{ minHeight: 'var(--content-height, 100vh)' }}
    >
      <div className="mb-2 rounded-xl border bg-white px-6 py-4 shadow-sm">
        <h2 className="text-xl font-semibold text-[#1a7a99]">Đơn yêu cầu thiết bị</h2>
        <p className="text-xs text-slate-500">
          Quản lý đơn yêu cầu thiết bị trong hệ thống
        </p>
      </div>

      <div className="mb-0 grid grid-cols-4 gap-4">
        {statCards.map((c) => (
          <StatCard
            key={c.label}
            icon={c.icon}
            label={c.label}
            value={c.value}
            sub={c.sub}
            variant={c.variant}
          />
        ))}
      </div>

      <div className="mb-1 px-6 py-2">
        <div className="flex items-center justify-end gap-3 flex-wrap">
          <div className="[&>div]:bg-[#2197C0] [&>div]:hover:bg-[#208AAE] [&>div]:border-[#2197C0] [&_svg]:text-white [&_svg]:stroke-[2.5] [&_input]:text-white [&_input]:font-medium [&_input::placeholder]:text-white/80 [&_input::placeholder]:font-medium">
            <HoverSearch
              placeholder="Tìm theo mã đặt trước..."
              value={reservationIdSearch}
              onChange={(value) => setReservationIdSearch(value)}
            />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 whitespace-nowrap shrink-0">Trạng thái</span>
              <Select value={cancelFilter} onValueChange={(v) => setCancelFilter(v as typeof cancelFilter)}>
                <SelectTrigger className="w-[180px] gap-2 bg-white text-sm text-gray-500">
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="active">Đang hoạt động</SelectItem>
                  <SelectItem value="cancelled">Tạm hủy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="relative rounded-xl border bg-white px-6 py-4 shadow-sm">
        {loading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/60">
            <span className="text-sm text-muted-foreground">Đang tải...</span>
          </div>
        ) : null}
        <div className="space-y-4 pt-1">
          <DataTable
            columns={columns}
            data={items}
            pageNumber={pageNumber}
            pageSize={PAGE_SIZE}
            totalItems={totalItems}
            onPageChange={(p) => setPageNumber(p)}
            fillHeight={false}
          />
        </div>
      </div>

      <ReservationDetailSidebar
        open={detailOpen}
        onClose={closeDetail}
        reservation={detailReservation}
        onEditReservation={detailReservation ? () => setEditOpen(true) : undefined}
      />

      <EditReservationModal
        open={editOpen}
        reservation={detailReservation}
        onClose={() => setEditOpen(false)}
        onSaved={async (updated) => {
          setDetailReservation(updated);
          await fetchReservations();
        }}
      />
    </div>
  );
}

