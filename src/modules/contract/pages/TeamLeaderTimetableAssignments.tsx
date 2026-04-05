import { useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import {
  CalendarDays,
  ChevronRight,
  Globe,
  LogIn,
  LogOut,
  MapPin,
  X,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/shared/components/common/DataTable';
import HoverSearch from '@/shared/components/ui/search';
import { getSessionStatusInfo } from '@/constants/status';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/shared/lib/utils';
import {
  useTeamLeaderTimetableAssignments,
  type TeamLeaderTimetableAssignmentRow,
} from '@/modules/contract/hooks/useTeamLeaderTimetableAssignments';
import { useTeamLeaderAttendancePanel } from '@/modules/contract/hooks/useTeamLeaderAttendancePanel';
import requestApi from '@/modules/request/api/requestApi';
import TeamLeaderSessionDetailPanel from '@/modules/request/pages/TeamLeaderSessionDetailPanel';
import type { RequestListItem, RequestSessionSummary } from '@/modules/request/request';
import TeamLeaderAttendanceSlideOver from '@/modules/contract/components/TeamLeaderAttendanceSlideOver';

function formatDateTime(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(value?: string) {
  if (!value) return '—';
  return dayjs(value).locale('vi').format('DD/MM/YYYY');
}

function formatTimeRange(startAt?: string, endAt?: string) {
  if (!startAt || !endAt) return '—';
  return `${dayjs(startAt).format('HH:mm')} - ${dayjs(endAt).format('HH:mm')}`;
}

function getSessionDisplayName(row: TeamLeaderTimetableAssignmentRow) {
  if (row.sessionNo != null) return `Phiên ${row.sessionNo}`;
  return 'Phiên dạy';
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
  const location = useLocation();
  const rolePrefix = location.pathname.startsWith('/teacher/') ? '/teacher' : '/tl';
  const isTeacherRoute = rolePrefix === '/teacher';
  const [tlViewMode, setTlViewMode] = useState<'team' | 'me'>('team');
  const byMember = isTeacherRoute ? true : tlViewMode === 'me';
  const isAttendanceTab = props?.isAttendanceTab ?? false;
  const isEmbedded = props?.embedded ?? false;
  const statuses = useMemo(() => {
    if (byMember) return ['ASSIGNED', 'ONGOING'];
    if (isAttendanceTab) return ['ASSIGNED', 'ONGOING'];
    // TL (timetable/assignments) phải theo đúng session/filter để đúng trạng thái phiên.
    return ['ASSIGNED', 'ONGOING'];
  }, [byMember, isAttendanceTab]);
  const internal = useTeamLeaderTimetableAssignments({ pageSize: 8, statuses, todayOnly: isAttendanceTab, byMember });

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
    refreshAttendanceItems,
  } = useTeamLeaderAttendancePanel({ refetch });

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailRequest, setDetailRequest] = useState<RequestListItem | null>(null);
  const [detailSession, setDetailSession] = useState<RequestSessionSummary | null>(null);
  const [detailRow, setDetailRow] = useState<TeamLeaderTimetableAssignmentRow | null>(null);
  const detailFetchSeq = useRef(0);

  const closeDetail = () => {
    detailFetchSeq.current += 1;
    setDetailOpen(false);
    setDetailLoading(false);
    setDetailError(null);
    setDetailRequest(null);
    setDetailSession(null);
    setDetailRow(null);
  };

  const openDetail = async (row: TeamLeaderTimetableAssignmentRow) => {
    if (!row?.sessionId) return;
    if (!row?.requestId) {
      setDetailOpen(true);
      setDetailLoading(false);
      setDetailRequest(null);
      setDetailSession(null);
      setDetailRow(row);
      setDetailError('Không tìm thấy requestId của phiên này.');
      return;
    }

    detailFetchSeq.current += 1;
    const seq = detailFetchSeq.current;

    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetailRequest(null);
    setDetailSession(null);
    setDetailRow(row);

    try {
      const requestDetail = await requestApi.getById(row.requestId);
      if (seq !== detailFetchSeq.current) return;

      const rawSession = (requestDetail.sessions ?? []).find(
        (s) => Number(s.sessionId) === row.sessionId,
      ) as RequestSessionSummary | undefined;

      if (!rawSession) {
        throw new Error('Không tìm thấy phiên trong yêu cầu.');
      }

      setDetailRequest(requestDetail);
      setDetailSession(rawSession);
    } catch (err: unknown) {
      if (seq !== detailFetchSeq.current) return;
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Không tải được chi tiết phiên.';
      setDetailError(msg);
    } finally {
      if (seq !== detailFetchSeq.current) return;
      setDetailLoading(false);
    }
  };

  const columns: ColumnDef<TeamLeaderTimetableAssignmentRow>[] = useMemo(
    () => {
      if (!isAttendanceTab && !byMember) {
        return [
          {
            id: 'date',
            header: 'NGÀY',
            enableSorting: false,
            cell: ({ row }) => (
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-900">
                  {formatDate(row.original.startAt)}
                </span>
                <span className="text-xs text-slate-500">{formatTimeRange(row.original.startAt, row.original.endAt)}</span>
              </div>
            ),
          },
          {
            id: 'sessionName',
            header: 'PHIÊN',
            enableSorting: false,
            cell: ({ row }) => (
              <div className="min-w-0 max-w-[260px] md:max-w-[320px]">
                <div className="text-[13px] font-semibold text-slate-900 line-clamp-2">
                  {row.original.requestName || row.original.requestCode || '—'}
                </div>
                <div className="text-[11px] text-slate-500">{getSessionDisplayName(row.original)}</div>
              </div>
            ),
          },
          {
            id: 'requestCode',
            header: 'YÊU CẦU',
            enableSorting: false,
            cell: ({ row }) => (
              <div className="min-w-0 max-w-[180px]">
                <div className="text-xs text-slate-600 truncate">
                  <span className="font-semibold text-slate-900">{row.original.requestCode ?? '—'}</span>
                </div>
              </div>
            ),
          },
          {
            id: 'sessionStatus',
            header: 'Trạng thái phiên',
            enableSorting: false,
            cell: ({ row }) => {
              const info = getSessionStatusInfo(row.original.status);
              return (
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold border ${info.className}`}
                >
                  {info.label}
                </span>
              );
            },
          },
          {
            id: 'location',
            header: 'ĐỊA ĐIỂM',
            enableSorting: false,
            cell: ({ row }) => {
              const online =
                row.original.isOnline === true ||
                String(row.original.location ?? '').toLowerCase().includes('online');
              return (
                <div className="flex items-start gap-2 max-w-[220px]">
                  {online ? (
                    <Globe className="h-4 w-4 text-violet-500 mt-0.5" />
                  ) : (
                    <MapPin className="h-4 w-4 text-sky-600 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-slate-900 truncate">
                      {row.original.location || '—'}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">{online ? 'Online' : 'Offline'}</div>
                  </div>
                </div>
              );
            },
          },
          {
            id: 'operation',
            header: 'THAO TÁC',
            enableSorting: false,
            cell: ({ row }) => (
              <button
                type="button"
                onClick={() => void openDetail(row.original)}
                className="inline-flex items-center gap-0.5 text-sm font-medium text-sky-600 underline-offset-2 hover:text-sky-800 hover:underline whitespace-nowrap"
                title="Xem chi tiết phiên học"
              >
                Xem chi tiết
                <ChevronRight className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              </button>
            ),
          },
        ];
      }

      // Attendance tab: giữ nguyên layout cũ (có cột Check-in/Check-out).
      return [
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
          id: 'requestCode',
          header: 'Mã request',
          enableSorting: false,
          cell: ({ row }) => (
            <span className="text-xs text-gray-700 whitespace-nowrap font-semibold">
              {row.original.requestCode ?? '—'}
            </span>
          ),
        },
        {
          id: 'sessionNo',
          header: 'Buổi số',
          enableSorting: false,
          cell: ({ row }) => (
            <span className="text-xs text-gray-700 whitespace-nowrap">
              Buổi: {row.original.sessionNo ?? '—'}
            </span>
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
              <span
                className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold border ${info.className}`}
              >
                {label}
              </span>
            );
          },
        },
        ...(isAttendanceTab
          ? [
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
                    const isAssigned = statusUpper.includes('ASSIGNED');

                    const isResponsibleForSession =
                      jwtMemberId != null &&
                      attendanceByMemberId != null &&
                      attendanceByMemberId === jwtMemberId;

                    const checkinAt = row.original.checkinAt ?? null;
                    const checkoutAt = row.original.checkoutAt ?? null;

                    const canCheckin =
                      isAttendanceTab && !isCompletedSession && (isOngoing || isAssigned) && isResponsibleForSession;
                    const canCheckout =
                      isAttendanceTab && isResponsibleForSession && checkoutAt == null;

                    /** Đã ủy quyền / người khác là người điểm danh: chỉ disable 2 nút (không đổi nội dung ô). */
                    const someoneElseIsDelegate =
                      attendanceByMemberId != null && jwtMemberId != null && attendanceByMemberId !== jwtMemberId;

                    const dashNode = (
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-400 whitespace-nowrap">
                        --
                      </span>
                    );

                    const checkinNode = (() => {
                      if (isAttendanceTab) {
                        const checkinDisabledCls =
                          'inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700 whitespace-nowrap opacity-60 cursor-not-allowed';

                        if (someoneElseIsDelegate) {
                          if (checkinAt != null) {
                            return (
                              <button
                                type="button"
                                disabled
                                className={checkinDisabledCls}
                                title="Bạn không còn là người điểm danh phiên này"
                              >
                                <LogIn className="h-3 w-3" />
                                Check-in: {formatDateTime(checkinAt ?? undefined)}
                              </button>
                            );
                          }
                          return (
                            <button
                              type="button"
                              disabled
                              className={checkinDisabledCls}
                              title="Bạn không còn là người điểm danh phiên này"
                            >
                              <LogIn className="h-3 w-3" />
                              Check-in
                            </button>
                          );
                        }

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
                        const checkoutDisabledCls =
                          'inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700 whitespace-nowrap opacity-60 cursor-not-allowed';

                        if (someoneElseIsDelegate) {
                          if (checkoutAt != null) {
                            return (
                              <button
                                type="button"
                                disabled
                                className={checkoutDisabledCls}
                                title="Bạn không còn là người điểm danh phiên này"
                              >
                                <LogOut className="h-3 w-3" />
                                Check-out: {formatDateTime(checkoutAt ?? undefined)}
                              </button>
                            );
                          }
                          return (
                            <button
                              type="button"
                              disabled
                              className={checkoutDisabledCls}
                              title="Bạn không còn là người điểm danh phiên này"
                            >
                              <LogOut className="h-3 w-3" />
                              Check-out
                            </button>
                          );
                        }

                        if (!isResponsibleForSession) {
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
              },
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
          id: 'operation',
          header: 'Thao tác',
          enableSorting: false,
          cell: ({ row }) => (
            <button
              type="button"
              onClick={() => void openDetail(row.original)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:underline underline-offset-2 whitespace-nowrap"
              title="Xem chi tiết phiên học"
            >
              Xem chi tiết
              <ChevronRight className="h-4 w-4 shrink-0 text-sky-700 opacity-80" aria-hidden />
            </button>
          ),
        },
      ];
    },
    [isAttendanceTab, currentMemberId, openPanel],
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
        <div
          className={cn(
            'shrink-0 rounded-2xl border border-slate-200 bg-white shadow-sm',
            isTeacherRoute ? 'px-5 py-3.5' : 'px-6 py-4',
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <h2
                className={cn(
                  'font-semibold text-slate-900',
                  isTeacherRoute ? 'text-xl' : 'text-2xl',
                )}
              >
                Lịch trình và phân công
              </h2>
              <p className={cn(isTeacherRoute ? 'mt-0.5 text-[13px]' : 'mt-1 text-sm', 'text-slate-500')}>
                {isTeacherRoute
                  ? 'Theo dõi các phiên dạy của bạn theo từng buổi.'
                  : byMember
                  ? 'Theo dõi các phiên dạy của bạn theo từng buổi.'
                  : 'Theo dõi phiên dạy, lịch trình của team theo từng buổi.'}
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
                  placeholder={
                    !isAttendanceTab && !byMember
                      ? 'Tìm theo phiên/địa điểm/yêu cầu...'
                      : 'Tìm theo phiên/địa điểm/trạng thái...'
                  }
                />
              </div>
              {!isTeacherRoute && (
                <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setTlViewMode('team');
                      setPageNumber(1);
                      setSearch('');
                    }}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold transition-colors',
                      tlViewMode === 'team'
                        ? 'bg-sky-50 text-sky-700 shadow-sm'
                        : 'text-slate-500 hover:bg-slate-50',
                    )}
                    title="Xem lịch theo team"
                  >
                    Team
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTlViewMode('me');
                      setPageNumber(1);
                      setSearch('');
                    }}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold transition-colors',
                      tlViewMode === 'me'
                        ? 'bg-sky-50 text-sky-700 shadow-sm'
                        : 'text-slate-500 hover:bg-slate-50',
                    )}
                    title="Xem lịch của tôi"
                  >
                    Của tôi
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => navigate(`${rolePrefix}/timetable`)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
                title="Mở thời khóa biểu"
              >
                <CalendarDays className="h-4 w-4" />
                Mở lịch
              </button>
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
        className={`fixed inset-0 z-[80] transition ${detailOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
      >
        <div
          className={`absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity ${
            detailOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={closeDetail}
        />
        <aside
          className={`absolute right-0 top-0 h-full w-full max-w-[640px] border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ${
            detailOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-6 py-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-[#2197C0]">Chi tiết phiên</div>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">
                  Phiên {detailSession?.sessionNo ?? '—'}
                </h3>
                <p className="text-xs text-slate-500">
                  {detailSession
                    ? `${formatDate(detailSession.startAt)} • ${formatDateTime(detailSession.startAt)}-${formatDateTime(detailSession.endAt)}`
                    : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                  onClick={closeDetail}
                  aria-label="Đóng chi tiết phiên"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {detailLoading && <p className="text-xs text-gray-500">Đang tải chi tiết phiên...</p>}
              {detailError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 p-3 rounded-xl">
                  {detailError}
                </p>
              )}
              {detailRequest && detailSession && !detailLoading && !detailError && (
                <TeamLeaderSessionDetailPanel
                  session={detailSession}
                  requestCode={detailRequest.requestCode ?? ''}
                  requestName={detailRequest.requestName ?? ''}
                  memberDelegateColumnVisible={!isTeacherRoute}
                  delegateColumn={
                    detailRow
                      ? {
                          currentMemberId,
                          sessionAttendanceByMemberId: detailRow.attendanceByMemberId ?? null,
                          onDelegated: () => {
                            void refetch();
                          },
                        }
                      : undefined
                  }
                  onOpenAttendance={
                    detailRow
                      ? () => {
                          closeDetail();
                          openPanel(detailRow, 'checkin');
                        }
                      : undefined
                  }
                />
              )}
            </div>
          </div>
        </aside>
      </div>

      <TeamLeaderAttendanceSlideOver
        actionMode={actionMode}
        activeSession={activeSession}
        sessionDetail={sessionDetail}
        attendanceItems={attendanceItems}
        membersById={membersById}
        attendanceByMemberIdForSession={attendanceByMemberIdForSession}
        memberSearch={memberSearch}
        setMemberSearch={setMemberSearch}
        memberNotes={memberNotes}
        setMemberNotes={setMemberNotes}
        selectedMemberIds={selectedMemberIds}
        setSelectedMemberIds={setSelectedMemberIds}
        isSubmitting={isSubmitting}
        setIsSubmitting={setIsSubmitting}
        setActionMode={setActionMode}
        closePanel={closePanel}
        saveAttendance={saveAttendance}
        refreshAttendanceItems={refreshAttendanceItems}
        refetch={refetch}
      />
    </div>
  );
}
