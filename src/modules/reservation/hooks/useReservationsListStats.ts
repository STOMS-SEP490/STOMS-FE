import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import reservationApi from '@/modules/reservation/api/reservationApi';
import { normalizeReservationPagedResponse } from '@/modules/reservation/utils/normalizeReservationResponse';

export type ReservationsListStats = {
  total: number;
  ongoing: number;
  upcoming: number;
  cancelled: number;
};

export function useReservationsListStats() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<ReservationsListStats>({
    total: 0,
    ongoing: 0,
    upcoming: 0,
    cancelled: 0,
  });

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      try {
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
                (st.isBefore(now) || st.isSame(now)) && (en.isAfter(now) || en.isSame(now));
              const isUpcoming = st.isAfter(now);
              if (isOngoing) ongoing += 1;
              else if (isUpcoming) upcoming += 1;
            }
          }
        }

        if (cancelled) return;
        setStats({
          total: totalRes.TotalItems ?? 0,
          ongoing,
          upcoming,
          cancelled: cancelledRes.TotalItems ?? 0,
        });
      } catch {
        // giữ 0
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return { loading, stats };
}
