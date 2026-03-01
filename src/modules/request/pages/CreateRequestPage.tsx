// import { useState } from 'react';
// import {
//   Form,
//   Input,
//   DatePicker,
//   Select,
//   InputNumber,
//   Button,
//   Card,
//   Space,
//   Divider,
// } from 'antd';
// import type { Dayjs } from 'dayjs';

// import { generateSessions } from '@/shared/utils/sessionGenerator';
// import type { RepeatType, SessionSchedulerConfig } from '@/shared/types/scheduler';
// import type { CreateRequestPayload, CreateRequestSession } from '@/modules/request/request';

// import requestService from '@/modules/request/api/requestApi';
// import subjectService from '@/modules/subject/api/subjectApi';
// import type { SubjectListItem } from '@/modules/subject/subject';

// type ContentType = 'subject' | 'course' | 'event';

// type SessionTemplateForm = {
//   sessionNo: number;
//   title: string;
//   duration: string;
//   subjectSessionId?: number;
// };

// type CreateRequestFormValues = {
//   requestName: string;
//   customerName: string;
//   note?: string;

//   contentType: ContentType;
//   contentId: number;

//   startDate: Dayjs;
//   startTime: Dayjs;

//   repeatType: RepeatType;
//   repeatValue?: number;

//   templates: SessionTemplateForm[];
// };

// export default function CreateRequestPage() {
//   const [form] = Form.useForm<CreateRequestFormValues>();

//   const [loading, setLoading] = useState(false);
//   const [contentType, setContentType] = useState<ContentType | null>(null);
//   const [contentOptions, setContentOptions] = useState<
//     { label: string; value: number }[]
//   >([]);
//   const [loadingContent, setLoadingContent] = useState(false);

//   // ================= LOAD SUBJECT LIST =================
//   const loadSubjects = async () => {
//     const res = await subjectService.getSubjects({
//       pageNumber: 1,
//       pageSize: 100,
//       isActive: true,
//     });

//     setContentOptions(
//       (res.items ?? []).map((x) => ({
//         label: `${x.subjectCode} - ${x.subjectName}`,
//         value: x.subjectId,
//       }))
//     );
//   };

//   // ================= LOAD SUBJECT DETAIL =================
//  const loadSubjectDetail = async (id: number) => {
//   const subject = await subjectService.getById(id);

//   const templates =
//     subject.subjectSessions
//       ?.sort((a, b) => a.sessionNo - b.sessionNo)
//       .map((s) => ({
//         sessionNo: s.sessionNo,
//         title: s.title,
//         duration: s.duration, // 🔥 giữ nguyên
//         subjectSessionId: s.subjectSessionId,
//       })) ?? [];

//   form.setFieldValue('templates', templates);
// };

//   // ================= SUBMIT =================
//   const handleFinish = async (values: CreateRequestFormValues) => {
//   try {
//     setLoading(true);

//     const schedulerConfig: SessionSchedulerConfig = {
//       startDate: values.startDate.format('YYYY-MM-DD'),
//       repeatType: values.repeatType,
//       repeatValue: values.repeatValue,
//       startHour: values.startTime.hour(),
//       startMinute: values.startTime.minute(),
//     };

//     // generate session base
//     const baseSessions = generateSessions(
//       values.templates,
//       schedulerConfig
//     );

//     // merge lại teachers, tas, location nếu user nhập
//     const sessions = baseSessions.map((session, index) => {
//       const tpl = values.templates[index];

//       return {
//         ...session,

       
//     teachersRequired: tpl.teachersRequired ?? 1,
//     tasRequired: tpl.tasRequired ?? 0,
//     location: tpl.location ?? '',

//     isOnline: false,
//     borrowingId: null,
//     reservationId: null,
//       };
//     });

//     const payload: CreateRequestPayload = {
//       programCoordinatorId: 3,

//       subjectId:
//         values.contentType === 'subject'
//           ? values.contentId
//           : null,

//       courseId:
//         values.contentType === 'course'
//           ? values.contentId
//           : null,

//       eventId:
//         values.contentType === 'event'
//           ? values.contentId
//           : null,

//       startDate: schedulerConfig.startDate,

//       requestName: values.requestName,
//       customerName: values.customerName,
//       note: values.note ?? '',

//       sessions,
//       attachments: [],
//     };

//     await requestService.create(payload);

//     form.resetFields();
//     setContentType(null);
//     setContentOptions([]);
//   } catch (err) {
//     console.error(err);
//   } finally {
//     setLoading(false);
//   }
// };

