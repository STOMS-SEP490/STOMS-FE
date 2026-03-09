
import { DataTable } from '@/shared/components/common/DataTable';
import { StatCard } from '@/shared/components/common/StatCard';
import { Button } from '@/shared/components/ui/button';
import HoverSearch from '@/shared/components/ui/search';
import type { ColumnDef } from '@tanstack/react-table';
import { BookOpen, CheckCircle, Clock, Eye, GraduationCap, Pencil, Plus } from 'lucide-react';
import { useSkills } from '../hooks/useSkills';

export default function SkillsManagement() {
  const { data, loading, search, setSearch, pageNumber, pageSize, totalItems, setPageNumber } =
    useSkills();

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'skillId',
      header: 'MÃ KỸ NĂNG',
      cell: ({ row }) => <div className="text-sm font-medium">{row.original.skillId}</div>,
    },
    {
      accessorKey: 'skillName',
      header: 'TÊN KỸ NĂNG',
      cell: ({ row }) => <div className="text-sm font-medium">{row.original.skillName}</div>,
    },
    {
      accessorKey: 'description',
      header: 'MÔ TẢ',
      cell: ({ row }) => <div>{row.original.description}</div>,
    },
    {
      accessorKey: 'createdAt',
      header: 'NGÀY TẠO',
    },
    {
      id: 'actions',
      header: 'THAO TÁC',
      cell: () => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Eye className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Pencil className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];
  return (
    <div className="h-screen overflow-hidden p-6 space-y-6  ">
      {/* HEADER */}
      <div className="flex justify-between bg-white px-6 py-4 mb-2 rounded-xl border shadow-sm items-center">
        <div>
          <h2 className="text-xl font-semibold text-black">Quản lý kỹ năng</h2>
          <p className="text-xs text-gray-500">Quản lý các kỹ năng trong hệ thống</p>
        </div>

        <div className="flex gap-3 items-center">
          <Button className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white px-3 py-2 rounded-md">
            <Plus size={16} />
            Thêm kỹ năng
          </Button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-4 gap-4 mb-2">
        <StatCard
          icon={<GraduationCap />}
          label="Tổng kỹ năng"
          value={totalItems}
          sub="kỹ năng trong hệ thống"
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
      <div className="flex mb-2 justify-end">
        <HoverSearch value={search} onChange={setSearch} />
      </div>
      {/* TABLE CARD */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          pageNumber={pageNumber}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={setPageNumber}
        />
      </div>
    </div>
  );
}
