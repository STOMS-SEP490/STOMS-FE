
import { DataTable } from '@/shared/components/common/DataTable';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import HoverSearch from '@/shared/components/ui/search';
import { Dialog } from '@/shared/components/ui/dialog';
import { message, Modal } from 'antd';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, Pencil, Plus, Power, PowerOff } from 'lucide-react';
import { useMemo, useState } from 'react';
import skillApi from '../api/skillApi';
import type { SkillListItem, SkillUpsertPayload } from '../skill';
import { useSkills } from '../hooks/useSkills';

export default function SkillsManagement() {
  const { data, loading, search, setSearch, pageNumber, pageSize, totalItems, setPageNumber, refetch } =
    useSkills();

  const [openUpsert, setOpenUpsert] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [submitting, setSubmitting] = useState(false);
  const [editingSkill, setEditingSkill] = useState<SkillListItem | null>(null);

  const [skillName, setSkillName] = useState('');
  const [description, setDescription] = useState('');

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
    Modal.info({
      title: `Kỹ năng #${s.skillId}`,
      content: (
        <div className="space-y-2">
          <div>
            <div className="text-xs text-gray-500">Tên kỹ năng</div>
            <div className="text-sm font-medium">{s.skillName || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Mô tả</div>
            <div className="text-sm">{s.description || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Trạng thái</div>
            <div className="text-sm">{s.isActive ? 'Đang hoạt động' : 'Vô hiệu hóa'}</div>
          </div>
        </div>
      ),
      okText: 'Đóng',
    });
  };

  const stats = useMemo(() => {
    const active = data.filter((x) => x.isActive).length;
    const inactive = data.length - active;
    return { active, inactive };
  }, [data]);

  const columns: ColumnDef<SkillListItem>[] = [
    {
      accessorKey: 'skillId',
      header: 'MÃ KỸ NĂNG',
      cell: ({ row }) => <div className="text-sm font-medium">{row.original.skillId}</div>,
    },
    {
      accessorKey: 'skillName',
      header: 'TÊN KỸ NĂNG',
      cell: ({ row }) => <div className="text-sm font-medium">{row.original.skillName}</div>,
    },
    {
      accessorKey: 'description',
      header: 'MÔ TẢ',
      cell: ({ row }) => <div>{row.original.description}</div>,
    },
    {
      accessorKey: 'isActive',
      header: 'TRẠNG THÁI',
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.isActive ? (
            <span className="inline-flex items-center rounded-full bg-green-50 text-green-700 px-2 py-0.5 border border-green-100">
              Đang hoạt động
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-gray-50 text-gray-700 px-2 py-0.5 border border-gray-200">
              Vô hiệu hóa
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'NGÀY TẠO',
    },
    {
      id: 'actions',
      header: 'THAO TÁC',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => handleView(row.original)} title="Xem">
            <Eye className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => openEdit(row.original)} title="Sửa">
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleToggleActive(row.original)}
            title={row.original.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
          >
            {row.original.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
          </Button>
        </div>
      ),
    },
  ];
  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex justify-between bg-white px-6 py-4 mb-2 rounded-xl border shadow-sm items-center">
        <div>
          <h2 className="text-xl font-semibold text-black">Quản lý kỹ năng</h2>
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
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <div className="text-xs text-gray-500">Tổng kỹ năng</div>
          <div className="text-2xl font-semibold text-slate-900">{totalItems}</div>
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <div className="text-xs text-gray-500">Đang hoạt động (trang hiện tại)</div>
          <div className="text-2xl font-semibold text-green-700">{stats.active}</div>
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <div className="text-xs text-gray-500">Vô hiệu hóa (trang hiện tại)</div>
          <div className="text-2xl font-semibold text-slate-900">{stats.inactive}</div>
        </div>
      </div>
      <div className="flex mb-2 justify-end">
        <HoverSearch value={search} onChange={setSearch} />
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
    </div>
  );
}
