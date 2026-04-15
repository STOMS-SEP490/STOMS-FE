import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Calendar, Clock, GraduationCap, Hash, List, MapPin, UserCheck, Users } from 'lucide-react';
import type { RequestSessionSummary } from '../request';
import sessionApi from '@/modules/request/api/sessionApi';
import attendanceApi from '@/modules/attendance/api/attendanceApi';
import type { Attendance } from '@/modules/attendance/attendance';
import { getAttendanceOwnerId } from '@/shared/utils/attendanceOwner';
import { Badge } from '@/shared/components/ui/badge';
import { getErrorMessage } from '@/shared/lib/errorMessage';
import { message } from 'antd';

export type TeamLeaderSessionDetailPanelProps = {
  session: RequestSessionSummary;
  requestCode: string;
  requestName?: string;
  /** Cột "Ủy quyền" sau giờ ra; chỉ truyền khi cần (vd. team leader). */
  delegateColumn?: {
    currentMemberId: number | null;
    /** Giá trị ban đầu từ phiên (trước khi API danh sách trả về); sau ủy quyền dùng attendanceByMemberId từ từng dòng. */
    sessionAttendanceByMemberId: number | null;
    onDelegated?: () => void;
  };
  /**
   * Hiển thị cột "Ủy quyền" trong bảng thành viên. Giáo viên (teacher) không được ủy quyền — chỉ TL.
   * Khi false, vẫn dùng delegateColumn cho "Người điểm danh" / nút Điểm danh nếu cần.
   */
  memberDelegateColumnVisible?: boolean;
  /** Mở nhanh panel điểm danh (khi user là người điểm danh của phiên). */
  onOpenAttendance?: () => void;
};

