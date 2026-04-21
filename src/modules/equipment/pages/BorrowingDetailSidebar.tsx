import { useMemo, useState } from 'react'
import { X, ImageOff } from 'lucide-react'
import type { BorrowingListItem } from '../borrowing'
import { Badge } from '@/shared/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar'
import { getBorrowingStatusColor, getBorrowingStatusDisplay } from '@/constants/borrowing'
import { getEquipmentBorrowingStatusInfo } from '@/constants/status'
import { cn } from '@/shared/lib/utils'
import { Checkbox, Image, message } from 'antd'
import { Button } from '@/shared/components/ui/button'
import borrowingApi from '../api/borrowingApi'

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

export default function BorrowingDetailSidebar({
  open,
  onClose,
  borrowing,
  onReturned,
  canManageReturn = true,
}: Props) {
  if (!borrowing) return null

  const borrower = borrowing.borrowedByMember
  const lender = borrowing.lentByMember
  const isOverdue =
    borrowing.status === 'Overdue' || borrowing.status === '4'
  const isBorrowingReturned = borrowing.status === 'Returned' || borrowing.status === '3'
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [returnStatusById, setReturnStatusById] = useState<Record<number, 'RETURNED' | 'DAMAGED' | 'LOST'>>({})
  const [returning, setReturning] = useState(false)
  const [localReturnedAtById, setLocalReturnedAtById] = useState<Record<number, string>>({})
  const [localStatusById, setLocalStatusById] = useState<Record<number, string>>({})

  const details = borrowing.borrowingEquipmentDetail ?? []
  const actionableItems = useMemo(
    () =>
      details.filter((item) => {
        const raw = String(localStatusById[item.equipmentBorrowingId] ?? item.status ?? '').toLowerCase()
        return (
          !raw.includes('returned') &&
          raw !== '2' &&
          !raw.includes('damaged') &&
          raw !== '3' &&
          !raw.includes('lost') &&
          raw !== '4' &&
          !raw.includes('mất')
        )
      }),
    [details, localStatusById]
  )

  const allActionableIds = actionableItems.map((item) => item.equipmentBorrowingId)
  const allSelected = allActionableIds.length > 0 && allActionableIds.every((id) => selectedIds.includes(id))

  const toggleSelectAll = (checked: boolean) => {
    if (!checked) {
      setSelectedIds([])
      return
    }
    setSelectedIds(allActionableIds)
    setReturnStatusById((prev) => {
      const next = { ...prev }
      allActionableIds.forEach((id) => {
        if (!next[id]) next[id] = 'RETURNED'
      })
      return next
    })
  }

  const toggleOne = (equipmentBorrowingId: number, checked: boolean) => {
    setSelectedIds((prev) =>
      checked
        ? prev.includes(equipmentBorrowingId)
          ? prev
          : [...prev, equipmentBorrowingId]
        : prev.filter((id) => id !== equipmentBorrowingId)
    )
    if (checked) {
      setReturnStatusById((prev) => ({ ...prev, [equipmentBorrowingId]: prev[equipmentBorrowingId] ?? 'RETURNED' }))
    }
  }

  const handleConfirmReturn = async (returnAllAsReturned: boolean) => {
    const targetIds = returnAllAsReturned ? allActionableIds : selectedIds
    if (!targetIds.length) {
      message.warning('Vui lòng chọn ít nhất 1 thiết bị để xác nhận trả')
      return
    }

    const itemsToProcess = details.filter((item) => targetIds.includes(item.equipmentBorrowingId))
    if (!itemsToProcess.length) return

    try {
      setReturning(true)
      const nowIso = new Date().toISOString()

      const payload = {
        items: itemsToProcess.map((item) => {
          const returnStatus = returnAllAsReturned
            ? 'RETURNED'
            : (returnStatusById[item.equipmentBorrowingId] ?? 'RETURNED')

          // Backend expects EquipmentBorrowingStatus: Returned / Damaged / Lost
          const status =
            returnStatus === 'DAMAGED'
              ? ('Damaged' as const)
              : returnStatus === 'LOST'
                ? ('Lost' as const)
                : ('Returned' as const)

          return {
            equipmentBorrowingId: item.equipmentBorrowingId,
            status,
          }
        }),
      }

      await borrowingApi.updateHandover(borrowing.borrowingId, payload)

      const nextStatusById: Record<number, string> = {}
      const nextReturnedAtById: Record<number, string> = {}
      itemsToProcess.forEach((item) => {
        const returnStatus = returnAllAsReturned
          ? 'RETURNED'
          : (returnStatusById[item.equipmentBorrowingId] ?? 'RETURNED')
        nextStatusById[item.equipmentBorrowingId] =
          returnStatus === 'DAMAGED'
            ? 'Damaged'
            : returnStatus === 'LOST'
              ? 'Lost'
              : 'Returned'
        nextReturnedAtById[item.equipmentBorrowingId] = nowIso
      })
      setLocalStatusById((prev) => ({ ...prev, ...nextStatusById }))
      setLocalReturnedAtById((prev) => ({ ...prev, ...nextReturnedAtById }))

      setSelectedIds([])
      setReturnStatusById((prev) => {
        const next = { ...prev }
        targetIds.forEach((id) => delete next[id])
        return next
      })

      message.success(
        returnAllAsReturned
          ? `Đã xác nhận trả đủ ${itemsToProcess.length} thiết bị`
          : `Đã xác nhận trả ${itemsToProcess.length} thiết bị`
      )
      await onReturned?.()
    } catch (err) {
      console.error('confirm return equipment error', err)
      message.error('Xác nhận trả thiết bị thất bại')
    } finally {
      setReturning(false)
    }
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/35 z-40 h-full"
          onClick={onClose}
          aria-hidden
        />
      )}
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-[720px] z-50',
          'bg-white border-l shadow-2xl',
          'transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex flex-col h-full overflow-y-auto">
          <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 pt-6 pb-4 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-semibold text-slate-900 truncate">
                  Phiếu mượn #{borrowing.borrowingId}
                </h2>
                <span
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium border-0',
                    getBorrowingStatusColor(borrowing.status)
                  )}
                >
                  {getBorrowingStatusDisplay(borrowing.status)}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
              aria-label="Đóng"
            >
              <X size={20} />
            </button>
          </div>

          <div className="px-6 py-5 space-y-5 bg-[#fafafa]">
            <Card title="Thông tin chung">
              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                <PersonCard
                  label="Người mượn"
                  memberName={borrower?.fullName}
                  primaryLine={
                    borrower?.email?.trim() ||
                    (borrower ? `ID #${borrower.memberId}` : null)
                  }
                  subLine={null}
                  avatarUrl={borrower?.avatarUrl ?? undefined}
                />
                <PersonCard
                  label="Người lập phiếu"
                  memberName={lender?.fullName}
                  primaryLine={lender?.email ?? null}
                  subLine={lender?.phone ?? (lender && `ID #${lender.memberId}`)}
                  avatarUrl={lender?.avatarUrl ?? undefined}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoRow
                  label="Ngày mượn"
                  value={formatDateTime(borrowing.createdAt)}
                />
                <InfoRow
                  label="Hạn trả"
                  value={
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full font-semibold border-0',
                        isOverdue
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      )}
                    >
                      {formatDateTime(borrowing.returnedDueDate)}
                    </span>
                  }
                />
              </div>
              <div className="mt-3 space-y-3 text-sm">
                <InfoRow label="Mô tả" value={borrowing.description || '—'} />
                <InfoRow label="Ghi chú" value={borrowing.note || '—'} />
              </div>
            </Card>

            <Card title="Thiết bị trong phiếu">
              {details.length > 0 ? (
                <ul className="space-y-2">
                  {details.map((item) => {
                    const statusMeta = getEquipmentBorrowingStatusInfo(
                      localStatusById[item.equipmentBorrowingId] ?? item.status
                    )
                    return (
                      <li
                        key={item.equipmentBorrowingId}
                        className="bg-gray-50 px-4 py-3 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex items-center gap-3">
                          {canManageReturn && !isBorrowingReturned && !statusMeta.isReturned ? (
                          <Checkbox
                            checked={selectedIds.includes(item.equipmentBorrowingId)}
                            disabled={!allActionableIds.includes(item.equipmentBorrowingId) || returning}
                            onChange={(e) => toggleOne(item.equipmentBorrowingId, e.target.checked)}
                            className="mt-1"
                          />
                        ) : null}
                        <div className="w-10 h-10 rounded-md overflow-hidden bg-gray-50 flex-shrink-0 flex items-center justify-center">
                          {item.equipment?.imgLink ? (
                            <Image
                              src={item.equipment.imgLink}
                              alt={item.equipment.equipmentName}
                              width={40}
                              height={40}
                              className="object-contain"
                              preview={{ mask: 'Xem ảnh' }}
                            />
                          ) : (
                            <ImageOff className="w-5 h-5 text-gray-400" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="font-semibold text-sm text-[#2197C0] truncate">
                              {item.equipment?.equipmentName ?? 'Thiết bị #' + item.equipmentId}
                            </div>
                            <div className="text-xs text-gray-500">
                              Mã: <span className="font-semibold text-[#2197C0]">{item.equipment?.equipmentCode ?? item.equipmentId}</span>
                            </div>
                          </div>
                              <Badge className={cn('text-[11px] flex-shrink-0 rounded-full', statusMeta.className)}>
                            {statusMeta.label}
                          </Badge>
                        </div>

                        <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-gray-500">
                          <span className="truncate">
                            Danh mục:{' '}
                            {item.equipment?.categoryName ??
                              (item.equipment?.categoryId
                                ? `#${item.equipment.categoryId}`
                                : '—')}
                          </span>
                          {(localReturnedAtById[item.equipmentBorrowingId] ?? item.checkinAt) ? (
                            <span className="whitespace-nowrap">
                              Ngày trả: {formatDateTime(localReturnedAtById[item.equipmentBorrowingId] ?? item.checkinAt)}
                            </span>
                          ) : null}
                        </div>
                        </div>
                      </div>
                        {canManageReturn && !isBorrowingReturned && selectedIds.includes(item.equipmentBorrowingId) && (
                        <div className="mt-2 flex w-full items-center justify-between gap-2 bg-sky-50 px-3 py-2 border-t border-sky-100">
                          <span className="text-[11px] text-sky-700 font-medium">Trạng thái trả:</span>
                          <div className="inline-flex gap-1.5">
                            <button
                              type="button"
                              disabled={returning}
                              onClick={() =>
                                setReturnStatusById((prev) => ({
                                  ...prev,
                                  [item.equipmentBorrowingId]: 'RETURNED',
                                }))
                              }
                              className={cn(
                                'px-3 py-1 text-[11px] font-medium transition-colors rounded-md',
                                (returnStatusById[item.equipmentBorrowingId] ?? 'RETURNED') === 'RETURNED'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                              )}
                            >
                              Tốt
                            </button>
                            <button
                              type="button"
                              disabled={returning}
                              onClick={() =>
                                setReturnStatusById((prev) => ({
                                  ...prev,
                                  [item.equipmentBorrowingId]: 'DAMAGED',
                                }))
                              }
                              className={cn(
                                'px-3 py-1 text-[11px] font-medium transition-colors rounded-md',
                                (returnStatusById[item.equipmentBorrowingId] ?? 'RETURNED') === 'DAMAGED'
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                              )}
                            >
                              Hỏng
                            </button>
                            <button
                              type="button"
                              disabled={returning}
                              onClick={() =>
                                setReturnStatusById((prev) => ({
                                  ...prev,
                                  [item.equipmentBorrowingId]: 'LOST',
                                }))
                              }
                              className={cn(
                                'px-3 py-1 text-[11px] font-medium transition-colors rounded-md',
                                (returnStatusById[item.equipmentBorrowingId] ?? 'RETURNED') === 'LOST'
                                  ? 'bg-red-600 text-white'
                                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                              )}
                            >
                              Mất
                            </button>
                          </div>
                        </div>
                      )}
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <EmptyState text="Không có thiết bị trong phiếu." />
              )}
            </Card>
            {canManageReturn && (borrowing.status === 'Borrowed' ||
              borrowing.status === 'Overdue' ||
              borrowing.status === 'PartialReturned' ||
              borrowing.status === '1' ||
              borrowing.status === '2' ||
              borrowing.status === '4') && (
              <Card title="Xác nhận trả thiết bị">
                <div className="space-y-3 border-t border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <Checkbox
                      checked={allSelected}
                      disabled={!allActionableIds.length || returning}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                    >
                      Chọn tất cả thiết bị chưa trả
                    </Checkbox>
                    <div className="text-xs text-gray-500">
                      Còn {allActionableIds.length} thiết bị chưa trả
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      className="bg-[#2197C0] hover:bg-[#208AAE] text-white min-w-[170px]"
                      disabled={returning || !selectedIds.length}
                      onClick={() => void handleConfirmReturn(false)}
                    >
                      {returning ? 'Đang xử lý...' : 'Xác nhận trả đã chọn'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-w-[130px]"
                      disabled={returning || !allActionableIds.length}
                      onClick={() => void handleConfirmReturn(true)}
                    >
                      Trả đủ tất cả
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Có thể chọn từng thiết bị để đánh dấu "Bị hỏng" hoặc "Mất" trước khi xác nhận trả.
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border-t border-b border-gray-200">
      <div className="px-5 py-3 border-b border-gray-100 bg-sky-50/30">
        <h3 className="font-semibold text-[#2197C0] text-sm">{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-[#2197C0] font-medium uppercase tracking-wide">{label}</div>
      <div className="mt-0.5 text-sm text-slate-900 font-medium break-words">{value}</div>
    </div>
  )
}

function PersonCard({
  label,
  memberName,
  primaryLine,
  subLine,
  avatarUrl,
}: {
  label: string
  memberName?: string | null
  primaryLine?: string | null
  subLine?: string | null
  avatarUrl?: string
}) {
  if (!memberName && !primaryLine && !subLine) {
    return (
      <div>
        <div className="text-xs text-[#2197C0] font-medium mb-1">{label}</div>
        <div className="text-sm text-gray-400">—</div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 px-3 py-3 flex flex-col gap-1.5 border-t border-b border-gray-100">
      <div className="text-xs text-gray-500 font-medium">{label}</div>
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8 flex-shrink-0 rounded-md">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>
            {memberName?.charAt(0) ?? '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col flex-1 min-w-0 gap-0.5">
          <div className="text-sm font-semibold text-[#2197C0] truncate">
            {memberName}
          </div>
          <div className="text-xs text-gray-500 truncate">{primaryLine || '—'}</div>
        </div>
      </div>
      {subLine && <div className="text-xs text-gray-500 truncate">Số điện thoại: {subLine}</div>}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="bg-gray-50 px-4 py-3 text-sm text-gray-600 border-t border-b border-gray-100">
      {text}
    </div>
  )
}

