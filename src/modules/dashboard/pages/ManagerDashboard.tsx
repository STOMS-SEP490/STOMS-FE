import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, ClipboardList, Wallet, PieChart, Laptop, Calendar, ArrowLeftRight, Users, Download } from 'lucide-react';
import dayjs from 'dayjs';
import {
  ResponsiveContainer,
  PieChart as RCPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Brush,
  ReferenceLine,
} from 'recharts';
import { dashboardApi, type DashboardRangeParams } from '@/modules/dashboard/api/dashboardApi';
import { Checkbox, DatePicker, message, Modal } from 'antd';
import { getRoleLabel } from '@/constants/role';

type KpiTone = 'sky' | 'indigo' | 'blue' | 'purple' | 'emerald' | 'amber';

function formatCompactVnd(value: unknown): string {
  const n0 = Number(value ?? 0);
  if (!Number.isFinite(n0) || n0 === 0) return '0';
  const sign = n0 < 0 ? '-' : '';
  const n = Math.abs(n0);

  const fmt = (x: number) => {
    const s = x.toFixed(x >= 10 ? 0 : 1);
    return s.replace(/\.0$/, '');
  };

  if (n >= 1_000_000_000) return `${sign}${fmt(n / 1_000_000_000)}Tỷ`;
  if (n >= 1_000_000) return `${sign}${fmt(n / 1_000_000)}Tr`;
  if (n >= 1_000) return `${sign}${fmt(n / 1_000)}N`;
  return `${sign}${Math.round(n)}`;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function startOfWeekMonday(d: Date) {
  const x = startOfDay(d);
  const day = x.getDay(); // 0=Sun..6=Sat
  const diff = (day + 6) % 7; // Monday => 0
  x.setDate(x.getDate() - diff);
  return x;
}

function addMonths(d: Date, months: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + months);
  return x;
}

function getRangeBounds(range: NonNullable<DashboardRangeParams['range']>): { startAt: Date; endAt: Date } {
  const now = new Date();
  const endAt = now;
  switch (range) {
    case 'today':
      return { startAt: startOfDay(now), endAt };
    case 'thisweek':
      return { startAt: startOfWeekMonday(now), endAt };
    case 'thismonth':
      return { startAt: startOfMonth(now), endAt };
    case 'last3months':
      return { startAt: startOfMonth(addMonths(now, -2)), endAt };
    case 'last6months':
      return { startAt: startOfMonth(addMonths(now, -5)), endAt };
    case '1year':
      return { startAt: startOfMonth(addMonths(now, -11)), endAt };
    default:
      return { startAt: startOfMonth(now), endAt };
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function KpiCard(props: {
  title: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon: React.ReactNode;
  tone: KpiTone;
}) {
  const toneClass: Record<KpiTone, { bg: string; fg: string }> = {
    sky: { bg: 'bg-sky-50', fg: 'text-sky-700' },
    indigo: { bg: 'bg-indigo-50', fg: 'text-indigo-700' },
    blue: { bg: 'bg-blue-50', fg: 'text-blue-700' },
    purple: { bg: 'bg-purple-50', fg: 'text-purple-700' },
    emerald: { bg: 'bg-emerald-50', fg: 'text-emerald-700' },
    amber: { bg: 'bg-amber-50', fg: 'text-amber-700' },
  };
  const t = toneClass[props.tone];

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] text-slate-500 font-medium">{props.title}</p>
        <p className="mt-1 text-2xl font-semibold text-slate-900 truncate">{props.value}</p>
        {props.sub != null && (
          <p className="mt-1 text-[11px] text-slate-400 truncate">{props.sub}</p>
        )}
      </div>
      <div className={`shrink-0 h-9 w-9 rounded-xl ${t.bg} flex items-center justify-center`}>
        {props.icon}
      </div>
    </div>
  );
}

