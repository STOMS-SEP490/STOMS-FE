import { Modal, Form, Select, Button, Alert, InputNumber, Input, Radio, message } from 'antd';
import { useState } from 'react';
import userService from '@/modules/user/api/userApi';

const { Option } = Select;
const { TextArea } = Input;

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
};

export default function UserCreateForm({ open, onClose, onCreated }: Props) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');

  const generateRandomEmail = () => {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    let prefix = '';

    for (let i = 0; i < 3; i++) {
      prefix += letters.charAt(Math.floor(Math.random() * letters.length));
    }

    const number = Math.floor(100 + Math.random() * 900);
    return `${prefix}${number}@stom.fpt`;
  };

  const handleFinish = async (values: any) => {
    try {
      setLoading(true);

      let emails: string[] = [];

      if (mode === 'auto') {
        emails = Array.from({ length: values.quantity }).map(() => generateRandomEmail());
      } else {
        emails = values.emails
          ?.split('\n')
          .map((e: string) => e.trim())
          .filter((e: string) => e);

        if (emails.length !== values.quantity) {
          message.error(`Số email (${emails.length}) phải bằng số lượng (${values.quantity})`);
          setLoading(false);
          return;
        }
      }

      await userService.createUsersBulk({
        quantity: emails.length,
        roleId: values.roleId,
        emails,
      });

      message.success('Tạo tài khoản thành công');

      form.resetFields();
      setMode('auto');
      onClose();
      onCreated?.();
    } catch (err) {
      console.error(err);
      message.error('Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={520}
      destroyOnClose
      title="Tạo tài khoản"
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} initialValues={{ quantity: 1 }}>
        {/* Role */}
        <Form.Item
          label="Vai trò"
          name="roleId"
          rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
        >
          <Select placeholder="Chọn vai trò">
            <Option value={1}>Trưởng nhóm</Option>
            <Option value={2}>Giảng viên</Option>
            <Option value={3}>Trợ giảng</Option>
          </Select>
        </Form.Item>

        {/* Quantity luôn có */}
        <Form.Item
          label="Số lượng tài khoản"
          name="quantity"
          rules={[
            { required: true, message: 'Vui lòng nhập số lượng' },
            { type: 'number', min: 1, message: 'Tối thiểu 1 tài khoản' },
          ]}
        >
          <InputNumber min={1} max={500} style={{ width: '100%' }} />
        </Form.Item>

        {/* Mode */}
        <Form.Item label="Chế độ tạo">
          <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)}>
            <Radio value="auto">Tự động random</Radio>
            <Radio value="manual">Nhập thủ công</Radio>
          </Radio.Group>
        </Form.Item>

        {mode === 'manual' && (
          <Form.Item
            label="Danh sách email"
            name="emails"
            rules={[{ required: true, message: 'Vui lòng nhập email' }]}
            extra="Mỗi email một dòng. Phải đúng bằng số lượng."
          >
            <TextArea
              rows={6}
              placeholder="abc@stom.fpt&#10;xyz@stom.fpt"
            />
          </Form.Item>
        )}

        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 20 }}
          message="Lưu ý"
          description="Quantity phải bằng số email truyền lên backend."
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <Button onClick={onClose}>Hủy</Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            Tạo tài khoản
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
