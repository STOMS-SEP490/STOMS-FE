import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts'
import {
  ArrowRight,
  Calendar,
  ChevronRight,
  ClipboardList,
  Layers,
  ListChecks,
  Plus,
  Timer,
} from 'lucide-react'
import { dashboardApi, type DashboardRangeParams } from '@/modules/dashboard/api/dashboardApi'
import requestApi from '@/modules/request/api/requestApi'
import type { RequestListItem } from '@/modules/request/request'
import { getRequestStatusInfo } from '@/constants/status'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import dayjs from 'dayjs'

const PAGE_BG = 'bg-[#f3f4f6]'

const rangeLabelMap: Record<NonNullable<DashboardRangeParams['range']>, string> = {
  today: 'Hôm nay',
  thisweek: 'Tuần này',
  thismonth: 'Tháng này',
  last3months: '3 tháng gần đây',
  last6months: '6 tháng gần đây',
  '1year': '1 năm gần đây',
}

const TYPE_BAR_COLORS = ['#0EA5E9', '#22C55E', '#A855F7', '#64748B']

type KpiTone = 'sky' | 'indigo' | 'blue' | 'emerald' | 'amber' | 'rose'

function PcKpiCard(props: {
  title: string
  value: React.ReactNode
  sub?: React.ReactNode
  icon: React.ReactNode
  tone: KpiTone
}) {
  const toneClass: Record<KpiTone, { ring: string; iconBg: string; iconFg: string }> = {
    sky: { ring: 'ring-sky-100/80', iconBg: 'bg-sky-50', iconFg: 'text-sky-600' },
    indigo: { ring: 'ring-indigo-100/80', iconBg: 'bg-indigo-50', iconFg: 'text-indigo-600' },
    blue: { ring: 'ring-blue-100/80', iconBg: 'bg-blue-50', iconFg: 'text-blue-600' },
    emerald: { ring: 'ring-emerald-100/80', iconBg: 'bg-emerald-50', iconFg: 'text-emerald-600' },
    amber: { ring: 'ring-amber-100/80', iconBg: 'bg-amber-50', iconFg: 'text-amber-600' },
    rose: { ring: 'ring-rose-100/80', iconBg: 'bg-rose-50', iconFg: 'text-rose-600' },
  }
  const t = toneClass[props.tone]

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm ring-1',
        t.ring
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 pr-1">
          <p className="text-[10px] font-medium uppercase leading-tight tracking-wide text-slate-500">
            {props.title}
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{props.value}</p>
          {props.sub != null && (
            <p className="mt-0.5 text-[10px] leading-snug text-slate-400">{props.sub}</p>
          )}
        </div>
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', t.iconBg, t.iconFg)}>
          {props.icon}
        </div>
      </div>
    </div>
  )
}

