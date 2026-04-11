import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { useAuth } from '@/app/providers/AuthProvider';
import { getErrorMessage } from '@/shared/lib/errorMessage';
import userService from '@/modules/user/api/userApi';
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
import { dashboardApi, type DashboardRangeParams } from '@/modules/dashboard/api/dashboardApi';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export default function UserProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userDetail, setUserDetail] = useState<User | null>(null);
  const [memberDetail, setMemberDetail] = useState<MemberDetail | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
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
  const [workloadRange, setWorkloadRange] = useState<NonNullable<DashboardRangeParams['range']>>('thismonth');

  const originalMemberRef = useRef<{
    fullName: string;
    phone: string;
    address: string;
    cin: string;
    taxNumber: string | null;
    bankCode: string;
    bankName: string;
  } | null>(null);

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

  const { data: workload } = useQuery({
    queryKey: ['dashboard', 'user-workload', memberDetail?.memberId ?? 0, workloadRange],
    queryFn: () => dashboardApi.getUserWorkload(memberDetail?.memberId ?? 0, { range: workloadRange }),
    enabled: Boolean(memberDetail?.memberId),
  });

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

  const formatPercent = (x?: number) => {
    const v = Number(x ?? 0);
    const sign = v > 0 ? '+' : '';
    return `${sign}${v.toFixed(1)}%`;
  };

  const workloadChartData = workload
    ? ([
        {
          key: 'hours',
          label: 'Giờ giảng',
          value: Number(workload.totalTeachingHours ?? 0),
          changePercent: Number(workload.totalTeachingHoursChangePercent ?? 0),
        },
        {
          key: 'completed',
          label: 'Hoàn thành',
          value: Number(workload.completedSessions ?? 0),
          changePercent: Number(workload.completedSessionsChangePercent ?? 0),
        },
        {
          key: 'canceled',
          label: 'Bị hủy',
          value: Number(workload.canceledSessions ?? 0),
          changePercent: Number(workload.canceledSessionsChangePercent ?? 0),
        },
        {
          key: 'income',
          label: 'Thu nhập (VND)',
          value: Number(workload.estimatedIncome ?? 0),
          changePercent: Number(workload.estimatedIncomeChangePercent ?? 0),
        },
      ] as const)
    : [];

  const workloadIsEmpty = Boolean(
    workload &&
      workloadChartData.every((x) => {
        const v = Number(x.value ?? 0);
        return !Number.isFinite(v) || v === 0;
      }),
  );

  const formatWorkloadValue = (key: (typeof workloadChartData)[number]['key'], v: unknown) => {
    const n = Number(v ?? 0);
    if (key === 'income') {
      return n.toLocaleString('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
    }
    if (key === 'hours') return `${n.toFixed(1)}h`;
    return `${n}`;
  };

  const handleAvatarFile = async (file: File | null) => {
    if (!file) return;
    if (!memberDetail) return;

    const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      message.error('Ảnh avatar vượt quá giới hạn 5MB.');
      return;
    }

    try {
      setSavingMember(true);
      // Lưu tạm để đổi UI label trong lúc upload
      setAvatarFile(file);

      // Khi bấm chọn avatar -> lưu ngay, không cần bấm nút Chỉnh sửa + Lưu.
      await memberApi.updateMyMember({
        fullName: memberDetail.fullName ?? '',
        phone: memberDetail.phone ?? '',
        address: memberDetail.address ?? '',
        cin: memberDetail.cin ?? '',
        bankCode: memberDetail.bankCode ?? '',
        bankName: memberDetail.bankName ?? '',
        taxNumber: memberDetail.taxNumber ?? null,
        avatarFile: file,
      });

      const refreshed = await memberApi.getMemberById(memberDetail.memberId);
      setMemberDetail(refreshed);
      cacheAvatarUrl(refreshed.avatarUrl ?? null);
      setAvatarFile(null);
      message.success('Cập nhật avatar thành công');
    } catch (err) {
      setAvatarFile(null);
      message.error(getErrorMessage(err));
    } finally {
      setSavingMember(false);
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
    setAvatarFile(null);
    originalMemberRef.current = {
      fullName: memberDetail.fullName ?? '',
      phone: memberDetail.phone ?? '',
      address: memberDetail.address ?? '',
      cin: memberDetail.cin ?? '',
      taxNumber: memberDetail.taxNumber ?? null,
      bankCode: memberDetail.bankCode ?? '',
      bankName: memberDetail.bankName ?? '',
    };
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
    setAvatarFile(null);
    originalMemberRef.current = null;
    setEditingMember(false);
  };

  const saveMember = async () => {
    if (!memberDetail) return;
    const original = originalMemberRef.current;
    const originalSafe = original ?? {
      fullName: memberDetail.fullName ?? '',
      phone: memberDetail.phone ?? '',
      address: memberDetail.address ?? '',
      cin: memberDetail.cin ?? '',
      taxNumber: memberDetail.taxNumber ?? null,
      bankCode: memberDetail.bankCode ?? '',
      bankName: memberDetail.bankName ?? '',
    };

    const submitted = {
      fullName: fullName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      cin: cin.trim(),
      bankCode: bankCode.trim(),
      bankName: bankName.trim(),
      taxNumberTrim: taxNumber.trim(),
    };

    if (!submitted.fullName) {
      message.warning('Vui lòng nhập họ và tên');
      return;
    }
    if (!submitted.phone) {
      message.warning('Vui lòng nhập số điện thoại');
      return;
    }
    if (!submitted.address) {
      message.warning('Vui lòng nhập địa chỉ');
      return;
    }
    if (!submitted.cin) {
      message.warning('Vui lòng nhập CCCD/CMND');
      return;
    }
    if (!submitted.bankCode) {
      message.warning('Vui lòng nhập mã ngân hàng');
      return;
    }
    if (!submitted.bankName) {
      message.warning('Vui lòng nhập tên ngân hàng');
      return;
    }

    const taxOriginalNorm = (originalSafe.taxNumber ?? '') as string;
    const hasTextChanges =
      submitted.fullName !== originalSafe.fullName.trim() ||
      submitted.phone !== originalSafe.phone.trim() ||
      submitted.address !== originalSafe.address.trim() ||
      submitted.cin !== originalSafe.cin.trim() ||
      submitted.bankCode !== originalSafe.bankCode.trim() ||
      submitted.bankName !== originalSafe.bankName.trim() ||
      submitted.taxNumberTrim !== taxOriginalNorm;

    // Nếu taxNumber ban đầu là null và người dùng không đổi (đang là ''), không append TaxNumber để giữ null.
    const taxNumberForApi =
      originalSafe.taxNumber === null && submitted.taxNumberTrim === ''
        ? null
        : submitted.taxNumberTrim;

    try {
      setSavingMember(true);

      const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;
      if (avatarFile && avatarFile.size > MAX_AVATAR_SIZE_BYTES) {
        message.error('Ảnh avatar vượt quá giới hạn 5MB.');
        return;
      }

      if (!hasTextChanges && !avatarFile) {
        message.info('Không có thay đổi để cập nhật');
        return;
      }

      // Dùng PUT /members cho cả 2 trường hợp:
      // - avatar-only: gửi đủ các field text (không đổi) + avatarFile
      // - text+avatar: gửi đủ các field text + avatarFile
      await memberApi.updateMyMember({
        fullName: submitted.fullName,
        phone: submitted.phone,
        address: submitted.address,
        cin: submitted.cin,
        bankCode: submitted.bankCode,
        bankName: submitted.bankName,
        taxNumber: taxNumberForApi,
        avatarFile: avatarFile ?? null,
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
      setAvatarFile(null);
      originalMemberRef.current = null;
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
      await userService.changeOwnPassword({
        oldPassword: currentPassword.trim(),
        newPassword,
        confirmPassword,
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

  const WorkloadItem = (props: { label: string; value: React.ReactNode; changePercent: number; tone: 'green' | 'blue' | 'amber' | 'rose' }) => {
    const toneMap = {
      green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      blue: 'bg-sky-50 text-sky-700 border-sky-100',
      amber: 'bg-amber-50 text-amber-700 border-amber-100',
      rose: 'bg-rose-50 text-rose-700 border-rose-100',
    } as const;
    return (
      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] text-slate-500 font-medium">{props.label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900 truncate">{props.value}</p>
            <span className={`mt-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${toneMap[props.tone]}`}>
              {formatPercent(props.changePercent)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="bg-slate-50 p-6"
      style={{ minHeight: 'var(--content-height, 100vh)' }}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="rounded-2xl border border-teal-800 bg-teal-700 shadow-sm px-6 py-5">
          <h1 className="text-xl sm:text-2xl font-semibold text-white">Hồ sơ người dùng</h1>
          <p className="mt-1 text-sm text-white/80">
            Quản lý thông tin cá nhân và bảo mật tài khoản.
          </p>
        </div>

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-2xl border border-slate-200 shadow-sm">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div>
                <CardTitle className="text-lg">Thông tin tài khoản</CardTitle>
                <CardDescription>Chi tiết tài khoản đăng nhập hiện tại.</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2 justify-end">
                <Badge variant="secondary" className="bg-teal-50 text-teal-700 border-teal-100">
                  {roleLabel}
                </Badge>
                <Button
                  variant="outline"
                  className="bg-white border-slate-200 hover:bg-slate-50"
                  onClick={() => setOpenChangePassword(true)}
                >
                  Đổi mật khẩu
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Email" value={userDetail?.email ?? user.email} />
              <Field
                label="Trạng thái"
                value={
                  userDetail?.isActive ? (
                    <span className="inline-flex items-center gap-2 text-emerald-700">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Đang hoạt động
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 text-rose-700">
                      <span className="h-2 w-2 rounded-full bg-rose-500" />
                      Đã khóa
                    </span>
                  )
                }
              />
              <Field
                label="Ngày tạo"
                value={userDetail?.createdAt ? formatDateTime(userDetail.createdAt) : '—'}
              />
              <Field
                label="Cập nhật lần cuối"
                value={userDetail?.updatedAt ? formatDateTime(userDetail.updatedAt) : '—'}
              />
            </CardContent>
          </Card>

            <Card className="rounded-2xl border border-slate-200 shadow-sm">
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
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <img
                    src={memberDetail.avatarUrl || '/img/ava.png'}
                    className="w-20 h-20 rounded-2xl object-cover border border-slate-200 bg-white shadow-sm"
                    alt=""
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="text-sm font-medium text-slate-900">Ảnh đại diện</div>
                    <div className="text-xs text-slate-500">
                      Hỗ trợ JPG/PNG/WebP · Tối đa 5MB
                    </div>
                  </div>
                  <label className="inline-flex">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleAvatarFile(e.target.files?.[0] ?? null)}
                      disabled={savingMember}
                    />
                    <span className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer">
                      {savingMember ? 'Đang lưu...' : avatarFile ? 'Đã chọn ảnh' : 'Đổi ảnh'}
                    </span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Member ID" value={memberDetail.memberId} />
                <div>
                  <Label className="text-xs text-slate-500 mb-1">Họ và tên</Label>
                  {editingMember ? (
                    <Input
                      className="bg-white border-slate-200 focus-visible:ring-sky-400"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-900">
                      {memberDetail.fullName ?? '—'}
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-slate-500 mb-1">Số điện thoại</Label>
                  {editingMember ? (
                    <Input
                      className="bg-white border-slate-200 focus-visible:ring-sky-400"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-900">
                      {memberDetail.phone ?? '—'}
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-slate-500 mb-1">Địa chỉ</Label>
                  {editingMember ? (
                    <Input
                      className="bg-white border-slate-200 focus-visible:ring-sky-400"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-900">
                      {memberDetail.address ?? '—'}
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-slate-500 mb-1">CMND/CCCD</Label>
                  {editingMember ? (
                    <Input
                      className="bg-white border-slate-200 focus-visible:ring-sky-400"
                      value={cin}
                      onChange={(e) => setCin(e.target.value)}
                    />
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-900">
                      {memberDetail.cin ?? '—'}
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-slate-500 mb-1">Mã số thuế</Label>
                  {editingMember ? (
                    <Input
                      className="bg-white border-slate-200 focus-visible:ring-sky-400"
                      value={taxNumber}
                      onChange={(e) => setTaxNumber(e.target.value)}
                    />
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-900">
                      {memberDetail.taxNumber ?? '—'}
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-slate-500 mb-1">Mã ngân hàng</Label>
                  {editingMember ? (
                    <Input
                      className="bg-white border-slate-200 focus-visible:ring-sky-400"
                      value={bankCode}
                      onChange={(e) => setBankCode(e.target.value)}
                    />
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-900">
                      {memberDetail.bankCode ?? '—'}
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-slate-500 mb-1">Tên ngân hàng</Label>
                  {editingMember ? (
                    <Input
                      className="bg-white border-slate-200 focus-visible:ring-sky-400"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                    />
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-900">
                      {memberDetail.bankName ?? '—'}
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="text-sm font-medium text-slate-800 mb-2">Kỹ năng</div>
                {skillNames.length === 0 ? (
                  <div className="text-sm text-gray-500">Chưa có kỹ năng nào</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {skillNames.map((name) => (
                      <Badge key={name} variant="secondary" className="bg-sky-50 text-sky-700 border-sky-100">
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

          <div className="lg:sticky lg:top-6">
            <Card className="rounded-2xl border border-slate-200 shadow-sm">
            <CardHeader className="space-y-3">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-teal-600" />
                  Khối lượng công việc
                </CardTitle>
                <CardDescription>
                  Thống kê hiệu suất giảng dạy của bạn theo khoảng thời gian.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Khoảng:</span>
                <select
                  className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-teal-400"
                  value={workloadRange}
                  onChange={(e) =>
                    setWorkloadRange(e.target.value as NonNullable<DashboardRangeParams['range']>)
                  }
                  disabled={!memberDetail?.memberId}
                >
                  <option value="today">Hôm nay</option>
                  <option value="thisweek">Tuần này</option>
                  <option value="thismonth">Tháng này</option>
                  <option value="last3months">3 tháng gần đây</option>
                  <option value="last6months">6 tháng gần đây</option>
                  <option value="1year">1 năm gần đây</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              {!memberDetail?.memberId ? (
                <div className="text-sm text-gray-500">
                  Tài khoản này chưa có thông tin thành viên nên không thể thống kê workload.
                </div>
              ) : !workload ? (
                <div className="text-sm text-gray-500">Đang tải workload...</div>
              ) : (
                <div className="space-y-4">
                  <div className="relative h-56 rounded-xl border border-slate-200 bg-white p-3">
                    {workloadIsEmpty && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/75 backdrop-blur-[1px]">
                        <div className="text-sm text-slate-500">Chưa có dữ liệu trong khoảng này</div>
                      </div>
                    )}
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={workloadChartData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} interval={0} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip
                          formatter={(value: any, _name: any, props: any) => {
                            const key = props?.payload?.key as (typeof workloadChartData)[number]['key'];
                            return formatWorkloadValue(key, value);
                          }}
                          labelFormatter={(label) => `Chỉ số: ${label}`}
                        />
                        <Legend />
                        <Bar dataKey="value" name="Giá trị" fill="#14b8a6" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <WorkloadItem
                      label="Tổng giờ giảng"
                      value={`${Number(workload.totalTeachingHours ?? 0).toFixed(1)}h`}
                      changePercent={workload.totalTeachingHoursChangePercent ?? 0}
                      tone="blue"
                    />
                    <WorkloadItem
                      label="Phiên hoàn thành"
                      value={workload.completedSessions ?? 0}
                      changePercent={workload.completedSessionsChangePercent ?? 0}
                      tone="green"
                    />
                    <WorkloadItem
                      label="Phiên bị hủy"
                      value={workload.canceledSessions ?? 0}
                      changePercent={workload.canceledSessionsChangePercent ?? 0}
                      tone="rose"
                    />
                    <WorkloadItem
                      label="Thu nhập ước tính"
                      value={Number(workload.estimatedIncome ?? 0).toLocaleString('vi-VN', {
                        style: 'currency',
                        currency: 'VND',
                        maximumFractionDigits: 0,
                      })}
                      changePercent={workload.estimatedIncomeChangePercent ?? 0}
                      tone="amber"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <div className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-900">
        {value ?? '—'}
      </div>
    </div>
  );
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleString('vi-VN');
}

