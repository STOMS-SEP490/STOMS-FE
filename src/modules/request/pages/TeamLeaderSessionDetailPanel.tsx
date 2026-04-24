import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { UserCheck } from 'lucide-react';
import sessionApi from '@/modules/request/api/sessionApi';
import type { SessionResponse } from '../session.types';
import attendanceApi from '@/modules/attendance/api/attendanceApi';
import type { Attendance } from '@/modules/attendance/attendance';
import { getAttendanceOwnerId } from '@/shared/utils/attendanceOwner';
import { Badge } from '@/shared/components/ui/badge';
import { getErrorMessage } from '@/shared/lib/errorMessage';
import { message } from 'antd';
import { getStaffRoleId, getRoleLabel, getRoleBadgeClass } from '@/constants/role';

export type TeamLeaderSessionDetailPanelProps = {
  session: SessionResponse | { sessionId: number; sessionNo?: number; startAt?: string; endAt?: string; teachersRequired?: number | null; tasRequired?: number | null };
  requestCode?: string;
  requestName?: string;
  /** Cột "Ủy quyền" sau cuối giờ ; chỉ truyền khi cần (vd. team leader). */
  delegateColumn?: {
    currentMemberId: number | null;
    /** Giá trị ban đầu từ buổi (trước khi API danh sách trả về); sau ủy quyền dùng attendanceByMemberId từ từng dòng. */
    sessionAttendanceByMemberId: number | null;
    onDelegated?: () => void;
  };
  /**
   * Hiển thị cột "Ủy quyền" trong bảng thành viên. Giáo viên (teacher) không được ủy quyền — chỉ TL.
   * Khi false, vẫn dùng delegateColumn cho "Người xác nhận" / nút Xác nhận tham gia nếu cần.
   */
  memberDelegateColumnVisible?: boolean;
  /** Mở nhanh panel xác nhận tham gia (khi user là người xác nhận của buổi). */
  onOpenAttendance?: () => void;
};

