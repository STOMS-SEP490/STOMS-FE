import { useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { RotateCcw } from 'lucide-react';
import HoverSearch from '@/shared/components/ui/search';
import { DataTable } from '@/shared/components/common/DataTable';
import { Button } from '@/shared/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import type { EquipmentListItem } from '@/modules/equipment/equipment';
import { Badge } from '@/shared/components/ui/badge';
import { getEquipmentStatusColor, getEquipmentStatusDisplay } from '@/constants/status';
import { useCategories } from '@/modules/category/hooks/useCategories';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import EquipmentsHistory from '@/modules/equipment/pages/EquipmentsHistory';
import { getEquipmentsListCached } from '@/modules/equipment/utils/equipmentListCache';

export default function AvailableEquipmentsPage() {
  const [items, setItems] = useState<EquipmentListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [activeTab, setActiveTab] = useState<'list' | 'borrowings'>('list');
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
          categoryId: categoryFilter === 'all' ? undefined : categoryFilter,
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
  }, [pageNumber, pageSize, search, categoryFilter]);

  const columns = useMemo<ColumnDef<EquipmentListItem>[]>(
    () => [
      {
        accessorKey: 'equipmentCode',
        header: 'Mã thiết bị',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-semibold text-[#1a7a99]">{row.original.equipmentCode}</span>
        ),
      },
      {
        accessorKey: 'equipmentName',
        header: 'Tên thiết bị',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="font-medium truncate text-[#1a7a99]">
              {row.original.equipmentName}
            </div>
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
    ],
    [categoryNameById],
  );

  return (
    <div className="p-6 app-page-bg space-y-2">
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
              <div className="flex items-center gap-2">
                <Select
                  value={String(categoryFilter)}
                  onValueChange={(v) => {
                    setCategoryFilter(v === 'all' ? 'all' : Number(v));
                    setPageNumber(1);
                  }}
                >
                  <SelectTrigger className="w-[180px] bg-white">
                    <SelectValue placeholder="Chọn danh mục" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả danh mục</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.categoryId} value={String(cat.categoryId)}>
                        {cat.categoryName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <HoverSearch
                  value={search}
                  onChange={(v) => {
                    setSearch(v);
                    setPageNumber(1);
                  }}
                  placeholder="Tìm theo tên thiết bị..."
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => {
                    setSearch('');
                    setCategoryFilter('all');
                    setPageNumber(1);
                  }}
                  title="Đặt lại bộ lọc"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </Tabs>
      </div>

      <div className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {activeTab === 'list' ? (
          <>
            {loading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/60">
                <span className="text-sm text-slate-500">Đang tải...</span>
              </div>
            )}
            <DataTable
              columns={columns}
              data={items}
              pageNumber={pageNumber}
              pageSize={pageSize}
              totalItems={totalItems}
              onPageChange={setPageNumber}
              fillHeight={false}
            />
          </>
        ) : (
          <EquipmentsHistory borrowedByMemberId={borrowedByMemberId} embedded />
        )}
      </div>
    </div>
  );
}

