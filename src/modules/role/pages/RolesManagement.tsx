import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Shield, Users, Plus, Pencil, Trash2 } from 'lucide-react';

import { DataTable } from '@/shared/components/common/DataTable';
import { StatCard } from '@/shared/components/common/StatCard';
import HoverSearch from '@/shared/components/ui/search';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Dialog } from '@/shared/components/ui/dialog';
import { message } from 'antd';

import type { RoleListItem } from '../role';
import { useRoles } from '../hooks/useRoles';
import roleApi from '../api/roleApi';

type RoleFormState = {
  roleName: string;
};

type Mode = 'create' | 'edit';

export default function RolesManagement() {
  const { data, search, setSearch, pageNumber, pageSize, totalItems, setPageNumber, refetch } =
    useRoles();

  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<Mode>('create');
  const [editingRole, setEditingRole] = useState<RoleListItem | null>(null);
  const [form, setForm] = useState<RoleFormState>({ roleName: '' });
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setDialogMode('create');
    setEditingRole(null);
    setForm({ roleName: '' });
    setOpenDialog(true);
  };

  const openEdit = (role: RoleListItem) => {
    setDialogMode('edit');
    setEditingRole(role);
    setForm({ roleName: role.roleName });
    setOpenDialog(true);
  };

  const getErrorMessage = (err: unknown): string => {
    // Axios interceptor reject với error.response?.data, nên err có thể là string hoặc object từ API
    if (typeof err === 'string') return err;
    if (err && typeof err === 'object') {
      const o = err as Record<string, unknown>;
      if (typeof o.message === 'string') return o.message;
      if (typeof o.detail === 'string') return o.detail; // ASP.NET ProblemDetails
      if (typeof o.title === 'string') return o.title;
    }
    if (err instanceof Error && err.message) return err.message;
    return 'Có lỗi xảy ra';
  };

  const handleSubmit = async () => {
    if (!form.roleName.trim()) return;

    try {
      setSaving(true);
      if (dialogMode === 'create') {
        await roleApi.create({ roleName: form.roleName.trim() });
        message.success('Thêm vai trò thành công');
      } else if (editingRole) {
        await roleApi.update(editingRole.roleId, { roleName: form.roleName.trim() });
        message.success('Cập nhật vai trò thành công');
      }
      await refetch();
      setOpenDialog(false);
    } catch (err) {
      console.error('save role error:', err);
      message.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role: RoleListItem) => {
    try {
      await roleApi.remove(role.roleId);
      message.success('Xóa vai trò thành công');
      await refetch();
    } catch (err) {
      console.error('delete role error:', err);
      message.error(getErrorMessage(err));
    }
  };

  const columns: ColumnDef<RoleListItem>[] = [
    {
      accessorKey: 'roleId',
      header: 'MÃ VAI TRÒ',
      cell: ({ row }) => <div className="text-sm font-medium">{row.original.roleId}</div>,
    },
    {
      accessorKey: 'roleName',
      header: 'TÊN VAI TRÒ',
      cell: ({ row }) => <div className="text-sm font-medium">{row.original.roleName}</div>,
    },
    {
      id: 'actions',
      header: 'THAO TÁC',
      cell: ({ row }) => {
        const role = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openEdit(role)}
              aria-label="Sửa vai trò"
            >
              <Pencil className="w-4 h-4 text-blue-600" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(role)}
              aria-label="Xóa vai trò"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        );
      },
    },
  ];

  const totalRoles = totalItems;

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex justify-between bg-white px-6 py-4 mb-2 rounded-xl border shadow-sm items-center">
        <div>
          <h2 className="text-xl font-semibold text-black">Quản lý vai trò</h2>
          <p className="text-xs text-gray-500">
            Quản lý danh sách vai trò trong hệ thống để gán cho người dùng.
          </p>
        </div>

        <div className="flex gap-3 items-center">
          <Button
            onClick={openCreate}
            className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white px-3 py-2 rounded-md"
          >
            <Plus size={16} />
            Thêm vai trò
          </Button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-4 gap-4 mb-2">
        <StatCard icon={<Shield />} label="Tổng vai trò" value={String(totalRoles)} sub="vai trò" />
        <StatCard
          icon={<Users />}
          label="Phân quyền"
          value="-"
          sub="Gán role cho user thực hiện ở màn hình tài khoản"
        />
      </div>

      {/* FILTER BAR */}
      <div className="flex justify-end gap-3 mb-2">
        <HoverSearch
          placeholder="Tìm theo tên vai trò..."
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPageNumber(1);
          }}
        />
      </div>

      {/* TABLE */}
      <DataTable
        columns={columns}
        data={data}
        pageNumber={pageNumber}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={(page) => setPageNumber(page)}
      />

      {/* DIALOG: CREATE / EDIT */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        title={dialogMode === 'create' ? 'Thêm vai trò mới' : 'Chỉnh sửa vai trò'}
        description="Nhập tên vai trò để sử dụng khi gán cho tài khoản người dùng."
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-black">Tên vai trò</label>
            <Input
              value={form.roleName}
              onChange={(e) => setForm({ ...form, roleName: e.target.value })}
              placeholder="Ví dụ: Quản lý, Giảng viên..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              className="bg-white text-black border border-gray-300 hover:bg-gray-100"
              onClick={() => setOpenDialog(false)}
            >
              Hủy
            </Button>
            <Button
              className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white px-4 py-2 rounded-md"
              onClick={handleSubmit}
              disabled={saving || !form.roleName.trim()}
            >
              {saving ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

