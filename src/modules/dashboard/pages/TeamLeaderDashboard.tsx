import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { ChevronRight, Users, CalendarDays, CheckCircle2, Clock, AlertTriangle, FileText, BarChart3 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/components/ui/button';
import {
  dashboardApi,
  type DashboardRangeParams,
  type DashboardTeachingHistoryItem,
  type DashboardAttendanceHistoryItem,
} from '@/modules/dashboard/api/dashboardApi';
import memberApi from '@/modules/member/api/memberApi';

type KpiTone = 'sky' | 'indigo' | 'emerald' | 'amber';

function KpiCard(props: {
  title: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon: React.ReactNode;
  tone: KpiTone;
}) {
  const toneClass: Record<KpiTone, { ring: string; iconBg: string; iconFg: string }> = {
    sky: { ring: 'ring-sky-100/80', iconBg: 'bg-sky-50', iconFg: 'text-sky-600' },
    indigo: { ring: 'ring-indigo-100/80', iconBg: 'bg-indigo-50', iconFg: 'text-indigo-600' },
    emerald: { ring: 'ring-emerald-100/80', iconBg: 'bg-emerald-50', iconFg: 'text-emerald-600' },
    amber: { ring: 'ring-amber-100/80', iconBg: 'bg-amber-50', iconFg: 'text-amber-600' },
  };
  const t = toneClass[props.tone];
  return (
    <div className={cn('rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm ring-1', t.ring)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{props.title}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">{props.value}</p>
          {props.sub != null && <p className="mt-1 text-[11px] text-slate-400">{props.sub}</p>}
        </div>
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', t.iconBg, t.iconFg)}>
          {props.icon}
        </div>
      </div>
    </div>
  );
}

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

function toDateOnly(iso: string) {
  return dayjs(iso).format('YYYY-MM-DD');
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
              {dayjs(it.startAt).format('DD/MM/YYYY HH:mm')} - {dayjs(it.endAt).format('HH:mm')}
            </span>
            <span className="text-slate-300">•</span>
            <span className="truncate">{it.location || '—'}</span>
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
  const badgeLabel = missingCheckin ? 'Thiếu giờ vào' : missingCheckout ? 'Thiếu giờ ra' : '—';
  const badgeTone =
    missingCheckin || missingCheckout
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : 'border-slate-200 bg-slate-50 text-slate-600';
  return (
    <div
      className={cn(
        'rounded-xl border p-3',
        missingCheckin || missingCheckout ? 'border-amber-200/70 bg-amber-50/30' : 'border-slate-200/70 bg-slate-50/40',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900">{it.session?.sessionTitle ?? '—'}</div>
          <div className="mt-1 truncate text-xs text-slate-500">
            {it.request?.requestCode ? `${it.request.requestCode} · ` : ''}
            {it.request?.requestName ?? '—'}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              {dayjs(it.session.startAt).format('DD/MM/YYYY HH:mm')} - {dayjs(it.session.endAt).format('HH:mm')}
            </span>
            <span className="text-slate-300">•</span>
            <span className="truncate">{it.session.location || '—'}</span>
          </div>
        </div>

        <span className={cn('inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold', badgeTone)}>
          {badgeLabel}
        </span>
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

  const memberQ = useQuery({
    queryKey: ['tl-dashboard', 'member', memberId ?? 0],
    queryFn: () => memberApi.getMemberById(memberId as number),
    enabled: memberId != null,
  });
  const teamId = memberQ.data?.teamId ?? null;

  const teamStatsQ = useQuery({
    queryKey: ['tl-dashboard', 'team-stats', teamId ?? 0, effectiveRange],
    queryFn: () =>
      dashboardApi.getTeamsStatistics({
        teamId: teamId as number,
        from,
        toExclusive,
        pageNumber: 1,
        pageSize: 1,
      }),
    enabled: teamId != null,
  });

  const requestSummaryQ = useQuery({
    queryKey: ['tl-dashboard', 'request-summary', effectiveRange],
    queryFn: () => dashboardApi.getRequestSummary({ range: effectiveRange }),
  });

  const sessionSummaryQ = useQuery({
    queryKey: ['tl-dashboard', 'session-summary', effectiveRange],
    queryFn: () => dashboardApi.getSessionSummary({ range: effectiveRange }),
  });

  const teachingHistoryQ = useQuery({
    queryKey: ['tl-dashboard', 'teaching-history', memberId ?? 0, effectiveRange],
    queryFn: () =>
      dashboardApi.getUserTeachingHistory(memberId as number, {
        from,
        toExclusive,
        pageNumber: 1,
        pageSize: 6,
      }),
    enabled: memberId != null,
  });

  const attendanceIssuesQ = useQuery({
    queryKey: ['tl-dashboard', 'attendance-issues', memberId ?? 0, effectiveRange],
    queryFn: () =>
      dashboardApi.getUserAttendanceHistory(memberId as number, {
        from,
        toExclusive,
        missingCheckout: true,
        pageNumber: 1,
        pageSize: 6,
      }),
    enabled: memberId != null,
  });

  const contractsQ = useQuery({
    queryKey: ['tl-dashboard', 'contracts', memberId ?? 0, effectiveRange],
    queryFn: () =>
      dashboardApi.getMemberContractsStatistics(memberId as number, {
        fromDate: toDateOnly(from),
        toDate: toDateOnly(toInclusiveIso),
        pageNumber: 1,
        pageSize: 5,
      }),
    enabled: memberId != null,
  });

  const teachingItems = teachingHistoryQ.data?.items ?? [];
  const attendanceItems = attendanceIssuesQ.data?.items ?? [];
  const missingCheckoutTotal = Number(attendanceIssuesQ.data?.totalItems ?? 0) || 0;
  const teamStats = teamStatsQ.data?.items?.[0] ?? null;

  const teamProgressData = teamStats
    ? [
        { name: 'Hoàn thành', value: teamStats.completedSessions },
        { name: 'Sắp tới', value: teamStats.upcomingSessions },
        { name: 'Đã hủy', value: teamStats.canceledSessions },
      ]
    : [];

  const requestSessionData = [
    { name: 'Yêu cầu đang xử lý', value: (requestSummaryQ.data?.approvedRequests ?? 0) + (requestSummaryQ.data?.assigningRequests ?? 0) + (requestSummaryQ.data?.publishedRequests ?? 0) },
    { name: 'Yêu cầu hoàn thành', value: requestSummaryQ.data?.completedRequests ?? 0 },
    { name: 'Buổi đang dạy', value: sessionSummaryQ.data?.ongoingSessions ?? 0 },
    { name: 'Buổi hoàn thành', value: sessionSummaryQ.data?.completedSessions ?? 0 },
  ];

  const firstError =
    memberQ.error ??
    teamStatsQ.error ??
    requestSummaryQ.error ??
    sessionSummaryQ.error ??
    teachingHistoryQ.error ??
    attendanceIssuesQ.error ??
    contractsQ.error ??
    null;

  return (
    <div className="min-h-full space-y-5 app-page-bg p-6">
      <div className="rounded-xl border border-slate-200/80 bg-white px-6 py-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-slate-900">Dashboard trưởng nhóm</h2>
            <p className="mt-1 text-xs text-slate-500">
              Tổng quan team của bạn, tiến độ buổi dạy và các mục cần theo dõi.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-xs text-slate-500">Khoảng thời gian:</span>
            <select
              className="h-9 min-w-[160px] rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
              value={effectiveRange}
              onChange={(e) => setRange(e.target.value as NonNullable<DashboardRangeParams['range']>)}
            >
              <option value="today">Hôm nay</option>
              <option value="thisweek">Tuần này</option>
              <option value="thismonth">Tháng này</option>
              <option value="last3months">3 tháng gần đây</option>
              <option value="last6months">6 tháng gần đây</option>
              <option value="1year">1 năm gần đây</option>
            </select>
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              tone="sky"
              title="Thành viên team"
              value={teamStats?.totalMembers ?? '—'}
              sub={rangeLabelMap[effectiveRange]}
              icon={<Users className="h-5 w-5" />}
            />
            <KpiCard
              tone="indigo"
              title="Tổng buổi của team"
              value={teamStats?.totalSessions ?? '—'}
              sub={rangeLabelMap[effectiveRange]}
              icon={<CalendarDays className="h-5 w-5" />}
            />
            <KpiCard
              tone="emerald"
              title="Buổi hoàn thành"
              value={teamStats?.completedSessions ?? '—'}
              sub={teamStats ? `Sắp tới: ${teamStats.upcomingSessions}` : rangeLabelMap[effectiveRange]}
              icon={<CheckCircle2 className="h-5 w-5" />}
            />
            <KpiCard
              tone="amber"
              title="Tổng giờ dạy team"
              value={teamStats ? Number(teamStats.totalTeachingHours ?? 0).toFixed(1) : '—'}
              sub={rangeLabelMap[effectiveRange]}
              icon={<Clock className="h-5 w-5" />}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-indigo-600" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Tiến độ buổi team</p>
                    <p className="text-xs text-slate-500">Theo {rangeLabelMap[effectiveRange]}</p>
                  </div>
                </div>
              </div>
              {teamProgressData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={teamProgressData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip formatter={(value: any) => Number(value ?? 0).toLocaleString('vi-VN')} wrapperClassName="text-xs" />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#0ea5e9" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-8 text-center text-xs text-slate-500">Chưa có dữ liệu team.</p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-sky-600" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Yêu cầu & buổi</p>
                    <p className="text-xs text-slate-500">Tổng quan hệ thống theo kỳ</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {requestSessionData.map((it) => (
                  <div key={it.name} className="flex items-center justify-between rounded-lg border border-slate-200/70 bg-slate-50/40 px-3 py-2">
                    <span className="text-xs font-medium text-slate-700">{it.name}</span>
                    <span className="text-sm font-semibold text-slate-900">{it.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm lg:col-span-2">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Buổi đã dạy gần đây</p>
                  <p className="text-xs text-slate-500">Trong {rangeLabelMap[effectiveRange]}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" className="text-sky-700" onClick={() => (window.location.href = '/tl/teaching-history')}>
                  Xem danh sách
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-3">
                {teachingItems.length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-500">Chưa có dữ liệu.</p>
                ) : (
                  teachingItems.map((it) => <TeachingHistoryRow key={it.sessionId} item={it} />)
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Cần chú ý</p>
                  <p className="text-xs text-slate-500">
                    Thiếu giờ ra: <span className="font-semibold text-amber-700">{missingCheckoutTotal}</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </div>
              <div className="space-y-3">
                {attendanceItems.length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-500">Không có buổi thiếu giờ ra.</p>
                ) : (
                  attendanceItems.map((it) => <AttendanceIssueRow key={it.attendanceId} item={it} />)
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Hợp đồng & thanh toán</p>
                  <p className="text-xs text-slate-500">Tổng quan trong {rangeLabelMap[effectiveRange]}</p>
                </div>
              </div>
              <Button type="button" variant="ghost" size="sm" className="text-sky-700" onClick={() => (window.location.href = '/tl/contracts')}>
                Xem hợp đồng
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>

            {contractsQ.data ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200/70 bg-slate-50/40 p-3">
                  <p className="text-[11px] font-medium uppercase text-slate-500">Tổng hợp đồng</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{contractsQ.data.totalContracts}</p>
                </div>
                <div className="rounded-xl border border-slate-200/70 bg-slate-50/40 p-3">
                  <p className="text-[11px] font-medium uppercase text-slate-500">Hợp đồng gần đây</p>
                  <p className="mt-1 text-xs text-slate-600">{contractsQ.data.contracts?.items?.length ?? 0} mục (trang 1)</p>
                </div>
              </div>
            ) : (
              <p className="py-6 text-center text-xs text-slate-500">Chưa có dữ liệu hợp đồng.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
