import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { 
  ChevronRight, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileText, 
  BarChart3
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  dashboardApi,
  type DashboardRangeParams,
  type DashboardTeachingHistoryItem,
  type DashboardAttendanceHistoryItem,
} from '@/modules/dashboard/api/dashboardApi';
import memberApi from '@/modules/member/api/memberApi';

const rangeLabelMap: Record<NonNullable<DashboardRangeParams['range']>, string> = {
  today: 'Hôm nay',
  thisweek: 'Tuần này',
  thismonth: 'Tháng này',
  last3months: '3 tháng gần đây',
  last6months: '6 tháng gần đây',
  '1year': '1 năm gần đây',
};

function getMemberId(): number | null {
  try {
    const raw = localStorage.getItem('user') || '{}';
    const parsed = JSON.parse(raw) as any;
    const candidates = [
      parsed?.memberId,
      parsed?.member?.memberId,
      parsed?.memberDetail?.memberId,
      parsed?.profile?.memberId,
      parsed?.data?.memberId,
    ];
    const id = Number(candidates.find((x) => Number(x ?? 0) > 0) ?? 0);
    return id > 0 ? id : null;
  } catch {
    return null;
  }
}

function toLocalDateTimeParam(value: dayjs.Dayjs) {
  return value.format('YYYY-MM-DDTHH:mm:ss');
}

function resolveRange(effectiveRange: NonNullable<DashboardRangeParams['range']>) {
  const now = dayjs();
  switch (effectiveRange) {
    case 'today': {
      const from = now.startOf('day');
      const toExclusive = from.add(1, 'day');
      return { from: toLocalDateTimeParam(from), toExclusive: toLocalDateTimeParam(toExclusive) };
    }
    case 'thisweek': {
      const dow = now.day();
      const monday = dow === 0 ? now.subtract(6, 'day') : now.subtract(dow - 1, 'day');
      const from = monday.startOf('day');
      const toExclusive = from.add(7, 'day');
      return { from: toLocalDateTimeParam(from), toExclusive: toLocalDateTimeParam(toExclusive) };
    }
    case 'thismonth': {
      const from = now.startOf('month');
      const toExclusive = from.add(1, 'month');
      return { from: toLocalDateTimeParam(from), toExclusive: toLocalDateTimeParam(toExclusive) };
    }
    case 'last3months': {
      const startThisMonth = now.startOf('month');
      const from = startThisMonth.subtract(2, 'month');
      const toExclusive = startThisMonth.add(1, 'month');
      return { from: toLocalDateTimeParam(from), toExclusive: toLocalDateTimeParam(toExclusive) };
    }
    case 'last6months': {
      const startThisMonth = now.startOf('month');
      const from = startThisMonth.subtract(5, 'month');
      const toExclusive = startThisMonth.add(1, 'month');
      return { from: toLocalDateTimeParam(from), toExclusive: toLocalDateTimeParam(toExclusive) };
    }
    case '1year': {
      const startThisMonth = now.startOf('month');
      const from = startThisMonth.subtract(11, 'month');
      const toExclusive = startThisMonth.add(1, 'month');
      return { from: toLocalDateTimeParam(from), toExclusive: toLocalDateTimeParam(toExclusive) };
    }
  }
}

