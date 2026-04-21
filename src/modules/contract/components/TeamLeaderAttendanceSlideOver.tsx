import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { UserCheck, X } from 'lucide-react';
import HoverSearch from '@/shared/components/ui/search';
import attendanceApi from '@/modules/attendance/attendanceApi';
import type { TeamLeaderTimetableAssignmentRow } from '@/modules/contract/hooks/useTeamLeaderTimetableAssignments';
import type { AttendanceItem, MemberDetail, SessionDetail } from '@/modules/request/type';
import { cn } from '@/shared/lib/utils';
import { getErrorMessage } from '@/shared/lib/errorMessage';
import { message } from 'antd';

type AttendanceActionMode = 'delegate' | 'checkin' | 'checkout' | null;
type AttendanceTab = Exclude<AttendanceActionMode, null>;

function getInitials(name?: string) {
  if (!name) return 'NA';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export type TeamLeaderAttendanceSlideOverProps = {
  actionMode: AttendanceActionMode;
  activeSession: TeamLeaderTimetableAssignmentRow | null;
  sessionDetail: SessionDetail | null;
  attendanceItems: AttendanceItem[];
  membersById: Record<number, MemberDetail>;
  attendanceByMemberIdForSession: number | null;
  memberSearch: string;
  setMemberSearch: (v: string) => void;
  memberNotes: Record<number, string>;
  setMemberNotes: Dispatch<SetStateAction<Record<number, string>>>;
  selectedMemberIds: number[];
  setSelectedMemberIds: Dispatch<SetStateAction<number[]>>;
  isSubmitting: boolean;
  setIsSubmitting: (v: boolean) => void;
  setActionMode: Dispatch<SetStateAction<AttendanceActionMode>>;
  /** Đổi tab Check-in / Check-out / Ủy quyền (đồng bộ chọn member). */
  switchActionMode: (mode: AttendanceTab) => void;
  closePanel: () => void;
  saveAttendance: () => void;
  refreshAttendanceItems: () => Promise<{ items: AttendanceItem[]; membersById: Record<number, MemberDetail> } | void>;
  refetch?: () => Promise<void>;
  /** z-index lớp phủ (vd. z-[80] khi mở từ popover lịch) */
  overlayZClass?: string;
};

export default function TeamLeaderAttendanceSlideOver({
  actionMode,
  activeSession,
  sessionDetail,
  attendanceItems,
  membersById,
  attendanceByMemberIdForSession,
  memberSearch,
  setMemberSearch,
  memberNotes,
  setMemberNotes,
  selectedMemberIds: _selectedMemberIds,
  setSelectedMemberIds: _setSelectedMemberIds,
  isSubmitting,
  setIsSubmitting,
  setActionMode,
  switchActionMode,
  closePanel,
  saveAttendance: _saveAttendance,
  refreshAttendanceItems,
  refetch,

  overlayZClass = 'z-[80]',
}: TeamLeaderAttendanceSlideOverProps) {
  const [checkinImagesByMemberId, setCheckinImagesByMemberId] = useState<Record<number, File | null>>({});
  const [checkoutImagesByMemberId, setCheckoutImagesByMemberId] = useState<Record<number, File | null>>({});
  const [pendingCheckinResetByMemberId, setPendingCheckinResetByMemberId] = useState<Record<number, boolean>>({});
  const [pendingCheckoutResetByMemberId, setPendingCheckoutResetByMemberId] = useState<Record<number, boolean>>({});
  const [previewImgUrl, setPreviewImgUrl] = useState<string | null>(null);

  useEffect(() => {
    // Reset ảnh khi đổi mode/phiên để tránh gửi nhầm.
    if (actionMode !== 'checkin' || !activeSession?.sessionId) {
      setCheckinImagesByMemberId({});
      setPendingCheckinResetByMemberId({});
    }
    if (actionMode !== 'checkout' || !activeSession?.sessionId) {
      setCheckoutImagesByMemberId({});
      setPendingCheckoutResetByMemberId({});
    }
  }, [actionMode, activeSession?.sessionId]);

  const currentMemberId = useMemo(() => {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { memberId?: number | string };
      const id = Number(parsed.memberId ?? 0);
      return Number.isFinite(id) && id > 0 ? id : null;
    } catch {
      return null;
    }
  }, []);

  const canSaveAttendance = useMemo(() => {
    if (actionMode !== 'checkin' && actionMode !== 'checkout') return false;
    const ownerId = attendanceByMemberIdForSession;
    const uid = currentMemberId;
    if (uid == null || uid <= 0) return false;
    if (ownerId == null || ownerId <= 0) return false;
    return ownerId === uid;
  }, [actionMode, attendanceByMemberIdForSession, currentMemberId]);

  const selectedIdsByImages = useMemo(() => {
    const m = actionMode === 'checkout' ? checkoutImagesByMemberId : checkinImagesByMemberId;
    const ids = Object.entries(m)
      .filter(([, f]) => !!f)
      .map(([k]) => Number(k))
      .filter((id) => Number.isFinite(id) && id > 0);
    return Array.from(new Set(ids));
  }, [actionMode, checkinImagesByMemberId, checkoutImagesByMemberId]);

  const pendingResetMemberIds = useMemo(() => {
    const m = actionMode === 'checkout' ? pendingCheckoutResetByMemberId : pendingCheckinResetByMemberId;
    return Object.entries(m)
      .filter(([, v]) => !!v)
      .map(([k]) => Number(k))
      .filter((id) => Number.isFinite(id) && id > 0);
  }, [actionMode, pendingCheckinResetByMemberId, pendingCheckoutResetByMemberId]);

  const hasPendingChanges = selectedIdsByImages.length > 0 || pendingResetMemberIds.length > 0;

  const filteredAttendanceItems = useMemo(() => {
    const keyword = memberSearch.trim().toLowerCase();
    if (!keyword) return attendanceItems;
    return attendanceItems.filter((item) => {
      const memberId = Number((item as { memberId?: number }).memberId ?? item.MemberId ?? 0);
      const detail = membersById[memberId];
      const name = detail?.fullName ?? '';
      const email = detail?.userEmail ?? '';
      return `${name} ${email}`.toLowerCase().includes(keyword);
    });
  }, [attendanceItems, memberSearch, membersById]);

  const topic = sessionDetail?.SubjectSession ?? sessionDetail?.EventSession;
  const requestNameText = activeSession?.requestName?.trim() ? activeSession.requestName.trim() : '';

  const startAt = sessionDetail?.StartAt ?? activeSession?.startAt;
  const endAt = sessionDetail?.EndAt ?? activeSession?.endAt;

  /** Tiêu đề header: ưu tiên tên khóa / tên yêu cầu. */
  const panelTitle = useMemo(() => {
    const t = topic?.Title?.trim();
    if (t) return t;
    if (requestNameText) return requestNameText;
    if (activeSession?.sessionNo != null) return `Buổi ${activeSession.sessionNo}`;
    return 'Xác nhận tham gia';
  }, [topic?.Title, requestNameText, activeSession?.sessionNo]);

  const headerSubtitle =
    startAt && endAt
      ? `${dayjs(startAt).format('DD/MM/YYYY')} · ${dayjs(startAt).format('HH:mm')} - ${dayjs(endAt).format('HH:mm')}`
      : '';

  const tabs: { id: AttendanceTab; label: string }[] = [
    { id: 'checkin', label: 'Check-in' },
    { id: 'checkout', label: 'Check-out' },
    { id: 'delegate', label: 'Ủy quyền' },
  ];

  const closePreview = () => setPreviewImgUrl(null);

  const handleSave = async () => {
    if (!activeSession?.sessionId) {
      message.error('Không tìm thấy thông tin buổi để xác nhận tham gia.');
      return;
    }
    if (actionMode !== 'checkin' && actionMode !== 'checkout') return;
    if (!canSaveAttendance) {
      message.warning('Bạn không có quyền lưu xác nhận tham gia cho phiên này.');
      return;
    }

    const selected = selectedIdsByImages;
    const pendingResetIds = pendingResetMemberIds;
    if (selected.length === 0 && pendingResetIds.length === 0) {
      message.warning('Vui lòng chọn ảnh hoặc đánh dấu xóa ít nhất 1 member.');
      return;
    }

    setIsSubmitting(true);
    try {
      const resetTargets = attendanceItems
        .map((attendance) => {
          const memberId = Number(
            (attendance as unknown as { MemberId?: number; memberId?: number }).MemberId ??
              (attendance as unknown as { MemberId?: number; memberId?: number }).memberId ??
              0,
          );
          const attendanceId = Number(
            (attendance as unknown as { AttendanceId?: number; attendanceId?: number }).AttendanceId ??
              (attendance as unknown as { AttendanceId?: number; attendanceId?: number }).attendanceId ??
              0,
          );
          return { memberId, attendanceId, attendance };
        })
        .filter(({ memberId, attendanceId }) => pendingResetIds.includes(memberId) && attendanceId > 0);

      if (resetTargets.length > 0) {
        await Promise.all(
          resetTargets.map(({ attendanceId, memberId, attendance }) =>
            attendanceApi.reset(attendanceId, {
              isCheckIn: actionMode === 'checkin',
              note:
                (memberNotes?.[memberId] ?? '').trim() ||
                ((attendance as unknown as { Note?: string | null; note?: string | null }).Note ??
                  (attendance as unknown as { Note?: string | null; note?: string | null }).note ??
                  null),
            }),
          ),
        );
      }

      if (actionMode === 'checkin') {
        const items = selected.map((memberId) => ({
          memberId,
          note: (memberNotes?.[memberId] ?? '').trim() || null,
          file: checkinImagesByMemberId[memberId] ?? null,
        }));

        if (items.length > 0) {
          const form = new FormData();
          form.append('SessionId', String(activeSession.sessionId));
          items.forEach((x, i) => {
            form.append(`Items[${i}].MemberId`, String(x.memberId));
            if (x.note) form.append(`Items[${i}].Note`, x.note);
            form.append('Images', x.file as File, (x.file as File).name);
          });

          const res = await attendanceApi.checkInWithImages(form);
          if (res?.SkippedMemberIds?.length) {
            message.warning(`Đã bỏ qua ${res.SkippedMemberIds.length} member (không hợp lệ / đã check-in).`);
          } else {
            message.success(
              resetTargets.length > 0 ? 'Đã cập nhật check-in và xóa ảnh đã chọn.' : 'Đã lưu check-in.',
            );
          }
        } else if (resetTargets.length > 0) {
          message.success('Đã xóa ảnh check-in đã chọn.');
        }
      } else {
        const items = selected.map((memberId) => ({
          memberId,
          note: (memberNotes?.[memberId] ?? '').trim() || null,
          file: checkoutImagesByMemberId[memberId] ?? null,
        }));

        if (items.length > 0) {
          const form = new FormData();
          form.append('SessionId', String(activeSession.sessionId));
          items.forEach((x, i) => {
            form.append(`Items[${i}].MemberId`, String(x.memberId));
            if (x.note) form.append(`Items[${i}].Note`, x.note);
            form.append('Images', x.file as File, (x.file as File).name);
          });

          const res = await attendanceApi.checkOutWithImages(form);
          if (res?.SkippedMemberIds?.length) {
            message.warning(`Đã bỏ qua ${res.SkippedMemberIds.length} member (không hợp lệ / đã check-out).`);
          } else {
            message.success(
              resetTargets.length > 0 ? 'Đã cập nhật check-out và xóa ảnh đã chọn.' : 'Đã lưu check-out.',
            );
          }
        } else if (resetTargets.length > 0) {
          message.success('Đã xóa ảnh check-out đã chọn.');
        }
      }

      await refreshAttendanceItems();
      await refetch?.();
    } catch (err: unknown) {
      message.error(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 isolate ${overlayZClass} ${actionMode ? 'pointer-events-auto' : 'pointer-events-none'}`}
    >
      <div
        className={`absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity duration-300 ease-out ${
          actionMode ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={closePanel}
        aria-hidden={!actionMode}
      />
      <aside
        className={`absolute right-0 top-0 h-full w-full max-w-[640px] border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-out will-change-transform motion-reduce:transition-none ${
          actionMode ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="px-6 pt-5 pb-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 pr-2">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Xác nhận tham gia</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900 leading-snug">{panelTitle}</h2>
                {headerSubtitle ? (
                  <p className="mt-1 text-xs text-slate-500">{headerSubtitle}</p>
                ) : null}
              </div>
              <button
                type="button"
                className="shrink-0 rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                onClick={closePanel}
                aria-label="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {actionMode ? (
              <nav
                className="mt-3 flex flex-wrap items-center gap-5 border-b border-slate-200"
                role="tablist"
                aria-label="Chế độ xác nhận tham gia"
              >
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={actionMode === tab.id}
                    onClick={() => switchActionMode(tab.id)}
                    className={cn(
                      '-mb-px cursor-pointer border-b-2 bg-transparent px-0 pb-2 text-[11px] font-medium transition-colors sm:text-xs',
                      actionMode === tab.id
                        ? 'border-[#2197C0] text-[#2197C0]'
                        : 'border-transparent text-slate-500 hover:text-slate-700',
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            ) : null}
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-4">
            <div className="rounded-2xl bg-white shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900">Danh sách member được phân công</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Upload ảnh minh chứng để{' '}
                    {actionMode === 'delegate'
                      ? 'ủy quyền xác nhận tham gia (bao gồm check-out)'
                      : actionMode === 'checkin'
                        ? 'check-in'
                        : 'check-out'}
                    .
                  </p>
                </div>
                {(actionMode === 'checkin' || actionMode === 'checkout') && (
                  <button
                    type="button"
                    onClick={handleSave}
                    className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#2197C0] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#208AAE] disabled:opacity-50"
                    disabled={isSubmitting || !canSaveAttendance || !hasPendingChanges}
                  >
                    Lưu xác nhận
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 px-5 py-3">
              <HoverSearch
                value={memberSearch}
                onChange={setMemberSearch}
                placeholder="Tìm theo tên/email member..."
              />
              <div className="ml-auto flex flex-wrap items-center gap-2" />
              </div>

              <div className="px-5 pb-5">
              {filteredAttendanceItems.length === 0 && (
                <div className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  Chưa có member nào cần xác nhận tham gia.
                </div>
              )}

              {filteredAttendanceItems.length > 0 && (
              <div className="flex flex-col divide-y divide-slate-100 overflow-hidden rounded-xl bg-slate-50/50">
              {filteredAttendanceItems.map((attendance) => {
                const memberId = Number(
                  (attendance as unknown as { MemberId?: number; memberId?: number }).MemberId ??
                    (attendance as unknown as { MemberId?: number; memberId?: number }).memberId ??
                    0,
                );
                const assigned = (sessionDetail?.Assignments ?? []).find(
                  (assignment) => assignment.StaffMemberId === memberId,
                );
                const staff = assigned?.StaffMember;
                const cachedMember = membersById[memberId];
                const staffUser = (staff?.User ?? null) as
                  | { AvatarUrl?: string | null; avatarUrl?: string | null }
                  | null;
                const memberName =
                  staff?.FullName ?? cachedMember?.fullName ?? `Member #${memberId}`;
                const memberEmail =
                  staff?.Email ?? staff?.User?.Email ?? cachedMember?.userEmail ?? 'Không có email';
                const memberAvatarUrl =
                  staff?.AvatarUrl ??
                  staffUser?.AvatarUrl ??
                  staffUser?.avatarUrl ??
                  cachedMember?.avatarUrl ??
                  null;
                const checkinAt =
                  (attendance as unknown as { CheckinAt?: string | null; checkinAt?: string | null }).CheckinAt ??
                  (attendance as unknown as { CheckinAt?: string | null; checkinAt?: string | null }).checkinAt ??
                  null;
                const checkoutAt =
                  (attendance as unknown as { CheckoutAt?: string | null; checkoutAt?: string | null }).CheckoutAt ??
                  (attendance as unknown as { CheckoutAt?: string | null; checkoutAt?: string | null }).checkoutAt ??
                  null;

                const isCheckedIn = checkinAt != null;
                const isCheckedOut = checkoutAt != null;
                const isPendingCheckinReset = !!pendingCheckinResetByMemberId[memberId];
                const isPendingCheckoutReset = !!pendingCheckoutResetByMemberId[memberId];
                const isCheckedInEffective = isCheckedIn && !isPendingCheckinReset;
                const isCheckedOutEffective = isCheckedOut && !isPendingCheckinReset && !isPendingCheckoutReset;
                const isAuthorizedDelegate =
                  attendanceByMemberIdForSession != null && attendanceByMemberIdForSession === memberId;
                const checkinImgUrl =
                  (attendance as unknown as { imgcheckin?: string | null }).imgcheckin ??
                  (attendance as unknown as { imgCheckin?: string | null }).imgCheckin ??
                  (attendance as unknown as { imgCheckIn?: string | null }).imgCheckIn ??
                  (attendance as unknown as { ImgCheckin?: string | null }).ImgCheckin ??
                  (attendance as unknown as { ImgCheckIn?: string | null }).ImgCheckIn ??
                  (attendance as unknown as { ImgUrl?: string | null }).ImgUrl ??
                  null;
                const checkoutImgUrl =
                  (attendance as unknown as { imgcheckout?: string | null }).imgcheckout ??
                  (attendance as unknown as { imgCheckout?: string | null }).imgCheckout ??
                  (attendance as unknown as { imgCheckOut?: string | null }).imgCheckOut ??
                  (attendance as unknown as { ImgCheckout?: string | null }).ImgCheckout ??
                  (attendance as unknown as { ImgCheckOut?: string | null }).ImgCheckOut ??
                  null;
                const checkinImgUrlEffective = isPendingCheckinReset ? null : checkinImgUrl;
                const checkoutImgUrlEffective = isPendingCheckinReset || isPendingCheckoutReset ? null : checkoutImgUrl;
                return (
                  <div
                    key={
                      Number(
                        (attendance as unknown as { AttendanceId?: number; attendanceId?: number }).AttendanceId ??
                          (attendance as unknown as { AttendanceId?: number; attendanceId?: number }).attendanceId ??
                          memberId,
                      )
                    }
                    className={cn(
                      'grid grid-cols-1 gap-3 bg-white px-4 py-3.5',
                      actionMode === 'delegate'
                        ? 'md:grid-cols-[1fr_1.2fr_auto]'
                        : 'md:grid-cols-[1fr_auto]',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                        {memberAvatarUrl ? (
                          <img
                            src={memberAvatarUrl}
                            alt={memberName}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = '/img/ava.png';
                            }}
                          />
                        ) : (
                          getInitials(memberName)
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-sm font-semibold text-slate-900">{memberName}</div>
                        </div>
                        <div className="truncate text-xs text-slate-500">{memberEmail}</div>
                      </div>
                    </div>

                    {actionMode === 'delegate' ? (
                      isAuthorizedDelegate ? (
                        <span className="inline-flex w-fit justify-self-end items-center gap-0.5 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-700 whitespace-nowrap">
                          <UserCheck className="h-3 w-3" />
                          Người xác nhận
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!activeSession) return;
                            setIsSubmitting(true);
                            try {
                              await attendanceApi.delegate({
                                sessionId: activeSession.sessionId,
                                delegateToMemberId: memberId,
                              });
                              await refreshAttendanceItems();
                              await refetch?.();
                              setActionMode(null);
                            } catch (err: unknown) {
                              message.error(getErrorMessage(err));
                            } finally {
                              setIsSubmitting(false);
                            }
                          }}
                          className="inline-flex w-fit justify-self-end items-center gap-0.5 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 hover:bg-violet-100 whitespace-nowrap"
                          disabled={isSubmitting}
                        >
                          <UserCheck className="h-3 w-3" />
                          Ủy quyền
                        </button>
                      )
                    ) : (
                      <>
                        <div className="flex items-center justify-end gap-3 md:justify-self-end">
                          {actionMode === 'checkin' ? (
                            isCheckedInEffective ? (
                              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 whitespace-nowrap">
                                Đã check-in
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500 whitespace-nowrap">
                                Chưa check-in
                              </span>
                            )
                          ) : actionMode === 'checkout' ? (
                            !isCheckedInEffective ? (
                              <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 whitespace-nowrap">
                                Chưa check-in
                              </span>
                            ) : isCheckedOutEffective ? (
                              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 whitespace-nowrap">
                                Đã check-out
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500 whitespace-nowrap">
                                Chưa check-out
                              </span>
                            )
                          ) : (
                            <span className="text-xs text-slate-400">&nbsp;</span>
                          )}
                          {null}
                        </div>

                        {/* Row 2: ghi chú + ảnh minh chứng (xuống hàng) */}
                        <div className="md:col-span-2 w-full space-y-2">
                          {actionMode === 'checkin' && isCheckedInEffective ? (
                            <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                              <div className="min-w-0">
                                <div className="text-[11px] font-medium text-slate-600">Ảnh check-in</div>
                                {!checkinImgUrlEffective ? (
                                  <div className="text-[11px] text-slate-500">Chưa có ảnh</div>
                                ) : null}
                              </div>
                              {checkinImgUrlEffective ? (
                                <div className="flex items-center gap-2 shrink-0">
                                  <img
                                    src={checkinImgUrlEffective}
                                    alt="Ảnh check-in"
                                    className="h-12 w-12 rounded-md object-cover border border-slate-200 cursor-pointer hover:opacity-90"
                                    onClick={() => setPreviewImgUrl(checkinImgUrlEffective)}
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).src = '/img/ava.png';
                                    }}
                                  />
                                  <button
                                    type="button"
                                    className="shrink-0 text-[11px] font-semibold text-rose-600 hover:text-rose-700"
                                    onClick={() => {
                                      setPendingCheckinResetByMemberId((prev) => ({ ...prev, [memberId]: true }));
                                      setCheckinImagesByMemberId((prev) => ({ ...prev, [memberId]: null }));
                                    }}
                                    disabled={isSubmitting}
                                  >
                                    Xóa
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          ) : null}

                          {actionMode === 'checkout' && isCheckedOutEffective ? (
                            <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                              <div className="min-w-0">
                                <div className="text-[11px] font-medium text-slate-600">Ảnh check-out</div>
                                {!checkoutImgUrlEffective ? (
                                  <div className="text-[11px] text-slate-500">Chưa có ảnh</div>
                                ) : null}
                              </div>
                              {checkoutImgUrlEffective ? (
                                <div className="flex items-center gap-2 shrink-0">
                                  <img
                                    src={checkoutImgUrlEffective}
                                    alt="Ảnh check-out"
                                    className="h-12 w-12 rounded-md object-cover border border-slate-200 cursor-pointer hover:opacity-90"
                                    onClick={() => setPreviewImgUrl(checkoutImgUrlEffective)}
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).src = '/img/ava.png';
                                    }}
                                  />
                                  <button
                                    type="button"
                                    className="shrink-0 text-[11px] font-semibold text-rose-600 hover:text-rose-700"
                                    onClick={() => {
                                      setPendingCheckoutResetByMemberId((prev) => ({ ...prev, [memberId]: true }));
                                      setCheckoutImagesByMemberId((prev) => ({ ...prev, [memberId]: null }));
                                    }}
                                    disabled={isSubmitting}
                                  >
                                    Xóa
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          ) : null}

                          {!(actionMode === 'checkout' && !isCheckedInEffective) && (
                            <input
                              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs placeholder:text-slate-400"
                              placeholder="Ghi chú..."
                              value={memberNotes[memberId] ?? ''}
                              onChange={(event) =>
                                setMemberNotes((prev) => ({
                                  ...prev,
                                  [memberId]: event.target.value,
                                }))
                              }
                            />
                          )}

                          {actionMode === 'checkin' && !isCheckedInEffective ? (
                            <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                              <span className="text-[11px] font-medium text-slate-600 whitespace-nowrap">
                                Ảnh minh chứng <span className="text-rose-500">*</span>
                              </span>

                              <div className="flex flex-wrap items-center gap-2">
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="block max-w-full text-xs text-transparent file:mr-0 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                                  onChange={(e) => {
                                    const f = e.currentTarget.files?.[0] ?? null;
                                    setPendingCheckinResetByMemberId((prev) => ({ ...prev, [memberId]: false }));
                                    setCheckinImagesByMemberId((prev) => ({ ...prev, [memberId]: f }));
                                  }}
                                  disabled={isSubmitting}
                                />

                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <span className="text-[11px] text-slate-500 truncate">
                                    {checkinImagesByMemberId[memberId]?.name
                                      ? checkinImagesByMemberId[memberId]?.name
                                      : 'Chưa chọn ảnh'}
                                  </span>
                                  {checkinImagesByMemberId[memberId]?.name ? (
                                    <button
                                      type="button"
                                      className="shrink-0 text-[11px] font-semibold text-rose-600 hover:text-rose-700"
                                      onClick={() =>
                                        setCheckinImagesByMemberId((prev) => ({ ...prev, [memberId]: null }))
                                      }
                                      disabled={isSubmitting}
                                    >
                                      Xóa
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          ) : null}

                          {actionMode === 'checkout' && isCheckedInEffective && !isCheckedOutEffective ? (
                            <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                              <span className="text-[11px] font-medium text-slate-600 whitespace-nowrap">
                                Ảnh minh chứng <span className="text-rose-500">*</span>
                              </span>

                              <div className="flex flex-wrap items-center gap-2">
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="block max-w-full text-xs text-transparent file:mr-0 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                                  onChange={(e) => {
                                    const f = e.currentTarget.files?.[0] ?? null;
                                    setPendingCheckoutResetByMemberId((prev) => ({ ...prev, [memberId]: false }));
                                    setCheckoutImagesByMemberId((prev) => ({ ...prev, [memberId]: f }));
                                  }}
                                  disabled={isSubmitting}
                                />

                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <span className="text-[11px] text-slate-500 truncate">
                                    {checkoutImagesByMemberId[memberId]?.name
                                      ? checkoutImagesByMemberId[memberId]?.name
                                      : 'Chưa chọn ảnh'}
                                  </span>
                                  {checkoutImagesByMemberId[memberId]?.name ? (
                                    <button
                                      type="button"
                                      className="shrink-0 text-[11px] font-semibold text-rose-600 hover:text-rose-700"
                                      onClick={() =>
                                        setCheckoutImagesByMemberId((prev) => ({ ...prev, [memberId]: null }))
                                      }
                                      disabled={isSubmitting}
                                    >
                                      Xóa
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
              </div>
              )}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {previewImgUrl ? (
        <div className="absolute inset-0 z-[90]">
          <div
            className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
            onClick={closePreview}
            aria-hidden="true"
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="relative max-h-[90vh] w-full max-w-[900px]">
              <button
                type="button"
                className="absolute -top-3 -right-3 rounded-full bg-white/95 border border-slate-200 p-2 text-slate-700 shadow hover:bg-white"
                onClick={closePreview}
                aria-label="Đóng ảnh"
              >
                <X className="h-4 w-4" />
              </button>
              <img
                src={previewImgUrl}
                alt="Preview"
                className="max-h-[90vh] w-full rounded-xl object-contain bg-black/20"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
