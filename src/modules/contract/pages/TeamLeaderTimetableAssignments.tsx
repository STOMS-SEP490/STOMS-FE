import { useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  List,
  LogIn,
  LogOut,
  MapPin,
  UserCheck,
  X,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/shared/components/common/DataTable';
import { StatCard } from '@/shared/components/common/StatCard';
import HoverSearch from '@/shared/components/ui/search';
import { getSessionStatusInfo } from '@/constants/status';
import { useNavigate } from 'react-router-dom';
import { useTeamLeaderTimetableAssignments, type TeamLeaderTimetableAssignmentRow } from '@/modules/contract/hooks/useTeamLeaderTimetableAssignments';
import sessionApi from '@/modules/request/api/sessionApi';
import attendanceApi from '../../request/api/attendanceApi';
import memberApi from '@/modules/request/api/memberApi';
import type { AttendanceItem, MemberDetail, SessionDetail } from '@/modules/request/api/type';

function formatDateTime(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('vi-VN');
}

function formatRange(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
}

function getInitials(name?: string) {
  if (!name) return 'NA';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function TeamLeaderTimetableAssignments() {
  const {
    items,
    loading,
    pageNumber,
    pageSize,
    totalItems,
    search,
    setSearch,
    setPageNumber,
    onlineCount,
    offlineCount,
  } = useTeamLeaderTimetableAssignments({ pageSize: 10 });
  const navigate = useNavigate();
  const [activeSession, setActiveSession] = useState<TeamLeaderTimetableAssignmentRow | null>(null);
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);
  const [memberNotes, setMemberNotes] = useState<Record<number, string>>({});
  const [attendanceItems, setAttendanceItems] = useState<AttendanceItem[]>([]);
  const [membersById, setMembersById] = useState<Record<number, MemberDetail>>({});
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [actionMode, setActionMode] = useState<'delegate' | 'checkin' | 'checkout' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getCurrentMemberId = () => {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { memberId?: number };
      return parsed.memberId ?? null;
    } catch {
      return null;
    }
  };

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
        id: 'session',
        header: 'Phiên học',
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                #{row.original.sessionNo ?? '—'}
              </span>
              <span className="text-sm font-semibold text-slate-900">Phiên học</span>
            </div>
            <span className="text-xs text-gray-500">Session ID: {row.original.sessionId}</span>
          </div>
        ),
      },
      {
        id: 'time',
        header: 'Ngày · giờ',
        cell: ({ row }) => (
          <div className="text-sm text-gray-700">
            <div className="font-medium text-gray-900">{formatDate(row.original.startAt)}</div>
            <div className="text-xs text-gray-500">
              {formatDateTime(row.original.startAt)} - {formatDateTime(row.original.endAt)}
            </div>
          </div>
        ),
      },
      {
        id: 'location',
        header: 'Địa điểm',
        cell: ({ row }) => (
          <div className="flex flex-col text-sm text-gray-700">
            <span className="font-medium text-slate-900">{row.original.location || '—'}</span>
            <span className="text-xs text-gray-500">
              {(row.original.location ?? '').toLowerCase().includes('online') ? 'Hình thức: Online' : 'Hình thức: Offline'}
            </span>
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => {
          const info = getSessionStatusInfo(row.original.status);
          return (
            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold border ${info.className}`}>
              {info.label}
            </span>
          );
        },
      },
      {
        id: 'actions',
        header: 'Điểm danh',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => {
                setActiveSession(row.original);
                setActionMode('delegate');
                setMemberNotes({});
                setMemberSearch('');
                setSelectedMemberIds([]);
                const memberId = getCurrentMemberId();
                const detail = await sessionApi.getById(row.original.sessionId);
                setSessionDetail(detail);
                const attendance = await attendanceApi.getFilter({
                  sessionId: row.original.sessionId,
                  attendanceByMemberId: memberId ?? undefined,
                  pageNumber: 1,
                  pageSize: 100,
                });
                const memberIds = (attendance.items ?? []).map((item) => item.memberId);
                const memberDetails = await Promise.all(
                  memberIds.map(async (id) => ({
                    id,
                    detail: await memberApi.getById(id),
                  })),
                );
                const map = memberDetails.reduce<Record<number, MemberDetail>>(
                  (acc, item) => {
                    acc[item.id] = item.detail;
                    return acc;
                  },
                  {},
                );
                setMembersById(map);
                setAttendanceItems(attendance.items ?? []);
              }}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100"
              title="Ủy quyền điểm danh cho member trong phiên này"
            >
              <UserCheck className="h-3 w-3" />
              Ủy quyền
            </button>
            <button
              type="button"
              onClick={async () => {
                setActiveSession(row.original);
                setActionMode('checkin');
                setMemberNotes({});
                setMemberSearch('');
                setSelectedMemberIds([]);
                const memberId = getCurrentMemberId();
                const detail = await sessionApi.getById(row.original.sessionId);
                setSessionDetail(detail);
                const attendance = await attendanceApi.getFilter({
                  sessionId: row.original.sessionId,
                  attendanceByMemberId: memberId ?? undefined,
                  pageNumber: 1,
                  pageSize: 100,
                });
                const memberIds = (attendance.items ?? []).map((item) => item.memberId);
                const memberDetails = await Promise.all(
                  memberIds.map(async (id) => ({
                    id,
                    detail: await memberApi.getById(id),
                  })),
                );
                const map = memberDetails.reduce<Record<number, MemberDetail>>(
                  (acc, item) => {
                    acc[item.id] = item.detail;
                    return acc;
                  },
                  {},
                );
                setMembersById(map);
                setAttendanceItems(attendance.items ?? []);
              }}
              className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700 transition hover:bg-sky-100"
              title="Check-in member cho phiên này"
            >
              <LogIn className="h-3 w-3" />
              Check-in
            </button>
            <button
              type="button"
              onClick={async () => {
                setActiveSession(row.original);
                setActionMode('checkout');
                setMemberNotes({});
                setMemberSearch('');
                setSelectedMemberIds([]);
                const memberId = getCurrentMemberId();
                const detail = await sessionApi.getById(row.original.sessionId);
                setSessionDetail(detail);
                const attendance = await attendanceApi.getFilter({
                  sessionId: row.original.sessionId,
                  attendanceByMemberId: memberId ?? undefined,
                  pageNumber: 1,
                  pageSize: 100,
                });
                const memberIds = (attendance.items ?? []).map((item) => item.memberId);
                const memberDetails = await Promise.all(
                  memberIds.map(async (id) => ({
                    id,
                    detail: await memberApi.getById(id),
                  })),
                );
                const map = memberDetails.reduce<Record<number, MemberDetail>>(
                  (acc, item) => {
                    acc[item.id] = item.detail;
                    return acc;
                  },
                  {},
                );
                setMembersById(map);
                setAttendanceItems(attendance.items ?? []);
              }}
              className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-100"
              title="Check-out member cho phiên này"
            >
              <LogOut className="h-3 w-3" />
              Check-out
            </button>
          </div>
        ),
      },
    ],
    [
      getCurrentMemberId,
      setActiveSession,
      setActionMode,
      setMemberNotes,
      setSessionDetail,
    ],
  );

  return (
    <div className="relative min-h-[var(--content-height,100vh)] bg-gradient-to-br from-slate-50 via-white to-sky-50 p-6">
      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-white/70 backdrop-blur-sm">
          <span className="text-sm text-muted-foreground">Đang tải danh sách...</span>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-sky-600">
              <CheckCircle2 className="h-4 w-4" />
              Timetable Assignments
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Quản lý phân công & điểm danh</h2>
            <p className="mt-1 text-sm text-slate-500">
              Theo dõi phiên dạy, ủy quyền điểm danh và check-in/check-out cho member theo từng buổi.
            </p>
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
              onClick={() => navigate('/tl/timetable/assignments')}
              className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-4 py-2 text-xs font-semibold text-sky-700 shadow-sm"
              title="Xem dạng bảng phân công"
            >
              <List className="h-4 w-4" />
              Danh sách
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard icon={<CalendarDays />} label="Tổng buổi" value={totalItems.toString()} sub="theo bộ lọc hiện tại" />
            <StatCard icon={<Clock />} label="Buổi online" value={onlineCount.toString()} sub="trong trang hiện tại" />
            <StatCard icon={<MapPin />} label="Buổi offline" value={offlineCount.toString()} sub="trong trang hiện tại" />
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <UserCheck className="h-4 w-4 text-emerald-500" />
              Hành động nhanh
            </div>
            <p className="text-xs text-slate-500">
              Ủy quyền điểm danh cho member hoặc tự check-in/check-out khi không ủy quyền.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                <UserCheck className="h-3 w-3" />
                Ủy quyền
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700">
                <LogIn className="h-3 w-3" />
                Check-in
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
                <LogOut className="h-3 w-3" />
                Check-out
              </span>
            </div>
            <div className="text-xs text-slate-500">
              Mẹo: bấm vào từng phiên để thao tác nhanh cho member trong buổi đó.
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Danh sách phiên cần xử lý</h3>
              <p className="text-xs text-slate-500">
                Chọn phiên để ủy quyền điểm danh hoặc check-in/check-out nhanh cho member.
              </p>
            </div>
            <HoverSearch value={search} onChange={setSearch} placeholder="Tìm theo phiên/địa điểm/trạng thái..." />
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 py-3 text-xs text-slate-500">
          Hiển thị tuần {formatRange(items[0]?.startAt)} – {formatRange(items[items.length - 1]?.endAt)}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <DataTable
          columns={columns}
          data={items}
          pageNumber={pageNumber}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={(page) => setPageNumber(page)}
        />
      </div>

      <div
        className={`fixed inset-0 z-40 transition ${actionMode ? 'pointer-events-auto' : 'pointer-events-none'}`}
      >
        <div
          className={`absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity ${
            actionMode ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => {
            setActionMode(null);
            setActiveSession(null);
            setSessionDetail(null);
          }}
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
                onClick={() => {
                  setActionMode(null);
                  setActiveSession(null);
                  setSessionDetail(null);
                }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <div>
                  <div className="font-semibold text-slate-900">Danh sách member được phân công</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Chọn member để {actionMode === 'delegate' ? 'ủy quyền điểm danh' : actionMode === 'checkin' ? 'check-in' : 'check-out'}.
                  </div>
                </div>
                {(actionMode === 'checkin' || actionMode === 'checkout') && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!activeSession || selectedMemberIds.length === 0) return;
                      setIsSubmitting(true);
                      try {
                        const items = selectedMemberIds.map((id) => ({
                          memberId: id,
                          note: memberNotes[id] ?? '',
                        }));
                        if (actionMode === 'checkin') {
                          await attendanceApi.checkIn({
                            sessionId: activeSession.sessionId,
                            items,
                          });
                        }
                        if (actionMode === 'checkout') {
                          await attendanceApi.checkOut({
                            sessionId: activeSession.sessionId,
                            items,
                          });
                        }
                        const attendanceList = await attendanceApi.getFilter({
                          sessionId: activeSession.sessionId,
                          attendanceByMemberId: getCurrentMemberId() ?? undefined,
                          pageNumber: 1,
                          pageSize: 100,
                        });
                        setAttendanceItems(attendanceList.items ?? []);
                        setSelectedMemberIds([]);
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                    disabled={isSubmitting || selectedMemberIds.length === 0}
                  >
                    Lưu điểm danh
                  </button>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
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
                          filteredAttendanceItems.length > 0 &&
                          filteredAttendanceItems.every((item) => selectedMemberIds.includes(item.memberId))
                        }
                        onChange={(event) => {
                          if (event.target.checked) {
                            const eligible = filteredAttendanceItems
                              .filter((item) =>
                                actionMode === 'checkin'
                                  ? !item.checkinAt
                                  : item.checkinAt && !item.checkoutAt,
                              )
                              .map((item) => item.memberId);
                            setSelectedMemberIds(eligible);
                          } else {
                            setSelectedMemberIds([]);
                          }
                        }}
                        className="h-4 w-4 rounded border-orange-300 text-orange-500 focus:ring-orange-500"
                        disabled={isSubmitting || filteredAttendanceItems.length === 0}
                      />
                      Chọn tất cả
                    </label>
                  )}
                </div>
              </div>

              <div className="mt-4 grid gap-3">
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
                  const isCheckedIn = !!attendance.checkinAt;
                  const isCheckedOut = !!attendance.checkoutAt;
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
                                attendanceByMemberId: memberId,
                                pageNumber: 1,
                                pageSize: 100,
                              });
                              setAttendanceItems(attendanceList.items ?? []);
                              setActionMode(null);
                            } finally {
                              setIsSubmitting(false);
                            }
                          }}
                          className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                          disabled={isSubmitting}
                        >
                          <UserCheck className="h-4 w-4" />
                          Ủy quyền
                        </button>
                      ) : (
                        <div className="grid w-full grid-cols-1 items-center gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
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
                          <div className="flex items-center justify-end gap-3">
                            {actionMode === 'checkin' && isCheckedIn ? (
                              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700">
                                {formatDateTime(attendance.checkinAt ?? undefined)}
                              </span>
                            ) : actionMode === 'checkout' && !isCheckedIn ? (
                              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500">
                                Chưa check-in
                              </span>
                            ) : actionMode === 'checkout' && isCheckedOut ? (
                              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700">
                                Đã check-out lúc {formatDateTime(attendance.checkoutAt ?? undefined)}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">&nbsp;</span>
                            )}
                            {(actionMode === 'checkin' || actionMode === 'checkout') && (
                              <label className="flex items-center gap-2 text-xs text-slate-500">
                                <input
                                  type="checkbox"
                                  checked={selectedMemberIds.includes(memberId)}
                                  onChange={(event) => {
                                    setSelectedMemberIds((prev) =>
                                      event.target.checked
                                        ? [...prev, memberId]
                                        : prev.filter((id) => id !== memberId),
                                    );
                                  }}
                                  className="h-4 w-4 rounded border-orange-300 text-orange-500 focus:ring-orange-500"
                                  disabled={
                                    (actionMode === 'checkin' && isCheckedIn) ||
                                    (actionMode === 'checkout' && (!isCheckedIn || isCheckedOut))
                                  }
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