export default function TeamLeaderSessionDetailPanel({
  session,
  requestCode,
  requestName,
  delegateColumn,
  memberDelegateColumnVisible = true,
  onOpenAttendance,
}: TeamLeaderSessionDetailPanelProps) {
  const [attLoading, setAttLoading] = useState(false);
  const [attError, setAttError] = useState<string | null>(null);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [delegatingMemberId, setDelegatingMemberId] = useState<number | null>(null);
  /** Khi filter không có attendanceByMemberId, bổ sung từ GET session (sau ủy quyền). */
  const [delegateOwnerOverride, setDelegateOwnerOverride] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setAttLoading(true);
        setAttError(null);
        setAttendances([]);
        setDelegateOwnerOverride(null);

        const res = await attendanceApi.getBySession(session.sessionId);
        if (cancelled) return;
        setAttendances(res.items ?? []);
      } catch (err: unknown) {
        if (cancelled) return;
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Không tải được danh sách thành viên tham dự.';
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

  /** Người được giao điểm danh: ưu tiên dữ liệu mới từ GET filter (sau ủy quyền), không dùng mỗi prop từ parent (dễ stale). */
  const resolvedAttendanceOwnerId = useMemo(() => {
    for (const a of attendances) {
      if (a.attendanceByMemberId != null && Number(a.attendanceByMemberId) > 0) {
        return Number(a.attendanceByMemberId);
      }
    }
    if (delegateOwnerOverride != null && delegateOwnerOverride > 0) {
      return delegateOwnerOverride;
    }
    return delegateColumn?.sessionAttendanceByMemberId != null
      ? Number(delegateColumn.sessionAttendanceByMemberId)
      : null;
  }, [attendances, delegateOwnerOverride, delegateColumn?.sessionAttendanceByMemberId]);

  const canDelegateForCurrentUser = useMemo(() => {
    if (!delegateColumn || !memberDelegateColumnVisible) return false;
    // Manager được quyền ủy quyền cho bất kỳ ai (kể cả ủy quyền lại cho chính mình),
    // không cần phải trùng với "Người điểm danh" hiện tại.
    const uid = delegateColumn.currentMemberId;
    return uid != null;
  }, [delegateColumn, memberDelegateColumnVisible]);

  const isAttendanceOwner = useMemo(() => {
    if (!delegateColumn) return false;
    const uid = delegateColumn.currentMemberId;
    if (uid == null || uid <= 0) return false;
    const ownerId = resolvedAttendanceOwnerId;
    return ownerId != null && ownerId === uid;
  }, [delegateColumn, resolvedAttendanceOwnerId]);

  const showDelegateCol = Boolean(delegateColumn) && memberDelegateColumnVisible;
  // Thu hẹp cột giờ vào/giờ ra để nhường chỗ cho email/fullName.
  // 1fr cho "Thông tin thành viên", các cột thời gian cố định.
  const gridClass = showDelegateCol
    ? 'grid-cols-[minmax(0,1fr)_64px_64px_112px]'
    : 'grid-cols-[minmax(0,1fr)_64px_64px]';

  const topic = session.subjectSession ?? session.eventSession;
  const sessionNotes = (session as any)?.notes as string | undefined;
  const responseText = topic?.description?.trim() ? topic.description.trim() : sessionNotes?.trim();
  const sessionSkills = session.sessionSkills ?? [];

  return (
    <div className="space-y-4 text-sm">
      {/* Thông tin phiên — giống phần manager nhưng không hiển thị reservation */}
      <div className="rounded-2xl bg-white shadow-sm border border-gray-100">
        <div className="px-4 py-2.5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm">Thông tin phiên</h3>
        </div>
        <div className="px-4 py-3 space-y-2 text-sm">
          {(topic?.title?.trim() || responseText || topic?.duration?.trim()) && (
            <div className="space-y-2">
              {topic?.title?.trim() ? (
                <div className="flex items-start gap-3">
                  <span className="text-xs text-gray-500 shrink-0 mt-0.5">Tiêu đề:</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-black">{topic.title.trim()}</p>
                  </div>
                </div>
              ) : null}

             

              {topic?.duration?.trim() ? (
                <div className="flex items-center gap-3 text-gray-600">
                  <span className="text-xs text-gray-500">Thời lượng:</span>
                  <span className="font-medium text-black">{topic.duration.trim()}</span>
                </div>
              ) : null}

              {sessionSkills.length ? (
                <div className="flex items-start gap-3">
                  <span className="text-xs text-gray-500 shrink-0 mt-0.5">Kỹ năng:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {sessionSkills.map((name) => (
                      <Badge key={name} className="bg-[#2197C0]/10 text-[#2197C0] border-0 text-[11px]">
                        {name}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          <div className="flex items-center gap-3 text-gray-600">
            <Clock className="h-4 w-4 shrink-0 text-[#2197C0]" />
            <span className="text-gray-500">Thời gian:</span>
            <span className="font-medium text-black">
              {dayjs(session.startAt).format('HH:mm')} - {dayjs(session.endAt).format('HH:mm')}
            </span>
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            <Calendar className="h-4 w-4 shrink-0 text-[#2197C0]" />
            <span className="text-gray-500">Ngày:</span>
            <span className="font-medium text-black">{dayjs(session.startAt).format('DD/MM/YYYY')}</span>
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            <MapPin className="h-4 w-4 shrink-0 text-[#2197C0]" />
            <span className="text-gray-500">Địa điểm:</span>
            <span className="font-medium text-black">{(session as RequestSessionSummary & { location?: string }).location || '—'}</span>
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            <Hash className="h-4 w-4 shrink-0 text-[#2197C0]" />
            <span className="text-gray-500">Mã yêu cầu:</span>
            <span className="font-semibold text-[#2197C0]">{requestCode}</span>
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            <List className="h-4 w-4 shrink-0 text-[#2197C0]" />
            <span className="text-gray-500">Tên yêu cầu:</span>
            <span className="font-medium text-black">{requestName?.trim() ? requestName.trim() : '—'}</span>
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            <GraduationCap className="h-4 w-4 shrink-0 text-[#2197C0]" />
            <span className="text-gray-500">Số lượng giảng viên:</span>
            <span className="font-medium text-black">{session.teachersRequired ?? '—'}</span>
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            <Users className="h-4 w-4 shrink-0 text-[#2197C0]" />
            <span className="text-gray-500">Số lượng sinh viên:</span>
            <span className="font-medium text-black">{session.tasRequired ?? '—'}</span>
          </div>
        </div>
      </div>

      {/* Danh sách thành viên tham dự (giờ vào / giờ ra theo từng thành viên) */}
      <div className="rounded-2xl bg-white shadow-sm border border-gray-100">
        <div className="px-4 py-2.5 border-b border-gray-100">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm">Danh sách thành viên</h3>
              <p className="text-xs text-gray-500 mt-1">
                {attLoading ? 'Đang tải...' : `${attendances.length} thành viên`}
              </p>
            </div>
            {isAttendanceOwner && onOpenAttendance && (
              <button
                type="button"
                onClick={onOpenAttendance}
                className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100"
                title="Mở nhanh panel điểm danh"
              >
                Điểm danh
              </button>
            )}
          </div>
        </div>

        <div className="px-4 py-3 space-y-2">
          {attLoading ? (
            <p className="text-xs text-gray-500">Đang tải dữ liệu điểm danh...</p>
          ) : attError ? (
            <p className="text-xs text-red-600">{attError}</p>
          ) : attendances.length === 0 ? (
            <p className="text-xs text-gray-500">Không có dữ liệu điểm danh cho phiên này.</p>
          ) : (
            <div className="overflow-hidden rounded-xl bg-white">
              <div
                className={`grid ${gridClass} gap-2 bg-gray-50 px-3 py-2 text-[11px] font-semibold text-gray-600`}
              >
                <div>Thông tin thành viên</div>
                <div className="text-center">Giờ vào</div>
                <div className="text-center">Giờ ra</div>
                {showDelegateCol ? <div className="text-center">Ủy quyền</div> : null}
              </div>

              <div className="divide-y divide-gray-100">
                {attendances.map((a) => (
                  <div
                    key={a.attendanceId}
                    className={`grid ${gridClass} gap-2 px-3 py-2 items-center text-sm`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-50 flex-shrink-0 flex items-center justify-center">
                        <img
                          src={a.member?.avatarUrl || '/img/ava.png'}
                            alt={a.member?.fullName ?? `Thành viên ${a.memberId}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = '/img/ava.png';
                          }}
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {a.member?.fullName || `Thành viên #${a.memberId}`}
                        </p>
                        <p className="text-[11px] text-gray-500 truncate">
                          {a.member?.email ?? '—'}
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
                    {showDelegateCol && delegateColumn ? (
                      <div className="flex justify-center">
                        {(() => {
                          const ownerId = resolvedAttendanceOwnerId;
                          const isDelegate =
                            ownerId != null && ownerId === a.memberId;
                          if (isDelegate) {
                            return (
                              <span className="inline-flex w-fit items-center gap-0.5 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-700 whitespace-nowrap">
                                <UserCheck className="h-3 w-3 shrink-0" />
                                Người điểm danh
                              </span>
                            );
                          }
                          if (!canDelegateForCurrentUser) {
                            return (
                              <span className="text-[11px] text-gray-400">—</span>
                            );
                          }
                          const hasCheckedIn = a.checkinAt != null;
                          return (
                            <button
                              type="button"
                              disabled={delegatingMemberId != null || hasCheckedIn}
                              onClick={() => {
                                void (async () => {
                                  setDelegatingMemberId(a.memberId);
                                  try {
                                    await attendanceApi.delegateAttendance(
                                      session.sessionId,
                                      a.memberId,
                                    );
                                    const res = await attendanceApi.getBySession(session.sessionId);
                                    const nextItems = res.items ?? [];
                                    setAttendances(nextItems);
                                    let ownerFromItems: number | null = null;
                                    for (const row of nextItems) {
                                      if (
                                        row.attendanceByMemberId != null &&
                                        Number(row.attendanceByMemberId) > 0
                                      ) {
                                        ownerFromItems = Number(row.attendanceByMemberId);
                                        break;
                                      }
                                    }
                                    if (ownerFromItems != null) {
                                      setDelegateOwnerOverride(ownerFromItems);
                                    } else {
                                      const detail = await sessionApi.getById(session.sessionId);
                                      setDelegateOwnerOverride(
                                        getAttendanceOwnerId(detail.Attendances ?? null),
                                      );
                                    }
                                    delegateColumn.onDelegated?.();
                                  } catch (err: unknown) {
                                    message.error(getErrorMessage(err));
                                  } finally {
                                    setDelegatingMemberId(null);
                                  }
                                })();
                              }}
                              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                              title={
                                hasCheckedIn
                                  ? 'Không thể ủy quyền sau khi thành viên đã điểm danh vào'
                                  : 'Ủy quyền điểm danh cho thành viên này'
                              }
                            >
                              <UserCheck className="h-3 w-3 shrink-0 text-[#2197C0]" />
                              {delegatingMemberId === a.memberId ? '...' : 'Ủy quyền'}
                            </button>
                          );
                        })()}
                      </div>
                    ) : null}
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

