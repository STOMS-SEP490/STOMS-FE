import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DatePicker, Select as AntdSelect, InputNumber, message } from 'antd'
import type { Dayjs } from 'dayjs'
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Plus,
  Trash2,
  Paperclip,
  FileText,
  Send,
  BookOpen,
  Globe,
  GraduationCap,
  Loader2,
} from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Badge } from '@/shared/components/ui/badge'
import { cn } from '@/shared/lib/utils'

import type { CreateRequestPayload } from '../request'
import type { SubjectListItem } from '@/modules/subject/subject'
import type { SourceType, SessionFormItem, AttachmentFormItem } from '../createRequestTypes'
import { useRequestSubjectSource } from '../hooks/useRequestSubjectSource'
import { useRequestCourseSource } from '../hooks/useRequestCourseSource'
import { useRequestEventSource } from '../hooks/useRequestEventSource'
import { useLoadRequestSessions } from '../hooks/useLoadRequestSessions'
import { useCreateRequestSchedule } from '../hooks/useCreateRequestSchedule'
import { useProgramCoordinatorId } from '../hooks/useProgramCoordinatorId'
import requestApi from '../api/requestApi'

export default function CreateRequestPage() {
  const navigate = useNavigate()
  const programCoordinatorId = useProgramCoordinatorId()

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
  const [attachments, setAttachments] = useState<AttachmentFormItem[]>([])

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
    if (!startDate || sessions.length === 0) return
    setSessions((prev) => applyAutoSchedule(startDate, prev))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleMode, gapDays])

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

  const handleSubmit = async () => {
    if (!requestName.trim()) {
      message.error('Vui lòng nhập tên yêu cầu.')
      return
    }
    if (!customerName.trim()) {
      message.error('Vui lòng nhập tên khách hàng.')
      return
    }

    const finalSubjectId =
      sourceType === 'subject' || sourceType === 'course' ? subjectId ?? null : null
    const finalCourseId = sourceType === 'course' ? courseId ?? null : null
    const finalEventId = sourceType === 'event' ? eventId ?? null : null

    if (sourceType === 'subject' && !finalSubjectId) {
      message.error('Vui lòng chọn môn học.')
      return
    }
    if (sourceType === 'course' && (!finalCourseId || !finalSubjectId)) {
      message.error('Vui lòng chọn khóa học và môn học.')
      return
    }
    if (sourceType === 'event' && !finalEventId) {
      message.error('Vui lòng chọn sự kiện.')
      return
    }

    const missingSessionTime = sessions.some((s) => !s.startAt || !s.endAt)
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
      attachments: attachments
        .filter((a) => a.fileName && a.fileUrl)
        .map((a) => ({
          fileName: a.fileName,
          fileUrl: a.fileUrl,
          uploadedByMemberId: programCoordinatorId,
        })),
    }

    setSubmitLoading(true)
    try {
      await requestApi.create(payload)
      message.success('Tạo yêu cầu thành công.')
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
      message.error((apiMessage as string) ?? 'Tạo yêu cầu thất bại.')
    } finally {
      setSubmitLoading(false)
    }
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
              <h2 className="text-lg font-semibold text-gray-900">Tạo yêu cầu mới</h2>
              <p className="text-xs text-gray-500">
                Điền thông tin yêu cầu giảng dạy hoặc sự kiện
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" className="border-gray-300 text-black hover:bg-gray-100" onClick={() => navigate('/pc/requests')}>
              Huỷ bỏ
            </Button>
            <Button
              size="sm"
              className="bg-[#2197C0] hover:bg-[#208AAE] text-white"
              onClick={() => void handleSubmit()}
              disabled={submitLoading}
            >
              {submitLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Tạo yêu cầu
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

              {/* Nguồn yêu cầu */}
              <div className="border-t pt-3.5">
                <Label className="text-xs text-gray-600 mb-2 block">Nguồn yêu cầu</Label>
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
                    options={subjects.map((s) => ({ label: s.subjectName, value: s.subjectId }))}
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
                    options={courses.map((c) => ({ label: c.courseName, value: c.courseId }))}
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
                    options={events.map((e) => ({ label: e.eventName, value: e.eventId }))}
                    filterOption={(input, option) =>
                      (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                    }
                    onChange={(v) => void handleEventChange(v)}
                  />
                </div>
              )}

              {/* Tài liệu đính kèm */}
              <div className="border-t pt-3.5">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs text-gray-600 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5" />
                    Tài liệu đính kèm
                  </Label>
                  <button
                    type="button"
                    className="text-xs text-[#2197C0] hover:text-[#208AAE] font-medium flex items-center gap-1"
                    onClick={() =>
                      setAttachments((prev) => [...prev, { fileName: '', fileUrl: '' }])
                    }
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Thêm
                  </button>
                </div>
                {attachments.length === 0 && (
                  <p className="text-xs text-gray-400 italic">Chưa có tài liệu đính kèm</p>
                )}
                <div className="space-y-2">
                  {attachments.map((att, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input
                        className="text-xs flex-1"
                        placeholder="Tên file"
                        value={att.fileName}
                        onChange={(e) => {
                          const next = [...attachments]
                          next[index] = { ...next[index], fileName: e.target.value }
                          setAttachments(next)
                        }}
                      />
                      <Input
                        className="text-xs flex-[2]"
                        placeholder="URL file (https://...)"
                        value={att.fileUrl}
                        onChange={(e) => {
                          const next = [...attachments]
                          next[index] = { ...next[index], fileUrl: e.target.value }
                          setAttachments(next)
                        }}
                      />
                      <button
                        type="button"
                        className="text-red-400 hover:text-red-600 shrink-0 p-1"
                        onClick={() =>
                          setAttachments((prev) => prev.filter((_, i) => i !== index))
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
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
                  <Calendar className="w-4 h-4 text-[#2197C0]" />
                  <h3 className="text-sm font-semibold text-gray-800">Lịch các buổi học</h3>
                </div>
                {sessions.length > 0 && (
                  <Badge className="bg-[#2197C0]/10 text-[#2197C0] border-0 text-[11px]">
                    {sessions.length} buổi
                  </Badge>
                )}
              </div>
            </div>

            {/* Course subject chips */}
            {sourceType === 'course' && courseSubjects.length > 0 && (
              <div className="px-6 py-3 border-b bg-amber-50/50 shrink-0">
                <p className="text-xs font-medium text-gray-600 mb-2">Môn học trong khóa</p>
                <div className="flex flex-wrap gap-1.5">
                  {courseSubjects.map((s) => (
                    <button
                      key={s.subjectId}
                      type="button"
                      className={cn(
                        'px-3 py-1 rounded-full text-xs font-medium transition-all border',
                        subjectId === s.subjectId
                          ? 'bg-[#2197C0] text-white border-[#2197C0]'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-[#2197C0] hover:text-[#2197C0]'
                      )}
                      onClick={() => void handleSubjectChange(s.subjectId)}
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
                  <Loader2 className="w-8 h-8 animate-spin mb-2 text-[#2197C0]" />
                  <span className="text-xs">Đang tải danh sách buổi học...</span>
                </div>
              )}

              {!loadingSessions && sessions.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                    <Calendar className="w-8 h-8 text-gray-300" />
                  </div>
                  <span className="text-sm font-medium text-gray-400">Chưa có buổi học</span>
                  <span className="text-xs text-gray-400 mt-1">
                    Chọn nguồn và ngày bắt đầu để sinh các buổi học
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
                      <div className="w-7 h-7 rounded-full bg-[#2197C0]/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-[#2197C0]">{s.sessionNo}</span>
                      </div>
                      <span className="text-sm font-medium text-black truncate flex-1">
                        {s.title}
                      </span>
                      {s.isOnline && (
                        <Badge className="bg-blue-50 text-blue-600 border-blue-200 text-[10px] px-1.5 py-0">
                          <Globe className="w-3 h-3 mr-0.5" />
                          Online
                        </Badge>
                      )}
                    </div>

                    {/* Date/time */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500">Ngày & giờ bắt đầu</Label>
                      <DatePicker
                        showTime
                        format="DD/MM/YYYY HH:mm"
                        placeholder="Chọn ngày giờ"
                        className="w-full"
                        value={s.startAt}
                        onChange={(value) => {
                          if (!value) return
                          const end = calculateEndTime(value, s.duration)
                          updateSession(index, { startAt: value, endAt: end })
                        }}
                      />
                      {s.endAt && (
                        <div className="flex items-center gap-1 text-[11px] text-gray-400">
                          <Clock className="w-3 h-3" />
                          Kết thúc: {s.endAt.format('DD/MM/YYYY HH:mm')}
                        </div>
                      )}
                    </div>

                    {/* Staff counts & location */}
                    <div className="grid grid-cols-4 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-gray-500">Số GV</Label>
                        <InputNumber
                          min={1}
                          value={s.teachersRequired}
                          onChange={(v) => updateSession(index, { teachersRequired: v ?? 1 })}
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-gray-500">Số TA</Label>
                        <InputNumber
                          min={0}
                          value={s.tasRequired}
                          onChange={(v) => updateSession(index, { tasRequired: v ?? 0 })}
                          className="w-full"
                        />
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <Label className="text-xs text-gray-500">Địa điểm</Label>
                        <Input
                          className="text-sm"
                          placeholder="Địa điểm"
                          value={s.location}
                          onChange={(e) => {
                            const raw = e.target.value
                            const shouldUseDefault = raw.trim() === ''
                            updateSession(
                              index,
                              shouldUseDefault
                                ? { usesDefaultLocation: true, location: defaultLocation }
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
                              ? 'bg-[#2197C0] text-white'
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
