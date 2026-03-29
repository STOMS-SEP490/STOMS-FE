import { useEffect, useState } from 'react'
import { DatePicker, Image, message } from 'antd'
import borrowingApi from '../api/borrowingApi'
import memberApi from '@/modules/member/api/memberApi'
import categoryApi from '@/modules/category/api/categoryApi'
import reservationApi from '@/modules/reservation/api/reservationApi'
import type { Member } from '@/modules/member/member'
import type { BorrowingCreatePayload } from '../borrowing'
import type {
  EquipmentItemResponse,
  EquipmentReservationItemResponse,
  EquipmentResponse,
  ReservationDetail,
} from '@/modules/reservation/reservation.types'
import {
  normalizeEquipmentPagedResponse,
  normalizeReservationResponse,
} from '@/modules/reservation/utils/normalizeReservationResponse'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { cn } from '@/shared/lib/utils'
import { CalendarDays, ImageOff, Zap } from 'lucide-react'

function equipmentItemToEquipmentResponse(item: EquipmentItemResponse): EquipmentResponse {
  return {
    EquipmentId: item.EquipmentId,
    CategoryId: item.CategoryId,
    CategoryName: item.CategoryName ?? null,
    SponsoredBy: null,
    EquipmentName: item.EquipmentName ?? null,
    EquipmentCode: item.EquipmentCode ?? null,
    HandoverMinute: null,
    Status: item.Status ?? null,
    Description: null,
    ImgLink: item.ImgLink ?? null,
    CreatedAt: null,
  }
}

