import { useMemo, type Dispatch, type SetStateAction } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { UserCheck, X } from 'lucide-react';
import HoverSearch from '@/shared/components/ui/search';
import attendanceApi from '@/modules/request/api/attendanceApi';
import type { TeamLeaderTimetableAssignmentRow } from '@/modules/contract/hooks/useTeamLeaderTimetableAssignments';
import type { AttendanceItem, MemberDetail, SessionDetail } from '@/modules/request/type';

type AttendanceActionMode = 'delegate' | 'checkin' | 'checkout' | null;

function formatDateTime(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(value?: string) {
  if (!value) return '—';
  return dayjs(value).locale('vi').format('DD/MM/YYYY');
}

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
  closePanel,
  saveAttendance,
  refreshAttendanceItems,
  refetch,
  overlayZClass = 'z-40',
}: TeamLeaderAttendanceSlideOverProps) {
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

  return (
    <div
      className={`fixed inset-0 transition ${overlayZClass} ${actionMode ? 'pointer-events-auto' : 'pointer-events-none'}`}
    >
      <div
        className={`absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity ${
          actionMode ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={closePanel}
      />
      <aside
        className={`absolute right-0 top-0 h-full w-full max-w-[640px] border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ${
          actionMode ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-6 py-5">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-sky-600">
                {actionMode === 'delegate'
                  ? 'Ủy quyền điểm danh'
                  : actionMode === 'checkin'
                    ? 'Check-in member'
                    : 'Check-out member'}
              </div>
              <h3 className="mt-1 text-lg font-semibold text-slate-900">Phiên #{activeSession?.sessionNo ?? '—'}</h3>
              <p className="text-xs text-slate-500">
                {activeSession
                  ? `${formatDate(activeSession.startAt)} • ${formatDateTime(activeSession.startAt)}-${formatDateTime(activeSession.endAt)}`
                  : ''}
              </p>
            </div>
            <button
              type="button"
              className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
              onClick={closePanel}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <div>
                <div className="font-semibold text-slate-900">Danh sách member được phân công</div>
                <div className="mt-1 text-xs text-slate-500">
                  Chọn member để{' '}
                  {actionMode === 'delegate'
                    ? 'ủy quyền điểm danh (bao gồm check-out)'
                    : actionMode === 'checkin'
                      ? 'check-in'
                      : 'check-out'}
                  .
                </div>
              </div>
              {(actionMode === 'checkin' || actionMode === 'checkout') && (
                <button
                  type="button"
                  onClick={saveAttendance}
                  className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                  disabled={isSubmitting || selectedMemberIds.length === 0}
                >
                  Lưu điểm danh
                </button>
              )}
            </div>

            <div className="mt-0 flex flex-wrap items-center gap-3 bg-white px-4 py-3">
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

            <div className=" grid gap-3">
              {filteredAttendanceItems.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                  Chưa có member nào cần điểm danh.
                </div>
              )}

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
                    className="grid grid-cols-1 items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 md:grid-cols-[1fr_1.2fr_auto]"
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
                            } finally {
                              setIsSubmitting(false);
                            }
                          }}
                          className="inline-flex w-fit justify-self-end items-center gap-0.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100 whitespace-nowrap"
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
          </div>
        </div>
      </aside>
    </div>
  );
}
