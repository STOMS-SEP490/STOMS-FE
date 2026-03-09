import { useState, useEffect } from 'react';
import { message } from 'antd';
import { getErrorMessage } from '@/shared/lib/errorMessage';
import userService from '@/modules/user/api/userApi';
import type { User } from '@/modules/user/user';
import { ROLE_MAP } from '@/constants/role';
import { Dialog } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Switch } from '@/shared/components/ui/switch';

type Props = {
  open: boolean;
  onClose: () => void;
  user: User | null;
  onUpdated?: () => void;
};

const ROLE_OPTIONS = [1, 2, 3, 4, 5].map((id) => ({
  value: id,
  label: ROLE_MAP[id] ?? `Vai trò ${id}`,
}));

export default function UserEditModal({ open, onClose, user, onUpdated }: Props) {
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState<number>(4);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [synced, setSynced] = useState(false);

  // Sync form khi mở modal với user (tránh lần đầu Select không hiện đúng vai trò)
  useEffect(() => {
    if (open && user) {
      setEmail(user.email);
      setRoleId(user.roleId);
      setIsActive(user.isActive);
      setSynced(true);
    } else {
      setSynced(false);
    }
  }, [open, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!email.trim()) {
      message.warning('Vui lòng nhập email');
      return;
    }
    try {
      setLoading(true);
      await userService.updateUser(user.userId, {
        email: email.trim(),
        isActive,
        roleId,
      });
      message.success('Cập nhật tài khoản thành công');
      onClose();
      onUpdated?.();
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onClose={onClose} title="Chỉnh sửa tài khoản" description="Cập nhật thông tin tài khoản" className="max-w-md">
      {!synced ? (
        <div className="py-6 text-center text-muted-foreground">Đang tải...</div>
      ) : (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <Label>Vai trò</Label>
          <Select value={String(roleId)} onValueChange={(v) => setRoleId(Number(v))} key={user.userId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Chọn vai trò" />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={String(o.value)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between">
          <Label>Trạng thái hoạt động</Label>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" className="flex-1 bg-[#2197C0] hover:bg-[#208AAE] text-white" disabled={loading}>
            {loading ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </div>
      </form>
      )}
    </Dialog>
  );
}
