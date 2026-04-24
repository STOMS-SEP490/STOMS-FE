import { Copy, FileText, Hash, History, ImageIcon, Info, X } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { EquipmentListItem } from '../equipment'
import type { BorrowingListItem } from '@/modules/equipment/borrowing'
import { Badge } from '@/shared/components/ui/badge'
import { cn } from '@/shared/lib/utils'
import {
  getEquipmentStatusColor,
  getEquipmentStatusDisplay,
  getEquipmentBorrowingStatusInfo,
} from '@/constants/status'
import { getBorrowingStatusColor, getBorrowingStatusDisplay } from '@/constants/borrowing'
import { Image, Skeleton, message } from 'antd'
import borrowingApi from '@/modules/equipment/api/borrowingApi'

type Props = {
  open: boolean
  onClose: () => void
  equipment: EquipmentListItem | null
  categoryName?: string
}

function formatDateTime(date?: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleString('vi-VN')
}

function normalizeUrl(url: string) {
  const u = (url ?? '').trim()
  if (!u) return ''
  if (/^https?:\/\//i.test(u)) return u
  return `https://${u}`
}



async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    message.success('Đã sao chép')
  } catch {
    message.error('Không thể sao chép')
  }
}

function Section({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
        <Icon className="h-4 w-4 shrink-0 text-[#2197C0]" strokeWidth={2} aria-hidden />
        <h3 className="text-sm font-semibold text-black">{title}</h3>
      </div>
      <div>{children}</div>
    </section>
  )
}

function MetaRow({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={cn('py-1.5', className)}>
      <div className="text-xs font-medium text-[#2197C0]">{label}</div>
      <div className="mt-0.5 break-words text-sm text-black">{value}</div>
    </div>
  )
}