/** Dòng thiết bị trong đặt trước — dùng khi API availability không trả (vd. Damaged) nhưng vẫn phải hiển thị/chọn theo phiếu đặt. */
function equipmentReservationToRow(er: EquipmentReservationItemResponse): EquipmentResponse {
  if (er.Equipment) {
    return equipmentItemToEquipmentResponse(er.Equipment)
  }
  return {
    EquipmentId: er.EquipmentId,
    CategoryId: 0,
    CategoryName: null,
    SponsoredBy: null,
    EquipmentName: `Thiết bị #${er.EquipmentId}`,
    EquipmentCode: null,
    HandoverMinute: null,
    Status: null,
    Description: null,
    ImgLink: null,
    CreatedAt: null,
  }
}

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
  const [allEquipments, setAllEquipments] = useState<EquipmentResponse[]>([])
  const [equipmentSearch, setEquipmentSearch] = useState('')
  const [equipmentLoading, setEquipmentLoading] = useState(false)
  const [categories, setCategories] = useState<CategoryListItem[]>([])
  const [categoryLoading, setCategoryLoading] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null
  )
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<number[]>([])
  const [sessionIds, setSessionIds] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [modeTab, setModeTab] = useState<'immediate' | 'reservation'>('immediate')
  const [reservationIdInput, setReservationIdInput] = useState('')
  const [loadingReservation, setLoadingReservation] = useState(false)
  const [loadedReservation, setLoadedReservation] = useState<ReservationDetail | null>(null)
  /** Tab "Theo đặt trước": khung StartAt khi gọi availability (mặc định từ đặt trước hoặc hiện tại). */
  const [reservationBorrowStartAt, setReservationBorrowStartAt] = useState<Dayjs | null>(null)

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

  const applyReservationDetail = (detail: ReservationDetail) => {
    const memberId =
      detail.CreatedByUser?.MemberId ?? detail.CreatedByMemberId ?? null
    if (memberId == null || memberId <= 0) {
      message.error('Đặt trước không có thông tin người đặt hợp lệ')
      return false
    }

    if (!detail.EndAt) {
      message.error('Đặt trước không có thời gian kết thúc (EndAt)')
      return false
    }

    const end = dayjs(detail.EndAt)
    if (!end.isAfter(dayjs())) {
      message.warning('Thời gian kết thúc đặt trước đã qua — vui lòng kiểm tra lại trước khi tạo phiếu')
    }

    setBorrowedByMemberId(memberId)
    setBorrowerSearch(
      detail.CreatedByUser?.FullName?.trim() || `Member #${memberId}`
    )
    setBorrowerOptions([])
    setReturnedDueDate(end)
    if (detail.StartAt) {
      setReservationBorrowStartAt(dayjs(detail.StartAt))
    } else {
      setReservationBorrowStartAt(dayjs())
    }

    const eqIds = (detail.EquipmentReservations ?? [])
      .filter((er) => !er.IsTemporarilyCancelled)
      .map((er) => er.EquipmentId)
    setSelectedEquipmentIds(eqIds)

    const sids = (detail.Sessions ?? []).map((s) => s.SessionId)
    setSessionIds(sids)

    const firstNote = detail.Sessions?.find((s) => s.Notes?.trim())?.Notes
    if (firstNote?.trim()) {
      setDescription((prev) => prev.trim() || firstNote.trim())
    }

    return true
  }

  const handleLoadReservation = async () => {
    const id = Number(String(reservationIdInput).trim())
    if (!id || Number.isNaN(id)) {
      message.error('Nhập mã đặt trước (số) hợp lệ')
      return
    }
    setError('')
    try {
      setLoadingReservation(true)
      const raw = await reservationApi.getById(id)
      const detail = normalizeReservationResponse(raw)
      setLoadedReservation(detail)
      const ok = applyReservationDetail(detail)
      if (ok) message.success('Đã tải thông tin theo đặt trước')
    } catch {
      setLoadedReservation(null)
      message.error('Không tải được đặt trước — kiểm tra mã hoặc quyền truy cập')
    } finally {
      setLoadingReservation(false)
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
    selectedEquipmentIds.includes(e.EquipmentId)
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
  // - Mượn ngay: StartAt = hiện tại
  // - Theo đặt trước: StartAt = reservationBorrowStartAt (ô chọn trong tab)
  // - EndAt: returnedDueDate (hạn trả)
  //
  // Khi tạo phiếu theo đặt trước: API availability có thể không trả thiết bị đã đặt (vd. trạng thái Damaged)
  // nhưng vẫn phải tự chọn đúng thiết bị trong đặt trước — gộp thêm từ loadedReservation và không lọc mất ID đó.
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

        const startAtDt =
          modeTab === 'reservation' && reservationBorrowStartAt
            ? reservationBorrowStartAt
            : dayjs()
        const endAtDt = returnedDueDate

        // BE yêu cầu EndAt > StartAt.
        // Nếu hạn trả không sau thời điểm bắt đầu (hoặc không sau hiện tại ở tab Mượn ngay), không gọi API.
        if (!endAtDt.isAfter(startAtDt)) {
          setAllEquipments([])
          setSelectedEquipmentIds([])
          return
        }

        const startAt = startAtDt.format('YYYY-MM-DDTHH:mm:ss')
        const endAt = endAtDt.format('YYYY-MM-DDTHH:mm:ss')

        const res = normalizeEquipmentPagedResponse(
          await reservationApi.getAvailability({
            StartAt: startAt,
            EndAt: endAt,
            PageNumber: 1,
            PageSize: 500,
          }),
        )

        const items = res.Items ?? []
        const availableIds = new Set(items.map((x) => x.EquipmentId))

        const reservationEquipments = (loadedReservation?.EquipmentReservations ?? []).filter(
          (er) => !er.IsTemporarilyCancelled,
        )
        const reservationIdSet = new Set(reservationEquipments.map((er) => er.EquipmentId))

        const merged: EquipmentResponse[] = [...items]
        for (const er of reservationEquipments) {
          if (!availableIds.has(er.EquipmentId)) {
            merged.push(equipmentReservationToRow(er))
            availableIds.add(er.EquipmentId)
          }
        }

        setAllEquipments(merged)
        setSelectedEquipmentIds((prev) =>
          prev.filter((id) => availableIds.has(id) || reservationIdSet.has(id)),
        )
      } catch {
        setAllEquipments([])
        setSelectedEquipmentIds([])
      } finally {
        setEquipmentLoading(false)
      }
    }

    void loadAvailability()
  }, [open, returnedDueDate, loadedReservation, modeTab, reservationBorrowStartAt])

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
    if (modeTab === 'reservation' && !reservationBorrowStartAt) {
      setError('Vui lòng chọn ngày giờ bắt đầu mượn')
      return
    }

    const borrowStartEffective =
      modeTab === 'reservation' && reservationBorrowStartAt
        ? reservationBorrowStartAt
        : dayjs()
    if (!returnedDueDate.isAfter(borrowStartEffective)) {
      setError('Hạn trả phải sau thời điểm bắt đầu mượn')
      return
    }
    // BE validate ReturnedDueDate > now.
    if (!returnedDueDate.isAfter(dayjs())) {
      setError('Hạn trả phải lớn hơn thời điểm hiện tại')
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
      sessionIds: sessionIds.length > 0 ? sessionIds : undefined,
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
    setSessionIds([])
    setError('')
    setModeTab('immediate')
    setReservationIdInput('')
    setLoadedReservation(null)
    setReservationBorrowStartAt(null)
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Tạo phiếu mượn thiết bị"
      description="Mượn ngay hoặc tạo phiếu theo đặt trước đã có — thông tin khớp với BE (session, thiết bị, hạn trả)."
      className="max-w-4xl w-[min(96vw,56rem)] max-h-[92vh]"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Tabs
          value={modeTab}
          onValueChange={(v) => {
            const next = v as 'immediate' | 'reservation'
            setModeTab(next)
            setError('')
            if (next === 'immediate') {
              setSessionIds([])
              setLoadedReservation(null)
              setReservationIdInput('')
              setReservationBorrowStartAt(null)
            }
            if (next === 'reservation') {
              setReservationBorrowStartAt((prev) => prev ?? dayjs())
            }
          }}
        >
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl border border-slate-200/80 bg-gradient-to-r from-sky-50/90 via-white to-violet-50/90 p-1 shadow-[inset_0_1px_2px_rgba(15,23,42,0.06)]">
            <TabsTrigger
              value="immediate"
              className={cn(
                'group relative flex items-center justify-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold sm:text-sm',
                'text-slate-500 transition-all duration-200',
                'after:hidden hover:bg-white/70 hover:text-slate-700',
                'data-[state=active]:bg-white data-[state=active]:text-cyan-800 data-[state=active]:shadow-sm',
                'data-[state=active]:ring-1 data-[state=active]:ring-cyan-200/80',
              )}
            >
              <Zap
                className="h-3.5 w-3.5 shrink-0 text-amber-500 transition-colors group-data-[state=active]:text-cyan-600 sm:h-4 sm:w-4"
                aria-hidden
              />
              Mượn ngay
            </TabsTrigger>
            <TabsTrigger
              value="reservation"
              className={cn(
                'group relative flex items-center justify-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold sm:text-sm',
                'text-slate-500 transition-all duration-200',
                'after:hidden hover:bg-white/70 hover:text-slate-700',
                'data-[state=active]:bg-white data-[state=active]:text-violet-800 data-[state=active]:shadow-sm',
                'data-[state=active]:ring-1 data-[state=active]:ring-violet-200/80',
              )}
            >
              <CalendarDays
                className="h-3.5 w-3.5 shrink-0 text-violet-400 transition-colors group-data-[state=active]:text-violet-600 sm:h-4 sm:w-4"
                aria-hidden
              />
              Theo đặt trước
            </TabsTrigger>
          </TabsList>

         

          <TabsContent value="reservation" className="mt-2 space-y-3">
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1.5 min-w-[200px] flex-1">
                <Label className="text-black font-medium">
                  Mã đặt trước (Reservation ID) <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={reservationIdInput}
                  onChange={(e) => setReservationIdInput(e.target.value)}
                  className="h-9 text-black border-gray-200"
                  inputMode="numeric"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-9"
                onClick={() => void handleLoadReservation()}
                disabled={loadingReservation}
              >
                {loadingReservation ? 'Đang tải...' : 'Tải thông tin'}
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label className="text-black font-medium">
                Ngày giờ bắt đầu mượn <span className="text-red-500">*</span>
              </Label>
              <DatePicker
                className="w-full h-9 text-black"
                placeholder="Chọn ngày giờ bắt đầu (khung mượn / availability)"
                format="DD/MM/YYYY HH:mm"
                showTime={{ format: 'HH:mm' }}
                value={reservationBorrowStartAt}
                onChange={(v) => setReservationBorrowStartAt(v)}
                allowClear={false}
                disabledDate={(current) => {
                  if (!current) return false
                  if (returnedDueDate && current.isAfter(returnedDueDate, 'day')) {
                    return true
                  }
                  return false
                }}
                disabledTime={(current) => {
                  if (!current || !returnedDueDate) return {}
                  if (!current.isSame(returnedDueDate, 'day')) return {}
                  const end = returnedDueDate
                  return {
                    disabledHours: () =>
                      Array.from({ length: 24 }, (_, h) => h).filter((h) => h > end.hour()),
                    disabledMinutes: (selectedHour: number) => {
                      if (selectedHour < end.hour()) return []
                      if (selectedHour > end.hour()) {
                        return Array.from({ length: 60 }, (_, i) => i)
                      }
                      return Array.from({ length: end.minute() }, (_, i) => i)
                    },
                  }
                }}
              />
            </div>
            {loadedReservation && (
              <div className="rounded-lg border border-[#2197C0]/30 bg-[#2197C0]/5 px-4 py-3 text-sm text-gray-800">
                <div className="font-medium text-black">
                  Đặt trước #{loadedReservation.ReservationId}
                </div>
                <div className="mt-1 grid gap-1 text-xs sm:grid-cols-2">
                  <span>
                    <span className="text-gray-600">Bắt đầu: </span>
                    <span className="font-semibold tabular-nums text-[#2197C0]">
                      {loadedReservation.StartAt
                        ? dayjs(loadedReservation.StartAt).format('DD/MM/YYYY HH:mm')
                        : '—'}
                    </span>
                  </span>
                  <span>
                    <span className="text-gray-600">Kết thúc: </span>
                    <span className="font-semibold tabular-nums text-[#2197C0]">
                      {loadedReservation.EndAt
                        ? dayjs(loadedReservation.EndAt).format('DD/MM/YYYY HH:mm')
                        : '—'}
                    </span>
                  </span>
                  {sessionIds.length > 0 && (
                    <span className="sm:col-span-2">
                      Session gắn kèm: {sessionIds.join(', ')}
                    </span>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
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
            <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border bg-white no-scrollbar">
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
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-md bg-white px-1 py-2 no-scrollbar">
                {allEquipments
                  .filter((eq) => {
                    if (selectedCategoryId && eq.CategoryId !== selectedCategoryId) {
                      return false
                    }
                    if (!equipmentSearch.trim()) return true
                    const q = equipmentSearch.trim().toLowerCase()
                    const byId =
                      !isNaN(Number(q)) && eq.EquipmentId === Number(q)
                    return (
                      byId ||
                      (eq.EquipmentName ?? '').toLowerCase().includes(q) ||
                      (eq.EquipmentCode ?? '').toLowerCase().includes(q) ||
                      (eq.CategoryName ?? '').toLowerCase().includes(q)
                    )
                  })
                  .slice(0, 30)
                  .map((eq) => {
                    const isSelected = selectedEquipmentIds.includes(
                      eq.EquipmentId
                    )
                    const cat = (eq.CategoryName ?? '').trim()
                    const code = (eq.EquipmentCode ?? '').trim()
                    const subLine = `${cat || '—'} - ${code || '—'}`
                    const alt = eq.EquipmentName ?? `Equipment ${eq.EquipmentId}`

                    const toggle = () => {
                      const id = eq.EquipmentId
                      setSelectedEquipmentIds((prev) =>
                        prev.includes(id)
                          ? prev.filter((x) => x !== id)
                          : [...prev, id]
                      )
                    }

                    return (
                      <div
                        key={eq.EquipmentId}
                        className={cn(
                          'flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs transition',
                          isSelected
                            ? 'border-[#2197C0] bg-[#2197C0]/10 shadow-[0_1px_2px_rgba(33,151,192,0.18)]'
                            : 'border-slate-200 bg-white hover:border-[#2197C0]/45 hover:bg-[#2197C0]/5'
                        )}
                      >
                        <div
                          className={cn(
                            'h-10 w-10 shrink-0 overflow-hidden rounded-sm flex items-center justify-center',
                            eq.ImgLink ? 'border bg-gray-50' : 'bg-gray-50'
                          )}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {eq.ImgLink ? (
                            <Image
                              src={eq.ImgLink}
                              alt={alt}
                              width={40}
                              height={40}
                              className="object-cover"
                              preview={{ mask: 'Xem ảnh' }}
                            />
                          ) : (
                            <ImageOff
                              className="h-5 w-5 text-gray-300"
                              aria-hidden
                            />
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={toggle}
                          className="flex min-w-0 flex-1 flex-col gap-0.5 text-left"
                        >
                          <span className="truncate font-medium text-gray-900">
                            {eq.EquipmentName}
                          </span>
                          <span className="truncate text-[11px] text-gray-500">
                            {subLine}
                          </span>
                        </button>
                      </div>
                    )
                  })}

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
                    if (selectedCategoryId && eq.CategoryId !== selectedCategoryId) {
                      return false
                    }
                    const q = equipmentSearch.trim().toLowerCase()
                    const byId =
                      !isNaN(Number(q)) && eq.EquipmentId === Number(q)
                    return (
                      byId ||
                      (eq.EquipmentName ?? '').toLowerCase().includes(q) ||
                      (eq.EquipmentCode ?? '').toLowerCase().includes(q) ||
                      (eq.CategoryName ?? '').toLowerCase().includes(q)
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
                        key={eq.EquipmentId}
                        className="inline-flex items-center rounded-full bg-[#2197C0]/5 px-2 py-0.5 text-[11px] text-[#2197C0]"
                      >
                        {eq.EquipmentName}
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
            rows={3}
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

