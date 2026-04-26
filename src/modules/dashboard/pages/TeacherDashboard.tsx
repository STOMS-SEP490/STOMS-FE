import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  ChevronRight,
  Clock,
  AlertTriangle,
  FileText,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  DollarSign,
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
import { getStaffRoleId, getRoleBadgeClass, ROLE_MAP } from '@/constants/role';

type KpiTone = 'sky' | 'indigo' | 'emerald' | 'amber' | 'rose';

function KpiCard(props: {
  title: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon: React.ReactNode;
  tone: KpiTone;
  trend?: number;
  trendLabel?: string;
}) {
  const toneClass: Record<KpiTone, { ring: string; iconBg: string; iconFg: string }> = {
    sky: { ring: 'ring-sky-100/80', iconBg: 'bg-sky-50', iconFg: 'text-sky-600' },
    indigo: { ring: 'ring-indigo-100/80', iconBg: 'bg-indigo-50', iconFg: 'text-indigo-600' },
    emerald: { ring: 'ring-emerald-100/80', iconBg: 'bg-emerald-50', iconFg: 'text-emerald-600' },
    amber: { ring: 'ring-amber-100/80', iconBg: 'bg-amber-50', iconFg: 'text-amber-600' },
    rose: { ring: 'ring-rose-100/80', iconBg: 'bg-rose-50', iconFg: 'text-rose-600' },
  };
  const t = toneClass[props.tone];
  
  const showTrend = props.trend !== undefined && props.trend !== null;
  const isPositive = (props.trend ?? 0) >= 0;
  const trendColor = isPositive ? 'text-emerald-600' : 'text-rose-600';
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div className={cn('rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm ring-1', t.ring)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{props.title}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">{props.value}</p>
          {props.sub != null && <p className="mt-1 text-[11px] text-slate-400">{props.sub}</p>}
          {showTrend && (
            <div className={cn('mt-2 flex items-center gap-1 text-xs font-medium', trendColor)}>
              <TrendIcon className="h-3.5 w-3.5" />
              <span>{Math.abs(props.trend ?? 0).toFixed(1)}%</span>
              {props.trendLabel && <span className="text-slate-500 font-normal ml-1">{props.trendLabel}</span>}
            </div>
          )}
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
  // BE Postgres timestamp without time zone: gửi dạng local không kèm "Z"/offset để tránh Kind=UTC.
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
      // ISO-like week: Monday start
      const dow = now.day(); // Sunday=0
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

  // Get role ID and use constants for styling
  const roleId = getStaffRoleId(it.role);
  const roleLabel = roleId ? ROLE_MAP[roleId] : (it.role || '—');
  const badgeClass = roleId ? getRoleBadgeClass(roleId) : 'bg-slate-100 text-slate-600 border-slate-200';
  
  // Container styling based on role
  const containerBorder = roleId === 4 ? 'border-violet-200/70' : roleId === 5 ? 'border-amber-200/70' : 'border-slate-200/70';
  const containerBg = roleId === 4 ? 'bg-violet-50/30' : roleId === 5 ? 'bg-amber-50/30' : 'bg-slate-50/40';

  return (
    <div className={cn('rounded-xl border p-3', containerBorder, containerBg)}>
      <div className="flex flex-col gap-2">
        <div>
          <div className="text-sm font-semibold text-slate-900 truncate">{it.sessionTitle || `Buổi ${it.sessionNo}`}</div>
          <div className="mt-1 text-xs text-slate-500 truncate">
            {it.request?.requestCode ? `${it.request.requestCode} · ` : ''}
            {it.request?.requestName ?? '—'}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 min-w-0">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              {dayjs(it.startAt).format('DD/MM/YYYY HH:mm')} - {dayjs(it.endAt).format('HH:mm')}
            </span>
            <span className="text-slate-300">•</span>
            <span className="truncate">{it.location || '—'}</span>
          </div>
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap shrink-0',
              badgeClass
            )}
          >
            {roleLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

function AttendanceIssueRow(props: { item: DashboardAttendanceHistoryItem }) {
  const it = props.item;
  const missingCheckin = !it.checkinAt;
  const missingCheckout = !!it.checkinAt && !it.checkoutAt;
  const badgeLabel = missingCheckin ? 'Chưa xác nhận' : missingCheckout ? 'Thiếu xác nhận' : '—';
  const badgeTone = missingCheckin || missingCheckout ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-600';
  return (
    <div
      className={cn(
        'rounded-xl border p-3',
        missingCheckin || missingCheckout ? 'border-amber-200/70 bg-amber-50/30' : 'border-slate-200/70 bg-slate-50/40',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-900 truncate">{it.session?.sessionTitle ?? '—'}</div>
          <div className="mt-1 text-xs text-slate-500 truncate">
            {it.request?.requestCode ? `${it.request.requestCode} · ` : ''}
            {it.request?.requestName ?? '—'}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              {dayjs(it.session?.startAt).format('DD/MM/YYYY HH:mm')} - {dayjs(it.session?.endAt).format('HH:mm')}
            </span>
            <span className="text-slate-300">•</span>
            <span className="truncate">{it.session?.location || '—'}</span>
          </div>
        </div>

        <span className={cn('shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap', badgeTone)}>
          {badgeLabel}
        </span>
      </div>
    </div>
  );
}

export default function TeacherDashboard() {
  const memberId = useMemo(() => getMemberId(), []);
  const [range, setRange] = useState<NonNullable<DashboardRangeParams['range']>>('thismonth');
  const effectiveRange: NonNullable<DashboardRangeParams['range']> = range ?? 'thismonth';
  const { from, toExclusive } = useMemo(() => resolveRange(effectiveRange), [effectiveRange]);
  const toInclusiveIso = useMemo(
    () => toLocalDateTimeParam(dayjs(toExclusive).subtract(1, 'millisecond')),
    [toExclusive]
  );

  const workloadQ = useQuery({
    queryKey: ['teacher-dashboard', 'workload', memberId ?? 0, effectiveRange],
    queryFn: () =>
      dashboardApi.getUserWorkload(memberId as number, {
        range: effectiveRange,
        from,
        to: toInclusiveIso,
      }),
    enabled: memberId != null,
  });

  const teachingHistoryQ = useQuery({
    queryKey: ['teacher-dashboard', 'teaching-history', memberId ?? 0, effectiveRange],
    queryFn: () =>
      dashboardApi.getUserTeachingHistory(memberId as number, {
        from,
        to: toInclusiveIso,
      }),
    enabled: memberId != null,
  });

  const attendanceIssuesQ = useQuery({
    queryKey: ['teacher-dashboard', 'attendance-issues', memberId ?? 0, effectiveRange],
    queryFn: () =>
      dashboardApi.getUserAttendanceHistory(memberId as number, {
        from,
        to: toInclusiveIso,
      }),
    enabled: memberId != null,
  });

  const contractsQ = useQuery({
    queryKey: ['teacher-dashboard', 'contracts', memberId ?? 0, effectiveRange],
    queryFn: () =>
      dashboardApi.getMemberContractsStatistics(memberId as number, {
        range: effectiveRange,
      }),
    enabled: memberId != null,
  });

  const teachingItems = teachingHistoryQ.data?.items ?? [];
  const attendanceItems = attendanceIssuesQ.data?.items ?? [];

  const missingCheckinTotal = Number(attendanceIssuesQ.data?.totalItems ?? 0) || 0;

  const firstError =
    workloadQ.error ?? teachingHistoryQ.error ?? attendanceIssuesQ.error ?? contractsQ.error ?? null;

  return (
    <div className="min-h-full space-y-4 app-page-bg p-6 pl-8">
      <div className="rounded-xl border border-slate-200/80 bg-white px-6 py-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-[#1a7a99]">Bảng điều khiển</h2>
            <p className="mt-1 text-xs text-slate-500">
              Tổng quan khối lượng tham gia, thu nhập ước tính và các buổi cần bạn chú ý.
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

          {/* KPI Cards - 4 metrics */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              tone="sky"
              title="Giờ dạy hoàn thành"
              value={workloadQ.data ? Number(workloadQ.data.totalTeachingHours ?? 0).toFixed(1) : '—'}
              sub={rangeLabelMap[effectiveRange]}
              icon={<Clock className="h-5 w-5" />}
              trend={workloadQ.data?.totalTeachingHoursChangePercent}
              trendLabel="so với kỳ trước"
            />
            <KpiCard
              tone="emerald"
              title="Buổi hoàn thành"
              value={workloadQ.data?.completedSessions ?? '—'}
              sub={rangeLabelMap[effectiveRange]}
              icon={<CheckCircle2 className="h-5 w-5" />}
              trend={workloadQ.data?.completedSessionsChangePercent}
              trendLabel="so với kỳ trước"
            />
            <KpiCard
              tone="rose"
              title="Buổi bị hủy"
              value={workloadQ.data?.canceledSessions ?? '—'}
              sub={rangeLabelMap[effectiveRange]}
              icon={<XCircle className="h-5 w-5" />}
              trend={workloadQ.data?.canceledSessionsChangePercent}
              trendLabel="so với kỳ trước"
            />
            <KpiCard
              tone="indigo"
              title="Thu nhập ước tính"
              value={
                workloadQ.data
                  ? new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                      maximumFractionDigits: 0,
                    }).format(workloadQ.data.estimatedIncome ?? 0)
                  : '—'
              }
              sub={rangeLabelMap[effectiveRange]}
              icon={<DollarSign className="h-5 w-5" />}
              trend={workloadQ.data?.estimatedIncomeChangePercent}
              trendLabel="so với kỳ trước"
            />
          </div>

          {/* Teaching History & Attendance Issues */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Teaching History - Takes 2 columns */}
            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm lg:col-span-2">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Buổi đã tham gia gần đây</p>
                  <p className="text-xs text-slate-500">
                    {teachingItems.length} buổi trong {rangeLabelMap[effectiveRange]}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-sky-700 hover:text-sky-800 hover:bg-sky-50"
                  onClick={() => (window.location.href = '/teacher/teaching-history')}
                >
                  Xem tất cả
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-3">
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

            {/* Attendance Issues - Takes 1 column */}
            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Cần chú ý</p>
                  <p className="text-xs text-slate-500">
                    <span className="font-semibold text-amber-700">{missingCheckinTotal}</span> buổi chưa xác nhận tham gia
                  </p>
                </div>
                <div className="shrink-0 rounded-lg bg-amber-50 p-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                </div>
              </div>
              <div className="space-y-3">
                {attendanceItems.length === 0 ? (
                  <div className="py-12 text-center">
                    <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-300 mb-3" />
                    <p className="text-sm text-emerald-600 font-medium">Tuyệt vời!</p>
                    <p className="text-xs text-slate-500 mt-1">Đã xác nhận tham gia tất cả các buổi</p>
                  </div>
                ) : (
                  attendanceItems.map((it: any) => <AttendanceIssueRow key={it.attendanceId} item={it} />)
                )}
              </div>
            </div>
          </div>

          {/* Contracts Section */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-indigo-50 p-2">
                  <FileText className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Hợp đồng & Thanh toán</p>
                  <p className="text-xs text-slate-500">Tổng quan trong {rangeLabelMap[effectiveRange]}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-sky-700 hover:text-sky-800 hover:bg-sky-50"
                onClick={() => (window.location.href = '/teacher/contracts')}
              >
                Xem chi tiết
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>

            {contractsQ.data ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-white p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-slate-500 font-medium uppercase">Tổng hợp đồng</p>
                    <FileText className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{contractsQ.data.totalContracts}</p>
                  <p className="text-xs text-slate-500 mt-1">Hợp đồng đã ký</p>
                </div>

                <div className="rounded-xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-white p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-emerald-600 font-medium uppercase">Đã thanh toán</p>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  </div>
                  <p className="text-2xl font-bold text-emerald-700">{contractsQ.data.paidContracts ?? 0}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                      maximumFractionDigits: 0,
                    }).format(contractsQ.data.paidValue ?? 0)}
                  </p>
                </div>

                <div className="rounded-xl border border-amber-200/70 bg-gradient-to-br from-amber-50 to-white p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-amber-600 font-medium uppercase">Chưa thanh toán</p>
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  </div>
                  <p className="text-2xl font-bold text-amber-700">{contractsQ.data.unpaidContracts ?? 0}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                      maximumFractionDigits: 0,
                    }).format(contractsQ.data.unpaidValue ?? 0)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">Chưa có dữ liệu hợp đồng</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

