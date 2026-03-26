
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, Pencil, Trash2, Plus, BookOpen } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { Modal, message } from 'antd';
import { ExclamationCircleFilled } from '@ant-design/icons';
import { useRequests } from '../hooks/useRequests';
import type { RequestListItem } from '../request';
import { getRequestStatusInfo, getRequestStatusLabel } from '@/constants/status';
import { Badge } from '@/shared/components/ui/badge';
import { StatCard } from '@/shared/components/common/StatCard';
import { DataTable } from '@/shared/components/common/DataTable';
import { Button } from '@/shared/components/ui/button';
import requestApi from '../api/requestApi';

const getRequestType = (row: RequestListItem) => {
  if (row.subjectId) return 'Subject';
  if (row.courseId) return 'Course';
  if (row.eventId) return 'Event';
  return 'Khác';
};

export default function RequestsManagement() {
  const navigate = useNavigate();
  const [pageNumber, setPageNumber] = useState(1);
  const pageSize = 10;
  const [refreshKey, setRefreshKey] = useState(0);

  const { data, totalItems } = useRequests(pageNumber, pageSize, refreshKey);

  const stats = useMemo(() => {
    const pending = data.filter((d) => getRequestStatusLabel(d.status) === 'Chờ duyệt').length;
    const approved = data.filter((d) => getRequestStatusLabel(d.status) === 'Đã duyệt').length;
    const rejected = data.filter((d) => getRequestStatusLabel(d.status) === 'Từ chối').length;

    return { pending, approved, rejected };
  }, [data]);

  const columns: ColumnDef<RequestListItem>[] = [
    {
      accessorKey: 'requestCode',
      header: 'Mã yêu cầu',
      cell: ({ row }) => (
        <span className="font-semibold">{row.original.requestCode}</span>
      ),
    },
    { accessorKey: 'requestName', header: 'Tên yêu cầu' },
    { accessorKey: 'customerName', header: 'Khách hàng' },

    {
      header: 'Loại',
      cell: ({ row }) => {
        const type = getRequestType(row.original);

        const colorMap: Record<string, string> = {
          Subject: 'bg-blue-100 text-blue-700',
          Course: 'bg-purple-100 text-purple-700',
          Event: 'bg-orange-100 text-orange-700',
          Khác: 'bg-gray-200 text-gray-700',
        };

        return (
          <Badge className={colorMap[type]}>
            {type}
          </Badge>
        );
      },
    },

    {
      accessorKey: 'startDate',
      header: 'Ngày bắt đầu',
      cell: ({ row }) =>
        dayjs(row.original.startDate).format('DD/MM/YYYY'),
    },

    {
      accessorKey: 'status',
      header: 'Trạng thái',
      cell: ({ row }) => {
        const info = getRequestStatusInfo(row.original.status);

        return (
          <Badge className={info.className}>
            {info.label}
          </Badge>
        );
      },
    },

    {
      id: 'actions',
      header: 'Thao tác',
      cell: ({ row }) => (
        <div className="flex gap-3">
            {(() => {
              const isPending = getRequestStatusLabel(row.original.status) === 'Chờ duyệt';
              return (
                <>
          <Eye
            size={16}
            className="cursor-pointer"
            onClick={() =>
              navigate(`/pc/requests/${row.original.requestId}`)
            }
          />
          <Pencil
            size={16}
              className={isPending ? 'cursor-pointer text-blue-600' : 'cursor-not-allowed text-blue-300'}
            onClick={() =>
                isPending
                  ? navigate(`/pc/requests/edit/${row.original.requestId}`)
                  : undefined
            }
          />
          <Trash2
            size={16}
              className={isPending ? 'cursor-pointer text-red-500' : 'cursor-not-allowed text-red-300'}
              onClick={() => {
                if (!isPending) return;
                Modal.confirm({
                  title: 'Xác nhận xóa yêu cầu',
                  icon: <ExclamationCircleFilled className="text-rose-500" />,
                  okText: 'Xóa',
                  cancelText: 'Hủy',
                  okButtonProps: {
                    className: 'bg-rose-500 hover:bg-rose-600 border-0 text-white font-medium rounded-lg px-4 shadow-sm',
                    style: { color: '#FFFFFF' },
                  },
                  content: 'Yêu cầu sẽ bị xóa vĩnh viễn. Bạn có chắc không?',
                  onOk: async () => {
                    try {
                      await requestApi.remove(row.original.requestId);
                      message.success('Xóa yêu cầu thành công.');
                      setRefreshKey((k) => k + 1);
                    } catch (err: unknown) {
                      const e = err as Record<string, unknown>;
                      const apiMessage =
                        (typeof err === 'string' && err) ||
                        (e?.message as string) ||
                        (e?.detail as string) ||
                        (e?.title as string) ||
                        (e?.error as string) ||
                        (Array.isArray(e?.errors) && (e.errors[0] as string)) ||
                        ((e?.response as Record<string, unknown>)?.data as string);
                      message.error((apiMessage as string) ?? 'Xóa yêu cầu thất bại.');
                    }
                  },
                });
              }}
          />
                </>
              );
            })()}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 flex flex-col gap-3 min-h-0 h-full">
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

      <div className="grid grid-cols-4 gap-2">
        <StatCard
          icon={<BookOpen />}
          label="Tổng yêu cầu"
          value={totalItems.toString()}
        />
        <StatCard
          icon={<BookOpen />}
          label="Chờ duyệt"
          value={stats.pending.toString()}
        />
        <StatCard
          icon={<BookOpen />}
          label="Đã duyệt"
          value={stats.approved.toString()}
        />
        <StatCard
          icon={<BookOpen />}
          label="Từ chối"
          value={stats.rejected.toString()}
        />
      </div>

      <div
        className="bg-white rounded-xl border shadow-sm px-6 py-4 flex-1 min-h-0 overflow-hidden"
      >
        <DataTable
          columns={columns}
          data={data}
          pageNumber={pageNumber}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={(page) => setPageNumber(page)}
          fillHeight
          comfortable
          tableGap="tight"
        />
      </div>
    </div>
  );
}