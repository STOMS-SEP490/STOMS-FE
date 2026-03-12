import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { requestApi } from '@/modules/request/api/requestApi';
import type { RequestListItem } from '@/modules/request/request';
import { taskReportApi, type TaskReport } from '../api/taskReportApi';
import { useCurrentUser } from '@/shared/hooks/useCurrentUser';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { message, Spin } from 'antd';
import { FileText, Pencil, Plus, Save } from 'lucide-react';

type SessionWithReports = {
  sessionId: number;
  sessionNo: number;
  startAt: string;
  endAt: string;
  status: string;
  reports: TaskReport[];
};

export default function TeacherTaskReportPage() {
  const currentUser = useCurrentUser();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<RequestListItem[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [taskReports, setTaskReports] = useState<TaskReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const userId = currentUser?.id ?? null;

  useEffect(() => {
    const load = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [reqPaged, reportPaged] = await Promise.all([
          requestApi.getRequests({
            pageNumber: 1,
            pageSize: 50,
          }),
          taskReportApi.getTaskReports({
            pageNumber: 1,
            pageSize: 200,
            userId,
          }),
        ]);
        const reqItems: RequestListItem[] = (reqPaged as any).items ?? (reqPaged as any).Items ?? [];
        setRequests(reqItems);
        setTaskReports(reportPaged.items);
        if (reqItems.length && selectedRequestId == null) {
          setSelectedRequestId(reqItems[0].requestId);
        }
      } catch (err) {
        console.error(err);
        message.error('Không tải được danh sách yêu cầu hoặc báo cáo công việc');
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const selectedRequest = useMemo(
    () => requests.find((r) => r.requestId === selectedRequestId) ?? null,
    [requests, selectedRequestId]
  );

  const sessionsWithReports: SessionWithReports[] = useMemo(() => {
    if (!selectedRequest?.sessions?.length) return [];
    return selectedRequest.sessions.map((s) => ({
      ...s,
      reports: taskReports.filter(
        (r) => r.requestId === selectedRequest.requestId && r.sessionId === s.sessionId
      ),
    }));
  }, [selectedRequest, taskReports]);

  const selectedSession = useMemo(
    () => sessionsWithReports.find((s) => s.sessionId === selectedSessionId) ?? null,
    [sessionsWithReports, selectedSessionId]
  );

  useEffect(() => {
    if (!selectedSessionId && sessionsWithReports.length) {
      setSelectedSessionId(sessionsWithReports[0].sessionId);
    }
  }, [sessionsWithReports, selectedSessionId]);

  useEffect(() => {
    if (!selectedSession) {
      setTitle('');
      setDescription('');
      return;
    }
    const existing = selectedSession.reports[0];
    if (existing) {
      setTitle(existing.title || '');
      setDescription(existing.description || '');
    } else {
      setTitle('');
      setDescription('');
    }
  }, [selectedSession]);

  const handleSave = async () => {
    if (!userId || !selectedRequest || !selectedSession) return;
    if (!title.trim() || !description.trim()) {
      message.warning('Vui lòng nhập đầy đủ tiêu đề và nội dung báo cáo');
      return;
    }

    setSaving(true);
    try {
      const existing = selectedSession.reports[0];
      if (existing) {
        const updated = await taskReportApi.update(existing.taskReportId, {
          requestId: selectedRequest.requestId,
          sessionId: selectedSession.sessionId,
          title,
          description,
        });
        setTaskReports((prev) =>
          prev.map((r) => (r.taskReportId === existing.taskReportId ? updated : r))
        );
        message.success('Đã cập nhật báo cáo công việc');
      } else {
        const created = await taskReportApi.create({
          userId,
          requestId: selectedRequest.requestId,
          sessionId: selectedSession.sessionId,
          title,
          description,
        });
        setTaskReports((prev) => [...prev, created]);
        message.success('Đã tạo báo cáo công việc');
      }
    } catch (err) {
      console.error(err);
      message.error('Lưu báo cáo công việc thất bại');
    } finally {
      setSaving(false);
    }
  };

  const formatDateRange = (start: string, end: string) => {
    try {
      const s = format(new Date(start), "HH:mm dd/MM/yyyy", { locale: vi });
      const e = format(new Date(end), "HH:mm dd/MM/yyyy", { locale: vi });
      return `${s} - ${e}`;
    } catch {
      return `${start} - ${end}`;
    }
  };

  return (
    <div className="flex h-screen bg-[#f3f4f6]">
      {/* Left column: requests list */}
      <aside className="w-80 border-r border-gray-200 bg-white flex flex-col">
        <div className="px-5 py-4 border-b border-gray-200">
          <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <FileText size={16} />
            Ghi công việc
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Danh sách yêu cầu liên quan đến các phiên bạn được phân công.
          </p>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Spin size="small" />
          </div>
        ) : requests.length === 0 ? (
          <div className="flex-1 flex items-center justify-center px-4 text-xs text-gray-500 text-center">
            Chưa có yêu cầu nào.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto no-scrollbar px-3 py-3 space-y-2">
            {requests.map((r) => {
              const isActive = r.requestId === selectedRequestId;
              return (
                <button
                  key={r.requestId}
                  type="button"
                  onClick={() => setSelectedRequestId(r.requestId)}
                  className={`w-full text-left rounded-xl border px-3 py-2.5 text-xs transition-all ${
                    isActive
                      ? 'border-sky-500 bg-sky-50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-semibold text-gray-900 truncate">
                      {r.requestName}
                    </span>
                    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100">
                      {r.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[11px] text-gray-500">
                    <span>{r.requestCode}</span>
                    <span>{r.customerName}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-gray-500">
                    Bắt đầu: {r.startDate}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </aside>

      {/* Right column: detail */}
      <main className="flex-1 flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-900">
              {selectedRequest ? selectedRequest.requestName : 'Chọn một yêu cầu ở bên trái'}
            </div>
            {selectedRequest && (
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500">
                <span>{selectedRequest.requestCode}</span>
                <span>• Khách hàng: {selectedRequest.customerName}</span>
                <span>• Số phiên: {selectedRequest.sessionsRequired}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate('/teacher/timetable')}
            >
              Xem lịch giảng dạy
            </Button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sessions list */}
          <section className="w-72 border-r border-gray-200 bg-[#f9fafb] flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="text-xs font-semibold text-gray-800">Phiên học</div>
              <p className="text-[11px] text-gray-500">
                Chọn phiên để ghi/cập nhật báo cáo công việc.
              </p>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar px-2 py-3 space-y-2">
              {selectedRequest && sessionsWithReports.length === 0 && (
                <div className="px-3 text-[11px] text-gray-500">
                  Yêu cầu này chưa có phiên nào.
                </div>
              )}
              {sessionsWithReports.map((s) => {
                const isActive = s.sessionId === selectedSessionId;
                const hasReport = s.reports.length > 0;
                return (
                  <button
                    key={s.sessionId}
                    type="button"
                    onClick={() => setSelectedSessionId(s.sessionId)}
                    className={`w-full text-left rounded-lg px-3 py-2 text-xs border transition-all ${
                      isActive
                        ? 'border-sky-500 bg-white shadow-sm'
                        : 'border-transparent hover:border-gray-200 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-gray-900">
                        Phiên {s.sessionNo}
                      </span>
                      <Badge
                        className={
                          hasReport
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-gray-100 text-gray-500 border border-gray-200'
                        }
                      >
                        {hasReport ? 'Đã ghi công' : 'Chưa ghi công'}
                      </Badge>
                    </div>
                    <div className="mt-1 text-[11px] text-gray-500">
                      {formatDateRange(s.startAt, s.endAt)}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Report editor */}
          <section className="flex-1 bg-[#f3f4f6] p-5 overflow-y-auto no-scrollbar">
            {!selectedRequest || !selectedSession ? (
              <div className="h-full flex items-center justify-center text-sm text-gray-500">
                Chọn yêu cầu và phiên ở bên trái để bắt đầu ghi công việc.
              </div>
            ) : (
              <div className="max-w-3xl space-y-4">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <Pencil size={16} />
                      Ghi công việc cho phiên {selectedSession.sessionNo}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Mô tả chi tiết nội dung giảng dạy, hoạt động đã thực hiện, kết quả và ghi chú cho phiên này.
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-xs text-gray-500">
                    <span>Trạng thái: {selectedSession.status}</span>
                    {selectedSession.reports[0]?.createdAt && (
                      <span>
                        Đã ghi lần đầu:{' '}
                        {format(new Date(selectedSession.reports[0].createdAt), 'dd/MM/yyyy HH:mm', {
                          locale: vi,
                        })}
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Tiêu đề báo cáo
                    </label>
                    <input
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                      placeholder="Ví dụ: Giảng dạy buổi 1 - Giới thiệu Python và cú pháp cơ bản"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Nội dung công việc
                    </label>
                    <textarea
                      className="w-full min-h-[180px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-vertical"
                      placeholder="Mô tả chi tiết các hoạt động đã thực hiện trong phiên: nội dung giảng dạy, bài tập, tương tác với học viên, ghi chú quan trọng..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2 text-[11px] text-gray-500">
                      <Plus size={12} />
                      Bạn có thể cập nhật báo cáo nhiều lần sau khi hoàn thành thêm công việc.
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      disabled={saving}
                      className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white"
                      onClick={handleSave}
                    >
                      <Save size={14} />
                      Lưu báo cáo
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

