import { useState } from 'react'
import { X, ImageOff } from 'lucide-react'
import type { BorrowingListItem } from '../borrowing'
import { Badge } from '@/shared/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar'
import { getBorrowingStatusColor, getBorrowingStatusDisplay } from '@/constants/borrowing'
import { cn } from '@/shared/lib/utils'

type Props = {
  open: boolean
  onClose: () => void
  borrowing: BorrowingListItem | null
}

function formatDateTime(date?: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleString('vi-VN')
}

export default function BorrowingDetailSidebar({
  open,
  onClose,
  borrowing,
}: Props) {
  if (!borrowing) return null

  const borrower = borrowing.borrowedByMember
  const lender = borrowing.lentByMember
  const isOverdue =
    borrowing.status === 'Overdue' || borrowing.status === '4'
  const [imageOpen, setImageOpen] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageAlt, setImageAlt] = useState<string>('Hình ảnh thiết bị')

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
          'fixed top-0 right-0 h-full w-[560px] z-50',
          'bg-white border-l shadow-2xl',
          'transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex flex-col h-full overflow-y-auto">
          <div className="sticky top-0 z-10 bg-white border-b px-5 pt-5 pb-3 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-semibold text-black truncate">
                  Phiếu mượn #{borrowing.borrowingId}
                </h2>
                <span
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium',
                    getBorrowingStatusColor(borrowing.status)
                  )}
                >
                  {getBorrowingStatusDisplay(borrowing.status)}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Ngày mượn: {formatDateTime(borrowing.createdAt)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Đóng"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-5 py-4 space-y-4 bg-[#f7f7f8]">
            <Card title="Thông tin chung">
              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                <PersonCard
                  label="Người mượn"
                  memberName={borrower?.fullName}
                  subLine={borrower?.phone ?? (borrower && `ID #${borrower.memberId}`)}
                  avatarUrl={borrower?.avatarUrl ?? undefined}
                />
                <PersonCard
                  label="Người lập phiếu"
                  memberName={lender?.fullName}
                  subLine={lender?.phone ?? (lender && `ID #${lender.memberId}`)}
                  avatarUrl={lender?.avatarUrl ?? undefined}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoRow
                  label="Hạn trả"
                  value={
                    <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>
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
              {borrowing.borrowingEquipmentDetail &&
              borrowing.borrowingEquipmentDetail.length > 0 ? (
                <ul className="space-y-2">
                  {borrowing.borrowingEquipmentDetail.map((item) => (
                    <li
                      key={item.equipmentBorrowingId}
                      className="rounded-xl border bg-white px-3 py-2 flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-md overflow-hidden border bg-gray-50 flex-shrink-0 flex items-center justify-center">
                        {item.equipment?.imgLink ? (
                          <button
                            type="button"
                            className="w-full h-full"
                            onClick={() => {
                              setImageUrl(item.equipment?.imgLink ?? null)
                              setImageAlt(item.equipment?.equipmentName ?? 'Hình ảnh thiết bị')
                              setImageOpen(true)
                            }}
                            title="Xem ảnh thiết bị"
                          >
                            <img
                              src={item.equipment.imgLink}
                              alt={item.equipment.equipmentName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                              }}
                            />
                          </button>
                        ) : (
                          <ImageOff className="w-5 h-5 text-gray-400" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="font-medium text-sm text-gray-900 truncate">
                              {item.equipment?.equipmentName ?? 'Thiết bị #' + item.equipmentId}
                            </div>
                            <div className="text-xs text-gray-500">
                              Mã: {item.equipment?.equipmentCode ?? item.equipmentId}
                            </div>
                          </div>
                          <Badge className="bg-gray-100 text-gray-700 text-[11px] flex-shrink-0">
                            {item.status}
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
                          <span className="whitespace-nowrap">
                            Ngày trả: {formatDateTime(item.checkinAt)}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState text="Không có thiết bị trong phiếu." />
              )}
            </Card>
          </div>
        </div>
      </div>
      {imageOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60"
          onClick={() => setImageOpen(false)}
        >
          <div
            className="max-w-3xl max-h-[80vh] bg-white rounded-2xl overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={imageAlt}
                className="w-full h-full object-contain bg-black"
              />
            ) : null}
          </div>
        </div>
      )}
    </>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="px-4 py-2.5 border-b">
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-gray-500 font-medium">{label}</div>
      <div className="mt-0.5 text-sm text-gray-900 break-words">{value}</div>
    </div>
  )
}

function PersonCard({
  label,
  memberName,
  subLine,
  avatarUrl,
}: {
  label: string
  memberName?: string | null
  subLine?: string | null
  avatarUrl?: string
}) {
  if (!memberName && !subLine) {
    return (
      <div>
        <div className="text-xs text-gray-500 font-medium mb-1">{label}</div>
        <div className="text-sm text-gray-400">—</div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-white px-3 py-2.5 flex flex-col gap-1.5">
      <div className="text-xs text-gray-500 font-medium">{label}</div>
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>
            {memberName?.charAt(0) ?? '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col flex-1 min-w-0 gap-0.5">
          <div className="text-sm font-medium text-gray-900 truncate">
            {memberName}
          </div>
          {subLine && (
            <div className="text-xs text-gray-500 truncate">{subLine}</div>
          )}
        </div>
      </div>
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

