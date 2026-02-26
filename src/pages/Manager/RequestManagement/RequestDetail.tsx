import { useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';

type RequestItem = {
  id: string;
  title: string;
  createdBy: string;
  status: 'pending' | 'approved' | 'processing' | 'rejected';
};

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>();

  const requestList: RequestItem[] = [
    {
      id: '1',
      title: 'Yêu cầu giảng dạy - AI cơ bản K12',
      createdBy: 'Trần Thị Bình',
      status: 'pending',
    },
    {
      id: '2',
      title: 'Yêu cầu giảng dạy - Python nâng cao',
      createdBy: 'Nguyễn Văn Cường',
      status: 'processing',
    },
    {
      id: '3',
      title: 'Workshop STEM 2024',
      createdBy: 'Lê Minh Đức',
      status: 'approved',
    },
  ];

  const selectedRequest = requestList.find((r) => r.id === id);

  if (!selectedRequest) {
    return <Card className="p-6 rounded-2xl">Không tìm thấy yêu cầu</Card>;
  }

  return (
    <Card className="p-6 rounded-2xl">
      <h1 className="text-xl font-semibold mb-4">{selectedRequest.title}</h1>

      <div className="text-gray-600">Người tạo: {selectedRequest.createdBy}</div>

      <div className="mt-4">Trạng thái: {selectedRequest.status}</div>

      <div className="mt-6">Đây là nội dung chi tiết của yêu cầu.</div>
    </Card>
  );
}
