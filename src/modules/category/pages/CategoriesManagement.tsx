import { DataTable } from '@/shared/components/common/DataTable';
import { Button } from '@/shared/components/ui/button';
import HoverSearch from '@/shared/components/ui/search';
import type { CategoryListItem } from '@/modules/category/category';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useCategories } from '../hooks/useCategories';
import CreateCategoryModal from './CreateCategoryModal';

const columns: ColumnDef<CategoryListItem>[] = [
  {
    accessorKey: 'categoryName',
    header: 'Tên danh mục',
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.categoryName}</div>
      </div>
    ),
  },
  {
    accessorKey: 'description',
    header: 'Mô tả',
  },
  {
    id: 'totalDevices',
    header: 'Số thiết bị',
    cell: ({ row }) => (
      <span className="font-semibold">
        {row.original.equipment?.length ?? 0}
      </span>
    ),
  },
 
  {
    accessorKey: 'createdAt',
    header: 'Ngày tạo',
    cell: ({ row }) =>
      row.original.createdAt
        ? new Date(row.original.createdAt).toLocaleDateString('vi-VN')
        : '—',
  },
  {
    id: 'actions',
    header: 'Thao tác',
    enableSorting: false,
    cell: () => (
      <div className="flex items-center gap-3">
        <Eye className="w-4 h-4 cursor-pointer text-blue-600" />
        <Pencil className="w-4 h-4 cursor-pointer text-gray-600" />
        <Trash2 className="w-4 h-4 cursor-pointer text-red-600" />
      </div>
    ),
  },
];

export default function CategoriesManagement() {
  const context = useOutletContext<{ position?: string }>();
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const {
    data,
    loading,
    search,
    setSearch,
    pageNumber,
    pageSize,
    totalItems,
    setPageNumber,
    refetch,
  } = useCategories();

  if (context?.position === 'header') {
    return (
      <>
        <Button
          onClick={() => setOpenCreateModal(true)}
          className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white"
        >
          <Plus size={16} />
          Tạo danh mục thiết bị
        </Button>
        <CreateCategoryModal
          open={openCreateModal}
          onClose={() => setOpenCreateModal(false)}
          onCreated={() => {
            refetch();
            setOpenCreateModal(false);
          }}
        />
      </>
    );
  }

  if (context?.position === 'toolbar') {
    return (
      <div className="flex gap-3">
        <HoverSearch
          placeholder="Tìm tên danh mục..."
          value={search}
          onChange={(value) => setSearch(value)}
        />
      </div>
    );
  }

  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-md">
          <span className="text-sm text-muted-foreground">Đang tải...</span>
        </div>
      )}
      <DataTable
        columns={columns}
        data={data}
        pageNumber={pageNumber}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={(page) => setPageNumber(page)}
      />
      </div>
  );
}
