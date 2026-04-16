
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, Pencil, Trash2, Plus, List, Clock, CheckCircle2, X } from 'lucide-react';
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

type RequestTypeKey = 'subject' | 'course' | 'event' | 'other';

/** Nhãn hiển thị có thể đổi; màu badge gắn theo `key` để không phụ thuộc việt hóa. */
const REQUEST_TYPE_BADGE_CLASS: Record<RequestTypeKey, string> = {
  subject: 'bg-blue-100 text-blue-700',
  course: 'bg-purple-100 text-purple-700',
  event: 'bg-orange-100 text-orange-700',
  other: 'bg-gray-200 text-gray-700',
};

const getRequestTypeInfo = (row: RequestListItem): { key: RequestTypeKey; label: string } => {
  if (row.subjectId) return { key: 'subject', label: 'Môn học' };
  if (row.courseId) return { key: 'course', label: 'Khóa học' };
  if (row.eventId) return { key: 'event', label: 'Sự kiện' };
  return { key: 'other', label: 'Khác' };
};

export default function RequestsManagement() {
  const navigate = useNavigate();
  const [pageNumber, setPageNumber] = useState(1);
  const pageSize = 10;
  const [refreshKey, setRefreshKey] = useState(0);

  const { data, totalItems } = useRequests(pageNumber, pageSize, refreshKey);

  // Lấy đúng tổng theo từng trạng thái để hiển thị thẻ thống kê chính xác
  const { totalItems: pendingTotalItems } = useRequests(1, 1, refreshKey, { statuses: ['PENDING'] });
  const { totalItems: approvedTotalItems } = useRequests(1, 1, refreshKey, { statuses: ['APPROVED'] });
  const { totalItems: rejectedTotalItems } = useRequests(1, 1, refreshKey, { statuses: ['REJECTED'] });

  const stats = useMemo(
    () => ({
      pending: pendingTotalItems,
      approved: approvedTotalItems,
      rejected: rejectedTotalItems,
    }),
    [pendingTotalItems, approvedTotalItems, rejectedTotalItems]
  );

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
        const { key, label } = getRequestTypeInfo(row.original);

        return (
          <Badge className={REQUEST_TYPE_BADGE_CLASS[key]}>
            {label}
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
              className={
                isPending || getRequestStatusLabel(row.original.status) === 'Từ chối'
                  ? 'cursor-pointer text-blue-600'
                  : 'cursor-not-allowed text-blue-300'
              }
            onClick={() =>
                isPending || getRequestStatusLabel(row.original.status) === 'Từ chối'
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
    <div className="p-6 pl-8 flex flex-col gap-3 min-h-0 h-full">
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
          icon={<List />}
          label="Tổng yêu cầu"
          value={totalItems.toString()}
          variant="blue"
        />
        <StatCard
          icon={<Clock />}
          label="Chờ duyệt"
          value={stats.pending.toString()}
          variant="amber"
        />
        <StatCard
          icon={<CheckCircle2 />}
          label="Đã duyệt"
          value={stats.approved.toString()}
          variant="green"
        />
        <StatCard
          icon={<X />}
          label="Từ chối"
          value={stats.rejected.toString()}
          variant="rose"
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