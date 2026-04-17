import { Copy, X } from 'lucide-react'
import type { EquipmentBorrowingHistoryItem, EquipmentListItem } from '../equipment'
import { Badge } from '@/shared/components/ui/badge'
import { cn } from '@/shared/lib/utils'
import {
  getEquipmentStatusColor,
  getEquipmentStatusDisplay,
} from '@/constants/equipment'
import { getEquipmentBorrowingStatusInfo } from '@/constants/status'
import { getBorrowingStatusColor, getBorrowingStatusDisplay } from '@/constants/borrowing'
import { Image, message } from 'antd'

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

function borrowingDisplayName(x: EquipmentBorrowingHistoryItem): string {
  const name =
    x.borrowedByMember?.fullName?.trim() ||
    (x.borrowedByMemberId ? `Member #${x.borrowedByMemberId}` : '') ||
    ''
  return name || '—'
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    message.success('Đã sao chép')
  } catch {
    message.error('Không thể sao chép')
  }
}

export default function EquipmentDetailSidebar({
  open,
  onClose,
  equipment,
  categoryName,
}: Props) {
  if (!equipment) return null

  const handoverUrl = equipment.handoverMinute
    ? normalizeUrl(equipment.handoverMinute)
    : ''

  const borrowingHistory =
    equipment.historyborrowing ?? equipment.historyBorrowing ?? equipment.historyBorrowings ?? null

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
          'fixed top-0 right-0 h-full w-[580px] z-50',
          'bg-white border-l shadow-2xl',
          'transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white">
            <div className="px-5 pt-5 pb-3 border-b">
              <div className="flex items-start justify-between gap-4">
                {/* Left: title + code (code always right under title) */}
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-semibold text-black truncate">
                    {equipment.equipmentName}
                  </h2>

                  <div className="mt-0.5 flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-medium">{equipment.equipmentCode}</span>
                    <button
                      type="button"
                      className="p-1 rounded hover:bg-gray-100 text-gray-500"
                      title="Sao chép mã"
                      onClick={() => copyToClipboard(equipment.equipmentCode)}
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>

                {/* Right: tags + close */}
                <div className="flex items-start gap-3 shrink-0">
                  <div className="flex flex-col items-end gap-2 pt-0.5">
                    <span
                      className={cn(
                        'px-3 py-1 rounded-full text-xs font-medium',
                        getEquipmentStatusColor(equipment.status)
                      )}
                    >
                      {getEquipmentStatusDisplay(equipment.status)}
                    </span>

                    <Badge variant="secondary">
                      {categoryName ?? `Danh mục #${equipment.categoryId}`}
                    </Badge>
                  </div>

                  <button
                    onClick={onClose}
                    className="rounded-lg p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    aria-label="Đóng"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-5 py-4 space-y-4 bg-[#f7f7f8]">
            <Card title="Thông tin nhanh">
              <div className="grid grid-cols-2 gap-3">
                <InfoRow label="Bên cung cấp" value={equipment.sponsoredBy || '—'} />
                <InfoRow label="Ngày tạo" value={formatDateTime(equipment.createdAt)} />
              </div>

              <div className="mt-3">
                <div className="text-xs text-gray-500 font-medium mb-1">
                  Biên bản bàn giao (link)
                </div>
                {handoverUrl ? (
                  <div className="flex items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2">
                    <a
                      href={handoverUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-blue-600 hover:underline break-all"
                    >
                      {equipment.handoverMinute}
                    </a>
                    <button
                      type="button"
                      className="p-1 rounded hover:bg-gray-100 text-gray-500"
                      title="Sao chép link"
                      onClick={() => copyToClipboard(handoverUrl)}
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl border bg-white px-3 py-2 text-sm text-gray-500">
                    —
                  </div>
                )}
              </div>
            </Card>

            <Card title="Mô tả">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {equipment.description || '—'}
              </p>
            </Card>

            <Card title="Hình ảnh">
              {equipment.imgLink ? (
                <div className="overflow-hidden rounded-2xl border bg-gray-50">
                  <Image
                    src={equipment.imgLink}
                    alt={equipment.equipmentName}
                    width="100%"
                    height={240}
                    className="object-cover"
                    preview={{ mask: 'Xem ảnh' }}
                  />
                </div>
              ) : (
                <div className="rounded-xl border bg-gray-50 px-3 py-3 text-sm text-gray-600">
                  Không có ảnh
                </div>
              )}
            </Card>

            <Card title="Đang mượn">
              {equipment.currentBorrowings && equipment.currentBorrowings.length > 0 ? (
                <ul className="space-y-1">
                  {equipment.currentBorrowings.map((b) => (
                    (() => {
                      const borrowingStatus = getEquipmentBorrowingStatusInfo(b.status);
                      return (
                    <li
                      key={b.equipmentBorrowingId}
                      className="rounded-xl border bg-white px-3 py-2 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          Borrowing #{b.equipmentBorrowingId}
                        </div>
                        <div className="text-xs text-gray-500">
                          Ngày mượn: {formatDateTime(b.checkoutAt)} · Checkin:{' '}
                          {formatDateTime(b.checkinAt)}
                        </div>
                      </div>
                      <Badge className={borrowingStatus.className}>{borrowingStatus.label}</Badge>
                    </li>
                      );
                    })()
                  ))}
                </ul>
              ) : (
                <EmptyState text="Không có lượt mượn hiện tại." />
              )}
            </Card>

            <Card title="Lịch sử mượn">
              {borrowingHistory && borrowingHistory.length > 0 ? (
                <ul className="space-y-1">
                  {borrowingHistory.map((h, idx) => {
                    const borrowingStatusLabel = getBorrowingStatusDisplay(h.status ?? '')
                    const borrowingStatusClass = getBorrowingStatusColor(h.status ?? '')

                    const detailForThisEquipment =
                      h.borrowingEquipmentDetail?.find((d) => Number(d.equipmentId) === Number(equipment.equipmentId)) ??
                      (h.borrowingEquipmentDetail?.length ? h.borrowingEquipmentDetail[0] : null)

                    const key =
                      (h.borrowingId != null && h.borrowingId > 0 ? `b-${h.borrowingId}-${idx}` : `i-${idx}`)

                    return (
                      <li
                        key={key}
                        className="rounded-xl border bg-white px-3 py-2 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {h.borrowingId ? `Borrowing #${h.borrowingId}` : `Lượt mượn #${idx + 1}`}
                          </div>
                          {h.description?.trim() ? (
                            <div className="text-xs text-gray-600 line-clamp-2">{h.description.trim()}</div>
                          ) : null}
                          {h.note?.trim() ? (
                            <div className="text-xs text-gray-500 line-clamp-2">Ghi chú: {h.note.trim()}</div>
                          ) : null}
                          <div className="text-xs text-gray-500">
                            Người mượn: {borrowingDisplayName(h)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Người cho mượn:{' '}
                            {h.lentByMember?.fullName?.trim() ||
                              (h.lentByMemberId ? `Member #${h.lentByMemberId}` : '') ||
                              '—'}
                          </div>
                          <div className="text-xs text-gray-500">
                            Hạn trả: {formatDateTime(h.returnedDueDate ?? null)} · Tạo lúc:{' '}
                            {formatDateTime(h.createdAt ?? null)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Checkout: {formatDateTime(detailForThisEquipment?.checkoutAt ?? null)} · Checkin:{' '}
                            {formatDateTime(detailForThisEquipment?.checkinAt ?? null)}
                            {detailForThisEquipment?.receivedByMember?.fullName?.trim() ? (
                              <>
                                {' '}
                                · Người nhận lại: {detailForThisEquipment.receivedByMember.fullName.trim()}
                              </>
                            ) : null}
                          </div>
                        </div>
                        <Badge className={cn(borrowingStatusClass, 'shrink-0')}>{borrowingStatusLabel}</Badge>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <EmptyState text="Chưa có lịch sử mượn." />
              )}
            </Card>

            <Card title="Lịch đặt sắp tới">
              {equipment.upcomingReservations &&
              equipment.upcomingReservations.length > 0 ? (
                <ul className="space-y-1">
                  {equipment.upcomingReservations.map((r) => (
                    <li
                      key={r.reservationId}
                      className="rounded-xl border bg-white px-3 py-2 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          Reservation #{r.reservationId}
                        </div>
                        <div className="text-xs text-gray-500">
                          {r.startAt ? formatDateTime(r.startAt) : '—'} →{' '}
                          {r.endAt ? formatDateTime(r.endAt) : '—'}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        Tạo bởi: {r.createdByMemberId ?? '—'}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState text="Không có lịch đặt sắp tới." />
              )}
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="px-4 py-2.5 border-b">
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-gray-500 font-medium">{label}</div>
      <div className="mt-1 text-sm text-gray-900 break-words">{value}</div>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border bg-gray-50 px-3 py-3 text-sm text-gray-600">
      {text}
    </div>
  )
}

