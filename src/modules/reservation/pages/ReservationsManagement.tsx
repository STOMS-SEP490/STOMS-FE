import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import HoverSearch from '@/shared/components/ui/search';
import { DataTable } from '@/shared/components/common/DataTable';
import { TableTextAction } from '@/shared/components/common/TableTextAction';
import { Badge } from '@/shared/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import type { ColumnDef } from '@tanstack/react-table';
import { message } from 'antd';
import reservationApi from '@/modules/request/api/reservationApi';
import type { ReservationListItem, ReservationDetail } from '@/modules/request/type';
import ReservationDetailSidebar from './ReservationDetailSidebar';

type OutletContext = {
  position?: string;
};

const PAGE_SIZE = 10;

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN');
}

export default function ReservationsManagement() {
  const context = useOutletContext<OutletContext>();

  const [searchParams, setSearchParams] = useSearchParams();

  const openDetailFromUrl = searchParams.get('openDetail');
  const reservationIdFromUrl = searchParams.get('reservationId');

  const skipNextAutoOpenRef = useRef(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailReservation, setDetailReservation] = useState<ReservationDetail | null>(null);

  const [reservationIdSearch, setReservationIdSearch] = useState('');
  const [cancelFilter, setCancelFilter] = useState<'all' | 'cancelled' | 'active'>('all');

  const [pageNumber, setPageNumber] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [items, setItems] = useState<ReservationListItem[]>([]);
  const [loading, setLoading] = useState(false);

  const isTemporarilyCancelled =
    cancelFilter === 'cancelled' ? true : cancelFilter === 'active' ? false : undefined;

  const closeDetail = () => {
    skipNextAutoOpenRef.current = true;
    setDetailOpen(false);
    setDetailReservation(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('openDetail');
      next.delete('reservationId');
      return next;
    });
  };

  const handleView = useCallback(async (item: ReservationListItem) => {
    try {
      const full = await reservationApi.getById(item.reservationId);
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

  const columns: ColumnDef<ReservationListItem>[] = useMemo(
    () => [
      {
        accessorKey: 'reservationId',
        header: 'Mã đặt trước',
        cell: ({ row }) => <span className="font-medium">#{row.original.reservationId}</span>,
      },
      {
        id: 'createdBy',
        header: 'Người tạo',
        cell: ({ row }) => {
          const u = row.original.createdByUser;
          return (
            <div>
              <div className="font-medium text-black">{u?.fullName ?? '—'}</div>
              <div className="text-xs text-muted-foreground">
                {u?.phone ?? (u?.memberId ? `ID #${u.memberId}` : '—')}
              </div>
            </div>
          );
        },
      },
      {
        id: 'startAt',
        header: 'Thời gian',
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{formatDate(row.original.startAt)}</div>
            <div className="text-xs text-muted-foreground">Đến: {formatDate(row.original.endAt)}</div>
          </div>
        ),
      },
      {
        accessorKey: 'equipmentCount',
        header: 'Thiết bị',
        cell: ({ row }) => <span className="font-medium">{row.original.equipmentCount}</span>,
      },
      {
        id: 'cancel',
        header: 'Trạng thái',
        cell: ({ row }) => (
          <span className="flex items-center">
            {row.original.isTemporarilyCancelled == null ? (
              <Badge className="bg-gray-100 text-gray-700 text-[11px]">—</Badge>
            ) : row.original.isTemporarilyCancelled ? (
              <Badge className="bg-red-50 text-red-700 border border-red-100 text-[11px]">Tạm hủy</Badge>
            ) : (
              <Badge className="bg-green-50 text-green-700 border border-green-100 text-[11px]">
                Đang hoạt động
              </Badge>
            )}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Thao tác',
        enableSorting: false,
        cell: ({ row }) => <TableTextAction onClick={() => void handleView(row.original)} />,
      },
    ],
    [handleView],
  );

  // Fetch list (simple local state; reservation filter endpoint supports paging)
  const fetchReservations = async () => {
    const rawReservationId = reservationIdSearch.trim();
    const parsedId = rawReservationId ? Number(rawReservationId) : undefined;
    const reservationId = parsedId && !Number.isNaN(parsedId) ? parsedId : undefined;

    setLoading(true);
    try {
      const res = await reservationApi.getFilter({
        reservationId,
        isTemporarilyCancelled,
        pageNumber,
        pageSize: PAGE_SIZE,
      });

      setItems(res.items ?? []);
      setTotalItems(res.totalItems ?? 0);
    } catch (err: unknown) {
      console.error('fetchReservations error:', err);
      message.error('Không tải được danh sách lịch sử đặt trước');
      setItems([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  // Debounce for reservationId search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (context?.position === 'header' || context?.position === 'toolbar') return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchReservations();
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context?.position, reservationIdSearch, cancelFilter, pageNumber]);

  useEffect(() => {
    if (context?.position === 'header' || context?.position === 'toolbar') return;
    if (openDetailFromUrl !== '1') return;
    if (!reservationIdFromUrl) return;
    if (skipNextAutoOpenRef.current) {
      skipNextAutoOpenRef.current = false;
      return;
    }

    const reservationId = Number(reservationIdFromUrl);
    if (!reservationId || Number.isNaN(reservationId)) return;
    if (detailOpen && detailReservation?.reservationId === reservationId) return;

    (async () => {
      try {
        const full = await reservationApi.getById(reservationId);
        setDetailReservation(full);
        setDetailOpen(true);
      } catch {
        message.error('Không tải được chi tiết lịch sử đặt trước');
      }
    })();
  }, [context?.position, openDetailFromUrl, reservationIdFromUrl, detailOpen, detailReservation?.reservationId]);

  // Layout regions: header / toolbar / content
  if (context?.position === 'header') return null;

  if (context?.position === 'toolbar') {
    return (
      <div className="flex gap-3 items-center">
        <HoverSearch
          placeholder="Tìm theo mã đặt trước..."
          value={reservationIdSearch}
          onChange={(value) => {
            setReservationIdSearch(value);
            setPageNumber(1);
          }}
        />
        <Select
          value={cancelFilter}
          onValueChange={(v) => {
            setCancelFilter(v as typeof cancelFilter);
            setPageNumber(1);
          }}
        >
          <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white w-[190px]">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="active">Đang hoạt động</SelectItem>
            <SelectItem value="cancelled">Tạm hủy</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-black">Lịch sử đặt trước</h3>
      </div>

      <div className="pt-1">
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

      {loading ? (
        <div className="text-xs text-muted-foreground">Đang tải...</div>
      ) : null}

      <ReservationDetailSidebar open={detailOpen} onClose={closeDetail} reservation={detailReservation} />
    </div>
  );
}

