import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useRequests } from '../hooks/useRequests';
import { useProgramCoordinatorId } from '../hooks/useProgramCoordinatorId';

export default function PCRequestsIndex() {
  const navigate = useNavigate();
  const programCoordinatorId = useProgramCoordinatorId();
  const { data, loading } = useRequests(1, 1, 0, {
    programCoordinatorId: programCoordinatorId > 0 ? programCoordinatorId : undefined,
  });

  useEffect(() => {
    if (!loading && data.length > 0) {
      navigate(`/pc/requests/${data[0].requestId}`, { replace: true });
    }
  }, [data, loading, navigate]);

  if (loading) {
    return (
      <div className="flex flex-1 min-h-[280px] items-center justify-center bg-slate-50 text-black">
        <Spin size="large" tip="Đang tải danh sách yêu cầu..." />
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-sm text-slate-500">
      Chưa có yêu cầu để hiển thị.
    </div>
  );
}
