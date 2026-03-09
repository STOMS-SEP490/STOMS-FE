import { DataTable } from '@/shared/components/common/DataTable';
import { Button } from '@/shared/components/ui/button';
import HoverSearch from '@/shared/components/ui/search';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import type { BorrowingListItem } from '@/modules/equipment/borrowing';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, RotateCcw } from 'lucide-react';
import { useLocation, useOutletContext } from 'react-router-dom';
import { useBorrowings } from '../hooks/useBorrowings';
import {
  BORROWING_STATUS_OPTIONS,
  getBorrowingStatusDisplay,
  getBorrowingStatusColor,
} from '@/constants/borrowing';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import borrowingApi from '../api/borrowingApi';
import CreateBorrowingModal from './CreateBorrowingModal';
import BorrowingDetailSidebar from './BorrowingDetailSidebar';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN');
}

const columns = (
  onView: (item: BorrowingListItem) => void
): ColumnDef<BorrowingListItem>[] => [
  {
    accessorKey: 'borrowingId',
    header: 'Mã phiếu',
    cell: ({ row }) => (
      <span className="font-medium">#{row.original.borrowingId}</span>
    ),
  },
  {
    id: 'borrower',
    header: 'Người mượn',
    cell: ({ row }) => {
      const m = row.original.borrowedByMember;
      return (
        <div>
          <div className="font-medium text-black">
            {m?.fullName ?? '—'}
          </div>
          <div className="text-xs text-muted-foreground">
            {m?.phone ?? row.original.borrowedByMemberId}
          </div>
        </div>
      );
    },
  },
  {
    id: 'borrowDate',
    header: 'Ngày mượn',
    cell: ({ row }) => {
      const createdAt = row.original.createdAt;
      if (!createdAt) return '—';
      const d = new Date(createdAt);
      return (
        <div>
          <div>{d.toLocaleDateString('vi-VN')}</div>
          <div className="text-xs text-muted-foreground">
            {d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      );
    },
  },
  {
    id: 'dueDate',
    header: 'Hạn trả',
    cell: ({ row }) => {
      const due = row.original.returnedDueDate;
      const status = row.original.status;
      const isOverdue = status === 'Overdue' || status === '4';
      const isReturned = status === 'Returned' || status === '3';
      return (
        <div>
          <div className="font-medium">{formatDate(due)}</div>
          <div
            className={`text-xs ${
              isOverdue ? 'text-red-500' : isReturned ? 'text-green-600' : 'text-muted-foreground'
            }`}
          >
            {isReturned ? 'Đã trả' : isOverdue ? 'Quá hạn' : 'Chưa trả'}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Trạng thái',
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${getBorrowingStatusColor(status)}`}
        >
          {getBorrowingStatusDisplay(status)}
        </span>
      );
    },
  },
  {
    id: 'actions',
    header: 'Thao tác',
    enableSorting: false,
    cell: ({ row }) => (
      <Eye
        className="w-4 h-4 text-blue-600 cursor-pointer"
        onClick={() => onView(row.original)}
      />
    ),
  },
];

type OutletContext = {
  position?: string;
  createBorrowingOpen?: boolean;
  setCreateBorrowingOpen?: (open: boolean) => void;
};

export default function EquipmentsHistory() {
  const context = useOutletContext<OutletContext>();
  const location = useLocation();
  const {
    data,
    loading,
    search,
    setSearch,
    status,
    setStatus,
    resetFilters,
    pageNumber,
    pageSize,
    totalItems,
    setPageNumber,
    refetch,
  } = useBorrowings();
  const [createOpenLocal, setCreateOpenLocal] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailBorrowing, setDetailBorrowing] = useState<BorrowingListItem | null>(
    null
  );

  const openCreate = context?.createBorrowingOpen ?? createOpenLocal;
  const setOpenCreate =
    context?.setCreateBorrowingOpen ?? setCreateOpenLocal;

  const handleView = async (item: BorrowingListItem) => {
    try {
      const full = await borrowingApi.getById(item.borrowingId);
      setDetailBorrowing(full);
      setDetailOpen(true);
    } catch {
      // eslint-disable-next-line no-console
      console.error('get borrowing detail error');
    }
  };

  const isEquipmentManager = location.pathname.startsWith('/em/');

  if (context?.position === 'header') {
    if (!isEquipmentManager) return null;
    return (
      <Button
        className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white px-3 py-2 rounded-md"
        type="button"
        onClick={() => setOpenCreate(true)}
      >
        <Plus size={16} />
        Tạo phiếu mượn
      </Button>
    );
  }
  if (context?.position === 'toolbar') {
    return (
      <div className="flex gap-3 items-center">
        <HoverSearch
          placeholder="Tìm theo mô tả, ghi chú..."
          value={search}
          onChange={(v) => setSearch(v)}
        />
        <Select
          value={status ?? 'all'}
          onValueChange={(v: string) => setStatus(v === 'all' ? undefined : v)}
        >
          <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white w-[140px]">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            {BORROWING_STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="secondary" className="bg-white" onClick={resetFilters} type="button">
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>
    );
  }
  return (
    <>
      <BorrowingDetailSidebar
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        borrowing={detailBorrowing}
      />
      <CreateBorrowingModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onCreated={() => {
          setOpenCreate(false);
          refetch();
        }}
      />
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-md">
            <span className="text-sm text-muted-foreground">Đang tải...</span>
          </div>
        )}
        <DataTable
          columns={columns(handleView)}
          data={data}
          pageNumber={pageNumber}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={(page) => setPageNumber(page)}
        />
      </div>
    </>
  );
}
