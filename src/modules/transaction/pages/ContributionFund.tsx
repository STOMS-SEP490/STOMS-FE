import { useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useOutletContext } from 'react-router-dom';
import { Drawer } from 'antd';
import { Eye } from 'lucide-react';

import { DataTable } from '@/shared/components/common/DataTable';
import HoverSearch from '@/shared/components/ui/search';

import type { ContributionListItem } from '../api/contributionApi';
import { contributionApi } from '../api/contributionApi';

const baseColumns: ColumnDef<ContributionListItem>[] = [
  {
    accessorKey: 'contributionId',
    header: 'Mã đóng góp',
  },
  {
    accessorKey: 'memberName',
    header: 'Thành viên',
  },
  {
    accessorKey: 'amount',
    header: 'Số tiền',
    cell: ({ row }) => {
      const amount = row.original.amount ?? 0;
      return (
        <span className="font-semibold text-green-600">
          + {Math.abs(amount).toLocaleString('vi-VN')} đ
        </span>
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
  {
    accessorKey: 'description',
    header: 'Mô tả',
  },
];

export default function ContributionFund() {
  const context = useOutletContext<{ position: string }>();
  const [search, setSearch] = useState('');

  const [data, setData] = useState<ContributionListItem[]>([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [detailItem, setDetailItem] = useState<ContributionListItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (context.position === 'toolbar') return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await contributionApi.getContributions({
          pageNumber,
          pageSize,
        });
        setData(res.items ?? []);
        setTotalItems(res.totalItems ?? 0);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNumber, pageSize, context.position]);

  const filtered = useMemo(
    () =>
      data.filter((x) =>
        search.trim()
          ? x.description.toLowerCase().includes(search.trim().toLowerCase())
          : true
      ),
    [data, search]
  );

  if (context.position === 'toolbar') {
    return (
      <div className="flex gap-3">
        <HoverSearch
          placeholder="Tìm theo mô tả giao dịch..."
          value={search}
          onChange={setSearch}
        />
      </div>
    );
  }

  const columns = useMemo<ColumnDef<ContributionListItem>[]>(
    () => [
      ...baseColumns,
      {
        id: 'actions',
        header: 'Chi tiết',
        enableSorting: false,
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => {
              setOpenDetail(true);
              setDetailItem(null);
              setDetailLoading(true);
              contributionApi
                .getById(row.original.contributionId)
                .then((res) => {
                  setDetailItem(res);
                })
                .finally(() => setDetailLoading(false));
            }}
            title="Xem chi tiết"
          >
            <Eye size={16} className="text-gray-700 cursor-pointer" />
          </button>
        ),
      },
    ],
    []
  );

  return (
    <div className="px-6 pt-2 pb-4 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-[#1a7a99]">Quản lý đóng góp</h2>
        {loading && (
          <span className="text-xs text-gray-500">Đang tải dữ liệu...</span>
        )}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        pageNumber={pageNumber}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={setPageNumber}
      />

      <Drawer
        open={openDetail}
        onClose={() => {
          setOpenDetail(false);
          setDetailItem(null);
        }}
        placement="right"
        width={480}
        title="Chi tiết đóng góp"
      >
        {detailLoading && !detailItem ? (
          <div className="text-sm text-gray-500">Đang tải chi tiết...</div>
        ) : detailItem ? (
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-xs text-gray-500">Mã đóng góp</div>
              <div className="font-medium">{detailItem.contributionId}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Thành viên</div>
              <div>{detailItem.memberName ?? '—'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Mã giao dịch</div>
              <div>{detailItem.transactionId}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Số tiền</div>
              <div className="font-semibold text-green-600">
                {detailItem.amount != null
                  ? `+ ${Math.abs(detailItem.amount).toLocaleString('vi-VN')} đ`
                  : '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Ngày tạo</div>
              <div>
                {detailItem.createdAt
                  ? new Date(detailItem.createdAt).toLocaleString('vi-VN')
                  : '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Mô tả</div>
              <div className="whitespace-pre-wrap">
                {detailItem.description || '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Ảnh chứng từ</div>
              {detailItem.paymentImg ? (
                <a
                  href={detailItem.paymentImg}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline"
                >
                  Xem ảnh
                </a>
              ) : (
                <div>—</div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">Không có dữ liệu.</div>
        )}
      </Drawer>
    </div>
  );
}

