import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { useAuth } from '@/app/providers/AuthProvider';
import { getErrorMessage } from '@/shared/lib/errorMessage';
import userService from '@/modules/user/api/userApi';
import authService from '@/modules/auth/api/authApi';
import type { User } from '@/modules/user/user';
import memberApi from '@/modules/member/api/memberApi';
import type { MemberDetail } from '@/modules/member/member';
import memberSkillApi from '@/modules/member/api/memberSkillApi';
import skillApi from '@/modules/skill/api/skillApi';
import type { SkillListItem } from '@/modules/skill/skill';
import type { PaginationResponse } from '@/shared/types/api';
import { ROLE_MAP } from '@/constants/role';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Dialog } from '@/shared/components/ui/dialog';

export default function UserProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userDetail, setUserDetail] = useState<User | null>(null);
  const [memberDetail, setMemberDetail] = useState<MemberDetail | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editingMember, setEditingMember] = useState(false);
  const [savingMember, setSavingMember] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [openChangePassword, setOpenChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [cin, setCin] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [skillNames, setSkillNames] = useState<string[]>([]);

  const cacheAvatarUrl = (avatarUrl?: string | null) => {
    if (avatarUrl && avatarUrl.trim()) {
      localStorage.setItem('memberAvatarUrl', avatarUrl);
    } else {
      localStorage.removeItem('memberAvatarUrl');
    }
  };

  useEffect(() => {
    if (!user) return;
    userService
      .getUserById(user.id)
      .then((res) => setUserDetail(res))
      .catch(() => {
        setUserDetail(null);
      });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const raw = localStorage.getItem('user');
    if (!raw) {
      setMemberDetail(null);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as { memberId?: number };
      if (!parsed.memberId) {
        setMemberDetail(null);
        return;
      }
      memberApi
        .getMemberById(parsed.memberId)
        .then((res) => {
          setMemberDetail(res);
          cacheAvatarUrl(res.avatarUrl ?? null);
          setFullName(res.fullName ?? '');
          setPhone(res.phone ?? '');
          setAddress(res.address ?? '');
          setCin(res.cin ?? '');
          setTaxNumber(res.taxNumber ?? '');
          setBankCode(res.bankCode ?? '');
          setBankName(res.bankName ?? '');
        })
        .catch(() => setMemberDetail(null));
    } catch {
      setMemberDetail(null);
    }
  }, [user]);

  useEffect(() => {
    if (!memberDetail?.memberId) {
      setSkillNames([]);
      return;
    }
    let cancelled = false;
    Promise.all([memberSkillApi.getByMember(memberDetail.memberId), skillApi.getSkills({ pageSize: 500 })])
      .then(([memberSkills, skillsRes]) => {
        if (cancelled) return;
        const allSkills = (skillsRes as PaginationResponse<SkillListItem>).items ?? [];
        const activeOnly = memberSkills.filter((s) => s.isActive !== false);
        const ids = new Set(activeOnly.map((s) => s.skillId));
        const names = allSkills.filter((s) => ids.has(s.skillId)).map((s) => s.skillName);
        setSkillNames(names);
      })
      .catch(() => {
        if (!cancelled) setSkillNames([]);
      });
    return () => {
      cancelled = true;
    };
  }, [memberDetail?.memberId]);

  if (!user) {
    return (
      <div className="p-6">
        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle>Hồ sơ của tôi</CardTitle>
            <CardDescription>Bạn chưa đăng nhập. Vui lòng đăng nhập lại.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="bg-[#2197C0] hover:bg-[#208AAE] text-white"
              onClick={() => navigate('/login')}
            >
              Đăng nhập
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const roleId = Number(userDetail?.roleId ?? user.role);
  const roleLabel = ROLE_MAP[roleId] ?? `Vai trò ${roleId || ''}`;

  const handleAvatarFile = async (file: File | null) => {
    if (!file) return;
    if (!memberDetail?.memberId) return;
    try {
      setUploadingAvatar(true);
      await memberApi.uploadAvatar(memberDetail.memberId, file);
      const refreshed = await memberApi.getMemberById(memberDetail.memberId);
      setMemberDetail(refreshed);
      cacheAvatarUrl(refreshed.avatarUrl ?? null);
      setFullName(refreshed.fullName ?? '');
      setPhone(refreshed.phone ?? '');
      setAddress(refreshed.address ?? '');
      setCin(refreshed.cin ?? '');
      setTaxNumber(refreshed.taxNumber ?? '');
      setBankCode(refreshed.bankCode ?? '');
      setBankName(refreshed.bankName ?? '');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const startEditMember = () => {
    if (!memberDetail) return;
    setFullName(memberDetail.fullName ?? '');
    setPhone(memberDetail.phone ?? '');
    setAddress(memberDetail.address ?? '');
    setCin(memberDetail.cin ?? '');
    setTaxNumber(memberDetail.taxNumber ?? '');
    setBankCode(memberDetail.bankCode ?? '');
    setBankName(memberDetail.bankName ?? '');
    setEditingMember(true);
  };

  const cancelEditMember = () => {
    if (!memberDetail) {
      setEditingMember(false);
      return;
    }
    setFullName(memberDetail.fullName ?? '');
    setPhone(memberDetail.phone ?? '');
    setAddress(memberDetail.address ?? '');
    setCin(memberDetail.cin ?? '');
    setTaxNumber(memberDetail.taxNumber ?? '');
    setBankCode(memberDetail.bankCode ?? '');
    setBankName(memberDetail.bankName ?? '');
    setEditingMember(false);
  };

  const saveMember = async () => {
    if (!memberDetail) return;
    const teamId = memberDetail.teamId ?? 0;
    if (!teamId) {
      message.error('Không thể lưu vì thành viên chưa được gán nhóm (Team).');
      return;
    }
    if (!fullName.trim()) {
      message.warning('Vui lòng nhập họ và tên');
      return;
    }

    try {
      setSavingMember(true);
      await memberApi.updateMember(memberDetail.memberId, {
        teamId,
        fullName: fullName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        cin: cin.trim(),
        bankCode: bankCode.trim(),
        bankName: bankName.trim(),
        taxNumber: taxNumber.trim(),
        // giữ avatar hiện tại để không bị clear
        avatarUrl: memberDetail.avatarUrl ?? undefined,
      });
      const refreshed = await memberApi.getMemberById(memberDetail.memberId);
      setMemberDetail(refreshed);
      cacheAvatarUrl(refreshed.avatarUrl ?? null);
      setFullName(refreshed.fullName ?? '');
      setPhone(refreshed.phone ?? '');
      setAddress(refreshed.address ?? '');
      setCin(refreshed.cin ?? '');
      setTaxNumber(refreshed.taxNumber ?? '');
      setBankCode(refreshed.bankCode ?? '');
      setBankName(refreshed.bankName ?? '');
      setEditingMember(false);
      message.success('Cập nhật hồ sơ thành công');
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      setSavingMember(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword.trim()) {
      message.warning('Vui lòng nhập mật khẩu hiện tại');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      message.warning('Mật khẩu mới tối thiểu 6 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      message.warning('Xác nhận mật khẩu không khớp');
      return;
    }
    try {
      setChangingPassword(true);
      await authService.changePassword({
        currentPassword: currentPassword.trim(),
        newPassword,
      });
      message.success('Đổi mật khẩu thành công');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setOpenChangePassword(false);
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Hồ sơ của tôi</h1>
          <p className="text-sm text-gray-500">
            Thông tin tài khoản hiện tại đang đăng nhập trong hệ thống.
          </p>
        </div>
      </div>

      <Card className="max-w-3xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">Thông tin tài khoản</CardTitle>
            <CardDescription>Chi tiết tài khoản đăng nhập hiện tại.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100">
              {roleLabel}
            </Badge>
            <Button variant="outline" onClick={() => setOpenChangePassword(true)}>
              Đổi mật khẩu
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Field label="User ID" value={userDetail?.userId ?? user.id} />
          <Field label="Email" value={userDetail?.email ?? user.email} />
          <Field
            label="Trạng thái"
            value={
              userDetail?.isActive ? (
                <span className="text-green-600">Đang hoạt động</span>
              ) : (
                <span className="text-red-600">Đã khóa</span>
              )
            }
          />
          <Field label="Ngày tạo" value={userDetail?.createdAt ? formatDateTime(userDetail.createdAt) : '—'} />
          <Field label="Cập nhật lần cuối" value={userDetail?.updatedAt ? formatDateTime(userDetail.updatedAt) : '—'} />
        </CardContent>
      </Card>

      <Dialog
        open={openChangePassword}
        onClose={() => {
          if (changingPassword) return;
          setOpenChangePassword(false);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        }}
        title="Đổi mật khẩu"
        description="Nhập mật khẩu hiện tại và mật khẩu mới."
        className="max-w-md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleChangePassword();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label>Mật khẩu hiện tại</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-2">
            <Label>Mật khẩu mới</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Tối thiểu 6 ký tự"
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label>Xác nhận mật khẩu mới</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                if (changingPassword) return;
                setOpenChangePassword(false);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
              }}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-[#2197C0] hover:bg-[#208AAE] text-white"
              disabled={changingPassword}
            >
              {changingPassword ? 'Đang đổi...' : 'Đổi mật khẩu'}
            </Button>
          </div>
        </form>
      </Dialog>

      <Card className="max-w-3xl">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Thông tin thành viên</CardTitle>
              <CardDescription>Thông tin cá nhân gắn với tài khoản hiện tại.</CardDescription>
            </div>
            {memberDetail && (
              <div className="flex gap-2">
                {!editingMember ? (
                  <Button variant="outline" onClick={startEditMember}>
                    Chỉnh sửa
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={cancelEditMember} disabled={savingMember}>
                      Hủy
                    </Button>
                    <Button
                      className="bg-[#2197C0] hover:bg-[#208AAE] text-white"
                      onClick={saveMember}
                      disabled={savingMember}
                    >
                      {savingMember ? 'Đang lưu...' : 'Lưu'}
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!memberDetail ? (
            <div className="text-sm text-gray-500">Tài khoản này chưa có thông tin thành viên.</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <img
                  src={memberDetail.avatarUrl || '/img/ava.png'}
                  className="w-20 h-20 rounded-full object-cover border"
                  alt=""
                />
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">Avatar</div>
                  <label className="inline-flex">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleAvatarFile(e.target.files?.[0] ?? null)}
                      disabled={uploadingAvatar}
                    />
                    <span
                      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm border cursor-pointer ${
                        uploadingAvatar ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                    >
                      {uploadingAvatar ? 'Đang upload...' : 'Tải ảnh lên'}
                    </span>
                  </label>
                  <div className="text-xs text-gray-500">Hỗ trợ JPG/PNG/WebP.</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Member ID" value={memberDetail.memberId} />
                <div>
                  <Label className="text-xs text-gray-400 mb-1">Họ và tên</Label>
                  {editingMember ? (
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm">
                      {memberDetail.fullName ?? '—'}
                    </div>
                  )}
                </div>
                <Field label="Nhóm (Team)" value={memberDetail.teamId ?? '—'} />
                <div>
                  <Label className="text-xs text-gray-400 mb-1">Số điện thoại</Label>
                  {editingMember ? (
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm">
                      {memberDetail.phone ?? '—'}
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-gray-400 mb-1">Địa chỉ</Label>
                  {editingMember ? (
                    <Input value={address} onChange={(e) => setAddress(e.target.value)} />
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm">
                      {memberDetail.address ?? '—'}
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-gray-400 mb-1">CMND/CCCD</Label>
                  {editingMember ? (
                    <Input value={cin} onChange={(e) => setCin(e.target.value)} />
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm">
                      {memberDetail.cin ?? '—'}
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-gray-400 mb-1">Mã số thuế</Label>
                  {editingMember ? (
                    <Input value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} />
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm">
                      {memberDetail.taxNumber ?? '—'}
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-gray-400 mb-1">Mã ngân hàng</Label>
                  {editingMember ? (
                    <Input value={bankCode} onChange={(e) => setBankCode(e.target.value)} />
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm">
                      {memberDetail.bankCode ?? '—'}
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-gray-400 mb-1">Tên ngân hàng</Label>
                  {editingMember ? (
                    <Input value={bankName} onChange={(e) => setBankName(e.target.value)} />
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm">
                      {memberDetail.bankName ?? '—'}
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="text-sm font-medium text-gray-700 mb-2">Kỹ năng</div>
                {skillNames.length === 0 ? (
                  <div className="text-sm text-gray-500">Chưa có kỹ năng nào</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {skillNames.map((name) => (
                      <Badge key={name} variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100">
                        {name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm">
        {value ?? '—'}
      </div>
    </div>
  );
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleString('vi-VN');
}

