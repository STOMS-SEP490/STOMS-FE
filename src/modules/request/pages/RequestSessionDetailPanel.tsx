import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Clock, Calendar, MapPin, Hash, GraduationCap, Users } from 'lucide-react';
import { reservationApi, type ReservedEquipmentItem } from '../api/reservationApi';
import { ImageOff } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import type { RequestSessionSummary } from '../request';

export type SessionDetailProps = {
  session: RequestSessionSummary & {
    reservationId?: number | null;
    teamAssigned?: boolean;
  };
  requestCode: string;
  assignedTeamIds?: number[];
};

export default function RequestSessionDetailPanel({
  session,
  requestCode,
  assignedTeamIds,
}: SessionDetailProps) {
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
    <div className="space-y-4 text-sm">
      {/* Thông tin phiên — layout Figma: icon + label + value từng dòng */}
      <div className="rounded-2xl bg-white shadow-sm border border-gray-100">
        <div className="px-4 py-2.5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm">Thông tin phiên</h3>
        </div>
        <div className="px-4 py-3 space-y-3 text-sm">
          <div className="flex items-center gap-3 text-gray-600">
            <Clock className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-gray-500">Thời gian:</span>
            <span className="font-medium text-black">
              {dayjs(session.startAt).format('HH:mm')} - {dayjs(session.endAt).format('HH:mm')}
            </span>
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-gray-500">Ngày:</span>
            <span className="font-medium text-black">
              {dayjs(session.startAt).format('DD/MM/YYYY')}
            </span>
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-gray-500">Địa điểm:</span>
            <span className="font-medium text-black">
              {(session as RequestSessionSummary & { location?: string }).location || '—'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            <Hash className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-gray-500">Mã yêu cầu:</span>
            <span className="font-semibold text-sky-600">{requestCode}</span>
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            <GraduationCap className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-gray-500">Số lượng giảng viên:</span>
            <span className="font-medium text-black">
              {session.teachersRequired ?? '—'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            <Users className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-gray-500">Số lượng trợ giảng:</span>
            <span className="font-medium text-black">
              {session.tasRequired ?? '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Danh sách thiết bị mượn trước — Figma */}
      <div className="rounded-2xl bg-white shadow-sm border border-gray-100">
        <div className="px-4 py-2.5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm">Danh sách thiết bị mượn trước</h3>
        </div>
        <div className="px-4 py-3 space-y-2">
          {session.reservationId == null ? (
            <p className="text-xs text-gray-500">Chưa có thiết bị mượn trước cho phiên này.</p>
          ) : reservedLoading ? (
            <p className="text-xs text-gray-500">Đang tải danh sách thiết bị...</p>
          ) : reservedError ? (
            <p className="text-xs text-red-600">{reservedError}</p>
          ) : reservedEquipments.length === 0 ? (
            <p className="text-xs text-gray-500">Không có thiết bị nào trong danh sách mượn trước.</p>
          ) : (
            <ul className="space-y-2">
              {reservedEquipments.map((eq) => (
                <li
                  key={eq.equipmentId}
                  className="rounded-xl border border-gray-100 bg-gray-50/50 px-3 py-2 flex items-center gap-3"
                >
                <div className="w-10 h-10 rounded-md overflow-hidden bg-gray-50 flex-shrink-0 flex items-center justify-center">
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
                    <ImageOff className="w-5 h-5 text-gray-400" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-medium text-sm text-gray-900 truncate">
                        {eq.equipmentName || `Thiết bị #${eq.equipmentId}`}
                      </div>
                      <div className="text-xs text-gray-500">
                        Mã: {eq.equipmentCode || eq.equipmentId}
                      </div>
                    </div>
                    {eq.status && (
                      <Badge className="bg-gray-100 text-gray-700 text-[11px] flex-shrink-0">
                        {eq.status}
                      </Badge>
                    )}
                  </div>

                  <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-gray-500">
                    <span className="truncate">
                      Danh mục: {eq.categoryName || '—'}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        </div>
      </div>
    </div>
  );
}

