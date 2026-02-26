import { DataTable } from '@/components/common/DataTable';
import { StatCard } from '@/components/common/StatCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Eye,
  Pencil,
  Trash2,
  Paperclip,
  Plus,
  BookOpen,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestService } from '@/services/requestService';
import dayjs from 'dayjs';

type Request = {
  id: number;
  type: string;
  title: string;
  sessions: number;
  status: 'approved' | 'pending' | 'draft' | 'rejected';
  createdAt: string;
  attachments: number;
};

export default function RequestsManagement() {
  const navigate = useNavigate();
  const [pageNumber, setPageNumber] = useState(1);
  const pageSize = 10;

  const [data, setData] = useState<Request[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  /* =========================
     MAP STATUS BE → UI
  ========================= */
  const mapStatus = (status: string): Request['status'] => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'approved';
      case 'rejected':
        return 'rejected';
      case 'draft':
        return 'draft';
      default:
        return 'pending';
    }
  };

  /* =========================
     LOAD DATA
  ========================= */
  const fetchData = async () => {
    try {
      setLoading(true);

      const res = await requestService.filter({
        pageNumber,
        pageSize,
      });

      const mapped: Request[] = res.items.map((item: any) => ({
        id: item.requestId,
        type: item.subjectId
          ? 'Giảng dạy'
          : item.eventId
          ? 'Sự kiện'
          : 'Khóa học',

        title: item.requestName,
        sessions: item.sessions?.length ?? 0,

        status: mapStatus(item.status),

        createdAt: dayjs(item.createdAt).format('DD/MM/YYYY'),
        attachments: item.attachments?.length ?? 0,
      }));

      setData(mapped);
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

  /* =========================
     STATUS UI
  ========================= */
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

  const columns: ColumnDef<Request>[] = [
    { accessorKey: 'id', header: 'Mã yêu cầu' },
    { accessorKey: 'type', header: 'Loại' },
    { accessorKey: 'title', header: 'Môn / Sự kiện' },
    { accessorKey: 'sessions', header: 'Số phiên' },
    {
      accessorKey: 'status',
      header: 'Trạng thái',
      cell: ({ row }) => (
        <Badge className={statusMap[row.original.status].className}>
          {statusMap[row.original.status].label}
        </Badge>
      ),
    },
    { accessorKey: 'createdAt', header: 'Ngày tạo' },
    {
      accessorKey: 'attachments',
      header: 'Đính kèm',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Paperclip size={14} />
          {row.original.attachments}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Thao tác',
      cell: ({ row }) => (
        <div className="flex gap-3">
          <Eye
            size={16}
            className="cursor-pointer"
            onClick={() => navigate(`/requests/${row.original.id}`)}
          />
          <Pencil size={16} className="cursor-pointer text-blue-600" />
          <Trash2 size={16} className="cursor-pointer text-red-500" />
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
          value={data.filter(d => d.status === 'pending').length.toString()}
        />
        <StatCard
          icon={<BookOpen />}
          label="Đã duyệt"
          value={data.filter(d => d.status === 'approved').length.toString()}
        />
        <StatCard
          icon={<BookOpen />}
          label="Từ chối"
          value={data.filter(d => d.status === 'rejected').length.toString()}
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