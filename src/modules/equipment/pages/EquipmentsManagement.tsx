import { DataTable } from '@/shared/components/common/DataTable';
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
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { useEquipments } from '../hooks/useEquipments';
import CreateEquipmentModal from './CreateEquipmentModal';
import { useCategories } from '@/modules/category/hooks/useCategories';
import {
  EQUIPMENT_STATUS_OPTIONS,
  EQUIPMENT_STATUS,
  getEquipmentStatusDisplay,
  getEquipmentStatusColor,
} from '@/constants/equipment';
import equipmentApi from '../api/equipmentApi';
import { Image, message } from 'antd';
import { Dialog } from '@/shared/components/ui/dialog';
import EquipmentDetailSidebar from './EquipmentDetailSidebar';
import EditEquipmentModal from './EditEquipmentModal';

export default function EquipmentsManagement() {
  const context = useOutletContext<{ position?: string }>()
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
  const { data: categories } = useCategories()
  const categoryNameById = new Map(categories.map((c) => [c.categoryId, c.categoryName]))

  const openDetailFromUrl = searchParams.get('openDetail');
  const equipmentIdFromUrl = searchParams.get('equipmentId');

  const closeDetailFromUrl = () => {
    skipNextAutoOpenRef.current = true;
    setDetailOpen(false);
    setDetailEquipment(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('openDetail');
      next.delete('equipmentId');
      return next;
    });
  };

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

  const handleView = async (item: EquipmentListItem) => {
    try {
      const full = await equipmentApi.getById(item.equipmentId)
      setDetailEquipment(full)
      setDetailOpen(true)
    } catch {
      message.error('Không tải được thông tin thiết bị')
    }
  }

  const handleEdit = (item: EquipmentListItem) => {
    // Dùng luôn dữ liệu của hàng hiện tại để fill form (đã có đủ categoryId, status, ...).
    setEditEquipment(item)
    setEditOpen(true)
  }

  const handleDisableClick = (item: EquipmentListItem) => {
    setEquipmentToDisable(item)
    setDisableOpen(true)
  }

  const handleDisableConfirm = async () => {
    if (!equipmentToDisable) return
    try {
      await equipmentApi.updateStatus(equipmentToDisable.equipmentId, { status: EQUIPMENT_STATUS.UNAVAILABLE })
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

  const normalizeStatusValue = (status: string | number) => {
    const s = String(status ?? '').trim()
    if (s === '1') return EQUIPMENT_STATUS.AVAILABLE
    if (s === '2') return EQUIPMENT_STATUS.BORROWED
    if (s === '3') return EQUIPMENT_STATUS.DAMAGED
    if (s === '4') return EQUIPMENT_STATUS.LOST
    if (s === '5') return EQUIPMENT_STATUS.UNAVAILABLE
    const upper = s.toUpperCase()
    if (
      upper === EQUIPMENT_STATUS.AVAILABLE ||
      upper === EQUIPMENT_STATUS.BORROWED ||
      upper === EQUIPMENT_STATUS.DAMAGED ||
      upper === EQUIPMENT_STATUS.LOST ||
      upper === EQUIPMENT_STATUS.UNAVAILABLE
    ) {
      return upper
    }
    return EQUIPMENT_STATUS.AVAILABLE
  }

  const columns: ColumnDef<EquipmentListItem>[] = [
    {
      accessorKey: 'equipmentCode',
      header: 'Mã thiết bị',
      cell: ({ row }) => (
        <span className="font-semibold text-gray-800">{row.original.equipmentCode}</span>
      ),
    },
    {
      accessorKey: 'equipmentName',
      header: 'Tên thiết bị',
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className="font-medium truncate">{row.original.equipmentName}</div>
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
    {
      accessorKey: 'imgLink',
      header: 'Hình ảnh',
      cell: ({ row }) => (
        row.original.imgLink ? (
          <div className="w-10 h-10 rounded-md overflow-hidden border bg-gray-50">
            <Image
              src={row.original.imgLink}
              alt={row.original.equipmentName}
              width={40}
              height={40}
              className="object-cover"
              preview={{ mask: 'Xem ảnh' }}
            />
          </div>
        ) : (
          <span className="text-xs text-gray-500">Không có ảnh</span>
        )
      ),
    },
    {
      id: 'actions',
      header: 'Thao tác',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Eye
            size={16}
            className="text-blue-600 cursor-pointer"
            onClick={() => handleView(row.original)}
          />
          <Pencil
            size={16}
            className="text-blue-600 cursor-pointer"
            onClick={() => handleEdit(row.original)}
          />
          <Trash2
            size={16}
            className="text-red-500 cursor-pointer"
            onClick={() => handleDisableClick(row.original)}
          />
        </div>
      ),
    },
  ]

  if (context?.position === 'header') {
    return (
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
    )
  }

  if (context?.position === 'toolbar') {
    return (
      <div className="flex gap-3 items-center">
        <HoverSearch
          placeholder="Tìm tên thiết bị..."
          value={search}
          onChange={(value) => setSearch(value)}
        />
        <Select
          value={categoryId?.toString() ?? 'all'}
          onValueChange={(v) =>
            setFiltersAndResetPage({
              categoryId: v === 'all' ? undefined : Number(v),
            })
          }
        >
          <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white w-[180px]">
            <SelectValue placeholder="Danh mục" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.categoryId} value={String(c.categoryId)}>
                {c.categoryName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={status ?? 'all'}
          onValueChange={(v) =>
            setFiltersAndResetPage({
              status: v === 'all' ? undefined : v,
            })
          }
        >
          <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white w-[140px]">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            {EQUIPMENT_STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="secondary"
          className="bg-white"
          onClick={resetFilters}
          type="button"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>
    )
  }

  return (
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
      <DataTable
        columns={columns}
        data={data}
        pageNumber={pageNumber}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={(page) => setPageNumber(page)}
      />
    </div>
  )
}