function RequestPipelineCard(props: { r: RequestListItem; onClick: () => void }) {
  const info = getRequestStatusInfo(props.r.status)
  const typeLabel =
    props.r.eventId != null
      ? 'Sự kiện'
      : props.r.courseId != null
        ? 'Khóa học'
        : props.r.subjectId != null
          ? 'Môn học'
          : 'Khác'

  return (
    <button
      type="button"
      onClick={props.onClick}
      className={cn(
        'group relative flex w-full flex-col gap-2 rounded-xl border border-slate-200/90 bg-white p-3.5 pl-4 text-left shadow-sm',
        'transition-all duration-200 hover:border-sky-200/90 hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40',
        'border-l-4',
        info.leftBarClass
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-[14px] font-semibold leading-snug tracking-tight text-slate-900 group-hover:text-sky-900">
          {props.r.requestName}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold leading-none', info.className)}>
              {info.label}
            </span>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
              {typeLabel}
            </span>
          </div>
        </div>

        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-sky-500" aria-hidden />
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex min-w-0 items-center gap-2 text-xs text-slate-600">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
          <span className="min-w-0 truncate">
            <span className="font-medium text-slate-700">{props.r.customerName ?? '—'}</span>
            <span className="text-slate-300"> · </span>
            <time dateTime={props.r.startDate}>{dayjs(props.r.startDate).format('DD/MM/YYYY')}</time>
          </span>
        </div>
        <span className="shrink-0 font-mono text-[10px] font-semibold tracking-wide text-slate-400">
          {props.r.requestCode}
        </span>
      </div>
    </button>
  )
}

export default function PCDashboard() {
  const navigate = useNavigate()
  const [range, setRange] = useState<NonNullable<DashboardRangeParams['range']>>('thismonth')
  const effectiveRange: NonNullable<DashboardRangeParams['range']> = range ?? 'thismonth'

  const { data: requestSummary } = useQuery({
    queryKey: ['dashboard', 'request-summary', effectiveRange, 'pc-v2'],
    queryFn: () => dashboardApi.getRequestSummary({ range: effectiveRange }),
  })

  const { data: pendingList } = useQuery({
    queryKey: ['pc-dashboard', 'pipeline', 'pending'],
    queryFn: () =>
      requestApi.getRequests({
        pageNumber: 1,
        pageSize: 6,
        statuses: ['PENDING'],
      }),
  })

  const { data: inProgressList } = useQuery({
    queryKey: ['pc-dashboard', 'pipeline', 'in-progress'],
    queryFn: () =>
      requestApi.getRequests({
        pageNumber: 1,
        pageSize: 6,
        statuses: ['APPROVED', 'ASSIGNING', 'PUBLISHED'],
      }),
  })

  const { data: recentRequests } = useQuery({
    queryKey: ['pc-dashboard', 'recent-requests', 'pc-v2'],
    queryFn: () =>
      requestApi.getRequests({
        pageNumber: 1,
        pageSize: 8,
      }),
  })

  const { data: requestTypeSample } = useQuery({
    queryKey: ['pc-dashboard', 'request-type-sample', 'pc-v2'],
    queryFn: () => requestApi.getRequests({ pageNumber: 1, pageSize: 24 }),
    staleTime: 60_000,
  })

  const requestTypeCounts = useMemo(() => {
    const items = requestTypeSample?.items ?? []
    let eventCount = 0
    let courseCount = 0
    let subjectCount = 0
    let otherCount = 0

    for (const r of items) {
      if (r.eventId != null) eventCount += 1
      else if (r.courseId != null) courseCount += 1
      else if (r.subjectId != null) subjectCount += 1
      else otherCount += 1
    }

    const rows = [
      { key: 'Sự kiện', value: eventCount },
      { key: 'Khóa học', value: courseCount },
      { key: 'Môn học', value: subjectCount },
      { key: 'Khác', value: otherCount },
    ]
    const nonZero = rows.filter((x) => x.value > 0)
    return nonZero.length > 0 ? nonZero : rows
  }, [requestTypeSample])

  const inProgressKpi =
    (requestSummary?.approvedRequests ?? 0) +
    (requestSummary?.assigningRequests ?? 0) +
    (requestSummary?.publishedRequests ?? 0)

  const blockedKpi = (requestSummary?.rejectedRequests ?? 0) + (requestSummary?.cancelledRequests ?? 0)

  return (
    <div className={cn('min-h-full space-y-4 p-6', PAGE_BG)}>
      <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-sky-50/90 via-white to-white px-5 py-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-1">
            <h2 className="text-xl font-semibold text-slate-900">Yêu cầu & tiến độ</h2>
            <p className="max-w-xl text-sm text-slate-600">
              Tạo yêu cầu mới và theo dõi trạng thái xử lý (duyệt → phân công → triển khai → hoàn thành). Số liệu
              dưới đây theo khoảng thời gian bạn chọn.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Thời gian:</span>
              <select
                className="h-9 min-w-[140px] rounded-md border border-slate-200 bg-white px-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
                value={effectiveRange}
                onChange={(e) =>
                  setRange(e.target.value as NonNullable<DashboardRangeParams['range']>)
                }
              >
                <option value="today">Hôm nay</option>
                <option value="thisweek">Tuần này</option>
                <option value="thismonth">Tháng này</option>
                <option value="last3months">3 tháng</option>
                <option value="last6months">6 tháng</option>
                <option value="1year">1 năm</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                className="gap-1.5 bg-[#2197C0] text-white hover:bg-[#208AAE]"
                onClick={() => navigate('/pc/requests/create')}
              >
                <Plus className="h-3.5 w-3.5" />
                Tạo yêu cầu
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-slate-200"
                onClick={() => navigate('/pc/requests')}
              >
                Danh sách yêu cầu
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <PcKpiCard
          tone="sky"
          title="Tổng yêu cầu"
          value={requestSummary?.totalRequests ?? '—'}
          sub={rangeLabelMap[effectiveRange]}
          icon={<Layers className="h-5 w-5" strokeWidth={2} />}
        />
        <PcKpiCard
          tone="amber"
          title="Chờ duyệt"
          value={requestSummary?.pendingRequests ?? '—'}
          sub="Cần phản hồi từ quản lý"
          icon={<Timer className="h-5 w-5" strokeWidth={2} />}
        />
        <PcKpiCard
          tone="indigo"
          title="Đang xử lý"
          value={requestSummary != null ? inProgressKpi : '—'}
          sub="Đã duyệt + phân công + triển khai"
          icon={<ListChecks className="h-5 w-5" strokeWidth={2} />}
        />
        <PcKpiCard
          tone="emerald"
          title="Hoàn thành"
          value={requestSummary?.completedRequests ?? '—'}
          sub={rangeLabelMap[effectiveRange]}
          icon={<ClipboardList className="h-5 w-5" strokeWidth={2} />}
        />
        <PcKpiCard
          tone="rose"
          title="Từ chối / Hủy"
          value={requestSummary != null ? blockedKpi : '—'}
          sub="Không tiếp tục xử lý"
          icon={<ClipboardList className="h-5 w-5" strokeWidth={2} />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Chờ duyệt</p>
                <p className="text-xs text-slate-500">Ưu tiên theo dõi phản hồi</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 text-sky-700"
              onClick={() => navigate('/pc/requests')}
            >
              Xem tất cả
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {(pendingList?.items ?? []).length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center gap-2 py-8 text-center">
                <ClipboardList className="h-9 w-9 text-slate-200" />
                <p className="text-sm text-slate-600">Không có yêu cầu chờ duyệt</p>
              </div>
            )}
            {(pendingList?.items ?? []).map((r: RequestListItem) => (
              <RequestPipelineCard key={r.requestId} r={r} onClick={() => navigate(`/pc/requests/${r.requestId}`)} />
            ))}
          </div>
        </div>
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-indigo-600" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Đang xử lý</p>
                <p className="text-xs text-slate-500">Đã duyệt, phân công hoặc đang triển khai</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 text-sky-700"
              onClick={() => navigate('/pc/requests')}
            >
              Xem tất cả
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {(inProgressList?.items ?? []).length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center gap-2 py-8 text-center">
                <ListChecks className="h-9 w-9 text-slate-200" />
                <p className="text-sm text-slate-600">Chưa có yêu cầu đang xử lý</p>
              </div>
            )}
            {(inProgressList?.items ?? []).map((r: RequestListItem) => (
              <RequestPipelineCard key={r.requestId} r={r} onClick={() => navigate(`/pc/requests/${r.requestId}`)} />
            ))}
          </div>
        </div>

          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">Hoạt động gần đây</p>
                <p className="text-xs text-slate-500">Các yêu cầu mới cập nhật — bấm để xem chi tiết</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-sky-700"
                onClick={() => navigate('/pc/requests')}
              >
                Danh sách
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {(recentRequests?.items ?? []).length === 0 && (
                <p className="py-6 text-center text-xs text-slate-500">Chưa có dữ liệu.</p>
              )}
              {(recentRequests?.items ?? []).map((r: RequestListItem) => (
                <RequestPipelineCard
                  key={`recent-${r.requestId}`}
                  r={r}
                  onClick={() => navigate(`/pc/requests/${r.requestId}`)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="mb-2">
              <p className="text-sm font-semibold text-slate-900">Request theo loại nội dung</p>
              <p className="text-xs text-slate-500">Event / Khóa học / Môn học (lấy mẫu trang 1)</p>
            </div>
            {requestTypeCounts?.length > 0 ? (
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={requestTypeCounts} margin={{ top: 8, right: 8, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-100" />
                    <XAxis dataKey="key" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={36} />
                    <Tooltip
                      formatter={(value: number) => [Number(value ?? 0).toLocaleString('vi-VN'), 'Yêu cầu']}
                      wrapperClassName="text-xs"
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={54}>
                      {requestTypeCounts.map((_, i) => (
                        <Cell key={i} fill={TYPE_BAR_COLORS[i % TYPE_BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-10 text-center text-xs text-slate-500">Chưa có dữ liệu.</p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="mb-2">
              <p className="text-sm font-semibold text-slate-900">Tổng quan trạng thái</p>
              <p className="text-xs text-slate-500">Từ API dashboard (theo khoảng thời gian)</p>
            </div>
            {requestSummary ? (
              <div className="grid grid-cols-1 gap-2">
                {[
                  { label: 'Chờ duyệt', value: requestSummary.pendingRequests, tone: 'border-amber-500 bg-amber-50 text-amber-800' },
                  { label: 'Đang phân công', value: requestSummary.assigningRequests, tone: 'border-sky-500 bg-sky-50 text-sky-800' },
                  { label: 'Đang triển khai', value: requestSummary.publishedRequests, tone: 'border-violet-500 bg-violet-50 text-violet-800' },
                  { label: 'Hoàn thành', value: requestSummary.completedRequests, tone: 'border-emerald-500 bg-emerald-50 text-emerald-800' },
                ].map((x) => (
                  <div key={x.label} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200/70 bg-slate-50/40 px-3 py-2">
                    <span className="text-xs font-medium text-slate-700">{x.label}</span>
                    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold', x.tone)}>
                      {x.value}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-xs text-slate-500">Đang tải...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
