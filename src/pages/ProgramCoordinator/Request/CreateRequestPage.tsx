import {
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Row,
  Col,
  Steps,
  TimePicker,
  Card,
  Divider,
} from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { requestService } from '@/services/requestService';
import { Button } from '@/components/ui/button';

export default function CreateRequestPage() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const subjects = [
    { id: 1, name: 'Lập trình Drone' },
    { id: 2, name: 'Lập trình Web nâng cao' },
  ];

  const courses = [
    { id: 10, name: 'ReactJS Master' },
    { id: 11, name: 'Unity Game 2D' },
  ];

  const events = [{ id: 100, name: 'Hội thảo Công nghệ 2026' }];

  const generateSessions = (count: number, startDate: any) => {
    const base = startDate || dayjs();

    const newSessions = Array.from({ length: count }).map((_, i) => ({
      sessionNo: i + 1,
      date: base.add(i, 'day'),
      startTime: dayjs().hour(9).minute(0),
      endTime: dayjs().hour(11).minute(0),
      teachersRequired: 1,
      tasRequired: 0,
      location: '',
      isOnline: false,
      notes: '',
    }));

    setSessions(newSessions);
  };

  const handleNext = async () => {
    try {
      const values = await form.validateFields([
        'requestName',
        'contentType',
        'selectedId',
        'startDate',
        'sessionsRequired',
        'customerName',
      ]);

      generateSessions(values.sessionsRequired, values.startDate);

      setStep(1);
    } catch {
      // validate fail → không chuyển step
    }
  };

  const updateSession = (index: number, key: string, value: any) => {
    const updated = [...sessions];
    updated[index][key] = value;
    setSessions(updated);
  };

  const handleFinish = async () => {
  const values = await form.validateFields();

  const payload = {
    programCoordinatorId: 3, // đổi theo user login nếu có

    subjectId: values.contentType === 'subject' ? values.selectedId : null,
    courseId: values.contentType === 'course' ? values.selectedId : null,
    eventId: values.contentType === 'event' ? values.selectedId : null,

    startDate: values.startDate.format('YYYY-MM-DD'),
    requestName: values.requestName,
    customerName: values.customerName,
    note: values.note,

    sessions: sessions.map((s, index) => ({
      sessionNo: index + 1,
      startAt: dayjs(
        `${s.date.format('YYYY-MM-DD')} ${s.startTime.format('HH:mm')}`
      ).format('YYYY-MM-DDTHH:mm:ss'),

      endAt: dayjs(
        `${s.date.format('YYYY-MM-DD')} ${s.endTime.format('HH:mm')}`
      ).format('YYYY-MM-DDTHH:mm:ss'),

      notes: s.notes || '',

      subjectSessionId:
        values.contentType === 'subject' ? s.subjectSessionId ?? null : null,

      eventSessionId:
        values.contentType === 'event' ? s.eventSessionId ?? null : null,

      teachersRequired: s.teachersRequired ?? 0,
      tasRequired: s.tasRequired ?? 0,
      location: s.location ?? '',
      isOnline: s.isOnline ?? false,

      borrowingId: null,
      reservationId: null,
    })),

    attachments: [
      {
        fileName: 'ke_hoach_python_ai.pdf',
        fileUrl: 'https://example.com/files/ke_hoach_python_ai.pdf',
        uploadedByMemberId: 3,
      },
    ],
  };

  try {
    setLoading(true);
    const res = await requestService.create(payload);
    navigate(`/requests/${res.id}`);
  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="p-6">
      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <Row gutter={32}>
          {/* STEP BÊN TRÁI */}
          <Col span={6}>
            <Steps
              direction="vertical"
              current={step}
              items={[
                {
                  title: 'Thông tin chung',
                  status: step > 0 ? 'finish' : 'process',
                },
                {
                  title: 'Cấu hình Sessions',
                  status: step === 1 ? 'process' : 'wait',
                },
              ]}
            />
          </Col>

          {/* FORM BÊN PHẢI */}
          <Col span={18}>
            <Form layout="vertical" form={form}>
              {step === 0 && (
                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item
                      name="requestName"
                      label="Tiêu đề"
                      rules={[{ required: true }]}
                    >
                      <Input size="large" />
                    </Form.Item>
                  </Col>

                  <Col span={12}>
                    <Form.Item
                      name="contentType"
                      label="Loại nội dung"
                      rules={[{ required: true }]}
                    >
                      <Select size="large">
                        <Select.Option value="subject">
                          Môn học
                        </Select.Option>
                        <Select.Option value="course">
                          Khoá học
                        </Select.Option>
                        <Select.Option value="event">
                          Sự kiện
                        </Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>

                  <Col span={12}>
                    <Form.Item
                      name="selectedId"
                      label="Chọn nội dung"
                      rules={[{ required: true }]}
                    >
                      <Select size="large">
                        {[...subjects, ...courses, ...events].map((i) => (
                          <Select.Option key={i.id} value={i.id}>
                            {i.name}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>

                  <Col span={12}>
                    <Form.Item
                      name="startDate"
                      label="Ngày bắt đầu"
                      rules={[{ required: true }]}
                    >
                      <DatePicker className="w-full" />
                    </Form.Item>
                  </Col>

                  <Col span={12}>
                    <Form.Item
                      name="sessionsRequired"
                      label="Số buổi"
                      rules={[{ required: true }]}
                    >
                      <InputNumber min={1} className="w-full" />
                    </Form.Item>
                  </Col>

                  <Col span={12}>
                    <Form.Item
                      name="customerName"
                      label="Tên khách hàng"
                      rules={[{ required: true }]}
                    >
                      <Input />
                    </Form.Item>
                  </Col>

                  <Col span={24}>
                    <Form.Item name="note" label="Ghi chú">
                      <Input.TextArea rows={3} />
                    </Form.Item>
                  </Col>

                  <Col span={24} className="text-right">
                    <Button onClick={handleNext}>Tiếp theo</Button>
                  </Col>
                </Row>
              )}

              {step === 1 && (
                <>
                  {sessions.map((s, index) => (
                    <Card key={index} className="mb-4">
                      <Row gutter={16}>
                        <Col span={6}>
                          <DatePicker
                            value={s.date}
                            className="w-full"
                            onChange={(v) =>
                              updateSession(index, 'date', v)
                            }
                          />
                        </Col>

                        <Col span={4}>
                          <TimePicker
                            value={s.startTime}
                            format="HH:mm"
                            className="w-full"
                            onChange={(v) =>
                              updateSession(index, 'startTime', v)
                            }
                          />
                        </Col>

                        <Col span={4}>
                          <TimePicker
                            value={s.endTime}
                            format="HH:mm"
                            className="w-full"
                            onChange={(v) =>
                              updateSession(index, 'endTime', v)
                            }
                          />
                        </Col>

                        <Col span={4}>
                          <InputNumber
                            min={0}
                            value={s.teachersRequired}
                            className="w-full"
                            onChange={(v) =>
                              updateSession(
                                index,
                                'teachersRequired',
                                v
                              )
                            }
                            placeholder="Teachers"
                          />
                        </Col>

                        <Col span={4}>
                          <InputNumber
                            min={0}
                            value={s.tasRequired}
                            className="w-full"
                            onChange={(v) =>
                              updateSession(index, 'tasRequired', v)
                            }
                            placeholder="TAs"
                          />
                        </Col>
                      </Row>
                    </Card>
                  ))}

                  <Divider />

                  <div className="flex justify-between">
                    <Button onClick={() => setStep(0)}>
                      Quay lại
                    </Button>
                    <Button onClick={handleFinish}>
                      Tạo Request
                    </Button>
                  </div>
                </>
              )}
            </Form>
          </Col>
        </Row>
      </div>
    </div>
  );
}