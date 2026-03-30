import { useEffect, useRef, useState } from 'react'
import { DatePicker, Image, message } from 'antd'
import borrowingApi from '../api/borrowingApi'
import memberApi from '@/modules/member/api/memberApi'
import categoryApi from '@/modules/category/api/categoryApi'
import reservationApi from '@/modules/reservation/api/reservationApi'
import requestApi from '@/modules/request/api/requestApi'
import sessionApi from '@/modules/request/api/sessionApi'
import type { Member } from '@/modules/member/member'
import type { RequestListItem } from '@/modules/request/request'
import type { SessionResponse } from '@/modules/request/session.types'
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
import { useLocation } from 'react-router-dom'

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
  const location = useLocation()
  const isEquipmentManager = location.pathname.startsWith('/em/')

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

  type ImmediateRequestOption = {
    requestId: number
    requestCode: string
    requestName: string
    sessions: Array<Pick<SessionResponse, 'SessionId' | 'SessionNo' | 'StartAt' | 'EndAt'>>
  }
  type ImmediateBorrowerOption = {
    memberId: number
    fullName: string
    email?: string
    avatarUrl?: string | null
  }
  type ReservationRequestOption = {
    requestId: number
    requestCode: string
    requestName: string
    sessions: Array<
      Pick<SessionResponse, 'SessionId' | 'SessionNo' | 'StartAt' | 'EndAt' | 'ReservationId'>
    >
  }

  const [immediateRequestOptions, setImmediateRequestOptions] = useState<
    ImmediateRequestOption[]
  >([])
  const [immediateRequestId, setImmediateRequestId] = useState<number | null>(null)
  const [immediateRequestSearch, setImmediateRequestSearch] = useState('')
  const [immediateRequestDropdownOpen, setImmediateRequestDropdownOpen] = useState(false)
  const [immediateSessionId, setImmediateSessionId] = useState<number | null>(null)
  const [immediateBorrowerOptions, setImmediateBorrowerOptions] = useState<
    ImmediateBorrowerOption[]
  >([])
  const [loadingImmediateRequests, setLoadingImmediateRequests] = useState(false)
  const [loadingImmediateBorrowers, setLoadingImmediateBorrowers] = useState(false)

  // Theo đặt trước: chọn Request -> Session (session có ReservationId) để lấy detail đặt trước
  const [reservationRequestOptions, setReservationRequestOptions] = useState<
    ReservationRequestOption[]
  >([])
  const [reservationRequestId, setReservationRequestId] = useState<number | null>(null)
  const [reservationRequestSearch, setReservationRequestSearch] = useState('')
  const [reservationRequestDropdownOpen, setReservationRequestDropdownOpen] = useState(false)
  const [reservationSessionId, setReservationSessionId] = useState<number | null>(null)
  const [loadingReservationRequests, setLoadingReservationRequests] = useState(false)
  const [reservationBorrowerOptions, setReservationBorrowerOptions] = useState<
    ImmediateBorrowerOption[]
  >([])

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
    // Trong tab "Theo đặt trước" bắt buộc chọn member => hiển thị đúng người đã tạo reservation.
    setReservationBorrowerOptions([
      {
        memberId,
        fullName: detail.CreatedByUser?.FullName?.trim() || `Member #${memberId}`,
        email: detail.CreatedByUser?.Email ?? undefined,
        avatarUrl: detail.CreatedByUser?.AvatarUrl ?? null,
      },
    ])
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

  const handleLoadReservation = async (idOverride?: number | null) => {
    const id =
      idOverride != null && Number.isFinite(idOverride)
        ? idOverride
        : Number(String(reservationIdInput).trim())
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
      setReservationBorrowerOptions([])
      setBorrowedByMemberId(null)
      setBorrowerSearch('')
      setBorrowerOptions([])
      message.error('Không tải được đặt trước — kiểm tra mã hoặc quyền truy cập')
    } finally {
      setLoadingReservation(false)
    }
  }

  const loadBorrowersFromImmediateSession = async (sessionId: number) => {
    try {
      setLoadingImmediateBorrowers(true)
      setImmediateBorrowerOptions([])
      setBorrowedByMemberId(null)
      setBorrowerSearch('')
      setBorrowerOptions([])

      const detail = await sessionApi.getById(sessionId)
      const assignments = detail.Assignments ?? []

      const map = new Map<number, ImmediateBorrowerOption>()
      for (const a of assignments) {
        const staff = a?.StaffMember
        const memberId = Number(staff?.MemberId ?? a?.StaffMemberId ?? 0)
        if (!memberId || memberId <= 0) continue

        const fullName =
          (staff?.FullName ?? null) || (staff?.FullName ? String(staff.FullName) : '') || `Member #${memberId}`

        if (!map.has(memberId)) {
          map.set(memberId, {
            memberId,
            fullName,
            email: staff?.Email ?? undefined,
            avatarUrl: staff?.AvatarUrl ?? null,
          })
        }
      }

      const list = Array.from(map.values()).sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'))
      setImmediateBorrowerOptions(list)
    } catch {
      message.error('Không tải được danh sách người mượn từ session')
    } finally {
      setLoadingImmediateBorrowers(false)
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

  useEffect(() => {
    if (!open) return
    if (!isEquipmentManager) return
    if (modeTab !== 'immediate') return

    let cancelled = false
    const run = async () => {
      try {
        setLoadingImmediateRequests(true)
        setImmediateRequestOptions([])
        setImmediateRequestId(null)
        setImmediateRequestSearch('')
        setImmediateRequestDropdownOpen(false)
        setImmediateSessionId(null)
        setImmediateBorrowerOptions([])
        setBorrowedByMemberId(null)
        setBorrowerSearch('')
        setBorrowerOptions([])

        const now = dayjs()
        const res = await sessionApi.getFilter({
          PageNumber: 1,
          PageSize: 500,
        })

        const rawSessions = res.Items ?? []
        const filteredSessions = rawSessions
          .filter((s) => Number(s.SessionId) > 0)
          .filter((s) => {
            if (!s.StartAt || !s.EndAt) return false
            const st = dayjs(s.StartAt)
            const en = dayjs(s.EndAt)
            if (!st.isValid() || !en.isValid()) return false
            // Chỉ lấy session "đang diễn ra" để mượn ngay khớp BE (và đúng với mô tả của bạn)
            return (st.isBefore(now) || st.isSame(now)) && (en.isAfter(now) || en.isSame(now))
          })

        // Nếu không có session đang diễn ra, vẫn cho chọn theo danh sách (không để UI trống)
        const sessionsForUi = filteredSessions.length ? filteredSessions : rawSessions.filter((s) => Number(s.SessionId) > 0)

        const requestIds = Array.from(
          new Set(sessionsForUi.map((s) => Number(s.RequestId)).filter((id) => id > 0))
        ).slice(0, 30)

        const requestDetails = await Promise.all(
          requestIds.map(async (id) => {
            try {
              const r = await requestApi.getById(id)
              return [id, r] as const
            } catch {
              return [id, null] as const
            }
          })
        )

        if (cancelled) return

        const reqMap = new Map<number, RequestListItem>()
        requestDetails.forEach(([id, r]) => {
          if (r) reqMap.set(id, r as RequestListItem)
        })

        const grouped: ImmediateRequestOption[] = requestIds
          .map((rid) => {
            const sessions = sessionsForUi
              .filter((s) => Number(s.RequestId) === rid)
              .sort((a, b) => dayjs(a.StartAt).valueOf() - dayjs(b.StartAt).valueOf())
              .map((s) => ({
                SessionId: Number(s.SessionId),
                SessionNo: Number(s.SessionNo),
                StartAt: String(s.StartAt ?? ''),
                EndAt: String(s.EndAt ?? ''),
              }))

            const req = reqMap.get(rid)
            return {
              requestId: rid,
              requestCode: req?.requestCode ?? '',
              requestName: req?.requestName ?? '',
              sessions,
            }
          })
          .filter((x) => x.sessions.length > 0)

        setImmediateRequestOptions(grouped)
      } catch {
        // ignore (UI sẽ hiển thị dropdown rỗng, submit vẫn validate lỗi "chọn session")
      } finally {
        if (!cancelled) setLoadingImmediateRequests(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [open, isEquipmentManager, modeTab])

  // Equipment manager (tab "Theo đặt trước"): chọn Request -> Session
  // (chỉ cho chọn session đang có ReservationId để đảm bảo "request đã có đặt trước").
  useEffect(() => {
    if (!open) return
    if (modeTab !== 'reservation') return

    let cancelled = false

    const run = async () => {
      try {
        setLoadingReservationRequests(true)
        setReservationRequestOptions([])
        setReservationRequestId(null)
        setReservationRequestSearch('')
        setReservationRequestDropdownOpen(false)
        setReservationSessionId(null)
        setReservationBorrowerOptions([])

        setLoadedReservation(null)
        setReservationIdInput('')
        setReservationBorrowStartAt(dayjs())

        setBorrowedByMemberId(null)
        setBorrowerSearch('')
        setBorrowerOptions([])
        setReturnedDueDate(null)

        setSelectedEquipmentIds([])
        setSessionIds([])

        const now = dayjs()
        const res = await sessionApi.getFilter({
          Statuses: ['ASSIGNED', 'ONGOING'],
          PageNumber: 1,
          PageSize: 500,
        })

        const rawSessions = res.Items ?? []
        const reservedSessions = rawSessions
          .filter((s) => Number(s.SessionId) > 0)
          .filter((s) => s.ReservationId != null && Number(s.ReservationId) > 0)
          .filter((s) => {
            if (!s.StartAt || !s.EndAt) return false
            const st = dayjs(s.StartAt)
            const en = dayjs(s.EndAt)
            if (!st.isValid() || !en.isValid()) return false
            return en.isAfter(now) || en.isSame(now)
          })

        const requestIds = Array.from(
          new Set(reservedSessions.map((s) => Number(s.RequestId)).filter((id) => id > 0))
        ).slice(0, 30)

        if (requestIds.length === 0) {
          setReservationRequestOptions([])
          return
        }

        const requestDetails = await Promise.all(
          requestIds.map(async (id) => {
            try {
              const r = await requestApi.getById(id)
              return [id, r] as const
            } catch {
              return [id, null] as const
            }
          })
        )

        if (cancelled) return

        const reqMap = new Map<number, RequestListItem>()
        requestDetails.forEach(([id, r]) => {
          if (r) reqMap.set(id, r as RequestListItem)
        })

        const grouped: ReservationRequestOption[] = requestIds
          .map((rid) => {
            const sessions = reservedSessions
              .filter((s) => Number(s.RequestId) === rid)
              .sort((a, b) => dayjs(a.StartAt).valueOf() - dayjs(b.StartAt).valueOf())
              .map((s) => ({
                SessionId: Number(s.SessionId),
                SessionNo: Number(s.SessionNo),
                StartAt: String(s.StartAt ?? ''),
                EndAt: String(s.EndAt ?? ''),
                ReservationId: s.ReservationId != null ? Number(s.ReservationId) : null,
              }))

            const req = reqMap.get(rid)
            return {
              requestId: rid,
              requestCode: req?.requestCode ?? '',
              requestName: req?.requestName ?? '',
              sessions,
            }
          })
          .filter((x) => x.sessions.length > 0)

        setReservationRequestOptions(grouped)
      } catch {
        // ignore: UI sẽ hiển thị dropdown rỗng
      } finally {
        if (!cancelled) setLoadingReservationRequests(false)
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [open, modeTab])

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
    // Tab "Theo đặt trước" bắt buộc chọn Request -> Session (và member sẽ tự lấy theo reservation).
    if (modeTab === 'reservation' && !reservationRequestId) {
      setError('Vui lòng chọn request theo đặt trước')
      return
    }
    if (modeTab === 'reservation' && !reservationSessionId) {
      setError('Vui lòng chọn session theo đặt trước')
      return
    }
    if (modeTab === 'reservation' && !loadedReservation) {
      setError('Vui lòng tải thông tin đặt trước')
      return
    }
    if (modeTab === 'reservation' && !reservationBorrowStartAt) {
      setError('Vui lòng chọn ngày giờ bắt đầu mượn')
      return
    }
    if (modeTab === 'reservation' && loadedReservation && reservationBorrowStartAt) {
      const stRaw = loadedReservation.StartAt ? dayjs(loadedReservation.StartAt) : null
      const enRaw = loadedReservation.EndAt ? dayjs(loadedReservation.EndAt) : null
      if (stRaw && enRaw && stRaw.isValid() && enRaw.isValid()) {
        if (reservationBorrowStartAt.isBefore(stRaw) || reservationBorrowStartAt.isAfter(enRaw)) {
          setError('Ngày giờ bắt đầu mượn phải nằm trong khoảng thời gian đặt trước')
          return
        }
      }
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
    setImmediateRequestOptions([])
    setImmediateRequestId(null)
    setImmediateRequestSearch('')
    setImmediateRequestDropdownOpen(false)
    setImmediateSessionId(null)
    setImmediateBorrowerOptions([])
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
    setReservationRequestOptions([])
    setReservationRequestId(null)
    setReservationRequestSearch('')
    setReservationRequestDropdownOpen(false)
    setReservationSessionId(null)
    setReservationBorrowerOptions([])
    onClose()
  }

  const reservationRequestSearchQ = reservationRequestSearch.trim().toLowerCase()
  const filteredReservationRequestOptions = reservationRequestOptions.filter((r) => {
    if (!reservationRequestSearchQ) return true
    const code = (r.requestCode ?? '').trim().toLowerCase()
    const name = (r.requestName ?? '').trim().toLowerCase()
    const idStr = String(r.requestId ?? '').trim().toLowerCase()
    return code.includes(reservationRequestSearchQ) || name.includes(reservationRequestSearchQ) || idStr.includes(reservationRequestSearchQ)
  })

  const reservationSelectedRequest = reservationRequestId
    ? reservationRequestOptions.find((r) => r.requestId === reservationRequestId) ?? null
    : null

  const reservationSelectedRequestLabel = reservationSelectedRequest
    ? (reservationSelectedRequest.requestCode ?? '').trim()
      ? `${reservationSelectedRequest.requestCode} - ${reservationSelectedRequest.requestName}`
      : reservationSelectedRequest.requestName || `Request #${reservationSelectedRequest.requestId}`
    : ''

  const reservationRequestPickerRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!reservationRequestDropdownOpen) return

    const onMouseDown = (e: MouseEvent) => {
      const el = reservationRequestPickerRef.current
      if (!el) return
      if (e.target instanceof Node && el.contains(e.target)) return
      setReservationRequestDropdownOpen(false)
      setReservationRequestSearch('')
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setReservationRequestDropdownOpen(false)
        setReservationRequestSearch('')
      }
    }

    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [reservationRequestDropdownOpen])

  const pickReservationRequest = (rid: number | null) => {
    if (rid == null) {
      setReservationRequestId(null)
      setReservationRequestSearch('')
      setReservationRequestDropdownOpen(false)
      setReservationSessionId(null)
      setReservationIdInput('')
      setLoadedReservation(null)
      setReservationBorrowerOptions([])
      setBorrowedByMemberId(null)
      setBorrowerSearch('')
      setBorrowerOptions([])
      setReservationBorrowStartAt(dayjs())
      setReturnedDueDate(null)
      setSelectedEquipmentIds([])
      setSessionIds([])
      return
    }

    setReservationRequestId(rid)
    setReservationRequestSearch('')
    setReservationRequestDropdownOpen(false)
    setReservationSessionId(null)

    setReservationIdInput('')
    setLoadedReservation(null)
    setReservationBorrowerOptions([])
    setBorrowedByMemberId(null)
    setBorrowerSearch('')
    setBorrowerOptions([])

    setReservationBorrowStartAt(dayjs())
    setReturnedDueDate(null)
    setSelectedEquipmentIds([])
    setSessionIds([])
  }

  const handlePickReservationSession = async (sid: number) => {
    setReservationSessionId(sid)

    setReservationIdInput('')
    setLoadedReservation(null)
    setReservationBorrowerOptions([])
    setBorrowedByMemberId(null)
    setBorrowerSearch('')
    setBorrowerOptions([])
    setReturnedDueDate(null)
    setSelectedEquipmentIds([])
    setSessionIds([])

    const opt =
      reservationRequestOptions.find((r) => r.requestId === reservationRequestId)?.sessions.find(
        (s) => s.SessionId === sid
      ) ?? null

    const reservationId = opt?.ReservationId != null ? Number(opt.ReservationId) : null
    if (!reservationId) {
      message.error('Session đã chọn không có thông tin đặt trước')
      return
    }

    setReservationIdInput(String(reservationId))
    await handleLoadReservation(reservationId)
  }

  const immediateRequestSearchQ = immediateRequestSearch.trim().toLowerCase()
  const filteredImmediateRequestOptions = immediateRequestOptions.filter((r) => {
    if (!immediateRequestSearchQ) return true
    const code = (r.requestCode ?? '').trim().toLowerCase()
    const name = (r.requestName ?? '').trim().toLowerCase()
    const idStr = String(r.requestId ?? '').trim().toLowerCase()
    return code.includes(immediateRequestSearchQ) || name.includes(immediateRequestSearchQ) || idStr.includes(immediateRequestSearchQ)
  })

  const immediateSelectedRequest = immediateRequestId
    ? immediateRequestOptions.find((r) => r.requestId === immediateRequestId) ?? null
    : null

  const immediateSelectedRequestLabel = immediateSelectedRequest
    ? (immediateSelectedRequest.requestCode ?? '').trim()
      ? `${immediateSelectedRequest.requestCode} - ${immediateSelectedRequest.requestName}`
      : immediateSelectedRequest.requestName || `Request #${immediateSelectedRequest.requestId}`
    : ''

  const requestPickerRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!immediateRequestDropdownOpen) return

    const onMouseDown = (e: MouseEvent) => {
      const el = requestPickerRef.current
      if (!el) return
      if (e.target instanceof Node && el.contains(e.target)) return
      setImmediateRequestDropdownOpen(false)
      setImmediateRequestSearch('')
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setImmediateRequestDropdownOpen(false)
        setImmediateRequestSearch('')
      }
    }

    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [immediateRequestDropdownOpen])

  const pickImmediateRequest = (rid: number | null) => {
    if (rid == null) {
      setImmediateRequestId(null)
      setImmediateRequestSearch('')
      setImmediateRequestDropdownOpen(false)
      setImmediateSessionId(null)
      setSessionIds([])
      setImmediateBorrowerOptions([])
      setBorrowedByMemberId(null)
      setBorrowerSearch('')
      return
    }

    setImmediateRequestId(rid)
    setImmediateRequestSearch('')
    setImmediateRequestDropdownOpen(false)
    setImmediateSessionId(null)
    setSessionIds([])
    setImmediateBorrowerOptions([])
    setBorrowedByMemberId(null)
    setBorrowerSearch('')
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
              setReservationRequestOptions([])
              setReservationRequestId(null)
              setReservationRequestSearch('')
              setReservationRequestDropdownOpen(false)
              setReservationSessionId(null)
              setReservationBorrowerOptions([])
              setImmediateRequestOptions([])
              setImmediateRequestId(null)
              setImmediateRequestSearch('')
              setImmediateRequestDropdownOpen(false)
              setImmediateSessionId(null)
              setImmediateBorrowerOptions([])
              setBorrowerSearch('')
              setBorrowedByMemberId(null)
              setBorrowerOptions([])
            }
            if (next === 'reservation') {
              setImmediateRequestOptions([])
              setImmediateRequestId(null)
              setImmediateRequestSearch('')
              setImmediateRequestDropdownOpen(false)
              setImmediateSessionId(null)
              setImmediateBorrowerOptions([])
              setBorrowerSearch('')
              setBorrowedByMemberId(null)
              setBorrowerOptions([])
              setLoadedReservation(null)
              setReservationIdInput('')
              setReservationRequestOptions([])
              setReservationRequestId(null)
              setReservationRequestSearch('')
              setReservationRequestDropdownOpen(false)
              setReservationSessionId(null)
              setReservationBorrowerOptions([])
              setReservationBorrowStartAt((prev) => prev ?? dayjs())
              setReturnedDueDate(null)
              setSelectedEquipmentIds([])
              setSessionIds([])
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
              <div
                className="relative space-y-1.5 min-w-[220px] flex-1"
                ref={reservationRequestPickerRef}
              >
                <Label className="text-black font-medium">
                  Request <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Tìm request có đặt trước..."
                  disabled={loadingReservationRequests || reservationRequestOptions.length === 0}
                  value={
                    reservationRequestDropdownOpen
                      ? reservationRequestSearch
                      : reservationSelectedRequestLabel
                  }
                  autoComplete="off"
                  onChange={(e) => setReservationRequestSearch(e.target.value)}
                  onFocus={() => {
                    if (loadingReservationRequests) return
                    if (reservationRequestOptions.length === 0) return
                    setReservationRequestDropdownOpen(true)
                    setReservationRequestSearch('')
                  }}
                  className="h-9 text-xs text-black border-gray-200"
                />

                {reservationRequestDropdownOpen &&
                  !loadingReservationRequests &&
                  reservationRequestOptions.length > 0 && (
                    <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow">
                      {filteredReservationRequestOptions.map((r) => {
                        const label = (r.requestCode ?? '').trim()
                          ? `${r.requestCode} - ${r.requestName}`
                          : r.requestName || `Request #${r.requestId}`

                        return (
                          <button
                            key={r.requestId}
                            type="button"
                            className={cn(
                              'w-full text-left px-3 py-2 text-sm hover:bg-gray-50',
                              reservationRequestId === r.requestId && 'bg-[#2197C0]/10',
                            )}
                            onMouseDown={(e) => {
                              e.preventDefault()
                              pickReservationRequest(r.requestId)
                            }}
                          >
                            {label}
                          </button>
                        )
                      })}

                      {reservationRequestSearchQ &&
                        filteredReservationRequestOptions.length === 0 && (
                          <div className="px-3 pb-2 text-xs text-gray-500">
                            Không tìm thấy request có đặt trước phù hợp.
                          </div>
                        )}
                    </div>
                  )}
              </div>

              <div className="space-y-1.5 min-w-[240px] flex-1">
                <Label className="text-black font-medium">
                  Session <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={reservationSessionId != null ? String(reservationSessionId) : ''}
                  onValueChange={(value) => {
                    const sid = Number(value)
                    void handlePickReservationSession(sid)
                  }}
                  disabled={
                    loadingReservationRequests ||
                    reservationRequestId == null ||
                    (reservationSelectedRequest?.sessions.length ?? 0) === 0
                  }
                >
                  <SelectTrigger className="h-9 text-xs text-black border-gray-200">
                    <SelectValue placeholder={reservationRequestId == null ? 'Chọn request trước' : 'Chọn session'} />
                  </SelectTrigger>
                  <SelectContent>
                    {(reservationSelectedRequest?.sessions ?? []).map((s) => (
                      <SelectItem key={s.SessionId} value={String(s.SessionId)}>
                        {`Phiên ${s.SessionNo ?? ''}`.trim()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                  const start = loadedReservation?.StartAt ? dayjs(loadedReservation.StartAt) : null
                  const end = loadedReservation?.EndAt
                    ? dayjs(loadedReservation.EndAt)
                    : returnedDueDate
                      ? returnedDueDate
                      : null

                  if (start && start.isValid() && current.isBefore(start, 'day')) return true
                  if (end && end.isValid() && current.isAfter(end, 'day')) return true
                  return false
                }}
                disabledTime={(current) => {
                  if (!current) return {}
                  const start = loadedReservation?.StartAt ? dayjs(loadedReservation.StartAt) : null
                  const end = loadedReservation?.EndAt
                    ? dayjs(loadedReservation.EndAt)
                    : returnedDueDate
                      ? returnedDueDate
                      : null
                  if (!start || !end) return {}

                  const disabledHours = new Set<number>()
                  const disabledMinutesByHour = new Map<number, Set<number>>()
                  const markDisabledMinute = (h: number, m: number) => {
                    if (!disabledMinutesByHour.has(h)) disabledMinutesByHour.set(h, new Set<number>())
                    disabledMinutesByHour.get(h)!.add(m)
                  }

                  // If selected day equals start day: disable times before start (hour/minute)
                  if (start.isValid() && current.isSame(start, 'day')) {
                    for (let h = 0; h < start.hour(); h++) disabledHours.add(h)
                    // same hour -> minutes before start.minute disabled
                    for (let m = 0; m < start.minute(); m++) markDisabledMinute(start.hour(), m)
                  }

                  // If selected day equals end day: disable times after end (hour/minute)
                  if (end.isValid() && current.isSame(end, 'day')) {
                    for (let h = end.hour() + 1; h < 24; h++) disabledHours.add(h)
                    for (let m = end.minute() + 1; m < 60; m++) markDisabledMinute(end.hour(), m)
                  }

                  return {
                    disabledHours: () => Array.from(disabledHours).sort((a, b) => a - b),
                    disabledMinutes: (selectedHour: number) =>
                      Array.from(disabledMinutesByHour.get(selectedHour) ?? []).sort((a, b) => a - b),
                  }
                }}
              />
            </div>
            {loadedReservation && (
              <div className="rounded-lg border border-[#2197C0]/30 bg-[#2197C0]/5 px-4 py-3 text-sm text-gray-800">
                <div className="font-medium text-black">Thông tin đặt trước</div>
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
        {isEquipmentManager && modeTab === 'immediate' && (
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1.5 min-w-[220px] flex-1">
              <Label className="text-black font-medium">
                Request
              </Label>
              <div ref={requestPickerRef} className="relative">
                <Input
                  placeholder="Tìm mã request (tuỳ chọn)"
                  disabled={loadingImmediateRequests || immediateRequestOptions.length === 0}
                  value={
                    immediateRequestDropdownOpen
                      ? immediateRequestSearch
                      : immediateSelectedRequestLabel
                  }
                  autoComplete="off"
                  onChange={(e) => setImmediateRequestSearch(e.target.value)}
                  onFocus={() => {
                    if (loadingImmediateRequests) return
                    if (immediateRequestOptions.length === 0) return
                    setImmediateRequestDropdownOpen(true)
                    // Khi mở để tìm thì xoá keyword để người dùng gõ từ đầu.
                    setImmediateRequestSearch('')
                  }}
                  className="h-9 text-xs text-black border-gray-200"
                />

                {immediateRequestDropdownOpen &&
                  !loadingImmediateRequests &&
                  immediateRequestOptions.length > 0 && (
                    <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow">
                      {filteredImmediateRequestOptions.map((r) => {
                        const label = (r.requestCode ?? '').trim()
                          ? `${r.requestCode} - ${r.requestName}`
                          : r.requestName || `Request #${r.requestId}`

                        return (
                          <button
                            key={r.requestId}
                            type="button"
                            className={cn(
                              'w-full text-left px-3 py-2 text-sm hover:bg-gray-50',
                              immediateRequestId === r.requestId && 'bg-[#2197C0]/10',
                            )}
                            onMouseDown={(e) => {
                              e.preventDefault()
                              pickImmediateRequest(r.requestId)
                            }}
                          >
                            {label}
                          </button>
                        )
                      })}

                      {immediateRequestSearchQ &&
                        filteredImmediateRequestOptions.length === 0 && (
                          <div className="px-3 pb-2 text-xs text-gray-500">
                            Không tìm thấy request phù hợp.
                          </div>
                        )}
                    </div>
                  )}
              </div>
            </div>

            <div className="space-y-1.5 min-w-[240px] flex-1">
              <Label className="text-black font-medium">
                Session
              </Label>
              <Select
                value={immediateSessionId != null ? String(immediateSessionId) : ''}
                onValueChange={(value) => {
                  const sid = Number(value)
                  setImmediateSessionId(sid)
                  setSessionIds([sid])
                  void loadBorrowersFromImmediateSession(sid)
                }}
                disabled={
                  loadingImmediateRequests ||
                  immediateRequestId == null ||
                  (immediateRequestOptions.find((r) => r.requestId === immediateRequestId)?.sessions.length ??
                    0) === 0
                }
              >
                <SelectTrigger className="h-9 text-xs text-black border-gray-200">
                  <SelectValue placeholder={immediateRequestId == null ? 'Chọn request trước (tuỳ chọn)' : 'Chọn session (tuỳ chọn)'} />
                </SelectTrigger>
                <SelectContent>
                  {(immediateRequestOptions.find((r) => r.requestId === immediateRequestId)?.sessions ?? []).map((s) => (
                    <SelectItem key={s.SessionId} value={String(s.SessionId)}>
                      {`Phiên ${s.SessionNo ?? ''}`.trim()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
            <div className="space-y-1.5">
          <Label className="text-black font-medium">
            Người mượn <span className="text-red-500">*</span>
          </Label>
          {isEquipmentManager && modeTab === 'immediate' && immediateSessionId != null && immediateBorrowerOptions.length > 0 ? (
            <div className="space-y-2">
              <Select
                value={borrowedByMemberId != null ? String(borrowedByMemberId) : 'all'}
                onValueChange={(value) => {
                  const id = value === 'all' ? null : Number(value)
                  setBorrowedByMemberId(id)
                  if (!id) {
                    setBorrowerSearch('')
                  } else {
                    const picked = immediateBorrowerOptions.find((m) => m.memberId === id)
                    setBorrowerSearch(picked?.fullName ?? String(id))
                  }
                }}
                disabled={loadingImmediateBorrowers || immediateBorrowerOptions.length === 0}
              >
                <SelectTrigger className="h-9 text-xs text-black border-gray-200">
                  <SelectValue placeholder="Chọn người mượn" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Chọn người mượn</SelectItem>
                  {immediateBorrowerOptions.map((m) => (
                    <SelectItem key={m.memberId} value={String(m.memberId)}>
                      {m.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {loadingImmediateBorrowers && (
                <p className="text-xs text-gray-500">Đang tải danh sách người mượn...</p>
              )}
            </div>
          ) : modeTab === 'reservation' ? (
            reservationSessionId != null ? (
              reservationBorrowerOptions.length > 0 ? (
                <div className="space-y-2">
                  <Select
                    value={borrowedByMemberId != null ? String(borrowedByMemberId) : ''}
                    onValueChange={(value) => {
                      const id = value ? Number(value) : null
                      setBorrowedByMemberId(id)
                      if (!id) {
                        setBorrowerSearch('')
                      } else {
                        const picked = reservationBorrowerOptions.find((m) => m.memberId === id)
                        setBorrowerSearch(picked?.fullName ?? String(id))
                      }
                    }}
                    disabled={loadingReservation || reservationBorrowerOptions.length === 0}
                  >
                    <SelectTrigger className="h-9 text-xs text-black border-gray-200">
                      <SelectValue placeholder="Chọn người mượn" />
                    </SelectTrigger>
                    <SelectContent>
                      {reservationBorrowerOptions.map((m) => (
                        <SelectItem key={m.memberId} value={String(m.memberId)}>
                          {m.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <p className="text-xs text-gray-500">Đang tải người mượn từ đặt trước...</p>
              )
            ) : (
              <p className="text-xs text-gray-500">Vui lòng chọn Request & Session trước</p>
            )
          ) : (
            <>
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
            </>
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

