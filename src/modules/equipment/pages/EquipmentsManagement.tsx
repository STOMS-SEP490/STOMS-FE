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
import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useEquipments } from '../hooks/useEquipments';
import CreateEquipmentModal from './CreateEquipmentModal';
import { useCategories } from '@/modules/category/hooks/useCategories';
import {
  EQUIPMENT_STATUS_OPTIONS,
  getEquipmentStatusDisplay,
  getEquipmentStatusColor,
} from '@/constants/equipment';

const columns: ColumnDef<EquipmentListItem>[] = [
 
  {
    accessorKey: 'equipmentName',
    header: 'Tên thiết bị',
    cell: ({ row }) => (
      <span className="font-medium">{row.original.equipmentName}</span>
    ),
  },
  {
    accessorKey: 'categoryId',
    header: 'Danh mục',
    cell: ({ row }) => (
      <Badge variant="secondary"> {row.original.categoryId}</Badge>
    ),
  },
  {
    accessorKey: 'sponsoredBy',
    header: 'Bên cung cấp',
  },
  {
    accessorKey: 'handoverMinute',
    header: 'Biên bản bàn giao',
    cell: ({ row }) => (
      <span className="text-blue-600 hover:underline cursor-pointer">
        {row.original.handoverMinute || '—'}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Trạng thái',
    cell: ({ row }) => {
      const status = row.original.status
      return (
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${getEquipmentStatusColor(status)}`}
        >
          {getEquipmentStatusDisplay(status)}
        </span>
      )
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
    cell: () => (
      <div className="flex items-center gap-3">
        <Eye className="w-4 h-4 cursor-pointer text-blue-600" />
        <Pencil className="w-4 h-4 cursor-pointer text-gray-600" />
        <Trash2 className="w-4 h-4 cursor-pointer text-red-600" />
      </div>
    ),
  },
]

export default function EquipmentsManagement() {
  const context = useOutletContext<{ position?: string }>()
  const [openCreateModal, setOpenCreateModal] = useState(false)
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

  if (context?.position === 'header') {
    return (
      <>
        <Button
          onClick={() => setOpenCreateModal(true)}
          className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white"
        >
          <Plus size={16} />
          Tạo thiết bị
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
