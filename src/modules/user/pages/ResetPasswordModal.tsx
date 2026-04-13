import { useState } from 'react';
import { message } from 'antd';
import { getErrorMessage } from '@/shared/lib/errorMessage';
import authService from '@/modules/auth/api/authApi';
import type { User } from '@/modules/user/user';
import { Dialog } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';

const DEFAULT_RESET_PASSWORD = 'stoms123';

type Props = {
  open: boolean;
  onClose: () => void;
  user: User | null;
  onSuccess?: () => void;
};

export default function ResetPasswordModal({ open, onClose, user, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!user) return;
    try {
      setLoading(true);
      await authService.resetPassword({
        email: user.email,
        newPassword: DEFAULT_RESET_PASSWORD,
      });
      message.success('Đã đặt lại mật khẩu thành công');
      onClose();
      onSuccess?.();
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) onClose();
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
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Bạn có chắc muốn đặt lại mật khẩu cho tài khoản này về mật khẩu mặc định{' '}
          <strong className="text-gray-900">{DEFAULT_RESET_PASSWORD}</strong>?
        </p>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={handleClose} disabled={loading}>
            Hủy
          </Button>
          <Button
            type="button"
            className="flex-1 bg-[#2197C0] hover:bg-[#208AAE] text-white"
            onClick={() => void handleConfirm()}
            disabled={loading}
          >
            {loading ? 'Đang xử lý...' : 'Xác nhận đặt lại'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
