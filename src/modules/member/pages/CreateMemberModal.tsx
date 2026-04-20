import { useState, useEffect } from 'react';
import { message } from 'antd';
import { getErrorMessage } from '@/shared/lib/errorMessage';
import memberApi from '@/modules/member/api/memberApi';
import { Dialog } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { ROLE_ID, ROLE_MAP } from '@/constants/role';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
};

export default function CreateMemberModal({ open, onClose, onCreated }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [roleId, setRoleId] = useState<number>(ROLE_ID.TEACHER);

  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [cin, setCin] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [taxNumber, setTaxNumber] = useState('');

  useEffect(() => {
    if (!open) return;
    // reset mỗi lần mở modal để tránh lưu state cũ
    setError('');
    setEmail('');
    setFullName('');
    setRoleId(ROLE_ID.TEACHER);
    setPhone('');
    setAddress('');
    setCin('');
    setBankCode('');
    setBankName('');
    setTaxNumber('');
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const e1 = email.trim();
    const n1 = fullName.trim();
    if (!e1) return setError('Vui lòng nhập email');
    if (!n1) return setError('Vui lòng nhập họ tên');
    try {
      setLoading(true);
      await memberApi.createMemberAdmin({
        email: e1,
        fullName: n1,
        roleId,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        cin: cin.trim() || undefined,
        bankCode: bankCode.trim() || undefined,
        bankName: bankName.trim() || undefined,
        taxNumber: taxNumber.trim() || undefined,
      });
      message.success('Tạo thành viên thành công');
      onClose();
      onCreated?.();
    } catch (err: unknown) {
      message.error(getErrorMessage(err) || 'Tạo thành viên thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Tạo thành viên"
      description="Nhập thông tin và chọn vai trò"
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-black font-medium">
            Email <span className="text-red-500">*</span>
          </Label>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vd: user@gmail.com"
            className="h-9 text-black placeholder:text-gray-500 border-gray-200"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-black font-medium">
            Họ tên <span className="text-red-500">*</span>
          </Label>
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="vd: Nguyễn Văn A"
            className="h-9 text-black placeholder:text-gray-500 border-gray-200"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-black font-medium">
            Vai trò <span className="text-red-500">*</span>
          </Label>
          <Select value={String(roleId)} onValueChange={(v) => setRoleId(Number(v))}>
            <SelectTrigger className="h-9 w-full text-black border-gray-200">
              <SelectValue placeholder="Chọn vai trò" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={String(ROLE_ID.TEACHER)} className="text-black">
                {ROLE_MAP[ROLE_ID.TEACHER]}
              </SelectItem>
              <SelectItem value={String(ROLE_ID.ASSISTANT)} className="text-black">
                {ROLE_MAP[ROLE_ID.ASSISTANT]}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-black font-medium">SĐT</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Nhập số điện thoại"
              className="h-9 text-black placeholder:text-gray-500 border-gray-200"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-black font-medium">CCCD/CMND</Label>
            <Input
              value={cin}
              onChange={(e) => setCin(e.target.value)}
              placeholder="Nhập CCCD/CMND"
              className="h-9 text-black placeholder:text-gray-500 border-gray-200"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-black font-medium">Địa chỉ</Label>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Nhập địa chỉ"
            className="h-9 text-black placeholder:text-gray-500 border-gray-200"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-black font-medium">Số tài khoản</Label>
            <Input
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value)}
              placeholder="Nhập số tài khoản"
              className="h-9 text-black placeholder:text-gray-500 border-gray-200"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-black font-medium">Tên ngân hàng</Label>
            <Input
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="Nhập tên ngân hàng"
              className="h-9 text-black placeholder:text-gray-500 border-gray-200"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-black font-medium">Mã số thuế</Label>
          <Input
            value={taxNumber}
            onChange={(e) => setTaxNumber(e.target.value)}
            placeholder="Nhập mã số thuế"
            className="h-9 text-black placeholder:text-gray-500 border-gray-200"
          />
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
            {loading ? 'Đang tạo...' : 'Tạo thành viên'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
