import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Wallet, PieChart, Laptop, Calendar, Download, Layers, Timer, ListChecks, Send, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';
import dayjs from 'dayjs';
import {
  ResponsiveContainer,
  PieChart as RCPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { dashboardApi, type DashboardRangeParams } from '@/modules/dashboard/api/dashboardApi';
import requestApi from '@/modules/request/api/requestApi';
import { Checkbox, DatePicker, message, Modal } from 'antd';
import { getRoleLabel } from '@/constants/role';
import { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';

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

  const { data: requestTypeSample } = useQuery({
    queryKey: ['manager-dashboard', 'request-type-sample'],
    queryFn: () => requestApi.getRequests({ pageNumber: 1, pageSize: 24 }),
    staleTime: 60_000,
  });

  const { data: requestSummary } = useQuery({
    queryKey: ['dashboard', 'request-summary', effectiveRange],
    queryFn: () => dashboardApi.getRequestSummary({ range: effectiveRange }),
  });

  const { data: walletMetrics } = useQuery({
    queryKey: ['dashboard', 'wallet-metrics', effectiveRange],
    queryFn: () => dashboardApi.getWalletMetrics({ range: effectiveRange }),
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

  const roleDistributionData =
    usersOverview?.roleDistribution?.map((r: any) => ({
      name: getRoleLabel(r.roleId) || r.roleName,
      value: r.userCount,
    })) ?? [];

  const requestTypeCounts = useMemo(() => {
    const items = requestTypeSample?.items ?? []
    let eventCount = 0
    let courseCount = 0
    let subjectCount = 0

    for (const r of items) {
      if (r.eventId != null) eventCount += 1
      else if (r.courseId != null) courseCount += 1
      else if (r.subjectId != null) subjectCount += 1
    }

    const rows = [
      { key: 'Sự kiện', value: eventCount, color: '#8B5CF6' },
      { key: 'Chương trình học', value: courseCount, color: '#10B981' },
      { key: 'Môn học', value: subjectCount, color: '#F59E0B' },
    ]
    const nonZero = rows.filter((x) => x.value > 0)
    return nonZero.length > 0 ? nonZero : rows
  }, [requestTypeSample])

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

  return (
    <div className="p-6 pl-8 space-y-6">
        {/* HEADER */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-white px-6 py-4 rounded-xl border border-border shadow-sm">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-[#1a7a99]">Quản lý thống kê</h2>
            <p className="text-xs text-gray-500 mt-1">
              Tổng quan hệ thống — số liệu người dùng, sự kiện, yêu cầu, buổi và quỹ.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500">Khoảng thời gian:</span>
            <Select value={effectiveRange} onValueChange={(value) => setRange(value as NonNullable<DashboardRangeParams['range']>)}>
              <SelectTrigger className="h-9 w-[180px] border-slate-200 bg-white">
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <KpiCard
            title="Tổng yêu cầu"
            value={requestSummary?.totalRequests ?? '—'}
            icon={<Layers className="h-5 w-5 text-sky-700" />}
            tone="sky"
          />
          <KpiCard
            title="Chờ duyệt"
            value={requestSummary?.pendingRequests ?? '—'}
            icon={<Timer className="h-5 w-5 text-amber-700" />}
            tone="amber"
          />
          <KpiCard
            title="Chờ duyệt phân công"
            value={requestSummary?.assigningRequests ?? '—'}
            icon={<ListChecks className="h-5 w-5 text-indigo-700" />}
            tone="indigo"
          />
          <KpiCard
            title="Đã công bố"
            value={requestSummary?.publishedRequests ?? '—'}
            icon={<Send className="h-5 w-5 text-blue-700" />}
            tone="blue"
          />
          <KpiCard
            title="Hoàn thành"
            value={requestSummary?.completedRequests ?? '—'}
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-700" />}
            tone="emerald"
          />
          <KpiCard
            title="Hủy"
            value={requestSummary?.cancelledRequests ?? '—'}
            icon={<XCircle className="h-5 w-5 text-rose-700" />}
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

          {/* Biểu đồ Phân bố theo loại yêu cầu (Horizontal Bar chart) */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">
                  Phân bố theo loại yêu cầu
                </p>
                <p className="text-sm text-gray-600">
                  Sự kiện / Chương trình học / Môn học
                </p>
              </div>
              <PieChart className="h-5 w-5 text-blue-500" />
            </div>
            {requestTypeCounts.length > 0 ? (
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={requestTypeCounts} layout="vertical" margin={{ top: 40, right: 80, left: -20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="key" tick={{ fontSize: 11 }} width={140} />
                    <Tooltip
                      formatter={(value: any) => [`${Number(value ?? 0).toLocaleString('vi-VN')} yêu cầu`, '']}
                      wrapperClassName="text-xs"
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18} maxBarSize={18}>
                      {requestTypeCounts.map((entry: any, i: number) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-gray-500">Chưa có dữ liệu.</p>
            )}
          </div>
        </div>

          {/* CHARTS ROW 7: Contracts + Upcoming events + Teams */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
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
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-sky-50 p-2">
                  <Calendar className="h-4 w-4 text-sky-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Sự kiện sắp diễn ra</p>
                  <p className="text-xs text-slate-500">Danh sách request có event gần nhất</p>
                </div>
              </div>
            </div>
            {upcomingEvents.length > 0 ? (
              <div className="stoms-scrollbar max-h-60 overflow-y-auto space-y-3">
                {upcomingEvents.map((e: any) => (
                  <div
                    key={e.requestId}
                    className="group relative flex flex-col gap-2 rounded-xl border border-slate-200/90 bg-white p-3.5 pl-4 shadow-sm transition-all duration-200 hover:border-sky-200/90 hover:shadow-md border-l-4 border-l-sky-500"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 text-[14px] font-semibold leading-snug tracking-tight text-slate-900 group-hover:text-sky-900">
                          {e.eventName}
                        </h3>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700">
                            Sự kiện
                          </span>
                          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                            {e.daysRemaining} ngày nữa
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-sky-500" aria-hidden />
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-1">
                      <div className="flex min-w-0 items-center gap-2 text-xs text-slate-600">
                        <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                        <span className="min-w-0 truncate">
                          <span className="font-medium text-slate-700">{e.eventCode}</span>
                          <span className="text-slate-300"> · </span>
                          <time dateTime={e.startDate}>{new Date(e.startDate).toLocaleDateString('vi-VN')}</time>
                          <span className="text-slate-300"> · </span>
                          <span>{e.sessionsRequired} buổi</span>
                        </span>
                      </div>
                      <span className="shrink-0 font-mono text-[10px] font-semibold tracking-wide text-slate-400">
                        {e.requestCode}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <Calendar className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">Chưa có sự kiện sắp diễn ra</p>
              </div>
            )}
          </div>

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

          {/* Teams statistics - top by sessions */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">
                  Hiệu suất nhóm
                </p>
                <p className="text-sm text-gray-600">Top nhóm theo số buổi</p>
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

        

        {/* CHARTS ROW 3 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        </div>

        {/* Biểu đồ thu / chi theo quỹ - Full width */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">
                Thu / Chi theo quỹ
              </p>
              <p className="text-sm text-gray-600">
                Đóng góp và chi tiêu của các quỹ
              </p>
            </div>
            <Wallet className="h-5 w-5 text-sky-500" />
          </div>
          {walletMetricsChartData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={walletMetricsChartData}
                  margin={{ top: 8, right: 12, left: 6, bottom: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    interval={0}
                    height={40}
                    angle={0}
                    textAnchor="middle"
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    width={84}
                    tickMargin={8}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: any) => formatCompactVnd(v)}
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
                  <Legend
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{ fontSize: 12, paddingTop: 4 }}
                  />
                  <Bar
                    dataKey="contribution"
                    fill="#22c55e"
                    radius={[4, 4, 0, 0]}
                    name="Đóng góp"
                    maxBarSize={28}
                  />
                  <Bar
                    dataKey="expense"
                    fill="#ef4444"
                    radius={[4, 4, 0, 0]}
                    name="Chi tiêu"
                    maxBarSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-gray-500">Chưa có dữ liệu thu chi quỹ.</p>
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
                <p className="text-sm text-gray-600">Số môn theo khoảng số buổi</p>
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

      
    </div>
  );
}

