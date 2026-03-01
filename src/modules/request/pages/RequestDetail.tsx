// import { DataTable } from '@/shared/components/common/DataTable';
// import { useParams } from 'react-router-dom';

// type RequestItem = {
//   id: string;
//   title: string;
//   createdBy: string;
//   status: 'pending' | 'approved' | 'processing' | 'rejected';
// };

// export default function RequestDetail() {
//   const { id } = useParams<{ id: string }>();

//   const requestList: RequestItem[] = [
//     {
//       id: '1',
//       title: 'Yêu cầu giảng dạy - AI cơ bản K12',
//       createdBy: 'Trần Thị Bình',
//       status: 'pending',
//     },
//     {
//       id: '2',
//       title: 'Yêu cầu giảng dạy - Python nâng cao',
//       createdBy: 'Nguyễn Văn Cường',
//       status: 'processing',
//     },
//     {
//       id: '3',
//       title: 'Workshop STEM 2024',
//       createdBy: 'Lê Minh Đức',
//       status: 'approved',
//     },
//   ];

//   const selectedRequest = requestList.find((r) => r.id === id);

//   if (!selectedRequest) {
//     return <Cardimport { DataTable } from '@/components/common/DataTable';
// import { StatCard } from '@/components/common/StatCard';
// import { Badge } from '@/components/ui/badge';
// import { Button } from '@/components/ui/button';
// import type { ColumnDef } from '@tanstack/react-table';
// import { Eye, Pencil, Trash2, Plus, BookOpen } from 'lucide-react';
// import { useMemo, useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import dayjs from 'dayjs';
// import { useRequests } from '../hooks/useRequests';
// import type { RequestListItem } from '../request';

// const getRequestType = (row: RequestListItem) => {
//   if (row.subjectId) return 'Subject';
//   if (row.courseId) return 'Course';
//   if (row.eventId) return 'Event';
//   return 'Khác';
// };

// const statusMap = {
//   approved: {
//     label: 'Đã duyệt',
//     className: 'bg-green-100 text-green-700',
//   },
//   pending: {
//     label: 'Chờ duyệt',
//     className: 'bg-yellow-100 text-yellow-700',
//   },
//   draft: {
//     label: 'Nháp',
//     className: 'bg-gray-200 text-gray-700',
//   },
//   rejected: {
//     label: 'Từ chối',
//     className: 'bg-red-100 text-red-600',
//   },
// };

// export default function RequestsManagement() {
//   const navigate = useNavigate();
//   const [pageNumber, setPageNumber] = useState(1);
//   const pageSize = 10;

//   const { data, totalItems, loading } = useRequests(
//     pageNumber,
//     pageSize
//   );

//   const stats = useMemo(() => {
//     const pending = data.filter(
//       (d) => d.status?.toLowerCase() === 'pending'
//     ).length;

//     const approved = data.filter(
//       (d) => d.status?.toLowerCase() === 'approved'
//     ).length;

//     const rejected = data.filter(
//       (d) => d.status?.toLowerCase() === 'rejected'
//     ).length;

//     return { pending, approved, rejected };
//   }, [data]);

//   const columns: ColumnDef<RequestListItem>[] = [
//     { accessorKey: 'requestCode', header: 'Mã yêu cầu' },
//     { accessorKey: 'requestName', header: 'Tên yêu cầu' },
//     { accessorKey: 'customerName', header: 'Khách hàng' },

//     {
//       header: 'Loại',
//       cell: ({ row }) => {
//         const type = getRequestType(row.original);

//         const colorMap: Record<string, string> = {
//           Subject: 'bg-blue-100 text-blue-700',
//           Course: 'bg-purple-100 text-purple-700',
//           Event: 'bg-orange-100 text-orange-700',
//           Khác: 'bg-gray-200 text-gray-700',
//         };

//         return (
//           <Badge className={colorMap[type]}>
//             {type}
//           </Badge>
//         );
//       },
//     },

//     {
//       accessorKey: 'startDate',
//       header: 'Ngày bắt đầu',
//       cell: ({ row }) =>
//         dayjs(row.original.startDate).format('DD/MM/YYYY'),
//     },

//     {
//       header: 'Số phiên',
//       cell: ({ row }) =>
//         row.original.sessions?.length ??
//         row.original.sessionsRequired ??
//         0,
//     },

//     {
//       accessorKey: 'status',
//       header: 'Trạng thái',
//       cell: ({ row }) => {
//         const status =
//           row.original.status?.toLowerCase() as keyof typeof statusMap;

//         const config = statusMap[status] || statusMap.pending;

//         return (
//           <Badge className={config.className}>
//             {config.label}
//           </Badge>
//         );
//       },
//     },

//     {
//       id: 'actions',
//       header: 'Thao tác',
//       cell: ({ row }) => (
//         <div className="flex gap-3">
//           <Eye
//             size={16}
//             className="cursor-pointer"
//             onClick={() =>
//               navigate(`/pc/requests/${row.original.requestId}`)
//             }
//           />
//           <Pencil
//             size={16}
//             className="cursor-pointer text-blue-600"
//             onClick={() =>
//               navigate(
//                 `/pc/requests/edit/${row.original.requestId}`
//               )
//             }
//           />
//           <Trash2
//             size={16}
//             className="cursor-pointer text-red-500"
//           />
//         </div>
//       ),
//     },
//   ];

//   return (
//     <div className="p-6 space-y-6">
//       <div className="flex justify-between bg-white px-6 py-4 rounded-xl border shadow-sm items-center">
//         <div>
//           <h2 className="text-xl font-semibold text-black">
//             Quản lý yêu cầu
//           </h2>
//           <p className="text-xs text-gray-500">
//             Quản lý danh sách yêu cầu giảng dạy và sự kiện
//           </p>
//         </div>

//         <Button
//           onClick={() => navigate('/pc/requests/create')}
//           className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white"
//         >
//           <Plus size={16} />
//           Tạo yêu cầu mới
//         </Button>
//       </div>

//       <div className="grid grid-cols-4 gap-4">
//         <StatCard
//           icon={<BookOpen />}
//           label="Tổng yêu cầu"
//           value={totalItems.toString()}
//         />
//         <StatCard
//           icon={<BookOpen />}
//           label="Chờ duyệt"
//           value={stats.pending.toString()}
//         />
//         <StatCard
//           icon={<BookOpen />}
//           label="Đã duyệt"
//           value={stats.approved.toString()}
//         />
//         <StatCard
//           icon={<BookOpen />}
//           label="Từ chối"
//           value={stats.rejected.toString()}
//         />
//       </div>

//       <div className="bg-white rounded-xl border shadow-sm px-6 py-4">
//         <DataTable
//           columns={columns}
//           data={data}
//           pageNumber={pageNumber}
//           pageSize={pageSize}
//           totalItems={totalItems}
//           onPageChange={(page) => setPageNumber(page)}
//         />
//       </div>
//     </div>
//   );
// } 

  