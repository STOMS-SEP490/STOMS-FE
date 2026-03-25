import { useMemo } from 'react';
import {
  CalendarDays,
  LogIn,
  LogOut,
  List,
  UserCheck,
  X,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/shared/components/common/DataTable';
import HoverSearch from '@/shared/components/ui/search';
import { getSessionStatusInfo } from '@/constants/status';
import { useNavigate } from 'react-router-dom';
import {
  useTeamLeaderTimetableAssignments,
  type TeamLeaderTimetableAssignmentRow,
} from '@/modules/contract/hooks/useTeamLeaderTimetableAssignments';
import attendanceApi from '../../request/api/attendanceApi';
import { useTeamLeaderAttendancePanel } from '@/modules/contract/hooks/useTeamLeaderAttendancePanel';

function formatDateTime(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('vi-VN');
}

function getInitials(name?: string) {
  if (!name) return 'NA';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

type TeamLeaderTimetableAssignmentsProps = {
  isAttendanceTab?: boolean;
  embedded?: boolean;
  items?: TeamLeaderTimetableAssignmentRow[];
  loading?: boolean;
  pageNumber?: number;
  pageSize?: number;
  totalItems?: number;
  search?: string;
  setSearch?: (value: string) => void;
  setPageNumber?: (page: number) => void;
  refetch?: () => Promise<void>;
};

export default function TeamLeaderTimetableAssignments(props?: TeamLeaderTimetableAssignmentsProps) {
  const navigate = useNavigate();
  const isAttendanceTab = props?.isAttendanceTab ?? false;
  const isEmbedded = props?.embedded ?? false;
  const statuses = useMemo(
    () => (isAttendanceTab ? ['ASSIGNED', 'ONGOING'] : ['ASSIGNED', 'ONGOING']),
    [isAttendanceTab],
  );
  const internal = useTeamLeaderTimetableAssignments({ pageSize: 8, statuses, todayOnly: isAttendanceTab });

  const items = props?.items ?? internal.items;
  const loading = props?.loading ?? internal.loading;
  const pageNumber = props?.pageNumber ?? internal.pageNumber;
  const pageSize = props?.pageSize ?? internal.pageSize;
  const totalItems = props?.totalItems ?? internal.totalItems;
  const search = props?.search ?? internal.search;
  const setSearch = props?.setSearch ?? internal.setSearch;
  const setPageNumber = props?.setPageNumber ?? internal.setPageNumber;
  const refetch = props?.refetch ?? internal.refetch;

  const {
    currentMemberId,
    actionMode,
    setActionMode,
    activeSession,
    sessionDetail,
    attendanceItems,
    setAttendanceItems,
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
    openPanel,
    closePanel,
    saveAttendance,
  } = useTeamLeaderAttendancePanel({ refetch });

  const filteredAttendanceItems = useMemo(() => {
    const keyword = memberSearch.trim().toLowerCase();
    if (!keyword) return attendanceItems;
    return attendanceItems.filter((item) => {
      const detail = membersById[item.memberId];
      const name = detail?.fullName ?? '';
      const email = detail?.userEmail ?? '';
      return `${name} ${email}`.toLowerCase().includes(keyword);
    });
  }, [attendanceItems, memberSearch, membersById]);

  const columns: ColumnDef<TeamLeaderTimetableAssignmentRow>[] = useMemo(
    () => [
      {
        id: 'date',
        header: 'Ngày',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="text-xs text-gray-700 whitespace-nowrap">
            <div className="font-medium text-gray-900">{formatDate(row.original.startAt)}</div>
          </div>
        ),
      },
      {
        id: 'time',
        header: 'Giờ',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="text-xs text-gray-700 whitespace-nowrap">
            <div className="font-medium text-gray-900">
              {formatDateTime(row.original.startAt)} - {formatDateTime(row.original.endAt)}
            </div>
          </div>
        ),
      },
      {
        id: 'location',
        header: 'Địa điểm',
        cell: ({ row }) => (
          <div className="text-sm text-gray-700">
            <span className="font-medium text-slate-900">{row.original.location || '—'}</span>
            <span className="text-xs text-gray-500">
              {' '}
              • {(row.original.location ?? '').toLowerCase().includes('online') ? 'Online' : 'Offline'}
            </span>
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Trạng thái',
        enableSorting: false,
        cell: ({ row }) => {
          const info = getSessionStatusInfo(row.original.status);
          let label = info.label;
          if (isAttendanceTab) {
            const statusUpper = String(row.original.status ?? '').toUpperCase();
            if (statusUpper.includes('ONGOING')) label = 'Đang diễn ra';
            if (statusUpper.includes('ASSIGNED')) label = 'Sắp tới';
          }
          return (
            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold border ${info.className}`}>
              {label}
            </span>
          );
        },
      },
      ...(isAttendanceTab ? [
        {
        id: 'actions',
        header: 'Điểm danh',
        enableSorting: false,
        cell: ({ row }: { row: { original: TeamLeaderTimetableAssignmentRow } }) => {
          return (() => {
            const statusUpper = String(row.original.status ?? '').toUpperCase();
            const jwtMemberId = currentMemberId;
            const attendanceByMemberId = row.original.attendanceByMemberId ?? null;
            const isOngoing = statusUpper.includes('ONGOING');
            const isCompletedSession = statusUpper.includes('COMPLETED');
            const startAtMs = row.original.startAt ? new Date(row.original.startAt).getTime() : Number.NaN;
            const endAtMs = row.original.endAt ? new Date(row.original.endAt).getTime() : Number.NaN;
            const isPreCheckinWindow =
              !Number.isNaN(startAtMs) &&
              Date.now() >= startAtMs - 30 * 60 * 1000 &&
              Date.now() < startAtMs;
            const isAfterEnd = !Number.isNaN(endAtMs) && Date.now() >= endAtMs;

            const isResponsibleForSession =
              jwtMemberId != null && attendanceByMemberId != null && attendanceByMemberId === jwtMemberId;

            const checkinAt = row.original.checkinAt ?? null;
            const checkoutAt = row.original.checkoutAt ?? null;

            const canCheckin =
              isAttendanceTab && !isCompletedSession && (isOngoing || isPreCheckinWindow) && isResponsibleForSession;
            const canCheckout =
              isAttendanceTab &&
              isResponsibleForSession &&
              checkinAt != null &&
              checkoutAt == null &&
              (isOngoing || isCompletedSession || isAfterEnd);

            if (isAttendanceTab && (isOngoing || isPreCheckinWindow) && !isResponsibleForSession) {
              return (
                <span className="inline-flex w-fit items-center gap-0.5 justify-self-end rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600 whitespace-nowrap">
                  Chỉ người điểm danh
                </span>
              );
            }

            const dashNode = (
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-400 whitespace-nowrap">
                --
              </span>
            );

            const checkinNode = (() => {
              if (isAttendanceTab) {
                if (canCheckin && checkinAt == null) {
                  return (
                    <button
                      type="button"
                      onClick={() => void openPanel(row.original, 'checkin')}
                      className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700 transition hover:bg-sky-100"
                      title="Check-in member cho phiên này"
                    >
                      <LogIn className="h-3 w-3" />
                      Check-in
                    </button>
                  );
                }

                if (checkinAt != null) {
                  return (
                    <button
                      type="button"
                      onClick={() => void openPanel(row.original, 'checkin')}
                      className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700 transition hover:bg-sky-100 whitespace-nowrap"
                      title="Sửa điểm danh check-in"
                    >
                      <LogIn className="h-3 w-3" />
                      Check-in: {formatDateTime(checkinAt ?? undefined)}
                    </button>
                  );
                }
                return dashNode;
              }

              // Tab phân công: chỉ hiển thị thời gian khi phiên đang diễn ra / completed
              if (isOngoing || isCompletedSession) {
                return checkinAt != null ? (
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-700 whitespace-nowrap">
                    Check-in: {formatDateTime(checkinAt ?? undefined)}
                  </span>
                ) : (
                  dashNode
                );
              }

              return dashNode;
            })();

            const checkoutNode = (() => {
              if (isAttendanceTab) {
                  if ((isOngoing || isCompletedSession || isAfterEnd) && !isResponsibleForSession) {
                    return dashNode;
                  }
                if (canCheckout && checkoutAt == null) {
                  return (
                    <button
                      type="button"
                      onClick={() => void openPanel(row.original, 'checkout')}
                      className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-100"
                      title="Check-out member cho phiên này"
                    >
                      <LogOut className="h-3 w-3" />
                      Check-out
                    </button>
                  );
                }

                if (checkoutAt != null) {
                  return (
                    <button
                      type="button"
                      onClick={() => void openPanel(row.original, 'checkout')}
                      className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-100 whitespace-nowrap"
                      title="Sửa điểm danh check-out"
                    >
                      <LogOut className="h-3 w-3" />
                      Check-out: {formatDateTime(checkoutAt ?? undefined)}
                    </button>
                  );
                }
                return dashNode;
              }

              if (isOngoing || isCompletedSession) {
                return checkoutAt != null ? (
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-700 whitespace-nowrap">
                    Check-out: {formatDateTime(checkoutAt ?? undefined)}
                  </span>
                ) : (
                  dashNode
                );
              }

              return dashNode;
            })();

            return (
              <div className="grid grid-cols-2 items-center gap-2">
                <div className="justify-self-start">{checkinNode}</div>
                <div className="justify-self-start">{checkoutNode}</div>
              </div>
            );
          })();
        },
      }
      ]
      : [
        {
          id: 'role',
          header: 'Vai trò',
          enableSorting: false,
          cell: ({ row }: { row: { original: TeamLeaderTimetableAssignmentRow } }) => {
            if (!row.original.roleLabel) return null;
            return (
              <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold border border-slate-200 bg-slate-50 text-slate-700 whitespace-nowrap">
                {row.original.roleLabel}
              </span>
            );
          },
        },
      ]),
      {
        id: 'delegation',
        header: 'Ủy quyền',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-2">
            {(() => {
              const statusUpper = String(row.original.status ?? '').toUpperCase();
              const jwtMemberId = currentMemberId;
              const attendanceByMemberId = row.original.attendanceByMemberId ?? null;

              const isAssigned = statusUpper.includes('ASSIGNED');
              const isOngoing = statusUpper.includes('ONGOING');
              const isCompletedSession = statusUpper.includes('COMPLETED');

              const isResponsibleForSession =
                jwtMemberId != null && attendanceByMemberId != null && attendanceByMemberId === jwtMemberId;
              const isDelegatedToOther =
                jwtMemberId != null &&
                attendanceByMemberId != null &&
                attendanceByMemberId > 0 &&
                attendanceByMemberId !== jwtMemberId;

              const canDelegate = (isAssigned || isOngoing) && isResponsibleForSession && !isCompletedSession;

              if (isDelegatedToOther) {
                return (
                  <span className="inline-flex w-fit items-center gap-0.5 justify-self-end rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-700 whitespace-nowrap">
                    <UserCheck className="h-3 w-3" />
                    Đã được ủy quyền
                  </span>
                );
              }

              if (!canDelegate) return null;

              return (
                <button
                  type="button"
                  onClick={() => void openPanel(row.original, 'delegate')}
                  className="inline-flex w-fit items-center gap-0.5 justify-self-end rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 transition hover:bg-emerald-100 whitespace-nowrap"
                  title="Ủy quyền điểm danh cho member trong phiên này"
                >
                  <UserCheck className="h-3 w-3" />
                  Ủy quyền
                </button>
              );
            })()}
          </div>
        ),
      },
    ],
    [
      isAttendanceTab,
      currentMemberId,
      openPanel,
    ],
  );

  return (
    <div
      className={
        isEmbedded
          ? 'flex min-h-0 flex-1 flex-col gap-3 overflow-hidden'
          : 'flex min-h-0 flex-col gap-3 overflow-hidden bg-slate-50 p-6'
      }
      style={isEmbedded ? undefined : { height: 'var(--content-height, 100vh)' }}
    >
      {!isEmbedded && (
        <div className="shrink-0 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Quản lý phân công & điểm danh</h2>
              <p className="mt-1 text-sm text-slate-500">
                Theo dõi phiên dạy, ủy quyền điểm danh và check-in/check-out cho member theo từng buổi.
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="w-fit">
                <HoverSearch
                  value={search}
                  onChange={(v) => {
                    setSearch(v);
                    setPageNumber(1);
                  }}
                  placeholder="Tìm theo phiên/địa điểm/trạng thái..."
                />
              </div>
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => navigate('/tl/timetable')}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-colors text-slate-500 hover:bg-slate-50"
                  title="Xem dạng thời khóa biểu"
                >
                  <CalendarDays className="h-4 w-4" />
                  Lịch
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-4 py-2 text-xs font-semibold text-sky-700 shadow-sm"
                  title="Xem dạng bảng phân công"
                >
                  <List className="h-4 w-4" />
                  Danh sách
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-white/70 backdrop-blur-sm">
            <span className="text-sm text-muted-foreground">Đang tải danh sách...</span>
          </div>
        )}
        <DataTable
          columns={columns}
          data={items}
          pageNumber={pageNumber}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={(page) => setPageNumber(page)}
          fillHeight
          tableGap="tight"
        />
      </div>
      <div
        className={`fixed inset-0 z-40 transition ${actionMode ? 'pointer-events-auto' : 'pointer-events-none'}`}
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
                    Chọn member để {actionMode === 'delegate' ? 'ủy quyền điểm danh (bao gồm check-out)' : actionMode === 'checkin' ? 'check-in' : 'check-out'}.
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
                            filteredAttendanceItems.every((item) => selectedMemberIds.includes(item.memberId))
                          : filteredAttendanceItems.filter((item) => item.checkinAt != null).length > 0 &&
                            filteredAttendanceItems
                              .filter((item) => item.checkinAt != null)
                              .every((item) => selectedMemberIds.includes(item.memberId))
                        }
                        onChange={(event) => {
                          const checked = event.target.checked;
                          if (checked) {
                            const eligible =
                              actionMode === 'checkin'
                              ? filteredAttendanceItems
                              : filteredAttendanceItems.filter((item) => item.checkinAt != null);
                            setSelectedMemberIds(eligible.map((item) => item.memberId));
                          } else {
                            setSelectedMemberIds([]);
                          }
                        }}
                        className="h-4 w-4 rounded border-orange-300 text-orange-500 focus:ring-orange-500"
                        disabled={
                          isSubmitting ||
                          (actionMode === 'checkin'
                          ? filteredAttendanceItems.length === 0
                          : filteredAttendanceItems.filter((item) => item.checkinAt != null).length === 0)
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
                  const memberId = attendance.memberId;
                  const assignedMember = (sessionDetail?.assignments ?? []).find(
                    (assignment) => assignment.staffMember?.memberId === memberId,
                  );
                  const cachedMember = membersById[memberId];
                  const member = assignedMember?.staffMember ?? cachedMember;
                  const memberName = member?.fullName ?? `Member #${memberId}`;
                  const memberEmail = member?.userEmail ?? cachedMember?.userEmail ?? 'Không có email';
                  const isCheckedIn = attendance.checkinAt != null;
                  const isCheckedOut = attendance.checkoutAt != null;
                  const isAuthorizedDelegate =
                    attendanceByMemberIdForSession != null && attendanceByMemberIdForSession === memberId;
                  return (
                    <div
                      key={attendance.attendanceId}
                      className="grid grid-cols-1 items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 md:grid-cols-[1fr_1.2fr_auto]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                          {getInitials(memberName)}
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
                            Đã được ủy quyền
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
                                const attendanceList = await attendanceApi.getFilter({
                                  sessionId: activeSession.sessionId,
                                  attendanceByMemberId:
                                    attendanceByMemberIdForSession ?? undefined,
                                  pageNumber: 1,
                                  pageSize: 100,
                                });
                                setAttendanceItems(attendanceList.items ?? []);
                                // Refresh bảng ngoài để thẻ ủy quyền/khả năng check-out cập nhật ngay.
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
    </div>
  );
}

