import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { DatePicker, Select as AntdSelect, InputNumber, message, Modal } from 'antd'
import { ExclamationCircleFilled } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Trash2,
  Paperclip,
  FileText,
  Send,
  BookOpen,
  GraduationCap,
  Loader2,
} from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Badge } from '@/shared/components/ui/badge'
import { cn } from '@/shared/lib/utils'
import { getRequestStatusLabel } from '@/constants/status'

import type { CreateRequestPayload } from '../request'
import type { SubjectListItem } from '@/modules/subject/subject'
import type { SourceType, SessionFormItem } from '../createRequestTypes'
import { useRequestSubjectSource } from '../hooks/useRequestSubjectSource'
import { useRequestCourseSource } from '../hooks/useRequestCourseSource'
import { useRequestEventSource } from '../hooks/useRequestEventSource'
import { useLoadRequestSessions } from '../hooks/useLoadRequestSessions'
import { useCreateRequestSchedule } from '../hooks/useCreateRequestSchedule'
import { useProgramCoordinatorId } from '../hooks/useProgramCoordinatorId'
import requestApi from '../api/requestApi'
import attachmentApi from '../api/attachmentApi'

type RequestSessionFormHydrate = {
  sessionId?: number
  sessionNo: number
  startAt?: string
  endAt?: string
  location?: string
  isOnline?: boolean | null
  teachersRequired?: number | null
  tasRequired?: number | null
  notes?: string | null
}

