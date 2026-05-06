import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Laptop,
  Package,
  Plus,
  Wrench,
} from 'lucide-react'
import { dashboardApi } from '@/modules/dashboard/api/dashboardApi'
import borrowingApi from '@/modules/equipment/api/borrowingApi'
import { getEquipmentsListCached } from '@/modules/equipment/utils/equipmentListCache'
import type { BorrowingListItem } from '@/modules/equipment/borrowing'
import type { EquipmentListItem } from '@/modules/equipment/equipment'
import { EQUIPMENT_STATUS, getEquipmentStatusColor, getEquipmentStatusDisplay } from '@/constants/status'
import { getBorrowingStatusColor, getBorrowingStatusDisplay } from '@/constants/borrowing'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { cn } from '@/shared/lib/utils'
import CreateBorrowingModal from './CreateBorrowingModal'
import CreateEquipmentModal from './CreateEquipmentModal'

const PAGE_BG = 'app-page-bg'

function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const t = d.getTime()
  if (Number.isNaN(t)) return '—'
  const diff = Date.now() - t
  const sec = Math.floor(diff / 1000)
  const mins = Math.floor(sec / 60)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (mins < 1) return 'Vừa xong'
  if (mins < 60) return `${mins} phút trước`
  if (hours < 24) return `${hours} giờ trước`
  if (days < 7) return `${days} ngày trước`
  return d.toLocaleDateString('vi-VN')
}

function borrowingPrimaryLabel(item: BorrowingListItem): string {
  const first = item.borrowingEquipmentDetail?.[0]?.equipment?.equipmentName
  if (first) return first
  const desc = item.description?.trim()
  if (desc) return desc
  return 'Phiếu mượn'
}

type KpiTone = 'emerald' | 'sky' | 'amber' | 'rose'

function EmKpiCard(props: {
  title: string
  value: React.ReactNode
  sub?: React.ReactNode
  icon: React.ReactNode
  tone: KpiTone
  badge?: React.ReactNode
}) {
  const toneClass: Record<KpiTone, { ring: string; iconBg: string; iconFg: string }> = {
    emerald: {
      ring: 'ring-emerald-100/80',
      iconBg: 'bg-emerald-50',
      iconFg: 'text-emerald-600',
    },
    sky: {
      ring: 'ring-sky-100/80',
      iconBg: 'bg-sky-50',
      iconFg: 'text-sky-600',
    },
    amber: {
      ring: 'ring-amber-100/80',
      iconBg: 'bg-amber-50',
      iconFg: 'text-amber-600',
    },
    rose: {
      ring: 'ring-rose-100/80',
      iconBg: 'bg-rose-50',
      iconFg: 'text-rose-600',
    },
  }
  const t = toneClass[props.tone]

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm',
        'ring-1',
        t.ring
      )}
    >
      {props.badge != null && (
        <div className="absolute right-3 top-3 text-[10px] font-medium text-slate-400">{props.badge}</div>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 pr-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{props.title}</p>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums text-slate-900">{props.value}</p>
          {props.sub != null && <p className="mt-1 text-[11px] leading-snug text-slate-400">{props.sub}</p>}
        </div>
        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', t.iconBg, t.iconFg)}>
          {props.icon}
        </div>
      </div>
    </div>
  )
}

const PIE_COLORS = ['#22c55e', '#0ea5e9', '#f59e0b', '#f43f5e', '#94a3b8']

