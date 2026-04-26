import { DataTable } from '@/shared/components/common/DataTable';
import { StatCard } from '@/shared/components/common/StatCard';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import HoverSearch from '@/shared/components/ui/search';
import { Dialog } from '@/shared/components/ui/dialog';
import { cn } from '@/shared/lib/utils';
import { message, Modal, Skeleton } from 'antd';
import type { ColumnDef } from '@tanstack/react-table';
import { CalendarClock, CheckCircle, Eye, Hash, Info, Pencil, PieChart, Plus, Power, PowerOff, RotateCcw, Users, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import dayjs from 'dayjs';
import skillApi from '../api/skillApi';
import type { SkillListItem, SkillUpsertPayload } from '../skill';
import { useSkills } from '../hooks/useSkills';
import { useSearchParams } from 'react-router-dom';
import { getRoleBadgeClass, getRoleLabel, ROLE_ID } from '@/constants/role';
import { dashboardApi, type DashboardSkillStatistics } from '@/modules/dashboard/api/dashboardApi';

function roleNameToId(roleName: string): number | null {
  const n = roleName.toLowerCase().trim();
  if (n === 'manager') return ROLE_ID.MANAGER;
  if (n === 'team leader' || n === 'teamleader') return ROLE_ID.TEAM_LEADER;
  if (n === 'program coordinator') return ROLE_ID.PROGRAM_COORDINATOR;
  if (n === 'teacher') return ROLE_ID.TEACHER;
  if (n === 'ta' || n === 'assistant') return ROLE_ID.ASSISTANT;
  if (n === 'equipment manager') return ROLE_ID.EQUIPMENT_MANAGER;
  return null;
}

function Section({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
        <Icon className="h-4 w-4 shrink-0 text-[#2197C0]" strokeWidth={2} aria-hidden />
        <h3 className="text-sm font-semibold text-black">{title}</h3>
      </div>
      <div>{children}</div>
    </section>
  );
}

function MetaRow({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={cn('py-1.5', className)}>
      <div className="text-xs font-medium text-[#2197C0]">{label}</div>
      <div className="mt-0.5 break-words text-sm text-black">{value}</div>
    </div>
  );
}

export default function SkillsManagement() {
  const { data, loading, search, setSearch, pageNumber, pageSize, totalItems, setPageNumber, refetch } =
    useSkills();

  const [skillStats, setSkillStats] = useState<DashboardSkillStatistics | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setStatsLoading(true);
    dashboardApi.getSkillStatistics()
      .then((res: any) => { if (!cancelled) setSkillStats(res); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setStatsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const [searchParams, setSearchParams] = useSearchParams();

  const [openUpsert, setOpenUpsert] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [submitting, setSubmitting] = useState(false);
  const [editingSkill, setEditingSkill] = useState<SkillListItem | null>(null);

  const [skillName, setSkillName] = useState('');
  const [description, setDescription] = useState('');

  const openDetailFromUrl = searchParams.get('openDetail');
  const skillIdFromUrl = searchParams.get('skillId');

  // Prevent: user closes detail, but URL params update async -> effect runs once more and re-opens.
  const skipNextAutoOpenRef = useRef(false);

  const [openDetail, setOpenDetail] = useState(false);
  const [detailSkill, setDetailSkill] = useState<SkillListItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);


  const closeDetailFromUrl = () => {
    skipNextAutoOpenRef.current = openDetailFromUrl === '1';
    setOpenDetail(false);
    setDetailSkill(null);
    setDetailLoading(false);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('openDetail');
      next.delete('skillId');
      return next;
    });
  };

  const openCreate = () => {
    setMode('create');
    setEditingSkill(null);
    setSkillName('');
    setDescription('');
    setOpenUpsert(true);
  };

  const openEdit = (s: SkillListItem) => {
    setMode('edit');
    setEditingSkill(s);
    setSkillName(s.skillName ?? '');
    setDescription(s.description ?? '');
    setOpenUpsert(true);
  };

  const closeUpsert = () => {
    if (submitting) return;
    setOpenUpsert(false);
  };

  const handleSubmit = async () => {
    const payload: SkillUpsertPayload = {
      skillName: skillName.trim(),
      description: description.trim(),
    };

    if (!payload.skillName) {
      message.warning('Vui lòng nhập tên kỹ năng');
      return;
    }

    try {
      setSubmitting(true);
      if (mode === 'create') {
        await skillApi.create(payload);
        message.success('Tạo kỹ năng thành công');
      } else {
        if (!editingSkill?.skillId) return;
        await skillApi.update(editingSkill.skillId, payload);
        message.success('Cập nhật kỹ năng thành công');
      }
      setOpenUpsert(false);
      await refetch();
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Có lỗi xảy ra';
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (s: SkillListItem) => {
    Modal.confirm({
      title: s.isActive ? 'Vô hiệu hóa kỹ năng?' : 'Kích hoạt kỹ năng?',
      content: s.isActive
        ? 'Kỹ năng sẽ bị vô hiệu hóa và các liên kết liên quan có thể bị vô hiệu theo.'
        : 'Kỹ năng sẽ được kích hoạt lại.',
      okText: s.isActive ? 'Vô hiệu hóa' : 'Kích hoạt',
      cancelText: 'Hủy',
      okButtonProps: { danger: s.isActive },
      onOk: async () => {
        try {
          if (s.isActive) await skillApi.deactivate(s.skillId);
          else await skillApi.activate(s.skillId);
          message.success('Cập nhật trạng thái thành công');
          await refetch();
        } catch (e: any) {
          const msg = e?.response?.data?.message || e?.message || 'Có lỗi xảy ra';
          message.error(msg);
        }
      },
    });
  };

  const handleView = (s: SkillListItem) => {
    setDetailSkill(s);
    setDetailLoading(true);
    setOpenDetail(true);
    skillApi.getById(s.skillId)
      .then((full) => setDetailSkill(full))
      .catch(() => message.error('Không tải được chi tiết kỹ năng'))
      .finally(() => setDetailLoading(false));
  };

  useEffect(() => {
    if (openDetailFromUrl !== '1') return;
    if (!skillIdFromUrl) return;
    if (skipNextAutoOpenRef.current) {
      skipNextAutoOpenRef.current = false;
      return;
    }

    const id = Number(skillIdFromUrl);
    if (!id || Number.isNaN(id)) return;

    if (openDetail && detailSkill?.skillId === id) return;

    (async () => {
      try {
        setDetailLoading(true);
        const full = await skillApi.getById(id);
        setDetailSkill(full);
        setOpenDetail(true);
      } catch {
        message.error('Không tải được thông tin kỹ năng');
      } finally {
        setDetailLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openDetailFromUrl, skillIdFromUrl, openDetail, detailSkill?.skillId]);




  const columns: ColumnDef<SkillListItem>[] = [
    {
      accessorKey: 'skillId',
      header: 'MÃ KỸ NĂNG',
      cell: ({ row }) => <span className="font-semibold text-[#1a7a99]">#{row.original.skillId}</span>,
    },
    {
      accessorKey: 'skillName',
      header: 'TÊN KỸ NĂNG',
      cell: ({ row }) => <span className="text-sm font-medium text-[#1a7a99]">{row.original.skillName}</span>,
    },
    {
      accessorKey: 'description',
      header: 'MÔ TẢ',
      cell: ({ row }) => <span className="text-sm text-slate-600 line-clamp-2">{row.original.description || '—'}</span>,
    },
    {
      accessorKey: 'isActive',
      header: 'TRẠNG THÁI',
      cell: ({ row }) => row.original.isActive ? (
        <Badge className="border-0 bg-emerald-100 text-emerald-800">Hoạt động</Badge>
      ) : (
        <Badge className="border-0 bg-orange-100 text-orange-600">Ngừng hoạt động</Badge>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'NGÀY TẠO',
      cell: ({ row }) => row.original.createdAt ? dayjs(row.original.createdAt).format('DD/MM/YYYY HH:mm') : '—',
    },
    {
      id: 'actions',
      header: () => <span className="block w-full text-center">THAO TÁC</span>,
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-3" onClick={(e) => e.stopPropagation()}>
          <span title="Xem chi tiết">
            <Eye size={16} className="cursor-pointer text-gray-800" onClick={() => handleView(row.original)} />
          </span>
          <span title="Sửa">
            <Pencil size={16} className="cursor-pointer text-blue-600" onClick={() => openEdit(row.original)} />
          </span>
          {row.original.isActive ? (
            <span title="Vô hiệu hóa">
              <PowerOff size={16} className="cursor-pointer text-red-500" onClick={() => handleToggleActive(row.original)} />
            </span>
          ) : (
            <span title="Kích hoạt">
              <Power size={16} className="cursor-pointer text-green-600" onClick={() => handleToggleActive(row.original)} />
            </span>
          )}
        </div>
      ),
    },
  ];
  return (
    <div className="p-6 pl-8 space-y-6">
      {/* HEADER */}
      <div className="flex justify-between bg-white px-6 py-4 mb-2 rounded-xl border shadow-sm items-center">
        <div>
          <h2 className="text-xl font-semibold text-[#1a7a99]">Quản lý kỹ năng</h2>
          <p className="text-xs text-gray-500">Quản lý các kỹ năng trong hệ thống</p>
        </div>

        <div className="flex gap-3 items-center">
          <Button
            className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white px-3 py-2 rounded-md"
            onClick={openCreate}
          >
            <Plus size={16} />
            Thêm kỹ năng
          </Button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-4 mb-2">
        <StatCard
          icon={<PieChart />}
          label="Tổng kỹ năng"
          value={statsLoading ? '—' : (skillStats?.totalSkills ?? totalItems).toString()}
          sub="kỹ năng trong hệ thống"
          variant="blue"
        />
        <StatCard
          icon={<CheckCircle />}
          label="Đang hoạt động"
          value={statsLoading ? '—' : (skillStats?.activeSkills ?? 0).toString()}
          sub="kỹ năng đang hoạt động"
          variant="green"
        />
        <StatCard
          icon={<Users />}
          label="TB kỹ năng/thành viên"
          value={statsLoading ? '—' : (skillStats?.averageSkillsPerMember ?? 0).toFixed(1)}
          sub="kỹ năng trung bình mỗi người"
          variant="violet"
        />
      </div>
      <div className="flex mb-2 justify-end gap-3 items-center">
        <HoverSearch value={search} onChange={(v) => { setSearch(v); setPageNumber(1); }} />
        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 bg-white border-slate-200 text-gray-600 hover:bg-gray-50" onClick={() => { setSearch(''); setPageNumber(1); }} title="Đặt lại bộ lọc">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
      {/* TABLE CARD */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        {loading && <div className="text-sm text-gray-500 mb-3">Đang tải...</div>}
        <DataTable
          columns={columns}
          data={data}
          pageNumber={pageNumber}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={setPageNumber}
          onRowClick={handleView}
        />
      </div>

      <Dialog
        open={openUpsert}
        onClose={closeUpsert}
        title={mode === 'create' ? 'Thêm kỹ năng' : 'Cập nhật kỹ năng'}
        description="Nhập tên kỹ năng và mô tả."
        className="max-w-[520px]"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tên kỹ năng</Label>
            <Input value={skillName} onChange={(e) => setSkillName(e.target.value)} placeholder="VD: ReactJS" />
          </div>
          <div className="space-y-2">
            <Label>Mô tả</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full min-h-24 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Mô tả ngắn về kỹ năng"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={closeUpsert} disabled={submitting}>
            Hủy
          </Button>
          <Button
            className="bg-[#2197C0] hover:bg-[#208AAE] text-white"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </div>
      </Dialog>

      {/* DETAIL PANEL */}
      {openDetail && (
        <>
          <div className="fixed inset-0 z-40 h-full bg-black/35" onClick={closeDetailFromUrl} aria-hidden />
          <div className={cn('fixed right-0 top-0 z-50 h-full w-[580px] max-w-[96vw]', 'border-l border-slate-200 bg-white shadow-2xl', 'translate-x-0 transition-transform duration-300 ease-out')}>
            <div className="flex h-full flex-col overflow-hidden">
              <header className="w-full shrink-0 border-b border-slate-200 bg-white">
                {detailLoading && !detailSkill ? (
                  <div className="px-5 py-5 pr-14"><Skeleton active title={{ width: '55%' }} paragraph={{ rows: 1 }} /></div>
                ) : detailSkill ? (
                  <>
                    <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium uppercase tracking-widest text-slate-400">CHI TIẾT KỸ NĂNG</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-semibold text-[#1a7a99]">{detailSkill.skillName}</h2>
                          <Badge className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium border-0', detailSkill.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700')}>
                            {detailSkill.isActive ? 'Hoạt động' : 'Vô hiệu hóa'}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">Kỹ năng #{detailSkill.skillId}</p>
                      </div>
                      <button type="button" onClick={closeDetailFromUrl} className="shrink-0 rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors" aria-label="Đóng">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="grid w-full grid-cols-2 divide-x divide-slate-200 border-t border-slate-200 bg-slate-50">
                      <div className="px-5 py-3">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-[#2197C0]">Ngày tạo</p>
                        <p className="mt-0.5 text-sm font-semibold text-slate-900">{detailSkill.createdAt ? dayjs(detailSkill.createdAt).format('DD/MM/YYYY HH:mm') : '—'}</p>
                      </div>
                      <div className="px-5 py-3">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-[#2197C0]">Trạng thái</p>
                        <p className="mt-0.5 text-sm font-semibold text-slate-900">{detailSkill.isActive ? 'Đang hoạt động' : 'Vô hiệu hóa'}</p>
                      </div>
                    </div>
                  </>
                ) : null}
              </header>
              <div className="relative min-h-0 flex-1 overflow-y-auto bg-white px-5 py-4 space-y-4">
                {detailLoading && detailSkill && <div className="pointer-events-none absolute inset-0 z-10 bg-white/45" aria-hidden />}
                {detailLoading && !detailSkill ? (
                  <Skeleton active paragraph={{ rows: 4 }} />
                ) : detailSkill ? (
                  <>
                    <Section icon={Info} title="Thông tin chung">
                      <div className="pl-4 grid grid-cols-2 gap-x-6">
                        <MetaRow label="Tên kỹ năng" value={detailSkill.skillName || '—'} />
                        <MetaRow label="Trạng thái" value={
                          <Badge className={cn('border-0 text-xs', detailSkill.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-600')}>
                            {detailSkill.isActive ? 'Hoạt động' : 'Ngừng hoạt động'}
                          </Badge>
                        } />
                        <MetaRow label="Mã kỹ năng" value={`#${detailSkill.skillId}`} />
                        <MetaRow label="Ngày tạo" value={detailSkill.createdAt ? dayjs(detailSkill.createdAt).format('DD/MM/YYYY HH:mm') : '—'} />
                        <MetaRow label="Mô tả" value={detailSkill.description || '—'} className="col-span-2" />
                      </div>
                    </Section>

                    {/* Thành viên */}
                    <Section icon={Users} title={`Thành viên có kỹ năng (${detailSkill.membersWithSkill?.length ?? 0})`}>
                      {!detailSkill.membersWithSkill?.length ? (
                        <p className="pl-4 py-2 text-sm text-slate-500">Chưa có thành viên nào.</p>
                      ) : (
                        <div className="pl-4 divide-y divide-slate-200">
                          {detailSkill.membersWithSkill.map((m) => (
                            <div key={m.memberId} className="py-2.5 flex items-center gap-3">
                              <img src={m.avatarUrl?.trim() || '/img/ava.png'} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-black truncate">{m.fullName}</p>
                                <p className="text-xs text-slate-500 truncate">{m.email}</p>
                              </div>
                              {(() => {
                                const roleId = roleNameToId(m.roleName);
                                return (
                                  <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${getRoleBadgeClass(roleId)}`}>
                                    {roleId ? getRoleLabel(roleId) : m.roleName}
                                  </span>
                                );
                              })()}                            </div>
                          ))}
                        </div>
                      )}
                    </Section>

                    {/* Môn học */}
                    <Section icon={Hash} title={`Môn học yêu cầu (${detailSkill.subjectsRequiringSkill?.length ?? 0})`}>
                      {!detailSkill.subjectsRequiringSkill?.length ? (
                        <p className="pl-4 py-2 text-sm text-slate-500">Chưa có môn học nào.</p>
                      ) : (
                        <div className="pl-4 divide-y divide-slate-200">
                          {detailSkill.subjectsRequiringSkill.map((s) => (
                            <div key={s.subjectId} className="py-2.5 flex items-center gap-2">
                              <span className="shrink-0 rounded bg-[#2197C0]/10 px-1.5 py-0.5 text-xs font-semibold text-[#2197C0]">{s.subjectCode}</span>
                              <p className="text-sm font-medium text-black">{s.subjectName}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </Section>

                    {/* Sự kiện */}
                    <Section icon={CalendarClock} title={`Sự kiện yêu cầu (${detailSkill.eventsRequiringSkill?.length ?? 0})`}>
                      {!detailSkill.eventsRequiringSkill?.length ? (
                        <p className="pl-4 py-2 text-sm text-slate-500">Chưa có sự kiện nào.</p>
                      ) : (
                        <div className="pl-4 divide-y divide-slate-200">
                          {detailSkill.eventsRequiringSkill.map((e) => (
                            <div key={e.eventId} className="py-2.5 flex items-center gap-2">
                              <span className="shrink-0 rounded bg-[#2197C0]/10 px-1.5 py-0.5 text-xs font-semibold text-[#2197C0]">{e.eventCode}</span>
                              <p className="text-sm font-medium text-black">{e.eventName}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </Section>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