export default function TeamLeaderSessionDetailPanel({
  session,
  requestCode,
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
  const [sessionDetail, setSessionDetail] = useState<SessionResponse | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setSessionLoading(true);
      try {
        const sessionId = 'SessionId' in session ? session.SessionId : session.sessionId;
        const detail = await sessionApi.getById(sessionId);
        if (cancelled) return;
        setSessionDetail(detail);
      } catch {
        if (!cancelled) setSessionDetail(null);
      } finally {
        if (!cancelled) setSessionLoading(false);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, ['SessionId' in session ? session.SessionId : session.sessionId]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setAttLoading(true);
        setAttError(null);
        setAttendances([]);
        setDelegateOwnerOverride(null);

        const sessionId = 'SessionId' in session ? session.SessionId : session.sessionId;
        const res = await attendanceApi.getBySession(sessionId);
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
  }, ['SessionId' in session ? session.SessionId : session.sessionId]);

  /** Người được giao xác nhận: ưu tiên dữ liệu mới từ GET filter (sau ủy quyền), không dùng mỗi prop từ parent (dễ stale). */
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

  // Map memberId -> staffRole from session assignments
  const memberRoleMap = useMemo(() => {
    const map = new Map<number, string>();
    const assignments = sessionDetail?.Assignments ?? (sessionDetail as any)?.assignments;
    if (assignments && Array.isArray(assignments)) {
      for (const assignment of assignments) {
        const memberId = assignment.StaffMemberId ?? assignment.staffMemberId;
        const staffRole = assignment.StaffRole ?? assignment.staffRole;
        if (memberId && staffRole) {
          map.set(memberId, staffRole);
        }
      }
    }
    return map;
  }, [sessionDetail]);

  const canDelegateForCurrentUser = useMemo(() => {
    if (!delegateColumn || !memberDelegateColumnVisible) return false;
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
  const gridClass = showDelegateCol
    ? 'grid-cols-[minmax(0,1fr)_120px_64px_64px_112px]'
    : 'grid-cols-[minmax(0,1fr)_120px_64px_64px]';

  // Derived from fetched session detail
  const sessionId = 'SessionId' in session ? session.SessionId : session.sessionId;
  // const startAt = sessionDetail?.StartAt ?? ('StartAt' in session ? session.StartAt : session.startAt);
  // const endAt = sessionDetail?.EndAt ?? ('EndAt' in session ? session.EndAt : session.endAt);
  const location = sessionDetail?.Location ?? ('Location' in session ? session.Location : (session as any).location) ?? null;
  // const teachersRequired = sessionDetail?.TeachersRequired ?? ('TeachersRequired' in session ? session.TeachersRequired : ((session as any).teachersRequired ?? null)) ?? null;
  // const tasRequired = sessionDetail?.TasRequired ?? ('TasRequired' in session ? session.TasRequired : ((session as any).tasRequired ?? null)) ?? null;
  const notes = String(sessionDetail?.Notes ?? ('Notes' in session ? session.Notes : (session as any)?.notes) ?? '').trim();
  const sessionNo = sessionDetail?.SessionNo ?? ('SessionNo' in session ? session.SessionNo : session.sessionNo) ?? null;
  const isOnlineRaw = sessionDetail?.IsOnline ?? null;
  const createdAt = sessionDetail?.CreatedAt ?? null;
  const updatedAt = sessionDetail?.UpdatedAt ?? null;
  const eventSession = sessionDetail?.EventSession ?? null;
  const subjectSession = sessionDetail?.SubjectSession ?? null;
  const sessionDescription = String(
    eventSession?.Description ??
    subjectSession?.Description ?? ''
  ).trim();
  const sessionDuration = String(
    eventSession?.Duration ??
    subjectSession?.Duration ?? ''
  ).trim();

  const skills = useMemo(() => {
    const list = [
      ...(Array.isArray(sessionDetail?.EventSessionSkill) ? sessionDetail.EventSessionSkill : []),
      ...(Array.isArray(sessionDetail?.SubjectSkill) ? sessionDetail.SubjectSkill : []),
    ];
    const names = list
      .filter((s: any) => (s?.IsActive ?? s?.isActive ?? true) !== false)
      .map((s: any) => String(s?.SkillName ?? s?.skillName ?? '').trim())
      .filter(Boolean);
    return Array.from(new Set(names));
  }, [sessionDetail]);

  const topics = useMemo(() => {
    const d = sessionDetail as any;
    const fromEvent = [...(Array.isArray(d?.EventSession?.Topics) ? d.EventSession.Topics : [])];
    const fromSubject = [...(Array.isArray(d?.SubjectSession?.Topics) ? d.SubjectSession.Topics : [])];
    const names = [...fromEvent, ...fromSubject]
      .filter((t: any) => (t?.IsActive ?? t?.isActive ?? true) !== false)
      .map((t: any) => String(t?.TopicName ?? t?.topicName ?? '').trim())
      .filter(Boolean);
    return Array.from(new Set(names));
  }, [sessionDetail]);

  const teamNames = useMemo(() => {
    const teamSessions = sessionDetail?.TeamSessions ?? [];
    return teamSessions
      .map((ts) => String(ts?.TeamName ?? '').trim())
      .filter(Boolean);
  }, [sessionDetail]);

  return (
    <div className="space-y-4 text-sm">
      {/* Thông tin buổi — layout 2 cột giống manager/PC */}
      <div className="bg-white">
        <div className="p-4 space-y-4 text-sm">
          {sessionLoading && <p className="text-xs text-slate-500">Đang tải...</p>}

          <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Mã yêu cầu</p>
              <p className="mt-1 font-semibold text-slate-900">{requestCode || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Buổi số</p>
              <p className="mt-1 font-semibold text-slate-900">{sessionNo ?? '—'}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Thời lượng</p>
              <p className="mt-1 font-semibold text-[#2197C0]">{sessionDuration || '—'}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Địa điểm</p>
              <p className="mt-1 font-semibold text-[#2197C0]">{location || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Hình thức</p>
              <p className="mt-1 font-medium text-slate-900">
                {isOnlineRaw == null ? '—' : isOnlineRaw ? 'Trực tuyến' : 'Trực tiếp'}
              </p>
            </div>
          </div>

          {teamNames.length > 0 && (
            <div className="pt-3 border-t border-slate-100">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Nhóm phụ trách</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {teamNames.map((name, idx) => (
                  <Badge key={idx} className="bg-orange-50 text-orange-700 border border-orange-200 rounded-full text-[11px] font-medium">
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {(sessionDescription || notes) && (
            <div className="pt-3 border-t border-slate-100 space-y-3">
              {sessionDescription ? (
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Mô tả nội dung</p>
                  <p className="mt-1 text-slate-700 leading-6">{sessionDescription}</p>
                </div>
              ) : null}

              {notes ? (
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Ghi chú</p>
                  <p className="mt-1 text-slate-700 leading-6">{notes}</p>
                </div>
              ) : null}
            </div>
          )}

          {(topics.length > 0 || skills.length > 0) && (
            <div className="pt-3 border-t border-slate-100 space-y-3">
              {topics.length > 0 && (
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Chủ đề</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {topics.map((name) => (
                      <Badge key={name} className="bg-slate-50 text-slate-700 border border-slate-200 rounded-full text-[11px] font-medium">
                        {name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {skills.length > 0 && (
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Kỹ năng</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {skills.map((name) => (
                      <Badge key={name} className="bg-sky-50 text-sky-700 border border-sky-200 rounded-full text-[11px] font-medium">
                        {name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="pt-3 border-t border-slate-100">
            <div className="grid grid-cols-1 gap-x-6 gap-y-2 text-xs text-slate-500 md:grid-cols-2">
              <div>
                <span className="uppercase tracking-wide">Tạo lúc: </span>
                <span className="text-slate-600">
                  {createdAt ? dayjs(createdAt).format('DD/MM/YYYY HH:mm:ss') : '—'}
                </span>
              </div>
              <div>
                <span className="uppercase tracking-wide">Cập nhật: </span>
                <span className="text-slate-600">
                  {updatedAt ? dayjs(updatedAt).format('DD/MM/YYYY HH:mm:ss') : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Danh sách thành viên tham dự (đầu giờ / cuối giờ  theo từng thành viên) */}
      <div className="bg-white">
        <div className="px-4 py-3 border-t border-slate-200">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-[#2197C0] text-sm">Danh sách thành viên</h3>
              <span className="text-xs text-gray-500">
                {attLoading ? 'Đang tải...' : `${attendances.length} thành viên`}
              </span>
            </div>
            {isAttendanceOwner && onOpenAttendance && (
              <button
                type="button"
                onClick={onOpenAttendance}
                className="inline-flex items-center gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100"
                title="Mở nhanh panel xác nhận tham gia"
              >
                Xác nhận tham gia
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {attLoading ? (
            <p className="text-xs text-gray-500 px-4 py-3">Đang tải dữ liệu xác nhận tham gia...</p>
          ) : attError ? (
            <p className="text-xs text-red-600 px-4 py-3">{attError}</p>
          ) : attendances.length === 0 ? (
            <p className="text-xs text-gray-500 px-4 py-3">Không có dữ liệu xác nhận tham gia cho buổi này.</p>
          ) : (
            <div className="overflow-hidden">
              <div
                className={`grid ${gridClass} gap-2 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-gray-600`}
              >
                <div>Thông tin thành viên</div>
                <div className="text-center">Vai trò</div>
                <div className="text-center">Đầu giờ</div>
                <div className="text-center">Cuối giờ</div>
                {showDelegateCol ? <div className="text-center">Ủy quyền</div> : null}
              </div>

              <div className="divide-y divide-gray-100 px-4">
                {attendances.map((a) => (
                  <div
                    key={a.attendanceId}
                    className={`grid ${gridClass} gap-2 py-3 items-center text-sm`}
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
                        <p className="text-[11px] text-gray-500 truncate mt-0.5">
                          {a.member?.email || '—'}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-center items-center">
                      {(() => {
                        const staffRole = memberRoleMap.get(a.memberId);
                        const roleId = getStaffRoleId(staffRole);
                        const roleLabel = getRoleLabel(roleId);
                        const badgeClass = getRoleBadgeClass(roleId);
                        
                        return (
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${badgeClass}`}>
                            {roleLabel}
                          </span>
                        );
                      })()}
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
                                Người xác nhận
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
                                    // Lấy previousAttendanceByMemberId từ resolvedAttendanceOwnerId
                                    await attendanceApi.delegateAttendance(
                                      sessionId,
                                      a.memberId,
                                      resolvedAttendanceOwnerId,
                                    );
                                    const res = await attendanceApi.getBySession(sessionId);
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
                                      const detail = await sessionApi.getById(sessionId);
                                      setDelegateOwnerOverride(
                                        getAttendanceOwnerId(detail.Attendances ?? null),
                                      );
                                    }
                                    delegateColumn.onDelegated?.();
                                    message.success('Đã ủy quyền xác nhận tham gia thành công.');
                                  } catch (err: unknown) {
                                    message.error(getErrorMessage(err));
                                  } finally {
                                    setDelegatingMemberId(null);
                                  }
                                })();
                              }}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                              title={
                                hasCheckedIn
                                  ? 'Không thể ủy quyền sau khi thành viên đã xác nhận vào'
                                  : 'Ủy quyền xác nhận tham gia cho thành viên này'
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

