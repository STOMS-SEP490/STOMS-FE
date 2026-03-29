import { useState } from 'react';
import { message, Modal } from 'antd';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/shared/components/common/DataTable';
import { StatCard } from '@/shared/components/common/StatCard';
import { Button } from '@/shared/components/ui/button';
import HoverSearch from '@/shared/components/ui/search';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  BookOpen,
  CheckCircle,
  Clock,
  Eye,
  GraduationCap,
  Pencil,
  Plus,
  RotateCcw,
} from 'lucide-react';
import type { ContractListItem } from '../contract';
import { useContracts } from '../hooks/useContracts';
import contractApi from '../api/contractApi';
import ContractDetailSidebar from './ContractDetailSidebar';
import CreateContractModal from './CreateContractModal';
import EditContractModal from './EditContractModal';
import { useLocation } from 'react-router-dom';
import sessionApi from '@/modules/request/api/sessionApi';

const columns: ColumnDef<ContractListItem>[] = [
  {
    accessorKey: 'contractCode',
    header: 'Mã hợp đồng',
    cell: ({ row }) => (
      <span className="font-semibold text-gray-900">
        {row.original.contractCode}
      </span>
    ),
  },
  {
    id: 'lecturer',
    header: 'Giảng viên',
    cell: ({ row }) => {
      const lecturer = row.original.createdByUser?.member;
      const email = row.original.createdByUser?.email;
      if (!lecturer) return '—';

      return (
        <div className="flex items-center gap-3">
          <img
            src={lecturer.avatarUrl || '/img/ava.png'}
            alt="avatar"
            className="w-8 h-8 rounded-full object-cover"
          />
          <div>
            <p className="font-medium text-sm">{lecturer.fullName}</p>
            <p className="text-xs text-gray-500">{email}</p>
          </div>
        </div>
      );
    },
  },

  {
    id: 'requestCode',
    header: 'Mã request',
    cell: ({ row }) => {
      const code = row.original.request?.requestCode;
      return code ? (
        <span className="font-semibold text-gray-900">{code}</span>
      ) : (
        '—'
      );
    },
  },
  {
    id: 'sessionNo',
    header: 'Buổi học',
    cell: ({ row }) => {
      const no = row.original.session?.sessionNo;
      return no ? `Buổi ${no}` : '—';
    },
  },
 
  {
    accessorKey: 'amount',
    header: 'Số tiền',
    cell: ({ row }) =>
      row.original.amount != null ? (
        <span className="font-semibold">
          {row.original.amount.toLocaleString('vi-VN')} đ
        </span>
      ) : (
        '—'
      ),
  },
  {
    id: 'isPaid',
    header: 'Trạng thái thanh toán',
    cell: ({ row }) => {
      const isPaid = row.original.isPaid;
      const label =
        isPaid === true ? 'Đã thanh toán' : isPaid === false ? 'Chưa thanh toán' : 'Không rõ';
      const style =
        isPaid === true
          ? 'bg-green-100 text-green-700'
          : isPaid === false
            ? 'bg-orange-100 text-orange-700'
            : 'bg-gray-100 text-gray-600';

      return (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${style}`}>{label}</span>
      );
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
];

export default function ContractsManagement() {
  const location = useLocation();
  const isManagerPage = location.pathname.startsWith('/manager');

  const {
    data,
    loading,
    pageNumber,
    pageSize,
    totalItems,
    setPageNumber,
    isPaid,
    setIsPaid,
    search,
    setSearch,
    refetch,
  } = useContracts();

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailContract, setDetailContract] = useState<ContractListItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRoleLabel, setDetailRoleLabel] = useState<string | null>(null);
  const [, setMarking] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editContract, setEditContract] = useState<ContractListItem | null>(null);

  const handleViewDetail = async (contract: ContractListItem) => {
    setDetailOpen(true);
    setDetailRoleLabel(null);
    setDetailContract(contract); // show quickly with list data
    try {
      setDetailLoading(true);
      const full = await contractApi.getById(contract.contractId);
      setDetailContract(full);

      // contracts/{id} response doesn't include assignment role, so resolve it from session detail
      try {
        const sessionDetail = await sessionApi.getById(full.sessionId);
        const assignments = sessionDetail.Assignments ?? [];
        const matched = assignments.find((a) => {
          const staffMemberId = Number(a.StaffMemberId ?? 0);
          return staffMemberId === full.createdByMemberId;
        });
        const rawRole = String(matched?.StaffRole ?? '').toLowerCase();
        const roleLabel = rawRole
          ? rawRole.includes('ta') || rawRole.includes('trợ')
            ? 'Trợ giảng'
            : 'Giáo viên'
          : null;
        setDetailRoleLabel(roleLabel);
      } catch (roleErr) {
        console.error('fetch session role for contract detail error:', roleErr);
      }
    } catch (err) {
      console.error('fetch contract detail error:', err);
      message.error('Không tải được chi tiết hợp đồng');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleEdit = (contract: ContractListItem) => {
    setEditContract(contract);
    setEditOpen(true);
  };

  const handleMarkAsPaid = (contract: ContractListItem) => {
    Modal.confirm({
      title: 'Xác nhận đã thanh toán hợp đồng?',
      content: `Hợp đồng ${contract.contractCode} sẽ được đánh dấu là ĐÃ THANH TOÁN. Thao tác này không hoàn tác được.`,
      okText: 'Xác nhận',
      cancelText: 'Hủy',
      okButtonProps: {
        className: 'bg-red-600 hover:bg-red-700 text-white border-none',
      },
      onOk: async () => {
        try {
          setMarking(true);
          await contractApi.markAsPaid(contract.contractId);
          message.success('Cập nhật trạng thái thanh toán thành công');
          await refetch();
        } catch (err) {
          console.error('mark as paid error:', err);
          message.error('Cập nhật trạng thái thanh toán thất bại');
        } finally {
          setMarking(false);
        }
      },
    });
  };

  const enhancedColumns: ColumnDef<ContractListItem>[] = [
    ...columns,
    {
      id: 'actions',
      header: 'Thao tác',
      enableSorting: false,
      cell: ({ row }) => {
        const contract = row.original;
        const canMarkPaid = contract.isPaid === false;

        return (
          <div className="flex items-center gap-2">
            <Eye
              size={16}
              className="text-gray-800 cursor-pointer"
              onClick={() => handleViewDetail(contract)}
            />
            {!isManagerPage && contract.isPaid !== true && (
              <Pencil
                size={16}
                className="text-blue-600 cursor-pointer"
                onClick={() => handleEdit(contract)}
              />
            )}
            {canMarkPaid && !isManagerPage && (
              <CheckCircle
                size={16}
                className="text-green-600 cursor-pointer"
                onClick={() => handleMarkAsPaid(contract)}
              />
            )}
          </div>
        );
      },
    },
  ];

  const paidOnPage = data.filter((c) => c.isPaid === true).length;
  const totalAmountOnPage = data.reduce(
    (sum, c) => sum + (typeof c.amount === 'number' ? c.amount : 0),
    0
  );

  return (
    <div className="relative p-6 space-y-6">
      {loading && (
        <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-md">
          <span className="text-sm text-muted-foreground">Đang tải hợp đồng...</span>
        </div>
      )}
      {/* HEADER */}
      <div className="flex justify-between bg-white px-6 py-4 mb-2 rounded-xl border shadow-sm items-center">
        <div>
          <h2 className="text-xl font-semibold text-black">Quản lý hợp đồng</h2>
          <p className="text-xs text-gray-500">Quản lý hợp đồng giảng viên và trợ giảng</p>
        </div>

        {!isManagerPage && (
          <div className="flex gap-3 items-center">
            <Button
              className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white px-3 py-2 rounded-md"
              onClick={() => setCreateOpen(true)}
            >
              <Plus size={16} />
              Thêm hợp đồng
            </Button>
          </div>
        )}
      </div>

      {/* STATS */}
      <div className="grid grid-cols-4 gap-4 mb-2">
        <StatCard
          icon={<GraduationCap />}
          label="Tổng hợp đồng"
          value={totalItems.toString()}
          sub="hợp đồng trong hệ thống"
        />
        <StatCard
          icon={<CheckCircle />}
          label="Đã thanh toán"
          value={paidOnPage.toString()}
          sub="trên trang hiện tại"
          variant="green"
        />
        <StatCard
          icon={<BookOpen />}
          label="Chưa thanh toán"
          value={(data.length - paidOnPage).toString()}
          sub="trên trang hiện tại"
        />
        <StatCard
          icon={<Clock />}
          label="Tổng số tiền"
          value={totalAmountOnPage.toLocaleString('vi-VN')}
          sub="trên trang hiện tại (đ)"
        />
      </div>

      {/* Filter Bar */}
      <div className="flex justify-end gap-3 mb-2">
        <HoverSearch
          value={search}
          onChange={setSearch}
          placeholder="Tìm mã hợp đồng/yêu cầu..."
        />
        <div className="flex items-center gap-3">
          {/* Status Filter */}
          <Select
            value={
              isPaid === undefined ? 'all' : isPaid === true ? 'paid' : 'unpaid'
            }
            onValueChange={(value) => {
              if (value === 'all') {
                setIsPaid(undefined);
              } else if (value === 'paid') {
                setIsPaid(true);
              } else {
                setIsPaid(false);
              }
            }}
          >
            <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white">
              <SelectValue placeholder="Trạng thái thanh toán" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="paid">Đã thanh toán</SelectItem>
              <SelectItem value="unpaid">Chưa thanh toán</SelectItem>
            </SelectContent>
          </Select>

          {/* Reset Button */}
          <Button
            variant="secondary"
            className="bg-white"
            onClick={() => {
              setIsPaid(undefined);
              setPageNumber(1);
            }}
          >
            <RotateCcw />
          </Button>
        </div>
      </div>
      {/* TABLE CARD */}
      <div className="bg-white rounded-xl border shadow-sm px-6 py-4">
        <DataTable
          columns={enhancedColumns}
          data={data}
          pageNumber={pageNumber}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={(page) => setPageNumber(page)}
        />
      </div>
      <ContractDetailSidebar
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetailContract(null);
          setDetailLoading(false);
          setDetailRoleLabel(null);
        }}
        contract={detailContract}
        loading={detailLoading}
        roleLabel={detailRoleLabel}
      />
      <CreateContractModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={refetch}
      />
      <EditContractModal
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditContract(null);
        }}
        contract={editContract}
        onUpdated={refetch}
      />
    </div>
  );
}
