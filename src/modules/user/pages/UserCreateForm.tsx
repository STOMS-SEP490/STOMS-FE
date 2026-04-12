import { useState } from 'react';
import { message } from 'antd';
import { getErrorMessage } from '@/shared/lib/errorMessage';
import userService from '@/modules/user/api/userApi';
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
import { cn } from '@/shared/lib/utils';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
};

const ROLE_OPTIONS = [1, 2, 3, 4, 5, 6].map((id) => ({
  value: id,
  label: ROLE_MAP[id] ?? `Vai trò ${id}`,
}));

export default function UserCreateForm({ open, onClose, onCreated }: Props) {
  const [roleId, setRoleId] = useState<number>(4);
  const [quantity, setQuantity] = useState(1);
  const [emailsText, setEmailsText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    let emails: string[] = [];
    emails = emailsText
      .split('\n')
      .map((e) => e.trim())
      .filter(Boolean);
    if (emails.length !== quantity) {
      setError(`Số email (${emails.length}) phải bằng số lượng (${quantity})`);
      return;
    }
    try {
      setLoading(true);
      await userService.createUsersBulk({
        quantity: emails.length,
        roleId,
        emails,
      });
      message.success('Tạo tài khoản thành công');
      setQuantity(1);
      setEmailsText('');
      onClose();
      onCreated?.();
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setQuantity(1);
    setEmailsText('');
    setError('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Tạo tài khoản"
      description="Tạo nhiều tài khoản theo vai trò"
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-black font-medium">
            Vai trò <span className="text-red-500">*</span>
          </Label>
          <Select value={String(roleId)} onValueChange={(v) => setRoleId(Number(v))}>
            <SelectTrigger className="h-9 w-full text-black border-gray-200">
              <SelectValue placeholder="Chọn vai trò" />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={String(o.value)} className="text-black">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="quantity" className="text-black font-medium">
            Số lượng tài khoản <span className="text-red-500">*</span>
          </Label>
          <Input
            id="quantity"
            type="number"
            min={1}
            max={500}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value) || 1)}
            className="h-9 text-black border-gray-200"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="emails" className="text-black font-medium">
            Danh sách email <span className="text-red-500">*</span>
          </Label>
          <textarea
            id="emails"
            value={emailsText}
            onChange={(e) => setEmailsText(e.target.value)}
            placeholder="abc@stom.fpt&#10;xyz@stom.fpt"
            rows={5}
            className={cn(
              'flex w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-black',
              'placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-400 resize-none'
            )}
          />
          <p className="text-xs text-black/70">Mỗi email một dòng. Số dòng phải bằng số lượng.</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2 text-sm text-black/90">
          <span className="font-medium">Lưu ý:</span> Số lượng phải bằng số email khi nhập thủ công.
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
            Hủy
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-[#2197C0] hover:bg-[#208AAE] text-white"
            disabled={loading}
          >
            {loading ? 'Đang tạo...' : 'Tạo tài khoản'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
