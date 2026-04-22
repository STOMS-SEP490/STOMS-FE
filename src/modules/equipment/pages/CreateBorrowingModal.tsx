import { useEffect, useRef, useState } from 'react'
import { DatePicker, Image, message } from 'antd'
import borrowingApi from '../api/borrowingApi'
import memberApi from '@/modules/member/api/memberApi'
import categoryApi from '@/modules/category/api/categoryApi'
import reservationApi from '@/modules/reservation/api/reservationApi'
import requestApi from '@/modules/request/api/requestApi'
import sessionApi from '@/modules/request/api/sessionApi'
import type { Member } from '@/modules/member/member'
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
import { cn } from '@/shared/lib/utils'
import { ImageOff } from 'lucide-react'
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

function sessionOptionLabel(s: {
  SessionNo?: number | null
  SessionTitle?: string | null
  Notes?: string | null
}): string {
  const base = `Buổi ${s.SessionNo ?? ''}`.trim()
  const title = (s.SessionTitle ?? s.Notes ?? '').trim()
  return title ? `${base} - ${title}` : base
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

  const [loadedReservation, setLoadedReservation] = useState<ReservationDetail | null>(null)

  type ImmediateBorrowerOption = {
    memberId: number
    fullName: string
    email?: string
    avatarUrl?: string | null
  }

  const [sessionBorrowerDropdownOpen, setSessionBorrowerDropdownOpen] = useState(false)
  const [sessionBorrowerSearch, setSessionBorrowerSearch] = useState('')
  const sessionBorrowerPickerRef = useRef<HTMLDivElement | null>(null)

  type RequestOption = {
    requestId: number
    requestCode: string
    requestName: string
  }

  const [requestOptions, setRequestOptions] = useState<RequestOption[]>([])
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null)
  const [requestSearch, setRequestSearch] = useState('')
  const [requestDropdownOpen, setRequestDropdownOpen] = useState(false)
  const requestPickerRef = useRef<HTMLDivElement | null>(null)

  const [sessions, setSessions] = useState<
    Array<
      Pick<SessionResponse, 'SessionId' | 'SessionNo' | 'StartAt' | 'EndAt' | 'ReservationId' | 'Notes'> & {
        SessionTitle?: string | null
      }
    >
  >([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null)
  const [sessionSearch, setSessionSearch] = useState('')
  const [sessionDropdownOpen, setSessionDropdownOpen] = useState(false)
  const sessionPickerRef = useRef<HTMLDivElement | null>(null)
  const [loadingSessionBorrowers, setLoadingSessionBorrowers] = useState(false)
  const [sessionBorrowerOptions, setSessionBorrowerOptions] = useState<ImmediateBorrowerOption[]>([])

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
    if (!detail.EndAt) {
      message.error('Đặt trước không có thời gian kết thúc ')
      return false
    }

    const end = dayjs(detail.EndAt)
    if (!end.isAfter(dayjs())) {
      message.warning('Thời gian kết thúc đặt trước đã qua — vui lòng kiểm tra lại trước khi tạo phiếu')
    }

    // Theo đặt trước: Người mượn phải chọn từ danh sách thành viên tham gia session.
    setBorrowedByMemberId(null)
    setSessionBorrowerOptions([])
    setBorrowerSearch('')
    setBorrowerOptions([])
    setReturnedDueDate(end)

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

  const handleLoadReservation = async (reservationId: number) => {
    const id = Number(reservationId)
    if (!id || Number.isNaN(id)) return
    setError('')
    try {
      const raw = await reservationApi.getById(id)
      const detail = normalizeReservationResponse(raw)
      setLoadedReservation(detail)
      const ok = applyReservationDetail(detail)
      if (ok) message.success('Đã tải thông tin theo đặt trước')
    } catch {
      setLoadedReservation(null)
      setSessionBorrowerOptions([])
      setBorrowedByMemberId(null)
      setBorrowerSearch('')
      setBorrowerOptions([])
      message.error('Không tải được đặt trước — kiểm tra mã hoặc quyền truy cập')
    } finally {
    }
  }

  const loadBorrowersFromSession = async (sessionId: number) => {
    try {
      setLoadingSessionBorrowers(true)
      setSessionBorrowerOptions([])
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
      setSessionBorrowerOptions(list)
    } catch {
      message.error('Không tải được danh sách người mượn từ buổi')
    } finally {
      setLoadingSessionBorrowers(false)
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

    let cancelled = false
    const run = async () => {
      try {
        setLoadingRequests(true)
        setRequestOptions([])
        setSelectedRequestId(null)
        setRequestSearch('')
        setRequestDropdownOpen(false)

        setLoadingSessions(false)
        setSessions([])
        setSelectedSessionId(null)
        setSessionSearch('')
        setSessionDropdownOpen(false)
        setSessionBorrowerOptions([])

        const reqRes = await requestApi.getRequests({
          statuses: ['PUBLISHED'],
          pageNumber: 1,
          pageSize: 200,
        })

        if (cancelled) return

        const list = (reqRes.items ?? [])
          .filter((r: any) => Number(r.requestId) > 0)
          .map((r: any) => ({
            requestId: Number(r.requestId),
            requestCode: String(r.requestCode ?? ''),
            requestName: String(r.requestName ?? ''),
          }))

        setRequestOptions(list)
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoadingRequests(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [open, isEquipmentManager])

  useEffect(() => {
    if (!open) return
    if (!isEquipmentManager) return
    if (!selectedRequestId) {
      setSessions([])
      setSelectedSessionId(null)
      setSessionSearch('')
      setSessionDropdownOpen(false)
      setSessionBorrowerOptions([])
      setSessionIds([])
      setLoadedReservation(null)
      return
    }

    let cancelled = false
    const run = async () => {
      try {
        setLoadingSessions(true)
        setSessions([])
        setSelectedSessionId(null)
        setSessionSearch('')
        setSessionDropdownOpen(false)
        setSessionBorrowerOptions([])
        setBorrowedByMemberId(null)
        setBorrowerSearch('')
        setBorrowerOptions([])
        setLoadedReservation(null)
        setReturnedDueDate(null)
        setSelectedEquipmentIds([])
        setSessionIds([])

        const now = dayjs()
        const res = await sessionApi.getFilter({
          RequestId: selectedRequestId,
          Statuses: ['ASSIGNED', 'ONGOING'],
          PageNumber: 1,
          PageSize: 500,
        })

        if (cancelled) return

        const list = (res.Items ?? [])
          .filter((s) => Number(s.SessionId) > 0)
          .filter((s) => {
            if (!s.EndAt) return true
            const en = dayjs(s.EndAt)
            if (!en.isValid()) return true
            return en.isAfter(now) || en.isSame(now)
          })
          .map((s) => ({
            SessionId: Number(s.SessionId),
            SessionNo: Number(s.SessionNo),
            StartAt: String(s.StartAt ?? ''),
            EndAt: String(s.EndAt ?? ''),
            ReservationId: s.ReservationId != null ? Number(s.ReservationId) : null,
            Notes: String(s.Notes ?? ''),
            SessionTitle: s.SubjectSession?.Title ?? s.EventSession?.Title ?? null,
          }))
          .sort((a, b) => (a.SessionNo ?? 0) - (b.SessionNo ?? 0))

        setSessions(list)
      } catch {
        setSessions([])
      } finally {
        if (!cancelled) setLoadingSessions(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [open, isEquipmentManager, selectedRequestId])

  // Load thiết bị KHẢ DỤNG theo khung thời gian StartAt/EndAt.
  // - Nếu có đặt trước: StartAt = thời gian StartAt của đặt trước (nếu có), ngược lại dùng hiện tại
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

        const startAtDt = loadedReservation?.StartAt ? dayjs(loadedReservation.StartAt) : dayjs()
        const endAtDt = returnedDueDate

        // BE yêu cầu EndAt > StartAt.
        // Nếu hạn trả không sau thời điểm bắt đầu, không gọi API.
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
            IsAvailable: true,
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
  }, [open, returnedDueDate, loadedReservation])

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

    const borrowStartEffective = loadedReservation?.StartAt ? dayjs(loadedReservation.StartAt) : dayjs()
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
    setLoadedReservation(null)
    setSessions([])
    setSelectedSessionId(null)
    setSessionSearch('')
    setSessionDropdownOpen(false)
    setSessionBorrowerOptions([])
    onClose()
  }

  const sessionSearchQ = sessionSearch.trim().toLowerCase()
  const filteredSessions = sessions.filter((s) => {
    if (!sessionSearchQ) return true
    const noStr = String(s.SessionNo ?? '').toLowerCase()
    const label = sessionOptionLabel(s).toLowerCase()
    const sidStr = String(s.SessionId ?? '').toLowerCase()
    return noStr.includes(sessionSearchQ) || label.includes(sessionSearchQ) || sidStr.includes(sessionSearchQ)
  })
  const selectedSession =
    selectedSessionId != null ? sessions.find((s) => s.SessionId === selectedSessionId) ?? null : null
  const selectedSessionLabel = selectedSession ? sessionOptionLabel(selectedSession) : ''

  const requestSearchQ = requestSearch.trim().toLowerCase()
  const filteredRequestOptions = requestOptions.filter((r) => {
    if (!requestSearchQ) return true
    const code = (r.requestCode ?? '').trim().toLowerCase()
    const name = (r.requestName ?? '').trim().toLowerCase()
    const idStr = String(r.requestId ?? '').trim().toLowerCase()
    return code.includes(requestSearchQ) || name.includes(requestSearchQ) || idStr.includes(requestSearchQ)
  })
  const selectedRequest =
    selectedRequestId != null ? requestOptions.find((r) => r.requestId === selectedRequestId) ?? null : null
  const selectedRequestLabel = selectedRequest
    ? (selectedRequest.requestCode ?? '').trim()
      ? `${selectedRequest.requestCode} - ${selectedRequest.requestName}`
      : selectedRequest.requestName || `Request #${selectedRequest.requestId}`
    : ''

  useEffect(() => {
    if (!requestDropdownOpen) return

    const onMouseDown = (e: MouseEvent) => {
      const el = requestPickerRef.current
      if (!el) return
      if (e.target instanceof Node && el.contains(e.target)) return
      setRequestDropdownOpen(false)
      setRequestSearch('')
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setRequestDropdownOpen(false)
        setRequestSearch('')
      }
    }

    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [requestDropdownOpen])

  useEffect(() => {
    if (!sessionDropdownOpen) return

    const onMouseDown = (e: MouseEvent) => {
      const el = sessionPickerRef.current
      if (!el) return
      if (e.target instanceof Node && el.contains(e.target)) return
      setSessionDropdownOpen(false)
      setSessionSearch('')
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSessionDropdownOpen(false)
        setSessionSearch('')
      }
    }

    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [sessionDropdownOpen])

  useEffect(() => {
    if (!sessionBorrowerDropdownOpen) return

    const onMouseDown = (e: MouseEvent) => {
      const el = sessionBorrowerPickerRef.current
      if (!el) return
      if (e.target instanceof Node && el.contains(e.target)) return
      setSessionBorrowerDropdownOpen(false)
      setSessionBorrowerSearch('')
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSessionBorrowerDropdownOpen(false)
        setSessionBorrowerSearch('')
      }
    }

    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [sessionBorrowerDropdownOpen])

  const pickSession = async (sid: number | null) => {
    setError('')
    setLoadedReservation(null)
    setSelectedSessionId(sid)
    setSessionDropdownOpen(false)
    setSessionSearch('')
    setSessionBorrowerOptions([])
    setBorrowedByMemberId(null)
    setBorrowerSearch('')
    setBorrowerOptions([])
    setSelectedEquipmentIds([])
    setSessionIds(sid != null ? [sid] : [])
    setReturnedDueDate(null)

    if (sid == null) return

    const opt = sessions.find((s) => s.SessionId === sid) ?? null

    // Luôn load danh sách người mượn theo assignment của session (nếu có).
    void loadBorrowersFromSession(sid)

    const reservationId = opt?.ReservationId != null ? Number(opt.ReservationId) : null
    if (reservationId && reservationId > 0) {
      await handleLoadReservation(reservationId)
    } else {
      // Không có đặt trước -> tạo tự do (user tự chọn hạn trả & thiết bị)
      setLoadedReservation(null)
      setReturnedDueDate(null)
      setSelectedEquipmentIds([])
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Tạo phiếu mượn thiết bị"
      description="Chọn buổi (nếu có). Nếu buổi có đặt trước thì tự điền thông tin; nếu không thì tạo tự do."
      className="max-w-4xl w-[min(96vw,56rem)] max-h-[92vh]"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {isEquipmentManager && (
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1.5 min-w-[240px] flex-1" ref={requestPickerRef}>
              <Label className="text-black font-medium">Yêu cầu</Label>
              <div className="relative">
                <Input
                  placeholder={loadingRequests ? 'Đang tải yêu cầu...' : 'Chọn yêu cầu (tuỳ chọn)'}
                  disabled={loadingRequests || requestOptions.length === 0}
                  value={requestDropdownOpen ? requestSearch : selectedRequestLabel}
                  autoComplete="off"
                  onChange={(e) => setRequestSearch(e.target.value)}
                  onFocus={() => {
                    if (loadingRequests) return
                    if (requestOptions.length === 0) return
                    setRequestDropdownOpen(true)
                    setRequestSearch('')
                  }}
                  className="h-9 text-xs text-black border-gray-200"
                />

                {requestDropdownOpen && (
                  <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow">
                    <button
                      type="button"
                      className={cn(
                        'w-full text-left px-3 py-2 text-sm hover:bg-gray-50',
                        selectedRequestId == null && 'bg-[#2197C0]/10',
                      )}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        setSelectedRequestId(null)
                        setRequestDropdownOpen(false)
                        setRequestSearch('')
                      }}
                    >
                      Không chọn request (tạo tự do)
                    </button>
                    {filteredRequestOptions.map((r) => {
                      const label = (r.requestCode ?? '').trim()
                        ? `${r.requestCode} - ${r.requestName}`
                        : r.requestName || `Request #${r.requestId}`
                      return (
                        <button
                          key={r.requestId}
                          type="button"
                          className={cn(
                            'w-full text-left px-3 py-2 text-sm hover:bg-gray-50',
                            selectedRequestId === r.requestId && 'bg-[#2197C0]/10',
                          )}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            setSelectedRequestId(r.requestId)
                            setRequestDropdownOpen(false)
                            setRequestSearch('')
                          }}
                        >
                          {label}
                        </button>
                      )
                    })}
                    {requestSearchQ && filteredRequestOptions.length === 0 && (
                      <div className="px-3 pb-2 text-xs text-gray-500">Không tìm thấy yêu cầu phù hợp.</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            {/* Session */}
            <div className="space-y-1.5 min-w-[240px] flex-1">
              <Label className="text-black font-medium">Buổi </Label>
              <div ref={sessionPickerRef} className="relative">
                <Input
                  placeholder={
                    selectedRequestId == null
                      ? 'Chọn yêu cầu trước'
                      : loadingSessions
                        ? 'Đang tải buổi ...'
                        : 'Chọn buổi (tuỳ chọn)'
                  }
                  disabled={selectedRequestId == null || loadingSessions || sessions.length === 0}
                  value={sessionDropdownOpen ? sessionSearch : selectedSessionLabel}
                  autoComplete="off"
                  onChange={(e) => setSessionSearch(e.target.value)}
                  onFocus={() => {
                    if (selectedRequestId == null) return
                    if (loadingSessions) return
                    if (sessions.length === 0) return
                    setSessionDropdownOpen(true)
                    setSessionSearch('')
                  }}
                  className="h-9 text-xs text-black border-gray-200"
                />

                {sessionDropdownOpen && (
                  <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow">
                    {filteredSessions.map((s) => (
                      <button
                        key={s.SessionId}
                        type="button"
                        className={cn(
                          'w-full text-left px-3 py-2 text-sm hover:bg-gray-50',
                          selectedSessionId === s.SessionId && 'bg-[#2197C0]/10',
                        )}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          void pickSession(s.SessionId)
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate">{sessionOptionLabel(s)}</span>
                          {s.ReservationId != null && Number(s.ReservationId) > 0 && (
                            <span className="shrink-0 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                              Đặt trước
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                    {sessionSearchQ && filteredSessions.length === 0 && (
                      <div className="px-3 pb-2 text-xs text-gray-500">Không tìm thấy buổi phù hợp.</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {loadedReservation && (
          <div className="rounded-lg border border-[#2197C0]/30 bg-[#2197C0]/5 px-4 py-3 text-sm text-gray-800">
            <div className="font-medium text-black">Thông tin đặt trước</div>
            <div className="mt-1 grid gap-1 text-xs sm:grid-cols-2">
              <span>
                <span className="text-gray-600">Bắt đầu: </span>
                <span className="font-semibold tabular-nums text-[#2197C0]">
                  {loadedReservation.StartAt ? dayjs(loadedReservation.StartAt).format('DD/MM/YYYY HH:mm') : '—'}
                </span>
              </span>
              <span>
                <span className="text-gray-600">Kết thúc: </span>
                <span className="font-semibold tabular-nums text-[#2197C0]">
                  {loadedReservation.EndAt ? dayjs(loadedReservation.EndAt).format('DD/MM/YYYY HH:mm') : '—'}
                </span>
              </span>
              {sessionIds.length > 0 && (
                <span className="sm:col-span-2">Buổi gắn kèm: {sessionIds.join(', ')}</span>
              )}
            </div>
          </div>
        )}
            <div className="space-y-1.5">
          <Label className="text-black font-medium">
            Người mượn <span className="text-red-500">*</span>
          </Label>
          {isEquipmentManager && selectedSessionId != null && sessionBorrowerOptions.length > 0 ? (
            <div className="space-y-2">
              <div ref={sessionBorrowerPickerRef} className="relative">
                <Input
                  placeholder="Tìm người mượn trong session..."
                  disabled={loadingSessionBorrowers}
                  value={sessionBorrowerDropdownOpen ? sessionBorrowerSearch : borrowerSearch}
                  autoComplete="off"
                  onChange={(e) => setSessionBorrowerSearch(e.target.value)}
                  onFocus={() => {
                    setSessionBorrowerDropdownOpen(true)
                    setSessionBorrowerSearch('')
                  }}
                  className="h-9 text-xs text-black border-gray-200"
                />

                {sessionBorrowerDropdownOpen && (
                  <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow">
                    {(() => {
                      const list = sessionBorrowerOptions
                      const q = sessionBorrowerSearch.trim().toLowerCase()
                      const filtered = !q
                        ? list
                        : list.filter((m) => {
                            const name = (m.fullName ?? '').toLowerCase()
                            const email = (m.email ?? '').toLowerCase()
                            const idStr = String(m.memberId ?? '').toLowerCase()
                            return name.includes(q) || email.includes(q) || idStr.includes(q)
                          })

                      if (loadingSessionBorrowers) {
                        return (
                          <div className="px-3 py-2 text-xs text-gray-500">
                            Đang tải danh sách người mượn...
                          </div>
                        )
                      }
                      if (filtered.length === 0) {
                        return (
                          <div className="px-3 py-2 text-xs text-gray-500">
                            Không tìm thấy người phù hợp.
                          </div>
                        )
                      }

                      return filtered.map((m) => (
                        <button
                          key={m.memberId}
                          type="button"
                          className={cn(
                            'w-full text-left px-3 py-2 text-sm hover:bg-gray-50',
                            borrowedByMemberId === m.memberId && 'bg-[#2197C0]/10',
                          )}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            setBorrowedByMemberId(m.memberId)
                            setBorrowerSearch(m.fullName ?? String(m.memberId))
                            setSessionBorrowerDropdownOpen(false)
                            setSessionBorrowerSearch('')
                          }}
                        >
                          <div className="font-medium text-black">{m.fullName}</div>
                          <div className="text-xs text-gray-500">
                            {(m.email ?? '').trim() || `Member #${m.memberId}`}
                          </div>
                        </button>
                      ))
                    })()}
                  </div>
                )}
              </div>
            </div>
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
            Thiết bị (nhập mã, phân cách bởi dấu phẩy hoặc khoảng trắng){' '}
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
              placeholder="Tìm theo tên / mã"
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
                    return (
                      (eq.EquipmentName ?? '').toLowerCase().includes(q) ||
                      (eq.EquipmentCode ?? '').toLowerCase().includes(q)
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

