import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Calendar, Clock, GraduationCap, Hash, MapPin, Users } from 'lucide-react';
import type { RequestSessionSummary } from '../request';
import { attendanceApi, type Attendance } from '@/modules/attendance/api/attendanceApi';

export type TeamLeaderSessionDetailPanelProps = {
  session: RequestSessionSummary;
  requestCode: string;
};

export default function TeamLeaderSessionDetailPanel({
  session,
  requestCode,
}: TeamLeaderSessionDetailPanelProps) {
  const [attLoading, setAttLoading] = useState(false);
  const [attError, setAttError] = useState<string | null>(null);
  const [attendances, setAttendances] = useState<Attendance[]>([]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setAttLoading(true);
        setAttError(null);
        setAttendances([]);

        const res = await attendanceApi.getBySession(session.sessionId);
        if (cancelled) return;
        setAttendances(res.items ?? []);
      } catch (err: unknown) {
        if (cancelled) return;
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Không tải được danh sách member tham dự.';
        setAttError(msg);
      } finally {
        if (cancelled) return;
        setAttLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [session.sessionId]);

  return (
    <div className="space-y-4 text-sm">
      {/* Thông tin phiên — giống phần manager nhưng không hiển thị reservation */}
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
            <span className="font-medium text-black">{dayjs(session.startAt).format('DD/MM/YYYY')}</span>
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-gray-500">Địa điểm:</span>
            <span className="font-medium text-black">{(session as RequestSessionSummary & { location?: string }).location || '—'}</span>
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            <Hash className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-gray-500">Mã yêu cầu:</span>
            <span className="font-semibold text-sky-600">{requestCode}</span>
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            <GraduationCap className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-gray-500">Số lượng giảng viên:</span>
            <span className="font-medium text-black">{session.teachersRequired ?? '—'}</span>
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            <Users className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-gray-500">Số lượng trợ giảng:</span>
            <span className="font-medium text-black">{session.tasRequired ?? '—'}</span>
          </div>
        </div>
      </div>

      {/* Danh sách member tham dự (check-in / check-out theo từng thành viên) */}
      <div className="rounded-2xl bg-white shadow-sm border border-gray-100">
        <div className="px-4 py-2.5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm">Danh sách thành viên</h3>
          <p className="text-xs text-gray-500 mt-1">
            {attLoading ? 'Đang tải...' : `${attendances.length} thành viên`}
          </p>
        </div>

        <div className="px-4 py-3 space-y-2">
          {attLoading ? (
            <p className="text-xs text-gray-500">Đang tải dữ liệu điểm danh...</p>
          ) : attError ? (
            <p className="text-xs text-red-600">{attError}</p>
          ) : attendances.length === 0 ? (
            <p className="text-xs text-gray-500">Không có dữ liệu điểm danh cho phiên này.</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-100">
              <div className="grid grid-cols-3 gap-2 bg-gray-50 px-3 py-2 text-[11px] font-semibold text-gray-600">
                <div>Thông tin thành viên</div>
                <div className="text-center">Check in</div>
                <div className="text-center">Check out</div>
              </div>

              <div className="divide-y divide-gray-100">
                {attendances.map((a) => (
                  <div
                    key={a.attendanceId}
                    className="grid grid-cols-3 gap-2 px-3 py-2 items-center text-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-50 flex-shrink-0 flex items-center justify-center">
                        <img
                          src={a.memberAvatarUrl || '/img/ava.png'}
                          alt={a.memberFullName ?? `Member ${a.memberId}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = '/img/ava.png';
                          }}
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {a.memberFullName || `Member #${a.memberId}`}
                        </p>
                        <p className="text-[11px] text-gray-500 truncate">
                          {a.memberEmail ? a.memberEmail : '—'}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`text-center font-medium ${
                        a.checkinAt ? 'text-emerald-700' : 'text-amber-600'
                      }`}
                    >
                      {a.checkinAt ? dayjs(a.checkinAt).format('HH:mm') : '—'}
                    </div>
                    <div
                      className={`text-center font-medium ${
                        a.checkoutAt ? 'text-sky-700' : 'text-amber-600'
                      }`}
                    >
                      {a.checkoutAt ? dayjs(a.checkoutAt).format('HH:mm') : '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

