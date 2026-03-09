import { useState } from 'react';
import { message } from 'antd';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { DataTable } from '@/shared/components/common/DataTable';
import { Button } from '@/shared/components/ui/button';
import HoverSearch from '@/shared/components/ui/search';
import { Dialog } from '@/shared/components/ui/dialog';
import type { CategoryListItem } from '@/modules/category/category';
import { useCategories } from '../hooks/useCategories';
import categoryApi from '../api/categoryApi';
import CreateCategoryModal from './CreateCategoryModal';
import EditCategoryModal from './EditCategoryModal';
import CategoryDetailSidebar from './CategoryDetailSidebar';

export default function CategoriesManagement() {
  const context = useOutletContext<{ position?: string }>();
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<CategoryListItem | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryListItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailCategory, setDetailCategory] = useState<CategoryListItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

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

  const handleEdit = (category: CategoryListItem) => {
    setEditCategory(category);
    setEditOpen(true);
  };

  const handleView = async (category: CategoryListItem) => {
    try {
      setDetailLoading(true);
      const full = await categoryApi.getById(category.categoryId);
      setDetailCategory(full);
      setDetailOpen(true);
    } catch {
      message.error('Không tải được thông tin danh mục');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDeleteClick = (category: CategoryListItem) => {
    setCategoryToDelete(category);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;
    try {
      await categoryApi.remove(categoryToDelete.categoryId);
      message.success('Đã xóa danh mục');
      setDeleteOpen(false);
      setCategoryToDelete(null);
      refetch();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      message.error(msg || 'Xóa danh mục thất bại');
    }
  };

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
      cell: ({ row }) => {
        const item = row.original;
        const count =
          item.totalEquipment 
        return <span className="font-semibold">{count}</span>;
      },
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
      cell: ({ row }) => {
        const category = row.original;
        return (
          <div className="flex items-center gap-3">
            <Trash2
              size={16}
              className="text-red-500 cursor-pointer"
              onClick={() => handleDeleteClick(category)}
            />
            <Pencil
              size={16}
              className="text-blue-600 cursor-pointer"
              onClick={() => handleEdit(category)}
            />
            <Eye
              size={16}
              className="text-blue-600 cursor-pointer"
              onClick={() => handleView(category)}
            />
          </div>
        );
      },
    },
  ];

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
      <CategoryDetailSidebar
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetailCategory(null);
        }}
        category={detailCategory}
      />
      <EditCategoryModal
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditCategory(null);
        }}
        category={editCategory}
        onUpdated={refetch}
      />
      <Dialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setCategoryToDelete(null);
        }}
        title="Xác nhận xóa danh mục"
        description={
          categoryToDelete
            ? `Bạn có chắc muốn xóa danh mục "${categoryToDelete.categoryName}"? Hành động này không thể hoàn tác.`
            : 'Bạn có chắc muốn xóa danh mục này?'
        }
      >
        <div className="flex gap-3 justify-end pt-2">
          <Button
            variant="outline"
            onClick={() => {
              setDeleteOpen(false);
              setCategoryToDelete(null);
            }}
          >
            Hủy
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={handleDeleteConfirm}
          >
            Xóa danh mục
          </Button>
        </div>
      </Dialog>
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
