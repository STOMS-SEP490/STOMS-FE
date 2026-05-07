import { useEffect, useState } from 'react';
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
  CheckCircle,
  FileText,
  Pencil,
  Plus,
  RotateCcw,
  XCircle,
  DollarSign,
} from 'lucide-react';import type { ContractListItem } from '../contract';
import { useContracts } from '../hooks/useContracts';
import contractApi from '../api/contractApi';
import ContractDetailSidebar from './ContractDetailSidebar';
import CreateContractModal from './CreateContractModal';
import EditContractModal from './EditContractModal';
import { useLocation } from 'react-router-dom';
import sessionApi from '@/modules/request/api/sessionApi';
import { dashboardApi, type DashboardMemberContractSummary } from '@/modules/dashboard/api/dashboardApi';

const columns: ColumnDef<ContractListItem>[] = [
  {
    accessorKey: 'contractCode',
    header: 'Mã hợp đồng',
    cell: ({ row }) => (
      <span className="font-semibold text-[#1a7a99]">
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
    header: 'Mã yêu cầu',
    cell: ({ row }) => {
      const code = row.original.request?.requestCode;
      return code ? (
        <span className="font-semibold text-[#1a7a99]">{code}</span>
      ) : (
        '—'
      );
    },
  },
  {
    id: 'sessionNo',
    header: 'Buổi',
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

  const [contractSummary, setContractSummary] = useState<DashboardMemberContractSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    // Get memberId from localStorage
    const getMemberId = (): number | null => {
      const raw = localStorage.getItem('user');
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw) as { memberId?: number | string };
        const id = Number(parsed.memberId ?? 0);
        return Number.isFinite(id) && id > 0 ? id : null;
      } catch {
        return null;
      }
    };

    const memberId = getMemberId();
    if (!memberId) return;

    let cancelled = false;
    setSummaryLoading(true);
    dashboardApi.getMemberContractsStatistics(memberId)
      .then((res: DashboardMemberContractSummary) => { if (!cancelled) setContractSummary(res); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setSummaryLoading(false); });
    return () => { cancelled = true; };
  }, []);

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
    setDetailContract(contract);
    try {
      setDetailLoading(true);
      const full = await contractApi.getById(contract.contractId);
      setDetailContract(full);
      try {
        const sessionDetail = await sessionApi.getById(full.sessionId);
        const assignments = sessionDetail.Assignments ?? [];
        const matched = assignments.find((a) => {
          const staffMemberId = Number(a.StaffMemberId ?? 0);
          return staffMemberId === full.createdByMemberId;
        });
        const rawRole = String(matched?.StaffRole ?? '').toLowerCase();
        const roleLabel = rawRole
          ? rawRole.includes('ta') || rawRole.includes('trợ') ? 'Sinh viên' : 'Giáo viên'
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
      okButtonProps: { className: 'bg-red-600 hover:bg-red-700 text-white border-none' },
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

  // columns without actions
  const tableColumns: ColumnDef<ContractListItem>[] = [
    ...columns,
    ...(!isManagerPage ? [{
      id: 'rowActions',
      header: () => <span className="block w-full text-center">Thao tác</span>,
      enableSorting: false,
      cell: ({ row }: { row: { original: ContractListItem } }) => {
        const contract = row.original;
        const isPaid = contract.isPaid === true;
        const canMarkPaid = contract.isPaid === false;
        return (
          <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
            <div title={isPaid ? 'Không thể sửa hợp đồng đã thanh toán' : 'Sửa hợp đồng'}>
              <Pencil
                size={16}
                className={isPaid ? 'text-gray-300 cursor-not-allowed' : 'text-blue-600 cursor-pointer'}
                onClick={isPaid ? undefined : () => handleEdit(contract)}
              />
            </div>
            <div title={canMarkPaid ? 'Đánh dấu đã thanh toán' : 'Hợp đồng đã được thanh toán'}>
              <CheckCircle
                size={16}
                className={canMarkPaid ? 'text-green-600 cursor-pointer' : 'text-gray-300 cursor-not-allowed'}
                onClick={canMarkPaid ? () => handleMarkAsPaid(contract) : undefined}
              />
            </div>
          </div>
        );
      },
    } as ColumnDef<ContractListItem>] : []),
  ];

  return (
    <div className="relative p-6 pl-8 space-y-6">
      {loading && (
        <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-md">
          <span className="text-sm text-muted-foreground">Đang tải hợp đồng...</span>
        </div>
      )}
      {/* HEADER */}
      <div className="flex justify-between bg-white px-6 py-4 mb-2 rounded-xl border shadow-sm items-center">
        <div>
          <h2 className="text-xl font-semibold text-[#1a7a99]">Quản lý hợp đồng</h2>
          <p className="text-xs text-slate-500">Quản lý hợp đồng giảng viên và sinh viên</p>
        </div>
        {!isManagerPage && (
          <div className="flex gap-3 items-center">
            <Button className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white px-3 py-2 rounded-md" onClick={() => setCreateOpen(true)}>
              <Plus size={16} />
              Thêm hợp đồng
            </Button>
          </div>
        )}
      </div>

      {/* STATS */}
      <div className="grid grid-cols-4 gap-4 mb-2">
        <StatCard
          icon={<FileText />}
          label="Tổng hợp đồng"
          value={summaryLoading ? '—' : (contractSummary?.totalContracts ?? totalItems).toString()}
          sub="hợp đồng"
          variant="blue"
        />
        <StatCard
          icon={<CheckCircle />}
          label="Đã thanh toán"
          value={summaryLoading ? '—' : (contractSummary?.paidContracts ?? 0).toString()}
          sub="hợp đồng đã thanh toán"
          variant="green"
        />
        <StatCard
          icon={<XCircle />}
          label="Chưa thanh toán"
          value={summaryLoading ? '—' : (contractSummary?.unpaidContracts ?? 0).toString()}
          sub="hợp đồng chưa thanh toán"
          variant="amber"
        />
        <StatCard
          icon={<DollarSign />}
          label="Tổng giá trị"
          value={summaryLoading ? '—' : (contractSummary?.paidValue ?? 0).toLocaleString('vi-VN')}
          sub="đồng đã thanh toán"
          variant="violet"
        />
      </div>

      <div className="flex justify-end gap-3 mb-2 flex-wrap">
        <HoverSearch value={search} onChange={setSearch} placeholder="Tìm mã hợp đồng/yêu cầu..." />
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Select
              value={isPaid === undefined ? 'all' : isPaid === true ? 'paid' : 'unpaid'}
              onValueChange={(value) => {
                if (value === 'all') setIsPaid(undefined);
                else if (value === 'paid') setIsPaid(true);
                else setIsPaid(false);
              }}
            >
              <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white w-[180px]">
                <SelectValue placeholder="Chọn trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="paid">Đã thanh toán</SelectItem>
                <SelectItem value="unpaid">Chưa thanh toán</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 bg-white border-slate-200 text-gray-600 hover:bg-gray-50" onClick={() => { setIsPaid(undefined); setPageNumber(1); }} title="Đặt lại bộ lọc">
            <RotateCcw size={16} />
          </Button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl border shadow-sm px-6 py-4">
        <DataTable
          columns={tableColumns}
          data={data}
          pageNumber={pageNumber}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={(page) => setPageNumber(page)}
          onRowClick={handleViewDetail}
        />
      </div>

      <ContractDetailSidebar
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setDetailContract(null); setDetailLoading(false); setDetailRoleLabel(null); }}
        contract={detailContract}
        loading={detailLoading}
        roleLabel={detailRoleLabel}
      />
      <CreateContractModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={refetch} />
      <EditContractModal
        open={editOpen}
        onClose={() => { setEditOpen(false); setEditContract(null); }}
        contract={editContract}
        onUpdated={refetch}
      />
    </div>
  );
}
