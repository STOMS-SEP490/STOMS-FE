import { useState } from 'react';
import { message } from 'antd';
import { getErrorMessage } from '@/shared/lib/errorMessage';
import userService from '@/modules/user/api/userApi';
import type { User } from '@/modules/user/user';
import { Dialog } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

type Props = {
  open: boolean;
  onClose: () => void;
  user: User | null;
  onSuccess?: () => void;
};

export default function ResetPasswordModal({ open, onClose, user, onSuccess }: Props) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!newPassword || newPassword.length < 6) {
      message.warning('Mật khẩu mới tối thiểu 6 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      message.warning('Xác nhận mật khẩu không khớp');
      return;
    }
    try {
      setLoading(true);
      await userService.changePassword(user.userId, newPassword);
      message.success('Đổi mật khẩu thành công');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
      onSuccess?.();
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  if (!user) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Đặt lại mật khẩu"
      description={`Tài khoản: ${user.email}`}
      className="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Mật khẩu mới</Label>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Tối thiểu 6 ký tự"
            className="w-full"
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-2">
          <Label>Xác nhận mật khẩu</Label>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Nhập lại mật khẩu"
            className="w-full"
            autoComplete="new-password"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
            Hủy
          </Button>
          <Button type="submit" className="flex-1 bg-[#2197C0] hover:bg-[#208AAE] text-white" disabled={loading}>
            {loading ? 'Đang đổi...' : 'Đổi mật khẩu'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
