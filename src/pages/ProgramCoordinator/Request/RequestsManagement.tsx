import { DataTable } from '@/components/common/DataTable';
import { StatCard } from '@/components/common/StatCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, Pencil, Trash2, Plus, BookOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import requestService from '@/services/requestService';
import type { RequestListItem } from '@/types/request';

export default function RequestsManagement() {
  const navigate = useNavigate();

  const [pageNumber, setPageNumber] = useState(1);
  const pageSize = 10;

  const [data, setData] = useState<RequestListItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);

      const res = await requestService.getRequests({
        pageNumber,
        pageSize,
      });

      setData(res.items);
      setTotalItems(res.totalItems);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [pageNumber]);

  const statusMap = {
    approved: {
      label: 'Đã duyệt',
      className: 'bg-green-100 text-green-700',
    },
    pending: {
      label: 'Chờ duyệt',
      className: 'bg-yellow-100 text-yellow-700',
    },
    draft: {
      label: 'Nháp',
      className: 'bg-gray-200 text-gray-700',
    },
    rejected: {
      label: 'Từ chối',
      className: 'bg-red-100 text-red-600',
    },
  };

  const columns: ColumnDef<RequestListItem>[] = [
    { accessorKey: 'requestId', header: 'Mã yêu cầu' },
    { accessorKey: 'requestCode', header: 'Mã code' },
    { accessorKey: 'requestName', header: 'Tên yêu cầu' },
    { accessorKey: 'customerName', header: 'Khách hàng' },
    { accessorKey: 'sessionsRequired', header: 'Số phiên' },
    {
      accessorKey: 'status',
      header: 'Trạng thái',
      cell: ({ row }) => {
        const status =
          row.original.status?.toLowerCase() as keyof typeof statusMap;

        const config = statusMap[status] || statusMap.pending;

        return (
          <Badge className={config.className}>
            {config.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Ngày tạo',
      cell: ({ row }) =>
        dayjs(row.original.createdAt).format('DD/MM/YYYY'),
    },
    {
      id: 'actions',
      header: 'Thao tác',
      cell: ({ row }) => (
        <div className="flex gap-3">
          <Eye
            size={16}
            className="cursor-pointer"
            onClick={() =>
              navigate(`/pc/requests/${row.original.requestId}`)
            }
          />
          <Pencil
            size={16}
            className="cursor-pointer text-blue-600"
          />
          <Trash2
            size={16}
            className="cursor-pointer text-red-500"
          />
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between bg-white px-6 py-4 rounded-xl border shadow-sm items-center">
        <div>
          <h2 className="text-xl font-semibold text-black">
            Quản lý yêu cầu
          </h2>
          <p className="text-xs text-gray-500">
            Quản lý danh sách yêu cầu giảng dạy và sự kiện
          </p>
        </div>

        <Button
          onClick={() => navigate('/pc/requests/create')}
          className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white"
        >
          <Plus size={16} />
          Tạo yêu cầu mới
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={<BookOpen />}
          label="Tổng yêu cầu"
          value={totalItems.toString()}
        />
        <StatCard
          icon={<BookOpen />}
          label="Chờ duyệt"
          value={data.filter(d => d.status.toLowerCase() === 'pending').length.toString()}
        />
        <StatCard
          icon={<BookOpen />}
          label="Đã duyệt"
          value={data.filter(d => d.status.toLowerCase() === 'approved').length.toString()}
        />
        <StatCard
          icon={<BookOpen />}
          label="Từ chối"
          value={data.filter(d => d.status.toLowerCase() === 'rejected').length.toString()}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border shadow-sm px-6 py-4">
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
  );
}