import { Button } from 'antd';
import type { TeamLeaderAssignmentsTab } from '@/modules/contract/hooks/type';
import { useTeamLeaderAssignmentsPage } from '@/modules/contract/hooks/useTeamLeaderAssignmentsPage';

type Props = {
  tab: TeamLeaderAssignmentsTab;
};

function formatDateTime(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleString('vi-VN');
}

export default function TeamLeaderAssignmentsPage({ tab }: Props) {
  const {
    loading,
    sendingAssignments,
    applyingToOtherSessions,
    filteredRequests,
    selectedRequestId,
    setSelectedRequestId,
    selectedRequest,
    handleSendAssignments,
    handleApplyToOtherSessions,
    activeSession,
    setActiveSession,
  } = useTeamLeaderAssignmentsPage(tab);

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
      <div className="min-h-0 overflow-auto rounded-xl border border-slate-200 bg-white p-3">
        <div className="mb-2 text-sm font-semibold text-slate-800">Danh sách yêu cầu</div>
        <div className="space-y-2">
          {filteredRequests.map((request) => {
            const isActive = selectedRequestId === request.requestId;
            return (
              <button
                key={request.requestId}
                type="button"
                onClick={() => setSelectedRequestId(request.requestId)}
                className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                  isActive
                    ? 'border-sky-300 bg-sky-50'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="text-sm font-semibold text-slate-900">{request.requestCode}</div>
                <div className="truncate text-xs text-slate-600">{request.requestName || '—'}</div>
                <div className="mt-1 text-[11px] text-slate-500">
                  {request.sessions.length} phiên · {String(request.status || '—')}
                </div>
              </button>
            );
          })}
          {!filteredRequests.length && (
            <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
              Không có yêu cầu phù hợp.
            </div>
          )}
        </div>
      </div>

      <div className="min-h-0 overflow-auto rounded-xl border border-slate-200 bg-white p-4">
        {!selectedRequest ? (
          <div className="text-sm text-slate-500">Chọn một yêu cầu để xem chi tiết.</div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  {selectedRequest.requestCode} - {selectedRequest.requestName}
                </h3>
                <p className="text-sm text-slate-500">
                  Trạng thái: {selectedRequest.status || '—'} · Bắt đầu: {formatDateTime(selectedRequest.startDate)}
                </p>
              </div>
              {tab === 'assigning' && (
                <Button
                  type="primary"
                  loading={sendingAssignments}
                  onClick={() => void handleSendAssignments()}
                >
                  Gửi phân công
                </Button>
              )}
            </div>

            <div className="space-y-2">
              {selectedRequest.sessions.map((session) => {
                const selected = activeSession?.sessionId === session.sessionId;
                return (
                  <div
                    key={session.sessionId}
                    className={`rounded-lg border p-3 ${
                      selected ? 'border-sky-300 bg-sky-50' : 'border-slate-200'
                    }`}
                  >
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => setActiveSession(session)}
                    >
                      <div className="text-sm font-semibold text-slate-900">
                        Phiên #{session.sessionNo || session.sessionId}
                      </div>
                      <div className="text-xs text-slate-600">
                        {formatDateTime(session.startAt)} - {formatDateTime(session.endAt)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {session.location || '—'} · {session.status || '—'}
                      </div>
                    </button>
                    {tab === 'assigning' && selected && (
                      <div className="mt-2">
                        <Button
                          size="small"
                          loading={applyingToOtherSessions}
                          onClick={() => void handleApplyToOtherSessions(session.sessionId)}
                        >
                          Áp dụng cho các phiên khác
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {loading && <div className="mt-4 text-sm text-slate-500">Đang tải dữ liệu...</div>}
      </div>
    </div>
  );
}
