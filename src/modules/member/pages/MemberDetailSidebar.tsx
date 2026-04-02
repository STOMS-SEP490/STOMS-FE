import { useMemo, useState, useEffect } from 'react';
import { X, BarChart3 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { MemberDetail } from '@/modules/member/member';
import { ROLE_MAP } from '@/constants/role';
import { Badge } from '@/shared/components/ui/badge';
import memberSkillApi from '@/modules/member/api/memberSkillApi';
import skillApi from '@/modules/skill/api/skillApi';
import type { SkillListItem } from '@/modules/skill/skill';
import type { PaginationResponse } from '@/shared/types/api';
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

type Props = {
  open: boolean;
  onClose: () => void;
  member: MemberDetail | null;
};

export default function MemberDetailSidebar({ open, onClose, member }: Props) {
  const [skillNames, setSkillNames] = useState<string[]>([]);
  const [workloadRange, setWorkloadRange] =
    useState<NonNullable<DashboardRangeParams['range']>>('thismonth');

  useEffect(() => {
    if (!open || !member?.memberId) {
      setSkillNames([]);
      return;
    }
    let cancelled = false;
    Promise.all([memberSkillApi.getByMember(member.memberId), skillApi.getSkills({ pageSize: 500 })])
      .then(([memberSkills, skillsRes]) => {
        if (cancelled) return;
        const allSkills = (skillsRes as PaginationResponse<SkillListItem>).items ?? [];
        // Chỉ hiện MemberSkill đang bật; isActive === false thì ẩn; undefined coi như true (API cũ)
        const activeOnly = memberSkills.filter((s) => s.isActive !== false);
        const ids = new Set(activeOnly.map((s) => s.skillId));
        const names = allSkills.filter((s) => ids.has(s.skillId)).map((s) => s.skillName);
        setSkillNames(names);
      })
      .catch(() => setSkillNames([]));
    return () => {
      cancelled = true;
    };
  }, [open, member?.memberId]);

  const { data: workload } = useQuery({
    queryKey: ['dashboard', 'member-workload', member?.memberId ?? 0, workloadRange],
    queryFn: () => dashboardApi.getUserWorkload(member?.memberId ?? 0, { range: workloadRange }),
    enabled: Boolean(open && member?.memberId),
  });

  if (!member) return null;

  const roleLabel = member.roleId ? ROLE_MAP[member.roleId] : '—';

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

  const formatWorkloadValue = (
    key: (typeof workloadChartData)[number]['key'],
    v: unknown,
  ) => {
    const n = Number(v ?? 0);
    if (key === 'income') {
      return n.toLocaleString('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
      });
    }
    if (key === 'hours') return `${n.toFixed(1)}h`;
    return `${n}`;
  };

  const WorkloadItem = (props: {
    label: string;
    value: React.ReactNode;
    changePercent: number;
    tone: 'green' | 'blue' | 'amber' | 'rose';
  }) => {
    const toneMap = {
      green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      blue: 'bg-sky-50 text-sky-700 border-sky-100',
      amber: 'bg-amber-50 text-amber-700 border-amber-100',
      rose: 'bg-rose-50 text-rose-700 border-rose-100',
    } as const;
    return (
      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="min-w-0">
          <p className="text-[11px] text-slate-500 font-medium">{props.label}</p>
          <p className="mt-1 text-xl font-semibold text-slate-900 truncate">
            {props.value}
          </p>
          <span
            className={`mt-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
              toneMap[props.tone]
            }`}
          >
            {formatPercent(props.changePercent)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/30 z-40 h-full" onClick={onClose} />}

      <div
        className={`fixed top-0 right-0 h-full w-[600px] bg-[#f3f4f6] z-50
        transition-transform duration-300
        ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex flex-col h-full overflow-y-auto no-scrollbar text-gray-700">
          <div className="px-8 py-6 bg-[#f3f4f6] ">
            <div className="flex justify-between items-start">
              <div className="flex gap-4">
                <img
                  src={member.avatarUrl || '/img/ava.png'}
                  className="w-16 h-16 rounded-full object-cover"
                  alt=""
                />
                <div>
                  <h2 className="text-lg font-semibold">{member.fullName}</h2>
                  <p className="text-sm text-gray-500">{member.email ?? '—'}</p>
                  <div className="flex gap-2 mt-2">
                    {member.team?.teamName && (
                      <Badge className="bg-green-100 text-green-700">{member.team.teamName}</Badge>
                    )}
                    <Badge className="bg-blue-100 text-blue-700">{roleLabel}</Badge>
                  </div>
                </div>
              </div>
              <button type="button" onClick={onClose}>
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mt-4 mb-0">
              <div>
                <p className="text-xs text-gray-400 font-semibold">ID THÀNH VIÊN</p>
                <p>{member.memberId}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold">VAI TRÒ</p>
                <p>{roleLabel}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold">NGÀY THAM GIA</p>
                <p>{formatDate(member.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold">CẬP NHẬT LẦN CUỐI</p>
                <p>{formatDateTime(member.updatedAt)}</p>
              </div>
            </div>
          </div>

          <Section title="Thông tin tài khoản">
            <Field label="User ID" value={member.userId} />
            <Field label="Email" value={member.email} />
            <Field label="Vai trò (roleId)" value={member.roleId != null ? `${member.roleId} — ${roleLabel}` : '—'} />
            <Field
              label="Trạng thái"
              value={
                member.isActive ? (
                  <Badge className="bg-green-100 text-green-700">Đang hoạt động</Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-700">Đã khóa</Badge>
                )
              }
            />
            <Field label="Ngày tạo tài khoản" value={formatDateTime(member.userCreatedAt)} />
            <Field label="Cập nhật tài khoản" value={formatDateTime(member.userUpdatedAt)} />
            <Field label="Khóa tài khoản lúc" value={formatDateTime(member.userLockedAt)} />
          </Section>

        

          <Section title="Thông tin cá nhân">
            <Field label="Họ và tên" value={member.fullName} />
            <Field label="Số điện thoại" value={member.phone} />
            <Field label="Địa chỉ" value={member.address} />
            <Field label="CMND/CCCD" value={member.cin} />
            <Field label="Mã số thuế" value={member.taxNumber} />
            <Field label="Mã ngân hàng" value={member.bankCode} />
            <Field label="Tên ngân hàng" value={member.bankName} />
            <Field label="Tên nhóm" value={member.team?.teamName ?? '—'} />
          </Section>

          <Section title="Kỹ năng">
            <div className="col-span-2">
              <p className="text-xs text-gray-400 mb-1">Các kỹ năng đã gán</p>
              <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm">
                {skillNames.length === 0 ? (
                  <span className="text-gray-500">Chưa có kỹ năng nào</span>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {skillNames.map((name) => (
                      <Badge key={name} variant="secondary" className="bg-blue-50 text-blue-700">
                        {name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Section>

          <Section title="Khối lượng công việc">
            <div className="col-span-2 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <BarChart3 className="h-4 w-4 text-teal-600" />
                  Thống kê theo khoảng thời gian
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Khoảng:</span>
                  <select
                    className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-teal-400"
                    value={workloadRange}
                    onChange={(e) =>
                      setWorkloadRange(
                        e.target.value as NonNullable<DashboardRangeParams['range']>,
                      )
                    }
                    disabled={!member?.memberId}
                  >
                    <option value="today">Hôm nay</option>
                    <option value="thisweek">Tuần này</option>
                    <option value="thismonth">Tháng này</option>
                    <option value="last3months">3 tháng gần đây</option>
                    <option value="last6months">6 tháng gần đây</option>
                    <option value="1year">1 năm gần đây</option>
                  </select>
                </div>
              </div>

              {!member?.memberId ? (
                <div className="text-sm text-gray-500">
                  Tài khoản này chưa có thông tin thành viên nên không thể thống kê workload.
                </div>
              ) : !workload ? (
                <div className="text-sm text-gray-500">Đang tải workload...</div>
              ) : (
                <div className="space-y-4">
                  <div className="relative h-52 rounded-xl border border-slate-200 bg-white p-3">
                    {workloadIsEmpty && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/75 backdrop-blur-[1px]">
                        <div className="text-sm text-slate-500">
                          Chưa có dữ liệu trong khoảng này
                        </div>
                      </div>
                    )}
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={workloadChartData}
                        margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
                      >
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
                      value={Number(workload.completedSessions ?? 0)}
                      changePercent={workload.completedSessionsChangePercent ?? 0}
                      tone="green"
                    />
                    <WorkloadItem
                      label="Phiên bị hủy"
                      value={Number(workload.canceledSessions ?? 0)}
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
            </div>
          </Section>
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-6 bg-white rounded-xl shadow-sm mx-6 m-2 space-y-4">
      <h3 className="font-semibold">{title}</h3>
      <div className="grid grid-cols-2 gap-4 text-sm">{children}</div>
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

function formatDate(date?: string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('vi-VN');
}

function formatDateTime(date?: string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleString('vi-VN');
}
