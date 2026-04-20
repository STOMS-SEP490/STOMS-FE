import { useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import HoverSearch from '@/shared/components/ui/search';
import { DataTable } from '@/shared/components/common/DataTable';
import type { EquipmentListItem } from '@/modules/equipment/equipment';
import { Badge } from '@/shared/components/ui/badge';
import { getEquipmentStatusColor, getEquipmentStatusDisplay } from '@/constants/equipment';
import { useCategories } from '@/modules/category/hooks/useCategories';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import EquipmentsHistory from '@/modules/equipment/pages/EquipmentsHistory';
import { X } from 'lucide-react';
import { getEquipmentsListCached } from '@/modules/equipment/utils/equipmentListCache';

export default function AvailableEquipmentsPage() {
  const [items, setItems] = useState<EquipmentListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(8);
  const [totalItems, setTotalItems] = useState(0);
  const [activeTab, setActiveTab] = useState<'list' | 'borrowings'>('list');
  const [previewImgUrl, setPreviewImgUrl] = useState<string | null>(null);
  const borrowedByMemberId = useMemo(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('user') || '{}') as { memberId?: number };
      const id = Number(raw.memberId || 0);
      return id > 0 ? id : undefined;
    } catch {
      return undefined;
    }
  }, []);
  const { data: categories } = useCategories();
  const categoryNameById = new Map(categories.map((c) => [c.categoryId, c.categoryName]));

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await getEquipmentsListCached({
          pageNumber,
          pageSize,
          equipmentName: search.trim() || undefined,
          status: 'AVAILABLE',
        });
        setItems(res.items ?? []);
        setTotalItems(res.totalItems ?? 0);
      } catch (err) {
        console.error('fetch available equipments error:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [pageNumber, pageSize, search]);

  const columns = useMemo<ColumnDef<EquipmentListItem>[]>(
    () => [
      {
        accessorKey: 'equipmentCode',
        header: 'Mã thiết bị',
        enableSorting: false,
        cell: ({ row }) => <span className="font-semibold">{row.original.equipmentCode}</span>,
      },
      {
        accessorKey: 'equipmentName',
        header: 'Tên thiết bị',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="font-medium truncate">{row.original.equipmentName}</div>
            <div className="text-xs text-gray-500 truncate">{row.original.description || '—'}</div>
          </div>
        ),
      },
      {
        accessorKey: 'categoryId',
        header: 'Danh mục',
        enableSorting: false,
        cell: ({ row }) => (
          <Badge variant="secondary">
            {categoryNameById.get(row.original.categoryId) ?? row.original.categoryId}
          </Badge>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        enableSorting: false,
        cell: ({ row }) => (
          <Badge className={getEquipmentStatusColor(row.original.status)}>
            {getEquipmentStatusDisplay(row.original.status)}
          </Badge>
        ),
      },
      {
        accessorKey: 'imgLink',
        header: 'Hình ảnh',
        enableSorting: false,
        cell: ({ row }) =>
          row.original.imgLink ? (
            <div className="w-10 h-10 rounded-md overflow-hidden border bg-gray-50">
              <img
                src={row.original.imgLink}
                alt={row.original.equipmentName}
                width={40}
                height={40}
                loading="lazy"
                decoding="async"
                className="h-10 w-10 object-cover cursor-pointer hover:opacity-90"
                onClick={() => setPreviewImgUrl(row.original.imgLink ?? null)}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          ) : (
            <span className="text-xs text-gray-500">Không có ảnh</span>
          ),
      },
    ],
    [categoryNameById],
  );

  return (
    <div
      className="p-6 app-page-bg flex flex-col gap-2 min-h-0 overflow-hidden"
      style={{ height: 'var(--content-height, 100vh)' }}
    >
      <div className="bg-white px-6 py-4 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-semibold text-[#1a7a99]">Danh sách thiết bị khả dụng</h2>
        <p className="text-xs text-gray-500">Hiển thị thiết bị có thể mượn bây giờ</p>
      </div>

      <div className="px-2 py-1">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'list' | 'borrowings')}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="list">DANH SÁCH</TabsTrigger>
              <TabsTrigger value="borrowings">PHIẾU MƯỢN</TabsTrigger>
            </TabsList>
            {activeTab === 'list' && (
              <HoverSearch
                value={search}
                onChange={(v) => {
                  setSearch(v);
                  setPageNumber(1);
                }}
                placeholder="Tìm theo tên thiết bị..."
              />
            )}
          </div>
        </Tabs>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {activeTab === 'list' ? (
          <>
            {loading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/60">
                <span className="text-sm text-slate-500">Đang tải...</span>
              </div>
            )}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <DataTable
                columns={columns}
                data={items}
                pageNumber={pageNumber}
                pageSize={pageSize}
                totalItems={totalItems}
                onPageChange={setPageNumber}
                fillHeight
                tableGap="tight"
              />
            </div>
          </>
        ) : (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <EquipmentsHistory borrowedByMemberId={borrowedByMemberId} embedded />
          </div>
        )}
      </div>
      {previewImgUrl ? (
        <div className="fixed inset-0 z-[90]">
          <div
            className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
            onClick={() => setPreviewImgUrl(null)}
            aria-hidden="true"
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="relative max-h-[90vh] w-full max-w-[900px]">
              <button
                type="button"
                className="absolute -top-3 -right-3 rounded-full bg-white/95 border border-slate-200 p-2 text-slate-700 shadow hover:bg-white"
                onClick={() => setPreviewImgUrl(null)}
                aria-label="Đóng ảnh"
              >
                <X className="h-4 w-4" />
              </button>
              <img
                src={previewImgUrl}
                alt="Preview"
                className="max-h-[90vh] w-full rounded-xl object-contain bg-black/20"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

