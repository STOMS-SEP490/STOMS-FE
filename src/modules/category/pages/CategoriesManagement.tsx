import { useEffect, useRef, useState } from 'react';
import { message } from 'antd';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, Pencil, Plus } from 'lucide-react';
import { useLocation, useOutletContext, useSearchParams } from 'react-router-dom';
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
  const location = useLocation();
  const isEquipmentManager = location.pathname.startsWith('/em/');
  const isStandalonePage = !context?.position;
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<CategoryListItem | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryListItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailCategory, setDetailCategory] = useState<CategoryListItem | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const openDetailFromUrl = searchParams.get('openDetail');
  const categoryIdFromUrl = searchParams.get('categoryId');

  // Prevent: user closes detail, but URL params update async -> effect runs once more and re-opens.
  const skipNextAutoOpenRef = useRef(false);

  const closeDetailFromUrl = () => {
    skipNextAutoOpenRef.current = true;
    setDetailOpen(false);
    setDetailCategory(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('openDetail');
      next.delete('categoryId');
      return next;
    });
  };

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
    if (!isEquipmentManager) return;
    setEditCategory(category);
    setEditOpen(true);
  };

  const handleView = async (category: CategoryListItem) => {
    try {
      const full = await categoryApi.getById(category.categoryId);
      setDetailCategory(full);
      setDetailOpen(true);
    } catch {
      message.error('Không tải được thông tin danh mục');
    }
  };

  useEffect(() => {
    if (openDetailFromUrl !== '1') return;
    if (!categoryIdFromUrl) return;
    if (skipNextAutoOpenRef.current) {
      skipNextAutoOpenRef.current = false;
      return;
    }

    const id = Number(categoryIdFromUrl);
    if (!id || Number.isNaN(id)) return;

    if (detailOpen && detailCategory?.categoryId === id) return;

    (async () => {
      try {
        const full = await categoryApi.getById(id);
        setDetailCategory(full);
        setDetailOpen(true);
      } catch {
        message.error('Không tải được thông tin danh mục');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openDetailFromUrl, categoryIdFromUrl, detailOpen, detailCategory?.categoryId]);

  const handleDeleteConfirm = async () => {
    if (!isEquipmentManager) return;
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
        const count = Number(item.totalEquipment ?? 0);
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
            {isEquipmentManager ? (
              <Pencil
                size={16}
                className="text-blue-600 cursor-pointer"
                onClick={() => handleEdit(category)}
              />
            ) : null}
            <Eye
              size={16}
              className="text-gray-800 cursor-pointer"
              onClick={() => handleView(category)}
            />
          </div>
        );
      },
    },
  ];

  if (context?.position === 'header') {
    if (!isEquipmentManager) return null;
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
        <div className="[&>div]:bg-[#2197C0] [&>div]:hover:bg-[#208AAE] [&>div]:border-[#2197C0] [&_svg]:text-white [&_svg]:stroke-[2.5] [&_input]:text-white [&_input]:font-normal [&_input::placeholder]:text-white/80 [&_input::placeholder]:font-normal">
          <HoverSearch
            placeholder="Tìm tên danh mục..."
            value={search}
            onChange={(value) => setSearch(value)}
          />
        </div>
      </div>
    );
  }

  if (isStandalonePage) {
    return (
      <div className="p-6 pl-8 space-y-6 app-page-bg" style={{ minHeight: 'var(--content-height, 100vh)' }}>
        <div className="bg-white flex justify-between items-center px-6 py-4 mb-2 rounded-xl border shadow-sm">
          <div>
            <h2 className="text-xl font-semibold text-[#1a7a99]">Quản lý danh mục thiết bị</h2>
            <p className="text-xs text-slate-500">Quản lý danh mục và phân loại thiết bị trong hệ thống</p>
          </div>
          <div className="flex gap-3 items-center">
            {isEquipmentManager ? (
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
            ) : null}
          </div>
        </div>

        <div className="mb-2 flex justify-end">
          <div className="[&>div]:bg-[#2197C0] [&>div]:hover:bg-[#208AAE] [&>div]:border-[#2197C0] [&_svg]:text-white [&_svg]:stroke-[2.5] [&_input]:text-white [&_input]:font-normal [&_input::placeholder]:text-white/80 [&_input::placeholder]:font-normal">
            <HoverSearch
              placeholder="Tìm tên danh mục..."
              value={search}
              onChange={(value) => setSearch(value)}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm px-6 py-4">
          <div className="relative">
            {loading && (
              <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-md">
                <span className="text-sm text-muted-foreground">Đang tải...</span>
              </div>
            )}
            <CategoryDetailSidebar
              open={detailOpen}
              onClose={closeDetailFromUrl}
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
        </div>
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
        onClose={closeDetailFromUrl}
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