//   return (
//     <Card title="Create Request">
//       <Form
//         form={form}
//         layout="vertical"
//         onFinish={handleFinish}
//         initialValues={{
//           repeatType: 'weekly',
//           templates: [],
//         }}
//       >
//         <Divider titlePlacement="left">Basic Information</Divider>

//         <Form.Item name="requestName" label="Request Name" rules={[{ required: true }]}>
//           <Input />
//         </Form.Item>

//         <Form.Item name="customerName" label="Customer Name" rules={[{ required: true }]}>
//           <Input />
//         </Form.Item>

//         <Form.Item name="note" label="Note">
//           <Input.TextArea rows={3} />
//         </Form.Item>

//         {/* CONTENT TYPE */}

//         <Form.Item name="contentType" label="Content Type" rules={[{ required: true }]}>
//           <Select
//             placeholder="Select type"
//             onChange={async (value: ContentType) => {
//               setContentType(value);
//               form.setFieldValue('contentId', undefined);
//               form.setFieldValue('templates', []);
//               setContentOptions([]);

//               if (value === 'subject') {
//                 setLoadingContent(true);
//                 await loadSubjects();
//                 setLoadingContent(false);
//               }
//             }}
//           >
//             <Select.Option value="subject">Subject</Select.Option>
//           </Select>
//         </Form.Item>

//         {contentType && (
//           <Form.Item name="contentId" label="Select Subject" rules={[{ required: true }]}>
//             <Select
//               loading={loadingContent}
//               options={contentOptions}
//               showSearch
//               optionFilterProp="label"
//               placeholder="Select subject"
//               onChange={async (id: number) => {
//                 await loadSubjectDetail(id);
//               }}
//             />
//           </Form.Item>
//         )}

//         {/* SCHEDULE */}

//         <Divider titlePlacement="left">Schedule</Divider>

//         <Space size="large">
//           <Form.Item name="startDate" label="Start Date" rules={[{ required: true }]}>
//             <DatePicker />
//           </Form.Item>

//           <Form.Item name="startTime" label="Start Time" rules={[{ required: true }]}>
//             <DatePicker picker="time" format="HH:mm" />
//           </Form.Item>
//         </Space>

//         <Form.Item name="repeatType" label="Repeat Type">
//           <Select>
//             <Select.Option value="daily">Daily</Select.Option>
//             <Select.Option value="weekly">Weekly</Select.Option>
//             <Select.Option value="custom">Custom</Select.Option>
//           </Select>
//         </Form.Item>

//         <Form.Item shouldUpdate>
//           {({ getFieldValue }) =>
//             getFieldValue('repeatType') === 'custom' ? (
//               <Form.Item name="repeatValue" label="Repeat every X days" rules={[{ required: true }]}>
//                 <InputNumber min={1} style={{ width: '100%' }} />
//               </Form.Item>
//             ) : null
//           }
//         </Form.Item>

//         {/* SESSION TEMPLATES */}

//         <Divider titlePlacement="left">Sessions</Divider>
// <Form.List name="templates">
//   {(fields) => (
//     <>
//       {fields.map((field) => (
//         <Card key={field.key} size="small" style={{ marginBottom: 16 }}>
//           <Space wrap align="start">
//             <Form.Item
//               {...field}
//               name={[field.name, 'sessionNo']}
//               label="No"
//             >
//               <InputNumber disabled />
//             </Form.Item>

//             <Form.Item
//               {...field}
//               name={[field.name, 'title']}
//               label="Title"
//             >
//               <Input disabled />
//             </Form.Item>

//             <Form.Item
//               {...field}
//               name={[field.name, 'duration']}
//               label="Duration"
//             >
//               <Input disabled />
//             </Form.Item>

//             <Form.Item
//               name={[field.name, 'teachersRequired']}
//               label="Teachers"
//               initialValue={1}
//             >
//               <InputNumber min={1} />
//             </Form.Item>

//             <Form.Item
//               name={[field.name, 'tasRequired']}
//               label="TAs"
//               initialValue={1}
//             >
//               <InputNumber min={0} />
//             </Form.Item>

//             <Form.Item
//               name={[field.name, 'location']}
//               label="Location"
//             >
//               <Input />
//             </Form.Item>
//           </Space>
//         </Card>
//       ))}
//     </>
//   )}
// </Form.List>

//         <Divider />

//         <Button type="primary" htmlType="submit" loading={loading} block>
//           Create Request
//         </Button>
//       </Form>
//     </Card>
//   );
// }