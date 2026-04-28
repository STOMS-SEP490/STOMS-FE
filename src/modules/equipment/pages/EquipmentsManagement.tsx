import { DataTable } from '@/shared/components/common/DataTable';
import { StatCard } from '@/shared/components/common/StatCard';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import HoverSearch from '@/shared/components/ui/search';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import type { EquipmentListItem } from '@/modules/equipment/equipment';
import type { ColumnDef, Row } from '@tanstack/react-table';
import { CheckCircle2, CircleX, Eye, Package, PackageOpen, Pencil, Plus, RotateCcw, Trash2, Wrench } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useEquipments } from '../hooks/useEquipments';
import CreateEquipmentModal from './CreateEquipmentModal';
import { useCategories } from '@/modules/category/hooks/useCategories';
import {
  EQUIPMENT_STATUS_OPTIONS,
  EQUIPMENT_STATUS,
  getEquipmentStatusDisplay,
  getEquipmentStatusColor,
} from '@/constants/status';
import equipmentApi from '../api/equipmentApi';
import { message } from 'antd';
import { Dialog } from '@/shared/components/ui/dialog';
import EquipmentDetailSidebar from './EquipmentDetailSidebar';
import EditEquipmentModal from './EditEquipmentModal';
import { useEquipmentsManagementStats } from '../hooks/useEquipmentsManagementStats';

const iconClass = 'h-6 w-6';

function normalizeStatusValue(status: string | number) {
  const n = Number(status)
  if (!Number.isNaN(n) && n >= 1 && n <= 5) return n
  const upper = String(status ?? '').trim().toUpperCase()
  if (upper === 'AVAILABLE')   return EQUIPMENT_STATUS.AVAILABLE
  if (upper === 'BORROWED')    return EQUIPMENT_STATUS.BORROWED
  if (upper === 'DAMAGED')     return EQUIPMENT_STATUS.DAMAGED
  if (upper === 'LOST')        return EQUIPMENT_STATUS.LOST
  if (upper === 'UNAVAILABLE') return EQUIPMENT_STATUS.UNAVAILABLE
  return EQUIPMENT_STATUS.AVAILABLE
}

function formatStatValue(loading: boolean, n: number) {
  if (loading) return '—';
  return n.toLocaleString('vi-VN');
}

const EquipmentsTable = memo(function EquipmentsTable(props: {
  columns: ColumnDef<EquipmentListItem>[];
  data: EquipmentListItem[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  onRowClick: (row: EquipmentListItem) => void;
}) {
  const { columns, data, pageNumber, pageSize, totalItems, loading, onPageChange, onRowClick } = props;
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
        onPageChange={onPageChange}
        onRowClick={onRowClick}
        getRowId={(row) => String(row.equipmentId)}
      />
    </div>
  );
});