export default function EquipmentDashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [createBorrowingOpen, setCreateBorrowingOpen] = useState(false)
  const [createEquipmentOpen, setCreateEquipmentOpen] = useState(false)

  const { data: equipmentStats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard', 'equipment-statistics'],
    queryFn: () => dashboardApi.getEquipmentStatistics(),
  })

  const { data: categoryDistribution } = useQuery({
    queryKey: ['dashboard', 'equipment-category-distribution'],
    queryFn: () => dashboardApi.getEquipmentCategoryDistribution(),
  })

  const { data: recentBorrowings } = useQuery({
    queryKey: ['em-dashboard', 'recent-borrowings'],
    queryFn: () =>
      borrowingApi.getBorrowings({
        pageNumber: 1,
        pageSize: 6,
      }),
  })

  const { data: overdueBorrowingsMeta } = useQuery({
    queryKey: ['em-dashboard', 'overdue-count'],
    queryFn: () =>
      borrowingApi.getBorrowings({
        pageNumber: 1,
        pageSize: 1,
        status: 'Overdue',
      }),
  })

  const { data: attentionEquipments } = useQuery({
    queryKey: ['em-dashboard', 'attention-equipments'],
    queryFn: async () => {
      const [damaged, lost, unavailable] = await Promise.all([
        getEquipmentsListCached({
          pageNumber: 1,
          pageSize: 4,
          status: String(EQUIPMENT_STATUS.DAMAGED),
        }),
        getEquipmentsListCached({
          pageNumber: 1,
          pageSize: 2,
          status: String(EQUIPMENT_STATUS.LOST),
        }),
        getEquipmentsListCached({
          pageNumber: 1,
          pageSize: 2,
          status: String(EQUIPMENT_STATUS.UNAVAILABLE),
        }),
      ])
      const merged: EquipmentListItem[] = [
        ...(damaged.items ?? []),
        ...(lost.items ?? []),
        ...(unavailable.items ?? []),
      ]
      const seen = new Set<number>()
      return merged.filter((e) => {
        if (seen.has(e.equipmentId)) return false
        seen.add(e.equipmentId)
        return true
      }).slice(0, 6)
    },
    staleTime: 2 * 60 * 1000,
  })

  const pieData = useMemo(() => {
    if (!equipmentStats) return []
    const rows = [
      { name: 'Khả dụng', value: equipmentStats.availableEquipment },
      { name: 'Đang mượn', value: equipmentStats.borrowedEquipment },
      { name: 'Hư hỏng', value: equipmentStats.damagedEquipment },
      { name: 'Mất', value: equipmentStats.lostEquipment },
      { name: 'Không khả dụng', value: equipmentStats.unavailableEquipment },
    ]
    return rows.filter((r) => r.value > 0)
  }, [equipmentStats])

  const categoryBarData = useMemo(
    () =>
      (categoryDistribution ?? []).slice(0, 8).map((c: any) => ({
        name:
          c.categoryName.length > 14 ? `${c.categoryName.slice(0, 12)}…` : c.categoryName,
        total: c.totalEquipment,
        fullName: c.categoryName,
      })),
    [categoryDistribution]
  )

  const totalEq = equipmentStats?.totalEquipment ?? 0
  const overdueCount = overdueBorrowingsMeta?.totalItems ?? 0
  const needsAttention =
    (equipmentStats?.damagedEquipment ?? 0) +
    (equipmentStats?.lostEquipment ?? 0)

  const invalidateLists = () => {
    void queryClient.invalidateQueries({ queryKey: ['em-dashboard'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard', 'equipment-statistics'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard', 'equipment-category-distribution'] })
  }

  return (
    <div className={cn('min-h-full p-6 space-y-6', PAGE_BG)}>
      <div className="mb-2 flex items-center justify-between rounded-xl border bg-white px-6 py-4 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-[#1a7a99]">Bảng điều khiển</h2>
          <p className="text-xs text-gray-500">
            Tổng quan trạng thái thiết bị, phiếu mượn và yêu cầu đặt trước cần xử lý.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <EmKpiCard
          tone="emerald"
          title="Thiết bị khả dụng"
          value={statsLoading ? '—' : (equipmentStats?.availableEquipment ?? '—')}
          sub={
            totalEq
              ? `Trên tổng ${totalEq.toLocaleString('vi-VN')} thiết bị`
              : 'Chưa có dữ liệu tổng'
          }
          icon={<CheckCircle2 className="h-5 w-5" strokeWidth={2} />}
        />
        <EmKpiCard
          tone="sky"
          title="Đang cho mượn"
          value={statsLoading ? '—' : (equipmentStats?.borrowedEquipment ?? '—')}
           sub="Thiết bị"
          icon={<Package className="h-5 w-5" strokeWidth={2} />}
        />
        <EmKpiCard
          tone="amber"
          title="Cần xử lý"
          value={statsLoading ? '—' : needsAttention}
          sub="Hỏng hoặc mất"
          icon={<Wrench className="h-5 w-5" strokeWidth={2} />}
        />
        <EmKpiCard
          tone="rose"
          title="Phiếu quá hạn"
          value={overdueCount}
          sub="Phiếu"
          icon={<AlertTriangle className="h-5 w-5" strokeWidth={2} />}
          badge={overdueCount > 0 ? 'Cảnh báo' : undefined}
        />
      </div>

      <div>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Thống kê tổng quan
            </p>
            <p className="text-sm text-slate-600">Biểu đồ theo dữ liệu hiện tại</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase text-slate-500">Phân bổ trạng thái</p>
                <p className="text-sm text-slate-600">Tỷ lệ thiết bị theo trạng thái</p>
              </div>
              <Laptop className="h-5 w-5 text-indigo-500" />
            </div>
            {pieData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={52}
                      outerRadius={88}
                      paddingAngle={2}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [
                        Number(value ?? 0).toLocaleString('vi-VN'),
                        'Số lượng',
                      ]}
                      wrapperClassName="text-xs"
                    />
                    <Legend layout="horizontal" verticalAlign="bottom" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-8 text-center text-xs text-slate-500">Chưa có dữ liệu thiết bị.</p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase text-slate-500">Theo danh mục</p>
                <p className="text-sm text-slate-600">Số lượng thiết bị / danh mục</p>
              </div>
              <ClipboardList className="h-5 w-5 text-sky-500" />
            </div>
            {categoryBarData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryBarData} layout="vertical" margin={{ left: 8, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-slate-100" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={100}
                      tick={{ fontSize: 10 }}
                      tickFormatter={(_, i) => categoryBarData[i]?.name ?? ''}
                    />
                    <Tooltip
                      formatter={(value) => [Number(value ?? 0).toLocaleString('vi-VN'), 'Thiết bị']}
                      labelFormatter={(_, payload) => {
                        const p = payload?.[0] as { payload?: { fullName?: string } } | undefined
                        return p?.payload?.fullName ?? ''
                      }}
                      wrapperClassName="text-xs"
                    />
                    <Bar dataKey="total" fill="#0ea5e9" radius={[0, 6, 6, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-8 text-center text-xs text-slate-500">Chưa có phân bổ danh mục.</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-sky-100 bg-gradient-to-r from-sky-50/90 to-white px-5 py-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-sky-900">Thao tác nhanh</p>
            <p className="text-xs text-sky-700/80">
              Tạo phiếu mượn mới hoặc thêm thiết bị vào hệ thống.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white shadow-sm"
              onClick={() => setCreateBorrowingOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Tạo phiếu mượn
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-sky-300 bg-white text-sky-800 hover:bg-sky-50"
              onClick={() => setCreateEquipmentOpen(true)}
            >
              <Laptop className="h-4 w-4" />
              Thêm thiết bị
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Phiếu mượn gần đây
              </p>
              <p className="text-sm text-slate-600">Hoạt động mới nhất</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-sky-700"
              onClick={() => navigate('/em/borrowings')}
            >
              Xem tất cả
            </Button>
          </div>
          <div className="space-y-2">
            {(recentBorrowings?.items ?? []).length === 0 && (
              <p className="py-6 text-center text-xs text-slate-500">Chưa có phiếu mượn.</p>
            )}
            {(recentBorrowings?.items ?? []).map((item) => {
              const status = item.status
              const borrower = item.borrowedByMember?.fullName?.trim() || '—'
              const primary = borrowingPrimaryLabel(item)
              return (
                <button
                  key={item.borrowingId}
                  type="button"
                  onClick={() =>
                    navigate(`/em/borrowings?openDetail=1&borrowingId=${item.borrowingId}`)
                  }
                  className="flex w-full items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2.5 text-left transition hover:border-sky-200 hover:bg-sky-50/40"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-800">
                        #{item.borrowingId}
                      </span>
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                          getBorrowingStatusColor(status)
                        )}
                      >
                        {getBorrowingStatusDisplay(status)}
                      </span>
                    </div>
                    <p className="truncate text-sm text-slate-800">
                      {borrower}
                      <span className="text-slate-400"> — </span>
                      {primary}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Hạn trả:{' '}
                      {item.returnedDueDate
                        ? new Date(item.returnedDueDate).toLocaleDateString('vi-VN')
                        : '—'}{' '}
                      · {formatRelativeTime(item.createdAt)}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Thiết bị cần chú ý
              </p>
              <p className="text-sm text-slate-600">Hư hỏng, mất hoặc không khả dụng</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-sky-700"
              onClick={() => navigate('/em/equipments')}
            >
              Quản lý
            </Button>
          </div>
          <div className="space-y-2">
            {(attentionEquipments ?? []).length === 0 && (
              <p className="py-6 text-center text-xs text-slate-500">Không có thiết bị cảnh báo.</p>
            )}
            {(attentionEquipments ?? []).map((eq) => (
              <button
                key={eq.equipmentId}
                type="button"
                onClick={() =>
                  navigate(`/em/equipments?openDetail=1&equipmentId=${eq.equipmentId}`)
                }
                className="flex w-full items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2.5 text-left transition hover:border-amber-200 hover:bg-amber-50/30"
              >
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white">
                  {eq.imgLink ? (
                    <img src={eq.imgLink} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
                      <Laptop className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium text-slate-900">{eq.equipmentName}</span>
                    <Badge
                      variant="secondary"
                      className={cn(
                        'shrink-0 border-0 px-2 py-0 text-[11px] font-medium',
                        getEquipmentStatusColor(eq.status)
                      )}
                    >
                      {getEquipmentStatusDisplay(eq.status)}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Mã: {eq.equipmentCode}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <CreateBorrowingModal
        open={createBorrowingOpen}
        onClose={() => setCreateBorrowingOpen(false)}
        onCreated={() => {
          setCreateBorrowingOpen(false)
          invalidateLists()
        }}
      />
      <CreateEquipmentModal
        open={createEquipmentOpen}
        onClose={() => setCreateEquipmentOpen(false)}
        onCreated={() => {
          setCreateEquipmentOpen(false)
          invalidateLists()
        }}
      />
    </div>
  )
}
