import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Drawer, message } from 'antd';
import { BookOpen, CheckCircle, Clock, Eye, GraduationCap, RotateCcw } from 'lucide-react';

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
  '2': 'Điểm danh',
  '3': 'Phiên đăng nhập',
  '4': 'Phiếu mượn',
  '5': 'Danh mục',
  '6': 'Khóa học',
  '7': 'Thiết bị',
  '8': 'Mượn thiết bị',
  '9': 'Đặt lịch',
  '10': 'Sự kiện',
  '11': 'Tài khoản',
  '12': 'Thành viên',
  '13': 'Yêu cầu',
  '14': 'Vai trò',
  '15': 'Buổi học',
  '16': 'Kỹ năng',
  '17': 'Buổi môn học',
  '18': 'Môn học',
  '19': 'Báo cáo công việc',
  '20': 'Đội nhóm',
  '21': 'Chủ đề',
  '22': 'Giao dịch',
};

const columns: (
  setOpenDetail: (v: boolean) => void,
  setDetailItem: (item: AuditLogItem | null) => void
) => ColumnDef<AuditLogItem>[] = (setOpenDetail, setDetailItem) => [
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
        const colorMap: Record<string, string> = {
          Create: 'bg-green-100 text-green-700',
          Update: 'bg-blue-100 text-blue-700',
          Approve: 'bg-purple-100 text-purple-700',
          Delete: 'bg-red-100 text-red-600',
          View: 'bg-orange-100 text-orange-700',
          Reject: 'bg-rose-100 text-rose-600',
        };

        const cls = colorMap[action] ?? 'bg-gray-100 text-gray-700';

        return (
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${cls}`}>
            {action}
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
          onClick={() => {
            setOpenDetail(true);
            setDetailItem(row.original);
          }}
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
    <div className=" p-6 space-y-6 ">
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
      <div className="grid grid-cols-4 gap-4 mb-2">
        <StatCard
          icon={<GraduationCap />}
          label="Tổng người dùng"
          value="186"
          sub="tài khoản đang hoạt động"
        />
        <StatCard
          icon={<CheckCircle />}
          label="Tổng giảng viên"
          value="42"
          sub="giảng viên và trợ giảng"
          variant="green"
        />
        <StatCard
          icon={<BookOpen />}
          label="Vô hiệu hóa"
          value="156"
          sub="người dùng đã bị vô hiệu hóa"
        />
        <StatCard icon={<Clock />} label="Tổng buổi học" value="1,248" sub="Buổi học" />
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
              <SelectItem value="2">Điểm danh</SelectItem>
              <SelectItem value="3">Phiên đăng nhập</SelectItem>
              <SelectItem value="4">Phiếu mượn</SelectItem>
              <SelectItem value="5">Danh mục</SelectItem>
              <SelectItem value="6">Khóa học</SelectItem>
              <SelectItem value="7">Thiết bị</SelectItem>
              <SelectItem value="8">Mượn thiết bị</SelectItem>
              <SelectItem value="9">Đặt lịch</SelectItem>
              <SelectItem value="10">Sự kiện</SelectItem>
              <SelectItem value="11">Tài khoản</SelectItem>
              <SelectItem value="12">Thành viên</SelectItem>
              <SelectItem value="13">Yêu cầu</SelectItem>
              <SelectItem value="14">Vai trò</SelectItem>
              <SelectItem value="15">Buổi học</SelectItem>
              <SelectItem value="16">Kỹ năng</SelectItem>
              <SelectItem value="17">Buổi môn học</SelectItem>
              <SelectItem value="18">Môn học</SelectItem>
              <SelectItem value="19">Báo cáo công việc</SelectItem>
              <SelectItem value="20">Đội nhóm</SelectItem>
              <SelectItem value="21">Chủ đề</SelectItem>
              <SelectItem value="22">Giao dịch</SelectItem>
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
          columns={columns(setOpenDetail, setDetailItem)}
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
