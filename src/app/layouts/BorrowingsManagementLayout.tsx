import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { GraduationCap, CheckCircle, BookOpen, Clock, XCircle } from 'lucide-react';
import dayjs from 'dayjs';
import { StatCard } from '@/shared/components/common/StatCard';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import borrowingApi from '@/modules/equipment/api/borrowingApi';
import reservationApi from '@/modules/reservation/api/reservationApi';
import { normalizeReservationPagedResponse } from '@/modules/reservation/utils/normalizeReservationResponse';

type OutletContext = {
  position?: string;
  createBorrowingOpen?: boolean;
  setCreateBorrowingOpen?: (open: boolean) => void;
  hideSectionTitle?: boolean;
};

export default function BorrowingsManagementLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [createBorrowingOpen, setCreateBorrowingOpen] = useState(false);

  const isEquipmentManager = location.pathname.startsWith('/em/');
  const basePath = isEquipmentManager ? '/em/borrowings' : '/manager/borrowings';

  const currentTab: 'reservations' | 'borrowings' = location.pathname.includes('/reservations')
    ? 'reservations'
    : 'borrowings';

  const isReservationsTab = currentTab === 'reservations';

  const [loadingStats, setLoadingStats] = useState(false);
  const [borrowingsStats, setBorrowingsStats] = useState({
    total: 0,
    active: 0,
    returned: 0,
    overdue: 0,
  });
  const [reservationsStats, setReservationsStats] = useState({
    total: 0,
    ongoing: 0,
    upcoming: 0,
    cancelled: 0,
  });

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoadingStats(true);
      try {
        if (isReservationsTab) {
          const now = dayjs();

          const [totalResRaw, cancelledResRaw] = await Promise.all([
            reservationApi.getFilter({ PageNumber: 1, PageSize: 1 }),
            reservationApi.getFilter({
              PageNumber: 1,
              PageSize: 1,
              IsTemporarilyCancelled: true,
            }),
          ]);

          const totalRes = normalizeReservationPagedResponse(totalResRaw);
          const cancelledRes = normalizeReservationPagedResponse(cancelledResRaw);

          let ongoing = 0;
          let upcoming = 0;

          // Lấy toàn bộ reservations chưa tạm hủy để tự phân loại "đang diễn ra" / "sắp diễn ra".
          const activeTotal = Math.max(
            0,
            (totalRes.TotalItems ?? 0) - (cancelledRes.TotalItems ?? 0),
          );
          if (activeTotal > 0) {
            const pageSize = 200;
            const totalPages = Math.ceil(activeTotal / pageSize);
            for (let p = 1; p <= totalPages; p++) {
              const pageResRaw = await reservationApi.getFilter({
                PageNumber: p,
                PageSize: pageSize,
                IsTemporarilyCancelled: false,
              });
              const pageRes = normalizeReservationPagedResponse(pageResRaw);
              const items = pageRes.Items ?? [];

              for (const r of items) {
                if (!r.StartAt || !r.EndAt) continue;
                const st = dayjs(r.StartAt);
                const en = dayjs(r.EndAt);
                if (!st.isValid() || !en.isValid()) continue;

                const isOngoing =
                  (st.isBefore(now) || st.isSame(now)) &&
                  (en.isAfter(now) || en.isSame(now));
                const isUpcoming = st.isAfter(now);
                if (isOngoing) ongoing += 1;
                else if (isUpcoming) upcoming += 1;
              }
            }
          }

          if (cancelled) return;
          setReservationsStats({
            total: totalRes.TotalItems ?? 0,
            ongoing,
            upcoming,
            cancelled: cancelledRes.TotalItems ?? 0,
          });
        } else {
          const [totalRaw, borrowedRaw, partialRaw, returnedRaw, overdueRaw] =
            await Promise.all([
              borrowingApi.getBorrowings({ pageNumber: 1, pageSize: 1 }),
              borrowingApi.getBorrowings({
                pageNumber: 1,
                pageSize: 1,
                status: 'Borrowed',
              }),
              borrowingApi.getBorrowings({
                pageNumber: 1,
                pageSize: 1,
                status: 'PartialReturned',
              }),
              borrowingApi.getBorrowings({
                pageNumber: 1,
                pageSize: 1,
                status: 'Returned',
              }),
              borrowingApi.getBorrowings({
                pageNumber: 1,
                pageSize: 1,
                status: 'Overdue',
              }),
            ]);

          if (cancelled) return;
          setBorrowingsStats({
            total: totalRaw.totalItems ?? 0,
            active: (borrowedRaw.totalItems ?? 0) + (partialRaw.totalItems ?? 0),
            returned: returnedRaw.totalItems ?? 0,
            overdue: overdueRaw.totalItems ?? 0,
          });
        }
      } catch {
        // Fallback: giữ giá trị 0 để UI vẫn render được.
      } finally {
        if (!cancelled) setLoadingStats(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [isReservationsTab]);

  const cards = useMemo(() => {
    if (isReservationsTab) {
      return [
        {
          icon: <BookOpen />,
          label: 'Tổng đặt trước',
          value: loadingStats ? '—' : reservationsStats.total,
          sub: 'Đặt trước (lịch sử)',
          variant: 'blue',
        },
        {
          icon: <CheckCircle />,
          label: 'Đang diễn ra',
          value: loadingStats ? '—' : reservationsStats.ongoing,
          sub: 'StartAt..EndAt (chưa tạm hủy)',
          variant: 'green',
        },
        {
          icon: <Clock />,
          label: 'Sắp diễn ra',
          value: loadingStats ? '—' : reservationsStats.upcoming,
          sub: 'StartAt > hiện tại',
          variant: 'orange',
        },
        {
          icon: <XCircle />,
          label: 'Tạm hủy',
          value: loadingStats ? '—' : reservationsStats.cancelled,
          sub: 'IsTemporarilyCancelled = true',
          variant: 'rose',
        },
      ];
    }

    return [
      {
        icon: <GraduationCap />,
        label: 'Tổng phiếu mượn',
        value: loadingStats ? '—' : borrowingsStats.total,
        sub: 'Phiếu mượn (lịch sử)',
        variant: 'blue',
      },
      {
        icon: <CheckCircle />,
        label: 'Đang hoạt động',
        value: loadingStats ? '—' : borrowingsStats.active,
        sub: 'Borrowed + PartialReturned',
        variant: 'green',
      },
      {
        icon: <BookOpen />,
        label: 'Đã trả',
        value: loadingStats ? '—' : borrowingsStats.returned,
        sub: 'Returned',
        variant: 'violet',
      },
      {
        icon: <Clock />,
        label: 'Phiếu quá hạn',
        value: loadingStats ? '—' : borrowingsStats.overdue,
        sub: 'Overdue',
        variant: 'amber',
      },
    ];
  }, [borrowingsStats, isReservationsTab, loadingStats, reservationsStats]);

  return (
    <div className="p-6 space-y-6 bg-[#f3f4f6]" style={{ minHeight: 'var(--content-height, 100vh)' }}>
      <div className="bg-white flex justify-between items-center px-6 py-4 mb-2 rounded-xl border shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-black">Phiếu mượn &amp; đặt trước</h2>
          <p className="text-xs text-gray-500">
            Quản lý phiếu mượn thiết bị và lịch đặt trước trong hệ thống
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <Outlet
            context={
              {
                position: 'header',
                createBorrowingOpen,
                setCreateBorrowingOpen,
              } as OutletContext
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-0">
        {cards.map((c) => (
          <StatCard
            key={c.label}
            icon={c.icon}
            label={c.label}
            value={c.value}
            sub={c.sub}
            variant={c.variant as any}
          />
        ))}
      </div>

      <div className="px-6 py-2 mb-1">
        <div className="flex items-center justify-between">
          <Tabs value={currentTab}>
            <TabsList>
              <TabsTrigger value="borrowings" onClick={() => navigate(basePath)}>
                PHIẾU MƯỢN
              </TabsTrigger>
              <TabsTrigger value="reservations" onClick={() => navigate(`${basePath}/reservations`)}>
                ĐẶT TRƯỚC
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Outlet
            context={
              {
                position: 'toolbar',
                createBorrowingOpen,
                setCreateBorrowingOpen,
              } as OutletContext
            }
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm px-6 py-4">
        <Outlet
          context={
            {
              position: 'content',
              createBorrowingOpen,
              setCreateBorrowingOpen,
              hideSectionTitle: true,
            } as OutletContext
          }
        />
      </div>
    </div>
  );
}