export default function ManagerDashboard() {
  const [range, setRange] = useState<NonNullable<DashboardRangeParams['range']>>('thismonth');
  const [contributorsWalletId, setContributorsWalletId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [selectedSheetTypes, setSelectedSheetTypes] = useState<number[]>([]);
  const [exportStartAt, setExportStartAt] = useState<Date | null>(null);
  const [exportEndAt, setExportEndAt] = useState<Date | null>(null);
  const effectiveRange: NonNullable<DashboardRangeParams['range']> = range ?? 'thismonth';

  const sheetTypeOptions: Array<{ value: number; label: string }> = [
    { value: 1, label: 'Yêu cầu tổ chức' },
    { value: 2, label: 'Buổi tổ chức' },
    { value: 3, label: 'Bảng phân công' },
    { value: 4, label: 'Bảng xác nhận tham gia' },
    { value: 5, label: 'Bảng công việc' },
    { value: 6, label: 'Bảng đóng góp' },
    { value: 7, label: 'Bảng giao dịch' },
  ];
  const { data: usersOverview } = useQuery({
    queryKey: ['dashboard', 'users-overview'],
    queryFn: () => dashboardApi.getUsersOverview(),
  });

  const { data: eventStatus } = useQuery({
    queryKey: ['dashboard', 'events-status'],
    queryFn: () => dashboardApi.getEventStatusDistribution(),
  });

  const { data: requestSummary } = useQuery({
    queryKey: ['dashboard', 'request-summary', effectiveRange],
    queryFn: () => dashboardApi.getRequestSummary({ range: effectiveRange }),
  });

  const { data: sessionSummary } = useQuery({
    queryKey: ['dashboard', 'session-summary', effectiveRange],
    queryFn: () => dashboardApi.getSessionSummary({ range: effectiveRange }),
  });

  const { data: sessionSummaryToday } = useQuery({
    queryKey: ['dashboard', 'session-summary', 'today'],
    queryFn: () => dashboardApi.getSessionSummary({ range: 'today' }),
  });

  const { data: walletSummary } = useQuery({
    queryKey: ['dashboard', 'wallet-summary', effectiveRange],
    queryFn: () => dashboardApi.getWalletSummary({ range: effectiveRange }),
  });

  const { data: walletMetrics } = useQuery({
    queryKey: ['dashboard', 'wallet-metrics', effectiveRange],
    queryFn: () => dashboardApi.getWalletMetrics({ range: effectiveRange }),
  });

  const { data: walletTopContributors } = useQuery({
    queryKey: ['dashboard', 'wallet-top-contributors', effectiveRange, contributorsWalletId ?? 'all'],
    queryFn: () =>
      dashboardApi.getWalletTopContributors({
        range: effectiveRange,
        walletId: contributorsWalletId ?? 0,
      }),
    enabled: contributorsWalletId != null,
  });

  const { data: totalIncomeExpenseSeries } = useQuery({
    queryKey: ['dashboard', 'wallet-metrics', 'series'],
    queryFn: async () => {
      const ranges: NonNullable<DashboardRangeParams['range']>[] = [
        'today',
        'thisweek',
        'thismonth',
        'last3months',
        'last6months',
        '1year',
      ];
      const results = await Promise.all(ranges.map((r) => dashboardApi.getWalletMetrics({ range: r })));

      return ranges.map((r, idx) => {
        const arr = results[idx] ?? [];
        const totalContribution = arr.reduce((sum: number, x: any) => sum + (Number(x.totalContribution) || 0), 0);
        const totalExpense = arr.reduce((sum: number, x: any) => sum + (Number(x.totalExpense) || 0), 0);
        return {
          range: r,
          label: rangeLabelMap[r],
          contribution: totalContribution,
          expense: totalExpense,
          net: totalContribution - totalExpense,
        };
      });
    },
  });

  const { data: skillStats } = useQuery({
    queryKey: ['dashboard', 'skills-statistics'],
    queryFn: () => dashboardApi.getSkillStatistics(),
  });

  const { data: equipmentStats } = useQuery({
    queryKey: ['dashboard', 'equipment-statistics'],
    queryFn: () => dashboardApi.getEquipmentStatistics(),
  });

  const { data: topicTeamDistribution } = useQuery({
    queryKey: ['dashboard', 'topic-team-distribution'],
    queryFn: () => dashboardApi.getTopicTeamDistribution(),
  });

  const { data: equipmentCategoryDistribution } = useQuery({
    queryKey: ['dashboard', 'equipment-category-distribution'],
    queryFn: () => dashboardApi.getEquipmentCategoryDistribution(),
  });

  const { data: courseSummary } = useQuery({
    queryKey: ['dashboard', 'course-summary'],
    queryFn: () => dashboardApi.getCourseSummary(),
  });

  const { data: subjectTopicDistribution } = useQuery({
    queryKey: ['dashboard', 'subject-topic-distribution'],
    queryFn: () => dashboardApi.getSubjectTopicDistribution(),
  });

  const { data: subjectSessionStatistics } = useQuery({
    queryKey: ['dashboard', 'subject-session-statistics'],
    queryFn: () => dashboardApi.getSubjectSessionStatistics(),
  });

  const { data: popularCourses } = useQuery({
    queryKey: ['dashboard', 'popular-courses'],
    queryFn: () => dashboardApi.getPopularCourses(),
  });

  const { data: eventSessionStatistics } = useQuery({
    queryKey: ['dashboard', 'event-session-statistics'],
    queryFn: () => dashboardApi.getEventSessionStatistics(),
  });

  const { data: upcomingEventsPaged } = useQuery({
    queryKey: ['dashboard', 'upcoming-events'],
    queryFn: () => {
      return dashboardApi.getUpcomingEvents({
        pageNumber: 1,
        pageSize: 6,
      });
    },
  });

  const { data: contractSummary } = useQuery({
    queryKey: ['dashboard', 'contract-summary'],
    queryFn: () => dashboardApi.getContractSummary(),
  });

  const { data: contractValueStats } = useQuery({
    queryKey: ['dashboard', 'contract-value-statistics'],
    queryFn: () => dashboardApi.getContractValueStatistics(),
  });

  const { data: teamsStatisticsPaged } = useQuery({
    queryKey: ['dashboard', 'teams-statistics'],
    queryFn: () => dashboardApi.getTeamsStatistics({ pageNumber: 1, pageSize: 8 }),
  });

  const totalWalletBalance =
    walletSummary?.reduce((sum: number, w: any) => sum + (Number(w.balance) || 0), 0) ?? 0;

  const totalTransactionsInRange =
    walletSummary?.reduce(
      (sum: number, w: any) =>
        sum +
        (Number(w.totalContributionTransactions) || 0) +
        (Number(w.totalExpenseTransactions) || 0),
      0,
    ) ?? 0;

  const roleDistributionData =
    usersOverview?.roleDistribution?.map((r: any) => ({
      name: getRoleLabel(r.roleId) || r.roleName,
      value: r.userCount,
    })) ?? [];

  const viEventStatus = (status: string | null | undefined) => {
    const s = String(status ?? '').trim();
    switch (s) {
      case 'Active':
        return 'Đang hoạt động';
      case 'Inactive':
        return 'Ngừng hoạt động';
      case 'Completed':
        return 'Hoàn tất';
      case 'Cancelled':
        return 'Đã hủy';
      default:
        return s || '—';
    }
  };

  const eventStatusData =
    eventStatus?.map((s: any) => ({
      status: viEventStatus(s.status),
      total: s.totalEvents,
    })) ?? [];

  const requestSummaryData = requestSummary
    ? [
        { key: 'Chờ duyệt', value: requestSummary.pendingRequests },
        { key: 'Đã duyệt', value: requestSummary.approvedRequests },
        { key: 'Đang phân công', value: requestSummary.assigningRequests },
        { key: 'Đang triển khai', value: requestSummary.publishedRequests },
        { key: 'Hoàn thành', value: requestSummary.completedRequests },
        { key: 'Từ chối', value: requestSummary.rejectedRequests },
        { key: 'Hủy', value: requestSummary.cancelledRequests },
      ]
    : [];

  const sessionSummaryData = sessionSummary
    ? [
        { key: 'Chờ duyệt', value: sessionSummary.pendingSessions },
        { key: 'Đã duyệt', value: sessionSummary.approvedSessions },
        { key: 'Đã phân công', value: sessionSummary.assignedSessions },
        { key: 'Đang dạy', value: sessionSummary.ongoingSessions },
        { key: 'Hoàn thành', value: sessionSummary.completedSessions },
        { key: 'Từ chối', value: sessionSummary.rejectedSessions },
        { key: 'Hủy', value: sessionSummary.cancelledSessions },
      ]
    : [];

  const topWalletsByBalance =
    walletSummary
      ?.slice()
      .sort((a: any, b: any) => Number(b.balance) - Number(a.balance))
      .slice(0, 5)
      .map((w: any) => ({
        name: w.walletName,
        balance: Number(w.balance),
      })) ?? [];

  const pieColors = ['#2563eb', '#16a34a', '#f97316', '#e11d48', '#7c3aed', '#0f766e'];

  const walletMetricsChartData =
    Array.isArray(walletMetrics)
      ? walletMetrics
          .slice()
          .sort((a: any, b: any) => Number(b.totalContribution + b.totalExpense) - Number(a.totalContribution + a.totalExpense))
          .slice(0, 6)
          .map((m: any) => ({
            name: m.walletName,
            contribution: m.totalContribution,
            expense: m.totalExpense,
            net: m.netAmount,
          }))
      : [];

  const topSkillsData =
    skillStats?.skillDistribution?.slice(0, 6).map((s: any) => ({
      name: s.skillName,
      members: s.memberCount,
    })) ?? [];

  const topicTeamData =
    topicTeamDistribution?.slice(0, 8).map((t: any) => ({
      name: t.topicName,
      teams: t.teamCount,
    })) ?? [];

  const equipmentCategoryData =
    equipmentCategoryDistribution?.slice(0, 8).map((c: any) => ({
      name: c.categoryName,
      total: c.totalEquipment,
    })) ?? [];

  const subjectTopicData =
    subjectTopicDistribution?.slice(0, 8).map((t: any) => ({
      name: t.topicName,
      subjects: t.totalSubjects,
    })) ?? [];

  const popularCoursesData =
    popularCourses?.slice(0, 8).map((c: any) => ({
      name: c.courseName,
      enrollments: c.totalEnrollments,
    })) ?? [];

  const eventSessionDistData =
    eventSessionStatistics?.sessionDistribution?.map((x: any) => ({
      name: x.range,
      events: x.totalEvents,
      percent: x.percent,
    })) ?? [];

  const subjectSessionDistData =
    subjectSessionStatistics?.sessionDistribution?.map((x: any) => ({
      name: x.range,
      subjects: x.totalSubjects,
      percent: x.percent,
    })) ?? [];

  const upcomingEvents = upcomingEventsPaged?.items ?? [];

  const topTeamsBySessions =
    teamsStatisticsPaged?.items?.slice().sort((a: any, b: any) => (b.totalSessions || 0) - (a.totalSessions || 0)).slice(0, 8) ?? [];

  const walletsForContributorSelect =
    walletSummary?.slice().sort((a: any, b: any) => Number(b.balance) - Number(a.balance)) ?? [];

  const selectedContributorWallet =
    walletTopContributors && walletTopContributors.length > 0
      ? contributorsWalletId != null
        ? walletTopContributors[0]
        : walletTopContributors[0]
      : null;

  const contributorChartData =
    selectedContributorWallet?.topContributors?.map((c: any) => ({
      name: c.fullName,
      amount: Number(c.totalContribution) || 0,
    })) ?? [];

  const rangeLabelMap: Record<NonNullable<DashboardRangeParams['range']>, string> = {
    today: 'Hôm nay',
    thisweek: 'Tuần này',
    thismonth: 'Tháng này',
    last3months: '3 tháng gần đây',
    last6months: '6 tháng gần đây',
    '1year': '1 năm gần đây',
  };

  return (
    <div className="p-6 pl-8 space-y-6">
        {/* HEADER */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-white px-6 py-4 rounded-xl border border-border shadow-sm">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-[#1a7a99]">Quản lý thống kê</h2>
            <p className="text-xs text-gray-500 mt-1">
              Tổng quan hệ thống — số liệu người dùng, sự kiện, yêu cầu, buổi dạy và quỹ.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500">Khoảng thời gian:</span>
            <select
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-400/30 min-w-[160px]"
              value={effectiveRange}
              onChange={(e) =>
                setRange(e.target.value as NonNullable<DashboardRangeParams['range']>)
              }
            >
              <option value="today">Hôm nay</option>
              <option value="thisweek">Tuần này</option>
              <option value="thismonth">Tháng này</option>
              <option value="last3months">3 tháng gần đây</option>
              <option value="last6months">6 tháng gần đây</option>
              <option value="1year">1 năm gần đây</option>
            </select>
            <button
              type="button"
              className="h-9 inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              disabled={exporting}
              onClick={async () => {
                const { startAt, endAt } = getRangeBounds(effectiveRange);
                setSelectedSheetTypes([]);
                setExportStartAt(startAt);
                setExportEndAt(endAt);
                setExportModalOpen(true);
              }}
            >
              <Download className="h-4 w-4" />
              {exporting ? 'Đang xuất...' : 'Xuất báo cáo'}
            </button>
          </div>
        </div>

        <Modal
          title="Chọn loại báo cáo"
          open={exportModalOpen}
          okText={exporting ? 'Đang xuất...' : 'Xuất'}
          cancelText="Hủy"
          okButtonProps={{
            disabled:
              exporting ||
              selectedSheetTypes.length === 0 ||
              exportStartAt == null ||
              exportEndAt == null,
          }}
          cancelButtonProps={{ disabled: exporting }}
          onCancel={() => {
            if (exporting) return;
            setExportModalOpen(false);
          }}
          onOk={async () => {
            if (selectedSheetTypes.length === 0) {
              message.warning('Vui lòng chọn ít nhất 1 loại báo cáo.');
              return;
            }
            if (!exportStartAt || !exportEndAt) {
              message.warning('Vui lòng chọn thời gian xuất báo cáo.');
              return;
            }
            try {
              setExporting(true);
              const blob = await dashboardApi.exportDashboard({
                startAt: dayjs(exportStartAt).format('YYYY-MM-DDTHH:mm:ss'),
                endAt: dayjs(exportEndAt).format('YYYY-MM-DDTHH:mm:ss'),
                sheetTypes: [...selectedSheetTypes],
              });
              downloadBlob(blob, 'STOMS_Reports.xlsx');
              message.success('Đã xuất báo cáo');
              setExportModalOpen(false);
            } catch {
              message.error('Xuất báo cáo thất bại');
            } finally {
              setExporting(false);
            }
          }}
        >
          <div className="space-y-2">
            <p className="text-xs text-slate-500">
              Chọn thời gian và ít nhất 1 loại báo cáo để xuất.
            </p>
            <div className="space-y-1">
              <div className="text-xs font-medium text-slate-600">Thời gian</div>
              <DatePicker.RangePicker
                className="w-full"
                showTime
                allowClear
                format="DD/MM/YYYY HH:mm"
                value={
                  exportStartAt && exportEndAt ? ([dayjs(exportStartAt), dayjs(exportEndAt)] as any) : null
                }
                onChange={(values) => {
                  const v0 = values?.[0] ?? null;
                  const v1 = values?.[1] ?? null;
                  setExportStartAt(v0 ? v0.toDate() : null);
                  setExportEndAt(v1 ? v1.toDate() : null);
                }}
              />
            </div>

            <div className="space-y-1 pt-2">
              <div className="text-xs font-medium text-slate-600">Loại báo cáo</div>
              <Checkbox.Group
                className="w-full"
                value={selectedSheetTypes}
                onChange={(vals) => setSelectedSheetTypes(vals.map((x) => Number(x)).filter((n) => Number.isFinite(n)))}
              >
                <div className="grid grid-cols-1 gap-2">
                  {sheetTypeOptions.map((opt) => (
                    <Checkbox key={opt.value} value={opt.value}>
                      {opt.label}
                    </Checkbox>
                  ))}
                </div>
              </Checkbox.Group>
            </div>
          </div>
        </Modal>

        {/* STAT CARDS */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <KpiCard
            title="Yêu cầu chờ duyệt"
            value={requestSummary?.pendingRequests ?? '—'}
            sub={rangeLabelMap[effectiveRange]}
            icon={<CalendarDays className="h-4 w-4 text-sky-700" />}
            tone="sky"
          />
          <KpiCard
            title="Yêu cầu đang phân công"
            value={requestSummary?.assigningRequests ?? '—'}
            sub={rangeLabelMap[effectiveRange]}
            icon={<ClipboardList className="h-4 w-4 text-indigo-700" />}
            tone="indigo"
          />
          <KpiCard
            title="Buổi hôm nay"
            value={sessionSummaryToday?.totalSessions ?? '—'}
            sub={`Đang diễn ra: ${sessionSummaryToday?.ongoingSessions ?? '—'}`}
            icon={<Calendar className="h-4 w-4 text-blue-700" />}
            tone="blue"
          />
          <KpiCard
            title="Thiết bị đang mượn"
            value={equipmentStats?.borrowedEquipment ?? '—'}
            sub={`Tổng: ${equipmentStats?.totalEquipment ?? '—'} thiết bị`}
            icon={<Laptop className="h-4 w-4 text-purple-700" />}
            tone="purple"
          />
          <KpiCard
            title="Số dư quỹ"
            value={totalWalletBalance.toLocaleString('vi-VN', {
              style: 'currency',
              currency: 'VND',
              maximumFractionDigits: 0,
            })}
            sub={rangeLabelMap[effectiveRange]}
            icon={<Wallet className="h-4 w-4 text-emerald-700" />}
            tone="emerald"
          />
          <KpiCard
            title="Giao dịch"
            value={totalTransactionsInRange}
            sub={rangeLabelMap[effectiveRange]}
            icon={<ArrowLeftRight className="h-4 w-4 text-amber-700" />}
            tone="amber"
          />
        </div>

        {/* CHARTS ROW 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Biểu đồ phân bố role user (Pie chart) */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">
                  Phân bố vai trò
                </p>
                <p className="text-sm text-gray-600">
                  Số lượng người dùng theo từng vai trò
                </p>
              </div>
              <PieChart className="h-5 w-5 text-indigo-500" />
            </div>
            {roleDistributionData.length > 0 ? (
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <RCPieChart>
                    <Pie
                      data={roleDistributionData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {roleDistributionData.map((entry: any, index: number) => (
                        <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) =>
                        Number(value ?? 0).toLocaleString('vi-VN')
                      }
                      wrapperClassName="text-xs"
                    />
                    <Legend layout="vertical" align="right" verticalAlign="middle" />
                  </RCPieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-gray-500">Chưa có dữ liệu phân bố vai trò.</p>
            )}
          </div>

          {/* Biểu đồ phân bố trạng thái sự kiện (Bar chart) */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">
                  Trạng thái sự kiện
                </p>
                <p className="text-sm text-gray-600">
                  Phân bố theo trạng thái hiện tại
                </p>
              </div>
              <PieChart className="h-5 w-5 text-blue-500" />
            </div>
            {eventStatusData.length > 0 ? (
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={eventStatusData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      formatter={(value: any) =>
                        Number(value ?? 0).toLocaleString('vi-VN')
                      }
                      wrapperClassName="text-xs"
                    />
                    <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-gray-500">Chưa có dữ liệu trạng thái sự kiện.</p>
            )}
          </div>
        </div>

        {/* CHARTS ROW 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* So sánh trạng thái Request */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">
                  Trạng thái yêu cầu
                </p>
                <p className="text-sm text-gray-600">Tổng hợp theo trạng thái</p>
              </div>
              <ClipboardList className="h-5 w-5 text-sky-500" />
            </div>
            {requestSummaryData.length > 0 ? (
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={requestSummaryData}
                    margin={{ top: 8, right: 12, bottom: 8, left: 0 }}
                    barCategoryGap="65%"
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
  dataKey="key"
  tick={{ fontSize: 11 }}
  tickMargin={12}
  interval={0}
  minTickGap={0}
  tickLine={false}
  axisLine={false}
  padding={{ left: 10, right: 10 }}
  angle={-25}
  textAnchor="end"
  height={60}
/>
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      formatter={(value: any) =>
                        Number(value ?? 0).toLocaleString('vi-VN')
                      }
                      wrapperClassName="text-xs"
                    />
                    <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-gray-500">Chưa có dữ liệu yêu cầu.</p>
            )}
          </div>

          {/* So sánh trạng thái Session */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">
                  Trạng thái buổi dạy
                </p>
                <p className="text-sm text-gray-600">Tổng hợp theo trạng thái</p>
              </div>
              <CalendarDays className="h-5 w-5 text-amber-500" />
            </div>
            {sessionSummaryData.length > 0 ? (
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={sessionSummaryData}
                    margin={{ top: 8, right: 12, bottom: 8, left: 0 }}
                    barCategoryGap="45%"
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="key"
                      tick={{ fontSize: 11 }}
                      tickMargin={8}
                      interval={0}
                      minTickGap={0}
                      tickLine={false}
                      axisLine={false}
                      padding={{ left: 10, right: 10 }}
                    />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      formatter={(value: any) =>
                        Number(value ?? 0).toLocaleString('vi-VN')
                      }
                      wrapperClassName="text-xs"
                    />
                    <Bar dataKey="value" fill="#f97316" radius={[4, 4, 0, 0]} barSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-gray-500">Chưa có dữ liệu buổi dạy.</p>
            )}
          </div>
        </div>

        {/* CHARTS ROW 3 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Tình trạng thiết bị */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">
                  Tình trạng thiết bị
                </p>
                <p className="text-sm text-gray-600">
                  Tổng quan số lượng theo trạng thái hiện tại
                </p>
              </div>
              <Laptop className="h-5 w-5 text-indigo-500" />
            </div>
            {equipmentStats ? (
              <div className="space-y-2 text-xs text-gray-700">
                {[
                  { label: 'Sẵn sàng', value: equipmentStats.availableEquipment, color: 'bg-emerald-500' },
                  { label: 'Đang mượn', value: equipmentStats.borrowedEquipment, color: 'bg-sky-500' },
                  { label: 'Hư hỏng', value: equipmentStats.damagedEquipment, color: 'bg-amber-500' },
                  { label: 'Mất', value: equipmentStats.lostEquipment, color: 'bg-rose-500' },
                  { label: 'Không sử dụng', value: equipmentStats.unavailableEquipment, color: 'bg-slate-400' },
                ].map((item) => {
                  const total = equipmentStats.totalEquipment || 1;
                  const percent = (item.value / total) * 100;
                  return (
                    <div key={item.label}>
                      <div className="flex justify-between mb-0.5">
                        <span>{item.label}</span>
                        <span className="font-medium">
                          {item.value}{' '}
                          <span className="text-[10px] text-gray-400">
                            ({percent.toFixed(1)}%)
                          </span>
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${item.color}`}
                          style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                <p className="mt-2 text-[11px] text-gray-500">
                  Tổng thiết bị: <span className="font-semibold">{equipmentStats.totalEquipment}</span>
                </p>
              </div>
            ) : (
              <p className="text-xs text-gray-500">Chưa có dữ liệu thiết bị.</p>
            )}
          </div>

          {/* Top quỹ theo số dư (Bar chart) */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">
                  Quỹ có số dư cao
                </p>
                <p className="text-sm text-gray-600">Top 5 quỹ theo số dư hiện tại</p>
              </div>
              <Wallet className="h-5 w-5 text-emerald-500" />
            </div>
            {topWalletsByBalance.length > 0 ? (
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topWalletsByBalance} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value: any) =>
                        Number(value ?? 0).toLocaleString('vi-VN', {
                          style: 'currency',
                          currency: 'VND',
                          maximumFractionDigits: 0,
                        })
                      }
                      wrapperClassName="text-xs"
                    />
                    <Bar dataKey="balance" fill="#22c55e" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-gray-500">Chưa có dữ liệu quỹ.</p>
            )}
          </div>

          {/* Biểu đồ thu / chi / net theo quỹ (Line + Bar kết hợp) */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">
                  Thu / Chi theo quỹ
                </p>
                <p className="text-sm text-gray-600">
                  Tổng quan thu, chi và số dư ròng trong khoảng thời gian chọn
                </p>
              </div>
              <Wallet className="h-5 w-5 text-sky-500" />
            </div>
            {walletMetricsChartData.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={walletMetricsChartData}
                    margin={{ top: 8, right: 12, left: 6, bottom: 44 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <ReferenceLine y={0} stroke="#cbd5e1" strokeWidth={1} />
                    <XAxis
                      dataKey="name"
                      interval={0}
                      height={58}
                      angle={-25}
                      textAnchor="end"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v: any) => {
                        const s = String(v ?? '');
                        if (s.length <= 12) return s;
                        return `${s.slice(0, 10)}…`;
                      }}
                    />
                    <YAxis
                      width={84}
                      tickMargin={8}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: any) => formatCompactVnd(v)}
                    />
                    <Tooltip
                      labelFormatter={(label: any) => String(label ?? '')}
                      formatter={(value: any, name: any) => {
                        const n = Number(value ?? 0);
                        const display = name === 'Chi tiêu' ? Math.abs(n) : n;
                        return Number(display).toLocaleString('vi-VN', {
                          style: 'currency',
                          currency: 'VND',
                          maximumFractionDigits: 0,
                        });
                      }}
                      wrapperClassName="text-xs"
                    />
                    <Legend
                      verticalAlign="bottom"
                      align="center"
                      wrapperStyle={{ fontSize: 12, paddingTop: 6 }}
                    />
                    <Bar
                      dataKey="contribution"
                      stackId="wallet"
                      fill="#22c55e"
                      radius={[4, 4, 0, 0]}
                      name="Đóng góp"
                      maxBarSize={28}
                    />
                    <Bar
                      dataKey={(d: any) => -Math.abs(Number(d?.expense ?? 0))}
                      stackId="wallet"
                      fill="#ef4444"
                      radius={[4, 4, 0, 0]}
                      name="Chi tiêu"
                      maxBarSize={28}
                    />
                    <Line
                      type="monotone"
                      dataKey="net"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      name="Ròng"
                    />
                    {walletMetricsChartData.length > 8 ? (
                      <Brush
                        dataKey="name"
                        height={18}
                        travellerWidth={10}
                        stroke="#94a3b8"
                        tickFormatter={(v: any) => {
                          const s = String(v ?? '');
                          if (s.length <= 10) return s;
                          return `${s.slice(0, 8)}…`;
                        }}
                      />
                    ) : null}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-gray-500">Chưa có dữ liệu thu chi quỹ.</p>
            )}
          </div>
        </div>

        {/* CHARTS ROW 3.5: Tổng thu/chi theo thời gian (theo range) */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">
                Tổng thu/chi theo thời gian
              </p>
              <p className="text-sm text-gray-600">
                Xu hướng tổng đóng góp và chi tiêu theo các mốc thời gian
              </p>
            </div>
            <ArrowLeftRight className="h-5 w-5 text-sky-600" />
          </div>
          {totalIncomeExpenseSeries && totalIncomeExpenseSeries.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={totalIncomeExpenseSeries}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: any) =>
                      Number(value ?? 0).toLocaleString('vi-VN', {
                        style: 'currency',
                        currency: 'VND',
                        maximumFractionDigits: 0,
                      })
                    }
                    wrapperClassName="text-xs"
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="contribution"
                    name="Tổng thu"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="expense"
                    name="Tổng chi"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="net"
                    name="Ròng"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-gray-500">Chưa có dữ liệu thu/chi theo thời gian.</p>
          )}
        </div>

        {/* CHARTS ROW 3.75: Top người đóng góp */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">
                Top người đóng góp
              </p>
              <p className="text-sm text-gray-600">
                Top 5 theo tổng tiền đóng góp ({rangeLabelMap[effectiveRange]})
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">Quỹ:</span>
              <select
                className="h-8 rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-400"
                value={contributorsWalletId == null ? 'all' : String(contributorsWalletId)}
                onChange={(e) => {
                  const v = e.target.value;
                  setContributorsWalletId(v === 'all' ? null : Number(v));
                }}
              >
                <option value="all">Tất cả quỹ</option>
                {walletsForContributorSelect.map((w: any) => (
                  <option key={w.walletId} value={String(w.walletId)}>
                    {w.walletName}
                  </option>
                ))}
              </select>
              <Users className="h-5 w-5 text-indigo-500" />
            </div>
          </div>

          {selectedContributorWallet ? (
            <div className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <p className="text-[11px] text-slate-500 font-medium">Quỹ</p>
                <p className="mt-1 text-base font-semibold text-slate-900">
                  {selectedContributorWallet.walletName}
                </p>
                <p className="mt-2 text-[11px] text-slate-500 font-medium">Tổng đóng góp</p>
                <p className="mt-1 text-lg font-semibold text-emerald-700">
                  {Number(selectedContributorWallet.totalFund).toLocaleString('vi-VN', {
                    style: 'currency',
                    currency: 'VND',
                    maximumFractionDigits: 0,
                  })}
                </p>
              </div>

              <div className="lg:col-span-2">
                {contributorChartData.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={contributorChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={160}
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip
                          formatter={(value: any) =>
                            Number(value ?? 0).toLocaleString('vi-VN', {
                              style: 'currency',
                              currency: 'VND',
                              maximumFractionDigits: 0,
                            })
                          }
                          wrapperClassName="text-xs"
                        />
                        <Bar dataKey="amount" fill="#6366f1" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">Chưa có dữ liệu người đóng góp.</p>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-xs text-gray-500">Chưa có dữ liệu top người đóng góp.</p>
          )}
        </div>

        {/* CHARTS ROW 4: Kỹ năng & team/topic */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          {/* Thống kê kỹ năng tổng quan */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">
                  Kỹ năng trong hệ thống
                </p>
                <p className="text-sm text-gray-600">
                  Tổng số kỹ năng và mức độ phủ trên thành viên
                </p>
              </div>
            </div>
            {skillStats ? (
              <div className="grid grid-cols-2 gap-3 text-xs text-gray-700">
                <div className="space-y-1">
                  <p className="text-[11px] text-gray-400 uppercase font-semibold">Tổng kỹ năng</p>
                  <p className="text-lg font-semibold text-slate-900">{skillStats.totalSkills}</p>
                  <p className="text-[11px] text-gray-500">
                    Đang hoạt động:{' '}
                    <span className="font-medium text-emerald-600">{skillStats.activeSkills}</span>
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-gray-400 uppercase font-semibold">Kỹ năng nổi bật</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {skillStats.topSkillName || '—'}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Số người dùng:{' '}
                    <span className="font-medium">{skillStats.topSkillUsageCount ?? 0}</span>
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Trung bình{' '}
                    <span className="font-medium">{Number(skillStats.averageSkillsPerMember ?? 0).toFixed(1)}</span>{' '}
                    kỹ năng / thành viên
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500">Chưa có dữ liệu kỹ năng.</p>
            )}
          </div>

          {/* Top kỹ năng (horizontal bar) */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">
                  Top kỹ năng phổ biến
                </p>
                <p className="text-sm text-gray-600">
                  Những kỹ năng được nhiều thành viên sở hữu nhất
                </p>
              </div>
            </div>
            {topSkillsData.length > 0 ? (
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topSkillsData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: any) => Number(value ?? 0).toLocaleString('vi-VN')}
                      wrapperClassName="text-xs"
                    />
                    <Bar dataKey="members" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-gray-500">Chưa có dữ liệu top kỹ năng.</p>
            )}
          </div>

          {/* Phân bố team theo topic */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">
                  Các nhóm theo chủ đề
                </p>
                <p className="text-sm text-gray-600">
                  Phân bố số lượng nhóm theo từng chủ đề
                </p>
              </div>
            </div>
            {topicTeamData.length > 0 ? (
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topicTeamData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={140}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value: any) => Number(value ?? 0).toLocaleString('vi-VN')}
                      wrapperClassName="text-xs"
                    />
                    <Bar dataKey="teams" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-gray-500">Chưa có dữ liệu nhóm/chủ đề.</p>
            )}
          </div>
        </div>

        {/* CHARTS ROW 5: Học phần / môn / thiết bị */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          {/* Courses summary */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">
                  Chương trình học & môn học
                </p>
                <p className="text-sm text-gray-600">Tổng quan số lượng trong hệ thống</p>
              </div>
            </div>
            {courseSummary ? (
              <div className="grid grid-cols-2 gap-3 text-xs text-gray-700">
                <div className="space-y-1">
                  <p className="text-[11px] text-gray-400 uppercase font-semibold">Chương trình học</p>
                  <p className="text-lg font-semibold text-slate-900">{courseSummary.totalCourses}</p>
                  <p className="text-[11px] text-gray-500">
                    Hoạt động:{' '}
                    <span className="font-medium text-emerald-600">{courseSummary.activeCourses}</span>
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-gray-400 uppercase font-semibold">Môn học</p>
                  <p className="text-lg font-semibold text-slate-900">{courseSummary.totalSubjects}</p>
                  <p className="text-[11px] text-gray-500">
                    Tổng buổi:{' '}
                    <span className="font-medium">{courseSummary.totalSubjectSessions}</span>
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500">Chưa có dữ liệu chương trình học/môn học.</p>
            )}
          </div>

          {/* Subject distribution by topic */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">
                  Môn học theo chủ đề
                </p>
                <p className="text-sm text-gray-600">Phân bố số môn học theo chủ đề</p>
              </div>
            </div>
            {subjectTopicData.length > 0 ? (
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectTopicData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: any) => Number(value ?? 0).toLocaleString('vi-VN')}
                      wrapperClassName="text-xs"
                    />
                    <Bar dataKey="subjects" fill="#14b8a6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-gray-500">Chưa có dữ liệu môn học theo chủ đề.</p>
            )}
          </div>

          {/* Equipment category distribution */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">
                  Thiết bị theo thể loại
                </p>
                <p className="text-sm text-gray-600">Top thể loại theo số lượng thiết bị</p>
              </div>
              <Laptop className="h-5 w-5 text-indigo-500" />
            </div>
            {equipmentCategoryData.length > 0 ? (
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={equipmentCategoryData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: any) => Number(value ?? 0).toLocaleString('vi-VN')}
                      wrapperClassName="text-xs"
                    />
                    <Bar dataKey="total" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-gray-500">Chưa có dữ liệu thiết bị theo thể loại.</p>
            )}
          </div>
        </div>

        {/* CHARTS ROW 6: Popular courses / session distributions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          {/* Popular courses */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">
                  Chương trình học phổ biến
                </p>
                <p className="text-sm text-gray-600">Top theo lượt đăng ký</p>
              </div>
            </div>
            {popularCoursesData.length > 0 ? (
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={popularCoursesData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: any) => Number(value ?? 0).toLocaleString('vi-VN')}
                      wrapperClassName="text-xs"
                    />
                    <Bar dataKey="enrollments" fill="#f97316" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-gray-500">Chưa có dữ liệu chương trình học phổ biến.</p>
            )}
          </div>

          {/* Subject session distribution */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">
                  Phân bố số buổi môn học
                </p>
                <p className="text-sm text-gray-600">Số môn theo khoảng số buổi học</p>
              </div>
            </div>
            {subjectSessionDistData.length > 0 ? (
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectSessionDistData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      formatter={(value: any) => Number(value ?? 0).toLocaleString('vi-VN')}
                      wrapperClassName="text-xs"
                    />
                    <Bar dataKey="subjects" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-gray-500">Chưa có dữ liệu phân bố buổi môn học.</p>
            )}
          </div>

          {/* Event session distribution */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">
                  Phân bố số buổi sự kiện
                </p>
                <p className="text-sm text-gray-600">Số sự kiện theo khoảng số buổi</p>
              </div>
            </div>
            {eventSessionDistData.length > 0 ? (
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={eventSessionDistData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      formatter={(value: any) => Number(value ?? 0).toLocaleString('vi-VN')}
                      wrapperClassName="text-xs"
                    />
                    <Bar dataKey="events" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-gray-500">Chưa có dữ liệu phân bố buổi sự kiện.</p>
            )}
          </div>
        </div>

        {/* CHARTS ROW 7: Contracts + Upcoming events + Teams */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          {/* Contract summary */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">
                  Hợp đồng
                </p>
                <p className="text-sm text-gray-600">Tổng quan trạng thái thanh toán</p>
              </div>
            </div>
            {contractSummary && contractValueStats ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs text-gray-700">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                    <p className="text-[11px] text-slate-500 font-medium">Tổng hợp đồng</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{contractSummary.totalContracts}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                    <p className="text-[11px] text-slate-500 font-medium">Tổng giá trị</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {Number(contractValueStats.totalValue).toLocaleString('vi-VN', {
                        style: 'currency',
                        currency: 'VND',
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-gray-700 space-y-1">
                  <div className="flex justify-between">
                    <span>Đã thanh toán</span>
                    <span className="font-medium text-emerald-700">
                      {contractSummary.paidContracts} ({contractSummary.paidPercent.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Chưa thanh toán</span>
                    <span className="font-medium text-amber-700">
                      {contractSummary.unpaidContracts} ({contractSummary.unpaidPercent.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Giá trị TB</span>
                    <span>
                      {Number(contractValueStats.averageValue).toLocaleString('vi-VN', {
                        style: 'currency',
                        currency: 'VND',
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500">Chưa có dữ liệu hợp đồng.</p>
            )}
          </div>

          {/* Upcoming events table */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">
                  Sự kiện sắp diễn ra
                </p>
                <p className="text-sm text-gray-600">Danh sách request có event gần nhất</p>
              </div>
            </div>
            {upcomingEvents.length > 0 ? (
              <div className="stoms-scrollbar max-h-60 overflow-y-auto">
                <ul className="space-y-2 text-xs">
                  {upcomingEvents.map((e: any) => (
                    <li key={e.requestId} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">
                            {e.eventCode} · {e.eventName}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {e.requestCode} · {e.requestName}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-sky-50 text-sky-700 border border-sky-100 px-2 py-0.5 text-[11px] font-medium">
                          {e.daysRemaining} ngày
                        </span>
                      </div>
                      <div className="mt-2 flex justify-between text-[11px] text-slate-500">
                        <span>Bắt đầu: {new Date(e.startDate).toLocaleDateString('vi-VN')}</span>
                        <span>{e.sessionsRequired} buổi</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-gray-500">Chưa có dữ liệu sự kiện sắp diễn ra.</p>
            )}
          </div>

          {/* Teams statistics - top by sessions */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">
                  Hiệu suất nhóm
                </p>
                <p className="text-sm text-gray-600">Top nhóm theo số buổi dạy</p>
              </div>
            </div>
            {topTeamsBySessions.length > 0 ? (
              <div className="space-y-2 text-xs">
                {topTeamsBySessions.map((t: any) => (
                  <div key={t.teamId} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900 truncate">{t.teamName}</p>
                      <span className="text-sky-700 font-semibold">{t.totalSessions}</span>
                    </div>
                    <div className="mt-1 flex justify-between text-[11px] text-slate-500">
                      <span>Thành viên: {t.totalMembers}</span>
                      <span>Hoàn thành: {t.completedSessions}</span>
                      <span>Sắp tới: {t.upcomingSessions}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">Chưa có dữ liệu thống kê nhóm.</p>
            )}
          </div>
        </div>

      {/* CHARTS ROW 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* So sánh trạng thái Request */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">
                  Trạng thái yêu cầu
                </p>
                <p className="text-sm text-gray-600">Tổng hợp theo trạng thái</p>
              </div>
              <ClipboardList className="h-5 w-5 text-sky-500" />
            </div>
            {requestSummaryData.length > 0 ? (
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={requestSummaryData}
                    margin={{ top: 8, right: 12, bottom: 8, left: 0 }}
                    barCategoryGap="65%"
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
  dataKey="key"
  tick={{ fontSize: 11 }}
  tickMargin={12}
  interval={0}
  minTickGap={0}
  tickLine={false}
  axisLine={false}
  padding={{ left: 10, right: 10 }}
  angle={-25}
  textAnchor="end"
  height={60}
/>
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      formatter={(value: any) =>
                        Number(value ?? 0).toLocaleString('vi-VN')
                      }
                      wrapperClassName="text-xs"
                    />
                    <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-gray-500">Chưa có dữ liệu yêu cầu.</p>
            )}
          </div>

          {/* So sánh trạng thái Session */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">
                  Trạng thái buổi dạy
                </p>
                <p className="text-sm text-gray-600">Tổng hợp theo trạng thái</p>
              </div>
              <CalendarDays className="h-5 w-5 text-amber-500" />
            </div>
            {sessionSummaryData.length > 0 ? (
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={sessionSummaryData}
                    margin={{ top: 8, right: 12, bottom: 8, left: 0 }}
                    barCategoryGap="45%"
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="key"
                      tick={{ fontSize: 11 }}
                      tickMargin={8}
                      interval={0}
                      minTickGap={0}
                      tickLine={false}
                      axisLine={false}
                      padding={{ left: 10, right: 10 }}
                    />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      formatter={(value: any) =>
                        Number(value ?? 0).toLocaleString('vi-VN')
                      }
                      wrapperClassName="text-xs"
                    />
                    <Bar dataKey="value" fill="#f97316" radius={[4, 4, 0, 0]} barSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-gray-500">Chưa có dữ liệu buổi dạy.</p>
            )}
          </div>
        </div>
    </div>
  );
}