function TeachingHistoryRow(props: { item: DashboardTeachingHistoryItem }) {
  const it = props.item;
  const normalizedRole = (it.role ?? '').toLowerCase();
  const isAssistant =
    normalizedRole.includes('trợ') ||
    normalizedRole.includes('tro') ||
    normalizedRole.includes('ta') ||
    normalizedRole.includes('assistant') ||
    normalizedRole.includes('tutor');
  const isTeacher =
    normalizedRole.includes('giáo viên') ||
    normalizedRole.includes('giao vien') ||
    normalizedRole.includes('teacher');
  const containerBorder = isAssistant ? 'border-emerald-200/70' : isTeacher ? 'border-sky-200/70' : 'border-slate-200/70';
  const containerBg = isAssistant ? 'bg-emerald-50/30' : isTeacher ? 'bg-sky-50/40' : 'bg-slate-50/40';
  const roleBadgeToneClass = isAssistant
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : isTeacher
      ? 'border-sky-200 bg-sky-50 text-sky-700'
      : 'border-slate-200 bg-slate-50 text-slate-700';

  return (
    <div className={cn('rounded-xl border p-3', containerBorder, containerBg)}>
      <div className="flex items-start gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900">{it.sessionTitle || `Buổi ${it.sessionNo}`}</div>
          <div className="mt-1 truncate text-xs text-slate-500">
            {it.request?.requestCode ? `${it.request.requestCode} · ` : ''}
            {it.request?.requestName ?? '—'}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span className="font-semibold text-slate-900">
                {dayjs(it.startAt).format('DD/MM/YYYY HH:mm')} - {dayjs(it.endAt).format('HH:mm')}
              </span>
            </span>
            <span className="text-slate-300">•</span>
            <span className="truncate font-semibold text-slate-900">{it.location || '—'}</span>
            <span className="text-slate-300">•</span>
            <span
              className={cn(
                'inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                roleBadgeToneClass,
              )}
            >
              {it.role || '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AttendanceIssueRow(props: { item: DashboardAttendanceHistoryItem }) {
  const it = props.item;
  const missingCheckin = !it.checkinAt;
  const missingCheckout = !!it.checkinAt && !it.checkoutAt;
  
  return (
    <div
      className={cn(
        'rounded-xl border p-3',
        missingCheckin || missingCheckout ? 'border-amber-200/70 bg-amber-50/30' : 'border-slate-200/70 bg-slate-50/40',
      )}
    >
      <div className="flex flex-col gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900 truncate">{it.session?.sessionTitle ?? '—'}</div>
          <div className="mt-1 text-xs text-slate-500 truncate">
            {it.request?.requestCode ? `${it.request.requestCode} · ` : ''}
            {it.request?.requestName ?? '—'}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-semibold text-slate-900">
              {dayjs(it.session?.startAt).format('DD/MM/YYYY HH:mm')} - {dayjs(it.session?.endAt).format('HH:mm')}
            </span>
          </span>
          <span className="text-slate-300">•</span>
          <span className="truncate font-semibold text-slate-900">{it.session?.location || '—'}</span>
        </div>
      </div>
    </div>
  );
}

export default function TeamLeaderDashboard() {
  const memberId = useMemo(() => getMemberId(), []);
  const [range, setRange] = useState<NonNullable<DashboardRangeParams['range']>>('thismonth');
  const effectiveRange: NonNullable<DashboardRangeParams['range']> = range ?? 'thismonth';
  const { from, toExclusive } = useMemo(() => resolveRange(effectiveRange), [effectiveRange]);
  const toInclusiveIso = useMemo(() => toLocalDateTimeParam(dayjs(toExclusive).subtract(1, 'millisecond')), [toExclusive]);

  // 1. Get member info to find team
  const memberQ = useQuery({
    queryKey: ['tl-dashboard', 'member', memberId ?? 0],
    queryFn: () => memberApi.getMemberById(memberId as number),
    enabled: memberId != null,
  });
  const teamId = memberQ.data?.teamId ?? null;

  // 2. Team statistics (for team overview)
  const teamStatsQ = useQuery({
    queryKey: ['tl-dashboard', 'team-stats', teamId ?? 0, effectiveRange],
    queryFn: () =>
      dashboardApi.getTeamsStatistics({
        pageNumber: 1,
        pageSize: 1,
      }),
    enabled: teamId != null,
  });

  // 3. Personal teaching history (TL as a teacher/assistant)
  const teachingHistoryQ = useQuery({
    queryKey: ['tl-dashboard', 'teaching-history', memberId ?? 0, effectiveRange],
    queryFn: () =>
      dashboardApi.getUserTeachingHistory(memberId as number, {
        from,
        to: toInclusiveIso,
      }),
    enabled: memberId != null,
  });

  // 4. Personal attendance issues
  const attendanceIssuesQ = useQuery({
    queryKey: ['tl-dashboard', 'attendance-issues', memberId ?? 0, effectiveRange],
    queryFn: () =>
      dashboardApi.getUserAttendanceHistory(memberId as number, {
        from,
        to: toInclusiveIso,
      }),
    enabled: memberId != null,
  });

  // 5. Personal contracts
  const contractsQ = useQuery({
    queryKey: ['tl-dashboard', 'contracts', memberId ?? 0, effectiveRange],
    queryFn: () =>
      dashboardApi.getMemberContractsStatistics(memberId as number, {
        range: effectiveRange,
      }),
    enabled: memberId != null,
  });

  // Derived data
  const teamStats = teamStatsQ.data?.items?.[0] ?? null;
  const teachingItems = teachingHistoryQ.data?.items ?? [];
  const attendanceItems = attendanceIssuesQ.data?.items ?? [];
  const missingCheckoutTotal = Number(attendanceIssuesQ.data?.totalItems ?? 0) || 0;

  const firstError =
    memberQ.error ??
    teamStatsQ.error ??
    teachingHistoryQ.error ??
    attendanceIssuesQ.error ??
    contractsQ.error ??
    null;

  return (
    <div className="min-h-full space-y-4 app-page-bg p-6 pl-8">
      <div className="rounded-xl border border-slate-200/80 bg-white px-6 py-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-[#1a7a99]">Bảng điều khiển {teamStats?.teamName ?? 'Đang tải...'} </h2> <p className="text-xs text-slate-500">
                 
                </p>
            <p className="mt-1 text-xs text-slate-500">
              Quản lý nhóm, theo dõi hiệu suất và hoạt động cá nhân của bạn
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Select value={effectiveRange} onValueChange={(value) => setRange(value as NonNullable<DashboardRangeParams['range']>)}>
              <SelectTrigger className="w-[180px] h-9 border-slate-200 bg-white">
                <SelectValue placeholder="Chọn khoảng thời gian" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hôm nay</SelectItem>
                <SelectItem value="thisweek">Tuần này</SelectItem>
                <SelectItem value="thismonth">Tháng này</SelectItem>
                <SelectItem value="last3months">3 tháng gần đây</SelectItem>
                <SelectItem value="last6months">6 tháng gần đây</SelectItem>
                <SelectItem value="1year">1 năm gần đây</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    
      {memberId == null ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Không tìm thấy thông tin người dùng (memberId). Vui lòng đăng nhập lại.
        </div>
      ) : (
        <>
          {firstError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              Không tải được dữ liệu dashboard. Vui lòng kiểm tra đăng nhập/quyền truy cập hoặc API.
            </div>
          ) : null}

          {/* SECTION 1: TEAM OVERVIEW - Thông tin tổng quan về nhóm */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <div className="rounded-lg bg-indigo-50 p-2">
                <Users className="h-4 w-4 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Tổng quan nhóm</h3>
                <p className="text-xs text-slate-500">
                  {teamStats?.teamName ?? 'Đang tải...'} • {rangeLabelMap[effectiveRange]}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              <div className="rounded-lg border border-slate-200/70 bg-white p-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 mb-1">THÀNH VIÊN</p>
                <p className="text-xl font-bold text-slate-900">{teamStats?.totalMembers ?? '—'}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Hoạt động: {teamStats?.activeMembers ?? 0}
                </p>
              </div>

              <div className="rounded-lg border border-slate-200/70 bg-white p-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 mb-1">TỔNG BUỔI HỌC</p>
                <p className="text-xl font-bold text-slate-900">{teamStats?.totalSessions ?? '—'}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Buổi của nhóm</p>
              </div>

              <div className="rounded-lg border border-emerald-200/70 bg-white p-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-600 mb-1">ĐÃ HOÀN THÀNH</p>
                <p className="text-xl font-bold text-emerald-700">{teamStats?.completedSessions ?? '—'}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Buổi hoàn thành</p>
              </div>

              <div className="rounded-lg border border-sky-200/70 bg-white p-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-sky-600 mb-1">SẮP DIỄN RA</p>
                <p className="text-xl font-bold text-sky-700">{teamStats?.upcomingSessions ?? '—'}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Buổi sắp tới</p>
              </div>

              <div className="rounded-lg border border-rose-200/70 bg-white p-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-rose-600 mb-1">ĐÃ BỊ HỦY</p>
                <p className="text-xl font-bold text-rose-700">{teamStats?.canceledSessions ?? '—'}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Buổi bị hủy</p>
              </div>

              <div className="rounded-lg border border-amber-200/70 bg-white p-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-amber-600 mb-1">TỔNG GIỜ DẠY</p>
                <p className="text-xl font-bold text-amber-700">
                  {teamStats ? Number(teamStats.totalTeachingHours ?? 0).toFixed(1) : '—'}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">Giờ dạy nhóm</p>
              </div>
            </div>
          </div>

          {/* SECTION 2: TEAM PERFORMANCE - Hiệu suất và chỉ số trung bình */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <div className="rounded-lg bg-violet-50 p-2">
                <BarChart3 className="h-4 w-4 text-violet-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Hiệu suất nhóm</h3>
                <p className="text-xs text-slate-500">Các chỉ số đánh giá trung bình</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-slate-200/70 bg-white p-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 mb-1">TB GIỜ / THÀNH VIÊN</p>
                <p className="text-xl font-bold text-slate-900">
                  {teamStats ? Number(teamStats.averageTeachingHoursPerMember ?? 0).toFixed(1) : '—'}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">Giờ dạy trung bình mỗi người</p>
              </div>

              <div className="rounded-lg border border-slate-200/70 bg-white p-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 mb-1">TB BUỔI / THÀNH VIÊN</p>
                <p className="text-xl font-bold text-slate-900">
                  {teamStats ? Number(teamStats.averageSessionsPerMember ?? 0).toFixed(1) : '—'}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">Buổi học trung bình mỗi người</p>
              </div>

              <div className="rounded-lg border border-slate-200/70 bg-white p-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 mb-1">TỶ LỆ HOÀN THÀNH</p>
                <p className="text-xl font-bold text-slate-900">
                  {teamStats && teamStats.totalSessions > 0
                    ? ((teamStats.completedSessions / teamStats.totalSessions) * 100).toFixed(1)
                    : '—'}%
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {teamStats?.completedSessions ?? 0}/{teamStats?.totalSessions ?? 0} buổi
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 3 & 4: PERSONAL ACTIVITIES & ISSUES - Hoạt động cá nhân và vấn đề cần xử lý */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Personal Teaching History - 2 columns */}
            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm lg:col-span-2">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-sky-50 p-2">
                    <Clock className="h-4 w-4 text-sky-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Hoạt động cá nhân của bạn</p>
                    <p className="text-xs text-slate-500">
                      {teachingItems.length} buổi đã tham gia trong {rangeLabelMap[effectiveRange]}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-sky-700 hover:text-sky-800 hover:bg-sky-50"
                  onClick={() => (window.location.href = '/tl/teaching-history')}
                >
                  Xem tất cả
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {teachingItems.length === 0 ? (
                  <div className="py-12 text-center">
                    <Clock className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                    <p className="text-sm text-slate-500">Chưa có buổi học nào</p>
                    <p className="text-xs text-slate-400 mt-1">Dữ liệu sẽ hiển thị khi bạn tham gia buổi học</p>
                  </div>
                ) : (
                  teachingItems.map((it: any) => <TeachingHistoryRow key={it.sessionId} item={it} />)
                )}
              </div>
            </div>

            {/* Attendance Issues - 1 column */}
            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-amber-50 p-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Cần chú ý</p>
                    <p className="text-xs text-slate-500">
                      <span className="font-semibold text-amber-700">{missingCheckoutTotal}</span> buổi chưa xác nhận
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {attendanceItems.length === 0 ? (
                  <div className="py-12 text-center">
                    <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-300 mb-3" />
                    <p className="text-xs text-slate-500 mt-1">Đã xác nhận tham gia tất cả các buổi</p>
                  </div>
                ) : (
                  attendanceItems.map((it: any) => <AttendanceIssueRow key={it.attendanceId} item={it} />)
                )}
              </div>
            </div>
          </div>

          {/* SECTION 5: FINANCIAL - Hợp đồng và thanh toán */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-indigo-50 p-2">
                  <FileText className="h-4 w-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Hợp đồng & Thanh toán cá nhân</p>
                  <p className="text-xs text-slate-500">Tổng quan tài chính trong {rangeLabelMap[effectiveRange]}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-sky-700 hover:text-sky-800 hover:bg-sky-50"
                onClick={() => (window.location.href = '/tl/contracts')}
              >
                Xem chi tiết
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>

            {contractsQ.data ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-200/70 bg-white p-3">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 mb-1">TỔNG HỢP ĐỒNG</p>
                  <p className="text-xl font-bold text-slate-900">{contractsQ.data.totalContracts}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Hợp đồng đã ký</p>
                </div>

                <div className="rounded-lg border border-emerald-200/70 bg-white p-3">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-600 mb-1">ĐÃ THANH TOÁN</p>
                  <p className="text-xl font-bold text-emerald-700">{contractsQ.data.paidContracts ?? 0} </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                     {new Intl.NumberFormat('vi-VN', {
                      notation: 'compact',
                      compactDisplay: 'short',
                      maximumFractionDigits: 0,
                    }).format(contractsQ.data.paidValue ?? 0)} đ
                  </p>
                </div>

                <div className="rounded-lg border border-amber-200/70 bg-white p-3">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-amber-600 mb-1">CHƯA THANH TOÁN</p>
                  <p className="text-xl font-bold text-amber-700">{contractsQ.data.unpaidContracts ?? 0}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {new Intl.NumberFormat('vi-VN', {
                      notation: 'compact',
                      compactDisplay: 'short',
                      maximumFractionDigits: 0,
                    }).format(contractsQ.data.unpaidValue ?? 0)} đ
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center">
                <FileText className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">Chưa có dữ liệu hợp đồng</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
