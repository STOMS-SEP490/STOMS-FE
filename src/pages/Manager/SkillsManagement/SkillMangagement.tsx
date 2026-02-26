import { DataTable } from '@/components/common/DataTable';
import { StatCard } from '@/components/common/StatCard';
import { Button } from '@/components/ui/button';
import HoverSearch from '@/components/ui/search';
import type { ColumnDef } from '@tanstack/react-table';
import { BookOpen, CheckCircle, Clock, Eye, GraduationCap, Pencil, Plus } from 'lucide-react';

export default function SkillsManagement() {
  const data = [
    {
      id: 1,
      name: 'Lập trình web',
      description: 'Các công nghệ và kỹ thuật phát triển ứng dụng web',
      subjects: 12,
      events: 8,
      groups: 5,
      createdAt: '15/01/2024',
    },
    {
      id: 2,
      name: 'Trí tuệ nhân tạo',
      description: 'Machine Learning, Deep Learning và ứng dụng',
      subjects: 9,
      events: 6,
      groups: 4,
      createdAt: '10/01/2024',
    },
    {
      id: 3,
      name: 'Cơ sở dữ liệu',
      description: 'Thiết kế, quản lý và tối ưu hóa cơ sở dữ liệu',
      subjects: 7,
      events: 4,
      groups: 3,
      createdAt: '08/01/2024',
    },
    {
      id: 4,
      name: 'An ninh mạng',
      description: 'Bảo mật hệ thống, mạng và ứng dụng',
      subjects: 6,
      events: 5,
      groups: 2,
      createdAt: '05/01/2024',
    },
    {
      id: 5,
      name: 'Phát triển mobile',
      description: 'Lập trình ứng dụng di động iOS và Android',
      subjects: 5,
      events: 3,
      groups: 2,
      createdAt: '02/01/2024',
    },
    {
      id: 6,
      name: 'DevOps',
      description: 'CI/CD, containerization và tự động hóa',
      subjects: 0,
      events: 0,
      groups: 0,
      createdAt: '28/12/2023',
    },
    {
      id: 7,
      name: 'UX/UI Design',
      description: 'Thiết kế trải nghiệm người dùng và giao diện',
      subjects: 4,
      events: 2,
      groups: 1,
      createdAt: '20/12/2023',
    },
    {
      id: 8,
      name: 'Cloud Computing',
      description: 'AWS, Azure, Google Cloud và kiến trúc đám mây',
      subjects: 3,
      events: 2,
      groups: 1,
      createdAt: '15/12/2023',
    },
  ];

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'id',
      header: 'MÃ CHỦ ĐỀ',
      cell: ({ row }) => <div className="text-sm font-medium">{row.original.id}</div>,
    },
    {
      accessorKey: 'name',
      header: 'TÊN CHỦ ĐỀ',
      cell: ({ row }) => <div className="text-sm font-medium">{row.original.name}</div>,
    },
    {
      accessorKey: 'description',
      header: 'MÔ TẢ',
      cell: ({ row }) => <div>{row.original.description}</div>,
    },
    {
      accessorKey: 'subjects',
      header: 'MÔN HỌC',
      cell: ({ row }) => (
        <div className="flex justify-center">
          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-600">
            {row.original.subjects}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'events',
      header: 'SỰ KIỆN',
      cell: ({ row }) => (
        <div className="flex justify-center">
          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-600">
            {row.original.events}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'groups',
      header: 'NHÓM',
      cell: ({ row }) => (
        <div className="flex justify-center">
          <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-600">
            {row.original.groups}
          </span>
        </div>
      ),
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
          <h2 className="text-xl font-semibold text-black">Quản lý chủ đề</h2>
          <p className="text-xs text-gray-500">Quản lý các chủ đề trong hệ thống</p>
        </div>

        <div className="flex gap-3 items-center">
          <Button className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white px-3 py-2 rounded-md">
            <Plus size={16} />
            Thêm chủ đề
          </Button>
        </div>
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
      <div className="flex mb-2 justify-end">
        {' '}
        <HoverSearch />
      </div>
      {/* TABLE CARD */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <DataTable columns={columns} data={data} />
      </div>
    </div>
  );
}
