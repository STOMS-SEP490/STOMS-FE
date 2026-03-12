import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { reservationApi, type ReservedEquipmentItem } from '../api/reservationApi';
import type { RequestSessionSummary } from '../request';

export type SessionDetailProps = {
  session: RequestSessionSummary & {
    reservationId?: number | null;
    teamAssigned?: boolean;
  };
  requestCode: string;
};

export default function RequestSessionDetailPanel({ session, requestCode }: SessionDetailProps) {
  const [reservedEquipments, setReservedEquipments] = useState<ReservedEquipmentItem[]>([]);
  const [reservedLoading, setReservedLoading] = useState(false);
  const [reservedError, setReservedError] = useState<string | null>(null);

  useEffect(() => {
    if (!session.reservationId) {
      setReservedEquipments([]);
      return;
    }
    const fetchReserved = async () => {
      setReservedLoading(true);
      setReservedError(null);
      try {
        const detail = await reservationApi.getById(session.reservationId!);
        setReservedEquipments(detail.equipment);
      } catch (err: unknown) {
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Không tải được thiết bị đã đặt trước.';
        setReservedError(msg);
        setReservedEquipments([]);
      } finally {
        setReservedLoading(false);
      }
    };
    void fetchReserved();
  }, [session.reservationId]);

  return (
    <div className="space-y-4 text-xs">
      <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 bg-gray-50 rounded-xl p-3">
        <div>
          <p className="text-[11px] text-gray-400">Mã yêu cầu</p>
          <p className="font-medium text-black">{requestCode}</p>
        </div>
        <div>
          <p className="text-[11px] text-gray-400">Trạng thái phiên</p>
          <p className="font-medium text-black capitalize">{session.status?.toLowerCase()}</p>
        </div>
        <div>
          <p className="text-[11px] text-gray-400">Ngày</p>
          <p className="font-medium text-black">
            {dayjs(session.startAt).format('DD/MM/YYYY')}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-gray-400">Thời gian</p>
          <p className="font-medium text-black">
            {dayjs(session.startAt).format('HH:mm')} - {dayjs(session.endAt).format('HH:mm')}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-gray-400">Số lượng GV/TA yêu cầu</p>
          <p className="font-medium text-black">
            GV: {session.teachersRequired ?? 1}, TA: {session.tasRequired ?? 1}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-gray-400">Team phụ trách</p>
          <p className="font-medium text-black">
            {session.teamAssigned ? 'Đã có đội phụ trách' : 'Chưa gán đội'}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
        <p className="text-[11px] font-semibold text-gray-700">Thiết bị đã đặt trước</p>
        {session.reservationId == null ? (
          <p className="text-[11px] text-gray-500">Chưa có đặt trước thiết bị cho phiên này.</p>
        ) : reservedLoading ? (
          <p className="text-[11px] text-gray-500">Đang tải danh sách thiết bị...</p>
        ) : reservedError ? (
          <p className="text-[11px] text-red-600">{reservedError}</p>
        ) : reservedEquipments.length === 0 ? (
          <p className="text-[11px] text-gray-500">Không có thiết bị nào trong đặt trước.</p>
        ) : (
          <ul className="space-y-1.5">
            {reservedEquipments.map((eq) => (
              <li key={eq.equipmentId} className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
                  {eq.imgLink ? (
                    <img
                      src={eq.imgLink}
                      alt={eq.equipmentName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-[10px] text-gray-400">No</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-gray-800 truncate">{eq.equipmentName}</p>
                  <p className="text-[10px] text-gray-500 truncate">
                    {eq.equipmentCode} · {eq.categoryName || '---'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