export default function CreateRequestPage() {
  const navigate = useNavigate()
  const programCoordinatorId = useProgramCoordinatorId()
  const { id } = useParams<{ id?: string }>()
  const isEditMode = Boolean(id)
  const [isHydratingEdit, setIsHydratingEdit] = useState(isEditMode)
  const [editRequestStatus, setEditRequestStatus] = useState<string | number | null>(null)
  const canEditOrDelete = isEditMode && getRequestStatusLabel(editRequestStatus) === 'Chờ duyệt'

  const [requestName, setRequestName] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [startDate, setStartDate] = useState<Dayjs | undefined>()
  const [subjectId, setSubjectId] = useState<number | undefined>()
  const [courseId, setCourseId] = useState<number | undefined>()
  const [eventId, setEventId] = useState<number | undefined>()
  const [note, setNote] = useState('')

  const [sourceType, setSourceType] = useState<SourceType>('subject')
  const [courseSubjects, setCourseSubjects] = useState<SubjectListItem[]>([])
  const [sessions, setSessions] = useState<SessionFormItem[]>([])
  const [submitLoading, setSubmitLoading] = useState(false)
  const [defaultLocation, setDefaultLocation] = useState('')
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Tô màu theo type request: subject (xanh), course (tím), event (cam)
  const accentSolidBgClass =
    sourceType === 'subject'
      ? 'bg-[#2197C0]'
      : sourceType === 'course'
        ? 'bg-[#8B5CF6]'
        : 'bg-[#F59E0B]'
  const accentSoftBgClass =
    sourceType === 'subject'
      ? 'bg-[#2197C0]/10'
      : sourceType === 'course'
        ? 'bg-[#8B5CF6]/10'
        : 'bg-[#F59E0B]/10'
  const accentTextClass =
    sourceType === 'subject'
      ? 'text-[#2197C0]'
      : sourceType === 'course'
        ? 'text-[#8B5CF6]'
        : 'text-[#F59E0B]'
  const accentBorderSoftClass =
    sourceType === 'subject'
      ? 'border-[#2197C0]/20'
      : sourceType === 'course'
        ? 'border-[#8B5CF6]/20'
        : 'border-[#F59E0B]/20'
  const accentBorderSolidClass =
    sourceType === 'subject'
      ? 'border-[#2197C0]'
      : sourceType === 'course'
        ? 'border-[#8B5CF6]'
        : 'border-[#F59E0B]'
  const accentHoverBorderTextClass =
    sourceType === 'subject'
      ? 'hover:border-[#2197C0] hover:text-[#2197C0]'
      : sourceType === 'course'
        ? 'hover:border-[#8B5CF6] hover:text-[#8B5CF6]'
        : 'hover:border-[#F59E0B] hover:text-[#F59E0B]'

  const { subjects, loading: loadingSubjects } = useRequestSubjectSource(sourceType)
  const { courses, loading: loadingCourses } = useRequestCourseSource(sourceType)
  const { events, loading: loadingEvents } = useRequestEventSource(sourceType)
  const {
    loadSubjectSessions,
    loadEventSessions,
    loadCourseSubjects,
    loading: loadingSessions,
  } = useLoadRequestSessions()
  const {
    scheduleMode,
    setScheduleMode,
    gapDays,
    setGapDays,
    applyAutoSchedule,
    calculateEndTime,
  } = useCreateRequestSchedule()

  useEffect(() => {
    if (isHydratingEdit) return
    if (!startDate || sessions.length === 0) return
    setSessions((prev) => applyAutoSchedule(startDate, prev))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleMode, gapDays, isHydratingEdit])

  const computeDurationFromStartEnd = (start: Dayjs, end: Dayjs): string => {
    const diffSeconds = end.diff(start, 'second')
    const safeSeconds = Number.isFinite(diffSeconds) ? Math.max(0, diffSeconds) : 0
    const h = Math.floor(safeSeconds / 3600)
    const m = Math.floor((safeSeconds % 3600) / 60)
    const s = safeSeconds % 60
    const pad2 = (n: number) => String(n).padStart(2, '0')
    return `${pad2(h)}:${pad2(m)}:${pad2(s)}`
  }

  useEffect(() => {
    if (!isEditMode || !id) return
    let cancelled = false

    const run = async () => {
      try {
        setIsHydratingEdit(true)

        const detail = await requestApi.getById(Number(id))

        setEditRequestStatus((detail as any)?.status ?? null)
        setRequestName(detail.requestName ?? '')
        setCustomerName(detail.customerName ?? '')
        setNote(((detail as any)?.note ?? (detail as any)?.notes ?? '') as string)

        const rawSessions = (detail.sessions ?? []) as Array<
          RequestSessionFormHydrate
        >

        const firstSession = rawSessions[0]
        const inferredStart = firstSession?.startAt
          ? dayjs(firstSession.startAt)
          : detail.startDate
            ? dayjs(detail.startDate)
            : null

        const inferredSourceType: SourceType = detail.subjectId
          ? 'subject'
          : detail.courseId
            ? 'course'
            : 'event'

        setSourceType(inferredSourceType)
        setSubjectId(inferredSourceType === 'subject' ? detail.subjectId ?? undefined : undefined)
        setCourseId(inferredSourceType === 'course' ? detail.courseId ?? undefined : undefined)
        setEventId(inferredSourceType === 'event' ? detail.eventId ?? undefined : undefined)

        const defaultLoc = (firstSession?.location ?? '') as string
        setDefaultLocation(defaultLoc)

        let templateSessions: SessionFormItem[] = []
        if (inferredSourceType === 'subject' && detail.subjectId) {
          templateSessions = await loadSubjectSessions(detail.subjectId, defaultLoc)
        } else if (inferredSourceType === 'course' && detail.courseId) {
          const list = await loadCourseSubjects(detail.courseId)
          if (cancelled) return
          setCourseSubjects(list)

          const combinedSessions = (
            await Promise.all(
              list.map(async (s) => {
                const subjectSessions = await loadSubjectSessions(s.subjectId, defaultLoc)
                return subjectSessions
              }),
            )
          ).flat()

          templateSessions = combinedSessions.map((s, idx) => ({
            ...s,
            sessionNo: idx + 1,
          }))
        } else if (inferredSourceType === 'event' && detail.eventId) {
          templateSessions = await loadEventSessions(detail.eventId, defaultLoc)
        }

        const patched = templateSessions.map((ts, idx) => {
          const ds =
            rawSessions.find((s) => s.sessionNo === ts.sessionNo) ??
            rawSessions[idx]

          if (!ds) return ts

          const startAt = ds.startAt ? dayjs(ds.startAt) : ts.startAt
          const endAt = ds.endAt ? dayjs(ds.endAt) : ts.endAt

          const location = (ds.location ?? '') as string
          const isOnline = Boolean(ds.isOnline)
          const notes = ((ds as any)?.notes ?? '') as string

          const duration =
            startAt && endAt && startAt.isValid() && endAt.isValid()
              ? computeDurationFromStartEnd(startAt, endAt)
              : ts.duration

          return {
            ...ts,
            startAt: startAt ?? ts.startAt,
            endAt: endAt ?? ts.endAt,
            duration,
            notes,
            teachersRequired: ds.teachersRequired ?? ts.teachersRequired,
            tasRequired: ds.tasRequired ?? ts.tasRequired,
            location,
            isOnline,
            usesDefaultLocation: location.trim() === (defaultLoc ?? '').trim(),
          }
        })

        if (!cancelled) {
          setSessions(patched)
          setStartDate(inferredStart ?? undefined)
        }
      } finally {
        if (!cancelled) setIsHydratingEdit(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [id, isEditMode, loadCourseSubjects, loadEventSessions, loadSubjectSessions])

  const handleSourceTypeChange = (type: SourceType) => {
    setSourceType(type)
    setSessions([])
    setSubjectId(undefined)
    setCourseId(undefined)
    setEventId(undefined)
    setCourseSubjects([])
  }

  const handleDefaultLocationChange = (value: string) => {
    setDefaultLocation(value)
    setSessions((prev) =>
      prev.map((s) => (s.usesDefaultLocation ? { ...s, location: value } : s))
    )
  }

  const handleSubjectChange = async (value: number | undefined) => {
    setSubjectId(value)
    if (sourceType === 'subject') setCourseId(undefined)
    setEventId(undefined)
    if (!value) {
      setSessions([])
      return
    }
    const mapped = await loadSubjectSessions(value, defaultLocation)
    setSessions(startDate ? applyAutoSchedule(startDate, mapped) : mapped)
  }

  const handleCourseChange = async (value: number | undefined) => {
    setCourseId(value)
    setSubjectId(undefined)
    setEventId(undefined)
    setSessions([])
    if (!value) {
      setCourseSubjects([])
      return
    }
    const list = await loadCourseSubjects(value)
    setCourseSubjects(list)

    // Khi chọn "Khóa học" => phải tạo đủ sessions của TẤT CẢ môn trong khóa
    const combinedSessions = (
      await Promise.all(
        list.map(async (s) => {
          const subjectSessions = await loadSubjectSessions(s.subjectId, defaultLocation)
          return subjectSessions
        }),
      )
    ).flat()

    // Renumber sessionNo liên tục để hiển thị gọn & tránh trùng số buổi
    const normalizedSessions: SessionFormItem[] = combinedSessions.map((s, idx) => ({
      ...s,
      sessionNo: idx + 1,
    }))

    setSessions(startDate ? applyAutoSchedule(startDate, normalizedSessions) : normalizedSessions)
  }

  const handleEventChange = async (value: number | undefined) => {
    setEventId(value)
    setSubjectId(undefined)
    setCourseId(undefined)
    setSessions([])
    if (!value) return
    const mapped = await loadEventSessions(value, defaultLocation)
    setSessions(startDate ? applyAutoSchedule(startDate, mapped) : mapped)
  }

  const handleSubmit = () => {
    if (isEditMode && !canEditOrDelete) {
      message.error('Chỉ có thể chỉnh sửa/xóa khi yêu cầu đang ở trạng thái Chờ duyệt.')
      return
    }
    if (!requestName.trim()) {
      message.error('Vui lòng nhập tên yêu cầu.')
      return
    }
    if (!customerName.trim()) {
      message.error('Vui lòng nhập tên khách hàng.')
      return
    }

    if (!startDate) {
      message.error('Vui lòng chọn ngày bắt đầu.')
      return
    }

    const finalSubjectId = sourceType === 'subject' ? subjectId ?? null : null
    const finalCourseId = sourceType === 'course' ? courseId ?? null : null
    const finalEventId = sourceType === 'event' ? eventId ?? null : null

    if (sourceType === 'subject' && !finalSubjectId) {
      message.error('Vui lòng chọn môn học.')
      return
    }
    if (sourceType === 'course' && !finalCourseId) {
      message.error('Vui lòng chọn khóa học.')
      return
    }
    if (sourceType === 'event' && !finalEventId) {
      message.error('Vui lòng chọn sự kiện.')
      return
    }

    const missingSessionTime = sessions.some((s) => !s.startAt || !s.endAt)
    if (sessions.length === 0) {
      message.error('Vui lòng chọn ngày giờ cho yêu cầu (tạo ít nhất 1 buổi).')
      return
    }
    if (sessions.length > 0 && missingSessionTime) {
      message.error('Vui lòng chọn ngày giờ bắt đầu cho tất cả các buổi học.')
      return
    }

    const payload: CreateRequestPayload = {
      programCoordinatorId,
      subjectId: finalSubjectId,
      courseId: finalCourseId,
      eventId: finalEventId,
      startDate: startDate ? startDate.format('YYYY-MM-DD') : '',
      requestName,
      customerName,
      note,
      sessions: sessions.map((s) => ({
        sessionNo: s.sessionNo,
        startAt: s.startAt!.format('YYYY-MM-DDTHH:mm:ss'),
        endAt: s.endAt!.format('YYYY-MM-DDTHH:mm:ss'),
        notes: s.notes ?? '',
        teachersRequired: s.teachersRequired,
        tasRequired: s.tasRequired,
        location: s.location ?? '',
        isOnline: s.isOnline,
        subjectSessionId: s.subjectSessionId,
        eventSessionId: s.eventSessionId,
        borrowingId: null,
        reservationId: null,
      })),
      // Tài liệu đính kèm sẽ upload/tạo sau khi tạo Request thành công.
    }

    const formatDateTime = (d?: Dayjs) => (d ? d.format('DD/MM/YYYY HH:mm') : '—')
    const sourceName =
      sourceType === 'subject'
        ? subjects.find((s) => s.subjectId === subjectId)?.subjectName
        : sourceType === 'course'
          ? courses.find((c) => c.courseId === courseId)?.courseName
          : events.find((e) => e.eventId === eventId)?.eventName

    const courseSubjectName =
      sourceType === 'course'
        ? courseSubjects.find((s) => s.subjectId === subjectId)?.subjectName
        : undefined

    const accentColor =
      sourceType === 'subject' ? '#2197C0' : sourceType === 'course' ? '#8B5CF6' : '#F59E0B'

    Modal.confirm({
      title: isEditMode ? 'Xác nhận cập nhật yêu cầu' : 'Xác nhận tạo yêu cầu',
      icon: <ExclamationCircleFilled className="text-[#F59E0B]" />,
      width: 920,
      centered: true,
      bodyStyle: {
        maxHeight: 'calc(100vh - 220px)',
        overflowY: 'auto',
      },
      okText: isEditMode ? 'Cập nhật yêu cầu' : 'Tạo yêu cầu',
      cancelText: 'Chỉnh sửa',
      okButtonProps: {
        className:
          'bg-[#2197C0] hover:bg-[#208AAE] border-0 text-white font-medium rounded-lg px-4 shadow-sm',
        style: {
          backgroundColor: '#2197C0',
          borderColor: '#2197C0',
          color: '#FFFFFF',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 3px 10px rgba(33,151,192,0.18)',
        },
      },
      cancelButtonProps: {
        className: 'border border-gray-300 bg-white text-black hover:bg-gray-100 font-medium',
        style: {
          borderColor: '#D1D5DB',
          color: '#111827',
          backgroundColor: '#FFFFFF',
        },
      },
      content: (
        <div className="w-full">
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div
              className="px-4 py-3 flex items-center gap-3"
              style={{ background: `linear-gradient(90deg, ${accentColor}22, rgba(255,255,255,1) 70%)` }}
            >
              
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900">Xác nhận tạo yêu cầu</div>
                <div className="text-[11px] text-gray-500 truncate">Vui lòng kiểm tra lần cuối trước khi tạo.</div>
              </div>
            </div>

            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-[1fr,1.2fr] gap-4">
            {/* Bill summary */}
            <div className="space-y-3">
              <div className="rounded-xl border border-gray-200 bg-white p-4 relative overflow-hidden">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="text-sm text-gray-900 font-medium">Thông tin yêu cầu</div>
                  <div
                    className="text-[11px] border rounded-full px-2 py-0.5"
                    style={{ borderColor: `${accentColor}33`, backgroundColor: `${accentColor}10`, color: accentColor }}
                  >
                    {sourceType === 'subject' ? 'Môn học' : sourceType === 'course' ? 'Khóa học' : 'Sự kiện'}
                  </div>
                </div>
                <div className="space-y-2 text-[13px]">
                  <div>
                    <span className="text-gray-500">Tên yêu cầu:</span> <span className="text-gray-900 font-medium">{requestName}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Khách hàng:</span> <span className="text-gray-900 font-medium">{customerName}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Loại:</span>{' '}
                    <span className="text-gray-900 font-medium">
                      {sourceType === 'subject' ? 'Môn học' : sourceType === 'course' ? 'Khóa học' : 'Sự kiện'}
                      {sourceName ? ` - ${sourceName}` : ''}
                      {sourceType === 'course' && courseSubjectName ? ` (Môn trong khóa: ${courseSubjectName})` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Ngày bắt đầu:</span>{' '}
                    <span className="text-gray-900 font-medium">{startDate.format('DD/MM/YYYY')}</span>
                  </div>
                </div>

                {note?.trim() ? (
                  <div className="mt-3 rounded-lg bg-gray-50 border border-gray-200 p-3 text-[13px]">
                    <div className="text-gray-500 font-medium">Ghi chú</div>
                    <div className="text-gray-900">{note.trim()}</div>
                  </div>
                ) : null}
              </div>

              <div className="rounded-xl bg-[#2197C0]/5 border border-[#2197C0]/15 p-3 text-[11px] text-gray-600">
                Hệ thống sẽ kiểm tra số phiên và thời lượng theo cấu hình môn/khóa/sự kiện trước khi tạo.
              </div>
            </div>

            {/* Sessions list */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-900">Lịch các buổi</div>
                {sessions.length > 0 ? (
                  <div className="text-[11px] text-gray-600 rounded-full border border-gray-200 px-2 py-0.5 bg-white">
                    {sessions.length} buổi
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                {sessions.map((s) => (
                  <div
                    key={`${s.subjectSessionId ?? s.eventSessionId}-${s.sessionNo}`}
                    className="relative rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: `${accentColor}55` }} />

                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-gray-900 truncate">
                          Buổi {s.sessionNo}: {s.title}
                        </div>
                        <div className="text-[13px] text-gray-700 mt-1 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {formatDateTime(s.startAt)} - {formatDateTime(s.endAt)}
                        </div>
                      </div>
                      {s.isOnline ? (
                        <div
                          className={cn(
                            'shrink-0 text-[11px] border px-2 py-0.5 rounded-full',
                            accentSoftBgClass,
                            accentTextClass,
                            accentBorderSoftClass
                          )}
                        >
                          Online
                        </div>
                      ) : (
                        <div className="shrink-0 text-[11px] text-gray-600 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
                          Offline
                        </div>
                      )}
                    </div>

                    <div className="mt-2 text-[13px] text-gray-700 space-y-1">
                      <div>
                        <span className="text-gray-500 inline-flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          Địa điểm:
                        </span>{' '}
                        {s.location?.trim() ? s.location.trim() : '—'}
                      </div>
                      <div>
                        <span className="text-gray-500">GV/TG:</span> {s.teachersRequired} / {s.tasRequired}
                      </div>
                      {s.notes?.trim() ? (
                        <div className="text-gray-600 italic">Ghi chú: {s.notes.trim()}</div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
              </div>
            </div>
          </div>
        </div>
      ),
      onOk: async () => {
        setSubmitLoading(true)
        try {
          let requestId: number
          if (isEditMode) {
            requestId = id ? Number(id) : NaN
            if (!Number.isFinite(requestId)) throw new Error('Missing request id')
            await requestApi.update(requestId, payload)
          } else {
            const created = await requestApi.create(payload)
            requestId = created.requestId
          }

          // 1) Upload file từ máy
          if (attachmentFiles.length > 0) {
            await attachmentApi.uploadAttachmentsForRequest(requestId, attachmentFiles)
          }

          message.success(isEditMode ? 'Cập nhật yêu cầu thành công.' : 'Tạo yêu cầu thành công.')
          navigate('/pc/requests')
        } catch (err: unknown) {
          const e = err as Record<string, unknown>
          const apiMessage =
            (typeof err === 'string' && err) ||
            (e?.message as string) ||
            (e?.detail as string) ||
            (e?.title as string) ||
            (e?.error as string) ||
            (Array.isArray(e?.errors) && (e.errors[0] as string)) ||
            ((e?.response as Record<string, unknown>)?.data as string)
          message.error((apiMessage as string) ?? (isEditMode ? 'Cập nhật yêu cầu thất bại.' : 'Tạo yêu cầu thất bại.'))
        } finally {
          setSubmitLoading(false)
        }
      },
    })
  }

  const updateSession = (index: number, patch: Partial<SessionFormItem>) => {
    setSessions((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: 'var(--content-height, 100vh)' }}>
      {/* Header */}
      <div className="shrink-0 px-6 pt-6 pb-3">
        <div className="flex justify-between bg-white px-6 py-4 rounded-xl border shadow-sm items-center">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/pc/requests')}
              className="!p-0 w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-black bg-white hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{isEditMode ? 'Chỉnh sửa yêu cầu' : 'Tạo yêu cầu mới'}</h2>
              <p className="text-xs text-gray-500">
                Điền thông tin yêu cầu giảng dạy hoặc sự kiện {isEditMode ? '(từ bản ghi cũ)' : ''}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" className="border-gray-300 text-black hover:bg-gray-100" onClick={() => navigate('/pc/requests')}>
              Huỷ bỏ
            </Button>
            {isEditMode && canEditOrDelete && (
              <Button
                variant="outline"
                size="sm"
                className="border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
                onClick={() => {
                  if (!id) return
                  Modal.confirm({
                    title: 'Xác nhận xóa yêu cầu',
                    icon: <ExclamationCircleFilled className="text-rose-500" />,
                    okText: 'Xóa',
                    cancelText: 'Hủy',
                    okButtonProps: {
                      className: 'bg-rose-500 hover:bg-rose-600 border-0 text-white font-medium rounded-lg px-4 shadow-sm',
                      style: { color: '#FFFFFF' },
                    },
                    content: 'Yêu cầu sẽ bị xóa vĩnh viễn. Bạn có chắc không?',
                    onOk: async () => {
                      setSubmitLoading(true)
                      try {
                        await requestApi.remove(Number(id))
                        message.success('Xóa yêu cầu thành công.')
                        navigate('/pc/requests')
                      } catch (err: unknown) {
                        const e = err as Record<string, unknown>
                        const apiMessage =
                          (typeof err === 'string' && err) ||
                          (e?.message as string) ||
                          (e?.detail as string) ||
                          (e?.title as string) ||
                          (e?.error as string) ||
                          (Array.isArray(e?.errors) && (e.errors[0] as string)) ||
                          ((e?.response as Record<string, unknown>)?.data as string)
                        message.error((apiMessage as string) ?? 'Xóa yêu cầu thất bại.')
                      } finally {
                        setSubmitLoading(false)
                      }
                    },
                  })
                }}
              >
                Xóa yêu cầu
              </Button>
            )}
            <Button
              size="sm"
              className="bg-[#2197C0] hover:bg-[#208AAE] text-white"
              onClick={() => void handleSubmit()}
              disabled={submitLoading || isHydratingEdit || (isEditMode && !canEditOrDelete)}
            >
              {submitLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isEditMode ? 'Đang cập nhật...' : 'Đang tạo...'}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {isEditMode ? 'Cập nhật yêu cầu' : 'Tạo yêu cầu'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 px-6 pb-6">
        <div className="grid grid-cols-2 gap-5 h-full">
          {/* ========== Left Column – Form ========== */}
          <div className="bg-white rounded-xl border shadow-sm flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50/50 shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#2197C0]" />
                <h3 className="text-sm font-semibold text-gray-800">Thông tin yêu cầu</h3>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3.5 no-scrollbar">
              {/* Row: Tên + Khách hàng */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-600">
                    Tên yêu cầu <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="Ví dụ: Python cho AI - THPT Demo"
                    value={requestName}
                    onChange={(e) => setRequestName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-600">
                    Khách hàng <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="Ví dụ: THPT Demo"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
              </div>

              {/* Địa điểm mặc định */}
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600">Địa điểm mặc định</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    className="pl-9"
                    placeholder="Ví dụ: THPT Demo - Lab 101"
                    value={defaultLocation}
                    onChange={(e) => handleDefaultLocationChange(e.target.value)}
                  />
                </div>
              </div>

              {/* Nguồn yêu cầu */}
              <div className="border-t pt-3.5">
                <Label className="text-xs text-gray-600 mb-2 block">Loại yêu cầu</Label>
                <div className="flex gap-2">
                  {(
                    [
                      { value: 'subject', label: 'Môn học', icon: BookOpen, color: '#2197C0' },
                      { value: 'course', label: 'Khóa học', icon: GraduationCap, color: '#8B5CF6' },
                      { value: 'event', label: 'Sự kiện', icon: Calendar, color: '#F59E0B' },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg border text-xs font-medium transition-all',
                        sourceType === item.value
                          ? ''
                          : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                      )}
                      style={{
                        padding: '6px 12px',
                        ...(sourceType === item.value
                          ? { color: item.color, backgroundColor: `${item.color}0D`, borderColor: item.color }
                          : {}),
                      }}
                      onClick={() => handleSourceTypeChange(item.value)}
                    >
                      <item.icon className="w-3.5 h-3.5" />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic source selects */}
              {sourceType === 'subject' && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-600">
                    Chọn môn học <span className="text-red-500">*</span>
                  </Label>
                  <AntdSelect
                    showSearch
                    placeholder="Tìm và chọn môn học"
                    loading={loadingSubjects}
                    allowClear
                    style={{ width: '100%' }}
                    value={subjectId}
                    options={subjects.map((s) => ({
                      label: `${s.subjectName} - ${s.numberOfSession} buổi`,
                      value: s.subjectId,
                    }))}
                    filterOption={(input, option) =>
                      (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                    }
                    onChange={(v) => void handleSubjectChange(v)}
                  />
                </div>
              )}

              {sourceType === 'course' && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-600">
                    Chọn khóa học <span className="text-red-500">*</span>
                  </Label>
                  <AntdSelect
                    showSearch
                    placeholder="Tìm và chọn khóa học"
                    loading={loadingCourses}
                    allowClear
                    style={{ width: '100%' }}
                    value={courseId}
                    options={courses.map((c) => ({
                      label: c.numberOfSession != null ? `${c.courseName} - ${c.numberOfSession} buổi` : c.courseName,
                      value: c.courseId,
                    }))}
                    filterOption={(input, option) =>
                      (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                    }
                    onChange={(v) => void handleCourseChange(v)}
                  />
                </div>
              )}

              {sourceType === 'event' && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-600">
                    Chọn sự kiện <span className="text-red-500">*</span>
                  </Label>
                  <AntdSelect
                    showSearch
                    placeholder="Tìm và chọn sự kiện"
                    loading={loadingEvents}
                    allowClear
                    style={{ width: '100%' }}
                    value={eventId}
                    options={events.map((e) => ({
                      label: e.numberOfSession != null ? `${e.eventName} - ${e.numberOfSession} buổi` : e.eventName,
                      value: e.eventId,
                    }))}
                    filterOption={(input, option) =>
                      (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                    }
                    onChange={(v) => void handleEventChange(v)}
                  />
                </div>
              )}

              {/* Row: Ngày bắt đầu + Lặp lại */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-600">
                    Ngày bắt đầu <span className="text-red-500">*</span>
                  </Label>
                  <DatePicker
                    style={{ width: '100%' }}
                    format="DD/MM/YYYY"
                    placeholder="Chọn ngày"
                    value={startDate}
                    onChange={(value) => {
                      setStartDate(value ?? undefined)
                      if (value && sessions.length > 0) {
                        setSessions(applyAutoSchedule(value, sessions))
                      }
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-600">Lặp lại</Label>
                  <div className="flex gap-2">
                    <AntdSelect
                      style={{ flex: 1 }}
                      value={scheduleMode}
                      onChange={(v) => setScheduleMode(v)}
                      options={[
                        { label: 'Hàng ngày', value: 'daily' },
                        { label: 'Mỗi tuần', value: 'weekly' },
                        { label: 'Cách N ngày', value: 'everyNDays' },
                      ]}
                    />
                    {scheduleMode === 'everyNDays' && (
                      <InputNumber
                        min={1}
                        value={gapDays}
                        onChange={(v) => setGapDays(v ?? 1)}
                        style={{ width: 100 }}
                        addonAfter="ngày"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Tài liệu đính kèm */}
              <div className="border-t pt-3.5">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs text-gray-600 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5" />
                    Tài liệu đính kèm
                  </Label>
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = e.target.files
                        const picked = files ? Array.from(files) : []
                        if (picked.length === 0) return
                        setAttachmentFiles((prev) => [...prev, ...picked])
                        // Reset để chọn cùng file vẫn trigger onChange
                        e.currentTarget.value = ''
                      }}
                    />
                    <button
                      type="button"
                      className="text-xs text-[#2197C0] hover:text-[#208AAE] font-medium flex items-center gap-1"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Chọn file từ máy
                    </button>
                    {attachmentFiles.length > 0 && (
                      <Badge className="bg-[#2197C0]/10 text-[#2197C0] border-0 text-[11px]">
                        {attachmentFiles.length} file
                      </Badge>
                    )}
                  </div>
                </div>
                {attachmentFiles.length === 0 && (
                  <p className="text-xs text-gray-400 italic">Chưa có tài liệu đính kèm</p>
                )}

                {attachmentFiles.length > 0 && (
                  <div className="space-y-2">
                    {attachmentFiles.map((file, index) => (
                      <div key={`${file.name}-${index}`} className="flex gap-2 items-center">
                        <span className="text-xs flex-1 text-gray-900 truncate" title={file.name}>
                          {file.name}
                        </span>
                        <button
                          type="button"
                          className="text-red-400 hover:text-red-600 shrink-0 p-1"
                          onClick={() => {
                            setAttachmentFiles((prev) => prev.filter((_, i) => i !== index))
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ghi chú */}
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600">Ghi chú</Label>
                <textarea
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-black shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  rows={3}
                  placeholder="Ghi chú chung cho yêu cầu"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* ========== Right Column – Sessions ========== */}
          <div className="bg-white rounded-xl border shadow-sm flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50/50 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className={cn('w-4 h-4', accentTextClass)} />
                  <h3 className="text-sm font-semibold text-gray-800">Lịch các buổi</h3>
                </div>
                {sessions.length > 0 && (
                  <Badge className={cn(accentSoftBgClass, accentTextClass, 'border-0 text-[11px]')}>
                    {sessions.length} buổi
                  </Badge>
                )}
              </div>
            </div>

            {/* Course subject chips */}
            {sourceType === 'course' && courseSubjects.length > 0 && (
              <div className="px-6 py-3 border-b bg-[#8B5CF6]/10 shrink-0">
                <p className="text-xs font-medium text-gray-600 mb-2">Môn học trong khóa</p>
                <div className="flex flex-wrap gap-1.5">
                  {courseSubjects.map((s) => (
                    <button
                      key={s.subjectId}
                      type="button"
                      className={cn(
                        'px-3 py-1 rounded-full text-xs font-medium transition-all border',
                        subjectId === s.subjectId
                          ? cn(accentSolidBgClass, 'text-white', accentBorderSolidClass)
                          : cn('bg-white text-gray-600 border-gray-200', accentHoverBorderTextClass)
                      )}
                      disabled
                      title="Trong chế độ Khóa học, hệ thống tự tạo đủ sessions của tất cả môn trong khóa."
                    >
                      {s.subjectName}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-6 py-4 no-scrollbar">
              {loadingSessions && (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Loader2 className={cn('w-8 h-8 animate-spin mb-2', accentTextClass)} />
                  <span className="text-xs">Đang tải danh sách buổi học...</span>
                </div>
              )}

              {!loadingSessions && sessions.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                    <Calendar className="w-8 h-8 text-gray-300" />
                  </div>
                  <span className="text-sm font-medium text-gray-400">Chưa có buổi</span>
                  <span className="text-xs text-gray-400 mt-1">
                    Chọn loại và ngày bắt đầu để sinh các buổi học
                  </span>
                </div>
              )}

              <div className="space-y-3">
                {sessions.map((s, index) => (
                  <div
                    key={`${s.subjectSessionId ?? s.eventSessionId}-${s.sessionNo}`}
                    className="rounded-lg border bg-gray-50/80 p-4 space-y-3 hover:border-gray-300 transition-colors"
                  >
                    {/* Session header */}
                    <div className="flex items-center gap-3">
                      <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0', accentSoftBgClass)}>
                        <span className={cn('text-xs font-bold', accentTextClass)}>{s.sessionNo}</span>
                      </div>
                      <span className="text-sm font-medium text-black truncate flex-1">
                        {s.title}
                      </span>
                      {s.isOnline && (
                        <Badge
                          className={cn(
                            accentSoftBgClass,
                            accentTextClass,
                            accentBorderSoftClass,
                            'text-[10px] px-2 py-0.5'
                          )}
                        >
                          Online
                        </Badge>
                      )}
                    </div>

                    {/* Date/time */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-gray-500">Ngày & giờ bắt đầu</Label>
                        <DatePicker
                          showTime
                          format="DD/MM/YYYY HH:mm"
                          placeholder="Chọn ngày giờ"
                          className="w-full"
                          value={s.startAt}
                          onChange={(value) => {
                            // Khi đổi startAt -> tự điền endAt dự tính theo duration.
                            if (!value) return
                            const end = calculateEndTime(value, s.duration)
                            updateSession(index, { startAt: value, endAt: end })
                          }}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-gray-500">Ngày & giờ kết thúc</Label>
                        <DatePicker
                          showTime
                          format="DD/MM/YYYY HH:mm"
                          placeholder="Chọn ngày giờ"
                          className="w-full"
                          value={s.endAt}
                          onChange={(value) => {
                            // Chặn endAt < startAt để tránh dữ liệu sai.
                            if (!value) {
                              updateSession(index, { endAt: undefined })
                              return
                            }
                            if (s.startAt && value.isBefore(s.startAt)) {
                              message.error('Giờ kết thúc không được nhỏ hơn giờ bắt đầu.')
                              return
                            }
                            // Người dùng có thể sửa thủ công endAt.
                            updateSession(index, { endAt: value })
                          }}
                        />
                      </div>

                      {/* Show duration for this session */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-gray-500">Thời lượng dự kiến</Label>
                        <div className="text-sm font-medium text-gray-900">
                          {s.duration?.includes(':') ? s.duration.split(':').slice(0, 2).join(':') : s.duration}
                        </div>
                      </div>
                    </div>

                    {/* Staff counts & location */}
                    <div className="grid grid-cols-4 gap-1">
                      {/* Labels row */}
                      <div className="col-span-1">
                        <Label className="text-xs text-gray-500">Số Giảng Viên</Label>
                      </div>
                      <div className="col-span-1">
                        <Label className="text-xs text-gray-500">Số Trợ Giảng</Label>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs text-gray-500">Địa điểm</Label>
                      </div>

                      {/* Inputs row */}
                      <div className="col-span-1">
                        <InputNumber
                          min={1}
                          value={s.teachersRequired}
                          onChange={(v) => updateSession(index, { teachersRequired: v ?? 1 })}
                          className="w-full"
                        />
                      </div>
                      <div className="col-span-1">
                        <InputNumber
                          min={0}
                          value={s.tasRequired}
                          onChange={(v) => updateSession(index, { tasRequired: v ?? 0 })}
                          className="w-full"
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          className="text-sm"
                          placeholder="Địa điểm"
                          value={s.location}
                          onChange={(e) => {
                            const raw = e.target.value
                            updateSession(
                              index,
                              raw.trim() === ''
                                ? { usesDefaultLocation: false, location: '' }
                                : { usesDefaultLocation: false, location: raw }
                            )
                          }}
                        />
                      </div>
                    </div>

                    {/* Notes */}
                    <textarea
                      className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-black shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                      placeholder="Ghi chú buổi học"
                      value={s.notes}
                      rows={2}
                      onChange={(e) => updateSession(index, { notes: e.target.value })}
                    />

                    {/* Online / Offline toggle */}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-500">Hình thức</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className={cn(
                            'px-2.5 py-0.5 rounded text-[11px] font-medium transition-all',
                            !s.isOnline
                              ? 'bg-gray-800 text-white'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          )}
                          onClick={() => updateSession(index, { isOnline: false })}
                        >
                          Offline
                        </button>
                        <button
                          type="button"
                          className={cn(
                            'px-2.5 py-0.5 rounded text-[11px] font-medium transition-all',
                            s.isOnline
                              ? cn(accentSolidBgClass, 'text-white')
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          )}
                          onClick={() => updateSession(index, { isOnline: true })}
                        >
                          Online
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
