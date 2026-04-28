import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Modal, message } from 'antd';
import { ExclamationCircleFilled } from '@ant-design/icons';
import { RotateCcw, Eye, Pencil, Trash2 } from 'lucide-react';
import HoverSearch from '@/shared/components/ui/search';
import { DataTable } from '@/shared/components/common/DataTable';
import { Button } from '@/shared/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import type { ColumnDef } from '@tanstack/react-table';
import reservationApi from '@/modules/reservation/api/reservationApi';
import type { ReservationDetail, ReservationListItem } from '@/modules/reservation/reservation.types';
import {
  normalizeReservationPagedResponse,
  normalizeReservationResponse,
} from '@/modules/reservation/utils/normalizeReservationResponse';
import { RESERVATION_STATUS, RESERVATION_STATUS_OPTIONS, getReservationStatusInfo } from '@/constants/status';
import ReservationDetailSidebar from './ReservationDetailSidebar';
import EditReservationModal from './EditReservationModal';

const PAGE_SIZE = 10;
const DEFAULT_AVATAR_SRC = '/img/ava.png';

function getAvatarSrc(src?: string | null) {
  return src && String(src).trim() ? String(src) : DEFAULT_AVATAR_SRC;
}

/** BE: chưa bắt đầu (StartAt > now) và user hiện tại là người tạo. */
function canDeleteReservationRow(
  item: ReservationListItem,
  currentMemberId: number | null,
): boolean {
  if (!item.StartAt || currentMemberId == null) return false;
  if (item.CreatedByMemberId == null || item.CreatedByMemberId !== currentMemberId) return false;
  return new Date(item.StartAt) > new Date();
}

