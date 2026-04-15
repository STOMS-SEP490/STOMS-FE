import { useMemo, type Dispatch, type SetStateAction } from 'react';
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
  selectedMemberIds,
  setSelectedMemberIds,
  isSubmitting,
  setIsSubmitting,
  setActionMode,
  switchActionMode,
  closePanel,
  saveAttendance,
  refreshAttendanceItems,
  refetch,

  overlayZClass = 'z-[80]',
}: TeamLeaderAttendanceSlideOverProps) {
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

  const defaultSelectedIds = useMemo(() => {
    if (actionMode === 'checkin') {
      return (attendanceItems ?? []).filter((x) => x.CheckinAt != null).map((x) => x.MemberId);
    }
    if (actionMode === 'checkout') {
      return (attendanceItems ?? []).filter((x) => x.CheckoutAt != null).map((x) => x.MemberId);
    }
    return [];
  }, [attendanceItems, actionMode]);

  const hasAttendanceSelectionChanged = useMemo(() => {
    if (actionMode !== 'checkin' && actionMode !== 'checkout') return false;
    const a = new Set(defaultSelectedIds);
    const b = new Set(selectedMemberIds ?? []);
    if (a.size !== b.size) return true;
    for (const id of a) if (!b.has(id)) return true;
    return false;
  }, [actionMode, defaultSelectedIds, selectedMemberIds]);

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
    return 'Điểm danh';
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
                <p className="text-xs text-gray-400 uppercase tracking-wide">Điểm danh</p>
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
                aria-label="Chế độ điểm danh"
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
                    Chọn member để{' '}
                    {actionMode === 'delegate'
                      ? 'ủy quyền điểm danh (bao gồm check-out)'
                      : actionMode === 'checkin'
                        ? 'check-in'
                        : 'check-out'}
                    .
                  </p>
                </div>
                {(actionMode === 'checkin' || actionMode === 'checkout') && (
                  <button
                    type="button"
                    onClick={saveAttendance}
                    className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#2197C0] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#208AAE] disabled:opacity-50"
                    disabled={isSubmitting || !canSaveAttendance || !hasAttendanceSelectionChanged}
                  >
                    Lưu điểm danh
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 px-5 py-3">
              <HoverSearch
                value={memberSearch}
                onChange={setMemberSearch}
                placeholder="Tìm theo tên/email member..."
              />
              <div className="ml-auto flex flex-wrap items-center gap-2">
                {(actionMode === 'checkin' || actionMode === 'checkout') && (
                  <label className="flex items-center gap-2 text-xs text-slate-500">
                    <input
                      type="checkbox"
                      checked={
                        actionMode === 'checkin'
                          ? filteredAttendanceItems.length > 0 &&
                            filteredAttendanceItems.every((item) => selectedMemberIds.includes(item.MemberId))
                          : filteredAttendanceItems.filter((item) => item.CheckinAt != null).length > 0 &&
                            filteredAttendanceItems
                              .filter((item) => item.CheckinAt != null)
                              .every((item) => selectedMemberIds.includes(item.MemberId))
                      }
                      onChange={(event) => {
                        const checked = event.target.checked;
                        if (checked) {
                          const eligible =
                            actionMode === 'checkin'
                              ? filteredAttendanceItems
                              : filteredAttendanceItems.filter((item) => item.CheckinAt != null);
                          setSelectedMemberIds(eligible.map((item) => item.MemberId));
                        } else {
                          setSelectedMemberIds([]);
                        }
                      }}
                      className="h-4 w-4 rounded border-orange-300 text-orange-500 focus:ring-orange-500"
                      disabled={
                        isSubmitting ||
                        (actionMode === 'checkin'
                          ? filteredAttendanceItems.length === 0
                          : filteredAttendanceItems.filter((item) => item.CheckinAt != null).length === 0)
                      }
                    />
                    Chọn tất cả
                  </label>
                )}
              </div>
              </div>

              <div className="px-5 pb-5">
              {filteredAttendanceItems.length === 0 && (
                <div className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  Chưa có member nào cần điểm danh.
                </div>
              )}

              {filteredAttendanceItems.length > 0 && (
              <div className="flex flex-col divide-y divide-slate-100 overflow-hidden rounded-xl bg-slate-50/50">
              {filteredAttendanceItems.map((attendance) => {
                const memberId = attendance.MemberId;
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
                const isCheckedIn = attendance.CheckinAt != null;
                const isCheckedOut = attendance.CheckoutAt != null;
                const isAuthorizedDelegate =
                  attendanceByMemberIdForSession != null && attendanceByMemberIdForSession === memberId;
                return (
                  <div
                    key={attendance.AttendanceId}
                    className="grid grid-cols-1 items-center gap-4 bg-white px-4 py-3.5 md:grid-cols-[1fr_1.2fr_auto]"
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
                          Người điểm danh
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
                      <div className="grid w-full grid-cols-1 items-center gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                        {!(actionMode === 'checkout' && !isCheckedIn) && (
                          <input
                            className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs placeholder:text-slate-400"
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
                        <div className="flex items-center justify-end gap-3">
                          {actionMode === 'checkin' ? (
                            isCheckedIn ? (
                              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700">
                                Đã check-in
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500">
                                Chưa check-in
                              </span>
                            )
                          ) : actionMode === 'checkout' ? (
                            !isCheckedIn ? (
                              <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700">
                                Chưa check-in
                              </span>
                            ) : isCheckedOut ? (
                              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700">
                                Đã check-out
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500">
                                Chưa check-out
                              </span>
                            )
                          ) : (
                            <span className="text-xs text-slate-400">&nbsp;</span>
                          )}
                          {(actionMode === 'checkin' || (actionMode === 'checkout' && isCheckedIn)) && (
                            <label className="flex items-center gap-2 text-xs text-slate-500">
                              <input
                                type="checkbox"
                                checked={selectedMemberIds.includes(memberId)}
                                onChange={(event) => {
                                  const nextChecked = event.target.checked;
                                  setSelectedMemberIds((prev) =>
                                    nextChecked ? [...prev, memberId] : prev.filter((id) => id !== memberId),
                                  );
                                }}
                                className="h-4 w-4 rounded border-orange-300 text-orange-500 focus:ring-orange-500"
                                disabled={isSubmitting}
                              />
                            </label>
                          )}
                        </div>
                      </div>
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
    </div>
  );
}
