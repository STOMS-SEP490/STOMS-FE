import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Drawer, message } from 'antd';
import { Eye, PlusCircle, Pencil, Trash2, ClipboardList, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
import { getErrorMessage } from '@/shared/lib/errorMessage';

import type { AuditLogItem } from '../api/auditLogApi';
import { auditLogApi } from '../api/auditLogApi';

const entityTypeLabelMap: Record<string, string> = {
  '1': 'Phân công',
  '2': 'Xác nhận tham gia',
  '3': 'Buổi đăng nhập',
  '4': 'Phiếu mượn',
  '5': 'Danh mục',
  '6': 'Khóa học',
  '7': 'Thiết bị',
  '8': 'Mượn thiết bị',
  '9': 'Sự kiện',
  '10': 'Tài khoản',
  '11': 'Thành viên',
  '12': 'Yêu cầu',
  '13': 'Buổi học',
  '14': 'Kỹ năng',
  '15': 'Buổi môn học',
  '16': 'Môn học',
  '17': 'Báo cáo công việc',
  '18': 'Nhóm',
  '19': 'Chủ đề',
  '20': 'Giao dịch',
};

const columns: (onViewDetail: (item: AuditLogItem) => void) => ColumnDef<AuditLogItem>[] = (onViewDetail) => [
    {
      accessorKey: 'logId',
      header: 'Mã nhật ký',
    },
    {
      id: 'createdAt',
      header: 'Thời gian',
      cell: ({ row }) => {
        const createdAt = row.original.createdAt;
        if (!createdAt) return '—';
        const d = new Date(createdAt);
        return (
          <div>
            <div>{d.toLocaleDateString('vi-VN')}</div>
            <div className="text-xs text-muted-foreground">
              {d.toLocaleTimeString('vi-VN')}
            </div>
          </div>
        );
      },
    },
    {
      id: 'user',
      header: 'Người dùng',
      cell: ({ row }) => {
        const log = row.original;
        const fullName = log.user?.member?.fullName;
        const email = log.user?.email;
        return fullName || email || '—';
      },
    },
    {
      accessorKey: 'action',
      header: 'Hành động',
      cell: ({ row }) => {
        const action = row.original.action;
        const actionLabelMap: Record<string, string> = {
          Create: 'Tạo',
          Update: 'Cập nhật',
          Approve: 'Duyệt',
          Delete: 'Xóa',
          View: 'Xem',
          Reject: 'Từ chối',
        };
        const colorMap: Record<string, string> = {
          Create: 'bg-green-100 text-green-700',
          Update: 'bg-blue-100 text-blue-700',
          Approve: 'bg-purple-100 text-purple-700',
          Delete: 'bg-red-100 text-red-600',
          View: 'bg-orange-100 text-orange-700',
          Reject: 'bg-rose-100 text-rose-600',
        };

        const cls = colorMap[action] ?? 'bg-gray-100 text-gray-700';
        const label = actionLabelMap[action] ?? action;

        return (
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${cls}`}>
            {label}
          </span>
        );
      },
    },
    {
      accessorKey: 'entityType',
      header: 'Loại thực thể',
      cell: ({ row }) => {
        const code = String(row.original.entityType ?? '');
        const label = entityTypeLabelMap[code];
        return label != null && label !== '' ? label : code || '—';
      },
    },
    {
      accessorKey: 'entityId',
      header: 'Mã thực thể',
      cell: ({ row }) =>
        row.original.entityId != null ? (
          <span className="text-blue-600 font-medium cursor-pointer">
            {row.original.entityId}
          </span>
        ) : (
          '—'
        ),
    },
    {
      accessorKey: 'description',
      header: 'Mô tả',
    },
    {
      id: 'actions',
      header: 'Chi tiết',
      enableSorting: false,
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => onViewDetail(row.original)}
          title="Xem chi tiết"
        >
          <Eye className="w-4 h-4 text-blue-600 cursor-pointer" />
        </button>
      ),
    },
  ];

export default function AuditLogs() {
  const [pageNumber, setPageNumber] = useState(1);
  const pageSize = 10;

  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterEntityType, setFilterEntityType] = useState<string>('all');

  const [openDetail, setOpenDetail] = useState(false);
  const [detailItem, setDetailItem] = useState<AuditLogItem | null>(null);
  const navigate = useNavigate();

  const handleViewDetail = (item: AuditLogItem) => {
    const entityType = String(item.entityType ?? '');
    const entityId = item.entityId;
    const normalizedEntityType = entityType.trim().toLowerCase();

    // Nếu hệ thống đã có route detail theo :id thì điều hướng sang trang đó
    // BE: AuditEntityType.Request = 12 (có thể trả về "12" hoặc "Request" tùy serializer)
    if (
      (normalizedEntityType === '12' || normalizedEntityType === 'request') &&
      entityId != null
    ) {
      navigate(`/manager/requests/${entityId}`);
      return;
    }

    // Auto-open sidebars/drawers ở các trang list theo query param
    if (entityId != null) {
      // Course
      if (
        normalizedEntityType === '6' ||
        normalizedEntityType === 'course' 
     
      ) {
        navigate(`/manager/courses?openDetail=1&courseId=${entityId}`);
        return;
      }

      // Attendance / Xác nhận tham gia
      if (
        normalizedEntityType === '2' ||
        normalizedEntityType === 'attendance' 
     
      ) {
        navigate(`/tl/attendance/${entityId}`);
        return;
      }

      if (
        normalizedEntityType === '9' ||
        normalizedEntityType === 'event' ||
        normalizedEntityType === 'sự kiện' ||
        normalizedEntityType === 'su kien'
      ) {
        navigate(`/manager/events?openDetail=1&eventId=${entityId}`);
        return;
      }

      if (normalizedEntityType === '7' || normalizedEntityType === 'equipment') {
        navigate(`/manager/equipments?openDetail=1&equipmentId=${entityId}`);
        return;
      }

      if (normalizedEntityType === '10' || normalizedEntityType === 'user') {
        navigate(`/manager/users?openDetail=1&userId=${entityId}`);
        return;
      }

      if (normalizedEntityType === '11' || normalizedEntityType === 'member') {
        navigate(`/manager/members?openDetail=1&memberId=${entityId}`);
        return;
      }

      if (normalizedEntityType === '19' || normalizedEntityType === 'topic') {
        navigate(`/manager/topics?openDetail=1&topicId=${entityId}`);
        return;
      }

      if (normalizedEntityType === '18' || normalizedEntityType === 'team') {
        navigate(`/manager/teams?openDetail=1&teamId=${entityId}`);
        return;
      }

      if (normalizedEntityType === '17' || normalizedEntityType === 'taskreport') {
        navigate(`/manager/tasks?openDetail=1&taskReportId=${entityId}`);
        return;
      }

      // Borrowing / Category / Subject (FE currently supports these via query param)
      if (normalizedEntityType === '4' || normalizedEntityType === 'borrowing') {
        navigate(`/manager/borrowings?openDetail=1&borrowingId=${entityId}`);
        return;
      }

      if (normalizedEntityType === '5' || normalizedEntityType === 'category') {
        navigate(`/manager/equipments/categories?openDetail=1&categoryId=${entityId}`);
        return;
      }

      if (
        normalizedEntityType === '15' ||
        normalizedEntityType === 'subjectsession'
      ) {
        navigate(`/manager/subjects?openDetail=1&subjectId=${entityId}`);
        return;
      }

      if (normalizedEntityType === '16' || normalizedEntityType === 'subject') {
        navigate(`/manager/subjects?openDetail=1&subjectId=${entityId}`);
        return;
      }

      if (normalizedEntityType === '20' || normalizedEntityType === 'transaction') {
        navigate(`/manager/transactions?openDetail=1&transactionId=${entityId}`);
        return;
      }

      if (normalizedEntityType === '14' || normalizedEntityType === 'skill') {
        navigate(`/manager/skills?openDetail=1&skillId=${entityId}`);
        return;
      }
    }

    // Fallback: vẫn hiển thị drawer của audit log cho các entityType chưa map route
    setOpenDetail(true);
    setDetailItem(item);
  };

  const {
    data: paged,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['audit-logs', pageNumber, pageSize, filterAction, filterEntityType],
    queryFn: () =>
      auditLogApi.getAuditLogs({
        pageNumber,
        pageSize,
        action: filterAction !== 'all' ? filterAction : undefined,
        entityType: filterEntityType !== 'all' ? filterEntityType : undefined,
      }),
  });

  // Stats (use same audit log API, minimal payload)
  const { data: totalPaged, isLoading: totalLoading } = useQuery({
    queryKey: ['audit-logs-summary', 'all'],
    queryFn: () => auditLogApi.getAuditLogs({ pageNumber: 1, pageSize: 1 }),
  });

  const { data: createPaged, isLoading: createLoading } = useQuery({
    queryKey: ['audit-logs-summary', 'Create'],
    queryFn: () => auditLogApi.getAuditLogs({ pageNumber: 1, pageSize: 1, action: 'Create' }),
  });

  const { data: updatePaged, isLoading: updateLoading } = useQuery({
    queryKey: ['audit-logs-summary', 'Update'],
    queryFn: () => auditLogApi.getAuditLogs({ pageNumber: 1, pageSize: 1, action: 'Update' }),
  });

  const { data: deletePaged, isLoading: deleteLoading } = useQuery({
    queryKey: ['audit-logs-summary', 'Delete'],
    queryFn: () => auditLogApi.getAuditLogs({ pageNumber: 1, pageSize: 1, action: 'Delete' }),
  });

  const statValue = (loading: boolean, value: number) =>
    loading ? '—' : value.toLocaleString('vi-VN');

  const logs = useMemo(() => paged?.items ?? [], [paged]);
  const totalItems = paged?.totalItems ?? 0;

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((log) => {
      const text =
        `${log.description || ''} ${log.action || ''} ${log.entityType || ''} ${
          log.user?.member?.fullName || ''
        } ${log.user?.email || ''}`.toLowerCase();
      return text.includes(q);
    });
  }, [logs, search]);

  const lastErrorRef = useRef<string | null>(null);
  useEffect(() => {
    if (!error) return;
    const msg = getErrorMessage(error);
    if (lastErrorRef.current === msg) return;
    lastErrorRef.current = msg;
    message.error(msg);
  }, [error]);

  return (
    <div className="p-6 pl-8 space-y-6">
      {/* HEADER */}
      <div className="flex justify-between bg-white px-6 py-4 mb-2 rounded-xl border shadow-sm items-center">
        <div>
          <h2 className="text-xl font-semibold text-black">Quản lý nhật ký hoạt động</h2>
          <p className="text-xs text-gray-500">Quản lý nhật ký hoạt động của người dùng</p>
        </div>

        {isLoading && (
          <span className="text-xs text-gray-500">Đang tải dữ liệu...</span>
        )}
      </div>
      {/* STATS */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <StatCard
          icon={<ClipboardList />}
          label="Tổng nhật ký"
          value={statValue(totalLoading, totalPaged?.totalItems ?? 0)}
          sub="Bản ghi"
        />
        <StatCard
          icon={<PlusCircle />}
          label="Tạo mới"
          value={statValue(createLoading, createPaged?.totalItems ?? 0)}
          sub="Bản ghi"
          variant="green"
        />
        <StatCard
          icon={<Pencil />}
          label="Cập nhật"
          value={statValue(updateLoading, updatePaged?.totalItems ?? 0)}
          sub="Bản ghi"
        />
        <StatCard
          icon={<Trash2 />}
          label="Xóa"
          value={statValue(deleteLoading, deletePaged?.totalItems ?? 0)}
          sub="Bản ghi"
        />
      </div>
      {/* <div className="flex justify-between bg-white px-6 py-4 mb-2 rounded-xl border shadow-sm items-center ">
  <HoverSearch />
</div> */}{' '}
      {/* Filter Bar */}
      <div className="flex justify-end gap-3 mb-2">
        <HoverSearch
          placeholder="Tìm theo mô tả, người dùng..."
          value={search}
          onChange={setSearch}
        />
        <div className="flex items-center gap-3">
          {/* Action Filter */}
          <Select
            value={filterAction}
            onValueChange={(v) => {
              setFilterAction(v);
              setPageNumber(1);
            }}
          >
            <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white ">
              <SelectValue placeholder="Hành động" />
            </SelectTrigger>
            <SelectContent className="max-h-64 overflow-y-auto">
              <SelectItem value="all">Tất cả hành động</SelectItem>
              <SelectItem value="Create">Tạo</SelectItem>
              <SelectItem value="Update">Cập nhật</SelectItem>
              <SelectItem value="Approve">Duyệt</SelectItem>
              <SelectItem value="Delete">Xóa</SelectItem>
              <SelectItem value="View">Xem</SelectItem>
              <SelectItem value="Reject">Từ chối</SelectItem>
            </SelectContent>
          </Select>

          {/* EntityType Filter */}
          <Select
            value={filterEntityType}
            onValueChange={(v) => {
              setFilterEntityType(v);
              setPageNumber(1);
            }}
          >
            <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white">
              <SelectValue placeholder="Loại" />
            </SelectTrigger>
            <SelectContent className="max-h-64 overflow-y-auto">
              <SelectItem value="all">Tất cả loại</SelectItem>
              <SelectItem value="1">Phân công</SelectItem>
              <SelectItem value="2">Xác nhận tham gia</SelectItem>
              <SelectItem value="3">Buổi đăng nhập</SelectItem>
              <SelectItem value="4">Phiếu mượn</SelectItem>
              <SelectItem value="5">Danh mục</SelectItem>
              <SelectItem value="6">Khóa học</SelectItem>
              <SelectItem value="7">Thiết bị</SelectItem>
              <SelectItem value="8">Mượn thiết bị</SelectItem>
              <SelectItem value="9">Sự kiện</SelectItem>
              <SelectItem value="10">Tài khoản</SelectItem>
              <SelectItem value="11">Thành viên</SelectItem>
              <SelectItem value="12">Yêu cầu</SelectItem>
              <SelectItem value="13">Buổi học</SelectItem>
              <SelectItem value="14">Kỹ năng</SelectItem>
              <SelectItem value="15">Buổi môn học</SelectItem>
              <SelectItem value="16">Môn học</SelectItem>
              <SelectItem value="17">Báo cáo công việc</SelectItem>
              <SelectItem value="18">Nhóm</SelectItem>
              <SelectItem value="19">Chủ đề</SelectItem>
              <SelectItem value="20">Giao dịch</SelectItem>
            </SelectContent>
          </Select>

          {/* Reset Button */}
          <Button
            variant="secondary"
            className="bg-white"
            onClick={() => {
              setSearch('');
              setFilterAction('all');
              setFilterEntityType('all');
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
          columns={columns(handleViewDetail)}
          data={filteredLogs}
          pageNumber={pageNumber}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={setPageNumber}
        />
      </div>
      <Drawer
        open={openDetail}
        onClose={() => {
          setOpenDetail(false);
          setDetailItem(null);
        }}
        placement="right"
        width={480}
        title="Chi tiết nhật ký"
      >
        {detailItem ? (
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-xs text-gray-500">Mã nhật ký</div>
              <div className="font-medium">{detailItem.logId}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Thời gian</div>
              <div>
                {detailItem.createdAt
                  ? new Date(detailItem.createdAt).toLocaleString('vi-VN')
                  : '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Người dùng</div>
              <div>
                {detailItem.user?.member?.fullName ??
                  detailItem.user?.email ??
                  '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Hành động</div>
              <div>{detailItem.action}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Loại thực thể</div>
              <div>{detailItem.entityType}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Mã thực thể</div>
              <div>{detailItem.entityId ?? '—'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Mô tả</div>
              <div className="whitespace-pre-wrap">
                {detailItem.description || '—'}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">Không có dữ liệu.</div>
        )}
      </Drawer>
    </div>
  );
}
