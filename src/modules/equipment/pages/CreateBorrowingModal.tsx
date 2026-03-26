import { useEffect, useState } from 'react'
import { DatePicker, message } from 'antd'
import borrowingApi from '../api/borrowingApi'
import memberApi from '@/modules/member/api/memberApi'
import categoryApi from '@/modules/category/api/categoryApi'
import reservationApi from '@/modules/reservation/api/reservationApi'
import type { Member } from '@/modules/member/member'
import type { BorrowingCreatePayload } from '../borrowing'
import type { EquipmentListItem } from '../equipment'
import type { CategoryListItem } from '@/modules/category/category'
import dayjs, { type Dayjs } from 'dayjs'
import { Dialog } from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { cn } from '@/shared/lib/utils'
import { getEquipmentStatusDisplay } from '@/constants/equipment'

type Props = {
  open: boolean
  onClose: () => void
  onCreated?: () => void
}

export default function CreateBorrowingModal({
  open,
  onClose,
  onCreated,
}: Props) {
  const [borrowerSearch, setBorrowerSearch] = useState('')
  const [searchingBorrower, setSearchingBorrower] = useState(false)
  const [borrowerOptions, setBorrowerOptions] = useState<Member[]>([])
  const [borrowedByMemberId, setBorrowedByMemberId] = useState<number | null>(null)
  const [lentByMemberId, setLentByMemberId] = useState<number | null>(null)
  const [returnedDueDate, setReturnedDueDate] = useState<Dayjs | null>(null)
  const [description, setDescription] = useState('')
  const [note, setNote] = useState('')
  const [allEquipments, setAllEquipments] = useState<EquipmentListItem[]>([])
  const [equipmentSearch, setEquipmentSearch] = useState('')
  const [equipmentLoading, setEquipmentLoading] = useState(false)
  const [categories, setCategories] = useState<CategoryListItem[]>([])
  const [categoryLoading, setCategoryLoading] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null
  )
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSearchMembers = async (
    value: string,
    setLoadingFlag: (v: boolean) => void,
    setOptions: (v: Member[]) => void
  ) => {
    if (!value.trim()) return
    try {
      setLoadingFlag(true)
      const isNumber = !isNaN(Number(value))
      const res = await memberApi.getMembers({
        MemberId: isNumber ? Number(value) : undefined,
        FullName: !isNumber ? value : undefined,
      })
      setOptions(res.items ?? [])
    } catch {
      message.error('Tìm kiếm thất bại')
      setOptions([])
    } finally {
      setLoadingFlag(false)
    }
  }

  // Tự động lấy người lập phiếu từ tài khoản đang đăng nhập
  useEffect(() => {
    if (!open) return
    try {
      const raw = localStorage.getItem('user')
      if (!raw) return
      const parsed = JSON.parse(raw) as { memberId?: number }
      if (!parsed.memberId) return

      setLentByMemberId(parsed.memberId)

      ;(async () => {
        try {
          await memberApi.getMemberById(parsed.memberId!)
        } catch {
          // ignore
        }
      })()
    } catch {
      // ignore
    }
  }, [open])

  const selectedEquipments = allEquipments.filter((e) =>
    selectedEquipmentIds.includes(e.equipmentId)
  )

  // Load danh mục (chỉ gọi 1 lần khi mở modal)
  useEffect(() => {
    if (!open) return
    const fetchCategories = async () => {
      try {
        setCategoryLoading(true)
        const res = await categoryApi.getCategories({
          pageNumber: 1,
          pageSize: 100,
        })
        setCategories(res.items ?? [])
      } catch {
        // ignore
      } finally {
        setCategoryLoading(false)
      }
    }
    fetchCategories()
  }, [open])

  // Load thiết bị KHẢ DỤNG theo khung thời gian StartAt/EndAt.
  // Ở "phiếu mượn", FE không chọn trực tiếp giờ mượn/giờ trả, nên dùng:
  // - StartAt: thời điểm hiện tại
  // - EndAt: returnedDueDate (hạn trả)
  useEffect(() => {
    if (!open) return
    if (!returnedDueDate) {
      setAllEquipments([])
      setSelectedEquipmentIds([])
      return
    }

    const loadAvailability = async () => {
      try {
        setEquipmentLoading(true)

        const startAtDt = dayjs()
        const endAtDt = returnedDueDate

        // BE yêu cầu EndAt > StartAt.
        // Vì FE đang dùng StartAt = "thời điểm hiện tại", nên nếu người dùng chọn hạn trả <= hiện tại
        // thì phải không gọi API để tránh bị 400 và không hiển thị danh sách gợi ý.
        if (!endAtDt.isAfter(startAtDt)) {
          setAllEquipments([])
          setSelectedEquipmentIds([])
          return
        }

        const startAt = startAtDt.format('YYYY-MM-DDTHH:mm:ss')
        const endAt = endAtDt.format('YYYY-MM-DDTHH:mm:ss')

        const res = await reservationApi.getAvailability({
          startAt,
          endAt,
          categoryIds: selectedCategoryId != null ? [selectedCategoryId] : undefined,
          pageNumber: 1,
          pageSize: 500,
        })

        const items = res.items ?? []
        const availableIds = new Set(items.map((x) => x.equipmentId))

        setAllEquipments(items)
        // Giữ selection nếu vẫn còn khả dụng; còn lại thì xóa để tránh stale.
        setSelectedEquipmentIds((prev) => prev.filter((id) => availableIds.has(id)))
      } catch {
        setAllEquipments([])
        setSelectedEquipmentIds([])
      } finally {
        setEquipmentLoading(false)
      }
    }

    void loadAvailability()
  }, [open, returnedDueDate, selectedCategoryId])

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    if (!borrowedByMemberId) {
      setError('Vui lòng chọn người mượn')
      return
    }
    if (!lentByMemberId) {
      setError('Vui lòng chọn người lập phiếu')
      return
    }
    if (!returnedDueDate) {
      setError('Vui lòng chọn hạn trả')
      return
    }

    // BE validate ReturnedDueDate > now.
    // FE chặn trước để tránh submit bị 400.
    if (!returnedDueDate.isAfter(dayjs())) {
      setError('Hạn trả phải lớn hơn thời điểm mượn (hiện tại)')
      return
    }
    if (selectedEquipmentIds.length === 0) {
      setError('Vui lòng chọn ít nhất 1 thiết bị')
      return
    }

    const payload: BorrowingCreatePayload = {
      borrowedByMemberId,
      lentByMemberId,
      // Gửi đầy đủ ngày + giờ, không kèm timezone
      returnedDueDate: returnedDueDate.format('YYYY-MM-DDTHH:mm:ss'),
      description: description.trim() || undefined,
      note: note.trim() || undefined,
      equipmentIds: selectedEquipmentIds,
    }

    try {
      setLoading(true)
      await borrowingApi.create(payload)
      message.success('Tạo phiếu mượn thành công')
      handleClose()
      onCreated?.()
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : null
      message.error(msg || 'Tạo phiếu mượn thất bại')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setBorrowerSearch('')
    setBorrowerOptions([])
    setBorrowedByMemberId(null)
    setLentByMemberId(null)
    setReturnedDueDate(null)
    setDescription('')
    setNote('')
    setEquipmentSearch('')
    setSelectedEquipmentIds([])
    setError('')
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Tạo phiếu mượn thiết bị"
      description="Chọn người mượn, người lập phiếu và danh sách thiết bị"
      className="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-black font-medium">
            Người mượn <span className="text-red-500">*</span>
          </Label>
          <div className="flex gap-2">
            <Input
              placeholder="Nhập ID hoặc tên"
              value={borrowerSearch}
              onChange={(e) => setBorrowerSearch(e.target.value)}
              onKeyDown={(e) =>
                e.key === 'Enter' &&
                (e.preventDefault(),
                handleSearchMembers(
                  borrowerSearch,
                  setSearchingBorrower,
                  setBorrowerOptions
                ))
              }
              className="h-9 text-black border-gray-200"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                handleSearchMembers(
                  borrowerSearch,
                  setSearchingBorrower,
                  setBorrowerOptions
                )
              }
              disabled={searchingBorrower}
            >
              {searchingBorrower ? 'Đang tìm...' : 'Tìm'}
            </Button>
          </div>
          {borrowerOptions.length > 0 && (
            <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border bg-white no-scrollbar">
              {borrowerOptions.map((m) => (
                <button
                  key={m.memberId}
                  type="button"
                  onClick={() => {
                    setBorrowedByMemberId(m.memberId)
                    setBorrowerSearch(m.fullName || String(m.memberId))
                    setBorrowerOptions([])
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50',
                    borrowedByMemberId === m.memberId && 'bg-[#2197C0]/10'
                  )}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={m.avatarUrl ?? undefined} />
                    <AvatarFallback>
                      {m.fullName?.charAt(0) ?? '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-black">
                      {m.fullName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {m.email ?? '—'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-black font-medium">
            Hạn trả <span className="text-red-500">*</span>
          </Label>
          <DatePicker
            className="w-full h-9 text-black"
            placeholder="Chọn ngày và giờ hạn trả"
            format="DD/MM/YYYY HH:mm"
            showTime={{ format: 'HH:mm' }}
            value={returnedDueDate}
            onChange={(value) => setReturnedDueDate(value)}
            disabledDate={(current) => {
              if (!current) return false
              // Không cho chọn ngày trước hôm nay
              return current.startOf('day').isBefore(dayjs().startOf('day'))
            }}
            disabledTime={(current) => {
              if (!current) return {}
              const now = dayjs()
              if (!current.isSame(now, 'day')) return {}

              // Khi chọn hôm nay: chặn giờ/phút trước thời điểm hiện tại.
              const disabledHours = Array.from(
                { length: now.hour() },
                (_, i) => i
              )

              return {
                disabledHours: () => disabledHours,
                disabledMinutes: (selectedHour: number) => {
                  if (selectedHour !== now.hour()) return []
                  return Array.from(
                    { length: now.minute() },
                    (_, i) => i
                  )
                },
              }
            }}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-black font-medium">
            Thiết bị (nhập ID, phân cách bởi dấu phẩy hoặc khoảng trắng){' '}
            <span className="text-red-500">*</span>
          </Label>
          <div className="flex gap-2">
            <Select
              value={selectedCategoryId ? String(selectedCategoryId) : 'all'}
              onValueChange={(value) =>
                setSelectedCategoryId(value === 'all' ? null : Number(value))
              }
              disabled={categoryLoading}
            >
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue placeholder="Loại thiết bị" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả loại</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.categoryId} value={String(c.categoryId)}>
                    {c.categoryName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Tìm theo tên / mã / ID"
              value={equipmentSearch}
              onChange={(e) => setEquipmentSearch(e.target.value)}
              className="h-8 text-xs text-black border-gray-200"
            />
          </div>
          {returnedDueDate != null && (
            <div className="mt-2 space-y-2 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-3">
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-md bg-white p-1 no-scrollbar">
                {allEquipments
                  .filter((eq) => {
                    if (selectedCategoryId && eq.categoryId !== selectedCategoryId) {
                      return false
                    }
                    if (!equipmentSearch.trim()) return true
                    const q = equipmentSearch.trim().toLowerCase()
                    const byId =
                      !isNaN(Number(q)) && eq.equipmentId === Number(q)
                    return (
                      byId ||
                      eq.equipmentName.toLowerCase().includes(q) ||
                      eq.equipmentCode.toLowerCase().includes(q)
                    )
                  })
                  .slice(0, 30)
                  .map((eq) => (
                    <button
                      key={eq.equipmentId}
                      type="button"
                      onClick={() => {
                        const id = eq.equipmentId
                        const exists = selectedEquipmentIds.includes(id)
                        const next = exists
                          ? selectedEquipmentIds.filter((x) => x !== id)
                          : [...selectedEquipmentIds, id]
                        setSelectedEquipmentIds(next)
                      }}
                      className={cn(
                        'flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs hover:bg-gray-50',
                        selectedEquipmentIds.includes(eq.equipmentId) &&
                          'bg-[#2197C0]/5'
                      )}
                    >
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate font-medium text-black">
                          {eq.equipmentName}
                        </span>
                        <span className="text-[11px] text-gray-500">
                          #{eq.equipmentId} · {eq.equipmentCode}
                        </span>
                      </div>
                      <span className="ml-2 shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
                        {getEquipmentStatusDisplay(eq.status)}
                      </span>
                    </button>
                  ))}

                {equipmentLoading && (
                  <p className="px-2 py-1 text-xs text-gray-500">
                    Đang tải danh sách thiết bị...
                  </p>
                )}
                {!equipmentLoading &&
                  !equipmentSearch.trim() &&
                  allEquipments.length === 0 && (
                    <p className="px-2 py-1 text-xs text-gray-500">
                      Không có thiết bị khả dụng trong khung thời gian này.
                    </p>
                  )}
                {!equipmentLoading &&
                  equipmentSearch.trim() &&
                  allEquipments.filter((eq) => {
                    if (selectedCategoryId && eq.categoryId !== selectedCategoryId) {
                      return false
                    }
                    const q = equipmentSearch.trim().toLowerCase()
                    const byId =
                      !isNaN(Number(q)) && eq.equipmentId === Number(q)
                    return (
                      byId ||
                      eq.equipmentName.toLowerCase().includes(q) ||
                      eq.equipmentCode.toLowerCase().includes(q)
                    )
                  }).length === 0 && (
                    <p className="px-2 py-1 text-xs text-gray-500">
                      Không tìm thấy thiết bị phù hợp
                    </p>
                  )}
              </div>
              {selectedEquipments.length > 0 && (
                <div className="mt-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700">
                  <div className="mb-1 font-medium text-black">
                    Đang chọn: {selectedEquipments.length} thiết bị
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedEquipments.map((eq) => (
                      <span
                        key={eq.equipmentId}
                        className="inline-flex items-center rounded-full bg-[#2197C0]/5 px-2 py-0.5 text-[11px] text-[#2197C0]"
                      >
                        {eq.equipmentName}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-black font-medium">Mô tả</Label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả chi tiết mục đích/mượn (tùy chọn)"
            className="flex w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-400 resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-black font-medium">Ghi chú</Label>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chú nội bộ (tùy chọn)"
            className="h-9 text-black border-gray-200"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={handleClose}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-[#2197C0] hover:bg-[#208AAE] text-white"
            disabled={loading}
          >
            {loading ? 'Đang tạo...' : 'Tạo phiếu'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