export default function ReservationsManagement() {
  const [searchParams, setSearchParams] = useSearchParams();

  const openDetailFromUrl = searchParams.get('openDetail');
  const reservationIdFromUrl = searchParams.get('reservationId');

  const skipNextAutoOpenRef = useRef(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailReservation, setDetailReservation] = useState<ReservationDetail | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const [reservationIdSearch, setReservationIdSearchState] = useState('');
  const [statusFilter, setStatusFilterState] = useState<number | 'all'>('all');
  const [pageNumber, setPageNumber] = useState(1);

  // Kiểm tra xem có phải Equipment Manager không
  const isEquipmentManager = useMemo(() => {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return false;
      const roleId = Number(JSON.parse(raw).roleId);
      return roleId === 6; // ROLE_ID.EQUIPMENT_MANAGER = 6
    } catch {
      return false;
    }
  }, []);

  const setReservationIdSearch = useCallback((value: string) => {
    setReservationIdSearchState(value);
    setPageNumber(1);
  }, []);

  const setStatusFilter = useCallback((v: number | 'all') => {
    setStatusFilterState(v);
    setPageNumber(1);
  }, []);

  const resetFilters = useCallback(() => {
    setReservationIdSearchState('');
    setStatusFilterState('all');
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

  const statusFilterValue = undefined; // Backend không có Status field
  
  // Map statusFilter sang IsTemporarilyCancelledStatuses string
  const isTemporarilyCancelledStatuses = useMemo(() => {
    if (statusFilter === 'all') return undefined;
    if (statusFilter === RESERVATION_STATUS.PENDING) return 'null'; // Chưa xác nhận
    if (statusFilter === RESERVATION_STATUS.CONFIRMED) return 'false'; // Đã xác nhận
    if (statusFilter === RESERVATION_STATUS.REJECTED) return 'true'; // Từ chối
    return undefined;
  }, [statusFilter]);

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
          IsTemporarilyCancelledStatuses: isTemporarilyCancelledStatuses,
          Status: statusFilterValue,
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
  }, [reservationIdSearch, isTemporarilyCancelledStatuses, statusFilterValue, pageNumber]);

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

  const handleRowClick = useCallback((item: ReservationListItem) => {
    void handleView(item);
  }, [handleView]);

  const columns: ColumnDef<ReservationListItem>[] = useMemo(
    () => [
      {
        accessorKey: 'ReservationId',
        header: 'Mã đặt trước',
        cell: ({ row }) => <span className="font-medium text-[#1a7a99]">#{row.original.ReservationId}</span>,
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
                <div className="font-medium text-[#1a7a99] truncate">{u?.FullName ?? '—'}</div>
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
          if (!due) return '—';
          const d = new Date(due);
          if (Number.isNaN(d.getTime())) return '—';
          return (
            <div>
              <div className="font-semibold text-gray-900">{d.toLocaleDateString('vi-VN')}</div>
              <div className="text-xs text-muted-foreground">
                {d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </div>
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
                <span className="font-semibold tabular-nums text-gray-900">{totalNum}</span>
              );
            }
          }
          const list = r.EquipmentReservations;
          if (Array.isArray(list)) {
            return (
              <span className="font-semibold tabular-nums text-gray-900">{list.length}</span>
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
          const cancelled = row.original.IsTemporarilyCancelled;
          // Map IsTemporarilyCancelled sang status enum
          // true = Từ chối (3), false = Đã xác nhận (2), null/undefined = Chưa xác nhận (1)
          let mappedStatus: number;
          if (cancelled === true) {
            mappedStatus = RESERVATION_STATUS.REJECTED; // 3
          } else if (cancelled === false) {
            mappedStatus = RESERVATION_STATUS.CONFIRMED; // 2
          } else {
            mappedStatus = RESERVATION_STATUS.PENDING; // 1
          }
          
          const statusInfo = getReservationStatusInfo(mappedStatus);
          
          return (
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${statusInfo.className}`}>
              {statusInfo.label}
            </span>
          );
        },
      },
      // Chỉ hiển thị cột thao tác nếu KHÔNG phải Equipment Manager
      ...(!isEquipmentManager ? [{
        id: 'actions',
        header: () => <span className="block w-full text-center">Thao tác</span>,
        enableSorting: false,
        cell: ({ row }: { row: { original: ReservationListItem } }) => {
          const item = row.original;
          const canDelete = canDeleteReservationRow(item, currentMemberId);
          const canEdit = canDeleteReservationRow(item, currentMemberId); // Cùng điều kiện: chưa bắt đầu và là người tạo
          return (
            <div className="flex items-center justify-center gap-3">
              <span title="Xem">
                <Eye
                  size={16}
                  className="cursor-pointer text-gray-800"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleView(item);
                  }}
                />
              </span>
              <span title={canEdit ? 'Sửa' : 'Không thể sửa'}>
                <Pencil
                  size={16}
                  className={canEdit ? 'cursor-pointer text-blue-600' : 'cursor-not-allowed text-gray-300'}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (canEdit) void handleEditFromList(item);
                  }}
                />
              </span>
              <span title={canDelete ? 'Xóa' : 'Không thể xóa'}>
                <Trash2
                  size={16}
                  className={canDelete ? 'cursor-pointer text-red-500' : 'cursor-not-allowed text-gray-300'}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (canDelete) handleDelete(item);
                  }}
                />
              </span>
            </div>
          );
        },
      }] as ColumnDef<ReservationListItem>[] : []),
    ],
    [handleView, handleEditFromList, handleDelete, currentMemberId, isEquipmentManager],
  );

  // Fetch when filters change
  useEffect(() => {
    void fetchReservations();
  }, [fetchReservations]);

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
      <div className="mb-1 rounded-xl border bg-white px-6 py-4 shadow-sm">
        <h2 className="text-xl font-semibold text-[#1a7a99]">Đơn yêu cầu thiết bị</h2>
        <p className="text-xs text-slate-500">
          Quản lý đơn yêu cầu thiết bị trong hệ thống
        </p>
      </div>

      <div className="mb-1 px-6 py-2">
        <div className="flex items-center justify-end gap-3 flex-wrap">
          <HoverSearch
            placeholder="Tìm theo mã đặt trước..."
            value={reservationIdSearch}
            onChange={(value) => setReservationIdSearch(value)}
          />
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Select value={String(statusFilter)} onValueChange={(v) => setStatusFilter(v === 'all' ? 'all' : Number(v))}>
                <SelectTrigger className="w-[180px] gap-2 bg-white text-sm text-gray-500">
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  {RESERVATION_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={resetFilters}
              type="button"
              title="Đặt lại bộ lọc"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
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
            onRowClick={handleRowClick}
            fillHeight={false}
          />
        </div>
      </div>

      <ReservationDetailSidebar
        open={detailOpen}
        onClose={closeDetail}
        reservation={detailReservation}
        onEditReservation={detailReservation ? () => setEditOpen(true) : undefined}
        onEquipmentsApproved={async () => {
          if (detailReservation) {
            try {
              const updated = normalizeReservationResponse(
                await reservationApi.getById(detailReservation.ReservationId)
              );
              setDetailReservation(updated);
            } catch {
              // Ignore error, just don't update
            }
          }
          await fetchReservations();
        }}
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

