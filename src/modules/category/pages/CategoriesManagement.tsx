import { useMemo, useState } from 'react';
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { DataTable } from '@/shared/components/common/DataTable';
import HoverSearch from '@/shared/components/ui/search';
import type { ColumnDef, Row } from '@tanstack/react-table';
import { useCategories } from '../hooks/useCategories';
import type { CategoryListItem } from '../category';
import CreateCategoryModal from './CreateCategoryModal';
import EditCategoryModal from './EditCategoryModal';
import CategoryDetailSidebar from './CategoryDetailSidebar';
import { message, Modal } from 'antd';
import categoryApi from '../api/categoryApi';
import { useLocation } from 'react-router-dom';

export default function CategoriesManagement() {
  const location = useLocation();
  const isEquipmentManager = location.pathname.startsWith('/em/');
  const { data: categories, loading, refetch } = useCategories();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<CategoryListItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailCategory, setDetailCategory] = useState<CategoryListItem | null>(null);
  const [search, setSearch] = useState('');

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const searchLower = search.toLowerCase().trim();
    return categories.filter(
      (cat) =>
        cat.categoryName?.toLowerCase().includes(searchLower) ||
        cat.description?.toLowerCase().includes(searchLower)
    );
  }, [categories, search]);

  const handleView = async (category: CategoryListItem) => {
    try {
      // Gọi API getById để lấy đầy đủ thông tin bao gồm equipment
      const fullCategory = await categoryApi.getById(category.categoryId);
      setDetailCategory(fullCategory);
      setDetailOpen(true);
    } catch (err) {
      message.error('Không tải được thông tin danh mục');
      console.error('fetch category detail error:', err);
    }
  };

  const handleEdit = (category: CategoryListItem) => {
    setEditCategory(category);
    setEditOpen(true);
  };

  const handleDelete = (category: CategoryListItem) => {
    Modal.confirm({
      title: 'Xác nhận xóa danh mục',
      content: `Bạn có chắc chắn muốn xóa danh mục "${category.categoryName}"? Thao tác này không thể hoàn tác.`,
      okText: 'Xóa',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await categoryApi.remove(category.categoryId);
          message.success('Xóa danh mục thành công');
          refetch();
        } catch (err: any) {
          const errorMsg = err?.response?.data?.message || 'Xóa danh mục thất bại';
          message.error(errorMsg);
        }
      },
    });
  };

  const columns: ColumnDef<CategoryListItem>[] = useMemo(
    () => {
      const baseColumns: ColumnDef<CategoryListItem>[] = [
        {
          accessorKey: 'categoryId',
          header: 'ID',
          cell: ({ row }) => <span className="font-medium text-[#1a7a99]">#{row.original.categoryId}</span>,
        },
        {
          accessorKey: 'categoryName',
          header: 'Tên danh mục',
          cell: ({ row }) => <span className="font-semibold text-slate-900">{row.original.categoryName}</span>,
        },
        {
          accessorKey: 'description',
          header: 'Mô tả',
          cell: ({ row }) => (
            <span className="text-sm text-slate-600">{row.original.description || '—'}</span>
          ),
        },
        {
          accessorKey: 'totalEquipment',
          header: () => <span className="block w-full text-center">Số thiết bị</span>,
          cell: ({ row }) => (
            <div className="text-center">
              <span className="font-medium">{row.original.totalEquipment ?? 0}</span>
            </div>
          ),
        },
      ];

      // Chỉ thêm cột thao tác cho Equipment Manager
      if (isEquipmentManager) {
        baseColumns.push({
          id: 'actions',
          header: () => <span className="block w-full text-center">Thao tác</span>,
          enableSorting: false,
          cell: ({ row }: { row: Row<CategoryListItem> }) => (
            <div
              className="flex gap-3"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <span title="Xem chi tiết">
                <Eye
                  size={16}
                  className="cursor-pointer text-gray-800"
                  onClick={() => handleView(row.original)}
                />
              </span>
              <span title="Chỉnh sửa">
                <Pencil
                  size={16}
                  className="cursor-pointer text-blue-600"
                  onClick={() => handleEdit(row.original)}
                />
              </span>
              <span title="Xóa">
                <Trash2
                  size={16}
                  className="cursor-pointer text-red-500"
                  onClick={() => handleDelete(row.original)}
                />
              </span>
            </div>
          ),
        });
      }

      return baseColumns;
    },
    [isEquipmentManager]
  );

  return (
    <div className="p-6 pl-8 space-y-6 app-page-bg" style={{ minHeight: 'var(--content-height, 100vh)' }}>
      {/* HEADER */}
      <div className="bg-white flex justify-between items-center px-6 py-4 mb-2 rounded-xl border shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-[#1a7a99]">Quản lý danh mục thiết bị</h2>
          <p className="text-xs text-slate-500">Quản lý các danh mục thiết bị trong hệ thống</p>
        </div>
        {isEquipmentManager && (
          <Button
            onClick={() => setCreateOpen(true)}
            className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white"
          >
            <Plus size={16} />
            Thêm danh mục
          </Button>
        )}
      </div>

      {/* SEARCH */}
      <div className="flex justify-end mb-2">
        <HoverSearch
          placeholder="Tìm tên danh mục..."
          value={search}
          onChange={(value) => setSearch(value)}
        />
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl border shadow-sm px-6 py-4">
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-md">
              <span className="text-sm text-muted-foreground">Đang tải...</span>
            </div>
          )}
          <DataTable
            columns={columns}
            data={filteredCategories}
            pageNumber={1}
            pageSize={filteredCategories.length}
            totalItems={filteredCategories.length}
            onPageChange={() => {}}
            onRowClick={async (row) => {
              try {
                const fullCategory = await categoryApi.getById(row.categoryId);
                if (isEquipmentManager) {
                  // EM: Mở modal edit
                  setEditCategory(fullCategory);
                  setEditOpen(true);
                } else {
                  // Manager: Mở sidebar detail
                  setDetailCategory(fullCategory);
                  setDetailOpen(true);
                }
              } catch (err) {
                message.error('Không tải được thông tin danh mục');
                console.error('fetch category detail error:', err);
              }
            }}
            getRowId={(row) => String(row.categoryId)}
          />
        </div>
      </div>

      <CategoryDetailSidebar
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetailCategory(null);
        }}
        category={detailCategory}
      />

      <CreateCategoryModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          refetch();
          setCreateOpen(false);
        }}
      />

      <EditCategoryModal
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditCategory(null);
        }}
        category={editCategory}
        onUpdated={() => {
          refetch();
          setEditOpen(false);
          setEditCategory(null);
        }}
      />
    </div>
  );
}
