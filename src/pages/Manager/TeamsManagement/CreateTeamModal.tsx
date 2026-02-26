import teamService from '@/services/teamService';
import userService from '@/services/userService';
import type { Member } from '@/types/user';
import { Modal, Form, Input, Button, message, Card, Avatar } from 'antd';
import { useState } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
};

export default function CreateTeamModal({ open, onClose, onCreated }: Props) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [searching, setSearching] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  /* ===== SEARCH ===== */
  const handleSearch = async () => {
    if (!searchValue) return;

    try {
      setSearching(true);

      const isNumber = !isNaN(Number(searchValue));

      const res = await userService.getMembers({
        MemberId: isNumber ? Number(searchValue) : undefined,
        FullName: !isNumber ? searchValue : undefined,
      });

      setMembers(res.items);
    } catch (error) {
      message.error('search failed');
      setMembers([]);
    } finally {
      setSearching(false);
    }
  };

  /* ===== SELECT LEADER ===== */
  const handleSelect = (member: Member) => {
    setSelectedId(member.memberId);

    form.setFieldsValue({
      leaderMemberId: member.memberId,
    });

    message.success('leader selected');
  };

  /* ===== SUBMIT ===== */
  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);

      await teamService.createTeam({
        teamName: values.teamName,
        leaderMemberId: values.leaderMemberId,
      });

      message.success('team created successfully');

      form.resetFields();
      setMembers([]);
      setSelectedId(null);
      setSearchValue('');

      onClose();
      onCreated?.();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'create failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Create Team" open={open} onCancel={onClose} footer={null}>
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          label="Team Name"
          name="teamName"
          rules={[{ required: true, message: 'please enter team name' }]}
        >
          <Input placeholder="enter team name" />
        </Form.Item>

        {/* hidden field */}
        <Form.Item
          name="leaderMemberId"
          rules={[{ required: true, message: 'please select leader' }]}
        >
          <Input hidden />
        </Form.Item>

        {/* search box */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <Input
            placeholder="enter member id or name"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onPressEnter={handleSearch}
          />
          <Button loading={searching} onClick={handleSearch}>
            search
          </Button>
        </div>

        {/* result list */}
        {members.map((m) => (
          <Card
            key={m.memberId}
            hoverable
            onClick={() => handleSelect(m)}
            style={{
              marginBottom: 12,
              border: selectedId === m.memberId ? '2px solid #1677ff' : undefined,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar src={m.avatarUrl}>{m.fullName?.charAt(0)}</Avatar>
              <div>
                <div style={{ fontWeight: 600 }}>{m.fullName}</div>
                <div style={{ fontSize: 12, color: '#888' }}>{m.user.email}</div>
              </div>
            </div>
          </Card>
        ))}

        <Button type="primary" htmlType="submit" loading={loading} block>
          create
        </Button>
      </Form>
    </Modal>
  );
}
