import Badge from 'antd/es/badge/Badge';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRequests } from '@/modules/request/hooks/useRequests';

type RequestSidebarProps = {
  search?: string;
};

export default function RequestSidebar({ search = '' }: RequestSidebarProps) {
  const navigate = useNavigate();
  const { id } = useParams();

  const { data: requestList, totalItems, loading } = useRequests(1, 50);

  const filtered = requestList.filter(
    (item) =>
      (item.requestName ?? '')
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      (item.customerName ?? '')
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  return (
    <div className="text-black">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between p-4 border-b">
          <h2 className="font-semibold text-lg text-black">Danh sách yêu cầu</h2>
          <span className="text-sm font-medium text-primary">{totalItems}</span>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
          {loading && (
            <div className="p-4 text-sm text-gray-500">Đang tải danh sách...</div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="p-4 text-sm text-gray-500">Chưa có yêu cầu nào.</div>
          )}
          {!loading &&
            filtered.map((item) => {
              const isActive = id === String(item.requestId);

              return (
                <div
                  key={item.requestId}
                  onClick={() => navigate(`/manager/requests/${item.requestId}`)}
                  className={`cursor-pointer rounded-xl border p-4 transition
                  ${isActive ? 'bg-blue-50 border-blue-500' : 'bg-white hover:shadow-sm'}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="text-sm font-medium text-black">
                      {item.requestName || item.requestCode}
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {item.customerName || '—'}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = (status ?? '').toLowerCase();

  if (s.includes('chờ') || s.includes('pending'))
    return <Badge className="bg-orange-100 text-orange-600 text-xs">Chờ duyệt</Badge>;
  if (s.includes('đã duyệt') || s.includes('approved'))
    return <Badge className="bg-green-100 text-green-600 text-xs">Đã duyệt</Badge>;
  if (s.includes('đang xử lý') || s.includes('processing'))
    return <Badge className="bg-blue-100 text-blue-600 text-xs">Đang xử lý</Badge>;
  if (s.includes('từ chối') || s.includes('reject'))
    return <Badge className="bg-red-100 text-red-600 text-xs">Từ chối</Badge>;

  return <Badge className="bg-gray-100 text-gray-600 text-xs">{status || '—'}</Badge>;
}