export default function EquipmentDetailSidebar({ open, onClose, equipment, categoryName }: Props) {
  const [historyBorrowings, setHistoryBorrowings] = useState<BorrowingListItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    if (!open || !equipment) return
    const equipmentId = Number(equipment.equipmentId)
    if (!Number.isFinite(equipmentId) || equipmentId <= 0) return

    let cancelled = false
    setLoadingHistory(true)

    borrowingApi.getBorrowings({ pageNumber: 1, pageSize: 50, equipmentId })
      .then((res) => { if (!cancelled) setHistoryBorrowings(res.items ?? []) })
      .catch(() => { if (!cancelled) setHistoryBorrowings([]) })
      .finally(() => { if (!cancelled) setLoadingHistory(false) })

    return () => { cancelled = true }
  }, [open, equipment?.equipmentId])

  const borrowingHistory = useMemo(() => {
    return [...historyBorrowings].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return tb - ta
    })
  }, [historyBorrowings])

  if (!open) return null

  const handoverUrl = equipment?.handoverMinute ? normalizeUrl(equipment.handoverMinute) : ''

  return (
    <>
      <div className="fixed inset-0 bg-black/35 z-40 h-full" onClick={onClose} aria-hidden />

      <div className={cn(
        'fixed top-0 right-0 h-full w-[620px] max-w-[96vw] z-50',
        'bg-white border-l border-slate-200 shadow-2xl',
        'translate-x-0 transition-transform duration-300 ease-out',
      )}>
        <div className="flex flex-col h-full overflow-hidden">

          {/* HEADER */}
          <header className="w-full shrink-0 border-b border-slate-200 bg-white">
            {!equipment ? (
              <div className="px-5 py-5 pr-14">
                <Skeleton active title={{ width: '55%' }} paragraph={{ rows: 1 }} />
              </div>
            ) : (
              <>
                <div className="px-5 pt-5 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium uppercase tracking-widest text-slate-400">CHI TIẾT THIẾT BỊ</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold text-[#1a7a99] truncate">{equipment.equipmentName}</h2>
                        <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium', getEquipmentStatusColor(equipment.status))}>
                          {getEquipmentStatusDisplay(equipment.status)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                        <span className="font-medium text-slate-700">{equipment.equipmentCode}</span>
                        <button
                          type="button"
                          className="p-0.5 rounded hover:bg-slate-100 text-slate-400"
                          title="Sao chép mã"
                          onClick={() => copyToClipboard(equipment.equipmentCode)}
                        >
                          <Copy size={13} />
                        </button>
                        {categoryName && (
                          <>
                            <span className="text-slate-300">·</span>
                            <Badge variant="secondary" className="text-xs">{categoryName}</Badge>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      className="shrink-0 rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                      aria-label="Đóng"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Meta bar */}
                <div className="grid w-full grid-cols-3 divide-x divide-slate-200 border-t border-slate-200 bg-slate-50">
                  <div className="px-5 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-[#2197C0]">Danh mục</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-900">{categoryName ?? `#${equipment.categoryId}`}</p>
                  </div>
                  <div className="px-5 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-[#2197C0]">Bên cung cấp</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-900">{equipment.sponsoredBy || '—'}</p>
                  </div>
                  <div className="px-5 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-[#2197C0]">Ngày tạo</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-900">{formatDateTime(equipment.createdAt)}</p>
                  </div>
                </div>
              </>
            )}
          </header>

          {/* BODY */}
          <div className="relative min-h-0 flex-1 overflow-y-auto bg-white px-5 py-4">
            {!equipment ? (
              <div className="space-y-4">
                <Skeleton active paragraph={{ rows: 4 }} />
                <Skeleton active paragraph={{ rows: 4 }} />
              </div>
            ) : (
              <div className="space-y-4">

                {/* Thông tin chung */}
                <Section icon={Info} title="Thông tin chung">
                  <div className="pl-4 grid grid-cols-2 gap-x-6">
                    <MetaRow label="Tên thiết bị" value={equipment.equipmentName} />
                    <MetaRow label="Mã thiết bị" value={equipment.equipmentCode} />
                    <MetaRow label="Danh mục" value={categoryName ?? `#${equipment.categoryId}`} />
                    <MetaRow label="Bên cung cấp" value={equipment.sponsoredBy || '—'} />
                    <MetaRow label="Ngày tạo" value={formatDateTime(equipment.createdAt)} />
                    <MetaRow
                      label="Trạng thái"
                      value={
                        <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', getEquipmentStatusColor(equipment.status))}>
                          {getEquipmentStatusDisplay(equipment.status)}
                        </span>
                      }
                    />
                    <MetaRow
                      className="col-span-2"
                      label="Biên bản bàn giao"
                      value={
                        handoverUrl ? (
                          <Image
                            src={handoverUrl}
                            alt="Biên bản bàn giao"
                            width={120}
                            height={80}
                            className="object-cover rounded-md border border-slate-200 cursor-pointer"
                            preview={{ mask: 'Xem ảnh' }}
                          />
                        ) : '—'
                      }
                    />
                  </div>
                </Section>

                {/* Mô tả */}
                <Section icon={FileText} title="Mô tả">
                  <div className="pl-4">
                    <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                      {equipment.description?.trim() || 'Chưa có mô tả'}
                    </p>
                  </div>
                </Section>

                {/* Hình ảnh */}
                <Section icon={ImageIcon} title="Hình ảnh">
                  <div className="pl-4">
                    {equipment.imgLink ? (
                      <div className="overflow-hidden rounded-lg border bg-slate-50 w-fit">
                        <Image
                          src={equipment.imgLink}
                          alt={equipment.equipmentName}
                          width={240}
                          height={180}
                          className="object-cover"
                          preview={{ mask: 'Xem ảnh' }}
                        />
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">Không có ảnh.</p>
                    )}
                  </div>
                </Section>

                {/* Đang mượn */}
                <Section icon={Hash} title={`Đang mượn (${equipment.currentBorrowings?.length ?? 0})`}>
                  {equipment.currentBorrowings && equipment.currentBorrowings.length > 0 ? (
                    <div className="pl-4 divide-y divide-slate-200">
                      {equipment.currentBorrowings.map((b) => {
                        const info = getEquipmentBorrowingStatusInfo(b.status)
                        return (
                          <div key={b.equipmentBorrowingId} className="py-2.5 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-black">Borrowing #{b.equipmentBorrowingId}</p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Mượn: {formatDateTime(b.checkoutAt)} · Trả: {formatDateTime(b.checkinAt)}
                              </p>
                            </div>
                            <Badge className={cn(info.className, 'shrink-0 text-xs')}>{info.label}</Badge>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="pl-4 py-2 text-sm text-slate-500">Không có lượt mượn hiện tại.</p>
                  )}
                </Section>

                {/* Lịch sử mượn */}
                <Section icon={History} title="Lịch sử mượn">
                  {loadingHistory ? (
                    <div className="pl-4 py-2">
                      <Skeleton active paragraph={{ rows: 3 }} title={false} />
                    </div>
                  ) : borrowingHistory.length > 0 ? (
                    <div className="pl-4 divide-y divide-slate-200">
                      {borrowingHistory.map((h, idx) => {
                        const statusLabel = getBorrowingStatusDisplay(h.status ?? '')
                        const statusClass = getBorrowingStatusColor(h.status ?? '')
                        const key = h.borrowingId != null && h.borrowingId > 0 ? `b-${h.borrowingId}-${idx}` : `i-${idx}`
                        return (
                          <div key={key} className="py-2.5 flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-0.5">
                              <p className="text-sm font-medium text-black">
                                {h.borrowingId ? `Borrowing #${h.borrowingId}` : `Lượt mượn #${idx + 1}`}
                              </p>
                              {h.description?.trim() && (
                                <p className="text-xs text-slate-600 line-clamp-2">{h.description.trim()}</p>
                              )}
                              {h.note?.trim() && (
                                <p className="text-xs text-slate-500 line-clamp-2">Ghi chú: {h.note.trim()}</p>
                              )}
                              <p className="text-xs text-slate-500">
                                Người mượn: {h.borrowedByMember?.fullName?.trim() || (h.borrowedByMemberId ? `#${h.borrowedByMemberId}` : '—')}
                              </p>
                              <p className="text-xs text-slate-500">
                                Người cho mượn: {h.lentByMember?.fullName?.trim() || (h.lentByMemberId ? `#${h.lentByMemberId}` : '—')}
                              </p>
                              <p className="text-xs text-slate-500">
                                Hạn trả: {formatDateTime(h.returnedDueDate ?? null)} · Tạo: {formatDateTime(h.createdAt ?? null)}
                              </p>
                            </div>
                            <Badge className={cn(statusClass, 'shrink-0 text-xs')}>{statusLabel}</Badge>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="pl-4 py-2 text-sm text-slate-500">Chưa có lịch sử mượn.</p>
                  )}
                </Section>

                {/* Lịch đặt sắp tới */}
                <Section icon={Hash} title={`Lịch đặt sắp tới (${equipment.upcomingReservations?.length ?? 0})`}>
                  {equipment.upcomingReservations && equipment.upcomingReservations.length > 0 ? (
                    <div className="pl-4 divide-y divide-slate-200">
                      {equipment.upcomingReservations.map((r) => (
                        <div key={r.reservationId} className="py-2.5">
                          <p className="text-sm font-medium text-black">Reservation #{r.reservationId}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {formatDateTime(r.startAt)} → {formatDateTime(r.endAt)}
                          </p>
                          {r.createdByMemberId && (
                            <p className="text-xs text-slate-500">Tạo bởi: #{r.createdByMemberId}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="pl-4 py-2 text-sm text-slate-500">Không có lịch đặt sắp tới.</p>
                  )}
                </Section>

              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
