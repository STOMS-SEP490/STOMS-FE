import { useEffect, useState } from 'react'
import { Image, message } from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { Check, ImageOff } from 'lucide-react'
import { Dialog } from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { cn } from '@/shared/lib/utils'
import { getEquipmentStatusDisplay, getEquipmentStatusColor } from '@/constants/status'
import { getErrorMessage } from '@/shared/lib/errorMessage'
import reservationApi from '@/modules/reservation/api/reservationApi'
import categoryApi from '@/modules/category/api/categoryApi'
import borrowingApi from '../api/borrowingApi'
import {
  normalizeEquipmentPagedResponse,
} from '@/modules/reservation/utils/normalizeReservationResponse'
import type { EquipmentResponse } from '@/modules/reservation/reservation.types'
import type { BorrowingListItem, BorrowingEquipmentDetail } from '../borrowing'
import type { CategoryListItem } from '@/modules/category/category'

type Props = {
  open: boolean
  onClose: () => void
  borrowing: BorrowingListItem
  onUpdated?: () => void
}

export default function EditBorrowingEquipmentsModal({ open, onClose, borrowing, onUpdated }: Props) {
  // Thiết bị hiện có trong phiếu (chưa trả)
  const currentEquipmentIds = new Set(
    (borrowing.borrowingEquipmentDetail ?? [])
      .filter((d) => {
        const s = String(d.status ?? '').toLowerCase()
        return !s.includes('returned') && s !== '2' && !s.includes('damaged') && s !== '3' && !s.includes('lost') && s !== '4'
      })
      .map((d) => d.equipmentId)
  )

  const [returnedDueDate] = useState<Dayjs | null>(
    borrowing.returnedDueDate ? dayjs(borrowing.returnedDueDate) : null
  )

  const [allEquipments, setAllEquipments] = useState<EquipmentResponse[]>([])
  const [equipmentLoading, setEquipmentLoading] = useState(false)
  const [equipmentSearch, setEquipmentSearch] = useState('')
  const [categories, setCategories] = useState<CategoryListItem[]>([])
  const [categoryLoading, setCategoryLoading] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)

  // IDs thiết bị muốn thêm (không tính cái đã có)
  const [selectedNewIds, setSelectedNewIds] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Load danh mục
  useEffect(() => {
    if (!open) return
    categoryApi.getCategories({ pageNumber: 1, pageSize: 100 })
      .then((res) => setCategories(res.items ?? []))
      .catch(() => {})
      .finally(() => setCategoryLoading(false))
  }, [open])

  // Load thiết bị khả dụng
  useEffect(() => {
    if (!open || !returnedDueDate) return
    let cancelled = false
    const run = async () => {
      try {
        setEquipmentLoading(true)
        const startAt = dayjs().format('YYYY-MM-DDTHH:mm:ss')
        const endAt = returnedDueDate.format('YYYY-MM-DDTHH:mm:ss')
        const res = normalizeEquipmentPagedResponse(
          await reservationApi.getAvailability({
            StartAt: startAt,
            EndAt: endAt,
            Statuses: [1],
            PageNumber: 1,
            PageSize: 500,
          })
        )
        if (!cancelled) setAllEquipments(res.Items ?? [])
      } catch {
        if (!cancelled) setAllEquipments([])
      } finally {
        if (!cancelled) setEquipmentLoading(false)
      }
    }
    void run()
    return () => { cancelled = true }
  }, [open, returnedDueDate])

  // Reset khi đóng
  useEffect(() => {
    if (!open) {
      setSelectedNewIds([])
      setEquipmentSearch('')
      setSelectedCategoryId(null)
      setError('')
    }
  }, [open])

  const filteredEquipments = allEquipments.filter((eq) => {
    // Bỏ thiết bị đã có trong phiếu
    if (currentEquipmentIds.has(eq.EquipmentId)) return false
    if (selectedCategoryId && eq.CategoryId !== selectedCategoryId) return false
    if (!equipmentSearch.trim()) return true
    const q = equipmentSearch.trim().toLowerCase()
    return (
      (eq.EquipmentName ?? '').toLowerCase().includes(q) ||
      (eq.EquipmentCode ?? '').toLowerCase().includes(q)
    )
  })

  const handleSave = async () => {
    if (selectedNewIds.length === 0) {
      setError('Vui lòng chọn ít nhất 1 thiết bị để thêm')
      return
    }
    setError('')
    try {
      setSaving(true)
      await borrowingApi.addEquipments(borrowing.borrowingId, selectedNewIds)
      message.success(`Đã thêm ${selectedNewIds.length} thiết bị vào phiếu mượn`)
      
      // Fetch lại data chi tiết phiếu mượn
      await onUpdated?.()
      
      onClose()
    } catch (err: unknown) {
      const axiosData = (err as { response?: { data?: unknown } })?.response?.data
      message.error(getErrorMessage(axiosData ?? err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Sửa thiết bị trong phiếu mượn"
      description={`Phiếu mượn #${borrowing.borrowingId} — chọn thiết bị khả dụng để thêm vào phiếu.`}
      className="max-w-2xl w-[min(96vw,42rem)] max-h-[90vh]"
    >
      <div className="space-y-4">
        {/* Thiết bị hiện có */}
        {(borrowing.borrowingEquipmentDetail ?? []).length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-black font-medium">Thiết bị hiện có trong phiếu</Label>
            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto rounded-md bg-white px-1 py-2 border border-gray-200">
              {(borrowing.borrowingEquipmentDetail ?? []).map((d: BorrowingEquipmentDetail) => {
                const name = (d.equipment?.equipmentName ?? '').trim()
                const code = (d.equipment?.equipmentCode ?? '').trim()
                const displayName = name && code ? `${name} - ${code}` : name || code || `Thiết bị #${d.equipmentId}`
                const cat = (d.equipment?.categoryName ?? '').trim()
                const s = String(d.status ?? '').toLowerCase()
                const isReturned = s.includes('returned') || s === '2' || s.includes('damaged') || s === '3' || s.includes('lost') || s === '4'

                return (
                  <div
                    key={d.equipmentBorrowingId}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm transition-colors',
                      isReturned ? 'opacity-50' : 'bg-sky-50/40',
                    )}
                  >
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center bg-slate-100">
                      {d.equipment?.imgLink ? (
                        <Image
                          src={d.equipment.imgLink}
                          alt={name}
                          width={40}
                          height={40}
                          className="h-10 w-10 object-cover"
                          preview={{ mask: false }}
                        />
                      ) : (
                        <ImageOff className="w-5 h-5 text-gray-300" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-900 truncate">{displayName}</div>
                      <div className="text-[11px] text-gray-500 truncate">Danh mục: {cat || '---'}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Thiết bị khả dụng để thêm */}
        <div className="space-y-1.5">
          <Label className="text-black font-medium">
            Thêm thiết bị khả dụng
          </Label>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                placeholder="Tìm theo tên / mã"
                value={equipmentSearch}
                onChange={(e) => setEquipmentSearch(e.target.value)}
                className="h-9 text-xs text-black border-gray-200 bg-white rounded-xl"
              />
            </div>
            <Select
              value={selectedCategoryId ? String(selectedCategoryId) : 'all'}
              onValueChange={(v) => setSelectedCategoryId(v === 'all' ? null : Number(v))}
              disabled={categoryLoading}
            >
              <SelectTrigger className="h-9 w-[160px] text-xs font-medium bg-white text-slate-700 rounded-xl border border-slate-200/90">
                <SelectValue placeholder="Danh mục" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả danh mục</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.categoryId} value={String(c.categoryId)}>
                    {c.categoryName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {equipmentLoading ? (
            <div className="py-8 text-center text-xs text-slate-500 rounded-xl bg-white/60">
              Đang tải thiết bị...
            </div>
          ) : (
            <div className="flex flex-col gap-1 max-h-64 overflow-y-auto rounded-md bg-white px-1 py-2 border border-gray-200">
              {filteredEquipments.length === 0 ? (
                <p className="text-xs text-gray-500 py-4 text-center">
                  {allEquipments.length === 0
                    ? 'Không có thiết bị khả dụng trong khung thời gian này.'
                    : 'Không có thiết bị nào phù hợp.'}
                </p>
              ) : (
                filteredEquipments.slice(0, 30).map((eq) => {
                  const isSelected = selectedNewIds.includes(eq.EquipmentId)
                  const name = (eq.EquipmentName ?? '').trim()
                  const code = (eq.EquipmentCode ?? '').trim()
                  const displayName = name && code ? `${name} - ${code}` : name || code || `Thiết bị #${eq.EquipmentId}`
                  const cat = (eq.CategoryName ?? '').trim()
                  const statusLabel = getEquipmentStatusDisplay(eq.Status ?? '')

                  const toggle = () => {
                    setSelectedNewIds((prev) =>
                      prev.includes(eq.EquipmentId)
                        ? prev.filter((x) => x !== eq.EquipmentId)
                        : [...prev, eq.EquipmentId]
                    )
                  }

                  return (
                    <div
                      key={eq.EquipmentId}
                      className={`flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm transition-colors ${isSelected ? 'bg-sky-50/95' : 'hover:bg-slate-100/60'}`}
                    >
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center bg-slate-100">
                        {eq.ImgLink ? (
                          <Image
                            src={eq.ImgLink}
                            alt={name}
                            width={40}
                            height={40}
                            className="h-10 w-10 object-cover"
                            preview={{ mask: false }}
                          />
                        ) : (
                          <ImageOff className="w-5 h-5 text-gray-300" />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={toggle}
                        className="flex-1 flex items-center justify-between gap-2 text-left"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 truncate">{displayName}</div>
                          <div className="text-[11px] text-gray-500 truncate">Danh mục: {cat || '---'}</div>
                          <div className="mt-0.5">
                            <span className="text-[11px] text-gray-500 mr-1">Trạng thái:</span>
                            <span className={cn(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border',
                              getEquipmentStatusColor(eq.Status ?? ''),
                            )}>
                              {statusLabel}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${isSelected ? 'bg-sky-600 text-white' : 'bg-slate-200/80'}`}
                          aria-hidden
                        >
                          {isSelected ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                        </span>
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {selectedNewIds.length > 0 && (
            <p className="text-[11px] text-sky-700/90 font-medium">
              Đã chọn thêm {selectedNewIds.length} thiết bị
            </p>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Hủy
          </Button>
          <Button
            type="button"
            className="flex-1 bg-[#2197C0] hover:bg-[#208AAE] text-white"
            disabled={saving || selectedNewIds.length === 0}
            onClick={() => void handleSave()}
          >
            {saving ? 'Đang lưu...' : `Thêm ${selectedNewIds.length > 0 ? selectedNewIds.length + ' ' : ''}thiết bị`}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
