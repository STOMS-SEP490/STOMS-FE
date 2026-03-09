import { useEffect, useState } from 'react'
import {
  Form,
  Input,
  DatePicker,
  Select,
  Button,
  Card,
  Space,
  InputNumber,
  Switch,
  message,
  Radio,
  Row,
  Col,
  Empty,
} from 'antd'
import { useNavigate } from 'react-router-dom'
import { requestApi } from '../api/requestApi'
import type { CreateRequestPayload } from '../request'
import type { SubjectListItem } from '@/modules/subject/subject'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import type { SourceType, SessionFormItem, AttachmentFormItem } from '../createRequestTypes'
import { useRequestSubjectSource } from '../hooks/useRequestSubjectSource'
import { useRequestCourseSource } from '../hooks/useRequestCourseSource'
import { useRequestEventSource } from '../hooks/useRequestEventSource'
import { useLoadRequestSessions } from '../hooks/useLoadRequestSessions'
import { useCreateRequestSchedule } from '../hooks/useCreateRequestSchedule'
import { useProgramCoordinatorId } from '../hooks/useProgramCoordinatorId'

const { TextArea } = Input

export default function CreateRequestPage() {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const programCoordinatorId = useProgramCoordinatorId()

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
    const startDate = form.getFieldValue('startDate') as Dayjs | undefined
    if (!startDate || sessions.length === 0) return
    setSessions((prev) => applyAutoSchedule(startDate, prev))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleMode, gapDays])

  const handleSourceTypeChange = (type: SourceType) => {
    setSourceType(type)
    setSessions([])
    form.setFieldsValue({ subjectId: undefined, courseId: undefined, eventId: undefined })
    setCourseSubjects([])
  }

  const handleDefaultLocationChange = (value: string) => {
    setDefaultLocation(value)
    setSessions((prev) =>
      prev.map((s) => (s.usesDefaultLocation ? { ...s, location: value } : s))
    )
  }

  const handleSubjectChange = async (subjectId: number | undefined) => {
    form.setFieldsValue({
      courseId: sourceType === 'subject' ? undefined : form.getFieldValue('courseId'),
      eventId: undefined,
    })
    if (!subjectId) {
      setSessions([])
      return
    }
    const mapped = await loadSubjectSessions(subjectId, defaultLocation)
    const startDate = form.getFieldValue('startDate') as Dayjs | undefined
    setSessions(startDate ? applyAutoSchedule(startDate, mapped) : mapped)
  }

  const handleCourseChange = async (courseId: number | undefined) => {
    form.setFieldsValue({ subjectId: undefined, eventId: undefined })
    setSessions([])
    if (!courseId) {
      setCourseSubjects([])
      return
    }
    const list = await loadCourseSubjects(courseId)
    setCourseSubjects(list)
  }

  const handleEventChange = async (eventId: number | undefined) => {
    form.setFieldsValue({ subjectId: undefined, courseId: undefined })
    setSessions([])
    if (!eventId) return
    const mapped = await loadEventSessions(eventId, defaultLocation)
    const startDate = form.getFieldValue('startDate') as Dayjs | undefined
    setSessions(startDate ? applyAutoSchedule(startDate, mapped) : mapped)
  }

  const handleSubmit = async (values: Record<string, unknown>) => {
    const subjectId =
      sourceType === 'subject' || sourceType === 'course' ? (values.subjectId as number) : null
    const courseId = sourceType === 'course' ? (values.courseId as number) : null
    const eventId = sourceType === 'event' ? (values.eventId as number) : null

    if (sourceType === 'subject' && !subjectId) {
      message.error('Vui lòng chọn môn học.')
      return
    }
    if (sourceType === 'course' && !courseId) {
      message.error('Vui lòng chọn khóa học.')
      return
    }
    if (sourceType === 'course' && (!courseId || !subjectId)) {
      message.error('Vui lòng chọn khóa học và môn học.')
      return
    }
    if (sourceType === 'event' && !eventId) {
      message.error('Vui lòng chọn sự kiện.')
      return
    }

    const missingSessionTime = sessions.some((s) => !s.startAt || !s.endAt)
    if (sessions.length > 0 && missingSessionTime) {
      message.error('Vui lòng chọn ngày giờ bắt đầu cho tất cả các buổi học.')
      return
    }

    const startDate = values.startDate
      ? dayjs(values.startDate as Dayjs).format('YYYY-MM-DD')
      : ''

    const payload: CreateRequestPayload = {
      programCoordinatorId,
      subjectId,
      courseId,
      eventId,
      startDate,
      requestName: (values.requestName as string) ?? '',
      customerName: (values.customerName as string) ?? '',
      note: (values.note as string) ?? '',
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
        (e?.response as Record<string, unknown>)?.data as string
      message.error((apiMessage as string) ?? 'Tạo yêu cầu thất bại.')
    } finally {
      setSubmitLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="flex justify-between bg-white px-6 py-4 rounded-xl border shadow-sm items-center mt-6 mb-2 mx-6">
        <div>
          <h2 className="text-xl font-semibold text-black">Quản lý yêu cầu</h2>
          <p className="text-xs text-gray-500">Quản lý danh sách yêu cầu giảng dạy và sự kiện</p>
        </div>
      </div>

      <div
        className="mt-0 mx-6"
        style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ note: '' }}
          style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
        >
          <Row gutter={24} align="top" style={{ flex: 1 }}>
            <Col xs={24} lg={12}>
              <Card
                size="small"
                title="Tạo yêu cầu"
                style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
              >
                <Form.Item
                  name="requestName"
                  label="Tên yêu cầu"
                  rules={[{ required: true, message: 'Bắt buộc' }]}
                  style={{ marginBottom: 12 }}
                >
                  <Input placeholder="Ví dụ: Python cho AI - THPT Demo" />
                </Form.Item>

                <Form.Item
                  name="customerName"
                  label="Khách hàng"
                  rules={[{ required: true, message: 'Bắt buộc' }]}
                  style={{ marginBottom: 12 }}
                >
                  <Input placeholder="Ví dụ: THPT Demo" />
                </Form.Item>

                <Form.Item label="Địa điểm mặc định" style={{ marginBottom: 12 }}>
                  <Input
                    placeholder="Ví dụ: THPT Demo - Lab 101"
                    value={defaultLocation}
                    onChange={(e) => handleDefaultLocationChange(e.target.value)}
                  />
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="startDate"
                      label="Ngày bắt đầu"
                      rules={[{ required: true, message: 'Bắt buộc' }]}
                      style={{ marginBottom: 12 }}
                    >
                      <DatePicker
                        style={{ width: '100%' }}
                        format="DD/MM/YYYY"
                        onChange={(value) => {
                          if (!value || sessions.length === 0) return
                          setSessions(applyAutoSchedule(value, sessions))
                        }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Lặp lại" style={{ marginBottom: 12 }}>
                      <Space>
                        <Select
                          style={{ width: 200 }}
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
                            addonBefore="Cách"
                            addonAfter="ngày"
                          />
                        )}
                      </Space>
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item label="Nguồn yêu cầu" style={{ marginBottom: 12 }}>
                  <Radio.Group
                    value={sourceType}
                    onChange={(e) => handleSourceTypeChange(e.target.value)}
                  >
                    <Radio value="subject">Môn học</Radio>
                    <Radio value="course">Khóa học</Radio>
                    <Radio value="event">Sự kiện</Radio>
                  </Radio.Group>
                </Form.Item>

                {sourceType === 'subject' && (
                  <Form.Item
                    name="subjectId"
                    label="Chọn môn học"
                    rules={[{ required: true, message: 'Vui lòng chọn môn học' }]}
                    style={{ marginBottom: 12 }}
                  >
                    <Select
                      showSearch
                      placeholder="Chọn môn học"
                      loading={loadingSubjects}
                      allowClear
                      options={subjects.map((s) => ({ label: s.subjectName, value: s.subjectId }))}
                      filterOption={(input, option) =>
                        (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                      }
                      onChange={handleSubjectChange}
                    />
                  </Form.Item>
                )}

                {sourceType === 'course' && (
                  <>
                    <Form.Item
                      name="courseId"
                      label="Chọn khóa học"
                      rules={[{ required: true, message: 'Vui lòng chọn khóa học' }]}
                      style={{ marginBottom: 12 }}
                    >
                      <Select
                        showSearch
                        placeholder="Chọn khóa học"
                        loading={loadingCourses}
                        allowClear
                        options={courses.map((c) => ({ label: c.courseName, value: c.courseId }))}
                        filterOption={(input, option) =>
                          (option?.label ?? '')
                            .toString()
                            .toLowerCase()
                            .includes(input.toLowerCase())
                        }
                        onChange={handleCourseChange}
                      />
                    </Form.Item>
                  </>
                )}

                {sourceType === 'event' && (
                  <Form.Item
                    name="eventId"
                    label="Chọn sự kiện"
                    style={{ marginBottom: 12 }}
                  >
                    <Select
                      showSearch
                      placeholder="Chọn sự kiện"
                      loading={loadingEvents}
                      allowClear
                      options={events.map((e) => ({ label: e.eventName, value: e.eventId }))}
                      filterOption={(input, option) =>
                        (option?.label ?? '')
                          .toString()
                          .toLowerCase()
                          .includes(input.toLowerCase())
                      }
                      onChange={handleEventChange}
                    />
                  </Form.Item>
                )}

                <Form.Item
                  label="Tài liệu đính kèm (tuỳ chọn)"
                  style={{ marginBottom: 12 }}
                >
                  <Space direction="vertical" style={{ width: '100%' }} size="small">
                    {attachments.map((att, index) => (
                      <Space key={index} align="baseline" style={{ width: '100%' }}>
                        <Input
                          placeholder="Tên file (vd: ke_hoach_python_ai.pdf)"
                          style={{ flex: 1 }}
                          value={att.fileName}
                          onChange={(e) => {
                            const next = [...attachments]
                            next[index] = { ...next[index], fileName: e.target.value }
                            setAttachments(next)
                          }}
                        />
                        <Input
                          placeholder="URL file (vd: https://...)"
                          style={{ flex: 2 }}
                          value={att.fileUrl}
                          onChange={(e) => {
                            const next = [...attachments]
                            next[index] = { ...next[index], fileUrl: e.target.value }
                            setAttachments(next)
                          }}
                        />
                        <Button
                          type="link"
                          danger
                          onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== index))}
                        >
                          Xoá
                        </Button>
                      </Space>
                    ))}
                    <Button
                      type="dashed"
                      onClick={() =>
                        setAttachments((prev) => [...prev, { fileName: '', fileUrl: '' }])
                      }
                    >
                      + Thêm tài liệu
                    </Button>
                  </Space>
                </Form.Item>

                <Form.Item name="note" label="Ghi chú">
                  <TextArea rows={3} placeholder="Ghi chú chung cho yêu cầu" />
                </Form.Item>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card
                size="small"
                title="Lịch các buổi học"
                style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
                bodyStyle={{
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                {sourceType === 'course' && courseSubjects.length > 0 && (
                  <div
                    style={{
                      marginBottom: 12,
                      padding: 8,
                      borderRadius: 8,
                      background: '#fafafa',
                      border: '1px solid #f0f0f0',
                    }}
                  >
                    <div style={{ fontWeight: 500, marginBottom: 4 }}>Môn học trong khóa</div>
                    <Space wrap size="small">
                      {courseSubjects.map((s) => {
                        const isSelected = form.getFieldValue('subjectId') === s.subjectId
                        return (
                          <Button
                            key={s.subjectId}
                            type={isSelected ? 'primary' : 'default'}
                            size="small"
                            onClick={() => {
                              form.setFieldsValue({ subjectId: s.subjectId })
                              handleSubjectChange(s.subjectId)
                            }}
                          >
                            {s.subjectName}
                          </Button>
                        )
                      })}
                    </Space>
                  </div>
                )}

                <div style={{ flex: 1, overflow: 'auto', paddingRight: 8 }}>
                  {loadingSessions && <div>Đang tải danh sách buổi học...</div>}

                  {!loadingSessions && sessions.length === 0 && (
                    <Empty
                      description="Chọn môn và ngày bắt đầu để sinh các buổi học"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  )}

                  {sessions.map((s, index) => (
                    <Card
                      key={`${s.subjectSessionId ?? s.eventSessionId}-${s.sessionNo}`}
                      size="small"
                      style={{ marginBottom: 12 }}
                      type="inner"
                      title={`Buổi ${s.sessionNo}: ${s.title}`}
                    >
                      <Space direction="vertical" style={{ width: '100%' }} size="small">
                        <Form.Item label="Ngày & giờ bắt đầu" style={{ marginBottom: 0 }}>
                          <DatePicker
                            showTime
                            format="DD/MM/YYYY HH:mm"
                            placeholder="Chọn ngày giờ bắt đầu"
                            style={{ width: '100%' }}
                            value={s.startAt}
                            onChange={(value) => {
                              if (!value) return
                              const end = calculateEndTime(value, s.duration)
                              const updated = [...sessions]
                              updated[index] = { ...updated[index], startAt: value, endAt: end }
                              setSessions(updated)
                            }}
                          />
                        </Form.Item>

                        {s.endAt && (
                          <div
                            style={{
                              color: 'var(--ant-color-text-secondary)',
                              fontSize: 12,
                            }}
                          >
                            Giờ kết thúc dự tính: {s.endAt.format('DD/MM/YYYY HH:mm')}
                          </div>
                        )}

                        <Input.TextArea
                          placeholder="Ghi chú buổi học"
                          value={s.notes}
                          rows={2}
                          onChange={(e) => {
                            const updated = [...sessions]
                            updated[index] = { ...updated[index], notes: e.target.value }
                            setSessions(updated)
                          }}
                        />

                        <Space
                          size="middle"
                          style={{ width: '100%', display: 'flex', alignItems: 'flex-end' }}
                        >
                          <Form.Item label="Số GV" style={{ marginBottom: 0 }}>
                            <InputNumber
                              min={1}
                              value={s.teachersRequired}
                              onChange={(v) => {
                                const updated = [...sessions]
                                updated[index] = {
                                  ...updated[index],
                                  teachersRequired: v ?? 1,
                                }
                                setSessions(updated)
                              }}
                            />
                          </Form.Item>
                          <Form.Item label="Số TA" style={{ marginBottom: 0 }}>
                            <InputNumber
                              min={0}
                              value={s.tasRequired}
                              onChange={(v) => {
                                const updated = [...sessions]
                                updated[index] = { ...updated[index], tasRequired: v ?? 0 }
                                setSessions(updated)
                              }}
                              style={{ width: 80 }}
                            />
                          </Form.Item>
                          <Form.Item label="Địa điểm" style={{ flex: 1, marginBottom: 0 }}>
                            <Input
                              placeholder="Địa điểm"
                              value={s.location}
                              onChange={(e) => {
                                const raw = e.target.value
                                const shouldUseDefault = raw.trim() === ''
                                const updated = [...sessions]
                                updated[index] = shouldUseDefault
                                  ? {
                                      ...updated[index],
                                      usesDefaultLocation: true,
                                      location: defaultLocation,
                                    }
                                  : {
                                      ...updated[index],
                                      usesDefaultLocation: false,
                                      location: raw,
                                    }
                                setSessions(updated)
                              }}
                            />
                          </Form.Item>
                          <Form.Item label=" " colon={false} style={{ marginBottom: 0 }}>
                            <Switch
                              checkedChildren="Online"
                              unCheckedChildren="Offline"
                              checked={s.isOnline}
                              onChange={(checked) => {
                                const updated = [...sessions]
                                updated[index] = { ...updated[index], isOnline: checked }
                                setSessions(updated)
                              }}
                            />
                          </Form.Item>
                        </Space>
                      </Space>
                    </Card>
                  ))}
                </div>
              </Card>
            </Col>
          </Row>

          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Button type="primary" htmlType="submit" loading={submitLoading}>
              Tạo yêu cầu
            </Button>
          </div>
        </Form>
      </div>
    </div>
  )
}
