import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { ImageOff, Info, Layers, X } from 'lucide-react'
import type { BorrowingListItem } from '../borrowing'
import { getBorrowingStatusColor, getBorrowingStatusDisplay } from '@/constants/borrowing'
import { getEquipmentBorrowingStatusInfo } from '@/constants/status'
import { cn } from '@/shared/lib/utils'
import { Checkbox, Image, Skeleton, message } from 'antd'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import borrowingApi from '../api/borrowingApi'
import equipmentApi from '../api/equipmentApi'

type Props = {
  open: boolean
  onClose: () => void
  borrowing: BorrowingListItem | null
  onReturned?: () => Promise<void> | void
  canManageReturn?: boolean
}

function formatDateTime(date?: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleString('vi-VN')
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

export default function BorrowingDetailSidebar({
  open,
  onClose,
  borrowing,
  onReturned,
  canManageReturn = true,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [returnStatusById, setReturnStatusById] = useState<Record<number, 'RETURNED' | 'DAMAGED' | 'LOST'>>({})
  const [returning, setReturning] = useState(false)
  const [localReturnedAtById, setLocalReturnedAtById] = useState<Record<number, string>>({})
  const [localStatusById, setLocalStatusById] = useState<Record<number, string>>({})
  const [imgLinkByEquipmentId, setImgLinkByEquipmentId] = useState<Record<number, string>>({})

  const details = borrowing?.borrowingEquipmentDetail ?? []

  useEffect(() => {
    if (!open || !details.length) return

    const missingIds = Array.from(new Set(
      details
        .map((d) => Number(d.equipmentId))
        .filter((id) => Number.isFinite(id) && id > 0)
        .filter((id) => !imgLinkByEquipmentId[id])
        .filter((id) => !details.some((x) => x.equipmentId === id && x.equipment?.imgLink)),
    ))

    if (!missingIds.length) return

    let cancelled = false
    ;(async () => {
      const results = await Promise.allSettled(
        missingIds.map(async (id) => {
          const eq = await equipmentApi.getById(id)
          return { id, link: typeof eq?.imgLink === 'string' ? eq.imgLink : null }
        }),
      )
      if (cancelled) return
      const next: Record<number, string> = {}
      results.forEach((r) => {
        if (r.status !== 'fulfilled' || !r.value.link) return
        next[r.value.id] = r.value.link
      })
      if (Object.keys(next).length > 0) setImgLinkByEquipmentId((prev) => ({ ...prev, ...next }))
    })()

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, borrowing?.borrowingId])

  const actionableItems = useMemo(
    () => details.filter((item) => {
      const raw = String(localStatusById[item.equipmentBorrowingId] ?? item.status ?? '').toLowerCase()
      return !raw.includes('returned') && raw !== '2' && !raw.includes('damaged') && raw !== '3' && !raw.includes('lost') && raw !== '4' && !raw.includes('mất')
    }),
    [details, localStatusById],
  )

  const allActionableIds = actionableItems.map((item) => item.equipmentBorrowingId)
  const allSelected = allActionableIds.length > 0 && allActionableIds.every((id) => selectedIds.includes(id))

  const toggleSelectAll = (checked: boolean) => {
    if (!checked) { setSelectedIds([]); return }
    setSelectedIds(allActionableIds)
    setReturnStatusById((prev) => {
      const next = { ...prev }
      allActionableIds.forEach((id) => { if (!next[id]) next[id] = 'RETURNED' })
      return next
    })
  }

  const toggleOne = (equipmentBorrowingId: number, checked: boolean) => {
    setSelectedIds((prev) => checked ? (prev.includes(equipmentBorrowingId) ? prev : [...prev, equipmentBorrowingId]) : prev.filter((id) => id !== equipmentBorrowingId))
    if (checked) setReturnStatusById((prev) => ({ ...prev, [equipmentBorrowingId]: prev[equipmentBorrowingId] ?? 'RETURNED' }))
  }

  const handleConfirmReturn = async (returnAllAsReturned: boolean) => {
    if (!borrowing) return
    const targetIds = returnAllAsReturned ? allActionableIds : selectedIds
    if (!targetIds.length) { message.warning('Vui lòng chọn ít nhất 1 thiết bị để xác nhận trả'); return }

    const itemsToProcess = details.filter((item) => targetIds.includes(item.equipmentBorrowingId))
    if (!itemsToProcess.length) return

    try {
      setReturning(true)
      const nowIso = new Date().toISOString()
      const payload = {
        items: itemsToProcess.map((item) => {
          const rs = returnAllAsReturned ? 'RETURNED' : (returnStatusById[item.equipmentBorrowingId] ?? 'RETURNED')
          return { equipmentBorrowingId: item.equipmentBorrowingId, status: rs === 'DAMAGED' ? 'Damaged' as const : rs === 'LOST' ? 'Lost' as const : 'Returned' as const }
        }),
      }
      await borrowingApi.updateHandover(borrowing.borrowingId, payload)

      const nextStatus: Record<number, string> = {}
      const nextAt: Record<number, string> = {}
      itemsToProcess.forEach((item) => {
        const rs = returnAllAsReturned ? 'RETURNED' : (returnStatusById[item.equipmentBorrowingId] ?? 'RETURNED')
        nextStatus[item.equipmentBorrowingId] = rs === 'DAMAGED' ? 'Damaged' : rs === 'LOST' ? 'Lost' : 'Returned'
        nextAt[item.equipmentBorrowingId] = nowIso
      })
      setLocalStatusById((prev) => ({ ...prev, ...nextStatus }))
      setLocalReturnedAtById((prev) => ({ ...prev, ...nextAt }))
      setSelectedIds([])
      setReturnStatusById((prev) => { const next = { ...prev }; targetIds.forEach((id) => delete next[id]); return next })
      message.success(`Đã xác nhận trả ${itemsToProcess.length} thiết bị`)
      await onReturned?.()
    } catch (err) {
      console.error('confirm return equipment error', err)
      message.error('Xác nhận trả thiết bị thất bại')
    } finally {
      setReturning(false)
    }
  }

  if (!open) return null

  const borrower = borrowing?.borrowedByMember
  const lender = borrowing?.lentByMember
  const isOverdue = borrowing?.status === 'Overdue' || borrowing?.status === '4'
  const isBorrowingReturned = borrowing?.status === 'Returned' || borrowing?.status === '3'
  const showReturnPanel = canManageReturn && borrowing && (
    borrowing.status === 'Borrowed' || borrowing.status === 'Overdue' ||
    borrowing.status === 'PartialReturned' || borrowing.status === '1' ||
    borrowing.status === '2' || borrowing.status === '4'
  )

  return (
    <>
      <div className="fixed inset-0 bg-black/35 z-40 h-full" onClick={onClose} aria-hidden />

      <div className={cn(
        'fixed top-0 right-0 h-full w-[720px] max-w-[96vw] z-50',
        'bg-white border-l border-slate-200 shadow-2xl',
        'translate-x-0 transition-transform duration-300 ease-out',
      )}>
        <div className="flex flex-col h-full overflow-hidden">

          {/* HEADER */}
          <header className="w-full shrink-0 border-b border-slate-200 bg-white">
            {!borrowing ? (
              <div className="px-5 py-5 pr-14">
                <Skeleton active title={{ width: '55%' }} paragraph={{ rows: 1 }} />
              </div>
            ) : (
              <>
                <div className="px-5 pt-5 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium uppercase tracking-widest text-slate-400">CHI TIẾT PHIẾU MƯỢN</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold text-[#1a7a99]">Phiếu mượn #{borrowing.borrowingId}</h2>
                        <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium', getBorrowingStatusColor(borrowing.status))}>
                          {getBorrowingStatusDisplay(borrowing.status)}
                        </span>
                      </div>
                    </div>
                    <button type="button" onClick={onClose} className="shrink-0 rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors" aria-label="Đóng">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Meta bar */}
                <div className="grid w-full grid-cols-3 divide-x divide-slate-200 border-t border-slate-200 bg-slate-50">
                  <div className="px-5 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-[#2197C0]">Ngày mượn</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-900">{formatDateTime(borrowing.createdAt)}</p>
                  </div>
                  <div className="px-5 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-[#2197C0]">Hạn trả</p>
                    <p className={cn('mt-0.5 text-sm font-semibold', isOverdue ? 'text-red-600' : 'text-slate-900')}>
                      {formatDateTime(borrowing.returnedDueDate)}
                    </p>
                  </div>
                  <div className="px-5 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-[#2197C0]">Số thiết bị</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-900">{details.length}</p>
                  </div>
                </div>
              </>
            )}
          </header>

          {/* BODY */}
          <div className="relative min-h-0 flex-1 overflow-y-auto bg-white px-5 py-4 space-y-4">
            {!borrowing ? (
              <div className="space-y-4">
                <Skeleton active paragraph={{ rows: 4 }} />
                <Skeleton active paragraph={{ rows: 4 }} />
              </div>
            ) : (
              <>
                {/* Thông tin chung */}
                <Section icon={Info} title="Thông tin chung">
                  <div className="pl-4 grid grid-cols-2 gap-x-6">
                    <MetaRow label="Người mượn" value={
                      borrower ? (
                        <div className="flex items-center gap-2 mt-0.5">
                          <img src={borrower.avatarUrl?.trim() || '/img/ava.png'} alt="" className="h-6 w-6 rounded-full object-cover shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-black truncate">{borrower.fullName}</p>
                            <p className="text-xs text-slate-500 truncate">{borrower.email}</p>
                          </div>
                        </div>
                      ) : '—'
                    } />
                    <MetaRow label="Người lập phiếu" value={
                      lender ? (
                        <div className="flex items-center gap-2 mt-0.5">
                          <img src={lender.avatarUrl?.trim() || '/img/ava.png'} alt="" className="h-6 w-6 rounded-full object-cover shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-black truncate">{lender.fullName}</p>
                            <p className="text-xs text-slate-500 truncate">{lender.email}</p>
                          </div>
                        </div>
                      ) : '—'
                    } />
                    <MetaRow label="Ngày mượn" value={formatDateTime(borrowing.createdAt)} />
                    <MetaRow label="Hạn trả" value={
                      <span className={cn('text-sm font-medium', isOverdue ? 'text-red-600' : 'text-black')}>
                        {formatDateTime(borrowing.returnedDueDate)}
                      </span>
                    } />
                    <MetaRow label="Mô tả" value={borrowing.description || '—'} />
                    <MetaRow label="Ghi chú" value={borrowing.note || '—'} />
                  </div>
                </Section>

                {/* Thiết bị trong phiếu */}
                <Section icon={Layers} title={`Thiết bị trong phiếu (${details.length})`}>
                  {details.length === 0 ? (
                    <p className="pl-4 py-2 text-sm text-slate-500">Không có thiết bị trong phiếu.</p>
                  ) : (
                    <div className="pl-4 divide-y divide-slate-200">
                      {details.map((item) => {
                        const statusMeta = getEquipmentBorrowingStatusInfo(localStatusById[item.equipmentBorrowingId] ?? item.status)
                        const imgLink = item.equipment?.imgLink ?? imgLinkByEquipmentId[Number(item.equipmentId)] ?? null
                        const isActionable = allActionableIds.includes(item.equipmentBorrowingId)
                        const isSelected = selectedIds.includes(item.equipmentBorrowingId)

                        return (
                          <div key={item.equipmentBorrowingId} className="py-3">
                            <div className="flex items-center gap-3">
                              {canManageReturn && !isBorrowingReturned && isActionable && (
                                <Checkbox
                                  checked={isSelected}
                                  disabled={returning}
                                  onChange={(e) => toggleOne(item.equipmentBorrowingId, e.target.checked)}
                                />
                              )}
                              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-50 flex items-center justify-center">
                                {imgLink ? (
                                  <Image src={imgLink} alt={item.equipment?.equipmentName ?? ''} width={40} height={40} style={{ width: 40, height: 40, objectFit: 'cover' }} preview={{ mask: 'Xem ảnh' }} />
                                ) : (
                                  <ImageOff className="h-5 w-5 text-slate-400" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-[#2197C0] truncate">{item.equipment?.equipmentName ?? `Thiết bị #${item.equipmentId}`}</p>
                                    <p className="text-xs text-slate-500">Mã: <span className="font-medium text-slate-700">{item.equipment?.equipmentCode ?? item.equipmentId}</span></p>
                                  </div>
                                  <Badge className={cn('shrink-0 text-xs border-0', statusMeta.className)}>{statusMeta.label}</Badge>
                                </div>
                                <div className="flex flex-wrap gap-x-4 text-xs text-slate-500 mt-0.5">
                                  <span>Danh mục: {item.equipment?.categoryName ?? (item.equipment?.categoryId ? `#${item.equipment.categoryId}` : '—')}</span>
                                  {(localReturnedAtById[item.equipmentBorrowingId] ?? item.checkinAt) && (
                                    <span>Ngày trả: {formatDateTime(localReturnedAtById[item.equipmentBorrowingId] ?? item.checkinAt)}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Return status picker */}
                            {canManageReturn && !isBorrowingReturned && isSelected && (
                              <div className="mt-2 ml-7 flex items-center gap-2 rounded-md bg-sky-50 px-3 py-2">
                                <span className="text-xs text-sky-700 font-medium shrink-0">Trạng thái trả:</span>
                                <div className="flex gap-1.5">
                                  {(['RETURNED', 'DAMAGED', 'LOST'] as const).map((s) => (
                                    <button
                                      key={s}
                                      type="button"
                                      disabled={returning}
                                      onClick={() => setReturnStatusById((prev) => ({ ...prev, [item.equipmentBorrowingId]: s }))}
                                      className={cn(
                                        'px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
                                        (returnStatusById[item.equipmentBorrowingId] ?? 'RETURNED') === s
                                          ? s === 'RETURNED' ? 'bg-emerald-600 text-white' : s === 'DAMAGED' ? 'bg-amber-600 text-white' : 'bg-red-600 text-white'
                                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200',
                                      )}
                                    >
                                      {s === 'RETURNED' ? 'Tốt' : s === 'DAMAGED' ? 'Hỏng' : 'Mất'}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </Section>

                {/* Xác nhận trả */}
                {showReturnPanel && (
                  <section className="space-y-2">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                      <h3 className="text-sm font-semibold text-black">Xác nhận trả thiết bị</h3>
                    </div>
                    <div className="pl-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <Checkbox checked={allSelected} disabled={!allActionableIds.length || returning} onChange={(e) => toggleSelectAll(e.target.checked)}>
                          <span className="text-sm text-slate-700">Chọn tất cả thiết bị chưa trả</span>
                        </Checkbox>
                        <span className="text-xs text-slate-500">Còn {allActionableIds.length} thiết bị chưa trả</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button type="button" className="bg-[#2197C0] hover:bg-[#208AAE] text-white" disabled={returning || !selectedIds.length} onClick={() => void handleConfirmReturn(false)}>
                          {returning ? 'Đang xử lý...' : 'Xác nhận trả đã chọn'}
                        </Button>
                        <Button type="button" variant="outline" disabled={returning || !allActionableIds.length} onClick={() => void handleConfirmReturn(true)}>
                          Trả đủ tất cả
                        </Button>
                      </div>
                      <p className="text-xs text-slate-500">Có thể chọn từng thiết bị để đánh dấu "Bị hỏng" hoặc "Mất" trước khi xác nhận trả.</p>
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