export default function EquipmentsManagement() {
  const location = useLocation();
  const isEquipmentManager = location.pathname.startsWith('/em/');
  const [searchParams, setSearchParams] = useSearchParams();
  const [openCreateModal, setOpenCreateModal] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailEquipment, setDetailEquipment] = useState<EquipmentListItem | null>(null)

  // Prevent: user closes detail, but URL params update async -> effect runs once more and re-opens.
  const skipNextAutoOpenRef = useRef(false);
  const [editOpen, setEditOpen] = useState(false)
  const [editEquipment, setEditEquipment] = useState<EquipmentListItem | null>(null)
  const [disableOpen, setDisableOpen] = useState(false)
  const [equipmentToDisable, setEquipmentToDisable] = useState<EquipmentListItem | null>(null)
  const {
    data,
    loading,
    search,
    setSearch,
    status,
    categoryId,
    setFiltersAndResetPage,
    resetFilters,
    pageNumber,
    pageSize,
    totalItems,
    setPageNumber,
    refetch,
  } = useEquipments()
  const { loading: statsLoading, stats } = useEquipmentsManagementStats();
  const { data: categories } = useCategories()
  const categoryNameById = useMemo(
    () => new Map(categories.map((c) => [c.categoryId, c.categoryName])),
    [categories]
  )

  const openDetailFromUrl = searchParams.get('openDetail');
  const equipmentIdFromUrl = searchParams.get('equipmentId');

  const closeDetailFromUrl = useCallback(() => {
    skipNextAutoOpenRef.current = true;
    setDetailOpen(false);
    setDetailEquipment(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('openDetail');
      next.delete('equipmentId');
      return next;
    });
  }, [setSearchParams]);

  useEffect(() => {
    if (openDetailFromUrl !== '1') return;
    if (!equipmentIdFromUrl) return;
    if (skipNextAutoOpenRef.current) {
      skipNextAutoOpenRef.current = false;
      return;
    }

    const equipmentId = Number(equipmentIdFromUrl);
    if (!equipmentId || Number.isNaN(equipmentId)) return;

    // Nếu đang mở đúng thiết bị thì không gọi API lại
    if (detailOpen && detailEquipment?.equipmentId === equipmentId) return;

    (async () => {
      try {
        const full = await equipmentApi.getById(equipmentId);
        setDetailEquipment(full);
        setDetailOpen(true);
      } catch {
        message.error('Không tải được thông tin thiết bị');
      }
    })();
  }, [openDetailFromUrl, equipmentIdFromUrl, detailOpen, detailEquipment?.equipmentId]);

  const handleView = useCallback(async (item: EquipmentListItem) => {
    try {
      const full = await equipmentApi.getById(item.equipmentId)
      setDetailEquipment(full)
      setDetailOpen(true)
    } catch {
      message.error('Không tải được thông tin thiết bị')
    }
  }, [])

  const handleEdit = useCallback((item: EquipmentListItem) => {
    if (!isEquipmentManager) return;
    // Dùng luôn dữ liệu của hàng hiện tại để fill form (đã có đủ categoryId, status, ...).
    setEditEquipment(item)
    setEditOpen(true)
  }, [isEquipmentManager])

  const handleDisableClick = useCallback((item: EquipmentListItem) => {
    if (!isEquipmentManager) return;
    setEquipmentToDisable(item)
    setDisableOpen(true)
  }, [isEquipmentManager])

  const handleDisableConfirm = async () => {
    if (!equipmentToDisable) return
    try {
      await equipmentApi.updateStatus(equipmentToDisable.equipmentId, { status: String(EQUIPMENT_STATUS.UNAVAILABLE) })
      message.success('Đã chuyển thiết bị sang trạng thái Không khả dụng')
      setDisableOpen(false)
      setEquipmentToDisable(null)
      refetch()
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null
      message.error(msg || 'Cập nhật trạng thái thất bại')
    }
  }

  const columns: ColumnDef<EquipmentListItem>[] = useMemo(() => [
    {
      accessorKey: 'equipmentCode',
      header: 'Mã thiết bị',
      cell: ({ row }) => (
        <span className="font-semibold text-[#1a7a99]">{row.original.equipmentCode}</span>
      ),
    },
    {
      accessorKey: 'equipmentName',
      header: 'Tên thiết bị',
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className="font-medium text-[#1a7a99] truncate">{row.original.equipmentName}</div>
          <div className="text-xs text-gray-500 truncate">{row.original.description || '—'}</div>
        </div>
      ),
    },
    {
      accessorKey: 'categoryId',
      header: 'Danh mục',
      cell: ({ row }) => (
        <Badge variant="secondary">
          {categoryNameById.get(row.original.categoryId) ?? row.original.categoryId}
        </Badge>
      ),
    },
    {
      accessorKey: 'sponsoredBy',
      header: 'Bên cung cấp',
      cell: ({ row }) => (
        <span className="text-sm text-gray-700 max-w-[160px] truncate block" title={row.original.sponsoredBy || undefined}>
          {row.original.sponsoredBy?.trim() ? row.original.sponsoredBy : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Trạng thái',
      cell: ({ row }) => {
        const status = row.original.status
        const statusValue = normalizeStatusValue(status)
        const isBorrowed = statusValue === EQUIPMENT_STATUS.BORROWED
        return (
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${getEquipmentStatusColor(status)}`}
            title={
              isBorrowed
                ? 'Thiết bị đang được mượn (chỉ thay đổi qua phiếu mượn)'
                : undefined
            }
          >
            {getEquipmentStatusDisplay(status)}
          </span>
        )
      },
    },
    ...(isEquipmentManager
      ? [
          {
            id: 'actions',
            header: () => <span className="block w-full text-center">Thao tác</span>,
            enableSorting: false,
            cell: ({ row }: { row: Row<EquipmentListItem> }) => (
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
                <span title="Ngừng sử dụng">
                  <Trash2
                    size={16}
                    className="cursor-pointer text-red-500"
                    onClick={() => handleDisableClick(row.original)}
                  />
                </span>
              </div>
            ),
          },
        ]
      : []),
  ], [categoryNameById, handleDisableClick, handleEdit, handleView, isEquipmentManager])

  const onRowClick = useCallback((item: EquipmentListItem) => {
    // Nếu là Equipment Manager thì không cho click vào dòng (chỉ dùng icon)
    if (isEquipmentManager) return;
    void handleView(item)
  }, [handleView, isEquipmentManager])

  return (
    <div className="p-6 pl-8 space-y-6 app-page-bg" style={{ minHeight: 'var(--content-height, 100vh)' }}>
      {/* HEADER */}
      <div className="bg-white flex justify-between items-center px-6 py-4 mb-2 rounded-xl border shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-[#1a7a99]">Giám sát thiết bị</h2>
          <p className="text-xs text-slate-500">Giám sát thiết bị và loại thiết bị trong hệ thống</p>
        </div>
        <div className="flex gap-3 items-center">
          {isEquipmentManager ? (
            <>
              <Button
                onClick={() => setOpenCreateModal(true)}
                className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white"
              >
                <Plus size={16} />
                Thêm thiết bị
              </Button>
              <CreateEquipmentModal
                open={openCreateModal}
                onClose={() => setOpenCreateModal(false)}
                onCreated={() => {
                  refetch()
                  setOpenCreateModal(false)
                }}
              />
            </>
          ) : null}
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-5 gap-4 mb-2">
        <StatCard
          icon={<Package className={iconClass} strokeWidth={2} />}
          label="Tổng thiết bị"
          value={formatStatValue(statsLoading, stats.totalEquipment)}
          sub="Tất cả trạng thái"
          variant="blue"
        />
        <StatCard
          icon={<CheckCircle2 className={iconClass} strokeWidth={2} />}
          label="Khả dụng"
          value={formatStatValue(statsLoading, stats.availableEquipment)}
          sub="Có thể mượn ngay"
          variant="green"
        />
        <StatCard
          icon={<PackageOpen className={iconClass} strokeWidth={2} />}
          label="Đang mượn"
          value={formatStatValue(statsLoading, stats.borrowedEquipment)}
          sub="Thiết bị đang cho mượn"
          variant="orange"
        />
        <StatCard
          icon={<Wrench className={iconClass} strokeWidth={2} />}
          label="Hư hỏng"
          value={formatStatValue(statsLoading, stats.damagedEquipment)}
          sub="Cần sửa chữa/bảo trì"
          variant="violet"
        />
        <StatCard
          icon={<CircleX className={iconClass} strokeWidth={2} />}
          label="Mất"
          value={formatStatValue(statsLoading, stats.lostEquipment)}
          sub="Thiết bị đã thất lạc"
          variant="rose"
        />
      </div>

      {/* FILTERS */}
      <div className="mb-2 flex items-center justify-end gap-3 flex-wrap">
        <HoverSearch
          placeholder="Tìm tên thiết bị..."
          value={search}
          onChange={(value) => setSearch(value)}
        />
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Select
              value={categoryId?.toString() ?? 'all'}
              onValueChange={(v) =>
                setFiltersAndResetPage({
                  categoryId: v === 'all' ? undefined : Number(v),
                })
              }
            >
              <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white w-[180px]">
                <SelectValue placeholder="Chọn danh mục" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả danh mục</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.categoryId} value={String(c.categoryId)}>
                    {c.categoryName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={status != null ? String(status) : 'all'}
              onValueChange={(v) =>
                setFiltersAndResetPage({
                  status: v === 'all' ? undefined : Number(v),
                })
              }
            >
              <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white w-[180px]">
                <SelectValue placeholder="Chọn trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                {EQUIPMENT_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 bg-[#2197C0] hover:bg-[#208AAE] text-white border-[#2197C0]"
            onClick={resetFilters}
            type="button"
            title="Đặt lại bộ lọc"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl border shadow-sm px-6 py-4">
        <div className="relative">
          <EquipmentDetailSidebar
            open={detailOpen}
            onClose={closeDetailFromUrl}
            equipment={detailEquipment}
            categoryName={
              detailEquipment
                ? categoryNameById.get(detailEquipment.categoryId)
                : undefined
            }
          />
          <EditEquipmentModal
            open={editOpen}
            onClose={() => {
              setEditOpen(false)
              setEditEquipment(null)
            }}
            equipment={editEquipment}
            onUpdated={() => refetch()}
          />
          <Dialog
            open={disableOpen}
            onClose={() => {
              setDisableOpen(false)
              setEquipmentToDisable(null)
            }}
            title="Xác nhận ngừng sử dụng"
            description={`Chuyển thiết bị \"${equipmentToDisable?.equipmentCode}\" sang trạng thái \"Không khả dụng\"?`}
          >
            <div className="flex gap-3 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDisableOpen(false)
                  setEquipmentToDisable(null)
                }}
              >
                Hủy
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDisableConfirm}
              >
                Xác nhận
              </Button>
            </div>
          </Dialog>
          {loading && (
            <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-md">
              <span className="text-sm text-muted-foreground">Đang tải...</span>
            </div>
          )}
          <EquipmentsTable
            columns={columns}
            data={data}
            pageNumber={pageNumber}
            pageSize={pageSize}
            totalItems={totalItems}
            loading={loading}
            onPageChange={setPageNumber}
            onRowClick={onRowClick}
          />
        </div>
      </div>
    </div>
  )
}
